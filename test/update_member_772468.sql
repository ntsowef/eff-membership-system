-- Update member 772468 (Dunga Marshall, ID: 7808020703087)
-- Based on IEC re-verification results
-- Date: 2025-11-10

-- Show current data
SELECT 
  member_id, 
  id_number,
  firstname,
  surname,
  ward_code,
  voting_district_code,
  voter_status_id,
  municipality_code,
  created_at
FROM members_consolidated
WHERE member_id = 772468;

-- Update member with voter status and VD code
-- Keep application ward (79700100) as current residence
-- Use IEC VD code (32871326) from voter registration
-- Fix municipality code to match ward's municipality
UPDATE members_consolidated
SET 
  voter_status_id = 1,                    -- Registered to vote
  voting_district_code = '32871326',      -- IEC VD number
  municipality_code = 'EKU004',           -- Correct sub-region code from ward table
  updated_at = CURRENT_TIMESTAMP
WHERE member_id = 772468;

-- Verify the update
SELECT 
  member_id, 
  id_number,
  firstname,
  surname,
  ward_code,
  voting_district_code,
  voter_status_id,
  municipality_code,
  vs.status_name as voter_status,
  updated_at
FROM members_consolidated m
LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
WHERE member_id = 772468;

-- Show voter status details
SELECT * FROM voter_statuses WHERE status_id = 1;

