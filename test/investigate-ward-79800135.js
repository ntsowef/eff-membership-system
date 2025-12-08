const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function investigateWard() {
  const client = await pool.connect();
  
  try {
    const wardCode = '79800135';
    
    console.log('='.repeat(80));
    console.log(`INVESTIGATING WARD: ${wardCode}`);
    console.log('='.repeat(80));
    console.log();

    // Get ward details
    const wardQuery = `
      SELECT w.ward_code, w.ward_name, w.municipality_code, m.municipality_name
      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      WHERE w.ward_code = $1;
    `;
    
    const wardResult = await client.query(wardQuery, [wardCode]);
    if (wardResult.rows.length === 0) {
      console.log(`❌ Ward ${wardCode} not found`);
      return;
    }
    
    const ward = wardResult.rows[0];
    console.log(`Ward: ${ward.ward_name} (${ward.ward_code})`);
    console.log(`Municipality: ${ward.municipality_name} (${ward.municipality_code})`);
    console.log();

    // Get ALL members breakdown by status
    console.log('='.repeat(80));
    console.log('ALL MEMBERS BREAKDOWN BY STATUS');
    console.log('='.repeat(80));
    
    const allMembersQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN membership_status_id = 1 THEN 1 END) as active,
        COUNT(CASE WHEN membership_status_id = 2 THEN 1 END) as expired,
        COUNT(CASE WHEN membership_status_id = 3 THEN 1 END) as inactive,
        COUNT(CASE WHEN membership_status_id = 4 THEN 1 END) as grace_period,
        COUNT(CASE WHEN membership_status_id IS NULL THEN 1 END) as no_status
      FROM members_consolidated
      WHERE ward_code = $1;
    `;
    
    const allResult = await client.query(allMembersQuery, [wardCode]);
    const stats = allResult.rows[0];
    
    console.log(`Total members: ${stats.total}`);
    console.log(`  - Active (status_id=1): ${stats.active}`);
    console.log(`  - Expired (status_id=2): ${stats.expired}`);
    console.log(`  - Inactive (status_id=3): ${stats.inactive}`);
    console.log(`  - Grace Period (status_id=4): ${stats.grace_period}`);
    console.log(`  - No Status (NULL): ${stats.no_status}`);
    console.log();

    // Test ACTIVE filter
    console.log('='.repeat(80));
    console.log('ACTIVE FILTER TEST (membership_status_id = 1)');
    console.log('='.repeat(80));
    
    const activeQuery = `
      SELECT COUNT(*) as count
      FROM members_consolidated
      WHERE ward_code = $1
        AND membership_status_id = 1;
    `;
    
    const activeResult = await client.query(activeQuery, [wardCode]);
    console.log(`Active members: ${activeResult.rows[0].count}`);
    console.log(`Expected: ${stats.active}`);
    console.log(activeResult.rows[0].count === stats.active ? '✅ MATCH' : '❌ MISMATCH');
    console.log();

    // Test EXPIRED filter
    console.log('='.repeat(80));
    console.log('EXPIRED FILTER TEST (membership_status_id IN 2,3,4)');
    console.log('='.repeat(80));
    
    const expiredQuery = `
      SELECT COUNT(*) as count
      FROM members_consolidated
      WHERE ward_code = $1
        AND membership_status_id IN (2, 3, 4);
    `;
    
    const expiredResult = await client.query(expiredQuery, [wardCode]);
    const expectedExpired = parseInt(stats.expired) + parseInt(stats.inactive) + parseInt(stats.grace_period);
    
    console.log(`Expired/Inactive members: ${expiredResult.rows[0].count}`);
    console.log(`Expected: ${expectedExpired} (Expired + Inactive + Grace Period)`);
    console.log(parseInt(expiredResult.rows[0].count) === expectedExpired ? '✅ MATCH' : '❌ MISMATCH');
    console.log();

    // Sample members from each status
    console.log('='.repeat(80));
    console.log('SAMPLE MEMBERS BY STATUS (First 3 from each)');
    console.log('='.repeat(80));
    
    const sampleQuery = `
      SELECT
        member_id,
        firstname,
        surname,
        membership_status_id,
        ms.status_name,
        expiry_date
      FROM members_consolidated m
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      WHERE ward_code = $1
      ORDER BY membership_status_id, member_id
      LIMIT 15;
    `;
    
    const sampleResult = await client.query(sampleQuery, [wardCode]);
    sampleResult.rows.forEach(member => {
      console.log(`  ${member.member_id} | ${member.firstname} ${member.surname} | Status: ${member.status_name} (${member.membership_status_id}) | Expiry: ${member.expiry_date}`);
    });
    console.log();

    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Ward ${wardCode} has:`);
    console.log(`  - Total: ${stats.total} members`);
    console.log(`  - Active: ${stats.active} members (should show in "Active" tab)`);
    console.log(`  - Expired/Inactive: ${expectedExpired} members (should show in "Expired" tab)`);
    console.log();
    console.log('Expected behavior:');
    console.log('  - "All Members" tab: Show all ' + stats.total + ' members');
    console.log('  - "Active" tab: Show only ' + stats.active + ' Active members');
    console.log('  - "Expired/Inactive" tab: Show ' + expectedExpired + ' Expired/Inactive members');
    console.log('  - Excel download: Should respect the current filter');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error investigating ward:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the investigation
investigateWard()
  .then(() => {
    console.log('\n✅ Investigation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Investigation failed:', error.message);
    process.exit(1);
  });

