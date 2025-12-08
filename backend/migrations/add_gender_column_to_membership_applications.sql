-- Migration: Add gender column to membership_applications table
-- Date: 2025-10-25
-- Description: Add gender column as VARCHAR to support direct gender values instead of gender_id foreign key

-- Add gender column if it doesn't exist
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS gender VARCHAR(50);

-- Update existing records to set gender based on gender_id (if any exist)
UPDATE membership_applications ma
SET gender = CASE 
    WHEN g.gender_name = 'Male' THEN 'Male'
    WHEN g.gender_name = 'Female' THEN 'Female'
    WHEN g.gender_name = 'Other' THEN 'Other'
    ELSE 'Prefer not to say'
END
FROM genders g
WHERE ma.gender_id = g.gender_id
AND ma.gender IS NULL;

-- Add check constraint for valid gender values
ALTER TABLE membership_applications
DROP CONSTRAINT IF EXISTS membership_applications_gender_check;

ALTER TABLE membership_applications
ADD CONSTRAINT membership_applications_gender_check 
CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say'));

-- Create index on gender for faster queries
CREATE INDEX IF NOT EXISTS idx_membership_applications_gender 
ON membership_applications(gender);

-- Display confirmation
SELECT 'Gender column added successfully to membership_applications table' AS status;

