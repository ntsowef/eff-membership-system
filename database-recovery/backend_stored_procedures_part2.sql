-- =====================================================================================
-- EFF MEMBERSHIP MANAGEMENT - BACKEND STORED PROCEDURES (PART 2)
-- =====================================================================================

-- =====================================================================================
-- 5. LEADERSHIP APPOINTMENT MANAGEMENT
-- =====================================================================================

-- Procedure: Assign leadership position with validation
CREATE OR REPLACE FUNCTION sp_assign_leadership_position(
    p_member_id INTEGER,
    p_position_id INTEGER,
    p_appointment_level VARCHAR(20), -- 'national', 'provincial', 'regional', 'local'
    p_geographic_scope VARCHAR(50) DEFAULT NULL, -- province_code, district_code, etc.
    p_appointed_by INTEGER, -- user_id of appointing authority
    p_appointment_date DATE DEFAULT CURRENT_DATE,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_appointment_id INTEGER;
    v_member_name VARCHAR(255);
    v_position_name VARCHAR(255);
    v_existing_appointment INTEGER;
BEGIN
    -- Validate member exists and is active
    SELECT CONCAT(firstname, ' ', surname)
    INTO v_member_name
    FROM members m
    JOIN memberships ms ON m.member_id = ms.member_id
    WHERE m.member_id = p_member_id 
      AND ms.expiry_date >= CURRENT_DATE
      AND ms.status_id = 1;
    
    IF v_member_name IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_MEMBER',
            'message', 'Member not found or membership not active'
        );
    END IF;
    
    -- Get position details
    SELECT position_name INTO v_position_name
    FROM leadership_positions WHERE position_id = p_position_id;
    
    IF v_position_name IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_POSITION',
            'message', 'Leadership position not found'
        );
    END IF;
    
    -- Check for existing active appointment in same position and scope
    SELECT appointment_id INTO v_existing_appointment
    FROM leadership_appointments
    WHERE position_id = p_position_id
      AND appointment_level = p_appointment_level
      AND COALESCE(geographic_scope, '') = COALESCE(p_geographic_scope, '')
      AND status = 'Active'
      AND (end_date IS NULL OR end_date > CURRENT_DATE);
    
    IF v_existing_appointment IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'POSITION_OCCUPIED',
            'message', 'This position is already occupied by another member'
        );
    END IF;
    
    -- Create leadership appointment
    INSERT INTO leadership_appointments (
        member_id, position_id, appointment_level, geographic_scope,
        appointed_by, appointment_date, status, notes
    ) VALUES (
        p_member_id, p_position_id, p_appointment_level, p_geographic_scope,
        p_appointed_by, p_appointment_date, 'Active', p_notes
    ) RETURNING appointment_id INTO v_appointment_id;
    
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'appointment_id', v_appointment_id,
            'member_name', v_member_name,
            'position_name', v_position_name,
            'appointment_level', p_appointment_level,
            'geographic_scope', p_geographic_scope,
            'message', 'Leadership position assigned successfully'
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'APPOINTMENT_ERROR',
        'message', SQLERRM
    );
END;
$$;

-- =====================================================================================
-- 6. BULK OPERATIONS AND DATA IMPORT
-- =====================================================================================

-- Procedure: Bulk member status update (for renewals, suspensions, etc.)
CREATE OR REPLACE FUNCTION sp_bulk_update_member_status(
    p_member_ids INTEGER[],
    p_new_status_id INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_updated_by INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_member_id INTEGER;
    v_status_name VARCHAR(50);
BEGIN
    -- Get status name for logging
    SELECT status_name INTO v_status_name 
    FROM membership_statuses 
    WHERE status_id = p_new_status_id;
    
    IF v_status_name IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_STATUS',
            'message', 'Invalid membership status ID provided'
        );
    END IF;
    
    -- Process each member
    FOREACH v_member_id IN ARRAY p_member_ids
    LOOP
        BEGIN
            -- Update membership status
            UPDATE memberships 
            SET status_id = p_new_status_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE member_id = v_member_id;
            
            -- Log the status change
            INSERT INTO membership_status_history (
                member_id, old_status_id, new_status_id, 
                change_reason, changed_by, change_date
            ) 
            SELECT v_member_id, ms.status_id, p_new_status_id,
                   p_reason, p_updated_by, CURRENT_TIMESTAMP
            FROM memberships ms 
            WHERE ms.member_id = v_member_id;
            
            v_updated_count := v_updated_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            v_failed_count := v_failed_count + 1;
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'updated_count', v_updated_count,
            'failed_count', v_failed_count,
            'total_processed', array_length(p_member_ids, 1),
            'new_status', v_status_name,
            'message', format('Updated %s members to %s status', v_updated_count, v_status_name)
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'BULK_UPDATE_ERROR',
        'message', SQLERRM
    );
END;
$$;

-- =====================================================================================
-- 7. COMMUNICATION AND MESSAGING
-- =====================================================================================

-- Procedure: Send bulk SMS campaign with tracking
CREATE OR REPLACE FUNCTION sp_send_bulk_sms_campaign(
    p_campaign_name VARCHAR(255),
    p_message_content TEXT,
    p_target_criteria JSON, -- Filter criteria for recipients
    p_sender_id INTEGER,
    p_scheduled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_campaign_id INTEGER;
    v_recipient_count INTEGER;
    v_message_id INTEGER;
    v_member_record RECORD;
    v_target_query TEXT;
BEGIN
    -- Create SMS campaign record
    INSERT INTO sms_campaigns (
        campaign_name, message_content, sender_id, 
        scheduled_date, status, created_at
    ) VALUES (
        p_campaign_name, p_message_content, p_sender_id,
        p_scheduled_date, 'Pending', CURRENT_TIMESTAMP
    ) RETURNING campaign_id INTO v_campaign_id;
    
    -- Build dynamic query based on target criteria
    -- This is a simplified version - in production, you'd want more sophisticated filtering
    v_target_query := 'SELECT member_id, cell_number, firstname, surname FROM vw_member_details WHERE 1=1';
    
    -- Add filters based on JSON criteria
    IF p_target_criteria->>'ward_code' IS NOT NULL THEN
        v_target_query := v_target_query || ' AND ward_code = ''' || (p_target_criteria->>'ward_code') || '''';
    END IF;
    
    IF p_target_criteria->>'province_code' IS NOT NULL THEN
        v_target_query := v_target_query || ' AND province_code = ''' || (p_target_criteria->>'province_code') || '''';
    END IF;
    
    IF p_target_criteria->>'membership_status' IS NOT NULL THEN
        v_target_query := v_target_query || ' AND membership_status = ''' || (p_target_criteria->>'membership_status') || '''';
    END IF;
    
    -- Add condition for valid cell numbers
    v_target_query := v_target_query || ' AND cell_number IS NOT NULL AND cell_number != ''''';
    
    -- Count recipients
    EXECUTE 'SELECT COUNT(*) FROM (' || v_target_query || ') AS recipients' INTO v_recipient_count;
    
    -- Create individual SMS messages for each recipient
    FOR v_member_record IN EXECUTE v_target_query
    LOOP
        INSERT INTO sms_messages (
            campaign_id, member_id, recipient_number, 
            message_content, status, created_at
        ) VALUES (
            v_campaign_id, v_member_record.member_id, v_member_record.cell_number,
            p_message_content, 'Queued', CURRENT_TIMESTAMP
        );
    END LOOP;
    
    -- Update campaign with recipient count
    UPDATE sms_campaigns 
    SET recipient_count = v_recipient_count,
        status = 'Queued'
    WHERE campaign_id = v_campaign_id;
    
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'campaign_id', v_campaign_id,
            'recipient_count', v_recipient_count,
            'campaign_name', p_campaign_name,
            'scheduled_date', p_scheduled_date,
            'message', format('SMS campaign created with %s recipients', v_recipient_count)
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'SMS_CAMPAIGN_ERROR',
        'message', SQLERRM
    );
END;
$$;
