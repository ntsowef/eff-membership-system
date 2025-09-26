-- Migration: Enhance Personal Information fields and add ID number auto-extraction
-- Date: 2025-01-20
-- Description: Add qualifications table, language_id, occupation_id, qualification_id, and citizenship_status to membership_applications

USE membership_new;

-- Create qualifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS qualifications (
  qualification_id TINYINT AUTO_INCREMENT PRIMARY KEY,
  qualification_name VARCHAR(100) NOT NULL,
  qualification_code VARCHAR(10) NULL,
  level_order TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_qualification_name (qualification_name),
  INDEX idx_qualification_level (level_order)
);

-- Insert sample qualification data
INSERT IGNORE INTO qualifications (qualification_name, qualification_code, level_order) VALUES
('No Formal Education', 'NFE', 1),
('Primary School', 'PRI', 2),
('High School (Grade 8-11)', 'HS1', 3),
('Matric/Grade 12', 'MAT', 4),
('Certificate', 'CERT', 5),
('Diploma', 'DIP', 6),
('Bachelor\'s Degree', 'BAC', 7),
('Honours Degree', 'HON', 8),
('Master\'s Degree', 'MAS', 9),
('Doctoral Degree', 'DOC', 10),
('Professional Qualification', 'PROF', 6),
('Trade Certificate', 'TRADE', 5),
('Technical Certificate', 'TECH', 5);

-- Add new fields to membership_applications table
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS language_id TINYINT NULL AFTER gender,
ADD COLUMN IF NOT EXISTS occupation_id SMALLINT NULL AFTER language_id,
ADD COLUMN IF NOT EXISTS qualification_id TINYINT NULL AFTER occupation_id,
ADD COLUMN IF NOT EXISTS citizenship_status ENUM('South African Citizen', 'Foreign National', 'Permanent Resident') NULL AFTER qualification_id;

-- Add foreign key constraints
ALTER TABLE membership_applications 
ADD CONSTRAINT fk_membership_applications_language 
  FOREIGN KEY (language_id) REFERENCES languages(language_id) ON DELETE SET NULL,
ADD CONSTRAINT fk_membership_applications_occupation 
  FOREIGN KEY (occupation_id) REFERENCES occupations(occupation_id) ON DELETE SET NULL,
ADD CONSTRAINT fk_membership_applications_qualification 
  FOREIGN KEY (qualification_id) REFERENCES qualifications(qualification_id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_membership_applications_language ON membership_applications(language_id);
CREATE INDEX IF NOT EXISTS idx_membership_applications_occupation ON membership_applications(occupation_id);
CREATE INDEX IF NOT EXISTS idx_membership_applications_qualification ON membership_applications(qualification_id);
CREATE INDEX IF NOT EXISTS idx_membership_applications_citizenship ON membership_applications(citizenship_status);

-- Add comments to document the new columns
ALTER TABLE membership_applications 
MODIFY COLUMN language_id TINYINT NULL COMMENT 'Foreign key to languages table',
MODIFY COLUMN occupation_id SMALLINT NULL COMMENT 'Foreign key to occupations table',
MODIFY COLUMN qualification_id TINYINT NULL COMMENT 'Foreign key to qualifications table',
MODIFY COLUMN citizenship_status ENUM('South African Citizen', 'Foreign National', 'Permanent Resident') NULL COMMENT 'Citizenship status extracted from ID number or manually selected';

-- Verify the changes
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'membership_new' 
AND TABLE_NAME = 'membership_applications' 
AND COLUMN_NAME IN ('language_id', 'occupation_id', 'qualification_id', 'citizenship_status')
ORDER BY ORDINAL_POSITION;
