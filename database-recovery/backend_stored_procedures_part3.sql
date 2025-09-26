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
