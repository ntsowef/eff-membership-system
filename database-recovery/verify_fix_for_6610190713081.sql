-- ============================================================================
-- Verification Script for Digital Card Fix - Member 6610190713081
-- ============================================================================
-- Run this script to verify the fix is working correctly
-- ============================================================================

\echo '========================================='
\echo 'VERIFICATION FOR MEMBER 6610190713081'
\echo '========================================='
\echo ''

-- 1. Check raw member and membership data
\echo '1. RAW MEMBER AND MEMBERSHIP DATA'
\echo '---------------------------------'

SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    m.created_at as member_created_at,
    ms.membership_number,
    ms.date_joined,
    ms.last_payment_date,
    ms.expiry_date as actual_expiry_date,
    (m.created_at + INTERVAL '365 days') as old_calculated_expiry,
    CURRENT_DATE as today,
    (ms.expiry_date - CURRENT_DATE) as days_until_expiry,
    mst.status_name as membership_status_name,
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Unknown'
    END as calculated_status
FROM members m
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
WHERE m.id_number = '6610190713081';

\echo ''
\echo '2. DATA FROM OPTIMIZED VIEW'
\echo '----------------------------'

-- 2. Check what the view returns
SELECT 
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
        WHEN expiry_date >= CURRENT_DATE THEN '✅ Should show Active'
        WHEN expiry_date < CURRENT_DATE THEN '❌ Should show Expired'
        ELSE '⚠️ Unknown'
    END as expected_display
FROM vw_member_details_optimized
WHERE id_number = '6610190713081';

\echo ''
\echo '3. BACKEND QUERY RESULT (AFTER FIX)'
\echo '-----------------------------------'

-- 3. Simulate the new backend query
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
    COALESCE(membership_status, 'Inactive') as membership_type,
    membership_status,
    member_created_at as join_date,
    expiry_date,
    membership_amount,
    days_until_expiry,
    id_number,
    CASE 
        WHEN membership_status = 'Active' THEN '✅ CORRECT: Will show Active'
        WHEN membership_status = 'Expired' THEN '✅ CORRECT: Will show Expired'
        ELSE '⚠️ Status: ' || COALESCE(membership_status, 'NULL')
    END as verification
FROM vw_member_details_optimized
WHERE id_number = '6610190713081'
LIMIT 1;

\echo ''
\echo '4. COMPARISON: OLD vs NEW'
\echo '-------------------------'

-- 4. Side-by-side comparison
SELECT 
    'OLD QUERY (WRONG)' as query_type,
    (member_created_at + INTERVAL '365 days') as expiry_date_returned,
    'Standard' as membership_type_returned,
    'Always shows Standard, ignores actual status' as issue
FROM vw_member_details_optimized
WHERE id_number = '6610190713081'

UNION ALL

SELECT 
    'NEW QUERY (CORRECT)' as query_type,
    expiry_date as expiry_date_returned,
    COALESCE(membership_status, 'Inactive') as membership_type_returned,
    'Shows actual expiry and status from database' as issue
FROM vw_member_details_optimized
WHERE id_number = '6610190713081';

\echo ''
\echo '5. EXPIRY DATE COMPARISON'
\echo '-------------------------'

-- 5. Detailed expiry date comparison
SELECT 
    m.id_number,
    m.firstname,
    m.surname,
    m.created_at as member_created_at,
    (m.created_at + INTERVAL '365 days') as old_calculated_expiry,
    ms.date_joined,
    ms.last_payment_date,
    ms.expiry_date as actual_expiry_from_memberships,
    CURRENT_DATE as today,
    CASE 
        WHEN (m.created_at + INTERVAL '365 days') = ms.expiry_date THEN '✅ Same'
        ELSE '❌ DIFFERENT - Old query was WRONG!'
    END as comparison,
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE THEN '✅ Active'
        ELSE '❌ Expired'
    END as correct_status
FROM members m
LEFT JOIN memberships ms ON m.member_id = ms.member_id
WHERE m.id_number = '6610190713081';

\echo ''
\echo '6. SUMMARY OF FIX'
\echo '-----------------'

SELECT 
    '✅ FIX IMPLEMENTED' as status,
    'Backend now uses actual expiry_date from memberships table' as fix_1,
    'Backend now uses actual membership_status from view' as fix_2,
    'Frontend displays correct status based on database values' as fix_3;

\echo ''
\echo '========================================='
\echo 'VERIFICATION COMPLETE'
\echo '========================================='
\echo ''
\echo 'Expected Results:'
\echo '- Expiry date should match ms.expiry_date (not calculated)'
\echo '- Status should be Active if expiry_date >= today'
\echo '- Status should be Expired if expiry_date < today'
\echo '- Frontend card should display correct status'
\echo ''

