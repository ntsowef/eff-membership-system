-- Migration: Add voting_district_code to members table
-- This adds the voting district column to the members table if it doesn't exist

-- Check if column exists and add it if it doesn't
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'membership_new'
    AND TABLE_NAME = 'members'
    AND COLUMN_NAME = 'voting_district_code'
);

-- Add the column if it doesn't exist
SET @sql = IF(@column_exists = 0,
  'ALTER TABLE members ADD COLUMN voting_district_code VARCHAR(20) NULL AFTER ward_code',
  'SELECT "Column voting_district_code already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index if column was added
SET @index_sql = IF(@column_exists = 0,
  'ALTER TABLE members ADD INDEX idx_members_voting_district (voting_district_code)',
  'SELECT "Index already exists or not needed" as message'
);

PREPARE stmt FROM @index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint if column was added
SET @fk_sql = IF(@column_exists = 0,
  'ALTER TABLE members ADD FOREIGN KEY fk_members_voting_district (voting_district_code) REFERENCES voting_districts(voting_district_code) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT "Foreign key already exists or not needed" as message'
);

PREPARE stmt FROM @fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show final status
SELECT 
  CASE 
    WHEN @column_exists = 0 THEN 'voting_district_code column added to members table successfully!'
    ELSE 'voting_district_code column already exists in members table'
  END as status;
