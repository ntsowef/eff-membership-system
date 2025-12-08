-- Fix application_approval_history foreign key to reference members_consolidated
-- This fixes the error: Key (member_id)=(772467) is not present in table "members"

-- Drop the old foreign key constraint
ALTER TABLE application_approval_history 
DROP CONSTRAINT IF EXISTS application_approval_history_member_id_fkey;

-- Add new foreign key constraint pointing to members_consolidated
ALTER TABLE application_approval_history 
ADD CONSTRAINT application_approval_history_member_id_fkey 
FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- Verify the fix
SELECT 
    'application_approval_history' as table_name,
    constraint_name,
    table_name as from_table,
    column_name as from_column,
    foreign_table_name as to_table,
    foreign_column_name as to_column
FROM information_schema.key_column_usage kcu
JOIN information_schema.table_constraints tc 
    ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND kcu.table_name = 'application_approval_history'
AND kcu.column_name = 'member_id';

SELECT '✅ Foreign key fixed! application_approval_history now references members_consolidated' as result;

