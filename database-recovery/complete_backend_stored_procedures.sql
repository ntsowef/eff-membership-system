-- =====================================================================================
-- EFF MEMBERSHIP MANAGEMENT - BACKEND STORED PROCEDURES
-- =====================================================================================
-- Purpose: Custom stored procedures for backend API operations
-- Compatible with: PostgreSQL 12+
-- Usage: Backend Node.js/Express API integration
-- =====================================================================================

-- =====================================================================================
-- 1. MEMBER REGISTRATION AND MANAGEMENT
-- =====================================================================================

-- Procedure: Register new member with complete validation
CREATE OR REPLACE FUNCTION sp_register_member(
    p_id_number VARCHAR(13),
    p_firstname VARCHAR(100),
    p_surname VARCHAR(100),
    p_middle_name VARCHAR(100) DEFAULT NULL,
    p_date_of_birth DATE,
    p_gender_id INTEGER,
    p_race_id INTEGER,
    p_citizenship_id INTEGER,
    p_language_id INTEGER,
    p_cell_number VARCHAR(15),
    p_email VARCHAR(255) DEFAULT NULL,
    p_residential_address TEXT,
    p_postal_address TEXT DEFAULT NULL,
    p_ward_code VARCHAR(20),
    p_voting_district_code VARCHAR(20) DEFAULT NULL,
    p_voting_station_id INTEGER DEFAULT NULL,
    p_occupation_id INTEGER DEFAULT NULL,
    p_qualification_id INTEGER DEFAULT NULL,
    p_subscription_type_id INTEGER DEFAULT 1,
    p_membership_amount DECIMAL(10,2) DEFAULT 50.00
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_member_id INTEGER;
    v_membership_id INTEGER;
    v_membership_number VARCHAR(20);
    v_result JSON;
    v_error_message TEXT;
BEGIN
    -- Validate ID number uniqueness
    IF EXISTS (SELECT 1 FROM members WHERE id_number = p_id_number) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'ID_NUMBER_EXISTS',
            'message', 'Member with this ID number already exists'
        );
    END IF;
    
    -- Validate email uniqueness (if provided)
    IF p_email IS NOT NULL AND EXISTS (SELECT 1 FROM members WHERE email = p_email) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'EMAIL_EXISTS',
            'message', 'Member with this email already exists'
        );
    END IF;
    
    -- Validate ward exists
    IF NOT EXISTS (SELECT 1 FROM wards WHERE ward_code = p_ward_code) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_WARD',
            'message', 'Invalid ward code provided'
        );
    END IF;
    
    BEGIN
        -- Insert member
        INSERT INTO members (
            id_number, firstname, surname, middle_name, date_of_birth,
            gender_id, race_id, citizenship_id, language_id,
            cell_number, email, residential_address, postal_address,
            ward_code, voting_district_code, voting_station_id,
            occupation_id, qualification_id
        ) VALUES (
            p_id_number, p_firstname, p_surname, p_middle_name, p_date_of_birth,
            p_gender_id, p_race_id, p_citizenship_id, p_language_id,
            p_cell_number, p_email, p_residential_address, p_postal_address,
            p_ward_code, p_voting_district_code, p_voting_station_id,
            p_occupation_id, p_qualification_id
        ) RETURNING member_id INTO v_member_id;
        
        -- Generate membership number
        v_membership_number := 'EFF' || LPAD(v_member_id::TEXT, 8, '0');
        
        -- Create membership record
        INSERT INTO memberships (
            member_id, membership_number, subscription_type_id,
            membership_amount, date_joined, expiry_date, status_id
        ) VALUES (
            v_member_id, v_membership_number, p_subscription_type_id,
            p_membership_amount, CURRENT_DATE, 
            CURRENT_DATE + INTERVAL '1 year', 1
        ) RETURNING membership_id INTO v_membership_id;
        
        -- Return success response
        RETURN json_build_object(
            'success', true,
            'data', json_build_object(
                'member_id', v_member_id,
                'membership_id', v_membership_id,
                'membership_number', v_membership_number,
                'message', 'Member registered successfully'
            )
        );
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        RETURN json_build_object(
            'success', false,
            'error', 'DATABASE_ERROR',
            'message', v_error_message
        );
    END;
END;
$$;

-- =====================================================================================
-- 2. MEMBERSHIP RENEWAL AND PAYMENT PROCESSING
-- =====================================================================================

-- Procedure: Process membership renewal with payment
CREATE OR REPLACE FUNCTION sp_renew_membership(
    p_member_id INTEGER,
    p_payment_amount DECIMAL(10,2),
    p_payment_method VARCHAR(50),
    p_payment_reference VARCHAR(100),
    p_subscription_type_id INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_membership_id INTEGER;
    v_current_expiry DATE;
    v_new_expiry DATE;
    v_subscription_months INTEGER;
    v_result JSON;
BEGIN
    -- Get current membership details
    SELECT ms.membership_id, ms.expiry_date 
    INTO v_membership_id, v_current_expiry
    FROM memberships ms 
    WHERE ms.member_id = p_member_id 
    ORDER BY ms.created_at DESC 
    LIMIT 1;
    
    IF v_membership_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'MEMBER_NOT_FOUND',
            'message', 'Member not found or has no membership record'
        );
    END IF;
    
    -- Get subscription duration
    SELECT COALESCE(duration_months, 12) 
    INTO v_subscription_months
    FROM subscription_types 
    WHERE subscription_type_id = COALESCE(p_subscription_type_id, 1);
    
    -- Calculate new expiry date
    v_new_expiry := CASE 
        WHEN v_current_expiry > CURRENT_DATE THEN 
            v_current_expiry + (v_subscription_months || ' months')::INTERVAL
        ELSE 
            CURRENT_DATE + (v_subscription_months || ' months')::INTERVAL
    END;
    
    -- Update membership
    UPDATE memberships SET
        expiry_date = v_new_expiry,
        last_payment_date = CURRENT_DATE,
        membership_amount = p_payment_amount,
        payment_method = p_payment_method,
        payment_reference = p_payment_reference,
        payment_status = 'Completed',
        status_id = 1, -- Active
        updated_at = CURRENT_TIMESTAMP
    WHERE membership_id = v_membership_id;
    
    -- Log payment transaction
    INSERT INTO payment_transactions (
        membership_id, amount, payment_method, payment_reference,
        transaction_date, status, transaction_type
    ) VALUES (
        v_membership_id, p_payment_amount, p_payment_method, p_payment_reference,
        CURRENT_TIMESTAMP, 'Completed', 'Renewal'
    );
    
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'membership_id', v_membership_id,
            'new_expiry_date', v_new_expiry,
            'payment_amount', p_payment_amount,
            'message', 'Membership renewed successfully'
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'RENEWAL_ERROR',
        'message', SQLERRM
    );
END;
$$;

-- =====================================================================================
-- 3. WARD PERFORMANCE AND ANALYTICS
-- =====================================================================================

-- Procedure: Get comprehensive ward performance data
CREATE OR REPLACE FUNCTION sp_get_ward_performance(
    p_ward_code VARCHAR(20) DEFAULT NULL,
    p_municipality_code VARCHAR(20) DEFAULT NULL,
    p_province_code VARCHAR(10) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSON;
    v_ward_data JSON[];
    v_summary JSON;
BEGIN
    -- Build ward performance data
    SELECT json_agg(
        json_build_object(
            'ward_code', wa.ward_code,
            'ward_name', wa.ward_name,
            'ward_number', wa.ward_number,
            'municipality_name', wa.municipality_name,
            'district_name', wa.district_name,
            'province_name', wa.province_name,
            'active_members', wa.active_members,
            'expired_members', wa.expired_members,
            'total_members', wa.total_members,
            'ward_standing', wa.ward_standing,
            'standing_level', wa.standing_level,
            'active_percentage', wa.active_percentage,
            'last_updated', wa.last_updated
        )
    ) INTO v_ward_data
    FROM vw_ward_membership_audit wa
    WHERE (p_ward_code IS NULL OR wa.ward_code = p_ward_code)
      AND (p_municipality_code IS NULL OR wa.municipality_code = p_municipality_code)
      AND (p_province_code IS NULL OR wa.province_code = p_province_code);
    
    -- Build summary statistics
    SELECT json_build_object(
        'total_wards', COUNT(*),
        'good_standing_wards', SUM(CASE WHEN wa.standing_level = 1 THEN 1 ELSE 0 END),
        'acceptable_standing_wards', SUM(CASE WHEN wa.standing_level = 2 THEN 1 ELSE 0 END),
        'needs_improvement_wards', SUM(CASE WHEN wa.standing_level = 3 THEN 1 ELSE 0 END),
        'total_active_members', SUM(wa.active_members),
        'total_expired_members', SUM(wa.expired_members),
        'overall_active_percentage', ROUND(
            (SUM(wa.active_members) * 100.0) / NULLIF(SUM(wa.total_members), 0), 2
        )
    ) INTO v_summary
    FROM vw_ward_membership_audit wa
    WHERE (p_ward_code IS NULL OR wa.ward_code = p_ward_code)
      AND (p_municipality_code IS NULL OR wa.municipality_code = p_municipality_code)
      AND (p_province_code IS NULL OR wa.province_code = p_province_code);
    
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'wards', COALESCE(v_ward_data, '[]'::JSON),
            'summary', v_summary,
            'generated_at', CURRENT_TIMESTAMP
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'ANALYTICS_ERROR',
        'message', SQLERRM
    );
END;
$$;

-- =====================================================================================
-- 4. MEMBER SEARCH AND DIRECTORY OPERATIONS
-- =====================================================================================

-- Procedure: Advanced member search with filters
CREATE OR REPLACE FUNCTION sp_search_members(
    p_search_term VARCHAR(255) DEFAULT NULL,
    p_ward_code VARCHAR(20) DEFAULT NULL,
    p_municipality_code VARCHAR(20) DEFAULT NULL,
    p_province_code VARCHAR(10) DEFAULT NULL,
    p_membership_status VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_members JSON;
    v_total_count INTEGER;
BEGIN
    -- Get total count for pagination
    SELECT COUNT(*)
    INTO v_total_count
    FROM vw_member_details md
    WHERE (p_search_term IS NULL OR (
        md.firstname ILIKE '%' || p_search_term || '%' OR
        md.surname ILIKE '%' || p_search_term || '%' OR
        md.id_number ILIKE '%' || p_search_term || '%' OR
        md.cell_number ILIKE '%' || p_search_term || '%' OR
        md.email ILIKE '%' || p_search_term || '%'
    ))
    AND (p_ward_code IS NULL OR md.ward_code = p_ward_code)
    AND (p_municipality_code IS NULL OR md.municipality_code = p_municipality_code)
    AND (p_province_code IS NULL OR md.province_code = p_province_code)
    AND (p_membership_status IS NULL OR md.membership_status = p_membership_status);

    -- Get paginated results
    SELECT json_agg(
        json_build_object(
            'member_id', md.member_id,
            'id_number', md.id_number,
            'full_name', md.full_name,
            'cell_number', md.cell_number,
            'email', md.email,
            'ward_name', md.ward_name,
            'municipality_name', md.municipality_name,
            'province_name', md.province_name,
            'membership_status', md.membership_status,
            'expiry_date', md.expiry_date,
            'days_until_expiry', md.days_until_expiry
        )
    )
    INTO v_members
    FROM vw_member_details md
    WHERE (p_search_term IS NULL OR (
        md.firstname ILIKE '%' || p_search_term || '%' OR
        md.surname ILIKE '%' || p_search_term || '%' OR
        md.id_number ILIKE '%' || p_search_term || '%' OR
        md.cell_number ILIKE '%' || p_search_term || '%' OR
        md.email ILIKE '%' || p_search_term || '%'
    ))
    AND (p_ward_code IS NULL OR md.ward_code = p_ward_code)
    AND (p_municipality_code IS NULL OR md.municipality_code = p_municipality_code)
    AND (p_province_code IS NULL OR md.province_code = p_province_code)
    AND (p_membership_status IS NULL OR md.membership_status = p_membership_status)
    ORDER BY md.surname, md.firstname
    LIMIT p_limit OFFSET p_offset;

    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'members', COALESCE(v_members, '[]'::JSON),
            'pagination', json_build_object(
                'total_count', v_total_count,
                'limit', p_limit,
                'offset', p_offset,
                'has_more', (p_offset + p_limit) < v_total_count
            )
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'SEARCH_ERROR',
        'message', SQLERRM
    );
END;
$$;
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
-- =====================================================================================
-- EFF MEMBERSHIP MANAGEMENT - BACKEND STORED PROCEDURES (PART 3)
-- =====================================================================================

-- =====================================================================================
-- 8. REPORTING AND DASHBOARD UTILITIES
-- =====================================================================================

-- Procedure: Generate comprehensive dashboard statistics
CREATE OR REPLACE FUNCTION sp_get_dashboard_statistics(
    p_date_range_days INTEGER DEFAULT 30,
    p_province_code VARCHAR(10) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_stats JSON;
    v_membership_stats JSON;
    v_geographic_stats JSON;
    v_recent_activity JSON;
BEGIN
    -- Membership Statistics
    SELECT json_build_object(
        'total_members', COUNT(*),
        'active_members', SUM(CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active THEN 1 ELSE 0 END),
        'expired_members', SUM(CASE WHEN ms.expiry_date < CURRENT_DATE THEN 1 ELSE 0 END),
        'new_members_this_month', SUM(CASE WHEN ms.date_joined >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 ELSE 0 END),
        'renewals_this_month', SUM(CASE WHEN ms.last_payment_date >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 ELSE 0 END),
        'expiring_soon', SUM(CASE WHEN ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END)
    ) INTO v_membership_stats
    FROM members m
    JOIN memberships ms ON m.member_id = ms.member_id
    JOIN membership_statuses mst ON ms.status_id = mst.status_id
    WHERE (p_province_code IS NULL OR m.ward_code IN (
        SELECT w.ward_code FROM wards w 
        JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        JOIN districts d ON mu.district_code = d.district_code
        WHERE d.province_code = p_province_code
    ));
    
    -- Geographic Distribution
    SELECT json_agg(
        json_build_object(
            'province_name', p.province_name,
            'province_code', p.province_code,
            'member_count', COUNT(m.member_id),
            'active_count', SUM(CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active THEN 1 ELSE 0 END)
        )
    ) INTO v_geographic_stats
    FROM provinces p
    LEFT JOIN districts d ON p.province_code = d.province_code
    LEFT JOIN municipalities mu ON d.district_code = mu.district_code
    LEFT JOIN wards w ON mu.municipality_code = w.municipality_code
    LEFT JOIN members m ON w.ward_code = m.ward_code
    LEFT JOIN memberships ms ON m.member_id = ms.member_id
    LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
    WHERE (p_province_code IS NULL OR p.province_code = p_province_code)
    GROUP BY p.province_code, p.province_name
    ORDER BY COUNT(m.member_id) DESC;
    
    -- Recent Activity (last N days)
    SELECT json_build_object(
        'new_registrations', (
            SELECT COUNT(*) FROM memberships 
            WHERE date_joined >= CURRENT_DATE - (p_date_range_days || ' days')::INTERVAL
        ),
        'recent_renewals', (
            SELECT COUNT(*) FROM memberships 
            WHERE last_payment_date >= CURRENT_DATE - (p_date_range_days || ' days')::INTERVAL
        ),
        'leadership_appointments', (
            SELECT COUNT(*) FROM leadership_appointments 
            WHERE appointment_date >= CURRENT_DATE - (p_date_range_days || ' days')::INTERVAL
        ),
        'sms_campaigns', (
            SELECT COUNT(*) FROM sms_campaigns 
            WHERE created_at >= CURRENT_DATE - (p_date_range_days || ' days')::INTERVAL
        )
    ) INTO v_recent_activity;
    
    -- Combine all statistics
    SELECT json_build_object(
        'membership_stats', v_membership_stats,
        'geographic_distribution', COALESCE(v_geographic_stats, '[]'::JSON),
        'recent_activity', v_recent_activity,
        'date_range_days', p_date_range_days,
        'generated_at', CURRENT_TIMESTAMP
    ) INTO v_stats;
    
    RETURN json_build_object(
        'success', true,
        'data', v_stats
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'DASHBOARD_ERROR',
        'message', SQLERRM
    );
END;
$$;

-- =====================================================================================
-- 9. DATA VALIDATION AND CLEANUP
-- =====================================================================================

-- Procedure: Validate and clean member data
CREATE OR REPLACE FUNCTION sp_validate_member_data(
    p_member_id INTEGER DEFAULT NULL,
    p_fix_issues BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_issues JSON[];
    v_fixed_count INTEGER := 0;
    v_member_record RECORD;
    v_issue_text TEXT;
BEGIN
    -- Process specific member or all members
    FOR v_member_record IN 
        SELECT m.*, ms.expiry_date, ms.status_id
        FROM members m
        LEFT JOIN memberships ms ON m.member_id = ms.member_id
        WHERE (p_member_id IS NULL OR m.member_id = p_member_id)
    LOOP
        -- Check ID number format (South African ID)
        IF v_member_record.id_number IS NULL OR LENGTH(v_member_record.id_number) != 13 OR 
           v_member_record.id_number !~ '^[0-9]{13}$' THEN
            v_issue_text := format('Member %s: Invalid ID number format', v_member_record.member_id);
            v_issues := array_append(v_issues, json_build_object(
                'member_id', v_member_record.member_id,
                'issue_type', 'INVALID_ID_NUMBER',
                'description', v_issue_text,
                'severity', 'HIGH'
            ));
        END IF;
        
        -- Check email format
        IF v_member_record.email IS NOT NULL AND 
           v_member_record.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            v_issue_text := format('Member %s: Invalid email format', v_member_record.member_id);
            v_issues := array_append(v_issues, json_build_object(
                'member_id', v_member_record.member_id,
                'issue_type', 'INVALID_EMAIL',
                'description', v_issue_text,
                'severity', 'MEDIUM'
            ));
            
            -- Fix if requested
            IF p_fix_issues THEN
                UPDATE members SET email = NULL WHERE member_id = v_member_record.member_id;
                v_fixed_count := v_fixed_count + 1;
            END IF;
        END IF;
        
        -- Check cell number format
        IF v_member_record.cell_number IS NULL OR 
           v_member_record.cell_number !~ '^(\+27|0)[6-8][0-9]{8}$' THEN
            v_issue_text := format('Member %s: Invalid cell number format', v_member_record.member_id);
            v_issues := array_append(v_issues, json_build_object(
                'member_id', v_member_record.member_id,
                'issue_type', 'INVALID_CELL_NUMBER',
                'description', v_issue_text,
                'severity', 'HIGH'
            ));
        END IF;
        
        -- Check age consistency with ID number
        IF v_member_record.id_number IS NOT NULL AND LENGTH(v_member_record.id_number) = 13 THEN
            DECLARE
                v_id_year INTEGER;
                v_calculated_age INTEGER;
                v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
            BEGIN
                v_id_year := CASE 
                    WHEN SUBSTRING(v_member_record.id_number, 1, 2)::INTEGER <= 21 THEN 
                        2000 + SUBSTRING(v_member_record.id_number, 1, 2)::INTEGER
                    ELSE 
                        1900 + SUBSTRING(v_member_record.id_number, 1, 2)::INTEGER
                END;
                
                v_calculated_age := v_current_year - v_id_year;
                
                IF ABS(v_calculated_age - COALESCE(v_member_record.age, 0)) > 1 THEN
                    v_issue_text := format('Member %s: Age inconsistent with ID number', v_member_record.member_id);
                    v_issues := array_append(v_issues, json_build_object(
                        'member_id', v_member_record.member_id,
                        'issue_type', 'AGE_INCONSISTENCY',
                        'description', v_issue_text,
                        'severity', 'MEDIUM'
                    ));
                    
                    -- Fix if requested
                    IF p_fix_issues THEN
                        UPDATE members SET age = v_calculated_age WHERE member_id = v_member_record.member_id;
                        v_fixed_count := v_fixed_count + 1;
                    END IF;
                END IF;
            END;
        END IF;
        
        -- Check for missing ward assignment
        IF v_member_record.ward_code IS NULL OR 
           NOT EXISTS (SELECT 1 FROM wards WHERE ward_code = v_member_record.ward_code) THEN
            v_issue_text := format('Member %s: Invalid or missing ward assignment', v_member_record.member_id);
            v_issues := array_append(v_issues, json_build_object(
                'member_id', v_member_record.member_id,
                'issue_type', 'INVALID_WARD',
                'description', v_issue_text,
                'severity', 'HIGH'
            ));
        END IF;
        
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'total_issues', array_length(v_issues, 1),
            'issues_fixed', v_fixed_count,
            'issues', COALESCE(v_issues, '[]'::JSON[]),
            'validation_date', CURRENT_TIMESTAMP
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'VALIDATION_ERROR',
        'message', SQLERRM
    );
END;
$$;

-- =====================================================================================
-- 10. AUDIT AND LOGGING UTILITIES
-- =====================================================================================

-- Procedure: Log user activity for audit trail
CREATE OR REPLACE FUNCTION sp_log_user_activity(
    p_user_id INTEGER,
    p_action_type VARCHAR(50), -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT'
    p_resource_type VARCHAR(50), -- 'MEMBER', 'MEMBERSHIP', 'LEADERSHIP', 'CAMPAIGN'
    p_resource_id INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_id INTEGER;
BEGIN
    INSERT INTO user_activity_logs (
        user_id, action_type, resource_type, resource_id,
        description, ip_address, user_agent, created_at
    ) VALUES (
        p_user_id, p_action_type, p_resource_type, p_resource_id,
        p_description, p_ip_address, p_user_agent, CURRENT_TIMESTAMP
    ) RETURNING log_id INTO v_log_id;
    
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'log_id', v_log_id,
            'message', 'Activity logged successfully'
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'LOGGING_ERROR',
        'message', SQLERRM
    );
END;
$$;
