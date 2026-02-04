-- Surgical PostgreSQL Migration for Communication Module (V2 - Fixed for Analytics)
-- This script fixes existing but incomplete tables by dropping and recreating them.

-- 1. Drop existing tables that need schema overhaul
DROP TABLE IF EXISTS communication_analytics CASCADE;
DROP TABLE IF EXISTS message_deliveries CASCADE;
DROP TABLE IF EXISTS communication_campaigns CASCADE;

-- 2. Create message_templates table if missing (verified as mostly correct)
CREATE TABLE IF NOT EXISTS message_templates (
  template_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_type VARCHAR(50) NOT NULL, -- Email, SMS, WhatsApp, In-App, Push
  category VARCHAR(50) DEFAULT 'Custom', -- System, Marketing, Announcement, etc.
  subject VARCHAR(500), -- For email templates
  content TEXT NOT NULL,
  variables JSONB, -- Template variables like {{member_name}}, {{expiry_date}}
  is_active BOOLEAN DEFAULT TRUE,
  created_by BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create communication_campaigns table
CREATE TABLE communication_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL, -- Mass, Targeted, Individual
  status VARCHAR(50) DEFAULT 'Draft', -- Draft, Scheduled, Sending, etc.
  template_id INT,
  delivery_channels JSONB, -- ['Email', 'SMS', 'WhatsApp', 'In-App']
  
  -- Targeting criteria
  target_criteria JSONB, -- Geographic, demographic, membership filters
  recipient_count INT DEFAULT 0,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE NULL,
  started_at TIMESTAMP WITH TIME ZONE NULL,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Tracking
  total_sent INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  total_opened INT DEFAULT 0, -- Email tracking
  total_clicked INT DEFAULT 0, -- Link tracking
  
  created_by BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (template_id) REFERENCES message_templates(template_id) ON DELETE SET NULL
);

-- 4. Create message_deliveries table (Fixed with all required columns for Analytics)
CREATE TABLE message_deliveries (
  id SERIAL PRIMARY KEY,
  message_id INT NULL, -- Link to modern messages table
  campaign_id INT NULL, -- Required for JOIN in Analytics
  recipient_id BIGINT NULL, -- Required for geographic stats
  recipient_type VARCHAR(50) DEFAULT 'Member',
  delivery_channel VARCHAR(50) NOT NULL,
  delivery_status VARCHAR(50) NOT NULL, -- Matched to AnalyticsService queries
  external_id VARCHAR(255), -- ID from Wasender, Twilio, etc.
  error_message TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE NULL,
  read_at TIMESTAMP WITH TIME ZONE NULL,
  opened_at TIMESTAMP WITH TIME ZONE NULL,
  clicked_at TIMESTAMP WITH TIME ZONE NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES communication_campaigns(id) ON DELETE CASCADE
);

-- 5. Create communication_analytics table
CREATE TABLE communication_analytics (
  id SERIAL PRIMARY KEY,
  campaign_id INT,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(12, 2) DEFAULT 0,
  dimension_name VARCHAR(100), -- province, gender, etc.
  dimension_value VARCHAR(255),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (campaign_id) REFERENCES communication_campaigns(id) ON DELETE CASCADE
);

-- 6. Fix messages table FK to campaigns if missing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'messages' AND constraint_name = 'fk_messages_campaign') THEN
            ALTER TABLE messages ADD CONSTRAINT fk_messages_campaign FOREIGN KEY (campaign_id) REFERENCES communication_campaigns(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 7. Ensure communication_preferences has the correct foreign key and columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'communication_preferences' AND constraint_name = 'communication_preferences_member_id_fkey') THEN
        ALTER TABLE communication_preferences DROP CONSTRAINT communication_preferences_member_id_fkey;
    END IF;
    
    ALTER TABLE communication_preferences ADD CONSTRAINT communication_preferences_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Add standard indexes
CREATE INDEX IF NOT EXISTS idx_campaign_status ON communication_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_delivery_msg_id ON message_deliveries (message_id);
CREATE INDEX IF NOT EXISTS idx_delivery_campaign_id ON message_deliveries (campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_campaign ON communication_analytics (campaign_id);
