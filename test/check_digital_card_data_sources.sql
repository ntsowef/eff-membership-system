-- Check what tables the digital card view uses
-- This shows the structure of vw_member_details_optimized

SELECT 
    'View Definition' as info_type,
    'vw_member_details_optimized' as view_name,
    'Aggregates data from multiple tables' as description;

-- Show all columns in the view
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name LIKE '%member%' THEN 'members/memberships table'
        WHEN column_name LIKE '%province%' THEN 'provinces table'
        WHEN column_name LIKE '%municipality%' OR column_name LIKE '%municipal%' THEN 'municipalities table'
        WHEN column_name LIKE '%district%' THEN 'districts table'
        WHEN column_name LIKE '%ward%' THEN 'wards table'
        WHEN column_name LIKE '%voting%' OR column_name LIKE '%station%' THEN 'voting_stations/voting_districts table'
        WHEN column_name LIKE '%gender%' THEN 'genders table'
        WHEN column_name LIKE '%race%' THEN 'races table'
        WHEN column_name IN ('firstname', 'surname', 'email', 'cell_number', 'id_number') THEN 'members table'
        WHEN column_name IN ('membership_number', 'expiry_date', 'membership_status', 'membership_amount') THEN 'memberships table'
        ELSE 'other'
    END as source_table
FROM information_schema.columns
WHERE table_name = 'vw_member_details_optimized'
ORDER BY ordinal_position;

-- Show sample data
SELECT 
    member_id,
    membership_number,
    firstname,
    surname,
    province_name,
    municipality_name,
    ward_code,
    voting_station_name,
    membership_status,
    expiry_date,
    membership_amount
FROM vw_member_details_optimized
LIMIT 5;

