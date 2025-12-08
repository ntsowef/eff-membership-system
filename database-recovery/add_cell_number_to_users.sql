-- Add cell_number column to users table for admin users who are not members
-- This allows admin users to receive OTP codes without being linked to a member record

-- Add the column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cell_number VARCHAR(20);

-- Add a comment to explain the column
COMMENT ON COLUMN users.cell_number IS 'Cell phone number for admin users (for OTP/MFA). Members get their cell number from members_consolidated table.';

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_cell_number ON users(cell_number) WHERE cell_number IS NOT NULL;

-- Update the view or add a note that queries should check both users.cell_number and members_consolidated.cell_number
COMMENT ON TABLE users IS 'Users table. Admin users can have cell_number directly. Member users get cell_number from members_consolidated via member_id join.';

-- Example query to get cell number for any user:
-- SELECT 
--   u.user_id,
--   u.email,
--   COALESCE(u.cell_number, m.cell_number) as cell_number
-- FROM users u
-- LEFT JOIN members_consolidated m ON u.member_id = m.member_id
-- WHERE u.user_id = ?;

