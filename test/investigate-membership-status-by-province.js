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

async function investigateMembershipStatusByProvince() {
  const client = await pool.connect();
  
  try {
    console.log('='.repeat(80));
    console.log('MEMBERSHIP STATUS INVESTIGATION BY PROVINCE');
    console.log('='.repeat(80));
    console.log();

    // Query 1: Get membership status distribution by province
    console.log('Query 1: Membership Status Distribution by Province');
    console.log('-'.repeat(80));
    
    const query1 = `
      SELECT
        p.province_name,
        ms.status_name as membership_status,
        COUNT(m.member_id) as member_count,
        ROUND(COUNT(m.member_id) * 100.0 / SUM(COUNT(m.member_id)) OVER (PARTITION BY p.province_name), 2) as percentage_in_province
      FROM members_consolidated m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON COALESCE(mu.district_code, pm.district_code) = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      WHERE p.province_name IS NOT NULL
      GROUP BY p.province_name, ms.status_name
      ORDER BY p.province_name, member_count DESC;
    `;
    
    const result1 = await client.query(query1);
    console.table(result1.rows);
    console.log();

    // Query 2: Summary by province (total members and status breakdown)
    console.log('Query 2: Province Summary with Total Members');
    console.log('-'.repeat(80));
    
    const query2 = `
      SELECT
        p.province_name,
        COUNT(DISTINCT m.member_id) as total_members,
        COUNT(DISTINCT CASE WHEN ms.status_name = 'Active' THEN m.member_id END) as active_members,
        COUNT(DISTINCT CASE WHEN ms.status_name = 'Expired' THEN m.member_id END) as expired_members,
        COUNT(DISTINCT CASE WHEN ms.status_name = 'Suspended' THEN m.member_id END) as suspended_members,
        COUNT(DISTINCT CASE WHEN ms.status_name = 'Cancelled' THEN m.member_id END) as cancelled_members,
        COUNT(DISTINCT CASE WHEN ms.status_name = 'Pending' THEN m.member_id END) as pending_members,
        COUNT(DISTINCT CASE WHEN ms.status_name = 'Inactive' THEN m.member_id END) as inactive_members,
        COUNT(DISTINCT CASE WHEN ms.status_name = 'Grace Period' THEN m.member_id END) as grace_period_members,
        ROUND(COUNT(DISTINCT CASE WHEN ms.status_name = 'Active' THEN m.member_id END) * 100.0 /
              NULLIF(COUNT(DISTINCT m.member_id), 0), 2) as active_percentage
      FROM members_consolidated m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON COALESCE(mu.district_code, pm.district_code) = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      WHERE p.province_name IS NOT NULL
      GROUP BY p.province_name
      ORDER BY total_members DESC;
    `;
    
    const result2 = await client.query(query2);
    console.table(result2.rows);
    console.log();

    // Query 3: Check for members without province mapping
    console.log('Query 3: Members Without Province Mapping');
    console.log('-'.repeat(80));
    
    const query3 = `
      SELECT
        ms.status_name as membership_status,
        COUNT(m.member_id) as member_count
      FROM members_consolidated m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON COALESCE(mu.district_code, pm.district_code) = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      WHERE p.province_name IS NULL
      GROUP BY ms.status_name
      ORDER BY member_count DESC;
    `;
    
    const result3 = await client.query(query3);
    
    if (result3.rows.length > 0) {
      console.table(result3.rows);
      console.log(`⚠️  WARNING: ${result3.rows.reduce((sum, row) => sum + parseInt(row.member_count), 0)} members found without province mapping!`);
    } else {
      console.log('✅ All members have province mapping');
    }
    console.log();

    // Query 4: Overall membership status summary
    console.log('Query 4: Overall Membership Status Summary (All Provinces)');
    console.log('-'.repeat(80));
    
    const query4 = `
      SELECT 
        ms.status_name as membership_status,
        COUNT(m.member_id) as member_count,
        ROUND(COUNT(m.member_id) * 100.0 / SUM(COUNT(m.member_id)) OVER (), 2) as percentage
      FROM members_consolidated m
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      GROUP BY ms.status_name
      ORDER BY member_count DESC;
    `;
    
    const result4 = await client.query(query4);
    console.table(result4.rows);
    console.log();

    console.log('='.repeat(80));
    console.log('INVESTIGATION COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error investigating membership status:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the investigation
investigateMembershipStatusByProvince()
  .then(() => {
    console.log('\n✅ Investigation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Investigation failed:', error.message);
    process.exit(1);
  });

