-- Create missing communication_preferences table with WhatsApp enabled
CREATE TABLE IF NOT EXISTS communication_preferences (
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL,
  
  -- Channel preferences
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  whatsapp_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  
  -- Content preferences
  marketing_emails BOOLEAN DEFAULT TRUE,
  system_notifications BOOLEAN DEFAULT TRUE,
  membership_reminders BOOLEAN DEFAULT TRUE,
  event_notifications BOOLEAN DEFAULT TRUE,
  newsletter BOOLEAN DEFAULT TRUE,
  
  -- Frequency preferences
  digest_frequency VARCHAR(20) DEFAULT 'Immediate',
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  UNIQUE (member_id)
);

-- Trigger for updated_at if it exists for other tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_whatsapp_updated_at') THEN
        CREATE TRIGGER trigger_communication_preferences_updated_at
          BEFORE UPDATE ON communication_preferences
          FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();
    END IF;
END $$;
