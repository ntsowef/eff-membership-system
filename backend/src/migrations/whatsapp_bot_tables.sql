-- WhatsApp Bot Integration Tables
-- Migration for WasenderAPI WhatsApp bot integration

-- 1. WhatsApp Bot Conversation Logs
CREATE TABLE IF NOT EXISTS whatsapp_bot_logs (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(50),                    -- Unique conversation ID
  phone_number VARCHAR(20) NOT NULL,              -- Member's phone number
  member_id INTEGER REFERENCES members_consolidated(member_id),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- 'text', 'menu', 'status_inquiry', etc.
  message_content TEXT,
  wasender_message_id VARCHAR(100),               -- WasenderAPI message ID
  intent_detected VARCHAR(50),                    -- 'member_lookup', 'status_check', 'help', etc.
  bot_state VARCHAR(50),                          -- Current conversation state
  response_sent TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',                    -- Additional data (e.g., media info)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for WhatsApp bot logs
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone ON whatsapp_bot_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_member ON whatsapp_bot_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON whatsapp_bot_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_bot_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_direction ON whatsapp_bot_logs(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_intent ON whatsapp_bot_logs(intent_detected);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_wasender_id ON whatsapp_bot_logs(wasender_message_id);

-- 2. WhatsApp Bot Sessions (for multi-turn conversations)
CREATE TABLE IF NOT EXISTS whatsapp_bot_sessions (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  member_id INTEGER REFERENCES members_consolidated(member_id),
  current_state VARCHAR(50) DEFAULT 'idle',       -- 'idle', 'awaiting_id', 'confirming', etc.
  context JSONB DEFAULT '{}',                     -- Store conversation context
  last_intent VARCHAR(50),                        -- Last detected intent
  conversation_count INTEGER DEFAULT 0,           -- Number of messages in session
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for WhatsApp bot sessions
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_bot_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_member ON whatsapp_bot_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_state ON whatsapp_bot_sessions(current_state);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_activity ON whatsapp_bot_sessions(last_activity_at);

-- 3. WhatsApp Notification Queue (for outbound campaigns)
CREATE TABLE IF NOT EXISTS whatsapp_notification_queue (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members_consolidated(member_id),
  phone_number VARCHAR(20) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,         -- 'payment_reminder', 'expiry_notice', 'welcome', etc.
  message_template VARCHAR(100) NOT NULL,
  message_content TEXT NOT NULL,
  priority INTEGER DEFAULT 5,                     -- 1 (highest) to 10 (lowest)
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  wasender_message_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'cancelled')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notification queue
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_scheduled ON whatsapp_notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_member ON whatsapp_notification_queue(member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_type ON whatsapp_notification_queue(notification_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_priority ON whatsapp_notification_queue(priority);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_whatsapp_logs_updated_at ON whatsapp_bot_logs;
CREATE TRIGGER trigger_whatsapp_logs_updated_at
  BEFORE UPDATE ON whatsapp_bot_logs
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

DROP TRIGGER IF EXISTS trigger_whatsapp_sessions_updated_at ON whatsapp_bot_sessions;
CREATE TRIGGER trigger_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_bot_sessions
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

DROP TRIGGER IF EXISTS trigger_whatsapp_queue_updated_at ON whatsapp_notification_queue;
CREATE TRIGGER trigger_whatsapp_queue_updated_at
  BEFORE UPDATE ON whatsapp_notification_queue
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

-- Comments for documentation
COMMENT ON TABLE whatsapp_bot_logs IS 'Stores all WhatsApp bot conversation logs (inbound and outbound messages)';
COMMENT ON TABLE whatsapp_bot_sessions IS 'Tracks active WhatsApp bot conversation sessions for multi-turn interactions';
COMMENT ON TABLE whatsapp_notification_queue IS 'Queue for outbound WhatsApp notifications (payment reminders, expiry notices, etc.)';

