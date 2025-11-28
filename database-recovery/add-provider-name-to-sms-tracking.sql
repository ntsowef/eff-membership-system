-- Add provider_name column to sms_delivery_tracking table
-- This column is needed for SMS provider monitoring and statistics

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sms_delivery_tracking' 
        AND column_name = 'provider_name'
    ) THEN
        ALTER TABLE sms_delivery_tracking 
        ADD COLUMN provider_name VARCHAR(100) DEFAULT 'JSON Applink';
        
        RAISE NOTICE '✅ Added provider_name column to sms_delivery_tracking';
    ELSE
        RAISE NOTICE '⚠️  provider_name column already exists';
    END IF;
END $$;

-- Create index for provider_name
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_provider_name 
ON sms_delivery_tracking(provider_name);

-- Update existing records to have provider_name
UPDATE sms_delivery_tracking 
SET provider_name = 'JSON Applink' 
WHERE provider_name IS NULL;

-- Add comment
COMMENT ON COLUMN sms_delivery_tracking.provider_name IS 'Name of the SMS provider (e.g., JSON Applink, Mock SMS Provider)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SMS delivery tracking table updated successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '  - Added provider_name column';
    RAISE NOTICE '  - Created index on provider_name';
    RAISE NOTICE '  - Updated existing records';
    RAISE NOTICE '';
END $$;

