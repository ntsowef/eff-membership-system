-- Core Lookup Tables for EFF Membership Management System
-- PostgreSQL Version
-- Created: 2025-01-23
-- Purpose: Essential lookup/reference tables that support member and membership functionality

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Start transaction
BEGIN;

-- 1. Genders lookup table
CREATE TABLE IF NOT EXISTS genders (
  gender_id SERIAL PRIMARY KEY,
  gender_name VARCHAR(50) NOT NULL UNIQUE,
  gender_code VARCHAR(10) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default gender data
INSERT INTO genders (gender_name, gender_code) VALUES
('Male', 'M'),
('Female', 'F'),
('Other', 'O'),
('Prefer not to say', 'N')
ON CONFLICT (gender_name) DO NOTHING;

-- 2. Races lookup table
CREATE TABLE IF NOT EXISTS races (
  race_id SERIAL PRIMARY KEY,
  race_name VARCHAR(50) NOT NULL UNIQUE,
  race_code VARCHAR(10) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default race data
INSERT INTO races (race_name, race_code) VALUES
('African', 'A'),
('Coloured', 'C'),
('Indian', 'I'),
('White', 'W'),
('Other', 'O'),
('Prefer not to say', 'N')
ON CONFLICT (race_name) DO NOTHING;

-- 3. Citizenships lookup table
CREATE TABLE IF NOT EXISTS citizenships (
  citizenship_id SERIAL PRIMARY KEY,
  citizenship_name VARCHAR(100) NOT NULL UNIQUE,
  citizenship_code VARCHAR(10) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default citizenship data
INSERT INTO citizenships (citizenship_name, citizenship_code) VALUES
('South African Citizen', 'SA'),
('Permanent Resident', 'PR'),
('Temporary Resident', 'TR'),
('Refugee', 'RF'),
('Other', 'OT')
ON CONFLICT (citizenship_name) DO NOTHING;

-- 4. Languages lookup table
CREATE TABLE IF NOT EXISTS languages (
  language_id SERIAL PRIMARY KEY,
  language_name VARCHAR(100) NOT NULL UNIQUE,
  language_code VARCHAR(10) UNIQUE,
  is_official BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert South African official languages
INSERT INTO languages (language_name, language_code, is_official) VALUES
('Afrikaans', 'af', TRUE),
('English', 'en', TRUE),
('isiNdebele', 'nr', TRUE),
('isiXhosa', 'xh', TRUE),
('isiZulu', 'zu', TRUE),
('Sepedi', 'nso', TRUE),
('Sesotho', 'st', TRUE),
('Setswana', 'tn', TRUE),
('siSwati', 'ss', TRUE),
('Tshivenda', 've', TRUE),
('Xitsonga', 'ts', TRUE),
('Other', 'ot', FALSE)
ON CONFLICT (language_name) DO NOTHING;

-- 5. Occupation categories lookup table
CREATE TABLE IF NOT EXISTS occupation_categories (
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  category_code VARCHAR(20) UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert occupation categories
INSERT INTO occupation_categories (category_name, category_code, description) VALUES
('Professional', 'PROF', 'Professional and technical occupations'),
('Management', 'MGMT', 'Management and executive positions'),
('Clerical', 'CLER', 'Clerical and administrative support'),
('Sales', 'SALE', 'Sales and service occupations'),
('Agriculture', 'AGRI', 'Agriculture, forestry, and fishing'),
('Craft', 'CRFT', 'Craft and related trades'),
('Machine Operation', 'MACH', 'Machine operators and assemblers'),
('Elementary', 'ELEM', 'Elementary occupations'),
('Student', 'STUD', 'Students'),
('Unemployed', 'UNEM', 'Unemployed'),
('Retired', 'RETD', 'Retired'),
('Other', 'OTHR', 'Other occupations')
ON CONFLICT (category_name) DO NOTHING;

-- 6. Occupations lookup table
CREATE TABLE IF NOT EXISTS occupations (
  occupation_id SERIAL PRIMARY KEY,
  occupation_name VARCHAR(150) NOT NULL,
  category_id INTEGER REFERENCES occupation_categories(category_id),
  occupation_code VARCHAR(20) UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common occupations (sample data)
INSERT INTO occupations (occupation_name, category_id, occupation_code) VALUES
-- Professional
('Teacher', 1, 'TEACH'),
('Nurse', 1, 'NURSE'),
('Doctor', 1, 'DOCTR'),
('Engineer', 1, 'ENGR'),
('Lawyer', 1, 'LAWYR'),
('Accountant', 1, 'ACCNT'),
-- Management
('Manager', 2, 'MNGR'),
('Supervisor', 2, 'SUPVR'),
('Director', 2, 'DRCTR'),
-- Clerical
('Administrator', 3, 'ADMIN'),
('Secretary', 3, 'SECRT'),
('Clerk', 3, 'CLERK'),
-- Sales
('Sales Representative', 4, 'SALES'),
('Cashier', 4, 'CASHR'),
('Shop Assistant', 4, 'SHOPR'),
-- Other common categories
('Student', 9, 'STDNT'),
('Unemployed', 10, 'UNEMP'),
('Retired', 11, 'RETIR'),
('Self Employed', 12, 'SELFE'),
('Other', 12, 'OTHER')
ON CONFLICT (occupation_code) DO NOTHING;

-- 7. Qualifications lookup table
CREATE TABLE IF NOT EXISTS qualifications (
  qualification_id SERIAL PRIMARY KEY,
  qualification_name VARCHAR(150) NOT NULL UNIQUE,
  qualification_code VARCHAR(20) UNIQUE,
  level_order INTEGER DEFAULT 1,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert qualification levels
INSERT INTO qualifications (qualification_name, qualification_code, level_order, description) VALUES
('No Formal Education', 'NONE', 1, 'No formal education'),
('Primary Education', 'PRIM', 2, 'Primary school education'),
('Secondary Education (Grade 9-11)', 'SEC1', 3, 'Incomplete secondary education'),
('Matric/Grade 12', 'MATR', 4, 'Completed secondary education'),
('Certificate', 'CERT', 5, 'Post-school certificate'),
('Diploma', 'DIPL', 6, 'Post-school diploma'),
('Bachelor''s Degree', 'BACH', 7, 'Undergraduate degree'),
('Honours Degree', 'HONS', 8, 'Honours degree'),
('Master''s Degree', 'MAST', 9, 'Master''s degree'),
('Doctoral Degree', 'DOCT', 10, 'Doctoral degree'),
('Other', 'OTHR', 11, 'Other qualification')
ON CONFLICT (qualification_name) DO NOTHING;

-- 8. Voter statuses lookup table
CREATE TABLE IF NOT EXISTS voter_statuses (
  status_id SERIAL PRIMARY KEY,
  status_name VARCHAR(50) NOT NULL UNIQUE,
  status_code VARCHAR(10) UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert voter status data
INSERT INTO voter_statuses (status_name, status_code, description) VALUES
('Registered', 'REG', 'Registered to vote'),
('Not Registered', 'NREG', 'Not registered to vote'),
('Pending Verification', 'PEND', 'Registration pending verification'),
('Verification Failed', 'FAIL', 'Voter verification failed'),
('Deceased', 'DEC', 'Deceased voter'),
('Other', 'OTH', 'Other status')
ON CONFLICT (status_name) DO NOTHING;

-- 9. Membership statuses lookup table
CREATE TABLE IF NOT EXISTS membership_statuses (
  status_id SERIAL PRIMARY KEY,
  status_name VARCHAR(50) NOT NULL UNIQUE,
  status_code VARCHAR(10) UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  allows_voting BOOLEAN DEFAULT FALSE,
  allows_leadership BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert membership status data
INSERT INTO membership_statuses (status_name, status_code, description, is_active, allows_voting, allows_leadership) VALUES
('Active', 'ACT', 'Active membership in good standing', TRUE, TRUE, TRUE),
('Expired', 'EXP', 'Membership has expired', FALSE, FALSE, FALSE),
('Suspended', 'SUS', 'Membership temporarily suspended', FALSE, FALSE, FALSE),
('Cancelled', 'CAN', 'Membership cancelled', FALSE, FALSE, FALSE),
('Pending', 'PEN', 'Membership application pending', FALSE, FALSE, FALSE),
('Inactive', 'INA', 'Inactive membership', FALSE, FALSE, FALSE),
('Grace Period', 'GRA', 'In grace period after expiry', TRUE, FALSE, FALSE)
ON CONFLICT (status_name) DO NOTHING;

-- 10. Subscription types lookup table
CREATE TABLE IF NOT EXISTS subscription_types (
  subscription_type_id SERIAL PRIMARY KEY,
  subscription_name VARCHAR(100) NOT NULL UNIQUE,
  subscription_code VARCHAR(20) UNIQUE,
  description TEXT,
  duration_months INTEGER DEFAULT 12,
  base_amount DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert subscription types
INSERT INTO subscription_types (subscription_name, subscription_code, description, duration_months, base_amount) VALUES
('Annual Membership', 'ANN', 'Standard annual membership', 12, 120.00),
('Student Membership', 'STU', 'Discounted membership for students', 12, 60.00),
('Senior Membership', 'SEN', 'Discounted membership for seniors (65+)', 12, 60.00),
('Honorary Membership', 'HON', 'Honorary membership (no fee)', 12, 0.00),
('Life Membership', 'LIFE', 'Lifetime membership', 0, 1200.00)
ON CONFLICT (subscription_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_genders_active ON genders(is_active);
CREATE INDEX IF NOT EXISTS idx_races_active ON races(is_active);
CREATE INDEX IF NOT EXISTS idx_citizenships_active ON citizenships(is_active);
CREATE INDEX IF NOT EXISTS idx_languages_active ON languages(is_active);
CREATE INDEX IF NOT EXISTS idx_languages_official ON languages(is_official);
CREATE INDEX IF NOT EXISTS idx_occupation_categories_active ON occupation_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_occupations_active ON occupations(is_active);
CREATE INDEX IF NOT EXISTS idx_occupations_category ON occupations(category_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_active ON qualifications(is_active);
CREATE INDEX IF NOT EXISTS idx_qualifications_level ON qualifications(level_order);
CREATE INDEX IF NOT EXISTS idx_voter_statuses_active ON voter_statuses(is_active);
CREATE INDEX IF NOT EXISTS idx_membership_statuses_active ON membership_statuses(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_types_active ON subscription_types(is_active);

COMMIT;

-- Display completion message
SELECT 'Core lookup tables created successfully!' as message;
