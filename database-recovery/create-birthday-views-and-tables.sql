-- Birthday SMS System
-- Creates views and tables for automatic birthday message sending

-- Drop existing objects if they exist
DROP VIEW IF EXISTS vw_todays_birthdays CASCADE;
DROP VIEW IF EXISTS vw_upcoming_birthdays CASCADE;
DROP VIEW IF EXISTS vw_birthday_messages_stats CASCADE;
DROP TABLE IF EXISTS birthday_messages_sent CASCADE;

-- ============================================================================
-- TABLE: Birthday Messages Sent Log (Create first, before views)
-- ============================================================================
-- Tracks all birthday messages sent to prevent duplicates
CREATE TABLE birthday_messages_sent (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    membership_number VARCHAR(50),
    member_name VARCHAR(255),
    phone_number VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    sms_message_id VARCHAR(255),
    delivery_status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    birthday_year INTEGER NOT NULL,
    member_age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for birthday_messages_sent
CREATE INDEX idx_birthday_messages_member_id ON birthday_messages_sent(member_id);
CREATE INDEX idx_birthday_messages_sent_at ON birthday_messages_sent(sent_at DESC);
CREATE INDEX idx_birthday_messages_delivery_status ON birthday_messages_sent(delivery_status);
CREATE INDEX idx_birthday_messages_birthday_year ON birthday_messages_sent(birthday_year);
CREATE INDEX idx_birthday_messages_member_sent_date ON birthday_messages_sent(member_id, sent_at);

-- Unique constraint to prevent duplicate messages on same day
CREATE UNIQUE INDEX idx_birthday_messages_unique_daily
ON birthday_messages_sent(member_id, DATE(sent_at));

-- Update timestamp trigger
CREATE TRIGGER update_birthday_messages_sent_updated_at
    BEFORE UPDATE ON birthday_messages_sent
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEW: Today's Birthdays
-- ============================================================================
-- Shows all members whose birthday is today (ignoring year)
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
    -- Calculate age
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER as age,
    -- Format birthday message
    CONCAT(
        'Happy Birthday ',
        m.firstname,
        '! The EFF wishes you a wonderful day filled with joy and prosperity. ',
        'Thank you for being a valued member. Aluta Continua!'
    ) as birthday_message,
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
-- VIEW: Birthday Messages Statistics
-- ============================================================================
CREATE OR REPLACE VIEW vw_birthday_messages_stats AS
SELECT 
    DATE(sent_at) as date,
    COUNT(*) as total_sent,
    SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
    SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) as pending,
    ROUND(
        (SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END)::DECIMAL / 
         NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as delivery_rate_percent
FROM birthday_messages_sent
GROUP BY DATE(sent_at)
ORDER BY DATE(sent_at) DESC;

-- ============================================================================
-- VIEW: Upcoming Birthdays (Next 7 Days)
-- ============================================================================
CREATE OR REPLACE VIEW vw_upcoming_birthdays AS
SELECT
    m.member_id,
    ms.membership_number,
    m.firstname as first_name,
    m.surname as last_name,
    m.cell_number as phone_number,
    m.date_of_birth,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER as current_age,
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
    d.district_name,
    mu.municipality_name
FROM members m
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
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
COMMENT ON VIEW vw_todays_birthdays IS 'Shows all active members with birthdays today who have valid phone numbers';
COMMENT ON TABLE birthday_messages_sent IS 'Logs all birthday SMS messages sent to members';
COMMENT ON VIEW vw_birthday_messages_stats IS 'Daily statistics of birthday messages sent and delivery rates';
COMMENT ON VIEW vw_upcoming_birthdays IS 'Shows members with birthdays in the next 7 days';

COMMENT ON COLUMN birthday_messages_sent.member_id IS 'Reference to member who received birthday message';
COMMENT ON COLUMN birthday_messages_sent.sms_message_id IS 'SMS provider message ID for tracking';
COMMENT ON COLUMN birthday_messages_sent.delivery_status IS 'Status: pending, delivered, failed';
COMMENT ON COLUMN birthday_messages_sent.birthday_year IS 'Year when birthday message was sent';
COMMENT ON COLUMN birthday_messages_sent.member_age IS 'Age of member on their birthday';

-- Grant permissions
GRANT SELECT ON vw_todays_birthdays TO eff_admin;
GRANT SELECT ON vw_birthday_messages_stats TO eff_admin;
GRANT SELECT ON vw_upcoming_birthdays TO eff_admin;
GRANT ALL PRIVILEGES ON TABLE birthday_messages_sent TO eff_admin;
GRANT USAGE, SELECT ON SEQUENCE birthday_messages_sent_id_seq TO eff_admin;

-- Success message
DO $$
DECLARE
    todays_count INTEGER;
    upcoming_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO todays_count FROM vw_todays_birthdays;
    SELECT COUNT(*) INTO upcoming_count FROM vw_upcoming_birthdays;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Birthday SMS system created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Views created:';
    RAISE NOTICE '  - vw_todays_birthdays (% members)', todays_count;
    RAISE NOTICE '  - vw_upcoming_birthdays (% members in next 7 days)', upcoming_count;
    RAISE NOTICE '  - vw_birthday_messages_stats';
    RAISE NOTICE '';
    RAISE NOTICE 'Table created:';
    RAISE NOTICE '  - birthday_messages_sent (tracking log)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. View todays birthdays: SELECT * FROM vw_todays_birthdays;';
    RAISE NOTICE '  2. Configure cron job to run at 7am daily';
    RAISE NOTICE '  3. Test: node test/sms/test-birthday-messages.js';
    RAISE NOTICE '';
END $$;

