-- =====================================================================================
-- BIRTHDAY SMS TEMPLATES - CORRECTED FOR EXISTING SCHEMA
-- =====================================================================================

-- Insert birthday SMS templates using existing column structure
INSERT INTO sms_templates (template_name, template_code, category, subject, message_template, variables, is_active, created_at) VALUES

-- Template 1: Standard Birthday Greeting
('Standard Birthday Greeting', 
'BIRTHDAY_STANDARD', 
'birthday', 
'Happy Birthday!',
'Happy Birthday {firstname}! 🎉 The EFF family wishes you a wonderful day filled with joy and blessings. Thank you for being a valued member of our movement. Enjoy your special day! - EFF Leadership', 
'{"firstname": "Member first name", "surname": "Member surname", "fullname": "Full member name"}'::jsonb,
TRUE, CURRENT_TIMESTAMP),

-- Template 2: Personalized with Age
('Birthday with Age', 
'BIRTHDAY_WITH_AGE',
'birthday', 
'Happy Birthday - Another Year Stronger!',
'Happy {age}th Birthday {firstname}! 🎂 Another year of fighting for economic freedom! The EFF celebrates you today. May this new year bring you prosperity and continued dedication to our cause. Aluta Continua! 🔴', 
'{"firstname": "Member first name", "age": "Member age", "surname": "Member surname"}'::jsonb,
TRUE, CURRENT_TIMESTAMP),

-- Template 3: Formal Birthday Message
('Formal Birthday Message', 
'BIRTHDAY_FORMAL',
'birthday', 
'Birthday Wishes from EFF Leadership',
'Dear Comrade {firstname} {surname}, On behalf of the Economic Freedom Fighters, we extend our warmest birthday wishes to you. Your commitment to our movement is deeply appreciated. Have a blessed day! - EFF {municipality}', 
'{"firstname": "Member first name", "surname": "Member surname", "municipality": "Municipality name"}'::jsonb,
TRUE, CURRENT_TIMESTAMP),

-- Template 4: Short and Sweet
('Short Birthday Wish', 
'BIRTHDAY_SHORT',
'birthday', 
'Happy Birthday!',
'Happy Birthday {firstname}! 🎉 EFF wishes you joy, health and prosperity. Thank you for your continued support! 🔴⚫️🟢', 
'{"firstname": "Member first name"}'::jsonb,
TRUE, CURRENT_TIMESTAMP),

-- Template 5: Birthday with Membership Recognition
('Birthday with Membership', 
'BIRTHDAY_MEMBERSHIP',
'birthday', 
'Birthday Wishes - Valued Member',
'Happy Birthday {firstname}! 🎊 As EFF Member #{membership_number}, you are part of something special. May your {age}th year be filled with economic freedom and success! Enjoy your day! - EFF {ward_name}', 
'{"firstname": "Member first name", "membership_number": "Membership number", "age": "Member age", "ward_name": "Ward name"}'::jsonb,
TRUE, CURRENT_TIMESTAMP),

-- Template 6: Inspirational Birthday Message
('Inspirational Birthday', 
'BIRTHDAY_INSPIRATIONAL',
'birthday', 
'Another Year Stronger!',
'Happy Birthday {firstname}! 🌟 Another year older, another year stronger in our fight for economic freedom! May this new chapter bring you closer to your dreams. The EFF family celebrates you today! ✊🔴', 
'{"firstname": "Member first name"}'::jsonb,
TRUE, CURRENT_TIMESTAMP),

-- Template 7: Birthday with Call to Action
('Birthday Call to Action', 
'BIRTHDAY_CALL_TO_ACTION',
'birthday', 
'Your Voice Matters!',
'Happy Birthday {firstname}! 🎉 As you celebrate another year, remember that your voice matters in our movement. Stay active, stay committed! The EFF needs leaders like you. Have a fantastic day! 💪', 
'{"firstname": "Member first name"}'::jsonb,
TRUE, CURRENT_TIMESTAMP),

-- Template 8: Cultural Birthday Greeting
('Cultural Birthday Greeting', 
'BIRTHDAY_CULTURAL',
'birthday', 
'Letsatsi la tswalo le monate!',
'Letsatsi la tswalo le monate {firstname}! 🎂 (Happy Birthday!) The EFF family from {municipality} celebrates you today. May your ancestors bless this new year of your life. Pula! 🌧️🔴', 
'{"firstname": "Member first name", "municipality": "Municipality name"}'::jsonb,
TRUE, CURRENT_TIMESTAMP),

-- Template 9: Youth-focused Birthday
('Youth Birthday Message', 
'BIRTHDAY_YOUTH',
'birthday', 
'Young Fighter Birthday!',
'Happy Birthday young fighter {firstname}! 🎉 The future of economic freedom is in your hands. As you turn {age}, remember that change starts with you! Keep fighting! - EFF Youth Command 🔥', 
'{"firstname": "Member first name", "age": "Member age"}'::jsonb,
TRUE, CURRENT_TIMESTAMP),

-- Template 10: Leadership Birthday
('Leadership Birthday', 
'BIRTHDAY_LEADERSHIP',
'birthday', 
'Leadership Birthday Wishes',
'Happy Birthday Comrade {firstname}! 🎊 Your leadership in {ward_name} inspires us all. May this new year bring you wisdom, strength, and continued success in advancing our cause. Aluta Continua! ✊', 
'{"firstname": "Member first name", "ward_name": "Ward name"}'::jsonb,
TRUE, CURRENT_TIMESTAMP);

-- Create corrected stored procedure for birthday SMS using existing schema
CREATE OR REPLACE FUNCTION sp_send_birthday_sms_corrected(
    p_template_code VARCHAR(50) DEFAULT 'BIRTHDAY_STANDARD',
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
    -- Get SMS template using existing schema
    SELECT message_template, template_name 
    INTO v_template_content, v_template_name
    FROM sms_templates 
    WHERE template_code = p_template_code AND category = 'birthday' AND is_active = TRUE;
    
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
            created_at
        ) VALUES (
            'Birthday Wishes - ' || TO_CHAR(p_send_date, 'YYYY-MM-DD'),
            v_template_content,
            p_sender_id,
            p_send_date,
            'Processing',
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
            'template_code', p_template_code,
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

-- Function to get available birthday templates
CREATE OR REPLACE FUNCTION sp_get_birthday_templates()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_templates JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'template_id', template_id,
            'template_name', template_name,
            'template_code', template_code,
            'subject', subject,
            'message_template', message_template,
            'variables', variables,
            'is_active', is_active
        )
    ) INTO v_templates
    FROM sms_templates
    WHERE category = 'birthday' AND is_active = TRUE
    ORDER BY template_name;
    
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'templates', COALESCE(v_templates, '[]'::JSON)
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'TEMPLATE_ERROR',
        'message', SQLERRM
    );
END;
$$;

SELECT 'Birthday SMS Templates Setup Complete!' as result;
