-- =====================================================================================
-- DAILY BIRTHDAY MANAGEMENT SYSTEM
-- =====================================================================================
-- Purpose: Automated daily birthday SMS system with comprehensive views and scheduling
-- Usage: Backend integration for daily birthday processing
-- =====================================================================================

-- =====================================================================================
-- 1. DAILY BIRTHDAY VIEW
-- =====================================================================================

-- Main birthday view for daily processing
CREATE OR REPLACE VIEW vw_daily_birthday_members AS
SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
    m.cell_number,
    m.email,
    m.date_of_birth,
    
    -- Age calculation
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) as current_age,
    
    -- Birthday information
    TO_CHAR(m.date_of_birth, 'MM-DD') as birthday_mmdd,
    TO_CHAR(CURRENT_DATE, 'MM-DD') as today_mmdd,
    
    -- Check if today is birthday
    CASE 
        WHEN EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
        THEN TRUE 
        ELSE FALSE 
    END as is_birthday_today,
    
    -- Membership details
    ms.membership_id,
    ms.membership_number,
    ms.date_joined,
    ms.expiry_date,
    ms.status_id,
    mst.status_name as membership_status,
    mst.is_active as membership_active,
    
    -- Geographic information
    m.ward_code,
    w.ward_name,
    w.ward_number,
    w.municipality_code,
    mu.municipality_name,
    d.district_code,
    d.district_name,
    p.province_code,
    p.province_name,
    
    -- Contact validation
    CASE 
        WHEN m.cell_number IS NOT NULL 
         AND m.cell_number != '' 
         AND m.cell_number ~ '^(\+27|0)[6-8][0-9]{8}$'
        THEN TRUE 
        ELSE FALSE 
    END as has_valid_cell_number,
    
    -- SMS eligibility
    CASE 
        WHEN m.cell_number IS NOT NULL 
         AND m.cell_number != '' 
         AND m.cell_number ~ '^(\+27|0)[6-8][0-9]{8}$'
         AND ms.expiry_date >= CURRENT_DATE
         AND mst.is_active = TRUE
        THEN TRUE 
        ELSE FALSE 
    END as sms_eligible,
    
    -- Days until/since birthday
    CASE 
        WHEN EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
        THEN 0 -- Today is birthday
        WHEN (DATE_PART('doy', m.date_of_birth) - DATE_PART('doy', CURRENT_DATE)) > 0
        THEN (DATE_PART('doy', m.date_of_birth) - DATE_PART('doy', CURRENT_DATE))::INTEGER
        ELSE (365 + DATE_PART('doy', m.date_of_birth) - DATE_PART('doy', CURRENT_DATE))::INTEGER
    END as days_until_birthday,
    
    -- Last birthday SMS sent (if any)
    (SELECT MAX(sm.created_at) 
     FROM sms_messages sm 
     JOIN sms_campaigns sc ON sm.campaign_id = sc.campaign_id
     WHERE sm.member_id = m.member_id 
       AND sc.campaign_name LIKE 'Birthday Wishes%'
       AND sm.status IN ('Sent', 'Delivered')
    ) as last_birthday_sms_sent,
    
    -- Check if birthday SMS already sent this year
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM sms_messages sm 
            JOIN sms_campaigns sc ON sm.campaign_id = sc.campaign_id
            WHERE sm.member_id = m.member_id 
              AND sc.campaign_name LIKE 'Birthday Wishes - ' || EXTRACT(YEAR FROM CURRENT_DATE) || '%'
              AND sm.status IN ('Sent', 'Delivered', 'Queued', 'Processing')
        ) THEN TRUE 
        ELSE FALSE 
    END as birthday_sms_sent_this_year,
    
    CURRENT_TIMESTAMP as view_generated_at

FROM members m
JOIN memberships ms ON m.member_id = ms.member_id
JOIN membership_statuses mst ON ms.status_id = mst.status_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
WHERE m.date_of_birth IS NOT NULL;

-- =====================================================================================
-- 2. TODAY'S BIRTHDAY MEMBERS VIEW
-- =====================================================================================

-- Filtered view for today's birthdays only
CREATE OR REPLACE VIEW vw_todays_birthday_members AS
SELECT *
FROM vw_daily_birthday_members
WHERE is_birthday_today = TRUE
  AND sms_eligible = TRUE
  AND birthday_sms_sent_this_year = FALSE
ORDER BY province_name, municipality_name, ward_name, surname, firstname;

-- =====================================================================================
-- 3. BIRTHDAY STATISTICS VIEW
-- =====================================================================================

-- Birthday statistics and analytics
CREATE OR REPLACE VIEW vw_birthday_statistics AS
SELECT 
    -- Today's birthday stats
    (SELECT COUNT(*) FROM vw_daily_birthday_members WHERE is_birthday_today = TRUE) as todays_birthdays_total,
    (SELECT COUNT(*) FROM vw_todays_birthday_members) as todays_birthdays_eligible,
    (SELECT COUNT(*) FROM vw_daily_birthday_members WHERE is_birthday_today = TRUE AND birthday_sms_sent_this_year = TRUE) as todays_birthdays_already_sent,
    
    -- This month's birthday stats
    (SELECT COUNT(*) FROM vw_daily_birthday_members 
     WHERE EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)) as this_month_birthdays,
    
    -- Next 7 days birthday stats
    (SELECT COUNT(*) FROM vw_daily_birthday_members WHERE days_until_birthday BETWEEN 1 AND 7) as upcoming_week_birthdays,
    
    -- Geographic breakdown of today's birthdays
    (SELECT json_agg(
        json_build_object(
            'province_name', province_name,
            'province_code', province_code,
            'birthday_count', birthday_count
        )
    ) FROM (
        SELECT 
            province_name, 
            province_code,
            COUNT(*) as birthday_count
        FROM vw_todays_birthday_members
        GROUP BY province_code, province_name
        ORDER BY birthday_count DESC
    ) province_stats) as province_breakdown,
    
    -- Age group breakdown of today's birthdays
    (SELECT json_agg(
        json_build_object(
            'age_group', age_group,
            'birthday_count', birthday_count
        )
    ) FROM (
        SELECT 
            CASE 
                WHEN current_age BETWEEN 18 AND 25 THEN '18-25'
                WHEN current_age BETWEEN 26 AND 35 THEN '26-35'
                WHEN current_age BETWEEN 36 AND 45 THEN '36-45'
                WHEN current_age BETWEEN 46 AND 55 THEN '46-55'
                WHEN current_age BETWEEN 56 AND 65 THEN '56-65'
                WHEN current_age > 65 THEN '65+'
                ELSE 'Unknown'
            END as age_group,
            COUNT(*) as birthday_count
        FROM vw_todays_birthday_members
        GROUP BY age_group
        ORDER BY birthday_count DESC
    ) age_stats) as age_group_breakdown,
    
    CURRENT_TIMESTAMP as stats_generated_at;

-- =====================================================================================
-- 4. DAILY BIRTHDAY PROCESSING STORED PROCEDURE
-- =====================================================================================

-- Main procedure for daily birthday SMS processing
CREATE OR REPLACE FUNCTION sp_process_daily_birthdays(
    p_template_code VARCHAR(50) DEFAULT 'BIRTHDAY_STANDARD',
    p_sender_id INTEGER DEFAULT 1,
    p_dry_run BOOLEAN DEFAULT FALSE,
    p_max_recipients INTEGER DEFAULT 1000
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
    v_processed_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_results JSON[] := '{}';
    v_processing_date DATE := CURRENT_DATE;
BEGIN
    -- Get SMS template
    SELECT message_template, template_name 
    INTO v_template_content, v_template_name
    FROM sms_templates 
    WHERE template_code = p_template_code AND category = 'birthday' AND is_active = TRUE;
    
    -- Use default template if none found
    IF v_template_content IS NULL THEN
        v_template_content := 'Happy Birthday {firstname}! 🎉 The EFF family wishes you a wonderful day filled with joy and blessings. Thank you for being a valued member of our movement. Enjoy your special day! - EFF Leadership';
        v_template_name := 'Default Birthday Template';
    END IF;
    
    -- Create campaign if not dry run
    IF NOT p_dry_run THEN
        INSERT INTO sms_campaigns (
            campaign_name, 
            message_content, 
            sender_id, 
            scheduled_date, 
            status, 
            created_at
        ) VALUES (
            'Birthday Wishes - ' || TO_CHAR(v_processing_date, 'YYYY-MM-DD'),
            v_template_content,
            p_sender_id,
            v_processing_date,
            'Processing',
            CURRENT_TIMESTAMP
        ) RETURNING campaign_id INTO v_campaign_id;
    END IF;
    
    -- Process each birthday member
    FOR v_member_record IN 
        SELECT * FROM vw_todays_birthday_members 
        ORDER BY province_name, municipality_name, surname, firstname
        LIMIT p_max_recipients
    LOOP
        BEGIN
            -- Personalize the message
            v_personalized_message := v_template_content;
            v_personalized_message := REPLACE(v_personalized_message, '{firstname}', v_member_record.firstname);
            v_personalized_message := REPLACE(v_personalized_message, '{surname}', v_member_record.surname);
            v_personalized_message := REPLACE(v_personalized_message, '{fullname}', v_member_record.full_name);
            v_personalized_message := REPLACE(v_personalized_message, '{age}', v_member_record.current_age::TEXT);
            v_personalized_message := REPLACE(v_personalized_message, '{membership_number}', COALESCE(v_member_record.membership_number, ''));
            v_personalized_message := REPLACE(v_personalized_message, '{ward_name}', COALESCE(v_member_record.ward_name, ''));
            v_personalized_message := REPLACE(v_personalized_message, '{municipality}', COALESCE(v_member_record.municipality_name, ''));
            
            -- Create SMS message record if not dry run
            IF NOT p_dry_run THEN
                INSERT INTO sms_messages (
                    campaign_id,
                    member_id,
                    recipient_number,
                    message_content,
                    status,
                    created_at
                ) VALUES (
                    v_campaign_id,
                    v_member_record.member_id,
                    v_member_record.cell_number,
                    v_personalized_message,
                    'Queued',
                    CURRENT_TIMESTAMP
                );
            END IF;
            
            v_processed_count := v_processed_count + 1;
            
            -- Add to results for dry run
            IF p_dry_run AND v_processed_count <= 10 THEN -- Show first 10 in dry run
                v_results := array_append(v_results, 
                    json_build_object(
                        'member_id', v_member_record.member_id,
                        'name', v_member_record.full_name,
                        'age', v_member_record.current_age,
                        'cell_number', v_member_record.cell_number,
                        'ward', v_member_record.ward_name,
                        'municipality', v_member_record.municipality_name,
                        'personalized_message', v_personalized_message
                    )
                );
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            -- Log error but continue processing
        END;
    END LOOP;
    
    -- Update campaign with final counts
    IF NOT p_dry_run AND v_campaign_id IS NOT NULL THEN
        UPDATE sms_campaigns 
        SET recipient_count = v_processed_count,
            status = CASE WHEN v_processed_count > 0 THEN 'Queued' ELSE 'Completed' END
        WHERE campaign_id = v_campaign_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'processing_date', v_processing_date,
            'campaign_id', COALESCE(v_campaign_id, 0),
            'template_used', v_template_name,
            'template_code', p_template_code,
            'processed_count', v_processed_count,
            'error_count', v_error_count,
            'dry_run', p_dry_run,
            'sample_results', CASE WHEN p_dry_run THEN v_results ELSE NULL END,
            'message', CASE 
                WHEN p_dry_run THEN format('DRY RUN: Would process %s birthday SMS messages', v_processed_count)
                ELSE format('Successfully processed %s birthday SMS messages', v_processed_count)
            END
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'DAILY_BIRTHDAY_PROCESSING_ERROR',
        'message', SQLERRM
    );
END;
$$;

SELECT 'Daily Birthday Management System Created Successfully!' as result;
