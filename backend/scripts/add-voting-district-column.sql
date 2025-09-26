-- Simple script to add voting_district_code to members table

-- Add the column to members table
ALTER TABLE members ADD COLUMN voting_district_code VARCHAR(20) NULL AFTER ward_code;

-- Add index for performance
ALTER TABLE members ADD INDEX idx_members_voting_district (voting_district_code);

-- Add foreign key constraint
ALTER TABLE members ADD FOREIGN KEY fk_members_voting_district (voting_district_code) 
  REFERENCES voting_districts(voting_district_code) ON DELETE SET NULL ON UPDATE CASCADE;

-- Verify the column was added
SELECT 'voting_district_code column added successfully!' as status;
