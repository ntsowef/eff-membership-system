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
-- 5. SMS BIRTHDAY TEMPLATES AND AUTOMATED MESSAGING
-- =====================================================================================

-- Procedure: Send birthday SMS to members with personalized templates
CREATE OR REPLACE FUNCTION sp_send_birthday_sms(
    p_template_id INTEGER DEFAULT 1,
    p_sender_id INTEGER DEFAULT 1,
    p_send_date DATE DEFAULT CURRENT_DATE,
    p_preview_only BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_campaign_id INTEGER;
    v_template_content TEXT;
    v_template_name VARCHAR(255);
    v_member_record RECORD;
    v_personalized_message TEXT;
    v_recipient_count INTEGER := 0;
    v_preview_messages JSON[] := '{}';
    v_birthday_members CURSOR FOR
        SELECT
            m.member_id,
            m.firstname,
            m.surname,
            m.cell_number,
            m.date_of_birth,
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) as age,
            ms.membership_number,
            w.ward_name,
            mu.municipality_name
        FROM members m
        JOIN memberships ms ON m.member_id = ms.member_id
        JOIN membership_statuses mst ON ms.status_id = mst.status_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        WHERE EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM p_send_date)
          AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM p_send_date)
          AND m.cell_number IS NOT NULL
          AND m.cell_number != ''
          AND ms.expiry_date >= CURRENT_DATE
          AND mst.is_active = TRUE;
BEGIN
    -- Get SMS template
    SELECT template_content, template_name
    INTO v_template_content, v_template_name
    FROM sms_templates
    WHERE template_id = p_template_id AND template_type = 'birthday' AND is_active = TRUE;

    -- Use default template if none found
    IF v_template_content IS NULL THEN
        v_template_content := 'Happy Birthday {firstname}! 🎉 The EFF family wishes you a wonderful day filled with joy and blessings. Thank you for being a valued member of our movement. Enjoy your special day! - EFF Leadership';
        v_template_name := 'Default Birthday Template';
    END IF;

    -- Create campaign if not preview mode
    IF NOT p_preview_only THEN
        INSERT INTO sms_campaigns (
            campaign_name,
            message_content,
            sender_id,
            scheduled_date,
            status,
            campaign_type,
            created_at
        ) VALUES (
            'Birthday Wishes - ' || TO_CHAR(p_send_date, 'YYYY-MM-DD'),
            v_template_content,
            p_sender_id,
            p_send_date,
            'Processing',
            'birthday',
            CURRENT_TIMESTAMP
        ) RETURNING campaign_id INTO v_campaign_id;
    END IF;

    -- Process each birthday member
    FOR v_member_record IN v_birthday_members
    LOOP
        -- Personalize the message
        v_personalized_message := v_template_content;
        v_personalized_message := REPLACE(v_personalized_message, '{firstname}', v_member_record.firstname);
        v_personalized_message := REPLACE(v_personalized_message, '{surname}', v_member_record.surname);
        v_personalized_message := REPLACE(v_personalized_message, '{fullname}', v_member_record.firstname || ' ' || v_member_record.surname);
        v_personalized_message := REPLACE(v_personalized_message, '{age}', v_member_record.age::TEXT);
        v_personalized_message := REPLACE(v_personalized_message, '{membership_number}', COALESCE(v_member_record.membership_number, ''));
        v_personalized_message := REPLACE(v_personalized_message, '{ward_name}', COALESCE(v_member_record.ward_name, ''));
        v_personalized_message := REPLACE(v_personalized_message, '{municipality}', COALESCE(v_member_record.municipality_name, ''));

        v_recipient_count := v_recipient_count + 1;

        -- Preview mode: collect sample messages
        IF p_preview_only THEN
            IF v_recipient_count <= 5 THEN -- Show first 5 as preview
                v_preview_messages := array_append(v_preview_messages,
                    json_build_object(
                        'member_id', v_member_record.member_id,
                        'name', v_member_record.firstname || ' ' || v_member_record.surname,
                        'cell_number', v_member_record.cell_number,
                        'age', v_member_record.age,
                        'personalized_message', v_personalized_message
                    )
                );
            END IF;
        ELSE
            -- Create SMS message record
            INSERT INTO sms_messages (
                campaign_id,
                member_id,
                recipient_number,
                message_content,
                status,
                message_type,
                created_at
            ) VALUES (
                v_campaign_id,
                v_member_record.member_id,
                v_member_record.cell_number,
                v_personalized_message,
                'Queued',
                'birthday',
                CURRENT_TIMESTAMP
            );
        END IF;
    END LOOP;

    -- Update campaign with recipient count
    IF NOT p_preview_only AND v_campaign_id IS NOT NULL THEN
        UPDATE sms_campaigns
        SET recipient_count = v_recipient_count,
            status = CASE WHEN v_recipient_count > 0 THEN 'Queued' ELSE 'Completed' END
        WHERE campaign_id = v_campaign_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'campaign_id', COALESCE(v_campaign_id, 0),
            'template_name', v_template_name,
            'recipient_count', v_recipient_count,
            'send_date', p_send_date,
            'preview_mode', p_preview_only,
            'preview_messages', CASE WHEN p_preview_only THEN v_preview_messages ELSE NULL END,
            'message', CASE
                WHEN p_preview_only THEN format('Found %s birthday members for %s', v_recipient_count, p_send_date)
                ELSE format('Birthday SMS campaign created with %s recipients', v_recipient_count)
            END
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'BIRTHDAY_SMS_ERROR',
        'message', SQLERRM
    );
END;
$$;

-- Procedure: Create and manage SMS templates
CREATE OR REPLACE FUNCTION sp_manage_sms_template(
    p_action VARCHAR(10), -- 'CREATE', 'UPDATE', 'DELETE', 'GET'
    p_template_id INTEGER DEFAULT NULL,
    p_template_name VARCHAR(255) DEFAULT NULL,
    p_template_content TEXT DEFAULT NULL,
    p_template_type VARCHAR(50) DEFAULT 'general',
    p_is_active BOOLEAN DEFAULT TRUE,
    p_created_by INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_template_id INTEGER;
    v_templates JSON;
BEGIN
    CASE p_action
        WHEN 'CREATE' THEN
            -- Validate required fields
            IF p_template_name IS NULL OR p_template_content IS NULL THEN
                RETURN json_build_object(
                    'success', false,
                    'error', 'MISSING_FIELDS',
                    'message', 'Template name and content are required'
                );
            END IF;

            -- Create new template
            INSERT INTO sms_templates (
                template_name, template_content, template_type,
                is_active, created_by, created_at
            ) VALUES (
                p_template_name, p_template_content, p_template_type,
                p_is_active, p_created_by, CURRENT_TIMESTAMP
            ) RETURNING template_id INTO v_template_id;

            RETURN json_build_object(
                'success', true,
                'data', json_build_object(
                    'template_id', v_template_id,
                    'message', 'SMS template created successfully'
                )
            );

        WHEN 'UPDATE' THEN
            -- Update existing template
            UPDATE sms_templates SET
                template_name = COALESCE(p_template_name, template_name),
                template_content = COALESCE(p_template_content, template_content),
                template_type = COALESCE(p_template_type, template_type),
                is_active = COALESCE(p_is_active, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE template_id = p_template_id;

            IF NOT FOUND THEN
                RETURN json_build_object(
                    'success', false,
                    'error', 'TEMPLATE_NOT_FOUND',
                    'message', 'SMS template not found'
                );
            END IF;

            RETURN json_build_object(
                'success', true,
                'data', json_build_object(
                    'template_id', p_template_id,
                    'message', 'SMS template updated successfully'
                )
            );

        WHEN 'DELETE' THEN
            -- Soft delete template
            UPDATE sms_templates SET
                is_active = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE template_id = p_template_id;

            IF NOT FOUND THEN
                RETURN json_build_object(
                    'success', false,
                    'error', 'TEMPLATE_NOT_FOUND',
                    'message', 'SMS template not found'
                );
            END IF;

            RETURN json_build_object(
                'success', true,
                'data', json_build_object(
                    'template_id', p_template_id,
                    'message', 'SMS template deleted successfully'
                )
            );

        WHEN 'GET' THEN
            -- Get templates
            IF p_template_id IS NOT NULL THEN
                -- Get specific template
                SELECT json_build_object(
                    'template_id', template_id,
                    'template_name', template_name,
                    'template_content', template_content,
                    'template_type', template_type,
                    'is_active', is_active,
                    'created_at', created_at,
                    'updated_at', updated_at
                ) INTO v_templates
                FROM sms_templates
                WHERE template_id = p_template_id;
            ELSE
                -- Get all templates
                SELECT json_agg(
                    json_build_object(
                        'template_id', template_id,
                        'template_name', template_name,
                        'template_content', template_content,
                        'template_type', template_type,
                        'is_active', is_active,
                        'created_at', created_at,
                        'updated_at', updated_at
                    )
                ) INTO v_templates
                FROM sms_templates
                WHERE (p_template_type IS NULL OR template_type = p_template_type)
                ORDER BY created_at DESC;
            END IF;

            RETURN json_build_object(
                'success', true,
                'data', json_build_object(
                    'templates', COALESCE(v_templates, '[]'::JSON)
                )
            );

        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'INVALID_ACTION',
                'message', 'Invalid action. Use CREATE, UPDATE, DELETE, or GET'
            );
    END CASE;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'TEMPLATE_MANAGEMENT_ERROR',
        'message', SQLERRM
    );
END;
$$;
