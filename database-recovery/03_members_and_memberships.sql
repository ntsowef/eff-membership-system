-- Core Members and Memberships Tables for EFF Membership Management System
-- PostgreSQL Version
-- Created: 2025-01-23
-- Purpose: Core member and membership functionality tables

-- Start transaction
BEGIN;

-- 1. Members table (core member information)
CREATE TABLE IF NOT EXISTS members (
  member_id SERIAL PRIMARY KEY,
  id_number VARCHAR(13) NOT NULL UNIQUE,
  firstname VARCHAR(100) NOT NULL,
  surname VARCHAR(100),
  middle_name VARCHAR(100),
  date_of_birth DATE,
  age INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))) STORED,
  
  -- Demographic information
  gender_id INTEGER REFERENCES genders(gender_id),
  race_id INTEGER REFERENCES races(race_id),
  citizenship_id INTEGER REFERENCES citizenships(citizenship_id) DEFAULT 1,
  language_id INTEGER REFERENCES languages(language_id),
  
  -- Geographic assignment
  ward_code VARCHAR(20) NOT NULL REFERENCES wards(ward_code),
  voting_district_code VARCHAR(20) REFERENCES voting_districts(voting_district_code),
  voting_station_id INTEGER REFERENCES voting_stations(voting_station_id),
  
  -- Contact information
  residential_address TEXT,
  postal_address TEXT,
  cell_number VARCHAR(20),
  landline_number VARCHAR(20),
  alternative_contact VARCHAR(20),
  email VARCHAR(255),
  
  -- Professional information
  occupation_id INTEGER REFERENCES occupations(occupation_id),
  qualification_id INTEGER REFERENCES qualifications(qualification_id),
  
  -- Voter information
  voter_status_id INTEGER REFERENCES voter_statuses(status_id),
  voter_registration_number VARCHAR(50),
  voter_registration_date DATE,
  voter_verified_at TIMESTAMP,
  
  -- Membership type and application reference
  membership_type VARCHAR(20) DEFAULT 'Regular' CHECK (membership_type IN ('Regular', 'Student', 'Senior', 'Honorary')),
  application_id INTEGER, -- References membership_applications when implemented
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Memberships table (membership records and status)
CREATE TABLE IF NOT EXISTS memberships (
  membership_id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  membership_number VARCHAR(20) UNIQUE,
  
  -- Membership dates
  date_joined DATE NOT NULL DEFAULT CURRENT_DATE,
  last_payment_date DATE,
  expiry_date DATE,
  
  -- Subscription and payment information
  subscription_type_id INTEGER NOT NULL REFERENCES subscription_types(subscription_type_id),
  membership_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status_id INTEGER NOT NULL REFERENCES membership_statuses(status_id),
  
  -- Payment tracking
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Completed', 'Failed', 'Refunded', 'Waived')),
  
  -- Administrative notes
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Membership applications table (application workflow)
CREATE TABLE IF NOT EXISTS membership_applications (
  application_id SERIAL PRIMARY KEY,
  application_number VARCHAR(20) UNIQUE NOT NULL,
  
  -- Personal information (before member record is created)
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  id_number VARCHAR(13) NOT NULL,
  date_of_birth DATE NOT NULL,
  
  -- Demographic information
  gender_id INTEGER REFERENCES genders(gender_id),
  race_id INTEGER REFERENCES races(race_id),
  citizenship_id INTEGER REFERENCES citizenships(citizenship_id),
  language_id INTEGER REFERENCES languages(language_id),
  
  -- Contact information
  email VARCHAR(255),
  cell_number VARCHAR(20) NOT NULL,
  alternative_number VARCHAR(20),
  residential_address TEXT NOT NULL,
  postal_address TEXT,
  
  -- Geographic assignment
  ward_code VARCHAR(20) NOT NULL REFERENCES wards(ward_code),
  
  -- Professional information
  occupation_id INTEGER REFERENCES occupations(occupation_id),
  qualification_id INTEGER REFERENCES qualifications(qualification_id),
  
  -- Application workflow
  application_type VARCHAR(20) NOT NULL DEFAULT 'New' CHECK (application_type IN ('New', 'Renewal', 'Transfer')),
  status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected')),
  
  -- Workflow timestamps
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  
  -- Review information
  reviewed_by INTEGER, -- References users table
  rejection_reason TEXT,
  admin_notes TEXT,
  
  -- Payment information
  membership_type VARCHAR(20) DEFAULT 'Regular' CHECK (membership_type IN ('Regular', 'Student', 'Senior', 'Honorary')),
  subscription_type_id INTEGER REFERENCES subscription_types(subscription_type_id),
  payment_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'Pending',
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Membership renewals table (renewal tracking)
CREATE TABLE IF NOT EXISTS membership_renewals (
  renewal_id SERIAL PRIMARY KEY,
  membership_id INTEGER NOT NULL REFERENCES memberships(membership_id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  
  -- Renewal information
  renewal_year INTEGER NOT NULL,
  renewal_type VARCHAR(20) NOT NULL DEFAULT 'Annual' CHECK (renewal_type IN ('Annual', 'Partial', 'Grace', 'Late')),
  renewal_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (renewal_status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Expired')),
  
  -- Dates
  renewal_due_date DATE NOT NULL,
  renewal_requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  renewal_processed_date TIMESTAMP,
  renewal_completed_date TIMESTAMP,
  grace_period_end_date DATE,
  
  -- Previous and new membership details
  previous_expiry_date DATE NOT NULL,
  new_expiry_date DATE,
  previous_subscription_type_id INTEGER REFERENCES subscription_types(subscription_type_id),
  new_subscription_type_id INTEGER REFERENCES subscription_types(subscription_type_id),
  
  -- Payment information
  renewal_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Completed', 'Failed', 'Waived')),
  payment_date DATE,
  
  -- Administrative
  processed_by INTEGER, -- References users table
  renewal_notes TEXT,
  auto_renewal BOOLEAN DEFAULT FALSE,
  reminder_sent_count INTEGER DEFAULT 0,
  last_reminder_sent TIMESTAMP,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Documents table (member document management)
CREATE TABLE IF NOT EXISTS documents (
  document_id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(member_id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES membership_applications(application_id) ON DELETE CASCADE,
  
  -- Document information
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('ID Copy', 'Proof of Address', 'Profile Photo', 'Supporting Document')),
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  
  -- Document status
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Deleted')),
  
  -- Upload information
  uploaded_by INTEGER NOT NULL, -- References users table
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_id_number ON members(id_number);
CREATE INDEX IF NOT EXISTS idx_members_ward ON members(ward_code);
CREATE INDEX IF NOT EXISTS idx_members_gender ON members(gender_id);
CREATE INDEX IF NOT EXISTS idx_members_race ON members(race_id);
CREATE INDEX IF NOT EXISTS idx_members_citizenship ON members(citizenship_id);
CREATE INDEX IF NOT EXISTS idx_members_language ON members(language_id);
CREATE INDEX IF NOT EXISTS idx_members_occupation ON members(occupation_id);
CREATE INDEX IF NOT EXISTS idx_members_qualification ON members(qualification_id);
CREATE INDEX IF NOT EXISTS idx_members_voter_status ON members(voter_status_id);
CREATE INDEX IF NOT EXISTS idx_members_voting_district ON members(voting_district_code);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_cell ON members(cell_number);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(surname, firstname);

CREATE INDEX IF NOT EXISTS idx_memberships_member ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_number ON memberships(membership_number);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status_id);
CREATE INDEX IF NOT EXISTS idx_memberships_subscription ON memberships(subscription_type_id);
CREATE INDEX IF NOT EXISTS idx_memberships_expiry ON memberships(expiry_date);
CREATE INDEX IF NOT EXISTS idx_memberships_joined ON memberships(date_joined);
CREATE INDEX IF NOT EXISTS idx_memberships_payment_status ON memberships(payment_status);

CREATE INDEX IF NOT EXISTS idx_applications_number ON membership_applications(application_number);
CREATE INDEX IF NOT EXISTS idx_applications_id_number ON membership_applications(id_number);
CREATE INDEX IF NOT EXISTS idx_applications_status ON membership_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_ward ON membership_applications(ward_code);
CREATE INDEX IF NOT EXISTS idx_applications_submitted ON membership_applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_applications_reviewed ON membership_applications(reviewed_at);

CREATE INDEX IF NOT EXISTS idx_renewals_membership ON membership_renewals(membership_id);
CREATE INDEX IF NOT EXISTS idx_renewals_member ON membership_renewals(member_id);
CREATE INDEX IF NOT EXISTS idx_renewals_status ON membership_renewals(renewal_status);
CREATE INDEX IF NOT EXISTS idx_renewals_due_date ON membership_renewals(renewal_due_date);
CREATE INDEX IF NOT EXISTS idx_renewals_year ON membership_renewals(renewal_year);

CREATE INDEX IF NOT EXISTS idx_documents_member ON documents(member_id);
CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Create triggers to update updated_at timestamps
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON membership_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_renewals_updated_at BEFORE UPDATE ON membership_renewals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Display completion message
SELECT 'Members and memberships tables created successfully!' as message;
