-- =====================================================================================
-- SMS TEMPLATES TABLE AND DEFAULT BIRTHDAY TEMPLATES
-- =====================================================================================

-- Create SMS templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS sms_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    template_content TEXT NOT NULL,
    template_type VARCHAR(50) DEFAULT 'general', -- 'birthday', 'renewal', 'welcome', 'general', 'campaign'
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_templates_type ON sms_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_sms_templates_active ON sms_templates(is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_sms_templates_updated_at 
    BEFORE UPDATE ON sms_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default birthday SMS templates
INSERT INTO sms_templates (template_name, template_content, template_type, is_active) VALUES

-- Template 1: Standard Birthday Greeting
('Standard Birthday Greeting', 
'Happy Birthday {firstname}! 🎉 The EFF family wishes you a wonderful day filled with joy and blessings. Thank you for being a valued member of our movement. Enjoy your special day! - EFF Leadership', 
'birthday', TRUE),

-- Template 2: Personalized with Age
('Birthday with Age', 
'Happy {age}th Birthday {firstname}! 🎂 Another year of fighting for economic freedom! The EFF celebrates you today. May this new year bring you prosperity and continued dedication to our cause. Aluta Continua! 🔴', 
'birthday', TRUE),

-- Template 3: Formal Birthday Message
('Formal Birthday Message', 
'Dear Comrade {firstname} {surname}, On behalf of the Economic Freedom Fighters, we extend our warmest birthday wishes to you. Your commitment to our movement is deeply appreciated. Have a blessed day! - EFF {municipality}', 
'birthday', TRUE),

-- Template 4: Short and Sweet
('Short Birthday Wish', 
'Happy Birthday {firstname}! 🎉 EFF wishes you joy, health and prosperity. Thank you for your continued support! 🔴⚫️🟢', 
'birthday', TRUE),

-- Template 5: Birthday with Membership Recognition
('Birthday with Membership', 
'Happy Birthday {firstname}! 🎊 As EFF Member #{membership_number}, you are part of something special. May your {age}th year be filled with economic freedom and success! Enjoy your day! - EFF {ward_name}', 
'birthday', TRUE),

-- Template 6: Inspirational Birthday Message
('Inspirational Birthday', 
'Happy Birthday {firstname}! 🌟 Another year older, another year stronger in our fight for economic freedom! May this new chapter bring you closer to your dreams. The EFF family celebrates you today! ✊🔴', 
'birthday', TRUE),

-- Template 7: Birthday with Call to Action
('Birthday Call to Action', 
'Happy Birthday {firstname}! 🎉 As you celebrate another year, remember that your voice matters in our movement. Stay active, stay committed! The EFF needs leaders like you. Have a fantastic day! 💪', 
'birthday', TRUE),

-- Template 8: Cultural Birthday Greeting
('Cultural Birthday Greeting', 
'Letsatsi la tswalo le monate {firstname}! 🎂 (Happy Birthday!) The EFF family from {municipality} celebrates you today. May your ancestors bless this new year of your life. Pula! 🌧️🔴', 
'birthday', TRUE),

-- Template 9: Youth-focused Birthday
('Youth Birthday Message', 
'Happy Birthday young fighter {firstname}! 🎉 The future of economic freedom is in your hands. As you turn {age}, remember that change starts with you! Keep fighting! - EFF Youth Command 🔥', 
'birthday', TRUE),

-- Template 10: Leadership Birthday
('Leadership Birthday', 
'Happy Birthday Comrade {firstname}! 🎊 Your leadership in {ward_name} inspires us all. May this new year bring you wisdom, strength, and continued success in advancing our cause. Aluta Continua! ✊', 
'birthday', TRUE);

-- Insert additional template types for other occasions
INSERT INTO sms_templates (template_name, template_content, template_type, is_active) VALUES

-- Membership Renewal Templates
('Renewal Reminder', 
'Dear {firstname}, your EFF membership expires on {expiry_date}. Renew today to continue being part of the movement for economic freedom! Visit your nearest branch or renew online. - EFF', 
'renewal', TRUE),

('Renewal Thank You', 
'Thank you {firstname}! Your EFF membership has been successfully renewed until {new_expiry_date}. Together we continue the fight for economic freedom! Membership #{membership_number}', 
'renewal', TRUE),

-- Welcome Templates
('New Member Welcome', 
'Welcome to the EFF family {firstname}! 🔴⚫️🟢 Your membership #{membership_number} is now active. Together we fight for economic freedom! Report to {ward_name} for orientation. Aluta Continua!', 
'welcome', TRUE),

-- Campaign Templates
('Meeting Reminder', 
'Comrade {firstname}, reminder: EFF {municipality} meeting on {date} at {time}. Your presence is important for our movement. Venue: {venue}. See you there! - EFF {ward_name}', 
'campaign', TRUE),

('Event Invitation', 
'Dear {firstname}, you are invited to {event_name} on {date}. Join fellow EFF members from {municipality} for this important gathering. RSVP required. Details: {event_details}', 
'campaign', TRUE);

-- Create a view for easy template management
CREATE OR REPLACE VIEW vw_sms_templates AS
SELECT 
    st.template_id,
    st.template_name,
    st.template_content,
    st.template_type,
    st.is_active,
    st.created_at,
    st.updated_at,
    u.name as created_by_name,
    -- Count usage statistics
    (SELECT COUNT(*) FROM sms_messages sm 
     JOIN sms_campaigns sc ON sm.campaign_id = sc.campaign_id 
     WHERE sc.message_content = st.template_content) as usage_count,
    -- Available placeholders for each template type
    CASE st.template_type
        WHEN 'birthday' THEN '{firstname}, {surname}, {fullname}, {age}, {membership_number}, {ward_name}, {municipality}'
        WHEN 'renewal' THEN '{firstname}, {surname}, {expiry_date}, {new_expiry_date}, {membership_number}, {days_remaining}'
        WHEN 'welcome' THEN '{firstname}, {surname}, {membership_number}, {ward_name}, {municipality}'
        WHEN 'campaign' THEN '{firstname}, {surname}, {date}, {time}, {venue}, {event_name}, {event_details}, {municipality}, {ward_name}'
        ELSE '{firstname}, {surname}, {fullname}, {membership_number}'
    END as available_placeholders
FROM sms_templates st
LEFT JOIN users u ON st.created_by = u.user_id
ORDER BY st.template_type, st.template_name;

-- Function to get birthday members for a specific date
CREATE OR REPLACE FUNCTION sp_get_birthday_members(
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_members JSON;
    v_count INTEGER;
BEGIN
    SELECT 
        json_agg(
            json_build_object(
                'member_id', m.member_id,
                'firstname', m.firstname,
                'surname', m.surname,
                'full_name', m.firstname || ' ' || m.surname,
                'cell_number', m.cell_number,
                'date_of_birth', m.date_of_birth,
                'age', EXTRACT(YEAR FROM AGE(p_date, m.date_of_birth)),
                'membership_number', ms.membership_number,
                'ward_name', w.ward_name,
                'municipality_name', mu.municipality_name,
                'membership_status', mst.status_name,
                'expiry_date', ms.expiry_date
            )
        ),
        COUNT(*)
    INTO v_members, v_count
    FROM members m
    JOIN memberships ms ON m.member_id = ms.member_id
    JOIN membership_statuses mst ON ms.status_id = mst.status_id
    LEFT JOIN wards w ON m.ward_code = w.ward_code
    LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
    WHERE EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM p_date)
      AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM p_date)
      AND m.cell_number IS NOT NULL 
      AND m.cell_number != ''
      AND ms.expiry_date >= CURRENT_DATE
      AND mst.is_active = TRUE;
    
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'date', p_date,
            'member_count', COALESCE(v_count, 0),
            'members', COALESCE(v_members, '[]'::JSON)
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'BIRTHDAY_MEMBERS_ERROR',
        'message', SQLERRM
    );
END;
$$;

SELECT 'SMS Templates and Birthday System Setup Complete!' as result;
