-- Migration to add WhatsApp to communication preferences
-- Check if column exists first (PostgreSQL syntax)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='communication_preferences' AND column_name='whatsapp_enabled') THEN
        ALTER TABLE communication_preferences ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Update existing preferences to have WhatsApp enabled by default
UPDATE communication_preferences SET whatsapp_enabled = TRUE WHERE whatsapp_enabled IS NULL;

-- Note: DeliveryChannel is handled as a string in JSON fields in other tables, 
-- so no schema change needed for campaign_types or delivery_channels JSON.
