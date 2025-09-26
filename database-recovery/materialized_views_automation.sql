-- =====================================================================================
-- MATERIALIZED VIEWS AUTOMATION AND SCHEDULING SYSTEM
-- =====================================================================================
-- Purpose: Automated refresh scheduling and trigger-based updates for materialized tables
-- Performance: Optimized for 20,000+ concurrent users with minimal downtime
-- =====================================================================================

-- =====================================================================================
-- 1. REFRESH SCHEDULING TABLE
-- =====================================================================================

-- Track refresh schedules and execution history
CREATE TABLE IF NOT EXISTS mv_refresh_schedule (
    schedule_id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    refresh_type VARCHAR(20) DEFAULT 'FULL', -- 'FULL', 'INCREMENTAL', 'TRIGGERED'
    schedule_cron VARCHAR(50), -- Cron expression for scheduling
    last_refresh TIMESTAMP,
    next_refresh TIMESTAMP,
    refresh_duration_seconds INTEGER DEFAULT 0,
    rows_affected INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default refresh schedules
INSERT INTO mv_refresh_schedule (table_name, refresh_type, schedule_cron, next_refresh, is_active) VALUES
('mv_membership_summary', 'FULL', '0 */6 * * *', CURRENT_TIMESTAMP + INTERVAL '6 hours', TRUE), -- Every 6 hours
('mv_member_search', 'FULL', '0 2 * * *', CURRENT_TIMESTAMP + INTERVAL '1 day', TRUE), -- Daily at 2 AM
('mv_birthday_calendar', 'FULL', '0 1 * * *', CURRENT_TIMESTAMP + INTERVAL '1 day', TRUE), -- Daily at 1 AM
('mv_daily_statistics', 'INCREMENTAL', '0 */1 * * *', CURRENT_TIMESTAMP + INTERVAL '1 hour', TRUE), -- Hourly
('mv_leadership_hierarchy', 'TRIGGERED', NULL, NULL, TRUE); -- Trigger-based only

-- =====================================================================================
-- 2. INCREMENTAL UPDATE TRACKING
-- =====================================================================================

-- Track changes for incremental updates
CREATE TABLE IF NOT EXISTS mv_change_log (
    change_id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    record_id INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP
);

-- Index for efficient change tracking
CREATE INDEX IF NOT EXISTS idx_mv_change_log_table_processed ON mv_change_log(table_name, processed);
CREATE INDEX IF NOT EXISTS idx_mv_change_log_changed_at ON mv_change_log(changed_at);

-- =====================================================================================
-- 3. TRIGGER FUNCTIONS FOR REAL-TIME UPDATES
-- =====================================================================================

-- Generic trigger function to log changes
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Log the change for materialized view updates
    INSERT INTO mv_change_log (table_name, operation, record_id, changed_at)
    VALUES (TG_TABLE_NAME, TG_OP, 
            CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.member_id
                ELSE NEW.member_id
            END,
            CURRENT_TIMESTAMP);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Create triggers on key tables for real-time updates
DROP TRIGGER IF EXISTS trigger_members_changes ON members;
CREATE TRIGGER trigger_members_changes
    AFTER INSERT OR UPDATE OR DELETE ON members
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();

DROP TRIGGER IF EXISTS trigger_memberships_changes ON memberships;
CREATE TRIGGER trigger_memberships_changes
    AFTER INSERT OR UPDATE OR DELETE ON memberships
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- =====================================================================================
-- 4. SMART REFRESH FUNCTIONS
-- =====================================================================================

-- Incremental refresh for membership summary (only changed wards)
CREATE OR REPLACE FUNCTION refresh_mv_membership_summary_incremental()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rows_affected INTEGER := 0;
    v_ward_codes TEXT[];
BEGIN
    -- Get affected ward codes from change log
    SELECT ARRAY_AGG(DISTINCT m.ward_code)
    INTO v_ward_codes
    FROM mv_change_log cl
    JOIN members m ON cl.record_id = m.member_id
    WHERE cl.table_name IN ('members', 'memberships') 
      AND cl.processed = FALSE;
    
    -- If no changes, return
    IF v_ward_codes IS NULL OR array_length(v_ward_codes, 1) = 0 THEN
        RETURN 0;
    END IF;
    
    -- Delete existing records for affected wards
    DELETE FROM mv_membership_summary 
    WHERE ward_code = ANY(v_ward_codes);
    
    -- Rebuild only affected wards
    INSERT INTO mv_membership_summary (
        province_code, province_name, district_code, district_name,
        municipality_code, municipality_name, ward_code, ward_name,
        total_members, active_members, expired_members, suspended_members,
        new_members_this_month, new_members_this_year,
        male_members, female_members, other_gender_members,
        age_18_25, age_26_35, age_36_45, age_46_55, age_56_65, age_over_65,
        members_with_email, members_with_cell, members_with_valid_cell,
        ward_performance_level, birthdays_this_month, birthdays_next_month,
        last_updated, data_as_of_date
    )
    SELECT 
        p.province_code, p.province_name,
        d.district_code, d.district_name,
        mu.municipality_code, mu.municipality_name,
        w.ward_code, w.ward_name,
        
        -- Membership counts
        COUNT(m.member_id) as total_members,
        COUNT(CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active THEN 1 END) as active_members,
        COUNT(CASE WHEN ms.expiry_date < CURRENT_DATE THEN 1 END) as expired_members,
        COUNT(CASE WHEN NOT mst.is_active THEN 1 END) as suspended_members,
        COUNT(CASE WHEN ms.date_joined >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as new_members_this_month,
        COUNT(CASE WHEN ms.date_joined >= DATE_TRUNC('year', CURRENT_DATE) THEN 1 END) as new_members_this_year,
        
        -- Demographics
        COUNT(CASE WHEN m.gender = 'Male' THEN 1 END) as male_members,
        COUNT(CASE WHEN m.gender = 'Female' THEN 1 END) as female_members,
        COUNT(CASE WHEN m.gender NOT IN ('Male', 'Female') OR m.gender IS NULL THEN 1 END) as other_gender_members,
        
        -- Age groups
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) BETWEEN 18 AND 25 THEN 1 END) as age_18_25,
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) BETWEEN 26 AND 35 THEN 1 END) as age_26_35,
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) BETWEEN 36 AND 45 THEN 1 END) as age_36_45,
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) BETWEEN 46 AND 55 THEN 1 END) as age_46_55,
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) BETWEEN 56 AND 65 THEN 1 END) as age_56_65,
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) > 65 THEN 1 END) as age_over_65,
        
        -- Contact information
        COUNT(CASE WHEN m.email IS NOT NULL AND m.email != '' THEN 1 END) as members_with_email,
        COUNT(CASE WHEN m.cell_number IS NOT NULL AND m.cell_number != '' THEN 1 END) as members_with_cell,
        COUNT(CASE WHEN m.cell_number ~ '^(\+27|0)[6-8][0-9]{8}$' THEN 1 END) as members_with_valid_cell,
        
        -- Ward performance level
        CASE 
            WHEN COUNT(CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active THEN 1 END) >= 200 THEN 'Good Standing'
            WHEN COUNT(CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active THEN 1 END) >= 100 THEN 'Acceptable'
            ELSE 'Needs Improvement'
        END as ward_performance_level,
        
        -- Birthday information
        COUNT(CASE WHEN EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) THEN 1 END) as birthdays_this_month,
        COUNT(CASE WHEN EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month') THEN 1 END) as birthdays_next_month,
        
        CURRENT_TIMESTAMP as last_updated,
        CURRENT_DATE as data_as_of_date
        
    FROM provinces p
    LEFT JOIN districts d ON p.province_code = d.province_code
    LEFT JOIN municipalities mu ON d.district_code = mu.district_code
    LEFT JOIN wards w ON mu.municipality_code = w.municipality_code
    LEFT JOIN members m ON w.ward_code = m.ward_code
    LEFT JOIN memberships ms ON m.member_id = ms.member_id
    LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
    WHERE w.ward_code = ANY(v_ward_codes)
    GROUP BY p.province_code, p.province_name, d.district_code, d.district_name,
             mu.municipality_code, mu.municipality_name, w.ward_code, w.ward_name
    HAVING COUNT(m.member_id) > 0;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    -- Mark changes as processed
    UPDATE mv_change_log 
    SET processed = TRUE, processed_at = CURRENT_TIMESTAMP
    WHERE table_name IN ('members', 'memberships') 
      AND processed = FALSE;
    
    RETURN v_rows_affected;
END;
$$;

-- =====================================================================================
-- 5. AUTOMATED REFRESH SCHEDULER
-- =====================================================================================

-- Function to execute scheduled refreshes
CREATE OR REPLACE FUNCTION execute_scheduled_refreshes()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_schedule_record RECORD;
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_duration INTEGER;
    v_rows_affected INTEGER;
    v_results JSON[] := '{}';
    v_total_refreshed INTEGER := 0;
BEGIN
    -- Process all due refreshes
    FOR v_schedule_record IN 
        SELECT * FROM mv_refresh_schedule 
        WHERE is_active = TRUE 
          AND next_refresh <= CURRENT_TIMESTAMP
        ORDER BY table_name
    LOOP
        v_start_time := CURRENT_TIMESTAMP;
        v_rows_affected := 0;
        
        BEGIN
            -- Execute appropriate refresh based on type
            CASE v_schedule_record.refresh_type
                WHEN 'FULL' THEN
                    CASE v_schedule_record.table_name
                        WHEN 'mv_membership_summary' THEN
                            SELECT refresh_mv_membership_summary() INTO v_rows_affected;
                        WHEN 'mv_member_search' THEN
                            SELECT refresh_mv_member_search() INTO v_rows_affected;
                        WHEN 'mv_birthday_calendar' THEN
                            SELECT refresh_mv_birthday_calendar() INTO v_rows_affected;
                        WHEN 'mv_daily_statistics' THEN
                            SELECT refresh_mv_daily_statistics() INTO v_rows_affected;
                    END CASE;
                    
                WHEN 'INCREMENTAL' THEN
                    CASE v_schedule_record.table_name
                        WHEN 'mv_membership_summary' THEN
                            SELECT refresh_mv_membership_summary_incremental() INTO v_rows_affected;
                        WHEN 'mv_daily_statistics' THEN
                            SELECT refresh_mv_daily_statistics() INTO v_rows_affected;
                    END CASE;
            END CASE;
            
            v_end_time := CURRENT_TIMESTAMP;
            v_duration := EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INTEGER;
            
            -- Update schedule record
            UPDATE mv_refresh_schedule SET
                last_refresh = v_start_time,
                next_refresh = CASE 
                    WHEN schedule_cron = '0 */6 * * *' THEN v_start_time + INTERVAL '6 hours'
                    WHEN schedule_cron = '0 2 * * *' THEN v_start_time + INTERVAL '1 day'
                    WHEN schedule_cron = '0 1 * * *' THEN v_start_time + INTERVAL '1 day'
                    WHEN schedule_cron = '0 */1 * * *' THEN v_start_time + INTERVAL '1 hour'
                    ELSE v_start_time + INTERVAL '1 day'
                END,
                refresh_duration_seconds = v_duration,
                rows_affected = v_rows_affected,
                updated_at = CURRENT_TIMESTAMP
            WHERE schedule_id = v_schedule_record.schedule_id;
            
            -- Add to results
            v_results := array_append(v_results, 
                json_build_object(
                    'table_name', v_schedule_record.table_name,
                    'refresh_type', v_schedule_record.refresh_type,
                    'success', true,
                    'rows_affected', v_rows_affected,
                    'duration_seconds', v_duration,
                    'refreshed_at', v_start_time
                )
            );
            
            v_total_refreshed := v_total_refreshed + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue with other refreshes
            v_results := array_append(v_results, 
                json_build_object(
                    'table_name', v_schedule_record.table_name,
                    'refresh_type', v_schedule_record.refresh_type,
                    'success', false,
                    'error', SQLERRM,
                    'attempted_at', v_start_time
                )
            );
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'total_refreshed', v_total_refreshed,
        'executed_at', CURRENT_TIMESTAMP,
        'results', v_results
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'SCHEDULER_ERROR',
        'message', SQLERRM
    );
END;
$$;

-- =====================================================================================
-- 6. PERFORMANCE MONITORING
-- =====================================================================================

-- View to monitor materialized table performance
CREATE OR REPLACE VIEW vw_materialized_table_status AS
SELECT 
    mrs.table_name,
    mrs.refresh_type,
    mrs.schedule_cron,
    mrs.last_refresh,
    mrs.next_refresh,
    mrs.refresh_duration_seconds,
    mrs.rows_affected,
    mrs.is_active,
    
    -- Table size information
    pg_size_pretty(pg_total_relation_size(mrs.table_name::regclass)) as table_size,
    
    -- Freshness indicators
    CASE 
        WHEN mrs.last_refresh IS NULL THEN 'Never Refreshed'
        WHEN mrs.last_refresh < CURRENT_TIMESTAMP - INTERVAL '1 day' THEN 'Stale'
        WHEN mrs.last_refresh < CURRENT_TIMESTAMP - INTERVAL '6 hours' THEN 'Aging'
        ELSE 'Fresh'
    END as freshness_status,
    
    -- Next refresh timing
    CASE 
        WHEN mrs.next_refresh <= CURRENT_TIMESTAMP THEN 'Due Now'
        WHEN mrs.next_refresh <= CURRENT_TIMESTAMP + INTERVAL '1 hour' THEN 'Due Soon'
        ELSE 'Scheduled'
    END as refresh_status,
    
    -- Performance metrics
    CASE 
        WHEN mrs.refresh_duration_seconds > 300 THEN 'Slow'
        WHEN mrs.refresh_duration_seconds > 60 THEN 'Moderate'
        ELSE 'Fast'
    END as performance_rating
    
FROM mv_refresh_schedule mrs
WHERE mrs.is_active = TRUE
ORDER BY mrs.next_refresh;

SELECT 'Materialized Views Automation System Created Successfully!' as result;
