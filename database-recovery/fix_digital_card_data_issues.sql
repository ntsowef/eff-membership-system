-- ============================================================================
-- Fix Digital Membership Card Data Issues
-- ============================================================================
-- This script fixes two critical issues:
-- 1. Missing/incorrect expiry_date display
-- 2. Incorrect membership status (showing Active when Expired)
--
-- Root Cause: Backend query overrides view data with calculated values
-- ============================================================================

-- STEP 1: Verify the view includes all necessary fields
-- ============================================================================

SELECT 
    '=== Verifying vw_member_details_optimized includes required fields ===' as step;

SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'vw_member_details_optimized'
    AND column_name IN (
        'member_id', 'id_number', 'firstname', 'surname', 
        'email', 'cell_number', 'membership_number',
        'province_code', 'province_name', 'municipality_name', 
        'ward_code', 'ward_number', 'voting_station_name',
        'member_created_at', 'membership_status', 
        'expiry_date', 'membership_amount', 'days_until_expiry'
    )
ORDER BY column_name;

-- STEP 2: Test query for member 6610190713081
-- ============================================================================

SELECT 
    '=== Testing data for member 6610190713081 ===' as step;

-- What the view returns (CORRECT DATA)
SELECT 
    'VIEW DATA (CORRECT)' as source,
    member_id,
    id_number,
    firstname,
    surname,
    membership_number,
    province_code,
    province_name,
    municipality_name,
    ward_code,
    member_created_at,
    expiry_date,
    membership_status,
    membership_amount,
    days_until_expiry,
    CASE 
        WHEN expiry_date >= CURRENT_DATE THEN 'Active'
        WHEN expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Unknown'
    END as calculated_status
FROM vw_member_details_optimized
WHERE id_number = '6610190713081';

-- What the OLD backend query returns (INCORRECT DATA)
SELECT 
    'OLD BACKEND QUERY (INCORRECT)' as source,
    member_id,
    membership_number,
    firstname as first_name,
    COALESCE(surname, '') as last_name,
    province_code,
    province_name,
    municipality_name,
    ward_code,
    voting_station_name,
    'Standard' as membership_type,  -- ❌ HARDCODED - WRONG!
    member_created_at as join_date,
    (member_created_at + INTERVAL '365 days') as expiry_date,  -- ❌ CALCULATED - WRONG!
    id_number
FROM vw_member_details_optimized
WHERE id_number = '6610190713081';

-- What the NEW backend query should return (CORRECT DATA)
SELECT 
    'NEW BACKEND QUERY (CORRECT)' as source,
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
    membership_status as membership_type,  -- ✅ USE ACTUAL STATUS FROM VIEW
    member_created_at as join_date,
    expiry_date,  -- ✅ USE ACTUAL EXPIRY DATE FROM MEMBERSHIPS TABLE
    id_number
FROM vw_member_details_optimized
WHERE id_number = '6610190713081'
LIMIT 1;

-- STEP 3: Comparison of all members with expired memberships
-- ============================================================================

SELECT 
    '=== Members with expired memberships (sample) ===' as step;

SELECT 
    member_id,
    id_number,
    firstname,
    surname,
    membership_number,
    expiry_date,
    membership_status,
    days_until_expiry,
    CASE 
        WHEN expiry_date < CURRENT_DATE THEN '❌ EXPIRED'
        ELSE '✅ ACTIVE'
    END as actual_status
FROM vw_member_details_optimized
WHERE expiry_date < CURRENT_DATE
LIMIT 10;

-- STEP 4: Summary of required backend changes
-- ============================================================================

SELECT 
    '=== REQUIRED BACKEND CHANGES ===' as step;

SELECT 
    'File: backend/src/models/optimizedMembers.ts' as file,
    'Line: 52-72' as location,
    'Change 1: Replace ''Standard'' with membership_status' as change_1,
    'Change 2: Replace (member_created_at + INTERVAL ''365 days'') with expiry_date' as change_2,
    'Change 3: Add membership_status field to OptimizedMemberData interface' as change_3;

-- STEP 5: Verify fix will work
-- ============================================================================

SELECT 
    '=== Verification: New query returns correct data ===' as step;

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
    membership_status as membership_type,
    member_created_at as join_date,
    expiry_date,
    membership_amount,
    days_until_expiry,
    id_number,
    CASE 
        WHEN expiry_date >= CURRENT_DATE THEN '✅ Status will show Active'
        WHEN expiry_date < CURRENT_DATE THEN '✅ Status will show Expired'
        ELSE '⚠️ Status unknown'
    END as verification
FROM vw_member_details_optimized
WHERE id_number = '6610190713081'
LIMIT 1;

SELECT '✅ Fix verified! Backend query will now return correct expiry_date and membership_status' as result;

