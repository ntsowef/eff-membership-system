const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function investigate() {
  try {
    console.log('=== Investigating Audit Data ===\n');
    
    // 1. Check members_consolidated
    console.log('1. members_consolidated table:');
    const members = await pool.query('SELECT COUNT(*) as count FROM members_consolidated');
    console.log(`   Total members: ${members.rows[0].count}`);
    
    const membersWithWard = await pool.query('SELECT COUNT(*) as count FROM members_consolidated WHERE ward_code IS NOT NULL');
    console.log(`   Members with ward_code: ${membersWithWard.rows[0].count}`);
    
    // 2. Check wards table
    console.log('\n2. wards table:');
    const wards = await pool.query('SELECT COUNT(*) as count FROM wards');
    console.log(`   Total wards: ${wards.rows[0].count}`);
    
    // 3. Check if ward_code matches between tables
    console.log('\n3. Ward code matching:');
    const matchingWards = await pool.query(`
      SELECT COUNT(DISTINCT mc.ward_code) as count 
      FROM members_consolidated mc 
      INNER JOIN wards w ON mc.ward_code = w.ward_code
    `);
    console.log(`   Members with matching ward_code in wards table: ${matchingWards.rows[0].count} distinct wards`);
    
    // 4. Sample ward codes from both tables
    console.log('\n4. Sample ward codes:');
    const sampleMemberWards = await pool.query('SELECT DISTINCT ward_code FROM members_consolidated WHERE ward_code IS NOT NULL LIMIT 5');
    console.log('   From members_consolidated:', sampleMemberWards.rows.map(r => r.ward_code));
    
    const sampleWards = await pool.query('SELECT ward_code FROM wards LIMIT 5');
    console.log('   From wards table:', sampleWards.rows.map(r => r.ward_code));
    
    // 5. Check view definition
    console.log('\n5. View definition check:');
    const viewDef = await pool.query("SELECT pg_get_viewdef('vw_ward_membership_audit', true) as def");
    console.log('   View definition (first 500 chars):');
    console.log('   ' + viewDef.rows[0].def.substring(0, 500) + '...');
    
    // 6. Check sample data from view
    console.log('\n6. Sample data from vw_ward_membership_audit:');
    const viewData = await pool.query('SELECT ward_code, ward_name, active_members, total_members, standing_level FROM vw_ward_membership_audit LIMIT 5');
    console.table(viewData.rows);
    
    // 7. Check membership_statuses
    console.log('\n7. membership_statuses table:');
    const statuses = await pool.query('SELECT status_id, status_name, is_active FROM membership_statuses');
    console.table(statuses.rows);
    
    // 8. Check members with active status
    console.log('\n8. Members with active membership status:');
    const activeMembers = await pool.query(`
      SELECT COUNT(*) as count 
      FROM members_consolidated mc 
      JOIN membership_statuses ms ON mc.membership_status_id = ms.status_id 
      WHERE ms.is_active = true
    `);
    console.log(`   Active members: ${activeMembers.rows[0].count}`);
    
    // 9. Check expiry dates
    console.log('\n9. Expiry date analysis:');
    const expiryAnalysis = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as within_grace,
        COUNT(CASE WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as expired,
        COUNT(CASE WHEN expiry_date IS NULL THEN 1 END) as no_expiry
      FROM members_consolidated
    `);
    console.table(expiryAnalysis.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

investigate();

