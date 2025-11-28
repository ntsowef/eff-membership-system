/**
 * Check if Membership Expiration Views Exist
 * 
 * This script checks if the required database views exist:
 * - vw_expiring_soon
 * - vw_expired_memberships
 */

require('dotenv').config({ path: '.env.postgres' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
});

async function checkViews() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Membership Expiration Views Check                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Check if vw_expiring_soon exists
    console.log('1️⃣  Checking vw_expiring_soon view...');
    try {
      const expiringSoonCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = 'vw_expiring_soon'
        ) as exists
      `);
      
      if (expiringSoonCheck.rows[0].exists) {
        console.log('   ✅ vw_expiring_soon EXISTS');
        
        // Get count
        const count = await pool.query('SELECT COUNT(*) as count FROM vw_expiring_soon');
        console.log(`   📊 Contains ${count.rows[0].count} records\n`);
      } else {
        console.log('   ❌ vw_expiring_soon DOES NOT EXIST\n');
      }
    } catch (error) {
      console.log('   ❌ Error checking vw_expiring_soon:', error.message, '\n');
    }

    // Check if vw_expired_memberships exists
    console.log('2️⃣  Checking vw_expired_memberships view...');
    try {
      const expiredCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = 'vw_expired_memberships'
        ) as exists
      `);
      
      if (expiredCheck.rows[0].exists) {
        console.log('   ✅ vw_expired_memberships EXISTS');
        
        // Get count
        const count = await pool.query('SELECT COUNT(*) as count FROM vw_expired_memberships');
        console.log(`   📊 Contains ${count.rows[0].count} records\n`);
      } else {
        console.log('   ❌ vw_expired_memberships DOES NOT EXIST\n');
      }
    } catch (error) {
      console.log('   ❌ Error checking vw_expired_memberships:', error.message, '\n');
    }

    // Check underlying tables
    console.log('3️⃣  Checking underlying tables...');
    
    const tables = ['members', 'memberships', 'membership_statuses', 'wards', 'municipalities', 'districts', 'provinces'];
    
    for (const table of tables) {
      try {
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          ) as exists
        `, [table]);
        
        if (tableCheck.rows[0].exists) {
          const count = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`   ✅ ${table}: ${count.rows[0].count} records`);
        } else {
          console.log(`   ❌ ${table}: DOES NOT EXIST`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: Error - ${error.message}`);
      }
    }

    console.log('\n═'.repeat(60));
    console.log('SUMMARY:');
    console.log('═'.repeat(60));
    console.log('If views are missing, run:');
    console.log('  psql -h localhost -U eff_admin -d eff_membership_db \\');
    console.log('    -f database-recovery/create-membership-expiration-views.sql');
    console.log('');
    console.log('OR using Docker:');
    console.log('  docker cp database-recovery/create-membership-expiration-views.sql postgres_container:/tmp/');
    console.log('  docker exec -it postgres_container psql -U eff_admin -d eff_membership_db \\');
    console.log('    -f /tmp/create-membership-expiration-views.sql');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkViews().catch(console.error);

