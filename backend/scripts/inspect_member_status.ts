import { initializeDatabase, executeQuery, executeQuerySingle } from '../src/config/database';

async function main() {
  try {
    console.log('Testing DB query...');
    await initializeDatabase();
    // 1. Check membership_statuses
    const statuses = await executeQuery('SELECT * FROM membership_statuses ORDER BY status_id');
    console.log('membership_statuses:', statuses);

    // 2. Sample 1 expired member from members_consolidated
    const sampleExpired = await executeQuerySingle(`
      SELECT member_id, id_number, firstname, surname, expiry_date, membership_status_id, payment_status, current_membership_id
      FROM members_consolidated
      WHERE membership_status_id = 2 OR expiry_date < CURRENT_DATE
      LIMIT 1
    `);
    console.log('Sample expired member in members_consolidated:', sampleExpired);

    // 3. Check if table 'members' exists and has rows
    try {
      const membersTableCount = await executeQuerySingle('SELECT COUNT(*) as count FROM members');
      console.log('members table count:', membersTableCount);
    } catch (e: any) {
      console.log('members table query error:', e.message);
    }

    // 4. Check if table 'membership_history' exists and has rows
    try {
      const historyCount = await executeQuerySingle('SELECT COUNT(*) as count FROM membership_history');
      console.log('membership_history table count:', historyCount);
    } catch (e: any) {
      console.log('membership_history query error:', e.message);
    }

    // 5. Check if table 'memberships' exists
    try {
      const membershipsCount = await executeQuerySingle('SELECT COUNT(*) as count FROM memberships');
      console.log('memberships table count:', membershipsCount);
    } catch (e: any) {
      console.log('memberships query error:', e.message);
    }

    process.exit(0);
  } catch (err: any) {
    console.error('Error in script:', err);
    process.exit(1);
  }
}

main();
