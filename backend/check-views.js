const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkViews() {
  try {
    console.log('🔍 Checking membership expiration views...\n');
    
    // Check members_consolidated table
    console.log('1. Checking members_consolidated table:');
    const totalMembers = await pool.query('SELECT COUNT(*) as count FROM members_consolidated');
    console.log(`   Total members: ${totalMembers.rows[0].count}`);
    
    const withExpiry = await pool.query('SELECT COUNT(*) as count FROM members_consolidated WHERE expiry_date IS NOT NULL');
    console.log(`   With expiry_date: ${withExpiry.rows[0].count}`);
    
    const activeMembers = await pool.query(`
      SELECT COUNT(*) as count 
      FROM members_consolidated 
      WHERE expiry_date >= CURRENT_DATE 
      AND expiry_date IS NOT NULL
    `);
    console.log(`   Active (expiry >= today): ${activeMembers.rows[0].count}`);
    
    const expiringSoon = await pool.query(`
      SELECT COUNT(*) as count 
      FROM members_consolidated 
      WHERE expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
      AND expiry_date IS NOT NULL
    `);
    console.log(`   Expiring within 30 days: ${expiringSoon.rows[0].count}`);
    
    const expired = await pool.query(`
      SELECT COUNT(*) as count 
      FROM members_consolidated 
      WHERE expiry_date < CURRENT_DATE 
      AND expiry_date IS NOT NULL
    `);
    console.log(`   Expired (expiry < today): ${expired.rows[0].count}\n`);
    
    // Check if memberships table exists
    console.log('2. Checking if memberships table exists:');
    const membershipsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'memberships'
      )
    `);
    console.log(`   memberships table exists: ${membershipsExists.rows[0].exists}`);
    
    if (membershipsExists.rows[0].exists) {
      const membershipsCount = await pool.query('SELECT COUNT(*) as count FROM memberships');
      console.log(`   memberships table count: ${membershipsCount.rows[0].count}\n`);
    } else {
      console.log(`   ❌ memberships table does NOT exist\n`);
    }
    
    // Check views
    console.log('3. Checking views:');
    const viewExpiringSoon = await pool.query('SELECT COUNT(*) as count FROM vw_expiring_soon');
    console.log(`   vw_expiring_soon count: ${viewExpiringSoon.rows[0].count}`);
    
    const viewExpired = await pool.query('SELECT COUNT(*) as count FROM vw_expired_memberships');
    console.log(`   vw_expired_memberships count: ${viewExpired.rows[0].count}\n`);
    
    // Get view definition
    console.log('4. Getting vw_expiring_soon definition:');
    const viewDef = await pool.query(`
      SELECT pg_get_viewdef('vw_expiring_soon', true) as definition
    `);
    console.log(viewDef.rows[0].definition);
    
    console.log('\n✅ Check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkViews();

