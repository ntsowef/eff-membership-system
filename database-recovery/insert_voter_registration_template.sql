-- =====================================================================================
-- VOTER REGISTRATION REMINDER SMS TEMPLATE
-- =====================================================================================
-- Inserts a new SMS template for reminding unregistered members to register to vote.
-- Uses the existing sms_templates column structure (template_code, category, message_template, etc.)

INSERT INTO sms_templates (template_name, template_code, category, subject, message_template, variables, is_active, created_at)
VALUES (
  'Voter Registration Reminder',
  'VOTER_REGISTRATION',
  'campaign',
  'Register to Vote',
  'Revolutionary greetings {firstname}! Please register to vote. Make sure your voice is heard in the upcoming elections. Check your registration status and encourage friends and family to do the same. Let''s shape our future.',
  '{"firstname": "Member first name"}'::jsonb,
  TRUE,
  CURRENT_TIMESTAMP
);

SELECT 'Voter Registration Reminder SMS Template inserted!' as result;

-- Update the sms_send_log check constraint to allow 'voter_registration' source type
ALTER TABLE sms_send_log DROP CONSTRAINT IF EXISTS chk_source_type;
ALTER TABLE sms_send_log ADD CONSTRAINT chk_source_type
  CHECK (source_type IN ('quick_send', 'birthday', 'campaign', 'expiration_reminder', 'bulk', 'manual', 'voter_registration'));

SELECT 'sms_send_log constraint updated!' as result;
