-- ============================================================================
-- Investigation Script for Member ID: 6610190713081
-- Digital Membership Card Data Issues
-- ============================================================================

-- 1. Check raw member data
SELECT 
    '=== RAW MEMBER DATA ===' as section;

SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    m.email,
    m.cell_number,
    m.province_code,
    m.province_name,
    m.municipality_code,
    m.municipality_name,
    m.ward_code,
    m.created_at as member_created_at
FROM members m
WHERE m.id_number = '6610190713081';

-- 2. Check membership data
SELECT 
    '=== MEMBERSHIP DATA ===' as section;

SELECT 
    ms.membership_id,
    ms.member_id,
    ms.membership_number,
    ms.date_joined,
    ms.last_payment_date,
    ms.expiry_date,
    ms.membership_amount,
    ms.status_id,
    mst.status_name,
    mst.is_active,
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Unknown'
    END as calculated_status,
    (ms.expiry_date - CURRENT_DATE) as days_until_expiry,
    ms.created_at,
    ms.updated_at
FROM members m
INNER JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
WHERE m.id_number = '6610190713081';

-- 3. Check what the optimized view returns
SELECT 
    '=== OPTIMIZED VIEW DATA ===' as section;

SELECT 
    member_id,
    id_number,
    firstname,
    surname,
    email,
    cell_number,
    membership_number,
    province_code,
    province_name,
    municipality_name,
    ward_code,
    voting_station_name,
    member_created_at,
    membership_status,
    expiry_date,
    membership_amount,
    days_until_expiry
FROM vw_member_details_optimized
WHERE id_number = '6610190713081';

-- 4. Check what the backend query returns (simulating the query)
SELECT 
    '=== BACKEND QUERY SIMULATION ===' as section;

SELECT
    member_id,
    membership_number,
    firstname as first_name,
    COALESCE(surname, '') as last_name,
    COALESCE(email, '') as email,
    COALESCE(cell_number, '') as phone_number,
    province_code,
    province_name,
    municipality_name,
    ward_code,
    voting_station_name,
    'Standard' as membership_type,
    member_created_at as join_date,
    (member_created_at + INTERVAL '365 days') as expiry_date,
    id_number
FROM vw_member_details_optimized
WHERE id_number = '6610190713081'
LIMIT 1;

-- 5. Compare calculated expiry vs actual expiry
SELECT 
    '=== EXPIRY DATE COMPARISON ===' as section;

SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    m.created_at as member_created_at,
    (m.created_at + INTERVAL '365 days') as calculated_expiry_from_created,
    ms.date_joined,
    (ms.date_joined + INTERVAL '365 days') as calculated_expiry_from_joined,
    ms.last_payment_date,
    (ms.last_payment_date + INTERVAL '24 months') as calculated_expiry_from_payment,
    ms.expiry_date as actual_expiry_date,
    CURRENT_DATE as today,
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE THEN 'Should be Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Should be Expired'
        ELSE 'No expiry date'
    END as correct_status
FROM members m
LEFT JOIN memberships ms ON m.member_id = ms.member_id
WHERE m.id_number = '6610190713081';

-- 6. Check if view includes membership fields
SELECT 
    '=== VIEW COLUMN CHECK ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'vw_member_details_optimized'
    AND column_name IN ('expiry_date', 'membership_status', 'membership_amount', 'province_code', 'ward_code')
ORDER BY column_name;

-- 7. Summary of issues
SELECT 
    '=== ISSUE SUMMARY ===' as section;

SELECT 
    'Issue 1: Backend query calculates expiry as (member_created_at + 365 days) instead of using actual ms.expiry_date' as issue,
    'Fix: Change backend query to use actual expiry_date from memberships table' as solution
UNION ALL
SELECT 
    'Issue 2: Backend query hardcodes membership_type as ''Standard'' instead of checking actual status',
    'Fix: Use membership_status from view which checks if expiry_date < CURRENT_DATE'
UNION ALL
SELECT 
    'Issue 3: View may not include province_code and ward_code fields',
    'Fix: Ensure view includes all geographic fields needed by frontend';

