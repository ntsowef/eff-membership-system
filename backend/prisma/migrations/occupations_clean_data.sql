-- ============================================================================
-- Occupations - Clean Production SQL Script
-- Generated: 2025-12-03
-- This replaces the dirty data with a standardized occupation list
-- ============================================================================

-- Drop existing table and recreate with clean structure
DROP TABLE IF EXISTS occupations CASCADE;

-- Create table with correct structure
CREATE TABLE occupations (
    occupation_id SERIAL PRIMARY KEY,
    occupation_name VARCHAR(100) NOT NULL UNIQUE,
    category_id INTEGER DEFAULT 12,
    occupation_code VARCHAR(10),
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX idx_occupations_name ON occupations(occupation_name);
CREATE INDEX idx_occupations_active ON occupations(is_active);

-- Insert clean, standardized occupation data
INSERT INTO occupations (occupation_id, occupation_name, category_id, is_active) VALUES
-- Employment Status
(1, 'Employed', 12, true),
(2, 'Unemployed', 12, true),
(3, 'Self-Employed', 12, true),
(4, 'Retired/Pensioner', 12, true),
(5, 'Student', 12, true),
(6, 'Homemaker', 12, true),

-- Professional/Office
(7, 'Accountant', 12, true),
(8, 'Administrator', 12, true),
(9, 'Attorney/Lawyer', 12, true),
(10, 'Auditor', 12, true),
(11, 'Business Owner/Entrepreneur', 12, true),
(12, 'Consultant', 12, true),
(13, 'Engineer', 12, true),
(14, 'Financial Advisor', 12, true),
(15, 'Human Resources Officer', 12, true),
(16, 'IT Professional', 12, true),
(17, 'Manager', 12, true),
(18, 'Marketing Professional', 12, true),
(19, 'Project Manager', 12, true),
(20, 'Receptionist', 12, true),
(21, 'Secretary', 12, true),

-- Healthcare
(22, 'Doctor', 12, true),
(23, 'Nurse', 12, true),
(24, 'Pharmacist', 12, true),
(25, 'Paramedic/EMT', 12, true),
(26, 'Healthcare Worker', 12, true),
(27, 'Social Worker', 12, true),
(28, 'Caregiver', 12, true),

-- Education
(29, 'Teacher', 12, true),
(30, 'Lecturer', 12, true),
(31, 'Principal', 12, true),
(32, 'Researcher', 12, true),
(33, 'Education Administrator', 12, true),

-- Government/Public Service
(34, 'Government Official', 12, true),
(35, 'Police Officer', 12, true),
(36, 'Correctional Officer', 12, true),
(37, 'Firefighter', 12, true),
(38, 'Military Personnel', 12, true),
(39, 'Councillor', 12, true),
(40, 'Public Servant', 12, true),

-- Trades/Technical
(41, 'Electrician', 12, true),
(42, 'Plumber', 12, true),
(43, 'Mechanic', 12, true),
(44, 'Carpenter', 12, true),
(45, 'Welder', 12, true),
(46, 'Boilermaker', 12, true),
(47, 'Technician', 12, true),
(48, 'Artisan', 12, true),

-- Labour/Manual Work
(49, 'General Worker', 12, true),
(50, 'Farm Worker', 12, true),
(51, 'Domestic Worker', 12, true),
(52, 'Cleaner', 12, true),
(53, 'Security Guard', 12, true),
(54, 'Construction Worker', 12, true),
(55, 'Factory Worker', 12, true),
(56, 'Warehouse Worker', 12, true),
(57, 'Machine Operator', 12, true),

-- Transport
(58, 'Driver', 12, true),
(59, 'Taxi Driver', 12, true),
(60, 'Truck Driver', 12, true),
(61, 'Bus Driver', 12, true),

-- Sales/Service
(62, 'Sales Representative', 12, true),
(63, 'Cashier', 12, true),
(64, 'Shop Assistant', 12, true),
(65, 'Waiter/Waitress', 12, true),
(66, 'Chef/Cook', 12, true),
(67, 'Hairdresser/Barber', 12, true),
(68, 'Customer Service Representative', 12, true),

-- Mining
(69, 'Miner', 12, true),
(70, 'Mining Engineer', 12, true),

-- Agriculture
(71, 'Farmer', 12, true),
(72, 'Agricultural Worker', 12, true),

-- Media/Creative
(73, 'Journalist', 12, true),
(74, 'Graphic Designer', 12, true),
(75, 'Photographer', 12, true),
(76, 'Artist', 12, true),
(77, 'Musician', 12, true),

-- Clergy/Religious
(78, 'Pastor/Minister', 12, true),
(79, 'Religious Leader', 12, true),

-- Other
(80, 'Contractor', 12, true),
(81, 'Supervisor', 12, true),
(82, 'Intern', 12, true),
(83, 'Apprentice', 12, true),
(84, 'Seasonal Worker', 12, true),
(85, 'Casual Worker', 12, true),
(86, 'Volunteer', 12, true),
(87, 'Other', 12, true),
(88, 'Not Specified', 12, true);

-- Reset sequence to max id
SELECT setval('occupations_occupation_id_seq', (SELECT MAX(occupation_id) FROM occupations));

-- Verify insertion
SELECT COUNT(*) as total_occupations FROM occupations;
SELECT * FROM occupations ORDER BY occupation_id;

