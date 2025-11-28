const { Pool } = require('pg');
require('dotenv').config();

// =====================================================================================
// DEBUG STATISTICS ENDPOINT ERROR
// Identifies which tables/queries are causing the system statistics to fail
// =====================================================================================

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
  max: 20,
});

async function debugStatisticsError() {
  console.log('🔍 Debugging Statistics Endpoint Error');
  console.log('======================================\n');
  
  try {
    // 1. Check all tables referenced in the system statistics query
    console.log('1️⃣ Checking required tables for system statistics...\n');
    
    const requiredTables = [
      'members',
      'memberships', 
      'membership_statuses',
      'provinces',
      'districts',
      'municipalities',
      'wards',
      'voting_stations'
    ];
    
    for (const tableName of requiredTables) {
      try {
        const tableExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [tableName]);
        
        if (tableExists.rows[0].exists) {
          const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
          console.log(`   ✅ ${tableName}: ${countResult.rows[0].count} records`);
        } else {
          console.log(`   ❌ ${tableName}: Table does not exist`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${tableName}: Error - ${error.message}`);
      }
    }
    
    // 2. Test the main totals query from StatisticsModel.getSystemStatistics()
    console.log('\n2️⃣ Testing main totals query...\n');
    
    try {
      const totalsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM members) as members,
          (SELECT COUNT(*) FROM memberships) as memberships,
          (SELECT COUNT(*) FROM memberships ms JOIN membership_statuses mst ON ms.status_id = mst.status_id WHERE mst.is_active = TRUE) as active_memberships,
          (SELECT COUNT(*) FROM provinces) as provinces,
          (SELECT COUNT(*) FROM districts) as districts,
          (SELECT COUNT(*) FROM municipalities) as municipalities,
          (SELECT COUNT(*) FROM wards) as wards,
          (SELECT COUNT(*) FROM voting_stations WHERE is_active = TRUE) as voting_stations
      `;
      
      const totalsResult = await pool.query(totalsQuery);
      console.log('✅ Totals query successful:');
      console.log(`   Members: ${totalsResult.rows[0].members}`);
      console.log(`   Memberships: ${totalsResult.rows[0].memberships}`);
      console.log(`   Active memberships: ${totalsResult.rows[0].active_memberships}`);
      console.log(`   Provinces: ${totalsResult.rows[0].provinces}`);
      console.log(`   Districts: ${totalsResult.rows[0].districts}`);
      console.log(`   Municipalities: ${totalsResult.rows[0].municipalities}`);
      console.log(`   Wards: ${totalsResult.rows[0].wards}`);
      console.log(`   Voting stations: ${totalsResult.rows[0].voting_stations}`);
      
    } catch (error) {
      console.log(`❌ Totals query failed: ${error.message}`);
      console.log('   This is likely the cause of the statistics endpoint failure');
    }
    
    // 3. Test the growth query
    console.log('\n3️⃣ Testing growth query...\n');
    
    try {
      const growthQuery = `
        SELECT 
          COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as members_this_month,
          COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' 
                     AND created_at < DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as members_last_month
        FROM members
      `;
      
      const growthResult = await pool.query(growthQuery);
      console.log('✅ Growth query successful:');
      console.log(`   Members this month: ${growthResult.rows[0].members_this_month}`);
      console.log(`   Members last month: ${growthResult.rows[0].members_last_month}`);
      
    } catch (error) {
      console.log(`❌ Growth query failed: ${error.message}`);
    }
    
    // 4. Test the top wards query
    console.log('\n4️⃣ Testing top wards query...\n');
    
    try {
      const topWardsQuery = `
        SELECT 
          w.ward_code,
          w.ward_name,
          m.municipality_name,
          COUNT(mem.member_id) as member_count
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN members mem ON w.ward_code = mem.ward_code
        GROUP BY w.ward_code, w.ward_name, m.municipality_name
        ORDER BY member_count DESC
        LIMIT 10
      `;
      
      const topWardsResult = await pool.query(topWardsQuery);
      console.log(`✅ Top wards query successful: Found ${topWardsResult.rows.length} wards`);
      
      if (topWardsResult.rows.length > 0) {
        console.log('   Top 3 wards:');
        topWardsResult.rows.slice(0, 3).forEach((ward, index) => {
          console.log(`   ${index + 1}. ${ward.ward_name} (${ward.municipality_name}): ${ward.member_count} members`);
        });
      }
      
    } catch (error) {
      console.log(`❌ Top wards query failed: ${error.message}`);
    }
    
    // 5. Check for missing columns in key tables
    console.log('\n5️⃣ Checking for missing columns in key tables...\n');
    
    const keyTables = ['members', 'memberships', 'membership_statuses', 'voting_stations'];
    
    for (const tableName of keyTables) {
      try {
        const columns = await pool.query(`
          SELECT column_name, data_type
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`📋 ${tableName} columns (${columns.rows.length} total):`);
        columns.rows.slice(0, 5).forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type})`);
        });
        if (columns.rows.length > 5) {
          console.log(`   ... and ${columns.rows.length - 5} more columns`);
        }
        
      } catch (error) {
        console.log(`❌ Could not check ${tableName} columns: ${error.message}`);
      }
    }
    
    // 6. Test a simplified version of the statistics query
    console.log('\n6️⃣ Testing simplified statistics query...\n');
    
    try {
      const simplifiedQuery = `
        SELECT 
          (SELECT COUNT(*) FROM members) as total_members,
          (SELECT COUNT(*) FROM provinces) as total_provinces,
          (SELECT COUNT(*) FROM municipalities) as total_municipalities
      `;
      
      const simplifiedResult = await pool.query(simplifiedQuery);
      console.log('✅ Simplified query successful:');
      console.log(`   Total members: ${simplifiedResult.rows[0].total_members}`);
      console.log(`   Total provinces: ${simplifiedResult.rows[0].total_provinces}`);
      console.log(`   Total municipalities: ${simplifiedResult.rows[0].total_municipalities}`);
      
    } catch (error) {
      console.log(`❌ Simplified query failed: ${error.message}`);
    }
    
    // 7. Check membership_statuses table specifically
    console.log('\n7️⃣ Checking membership_statuses table...\n');
    
    try {
      const statusCheck = await pool.query(`
        SELECT status_id, status_name, is_active
        FROM membership_statuses
        ORDER BY status_id
      `);
      
      console.log(`✅ Found ${statusCheck.rows.length} membership statuses:`);
      statusCheck.rows.forEach(status => {
        console.log(`   - ${status.status_name} (ID: ${status.status_id}, Active: ${status.is_active})`);
      });
      
    } catch (error) {
      console.log(`❌ membership_statuses check failed: ${error.message}`);
    }
    
    console.log('\n🎉 STATISTICS DEBUG COMPLETED!');
    console.log('==============================');
    console.log('✅ Database connectivity verified');
    console.log('✅ Table existence checked');
    console.log('✅ Query components tested');
    console.log('✅ Column structures analyzed');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the debug
if (require.main === module) {
  debugStatisticsError()
    .then(() => {
      console.log('\n✅ Statistics debugging completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Statistics debugging failed:', error.message);
      process.exit(1);
    });
}

module.exports = { debugStatisticsError };
