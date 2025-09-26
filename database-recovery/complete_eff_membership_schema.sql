-- =====================================================================================
-- EFF MEMBERSHIP MANAGEMENT SYSTEM - COMPLETE POSTGRESQL SCHEMA
-- =====================================================================================
-- Version: 1.0
-- Created: 2025-01-23
-- Purpose: Complete database schema for South African EFF membership management
-- Compatible with: PostgreSQL 12+
-- =====================================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Schema creation without transaction wrapper

-- =====================================================================================
-- UTILITY FUNCTIONS
-- =====================================================================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate age from date of birth
CREATE OR REPLACE FUNCTION calculate_age()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_of_birth IS NOT NULL THEN
        NEW.age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.date_of_birth));
    ELSE
        NEW.age = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate membership numbers
CREATE OR REPLACE FUNCTION generate_membership_number()
RETURNS TEXT AS $$
DECLARE
    next_id INTEGER;
    membership_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(membership_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_id
    FROM memberships
    WHERE membership_number ~ '^EFF[0-9]+$';
    
    membership_number := 'EFF' || LPAD(next_id::TEXT, 7, '0');
    RETURN membership_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- SECTION 1: LOOKUP/REFERENCE TABLES
-- =====================================================================================

-- 1.1 Genders lookup table
CREATE TABLE IF NOT EXISTS genders (
    gender_id SERIAL PRIMARY KEY,
    gender_name VARCHAR(50) NOT NULL UNIQUE,
    gender_code VARCHAR(10) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO genders (gender_name, gender_code) VALUES
('Male', 'M'),
('Female', 'F'),
('Other', 'O'),
('Prefer not to say', 'N')
ON CONFLICT (gender_name) DO NOTHING;

-- 1.2 Races lookup table
CREATE TABLE IF NOT EXISTS races (
    race_id SERIAL PRIMARY KEY,
    race_name VARCHAR(50) NOT NULL UNIQUE,
    race_code VARCHAR(10) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO races (race_name, race_code) VALUES
('African', 'A'),
('Coloured', 'C'),
('Indian', 'I'),
('White', 'W'),
('Other', 'O'),
('Prefer not to say', 'N')
ON CONFLICT (race_name) DO NOTHING;

-- 1.3 Citizenships lookup table
CREATE TABLE IF NOT EXISTS citizenships (
    citizenship_id SERIAL PRIMARY KEY,
    citizenship_name VARCHAR(100) NOT NULL UNIQUE,
    citizenship_code VARCHAR(10) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO citizenships (citizenship_name, citizenship_code) VALUES
('South African Citizen', 'SA'),
('Permanent Resident', 'PR'),
('Temporary Resident', 'TR'),
('Refugee', 'RF'),
('Other', 'OT')
ON CONFLICT (citizenship_name) DO NOTHING;

-- 1.4 Languages lookup table
CREATE TABLE IF NOT EXISTS languages (
    language_id SERIAL PRIMARY KEY,
    language_name VARCHAR(100) NOT NULL UNIQUE,
    language_code VARCHAR(10) UNIQUE,
    is_official BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- 1.5 Occupation categories lookup table
CREATE TABLE IF NOT EXISTS occupation_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    category_code VARCHAR(20) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- 1.6 Occupations lookup table
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

-- 1.7 Qualifications lookup table
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

-- 1.8 Voter statuses lookup table
CREATE TABLE IF NOT EXISTS voter_statuses (
    status_id SERIAL PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    status_code VARCHAR(10) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO voter_statuses (status_name, status_code, description) VALUES
('Registered', 'REG', 'Registered to vote'),
('Not Registered', 'NREG', 'Not registered to vote'),
('Pending Verification', 'PEND', 'Registration pending verification'),
('Verification Failed', 'FAIL', 'Voter verification failed'),
('Deceased', 'DEC', 'Deceased voter'),
('Other', 'OTH', 'Other status')
ON CONFLICT (status_name) DO NOTHING;

-- 1.9 Membership statuses lookup table
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

INSERT INTO membership_statuses (status_name, status_code, description, is_active, allows_voting, allows_leadership) VALUES
('Active', 'ACT', 'Active membership in good standing', TRUE, TRUE, TRUE),
('Expired', 'EXP', 'Membership has expired', FALSE, FALSE, FALSE),
('Suspended', 'SUS', 'Membership temporarily suspended', FALSE, FALSE, FALSE),
('Cancelled', 'CAN', 'Membership cancelled', FALSE, FALSE, FALSE),
('Pending', 'PEN', 'Membership application pending', FALSE, FALSE, FALSE),
('Inactive', 'INA', 'Inactive membership', FALSE, FALSE, FALSE),
('Grace Period', 'GRA', 'In grace period after expiry', TRUE, FALSE, FALSE)
ON CONFLICT (status_name) DO NOTHING;

-- 1.10 Subscription types lookup table
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

INSERT INTO subscription_types (subscription_name, subscription_code, description, duration_months, base_amount) VALUES
('Annual Membership', 'ANN', 'Standard annual membership', 12, 120.00),
('Student Membership', 'STU', 'Discounted membership for students', 12, 60.00),
('Senior Membership', 'SEN', 'Discounted membership for seniors (65+)', 12, 60.00),
('Honorary Membership', 'HON', 'Honorary membership (no fee)', 12, 0.00),
('Life Membership', 'LIFE', 'Lifetime membership', 0, 1200.00)
ON CONFLICT (subscription_name) DO NOTHING;

-- =====================================================================================
-- SECTION 2: GEOGRAPHIC HIERARCHY TABLES
-- =====================================================================================

-- 2.1 Provinces table
CREATE TABLE IF NOT EXISTS provinces (
    province_id SERIAL PRIMARY KEY,
    province_code VARCHAR(10) NOT NULL UNIQUE,
    province_name VARCHAR(100) NOT NULL UNIQUE,
    capital_city VARCHAR(100),
    population INTEGER,
    area_km2 DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO provinces (province_code, province_name, capital_city) VALUES
('EC', 'Eastern Cape', 'Bhisho'),
('FS', 'Free State', 'Bloemfontein'),
('GP', 'Gauteng', 'Johannesburg'),
('KZN', 'KwaZulu-Natal', 'Pietermaritzburg'),
('LP', 'Limpopo', 'Polokwane'),
('MP', 'Mpumalanga', 'Mbombela'),
('NC', 'Northern Cape', 'Kimberley'),
('NW', 'North West', 'Mahikeng'),
('WC', 'Western Cape', 'Cape Town')
ON CONFLICT (province_code) DO NOTHING;

-- 2.2 Districts table
CREATE TABLE IF NOT EXISTS districts (
    district_id SERIAL PRIMARY KEY,
    district_code VARCHAR(20) NOT NULL UNIQUE,
    district_name VARCHAR(150) NOT NULL,
    province_code VARCHAR(10) NOT NULL REFERENCES provinces(province_code),
    district_type VARCHAR(20) DEFAULT 'District',
    population INTEGER,
    area_km2 DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample districts for North West Province
INSERT INTO districts (district_code, district_name, province_code, district_type) VALUES
('DC37', 'Bojanala Platinum District Municipality', 'NW', 'District'),
('DC38', 'Ngaka Modiri Molema District Municipality', 'NW', 'District'),
('DC39', 'Dr Ruth Segomotsi Mompati District Municipality', 'NW', 'District'),
('DC40', 'Dr Kenneth Kaunda District Municipality', 'NW', 'District')
ON CONFLICT (district_code) DO NOTHING;

-- 2.3 Municipalities table
CREATE TABLE IF NOT EXISTS municipalities (
    municipality_id SERIAL PRIMARY KEY,
    municipality_code VARCHAR(20) NOT NULL UNIQUE,
    municipality_name VARCHAR(150) NOT NULL,
    district_code VARCHAR(20) NOT NULL REFERENCES districts(district_code),
    municipality_type VARCHAR(20) DEFAULT 'Local',
    population INTEGER,
    area_km2 DECIMAL(10,2),
    total_wards INTEGER DEFAULT 0,
    represented_wards INTEGER DEFAULT 0,
    is_adequately_represented BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample municipalities for Bojanala District (Rustenburg area)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, total_wards) VALUES
('NW372', 'Rustenburg Local Municipality', 'DC37', 'Local', 42),
('NW373', 'Kgetlengrivier Local Municipality', 'DC37', 'Local', 8),
('NW374', 'Moses Kotane Local Municipality', 'DC37', 'Local', 32),
('NW375', 'Madibeng Local Municipality', 'DC37', 'Local', 35)
ON CONFLICT (municipality_code) DO NOTHING;

-- 2.4 Wards table
CREATE TABLE IF NOT EXISTS wards (
    ward_id SERIAL PRIMARY KEY,
    ward_code VARCHAR(20) NOT NULL UNIQUE,
    ward_name VARCHAR(150) NOT NULL,
    ward_number INTEGER,
    municipality_code VARCHAR(20) NOT NULL REFERENCES municipalities(municipality_code),
    population INTEGER,
    area_km2 DECIMAL(10,2),
    member_count INTEGER DEFAULT 0,
    is_in_good_standing BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample wards for Rustenburg Municipality
INSERT INTO wards (ward_code, ward_name, ward_number, municipality_code) VALUES
('29200001', 'Rustenburg Ward 1', 1, 'NW372'),
('29200002', 'Rustenburg Ward 2', 2, 'NW372'),
('29200003', 'Rustenburg Ward 3', 3, 'NW372'),
('29200004', 'Rustenburg Ward 4', 4, 'NW372'),
('29200005', 'Rustenburg Ward 5', 5, 'NW372'),
('29200006', 'Rustenburg Ward 6', 6, 'NW372'),
('29200007', 'Rustenburg Ward 7', 7, 'NW372'),
('29200008', 'Rustenburg Ward 8', 8, 'NW372'),
('29200009', 'Rustenburg Ward 9', 9, 'NW372'),
('29200010', 'Rustenburg Ward 10', 10, 'NW372')
ON CONFLICT (ward_code) DO NOTHING;

-- 2.5 Voting districts table
CREATE TABLE IF NOT EXISTS voting_districts (
    voting_district_id SERIAL PRIMARY KEY,
    voting_district_code VARCHAR(20) NOT NULL UNIQUE,
    voting_district_name VARCHAR(150) NOT NULL,
    ward_code VARCHAR(20) NOT NULL REFERENCES wards(ward_code),
    population INTEGER,
    registered_voters INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- 2.6 Voting stations table
CREATE TABLE IF NOT EXISTS voting_stations (
    voting_station_id SERIAL PRIMARY KEY,
    station_code VARCHAR(20) UNIQUE,
    station_name VARCHAR(200) NOT NULL,
    voting_district_code VARCHAR(20) REFERENCES voting_districts(voting_district_code),
    ward_code VARCHAR(20) NOT NULL REFERENCES wards(ward_code),
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    registered_voters INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- SECTION 3: CORE MEMBERSHIP TABLES
-- =====================================================================================

-- 3.1 Members table (core member information)
CREATE TABLE IF NOT EXISTS members (
    member_id SERIAL PRIMARY KEY,
    id_number VARCHAR(13) NOT NULL UNIQUE,
    firstname VARCHAR(100) NOT NULL,
    surname VARCHAR(100),
    middle_name VARCHAR(100),
    date_of_birth DATE,
    age INTEGER, -- Calculated age (updated via trigger)

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
    application_id INTEGER, -- References membership_applications

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 Memberships table (membership records and status)
CREATE TABLE IF NOT EXISTS memberships (
    membership_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    membership_number VARCHAR(20) UNIQUE DEFAULT generate_membership_number(),

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

-- 3.3 Membership applications table (application workflow)
CREATE TABLE IF NOT EXISTS membership_applications (
    application_id SERIAL PRIMARY KEY,
    application_number VARCHAR(20) UNIQUE NOT NULL DEFAULT 'APP' || LPAD(nextval('membership_applications_application_id_seq')::TEXT, 7, '0'),

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

-- 3.4 Membership renewals table (renewal tracking)
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

-- 3.5 Documents table (member document management)
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

-- =====================================================================================
-- SECTION 4: USER MANAGEMENT AND SECURITY TABLES
-- =====================================================================================

-- 4.1 Roles table (system roles)
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    role_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (role_name, role_code, description) VALUES
('Super Administrator', 'SUPER_ADMIN', 'System Administrator with full access'),
('National Administrator', 'NATIONAL_ADMIN', 'National level administrator'),
('Provincial Administrator', 'PROVINCIAL_ADMIN', 'Provincial level administrator'),
('District Administrator', 'DISTRICT_ADMIN', 'District level administrator'),
('Municipal Administrator', 'MUNICIPAL_ADMIN', 'Municipal level administrator'),
('Ward Administrator', 'WARD_ADMIN', 'Ward level administrator'),
('Member', 'MEMBER', 'Regular member with basic access'),
('Guest', 'GUEST', 'Guest user with limited access')
ON CONFLICT (role_name) DO NOTHING;

-- 4.2 Permissions table (system permissions)
CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    permission_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert basic permissions
INSERT INTO permissions (permission_name, permission_code, description, resource, action) VALUES
-- Member permissions
('Create Members', 'MEMBERS_CREATE', 'Create new members', 'members', 'create'),
('View Members', 'MEMBERS_READ', 'View member information', 'members', 'read'),
('Update Members', 'MEMBERS_UPDATE', 'Update member information', 'members', 'update'),
('Delete Members', 'MEMBERS_DELETE', 'Delete members', 'members', 'delete'),
('Export Members', 'MEMBERS_EXPORT', 'Export member data', 'members', 'export'),

-- Application permissions
('Review Applications', 'APPLICATIONS_REVIEW', 'Review membership applications', 'applications', 'review'),
('Approve Applications', 'APPLICATIONS_APPROVE', 'Approve membership applications', 'applications', 'approve'),
('Reject Applications', 'APPLICATIONS_REJECT', 'Reject membership applications', 'applications', 'reject'),

-- User management permissions
('Manage Users', 'USERS_MANAGE', 'Manage user accounts', 'users', 'manage'),
('View Users', 'USERS_READ', 'View user information', 'users', 'read'),
('Create Users', 'USERS_CREATE', 'Create new user accounts', 'users', 'create'),
('Update Users', 'USERS_UPDATE', 'Update user accounts', 'users', 'update'),
('Delete Users', 'USERS_DELETE', 'Delete user accounts', 'users', 'delete'),

-- Analytics and reporting permissions
('View Analytics', 'ANALYTICS_VIEW', 'View analytics and reports', 'analytics', 'view'),
('Export Reports', 'REPORTS_EXPORT', 'Export system reports', 'reports', 'export'),

-- System configuration permissions
('Configure System', 'SYSTEM_CONFIGURE', 'Configure system settings', 'system', 'configure'),
('Manage Roles', 'ROLES_MANAGE', 'Manage roles and permissions', 'roles', 'manage'),

-- Financial permissions
('View Payments', 'PAYMENTS_VIEW', 'View payment information', 'payments', 'view'),
('Process Payments', 'PAYMENTS_PROCESS', 'Process payments', 'payments', 'process'),
('Manage Renewals', 'RENEWALS_MANAGE', 'Manage membership renewals', 'renewals', 'manage'),

-- Leadership permissions
('Manage Leadership', 'LEADERSHIP_MANAGE', 'Manage leadership appointments', 'leadership', 'manage'),
('View Leadership', 'LEADERSHIP_VIEW', 'View leadership information', 'leadership', 'view'),

-- SMS permissions
('Send SMS', 'SMS_SEND', 'Send SMS messages', 'sms', 'send'),
('View SMS', 'SMS_VIEW', 'View SMS campaigns and messages', 'sms', 'view'),
('Manage SMS Templates', 'SMS_TEMPLATES', 'Manage SMS templates', 'sms', 'templates')
ON CONFLICT (permission_name) DO NOTHING;

-- 4.3 Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- 4.4 Users table (system user accounts)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    password_changed_at TIMESTAMP,

    -- Role and access level
    role_id INTEGER REFERENCES roles(role_id),
    admin_level VARCHAR(20) CHECK (admin_level IN ('national', 'province', 'district', 'municipality', 'ward')),

    -- Geographic assignment for admin users
    province_code VARCHAR(10) REFERENCES provinces(province_code),
    district_code VARCHAR(20) REFERENCES districts(district_code),
    municipal_code VARCHAR(20) REFERENCES municipalities(municipality_code),
    ward_code VARCHAR(20) REFERENCES wards(ward_code),

    -- Member association
    member_id INTEGER REFERENCES members(member_id),

    -- Authentication and security
    email_verified_at TIMESTAMP,
    remember_token VARCHAR(100),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    locked_at TIMESTAMP,

    -- Multi-factor authentication
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),

    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    account_locked BOOLEAN DEFAULT FALSE,

    -- Login tracking
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.5 User sessions table (session management)
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    payload TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.6 Audit logs table (system audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.7 Notifications table (system notifications)
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(member_id) ON DELETE CASCADE,

    -- Notification details
    recipient_type VARCHAR(20) NOT NULL DEFAULT 'User' CHECK (recipient_type IN ('User', 'Member', 'Admin')),
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('System', 'Renewal', 'Payment', 'Admin', 'Application Status', 'Voter Verification', 'Meeting', 'Leadership', 'Other')),
    delivery_channel VARCHAR(20) NOT NULL DEFAULT 'Email' CHECK (delivery_channel IN ('Email', 'SMS', 'In-App', 'Push')),
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (delivery_status IN ('Pending', 'Sent', 'Failed', 'Delivered')),

    -- Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    -- Delivery tracking
    sent_at TIMESTAMP,
    read_at TIMESTAMP,

    -- Template information
    template_id VARCHAR(50),
    template_data JSONB,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- SECTION 5: SMS MANAGEMENT SYSTEM
-- =====================================================================================

-- 5.1 SMS templates table
CREATE TABLE IF NOT EXISTS sms_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_code VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    subject VARCHAR(255),
    message_template TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default SMS templates
INSERT INTO sms_templates (template_name, template_code, category, subject, message_template, variables) VALUES
('Welcome Message', 'WELCOME', 'Membership', 'Welcome to EFF', 'Welcome {{firstname}} {{surname}}! Your EFF membership {{membership_number}} is now active. Thank you for joining the struggle!', '["firstname", "surname", "membership_number"]'::jsonb),
('Renewal Reminder', 'RENEWAL_REMINDER', 'Renewal', 'Membership Renewal', 'Hi {{firstname}}, your EFF membership expires on {{expiry_date}}. Please renew to continue your participation. Ref: {{membership_number}}', '["firstname", "expiry_date", "membership_number"]'::jsonb),
('Payment Confirmation', 'PAYMENT_CONFIRM', 'Payment', 'Payment Received', 'Payment of R{{amount}} received for membership {{membership_number}}. Thank you {{firstname}}!', '["firstname", "amount", "membership_number"]'::jsonb),
('Meeting Notification', 'MEETING_NOTICE', 'Communication', 'Meeting Notice', 'EFF {{ward_name}} meeting on {{meeting_date}} at {{venue}}. All members must attend. {{additional_info}}', '["ward_name", "meeting_date", "venue", "additional_info"]'::jsonb),
('Application Approved', 'APP_APPROVED', 'Application', 'Application Approved', 'Congratulations {{firstname}}! Your EFF membership application has been approved. Membership number: {{membership_number}}', '["firstname", "membership_number"]'::jsonb)
ON CONFLICT (template_code) DO NOTHING;

-- 5.2 SMS campaigns table
CREATE TABLE IF NOT EXISTS sms_campaigns (
    campaign_id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(200) NOT NULL,
    campaign_code VARCHAR(50) UNIQUE,
    description TEXT,
    template_id INTEGER REFERENCES sms_templates(template_id),

    -- Campaign targeting
    target_type VARCHAR(20) NOT NULL DEFAULT 'Manual' CHECK (target_type IN ('Manual', 'Ward', 'Municipality', 'District', 'Province', 'National', 'Status', 'Custom')),
    target_criteria JSONB,

    -- Geographic targeting
    province_codes TEXT[],
    district_codes TEXT[],
    municipality_codes TEXT[],
    ward_codes TEXT[],

    -- Member targeting
    membership_statuses INTEGER[],
    member_types TEXT[],
    age_range_min INTEGER,
    age_range_max INTEGER,

    -- Campaign scheduling
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Campaign status
    status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Scheduled', 'Running', 'Completed', 'Cancelled', 'Failed')),

    -- Statistics
    total_recipients INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,

    -- Campaign settings
    sender_name VARCHAR(20) DEFAULT 'EFF',
    priority VARCHAR(10) DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),

    -- Audit fields
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5.3 SMS messages table (individual message tracking)
CREATE TABLE IF NOT EXISTS sms_messages (
    message_id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES sms_campaigns(campaign_id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES sms_templates(template_id),

    -- Recipient information
    member_id INTEGER REFERENCES members(member_id) ON DELETE CASCADE,
    recipient_name VARCHAR(255),
    recipient_number VARCHAR(20) NOT NULL,

    -- Message content
    message_text TEXT NOT NULL,
    sender_name VARCHAR(20) DEFAULT 'EFF',

    -- Delivery tracking
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Queued', 'Sent', 'Delivered', 'Failed', 'Cancelled')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,

    -- Provider information
    provider_name VARCHAR(50),
    provider_message_id VARCHAR(100),
    provider_status VARCHAR(50),
    provider_response JSONB,

    -- Cost tracking
    cost_per_message DECIMAL(10,4) DEFAULT 0.0000,
    currency VARCHAR(3) DEFAULT 'ZAR',

    -- Error handling
    error_code VARCHAR(20),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5.4 SMS delivery reports table
CREATE TABLE IF NOT EXISTS sms_delivery_reports (
    report_id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES sms_messages(message_id) ON DELETE CASCADE,

    -- Delivery report details
    provider_message_id VARCHAR(100),
    delivery_status VARCHAR(50) NOT NULL,
    delivery_timestamp TIMESTAMP,

    -- Provider response
    provider_response JSONB,
    error_code VARCHAR(20),
    error_description TEXT,

    -- Audit fields
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- 5.5 SMS provider configurations table
CREATE TABLE IF NOT EXISTS sms_providers (
    provider_id SERIAL PRIMARY KEY,
    provider_name VARCHAR(50) NOT NULL UNIQUE,
    provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('HTTP', 'SMPP', 'API')),

    -- Connection settings
    endpoint_url VARCHAR(500),
    username VARCHAR(100),
    password VARCHAR(255),
    api_key VARCHAR(255),

    -- SMPP specific settings
    host VARCHAR(255),
    port INTEGER,
    system_id VARCHAR(50),
    system_type VARCHAR(20),

    -- Provider settings
    default_sender VARCHAR(20),
    supports_delivery_reports BOOLEAN DEFAULT FALSE,
    cost_per_message DECIMAL(10,4) DEFAULT 0.0000,
    currency VARCHAR(3) DEFAULT 'ZAR',

    -- Status and priority
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    priority_order INTEGER DEFAULT 1,

    -- Rate limiting
    max_messages_per_second INTEGER DEFAULT 10,
    max_messages_per_minute INTEGER DEFAULT 100,
    max_messages_per_hour INTEGER DEFAULT 1000,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default SMS provider (mock for development)
INSERT INTO sms_providers (provider_name, provider_type, endpoint_url, default_sender, is_active, is_primary) VALUES
('Mock Provider', 'HTTP', 'http://localhost:3000/mock-sms', 'EFF', TRUE, TRUE)
ON CONFLICT (provider_name) DO NOTHING;

-- 5.6 SMS queue table (for message queuing)
CREATE TABLE IF NOT EXISTS sms_queue (
    queue_id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES sms_messages(message_id) ON DELETE CASCADE,

    -- Queue information
    priority INTEGER DEFAULT 5,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,

    -- Processing status
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled')),
    processed_at TIMESTAMP,

    -- Error handling
    last_error TEXT,
    next_retry_at TIMESTAMP,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- SECTION 6: PERFORMANCE INDEXES
-- =====================================================================================

-- Lookup table indexes
CREATE INDEX IF NOT EXISTS idx_genders_active ON genders(is_active);
CREATE INDEX IF NOT EXISTS idx_races_active ON races(is_active);
CREATE INDEX IF NOT EXISTS idx_citizenships_active ON citizenships(is_active);
CREATE INDEX IF NOT EXISTS idx_languages_active ON languages(is_active);
CREATE INDEX IF NOT EXISTS idx_languages_official ON languages(is_official);
CREATE INDEX IF NOT EXISTS idx_occupations_category ON occupations(category_id);
CREATE INDEX IF NOT EXISTS idx_occupations_active ON occupations(is_active);
CREATE INDEX IF NOT EXISTS idx_qualifications_level ON qualifications(level_order);
CREATE INDEX IF NOT EXISTS idx_voter_statuses_active ON voter_statuses(is_active);
CREATE INDEX IF NOT EXISTS idx_membership_statuses_active ON membership_statuses(is_active);
CREATE INDEX IF NOT EXISTS idx_membership_statuses_voting ON membership_statuses(allows_voting);
CREATE INDEX IF NOT EXISTS idx_subscription_types_active ON subscription_types(is_active);

-- Geographic hierarchy indexes
CREATE INDEX IF NOT EXISTS idx_provinces_code ON provinces(province_code);
CREATE INDEX IF NOT EXISTS idx_provinces_active ON provinces(is_active);
CREATE INDEX IF NOT EXISTS idx_districts_code ON districts(district_code);
CREATE INDEX IF NOT EXISTS idx_districts_province ON districts(province_code);
CREATE INDEX IF NOT EXISTS idx_districts_active ON districts(is_active);
CREATE INDEX IF NOT EXISTS idx_municipalities_code ON municipalities(municipality_code);
CREATE INDEX IF NOT EXISTS idx_municipalities_district ON municipalities(district_code);
CREATE INDEX IF NOT EXISTS idx_municipalities_active ON municipalities(is_active);
CREATE INDEX IF NOT EXISTS idx_wards_code ON wards(ward_code);
CREATE INDEX IF NOT EXISTS idx_wards_municipality ON wards(municipality_code);
CREATE INDEX IF NOT EXISTS idx_wards_number ON wards(ward_number);
CREATE INDEX IF NOT EXISTS idx_wards_active ON wards(is_active);
CREATE INDEX IF NOT EXISTS idx_voting_districts_code ON voting_districts(voting_district_code);
CREATE INDEX IF NOT EXISTS idx_voting_districts_ward ON voting_districts(ward_code);
CREATE INDEX IF NOT EXISTS idx_voting_stations_code ON voting_stations(station_code);
CREATE INDEX IF NOT EXISTS idx_voting_stations_ward ON voting_stations(ward_code);

-- Member indexes
CREATE INDEX IF NOT EXISTS idx_members_id_number ON members(id_number);
CREATE INDEX IF NOT EXISTS idx_members_ward ON members(ward_code);
CREATE INDEX IF NOT EXISTS idx_members_voting_district ON members(voting_district_code);
CREATE INDEX IF NOT EXISTS idx_members_gender ON members(gender_id);
CREATE INDEX IF NOT EXISTS idx_members_race ON members(race_id);
CREATE INDEX IF NOT EXISTS idx_members_citizenship ON members(citizenship_id);
CREATE INDEX IF NOT EXISTS idx_members_language ON members(language_id);
CREATE INDEX IF NOT EXISTS idx_members_occupation ON members(occupation_id);
CREATE INDEX IF NOT EXISTS idx_members_qualification ON members(qualification_id);
CREATE INDEX IF NOT EXISTS idx_members_voter_status ON members(voter_status_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_cell ON members(cell_number);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(surname, firstname);
CREATE INDEX IF NOT EXISTS idx_members_dob ON members(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_members_created ON members(created_at);

-- Membership indexes
CREATE INDEX IF NOT EXISTS idx_memberships_member ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_number ON memberships(membership_number);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status_id);
CREATE INDEX IF NOT EXISTS idx_memberships_subscription ON memberships(subscription_type_id);
CREATE INDEX IF NOT EXISTS idx_memberships_expiry ON memberships(expiry_date);
CREATE INDEX IF NOT EXISTS idx_memberships_joined ON memberships(date_joined);
CREATE INDEX IF NOT EXISTS idx_memberships_payment_status ON memberships(payment_status);

-- Application indexes
CREATE INDEX IF NOT EXISTS idx_applications_number ON membership_applications(application_number);
CREATE INDEX IF NOT EXISTS idx_applications_id_number ON membership_applications(id_number);
CREATE INDEX IF NOT EXISTS idx_applications_status ON membership_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_ward ON membership_applications(ward_code);
CREATE INDEX IF NOT EXISTS idx_applications_submitted ON membership_applications(submitted_at);

-- Renewal indexes
CREATE INDEX IF NOT EXISTS idx_renewals_membership ON membership_renewals(membership_id);
CREATE INDEX IF NOT EXISTS idx_renewals_member ON membership_renewals(member_id);
CREATE INDEX IF NOT EXISTS idx_renewals_status ON membership_renewals(renewal_status);
CREATE INDEX IF NOT EXISTS idx_renewals_due_date ON membership_renewals(renewal_due_date);
CREATE INDEX IF NOT EXISTS idx_renewals_year ON membership_renewals(renewal_year);

-- User management indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_member ON users(member_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_admin_level ON users(admin_level);
CREATE INDEX IF NOT EXISTS idx_users_province ON users(province_code);
CREATE INDEX IF NOT EXISTS idx_users_ward ON users(ward_code);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- SMS system indexes
CREATE INDEX IF NOT EXISTS idx_sms_templates_code ON sms_templates(template_code);
CREATE INDEX IF NOT EXISTS idx_sms_templates_active ON sms_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON sms_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_scheduled ON sms_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sms_messages_campaign ON sms_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_member ON sms_messages(member_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent ON sms_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_scheduled ON sms_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sms_queue_priority ON sms_queue(priority, scheduled_at);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_members_search ON members USING gin(to_tsvector('english',
    COALESCE(firstname, '') || ' ' ||
    COALESCE(surname, '') || ' ' ||
    COALESCE(middle_name, '') || ' ' ||
    COALESCE(id_number, '') || ' ' ||
    COALESCE(cell_number, '') || ' ' ||
    COALESCE(email, '')
));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_ward_status ON members(ward_code) INCLUDE (firstname, surname, cell_number);
CREATE INDEX IF NOT EXISTS idx_memberships_status_expiry ON memberships(status_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_applications_status_submitted ON membership_applications(status, submitted_at);

-- =====================================================================================
-- SECTION 7: TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================================================

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_genders_updated_at BEFORE UPDATE ON genders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON races FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_citizenships_updated_at BEFORE UPDATE ON citizenships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_languages_updated_at BEFORE UPDATE ON languages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_occupation_categories_updated_at BEFORE UPDATE ON occupation_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_occupations_updated_at BEFORE UPDATE ON occupations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_qualifications_updated_at BEFORE UPDATE ON qualifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voter_statuses_updated_at BEFORE UPDATE ON voter_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_membership_statuses_updated_at BEFORE UPDATE ON membership_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_types_updated_at BEFORE UPDATE ON subscription_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provinces_updated_at BEFORE UPDATE ON provinces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_municipalities_updated_at BEFORE UPDATE ON municipalities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wards_updated_at BEFORE UPDATE ON wards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voting_districts_updated_at BEFORE UPDATE ON voting_districts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voting_stations_updated_at BEFORE UPDATE ON voting_stations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER calculate_member_age BEFORE INSERT OR UPDATE ON members FOR EACH ROW EXECUTE FUNCTION calculate_age();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON membership_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_renewals_updated_at BEFORE UPDATE ON membership_renewals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_templates_updated_at BEFORE UPDATE ON sms_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_campaigns_updated_at BEFORE UPDATE ON sms_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_messages_updated_at BEFORE UPDATE ON sms_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_providers_updated_at BEFORE UPDATE ON sms_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_queue_updated_at BEFORE UPDATE ON sms_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- SECTION 8: ESSENTIAL DATABASE VIEWS
-- =====================================================================================

-- 8.1 Complete Member Directory View
CREATE OR REPLACE VIEW vw_member_directory AS
SELECT
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    m.middle_name,
    CONCAT(m.firstname, ' ', COALESCE(m.middle_name || ' ', ''), COALESCE(m.surname, '')) as full_name,
    m.date_of_birth,
    m.age,

    -- Demographic information
    g.gender_name,
    r.race_name,
    c.citizenship_name,
    l.language_name,

    -- Contact information
    m.residential_address,
    m.postal_address,
    m.cell_number,
    m.landline_number,
    m.alternative_contact,
    m.email,

    -- Professional information
    o.occupation_name,
    oc.category_name as occupation_category,
    q.qualification_name,

    -- Geographic information
    m.ward_code,
    w.ward_name,
    w.ward_number,
    mu.municipality_code,
    mu.municipality_name,
    d.district_code,
    d.district_name,
    p.province_code,
    p.province_name,

    -- Voting information
    m.voting_district_code,
    vd.voting_district_name,
    vs_status.status_name as voter_status,
    m.voter_registration_number,
    m.voter_registration_date,

    -- Membership information
    ms.membership_id,
    ms.membership_number,
    ms.date_joined,
    ms.expiry_date,
    ms.last_payment_date,
    ms_status.status_name as membership_status,
    ms_status.is_active as membership_active,
    st.subscription_name as subscription_type,
    ms.membership_amount,

    -- Membership standing
    CASE
        WHEN ms.expiry_date >= CURRENT_DATE AND ms_status.is_active = TRUE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN ms_status.is_active = FALSE THEN 'Inactive'
        ELSE 'Unknown'
    END as membership_standing,

    -- Days until expiry (negative if expired)
    CASE
        WHEN ms.expiry_date IS NOT NULL THEN ms.expiry_date - CURRENT_DATE
        ELSE NULL
    END as days_until_expiry,

    -- Audit information
    m.created_at as member_created_at,
    m.updated_at as member_updated_at

FROM members m
-- Geographic joins
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code

-- Lookup table joins
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
LEFT JOIN voter_statuses vs_status ON m.voter_status_id = vs_status.status_id

-- Membership joins
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses ms_status ON ms.status_id = ms_status.status_id
LEFT JOIN subscription_types st ON ms.subscription_type_id = st.subscription_type_id;

-- 8.2 Ward Membership Audit View
CREATE OR REPLACE VIEW vw_ward_membership_audit AS
SELECT
    w.ward_code,
    w.ward_name,
    w.ward_number,
    w.municipality_code,
    mu.municipality_name,
    mu.district_code,
    d.district_name,
    d.province_code,
    p.province_name,

    -- Active member counts
    COALESCE(SUM(CASE
        WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
        ELSE 0
    END), 0) as active_members,

    COALESCE(SUM(CASE
        WHEN ms.expiry_date < CURRENT_DATE OR mst.is_active = FALSE THEN 1
        ELSE 0
    END), 0) as expired_members,

    COUNT(mem.member_id) as total_members,

    -- Standing classification
    CASE
        WHEN COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) >= 200 THEN 'Good Standing'
        WHEN COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) >= 100 THEN 'Acceptable Standing'
        ELSE 'Needs Improvement'
    END as ward_standing,

    -- Standing level (numeric for calculations)
    CASE
        WHEN COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) >= 200 THEN 1
        WHEN COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) >= 100 THEN 2
        ELSE 3
    END as standing_level,

    -- Performance metrics
    ROUND(
        (COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) * 100.0) / NULLIF(COUNT(mem.member_id), 0), 2
    ) as active_percentage,

    CURRENT_TIMESTAMP as last_updated

FROM wards w
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN members mem ON w.ward_code = mem.ward_code
LEFT JOIN memberships ms ON mem.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
GROUP BY
    w.ward_code, w.ward_name, w.ward_number, w.municipality_code, mu.municipality_name,
    mu.district_code, d.district_name, d.province_code, p.province_name;

-- 8.3 Member Search View (optimized for search)
CREATE OR REPLACE VIEW vw_member_search AS
SELECT
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
    m.cell_number,
    m.email,
    m.ward_code,
    w.ward_name,
    mu.municipality_name,
    p.province_name,
    ms.membership_number,
    ms_status.status_name as membership_status,
    ms.expiry_date,
    m.created_at,
    m.updated_at

FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses ms_status ON ms.status_id = ms_status.status_id;

-- 8.4 Municipality Ward Performance View (from existing MySQL views)
CREATE OR REPLACE VIEW vw_municipality_ward_performance AS
SELECT
    mu.municipality_code,
    mu.municipality_name,
    mu.district_code,
    d.district_name,
    d.province_code,
    p.province_name,

    -- Ward counts by standing
    COUNT(wa.ward_code) as total_wards,
    SUM(CASE WHEN wa.standing_level = 1 THEN 1 ELSE 0 END) as good_standing_wards,
    SUM(CASE WHEN wa.standing_level = 2 THEN 1 ELSE 0 END) as acceptable_standing_wards,
    SUM(CASE WHEN wa.standing_level = 3 THEN 1 ELSE 0 END) as needs_improvement_wards,

    -- Compliance calculation (Good + Acceptable / Total)
    SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) as compliant_wards,
    ROUND(
        (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
        NULLIF(COUNT(wa.ward_code), 0), 2
    ) as compliance_percentage,

    -- Municipality performance classification
    CASE
        WHEN ROUND(
            (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
            NULLIF(COUNT(wa.ward_code), 0), 2
        ) >= 70 THEN 'Performing Municipality'
        ELSE 'Underperforming Municipality'
    END as municipality_performance,

    -- Performance level for sorting (1=Performing, 2=Underperforming)
    CASE
        WHEN ROUND(
            (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
            NULLIF(COUNT(wa.ward_code), 0), 2
        ) >= 70 THEN 1
        ELSE 2
    END as performance_level,

    -- Aggregate member statistics
    COALESCE(SUM(wa.active_members), 0) as total_active_members,
    COALESCE(SUM(wa.total_members), 0) as total_all_members,
    ROUND(COALESCE(AVG(wa.active_members), 0), 1) as avg_active_per_ward,

    -- Wards needed to reach compliance (70%)
    CASE
        WHEN ROUND(
            (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
            NULLIF(COUNT(wa.ward_code), 0), 2
        ) >= 70 THEN 0
        ELSE CEIL(COUNT(wa.ward_code) * 0.7) - SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END)
    END as wards_needed_compliance,

    CURRENT_TIMESTAMP as last_updated

FROM municipalities mu
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN vw_ward_membership_audit wa ON mu.municipality_code = wa.municipality_code
GROUP BY
    mu.municipality_code, mu.municipality_name, mu.district_code, d.district_name,
    d.province_code, p.province_name;

-- 8.5 Ward Membership Trends View (time-series analysis)
CREATE OR REPLACE VIEW vw_ward_membership_trends AS
SELECT
    w.ward_code,
    w.ward_name,
    w.municipality_code,
    mu.municipality_name,
    TO_CHAR(ms.date_joined, 'YYYY-MM-01')::DATE as trend_month,

    SUM(CASE
        WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
        ELSE 0
    END) as active_members,

    COUNT(mem.member_id) as total_members,

    -- Growth trend indicator
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END) > 0 THEN 'Growing'
        ELSE 'Stable'
    END as growth_trend,

    -- Standing classification for the month
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END) >= 200 THEN 'Good Standing'
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END) >= 100 THEN 'Acceptable Standing'
        ELSE 'Needs Improvement'
    END as monthly_standing,

    CURRENT_TIMESTAMP as last_updated

FROM wards w
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN members mem ON w.ward_code = mem.ward_code
LEFT JOIN memberships ms ON mem.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
WHERE ms.date_joined >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY
    w.ward_code, w.ward_name, w.municipality_code, mu.municipality_name,
    TO_CHAR(ms.date_joined, 'YYYY-MM-01')::DATE
ORDER BY w.ward_code, trend_month DESC;

-- 8.6 Member Details View (Core view referenced throughout backend)
CREATE OR REPLACE VIEW vw_member_details AS
SELECT
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    m.middle_name,
    CONCAT(m.firstname, ' ', COALESCE(m.middle_name || ' ', ''), COALESCE(m.surname, '')) as full_name,
    m.date_of_birth,
    m.age,

    -- Demographic information with resolved lookups
    g.gender_name,
    r.race_name,
    c.citizenship_name,
    l.language_name,

    -- Contact information
    m.residential_address,
    m.postal_address,
    m.cell_number,
    m.landline_number,
    m.alternative_contact,
    m.email,

    -- Professional information
    o.occupation_name,
    oc.category_name as occupation_category,
    q.qualification_name,
    q.level_order as qualification_level,

    -- Geographic information (complete hierarchy)
    m.ward_code,
    w.ward_name,
    w.ward_number,
    w.municipality_code,
    mu.municipality_name,
    mu.district_code,
    d.district_name,
    d.province_code,
    p.province_name,

    -- Voting information
    m.voting_district_code,
    vd.voting_district_name,
    m.voting_station_id,
    vs.station_name as voting_station_name,
    vs.station_code as voting_station_code,
    vs_status.status_name as voter_status,
    vs_status.is_eligible as is_eligible_to_vote,
    m.voter_registration_number,
    m.voter_registration_date,

    -- Timestamps
    m.created_at as member_created_at,
    m.updated_at as member_updated_at

FROM members m
-- Geographic joins
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code

-- Voting information joins
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id

-- Lookup table joins
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
LEFT JOIN voter_statuses vs_status ON m.voter_status_id = vs_status.status_id;

-- 8.7 Membership Details View (Referenced in ward audits and membership management)
CREATE OR REPLACE VIEW vw_membership_details AS
SELECT
    ms.membership_id,
    ms.member_id,
    ms.membership_number,
    ms.date_joined,
    ms.expiry_date,
    ms.last_payment_date,
    ms.membership_amount,
    ms.payment_method,
    ms.payment_reference,
    ms.payment_status,

    -- Membership status information
    mst.status_name,
    mst.is_active,
    mst.description as status_description,

    -- Subscription type information
    st.subscription_name,
    st.duration_months,
    st.amount as subscription_amount,
    st.description as subscription_description,

    -- Calculated fields
    CASE
        WHEN ms.expiry_date >= CURRENT_DATE THEN
            EXTRACT(DAYS FROM (ms.expiry_date - CURRENT_DATE))
        ELSE 0
    END as days_until_expiry,

    CASE
        WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN mst.is_active = FALSE THEN 'Inactive'
        ELSE 'Unknown'
    END as membership_standing,

    -- Payment status indicators
    CASE
        WHEN ms.payment_status = 'Completed' THEN TRUE
        ELSE FALSE
    END as payment_completed,

    CASE
        WHEN ms.last_payment_date >= CURRENT_DATE - INTERVAL '30 days' THEN TRUE
        ELSE FALSE
    END as recent_payment,

    -- Renewal information
    CASE
        WHEN ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN TRUE
        ELSE FALSE
    END as renewal_due_soon,

    CASE
        WHEN ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN TRUE
        ELSE FALSE
    END as renewal_due_urgent,

    -- Timestamps
    ms.created_at as membership_created_at,
    ms.updated_at as membership_updated_at

FROM memberships ms
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
LEFT JOIN subscription_types st ON ms.subscription_type_id = st.subscription_type_id;

-- 8.8 Member Details Optimized View (Performance-optimized for high-volume queries)
CREATE OR REPLACE VIEW vw_member_details_optimized AS
SELECT
    m.member_id,
    m.id_number,
    m.firstname,
    COALESCE(m.surname, '') as surname,
    COALESCE(m.email, '') as email,
    COALESCE(m.cell_number, '') as cell_number,
    m.created_at as member_created_at,

    -- Pre-calculated membership number to avoid CONCAT in queries
    CONCAT('MEM', LPAD(m.member_id::TEXT, 6, '0')) as membership_number,

    -- Geographic data with optimized joins
    p.province_name,
    mu.municipality_name,
    w.ward_number,
    w.ward_name,
    COALESCE(vs.station_name, 'Not Available') as voting_station_name,

    -- Demographic information
    COALESCE(g.gender_name, 'Unknown') as gender_name,
    COALESCE(r.race_name, 'Unknown') as race_name,

    -- Membership status (optimized)
    CASE
        WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Inactive'
    END as membership_status,

    ms.expiry_date,
    ms.membership_amount,

    -- Calculated fields for performance
    CASE
        WHEN ms.expiry_date >= CURRENT_DATE THEN
            EXTRACT(DAYS FROM (ms.expiry_date - CURRENT_DATE))
        ELSE 0
    END as days_until_expiry

FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN provinces p ON mu.province_code = p.province_code
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id;

-- 8.9 Membership Statistics View (Comprehensive membership analytics)
CREATE OR REPLACE VIEW vw_membership_statistics AS
SELECT
    -- Geographic grouping
    p.province_code,
    p.province_name,
    d.district_code,
    d.district_name,
    mu.municipality_code,
    mu.municipality_name,
    w.ward_code,
    w.ward_name,

    -- Member counts
    COUNT(DISTINCT m.member_id) as total_members,
    COUNT(DISTINCT CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN m.member_id END) as active_members,
    COUNT(DISTINCT CASE WHEN ms.expiry_date < CURRENT_DATE THEN m.member_id END) as expired_members,
    COUNT(DISTINCT CASE WHEN ms.expiry_date IS NULL THEN m.member_id END) as inactive_members,

    -- Membership type breakdown
    COUNT(DISTINCT CASE WHEN st.subscription_name = 'Annual Membership' THEN m.member_id END) as annual_members,
    COUNT(DISTINCT CASE WHEN st.subscription_name = 'Student Membership' THEN m.member_id END) as student_members,
    COUNT(DISTINCT CASE WHEN st.subscription_name = 'Senior Membership' THEN m.member_id END) as senior_members,
    COUNT(DISTINCT CASE WHEN st.subscription_name = 'Honorary Membership' THEN m.member_id END) as honorary_members,

    -- Demographic breakdown
    COUNT(DISTINCT CASE WHEN g.gender_name = 'Male' THEN m.member_id END) as male_members,
    COUNT(DISTINCT CASE WHEN g.gender_name = 'Female' THEN m.member_id END) as female_members,
    COUNT(DISTINCT CASE WHEN m.age BETWEEN 18 AND 35 THEN m.member_id END) as youth_members,
    COUNT(DISTINCT CASE WHEN m.age > 60 THEN m.member_id END) as senior_age_members,

    -- Payment statistics
    SUM(CASE WHEN ms.payment_status = 'Completed' THEN ms.membership_amount ELSE 0 END) as total_revenue,
    AVG(CASE WHEN ms.payment_status = 'Completed' THEN ms.membership_amount ELSE NULL END) as average_payment,
    COUNT(CASE WHEN ms.payment_status = 'Completed' THEN 1 END) as completed_payments,
    COUNT(CASE WHEN ms.payment_status = 'Pending' THEN 1 END) as pending_payments,
    COUNT(CASE WHEN ms.payment_status = 'Failed' THEN 1 END) as failed_payments,

    -- Renewal statistics
    COUNT(CASE WHEN ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as renewals_due_30_days,
    COUNT(CASE WHEN ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as renewals_due_7_days,

    -- Growth metrics
    COUNT(CASE WHEN m.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_members_30_days,
    COUNT(CASE WHEN m.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_members_7_days,
    COUNT(CASE WHEN ms.date_joined >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_memberships_30_days,

    -- Performance indicators
    ROUND(
        (COUNT(DISTINCT CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN m.member_id END) * 100.0) /
        NULLIF(COUNT(DISTINCT m.member_id), 0), 2
    ) as active_percentage,

    ROUND(
        (COUNT(CASE WHEN ms.payment_status = 'Completed' THEN 1 END) * 100.0) /
        NULLIF(COUNT(ms.membership_id), 0), 2
    ) as payment_success_rate,

    -- Ward standing classification
    CASE
        WHEN COUNT(DISTINCT CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN m.member_id END) >= 200 THEN 'Good Standing'
        WHEN COUNT(DISTINCT CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN m.member_id END) >= 100 THEN 'Acceptable Standing'
        ELSE 'Needs Improvement'
    END as ward_standing,

    CASE
        WHEN COUNT(DISTINCT CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN m.member_id END) >= 200 THEN 1
        WHEN COUNT(DISTINCT CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN m.member_id END) >= 100 THEN 2
        ELSE 3
    END as standing_level,

    CURRENT_TIMESTAMP as last_updated

FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
LEFT JOIN subscription_types st ON ms.subscription_type_id = st.subscription_type_id
LEFT JOIN genders g ON m.gender_id = g.gender_id
GROUP BY
    p.province_code, p.province_name, d.district_code, d.district_name,
    mu.municipality_code, mu.municipality_name, w.ward_code, w.ward_name
ORDER BY active_members DESC;

-- 8.11 Provincial Statistics Dashboard View
CREATE OR REPLACE VIEW vw_provincial_statistics AS
SELECT
    p.province_code,
    p.province_name,

    -- Member counts
    COUNT(DISTINCT m.member_id) as total_members,
    COUNT(DISTINCT CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN m.member_id END) as active_members,
    COUNT(DISTINCT CASE WHEN ms.expiry_date < CURRENT_DATE THEN m.member_id END) as expired_members,

    -- Geographic coverage
    COUNT(DISTINCT d.district_code) as total_districts,
    COUNT(DISTINCT mu.municipality_code) as total_municipalities,
    COUNT(DISTINCT w.ward_code) as total_wards,

    -- Performance metrics
    ROUND(
        (COUNT(DISTINCT CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN m.member_id END) * 100.0) /
        NULLIF(COUNT(DISTINCT m.member_id), 0), 2
    ) as active_percentage,

    -- Growth metrics (last 30 days)
    COUNT(DISTINCT CASE WHEN m.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN m.member_id END) as new_members_30d,
    COUNT(DISTINCT CASE WHEN ms.date_joined >= CURRENT_DATE - INTERVAL '30 days' THEN ms.membership_id END) as new_memberships_30d,

    CURRENT_TIMESTAMP as last_updated

FROM provinces p
LEFT JOIN districts d ON p.province_code = d.province_code
LEFT JOIN municipalities mu ON d.district_code = mu.district_code
LEFT JOIN wards w ON mu.municipality_code = w.municipality_code
LEFT JOIN members m ON w.ward_code = m.ward_code
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
GROUP BY p.province_code, p.province_name
ORDER BY active_members DESC;

-- 8.12 Demographic Analytics View
CREATE OR REPLACE VIEW vw_demographic_analytics AS
SELECT
    -- Geographic breakdown
    p.province_name,
    d.district_name,
    mu.municipality_name,

    -- Gender distribution
    COUNT(CASE WHEN g.gender_name = 'Male' THEN 1 END) as male_members,
    COUNT(CASE WHEN g.gender_name = 'Female' THEN 1 END) as female_members,
    COUNT(CASE WHEN g.gender_name NOT IN ('Male', 'Female') THEN 1 END) as other_gender,

    -- Age distribution
    COUNT(CASE WHEN m.age BETWEEN 18 AND 25 THEN 1 END) as age_18_25,
    COUNT(CASE WHEN m.age BETWEEN 26 AND 35 THEN 1 END) as age_26_35,
    COUNT(CASE WHEN m.age BETWEEN 36 AND 45 THEN 1 END) as age_36_45,
    COUNT(CASE WHEN m.age BETWEEN 46 AND 55 THEN 1 END) as age_46_55,
    COUNT(CASE WHEN m.age BETWEEN 56 AND 65 THEN 1 END) as age_56_65,
    COUNT(CASE WHEN m.age > 65 THEN 1 END) as age_over_65,

    -- Race distribution
    COUNT(CASE WHEN r.race_name = 'African' THEN 1 END) as african_members,
    COUNT(CASE WHEN r.race_name = 'Coloured' THEN 1 END) as coloured_members,
    COUNT(CASE WHEN r.race_name = 'Indian' THEN 1 END) as indian_members,
    COUNT(CASE WHEN r.race_name = 'White' THEN 1 END) as white_members,
    COUNT(CASE WHEN r.race_name NOT IN ('African', 'Coloured', 'Indian', 'White') THEN 1 END) as other_race,

    -- Language distribution (top 5)
    COUNT(CASE WHEN l.language_name = 'isiZulu' THEN 1 END) as isizulu_speakers,
    COUNT(CASE WHEN l.language_name = 'isiXhosa' THEN 1 END) as isixhosa_speakers,
    COUNT(CASE WHEN l.language_name = 'Afrikaans' THEN 1 END) as afrikaans_speakers,
    COUNT(CASE WHEN l.language_name = 'English' THEN 1 END) as english_speakers,
    COUNT(CASE WHEN l.language_name = 'Sepedi' THEN 1 END) as sepedi_speakers,

    -- Education levels
    COUNT(CASE WHEN q.level_order <= 4 THEN 1 END) as basic_education,
    COUNT(CASE WHEN q.level_order BETWEEN 5 AND 6 THEN 1 END) as post_school_certificate,
    COUNT(CASE WHEN q.level_order >= 7 THEN 1 END) as higher_education,

    -- Employment categories
    COUNT(CASE WHEN oc.category_name = 'Professional' THEN 1 END) as professional_members,
    COUNT(CASE WHEN oc.category_name = 'Student' THEN 1 END) as student_members,
    COUNT(CASE WHEN oc.category_name = 'Unemployed' THEN 1 END) as unemployed_members,

    COUNT(m.member_id) as total_members,
    CURRENT_TIMESTAMP as last_updated

FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
GROUP BY p.province_name, d.district_name, mu.municipality_name
ORDER BY total_members DESC;

-- 8.13 Membership Growth Analytics View
CREATE OR REPLACE VIEW vw_membership_growth_analytics AS
SELECT
    DATE_TRUNC('month', m.created_at) as month_year,
    TO_CHAR(m.created_at, 'YYYY-MM') as month_label,

    -- New registrations
    COUNT(m.member_id) as new_registrations,

    -- Cumulative totals
    SUM(COUNT(m.member_id)) OVER (ORDER BY DATE_TRUNC('month', m.created_at)) as cumulative_members,

    -- Geographic breakdown
    COUNT(CASE WHEN p.province_name = 'Gauteng' THEN 1 END) as gauteng_registrations,
    COUNT(CASE WHEN p.province_name = 'Western Cape' THEN 1 END) as western_cape_registrations,
    COUNT(CASE WHEN p.province_name = 'KwaZulu-Natal' THEN 1 END) as kwazulu_natal_registrations,
    COUNT(CASE WHEN p.province_name = 'Eastern Cape' THEN 1 END) as eastern_cape_registrations,
    COUNT(CASE WHEN p.province_name = 'Limpopo' THEN 1 END) as limpopo_registrations,
    COUNT(CASE WHEN p.province_name = 'North West' THEN 1 END) as north_west_registrations,
    COUNT(CASE WHEN p.province_name = 'Mpumalanga' THEN 1 END) as mpumalanga_registrations,
    COUNT(CASE WHEN p.province_name = 'Free State' THEN 1 END) as free_state_registrations,
    COUNT(CASE WHEN p.province_name = 'Northern Cape' THEN 1 END) as northern_cape_registrations,

    -- Membership type breakdown
    COUNT(CASE WHEN m.membership_type = 'Regular' THEN 1 END) as regular_memberships,
    COUNT(CASE WHEN m.membership_type = 'Student' THEN 1 END) as student_memberships,
    COUNT(CASE WHEN m.membership_type = 'Senior' THEN 1 END) as senior_memberships,
    COUNT(CASE WHEN m.membership_type = 'Honorary' THEN 1 END) as honorary_memberships,

    -- Growth rate calculation (month-over-month)
    ROUND(
        (COUNT(m.member_id) - LAG(COUNT(m.member_id)) OVER (ORDER BY DATE_TRUNC('month', m.created_at))) * 100.0 /
        NULLIF(LAG(COUNT(m.member_id)) OVER (ORDER BY DATE_TRUNC('month', m.created_at)), 0), 2
    ) as month_over_month_growth_rate,

    CURRENT_TIMESTAMP as last_updated

FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
WHERE m.created_at >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY DATE_TRUNC('month', m.created_at), TO_CHAR(m.created_at, 'YYYY-MM')
ORDER BY month_year DESC;

-- 8.14 Renewal Analytics View
CREATE OR REPLACE VIEW vw_renewal_analytics AS
SELECT
    DATE_TRUNC('month', ms.expiry_date) as expiry_month,
    TO_CHAR(ms.expiry_date, 'YYYY-MM') as expiry_month_label,

    -- Expiry analysis
    COUNT(ms.membership_id) as total_expiring,
    COUNT(CASE WHEN ms.expiry_date < CURRENT_DATE THEN 1 END) as already_expired,
    COUNT(CASE WHEN ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_within_30_days,
    COUNT(CASE WHEN ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as expiring_within_7_days,

    -- Renewal tracking
    COUNT(mr.renewal_id) as renewal_attempts,
    COUNT(CASE WHEN mr.renewal_status = 'Completed' THEN 1 END) as successful_renewals,
    COUNT(CASE WHEN mr.renewal_status = 'Failed' THEN 1 END) as failed_renewals,
    COUNT(CASE WHEN mr.renewal_status = 'Pending' THEN 1 END) as pending_renewals,

    -- Renewal rate calculation
    ROUND(
        (COUNT(CASE WHEN mr.renewal_status = 'Completed' THEN 1 END) * 100.0) /
        NULLIF(COUNT(ms.membership_id), 0), 2
    ) as renewal_rate_percentage,

    -- Geographic breakdown
    COUNT(CASE WHEN p.province_name = 'Gauteng' THEN 1 END) as gauteng_expiring,
    COUNT(CASE WHEN p.province_name = 'Western Cape' THEN 1 END) as western_cape_expiring,
    COUNT(CASE WHEN p.province_name = 'KwaZulu-Natal' THEN 1 END) as kwazulu_natal_expiring,

    -- Revenue impact
    SUM(ms.membership_amount) as potential_revenue_loss,
    SUM(CASE WHEN mr.renewal_status = 'Completed' THEN mr.renewal_amount ELSE 0 END) as actual_renewal_revenue,

    CURRENT_TIMESTAMP as last_updated

FROM memberships ms
LEFT JOIN members m ON ms.member_id = m.member_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN membership_renewals mr ON ms.membership_id = mr.membership_id
WHERE ms.expiry_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', ms.expiry_date), TO_CHAR(ms.expiry_date, 'YYYY-MM')
ORDER BY expiry_month;

-- 8.15 SMS Campaign Analytics View
CREATE OR REPLACE VIEW vw_sms_campaign_analytics AS
SELECT
    sc.campaign_id,
    sc.campaign_name,
    sc.status as campaign_status,
    sc.created_at as campaign_created,
    sc.started_at,
    sc.completed_at,

    -- Campaign targeting
    sc.target_type,
    ARRAY_LENGTH(sc.province_codes, 1) as targeted_provinces,
    ARRAY_LENGTH(sc.ward_codes, 1) as targeted_wards,

    -- Message statistics
    sc.total_recipients,
    sc.messages_sent,
    sc.messages_delivered,
    sc.messages_failed,

    -- Performance metrics
    ROUND((sc.messages_sent * 100.0) / NULLIF(sc.total_recipients, 0), 2) as send_rate_percentage,
    ROUND((sc.messages_delivered * 100.0) / NULLIF(sc.messages_sent, 0), 2) as delivery_rate_percentage,
    ROUND((sc.messages_failed * 100.0) / NULLIF(sc.messages_sent, 0), 2) as failure_rate_percentage,

    -- Template information
    st.template_name,
    st.category as template_category,

    -- Cost analysis
    SUM(sm.cost_per_message) as total_campaign_cost,
    AVG(sm.cost_per_message) as average_cost_per_message,

    -- Timing analysis
    CASE
        WHEN sc.completed_at IS NOT NULL AND sc.started_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (sc.completed_at - sc.started_at))/60
        ELSE NULL
    END as campaign_duration_minutes,

    -- Geographic performance
    COUNT(DISTINCT CASE WHEN p.province_name IS NOT NULL THEN p.province_name END) as provinces_reached,
    COUNT(DISTINCT CASE WHEN mu.municipality_name IS NOT NULL THEN mu.municipality_name END) as municipalities_reached,

    CURRENT_TIMESTAMP as last_updated

FROM sms_campaigns sc
LEFT JOIN sms_templates st ON sc.template_id = st.template_id
LEFT JOIN sms_messages sm ON sc.campaign_id = sm.campaign_id
LEFT JOIN members m ON sm.member_id = m.member_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
GROUP BY
    sc.campaign_id, sc.campaign_name, sc.status, sc.created_at, sc.started_at, sc.completed_at,
    sc.target_type, sc.province_codes, sc.ward_codes, sc.total_recipients, sc.messages_sent,
    sc.messages_delivered, sc.messages_failed, st.template_name, st.category
ORDER BY sc.created_at DESC;

-- 8.16 Communication Performance Dashboard View
CREATE OR REPLACE VIEW vw_communication_performance AS
SELECT
    DATE_TRUNC('day', sm.created_at) as communication_date,
    TO_CHAR(sm.created_at, 'YYYY-MM-DD') as date_label,

    -- Daily message statistics
    COUNT(sm.message_id) as total_messages_sent,
    COUNT(CASE WHEN sm.status = 'Delivered' THEN 1 END) as messages_delivered,
    COUNT(CASE WHEN sm.status = 'Failed' THEN 1 END) as messages_failed,
    COUNT(CASE WHEN sm.status = 'Pending' THEN 1 END) as messages_pending,

    -- Performance metrics
    ROUND((COUNT(CASE WHEN sm.status = 'Delivered' THEN 1 END) * 100.0) / NULLIF(COUNT(sm.message_id), 0), 2) as daily_delivery_rate,
    ROUND((COUNT(CASE WHEN sm.status = 'Failed' THEN 1 END) * 100.0) / NULLIF(COUNT(sm.message_id), 0), 2) as daily_failure_rate,

    -- Template usage
    COUNT(DISTINCT sm.template_id) as templates_used,
    COUNT(DISTINCT sm.campaign_id) as campaigns_active,

    -- Geographic reach
    COUNT(DISTINCT p.province_code) as provinces_reached,
    COUNT(DISTINCT mu.municipality_code) as municipalities_reached,
    COUNT(DISTINCT w.ward_code) as wards_reached,

    -- Cost analysis
    SUM(sm.cost_per_message) as daily_communication_cost,
    AVG(sm.cost_per_message) as average_cost_per_message,

    -- Provider performance
    COUNT(DISTINCT sm.provider_name) as providers_used,

    CURRENT_TIMESTAMP as last_updated

FROM sms_messages sm
LEFT JOIN members m ON sm.member_id = m.member_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
WHERE sm.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', sm.created_at), TO_CHAR(sm.created_at, 'YYYY-MM-DD')
ORDER BY communication_date DESC;

-- 8.17 System Performance Dashboard View
CREATE OR REPLACE VIEW vw_system_performance_dashboard AS
SELECT
    -- Member statistics
    (SELECT COUNT(*) FROM members) as total_members,
    (SELECT COUNT(*) FROM members WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_members_30d,
    (SELECT COUNT(*) FROM members WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_members_7d,

    -- Membership statistics
    (SELECT COUNT(*) FROM memberships ms JOIN membership_statuses mst ON ms.status_id = mst.status_id WHERE mst.is_active = TRUE AND ms.expiry_date >= CURRENT_DATE) as active_memberships,
    (SELECT COUNT(*) FROM memberships WHERE expiry_date < CURRENT_DATE) as expired_memberships,
    (SELECT COUNT(*) FROM memberships WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_within_30_days,
    (SELECT COUNT(*) FROM memberships WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days') as expiring_within_7_days,

    -- Application statistics
    (SELECT COUNT(*) FROM membership_applications) as total_applications,
    (SELECT COUNT(*) FROM membership_applications WHERE status = 'Pending') as pending_applications,
    (SELECT COUNT(*) FROM membership_applications WHERE status = 'Under Review') as under_review_applications,
    (SELECT COUNT(*) FROM membership_applications WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_applications_30d,

    -- Geographic coverage
    (SELECT COUNT(*) FROM provinces) as total_provinces,
    (SELECT COUNT(*) FROM districts) as total_districts,
    (SELECT COUNT(*) FROM municipalities) as total_municipalities,
    (SELECT COUNT(*) FROM wards) as total_wards,
    (SELECT COUNT(DISTINCT w.ward_code) FROM wards w JOIN members m ON w.ward_code = m.ward_code) as wards_with_members,

    -- Communication statistics
    (SELECT COUNT(*) FROM sms_campaigns WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as sms_campaigns_30d,
    (SELECT COUNT(*) FROM sms_messages WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as sms_messages_30d,
    (SELECT COUNT(*) FROM sms_messages WHERE status = 'Delivered' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as sms_delivered_30d,

    -- User activity
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as active_users,
    (SELECT COUNT(*) FROM users WHERE last_login_at >= CURRENT_DATE - INTERVAL '30 days') as users_active_30d,
    (SELECT COUNT(*) FROM audit_logs WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours') as system_activities_24h,

    -- Performance indicators
    ROUND(
        (SELECT COUNT(*) FROM memberships ms JOIN membership_statuses mst ON ms.status_id = mst.status_id WHERE mst.is_active = TRUE AND ms.expiry_date >= CURRENT_DATE) * 100.0 /
        NULLIF((SELECT COUNT(*) FROM members), 0), 2
    ) as active_membership_percentage,

    ROUND(
        (SELECT COUNT(DISTINCT w.ward_code) FROM wards w JOIN members m ON w.ward_code = m.ward_code) * 100.0 /
        NULLIF((SELECT COUNT(*) FROM wards), 0), 2
    ) as ward_coverage_percentage,

    CURRENT_TIMESTAMP as last_updated;

-- =====================================================================================
-- SECTION 9: SAMPLE DATA FOR TESTING
-- =====================================================================================

-- Insert sample occupations
INSERT INTO occupations (occupation_name, category_id, occupation_code) VALUES
('Teacher', 1, 'TEACH'),
('Nurse', 1, 'NURSE'),
('Engineer', 1, 'ENG'),
('Manager', 2, 'MGR'),
('Administrator', 3, 'ADMIN'),
('Sales Representative', 4, 'SALES'),
('Farmer', 5, 'FARM'),
('Electrician', 6, 'ELEC'),
('Driver', 7, 'DRIV'),
('Cleaner', 8, 'CLEAN'),
('Student', 9, 'STUD'),
('Unemployed', 10, 'UNEM'),
('Retired', 11, 'RET')
ON CONFLICT (occupation_code) DO NOTHING;

-- Create default admin user (password should be changed immediately)
INSERT INTO users (name, email, password, role_id, admin_level, is_active, email_verified_at) VALUES
('System Administrator', 'admin@eff.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjWZifHm.', 1, 'national', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Schema creation completed

-- =====================================================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================================================

-- Display completion message and statistics
DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    index_count INTEGER;
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    SELECT COUNT(*) INTO view_count FROM information_schema.views WHERE table_schema = 'public';
    SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE schemaname = 'public';
    SELECT COUNT(*) INTO trigger_count FROM information_schema.triggers WHERE trigger_schema = 'public';

    RAISE NOTICE '=====================================================================================';
    RAISE NOTICE 'EFF MEMBERSHIP MANAGEMENT SYSTEM - POSTGRESQL SCHEMA CREATED SUCCESSFULLY!';
    RAISE NOTICE '=====================================================================================';
    RAISE NOTICE 'Database Statistics:';
    RAISE NOTICE '- Tables created: %', table_count;
    RAISE NOTICE '- Views created: %', view_count;
    RAISE NOTICE '- Indexes created: %', index_count;
    RAISE NOTICE '- Triggers created: %', trigger_count;
    RAISE NOTICE '=====================================================================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update your backend database configuration to use PostgreSQL';
    RAISE NOTICE '2. Test the database connection';
    RAISE NOTICE '3. Import existing member data (if available)';
    RAISE NOTICE '4. Change the default admin password: admin@eff.local';
    RAISE NOTICE '5. Configure SMS providers in sms_providers table';
    RAISE NOTICE '=====================================================================================';
END $$;
