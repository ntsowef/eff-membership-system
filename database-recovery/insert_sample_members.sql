-- =====================================================================================
-- INSERT SAMPLE MEMBERS FOR TESTING
-- =====================================================================================
-- Purpose: Insert sample member data with proper geographic columns for testing
-- Date: 2025-10-02
-- =====================================================================================

BEGIN;

-- Insert sample members with proper geographic data
-- Using Gauteng Province (GP) for testing

INSERT INTO members (
    firstname,
    surname,
    id_number,
    cell_number,
    email,
    date_of_birth,
    gender_id,
    race_id,
    language_id,
    ward_code,
    voting_district_code,
    voter_district_code,
    province_code,
    province_name,
    district_code,
    district_name,
    municipality_code,
    municipality_name,
    created_at,
    updated_at
) VALUES
-- Member 1
(
    'Thabo',
    'Mbeki',
    '8001015800080',
    '0821234567',
    'thabo.mbeki@test.com',
    '1980-01-01',
    1, -- Male
    1, -- African
    1, -- English
    '93805001', -- ward_code
    '93805001', -- voting_district_code
    '93805001', -- voter_district_code
    'GP',
    'Gauteng',
    '938',
    'City of Johannesburg',
    '93805',
    'Johannesburg Sub-Region 5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Member 2
(
    'Nomsa',
    'Dlamini',
    '8502025800081',
    '0821234568',
    'nomsa.dlamini@test.com',
    '1985-02-02',
    2, -- Female
    1, -- African
    2, -- Zulu
    'Active',
    'EFF-GP-2025-0002',
    '93805002',
    '93805002',
    '93805002',
    'GP',
    'Gauteng',
    '938',
    'City of Johannesburg',
    '93805',
    'Johannesburg Sub-Region 5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Member 3
(
    'Sipho',
    'Khumalo',
    '9003035800082',
    '0821234569',
    'sipho.khumalo@test.com',
    '1990-03-03',
    1, -- Male
    1, -- African
    3, -- Sotho
    'Active',
    'EFF-GP-2025-0003',
    '93805003',
    '93805003',
    '93805003',
    'GP',
    'Gauteng',
    '938',
    'City of Johannesburg',
    '93805',
    'Johannesburg Sub-Region 5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Member 4
(
    'Zanele',
    'Mthembu',
    '9504045800083',
    '0821234570',
    'zanele.mthembu@test.com',
    '1995-04-04',
    2, -- Female
    1, -- African
    1, -- English
    'Active',
    'EFF-GP-2025-0004',
    '93805004',
    '93805004',
    '93805004',
    'GP',
    'Gauteng',
    '938',
    'City of Johannesburg',
    '93805',
    'Johannesburg Sub-Region 5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Member 5
(
    'Mandla',
    'Ndlovu',
    '8805055800084',
    '0821234571',
    'mandla.ndlovu@test.com',
    '1988-05-05',
    1, -- Male
    1, -- African
    2, -- Zulu
    'Active',
    'EFF-GP-2025-0005',
    '93805005',
    '93805005',
    '93805005',
    'GP',
    'Gauteng',
    '938',
    'City of Johannesburg',
    '93805',
    'Johannesburg Sub-Region 5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Member 6
(
    'Lerato',
    'Mokoena',
    '9206065800085',
    '0821234572',
    'lerato.mokoena@test.com',
    '1992-06-06',
    2, -- Female
    1, -- African
    3, -- Sotho
    'Active',
    'EFF-GP-2025-0006',
    '93805006',
    '93805006',
    '93805006',
    'GP',
    'Gauteng',
    '938',
    'City of Johannesburg',
    '93805',
    'Johannesburg Sub-Region 5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Member 7
(
    'Bongani',
    'Zulu',
    '8707075800086',
    '0821234573',
    'bongani.zulu@test.com',
    '1987-07-07',
    1, -- Male
    1, -- African
    2, -- Zulu
    'Active',
    'EFF-GP-2025-0007',
    '93805007',
    '93805007',
    '93805007',
    'GP',
    'Gauteng',
    '938',
    'City of Johannesburg',
    '93805',
    'Johannesburg Sub-Region 5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Member 8
(
    'Thandi',
    'Sithole',
    '9408085800087',
    '0821234574',
    'thandi.sithole@test.com',
    '1994-08-08',
    2, -- Female
    1, -- African
    1, -- English
    'Active',
    'EFF-GP-2025-0008',
    '93805008',
    '93805008',
    '93805008',
    'GP',
    'Gauteng',
    '938',
    'City of Johannesburg',
    '93805',
    'Johannesburg Sub-Region 5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Member 9
(
    'Sello',
    'Molefe',
    '8909095800088',
    '0821234575',
    'sello.molefe@test.com',
    '1989-09-09',
    1, -- Male
    1, -- African
    3, -- Sotho
    'Active',
    'EFF-GP-2025-0009',
    '93805009',
    '93805009',
    '93805009',
    'GP',
    'Gauteng',
    '938',
    'City of Johannesburg',
    '93805',
    'Johannesburg Sub-Region 5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Member 10
(
    'Nandi',
    'Cele',
    '9110105800089',
    '0821234576',
    'nandi.cele@test.com',
    '1991-10-10',
    2, -- Female
    1, -- African
    2, -- Zulu
    'Active',
    'EFF-GP-2025-0010',
    '93805010',
    '93805010',
    '93805010',
    'GP',
    'Gauteng',
    '938',
    'City of Johannesburg',
    '93805',
    'Johannesburg Sub-Region 5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

COMMIT;

-- Verify insertion
SELECT 
    member_id,
    firstname,
    surname,
    id_number,
    province_code,
    province_name,
    district_code,
    municipality_code,
    ward_code
FROM members
ORDER BY member_id;

SELECT 'Sample members inserted successfully!' as result;
SELECT COUNT(*) as total_members FROM members;

