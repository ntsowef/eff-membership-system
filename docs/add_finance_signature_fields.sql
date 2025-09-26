-- Add Finance Module and Signature Fields to Members Table
-- Database: membership_system_fresh

USE membership_system_fresh;

-- Add new columns to the members table for finance information and signature
ALTER TABLE members 
ADD COLUMN employment_status ENUM('Employed', 'Self-Employed', 'Unemployed', 'Student', 'Retired', 'Other') DEFAULT NULL AFTER voter_status,
ADD COLUMN employer_name VARCHAR(255) DEFAULT NULL AFTER employment_status,
ADD COLUMN monthly_income ENUM('R0 - R5,000', 'R5,001 - R15,000', 'R15,001 - R30,000', 'R30,001 - R50,000', 'R50,001 - R100,000', 'R100,001+') DEFAULT NULL AFTER employer_name,
ADD COLUMN membership_fee_commitment BOOLEAN DEFAULT FALSE AFTER monthly_income,
ADD COLUMN payment_method ENUM('Debit Order', 'Cash', 'Bank Transfer', 'Mobile Payment') DEFAULT NULL AFTER membership_fee_commitment,
ADD COLUMN bank_name VARCHAR(100) DEFAULT NULL AFTER payment_method,
ADD COLUMN account_number VARCHAR(50) DEFAULT NULL AFTER bank_name,
ADD COLUMN branch_code VARCHAR(20) DEFAULT NULL AFTER account_number,
ADD COLUMN eff_declaration_accepted BOOLEAN DEFAULT FALSE AFTER branch_code,
ADD COLUMN signature_data LONGTEXT DEFAULT NULL AFTER eff_declaration_accepted,
ADD COLUMN signature_date TIMESTAMP DEFAULT NULL AFTER signature_data;

-- Add additional contact and address fields if they don't exist
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'South African' AFTER gender,
ADD COLUMN IF NOT EXISTS home_language VARCHAR(50) DEFAULT NULL AFTER nationality,
ADD COLUMN IF NOT EXISTS alternative_contact VARCHAR(20) DEFAULT NULL AFTER contact_number,
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255) DEFAULT NULL AFTER alternative_contact,
ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20) DEFAULT NULL AFTER emergency_contact_name,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100) DEFAULT NULL AFTER emergency_contact_number,
ADD COLUMN IF NOT EXISTS postal_address TEXT DEFAULT NULL AFTER residential_address,
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10) DEFAULT NULL AFTER postal_address,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE AFTER eff_declaration_accepted,
ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT FALSE AFTER terms_accepted,
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE AFTER privacy_accepted;

-- Create index on employment_status for reporting
CREATE INDEX idx_members_employment_status ON members(employment_status);

-- Create index on payment_method for finance reporting
CREATE INDEX idx_members_payment_method ON members(payment_method);

-- Create index on monthly_income for demographic analysis
CREATE INDEX idx_members_monthly_income ON members(monthly_income);

-- Create index on eff_declaration_accepted for compliance tracking
CREATE INDEX idx_members_eff_declaration ON members(eff_declaration_accepted);

-- Create a view for member finance information
CREATE OR REPLACE VIEW member_finance_view AS
SELECT 
    m.id,
    m.first_name,
    m.last_name,
    m.email,
    m.employment_status,
    m.employer_name,
    m.monthly_income,
    m.membership_fee_commitment,
    m.payment_method,
    m.bank_name,
    m.account_number,
    m.branch_code,
    m.eff_declaration_accepted,
    m.signature_date,
    m.created_at,
    p.name as province_name,
    r.name as region_name,
    mu.name as municipality_name,
    w.name as ward_name
FROM members m
LEFT JOIN provinces p ON m.province_id = p.id
LEFT JOIN regions r ON m.region_id = r.id
LEFT JOIN municipalities mu ON m.municipality_id = mu.id
LEFT JOIN wards w ON m.ward_id = w.id
WHERE m.eff_declaration_accepted = TRUE;

-- Create a view for member compliance tracking
CREATE OR REPLACE VIEW member_compliance_view AS
SELECT 
    m.id,
    m.first_name,
    m.last_name,
    m.email,
    m.eff_declaration_accepted,
    m.terms_accepted,
    m.privacy_accepted,
    m.signature_data IS NOT NULL as has_signature,
    m.signature_date,
    m.membership_fee_commitment,
    m.created_at,
    CASE 
        WHEN m.eff_declaration_accepted = TRUE 
         AND m.terms_accepted = TRUE 
         AND m.privacy_accepted = TRUE 
         AND m.signature_data IS NOT NULL 
         AND m.membership_fee_commitment = TRUE 
        THEN 'Fully Compliant'
        WHEN m.eff_declaration_accepted = TRUE 
         AND m.terms_accepted = TRUE 
         AND m.privacy_accepted = TRUE 
        THEN 'Partially Compliant'
        ELSE 'Non-Compliant'
    END as compliance_status
FROM members m;

-- Create finance statistics view
CREATE OR REPLACE VIEW finance_statistics_view AS
SELECT 
    employment_status,
    COUNT(*) as member_count,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members WHERE employment_status IS NOT NULL)), 2) as percentage
FROM members 
WHERE employment_status IS NOT NULL
GROUP BY employment_status
UNION ALL
SELECT 
    'Total Members with Employment Data' as employment_status,
    COUNT(*) as member_count,
    100.00 as percentage
FROM members 
WHERE employment_status IS NOT NULL;

-- Create income distribution view
CREATE OR REPLACE VIEW income_distribution_view AS
SELECT 
    monthly_income,
    COUNT(*) as member_count,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members WHERE monthly_income IS NOT NULL)), 2) as percentage
FROM members 
WHERE monthly_income IS NOT NULL
GROUP BY monthly_income
ORDER BY 
    CASE monthly_income
        WHEN 'R0 - R5,000' THEN 1
        WHEN 'R5,001 - R15,000' THEN 2
        WHEN 'R15,001 - R30,000' THEN 3
        WHEN 'R30,001 - R50,000' THEN 4
        WHEN 'R50,001 - R100,000' THEN 5
        WHEN 'R100,001+' THEN 6
        ELSE 7
    END;

-- Create payment method statistics view
CREATE OR REPLACE VIEW payment_method_statistics_view AS
SELECT 
    payment_method,
    COUNT(*) as member_count,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members WHERE payment_method IS NOT NULL)), 2) as percentage
FROM members 
WHERE payment_method IS NOT NULL
GROUP BY payment_method;

-- Update existing members to have default values for new required fields
UPDATE members 
SET 
    eff_declaration_accepted = TRUE,
    terms_accepted = TRUE,
    privacy_accepted = TRUE,
    membership_fee_commitment = TRUE,
    signature_date = created_at
WHERE eff_declaration_accepted IS NULL 
   OR terms_accepted IS NULL 
   OR privacy_accepted IS NULL;

-- Create sample finance data for existing members (for testing)
UPDATE members 
SET 
    employment_status = CASE 
        WHEN RAND() < 0.4 THEN 'Employed'
        WHEN RAND() < 0.6 THEN 'Self-Employed'
        WHEN RAND() < 0.8 THEN 'Unemployed'
        WHEN RAND() < 0.9 THEN 'Student'
        ELSE 'Other'
    END,
    monthly_income = CASE 
        WHEN RAND() < 0.3 THEN 'R0 - R5,000'
        WHEN RAND() < 0.5 THEN 'R5,001 - R15,000'
        WHEN RAND() < 0.7 THEN 'R15,001 - R30,000'
        WHEN RAND() < 0.85 THEN 'R30,001 - R50,000'
        WHEN RAND() < 0.95 THEN 'R50,001 - R100,000'
        ELSE 'R100,001+'
    END,
    payment_method = CASE 
        WHEN RAND() < 0.5 THEN 'Debit Order'
        WHEN RAND() < 0.7 THEN 'Cash'
        WHEN RAND() < 0.9 THEN 'Bank Transfer'
        ELSE 'Mobile Payment'
    END
WHERE employment_status IS NULL;

-- Add sample employer names for employed members
UPDATE members 
SET employer_name = CASE 
    WHEN RAND() < 0.2 THEN 'Government Department'
    WHEN RAND() < 0.4 THEN 'Private Company'
    WHEN RAND() < 0.6 THEN 'Mining Company'
    WHEN RAND() < 0.8 THEN 'Retail Chain'
    ELSE 'Healthcare Institution'
END
WHERE employment_status = 'Employed' AND employer_name IS NULL;

-- Add sample bank details for debit order and bank transfer members
UPDATE members 
SET 
    bank_name = CASE 
        WHEN RAND() < 0.25 THEN 'Standard Bank'
        WHEN RAND() < 0.5 THEN 'FNB'
        WHEN RAND() < 0.75 THEN 'ABSA'
        ELSE 'Nedbank'
    END,
    branch_code = CASE 
        WHEN RAND() < 0.25 THEN '051001'
        WHEN RAND() < 0.5 THEN '250655'
        WHEN RAND() < 0.75 THEN '632005'
        ELSE '198765'
    END,
    account_number = CONCAT('ACC', LPAD(FLOOR(RAND() * 10000000), 7, '0'))
WHERE payment_method IN ('Debit Order', 'Bank Transfer') 
  AND bank_name IS NULL;

-- Show summary of changes
SELECT 'FINANCE MODULE SETUP SUMMARY' as summary_type;

SELECT 
    'Employment Status Distribution' as metric_type,
    employment_status,
    COUNT(*) as count
FROM members 
WHERE employment_status IS NOT NULL
GROUP BY employment_status;

SELECT 
    'Income Distribution' as metric_type,
    monthly_income,
    COUNT(*) as count
FROM members 
WHERE monthly_income IS NOT NULL
GROUP BY monthly_income;

SELECT 
    'Payment Method Distribution' as metric_type,
    payment_method,
    COUNT(*) as count
FROM members 
WHERE payment_method IS NOT NULL
GROUP BY payment_method;

SELECT 
    'Compliance Status' as metric_type,
    compliance_status,
    COUNT(*) as count
FROM member_compliance_view
GROUP BY compliance_status;

-- Show sample of updated member data
SELECT 
    'SAMPLE MEMBER DATA WITH FINANCE INFO' as info,
    id,
    first_name,
    last_name,
    employment_status,
    monthly_income,
    payment_method,
    eff_declaration_accepted,
    has_signature
FROM member_compliance_view
LIMIT 10;

COMMIT;
