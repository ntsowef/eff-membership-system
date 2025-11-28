-- Update Birthday Views with Multilingual Support
-- Implements language selection logic based on province and member's preferred language

-- Drop and recreate the view with multilingual support
DROP VIEW IF EXISTS vw_todays_birthdays CASCADE;

-- ============================================================================
-- VIEW: Today's Birthdays with Multilingual Support
-- ============================================================================
CREATE OR REPLACE VIEW vw_todays_birthdays AS
SELECT 
    m.member_id,
    ms.membership_number,
    m.firstname as first_name,
    m.surname as last_name,
    m.id_number,
    m.date_of_birth,
    m.email,
    m.cell_number as phone_number,
    w.ward_code,
    w.ward_name,
    mu.municipality_name,
    d.district_code,
    d.district_name,
    p.province_code,
    p.province_name,
    mst.status_name as membership_status,
    ms.date_joined as membership_start_date,
    ms.expiry_date as membership_expiry_date,
    
    -- Language information
    m.language_id,
    l.language_name,
    l.language_code,
    
    -- Calculate age
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER as age,
    
    -- Language selection logic:
    -- 1. If in Gauteng province (GT) -> Use English
    -- 2. If outside Gauteng -> Use member's preferred language
    -- 3. If no language set -> Fall back to English
    CASE 
        WHEN p.province_code = 'GT' THEN 2  -- English for Gauteng
        WHEN m.language_id IS NOT NULL THEN m.language_id
        ELSE 2  -- Default to English
    END as selected_language_id,
    
    CASE 
        WHEN p.province_code = 'GT' THEN 'English'
        WHEN l.language_name IS NOT NULL THEN l.language_name
        ELSE 'English'
    END as selected_language_name,
    
    CASE 
        WHEN p.province_code = 'GT' THEN 'en'
        WHEN l.language_code IS NOT NULL THEN l.language_code
        ELSE 'en'
    END as selected_language_code,
    
    -- Get the appropriate birthday message template
    COALESCE(
        (SELECT REPLACE(bmt.message_template, '{firstname}', m.firstname)
         FROM birthday_message_templates bmt
         WHERE bmt.language_id = CASE 
             WHEN p.province_code = 'GT' THEN 2  -- English for Gauteng
             WHEN m.language_id IS NOT NULL THEN m.language_id
             ELSE 2  -- Default to English
         END
         AND bmt.is_active = true
         LIMIT 1),
        -- Fallback to English if template not found
        REPLACE(
            'Happy Birthday {firstname}! The EFF wishes you a wonderful day filled with joy and prosperity. Thank you for being a valued member. Aluta Continua!',
            '{firstname}',
            m.firstname
        )
    ) as birthday_message,
    
    -- Language selection reason (for debugging/reporting)
    CASE 
        WHEN p.province_code = 'GT' THEN 'Gauteng - English'
        WHEN m.language_id IS NOT NULL THEN 'Member Preference'
        ELSE 'Default - English'
    END as language_selection_reason,
    
    -- Check if already sent today
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM birthday_messages_sent bms 
            WHERE bms.member_id = m.member_id 
            AND DATE(bms.sent_at) = CURRENT_DATE
        ) THEN true 
        ELSE false 
    END as message_sent_today
    
FROM members m
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
WHERE 
    -- Match month and day (ignore year)
    EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
    -- Only active members
    AND mst.is_active = true
    -- Must have valid phone number
    AND m.cell_number IS NOT NULL
    AND m.cell_number != ''
    AND LENGTH(TRIM(m.cell_number)) >= 10
ORDER BY m.firstname, m.surname;

-- ============================================================================
-- VIEW: Upcoming Birthdays with Multilingual Support
-- ============================================================================
DROP VIEW IF EXISTS vw_upcoming_birthdays CASCADE;

CREATE OR REPLACE VIEW vw_upcoming_birthdays AS
SELECT 
    m.member_id,
    ms.membership_number,
    m.firstname as first_name,
    m.surname as last_name,
    m.cell_number as phone_number,
    m.date_of_birth,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER as current_age,
    
    -- Language information
    m.language_id,
    l.language_name,
    l.language_code,
    
    -- Days until birthday
    CASE 
        WHEN EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
             AND EXTRACT(DAY FROM m.date_of_birth) >= EXTRACT(DAY FROM CURRENT_DATE)
        THEN EXTRACT(DAY FROM m.date_of_birth) - EXTRACT(DAY FROM CURRENT_DATE)
        WHEN EXTRACT(MONTH FROM m.date_of_birth) > EXTRACT(MONTH FROM CURRENT_DATE)
        THEN (DATE(EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                   EXTRACT(MONTH FROM m.date_of_birth) || '-' || 
                   EXTRACT(DAY FROM m.date_of_birth)) - CURRENT_DATE)
        ELSE (DATE((EXTRACT(YEAR FROM CURRENT_DATE) + 1) || '-' || 
                   EXTRACT(MONTH FROM m.date_of_birth) || '-' || 
                   EXTRACT(DAY FROM m.date_of_birth)) - CURRENT_DATE)
    END as days_until_birthday,
    
    p.province_name,
    p.province_code,
    d.district_name,
    mu.municipality_name,
    
    -- Selected language based on province
    CASE 
        WHEN p.province_code = 'GT' THEN 'English'
        WHEN l.language_name IS NOT NULL THEN l.language_name
        ELSE 'English'
    END as selected_language
    
FROM members m
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
WHERE 
    mst.is_active = true
    AND m.cell_number IS NOT NULL
    AND m.cell_number != ''
    AND LENGTH(TRIM(m.cell_number)) >= 10
    AND (
        -- Birthday in current month
        (EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(DAY FROM m.date_of_birth) >= EXTRACT(DAY FROM CURRENT_DATE))
        OR
        -- Birthday in next month (within 7 days)
        (EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '7 days')
         AND EXTRACT(DAY FROM m.date_of_birth) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '7 days'))
    )
ORDER BY days_until_birthday, m.firstname;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON VIEW vw_todays_birthdays IS 'Shows today''s birthdays with multilingual message support based on province and member language preference';
COMMENT ON VIEW vw_upcoming_birthdays IS 'Shows upcoming birthdays (next 7 days) with language information';

-- Grant permissions
GRANT SELECT ON vw_todays_birthdays TO eff_admin;
GRANT SELECT ON vw_upcoming_birthdays TO eff_admin;

-- Success message
DO $$
DECLARE
    todays_count INTEGER;
    gauteng_count INTEGER;
    other_provinces_count INTEGER;
    language_breakdown TEXT;
BEGIN
    SELECT COUNT(*) INTO todays_count FROM vw_todays_birthdays;
    
    SELECT COUNT(*) INTO gauteng_count 
    FROM vw_todays_birthdays 
    WHERE province_code = 'GT';
    
    SELECT COUNT(*) INTO other_provinces_count 
    FROM vw_todays_birthdays 
    WHERE province_code != 'GT' OR province_code IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Multilingual birthday views updated successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Today''s birthdays: % members', todays_count;
    RAISE NOTICE '  - Gauteng (English): % members', gauteng_count;
    RAISE NOTICE '  - Other provinces (Mother Tongue): % members', other_provinces_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Language Selection Logic:';
    RAISE NOTICE '  1. Gauteng province → English';
    RAISE NOTICE '  2. Other provinces → Member''s preferred language';
    RAISE NOTICE '  3. No language set → English (fallback)';
    RAISE NOTICE '';
    RAISE NOTICE 'New fields added:';
    RAISE NOTICE '  - language_id, language_name, language_code';
    RAISE NOTICE '  - selected_language_id, selected_language_name, selected_language_code';
    RAISE NOTICE '  - language_selection_reason';
    RAISE NOTICE '  - birthday_message (multilingual)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test: SELECT * FROM vw_todays_birthdays LIMIT 10;';
    RAISE NOTICE '  2. Run: node test/sms/test-multilingual-birthday-messages.js';
    RAISE NOTICE '';
END $$;

