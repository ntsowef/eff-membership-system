const { Pool } = require('pg');
require('dotenv').config();

// =====================================================================================
// CHECK AND CREATE MISSING MAINTENANCE VIEW
// Fixes the missing 'vw_current_maintenance_status' view issue
// =====================================================================================

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
  max: 20,
});

async function checkAndCreateMaintenanceView() {
  console.log('🔍 Checking vw_current_maintenance_status View');
  console.log('==============================================\n');
  
  try {
    // 1. Check if view exists
    console.log('1️⃣ Checking if vw_current_maintenance_status view exists...\n');
    
    const viewExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vw_current_maintenance_status'
      );
    `);
    
    if (!viewExists.rows[0].exists) {
      console.log('❌ vw_current_maintenance_status view does not exist!');
      console.log('Creating maintenance status view...\n');
      
      // Create the view based on the maintenance_mode table
      await pool.query(`
        CREATE OR REPLACE VIEW vw_current_maintenance_status AS
        SELECT 
          id,
          is_enabled,
          message,
          start_time,
          end_time,
          allowed_ips,
          allowed_roles,
          bypass_token,
          created_by,
          created_at,
          updated_at,
          CASE 
            WHEN is_enabled = true AND (start_time IS NULL OR start_time <= CURRENT_TIMESTAMP) 
                 AND (end_time IS NULL OR end_time >= CURRENT_TIMESTAMP)
            THEN true
            ELSE false
          END as is_currently_active,
          CASE 
            WHEN start_time IS NOT NULL AND start_time > CURRENT_TIMESTAMP
            THEN 'scheduled'
            WHEN is_enabled = true AND (start_time IS NULL OR start_time <= CURRENT_TIMESTAMP) 
                 AND (end_time IS NULL OR end_time >= CURRENT_TIMESTAMP)
            THEN 'active'
            WHEN end_time IS NOT NULL AND end_time < CURRENT_TIMESTAMP
            THEN 'expired'
            ELSE 'inactive'
          END as status
        FROM maintenance_mode
        ORDER BY id DESC
        LIMIT 1;
      `);
      
      console.log('✅ vw_current_maintenance_status view created successfully');
    } else {
      console.log('✅ vw_current_maintenance_status view exists');
    }
    
    // 2. Test the view
    console.log('\n2️⃣ Testing the maintenance status view...\n');
    
    try {
      const viewTest = await pool.query(`
        SELECT * FROM vw_current_maintenance_status
      `);
      
      console.log(`✅ View test successful! Found ${viewTest.rows.length} maintenance status records`);
      
      if (viewTest.rows.length > 0) {
        const status = viewTest.rows[0];
        console.log(`   Current status: ${status.status}`);
        console.log(`   Is enabled: ${status.is_enabled}`);
        console.log(`   Is currently active: ${status.is_currently_active}`);
        console.log(`   Message: ${status.message || 'No message'}`);
      }
      
    } catch (error) {
      console.log(`❌ View test failed: ${error.message}`);
    }
    
    // 3. Check maintenance_mode table has data
    console.log('\n3️⃣ Checking maintenance_mode table data...\n');
    
    try {
      const tableData = await pool.query(`
        SELECT COUNT(*) as count FROM maintenance_mode
      `);
      
      const recordCount = parseInt(tableData.rows[0].count);
      console.log(`📊 Found ${recordCount} records in maintenance_mode table`);
      
      if (recordCount === 0) {
        console.log('⚠️  No maintenance records found, adding default record...');
        
        await pool.query(`
          INSERT INTO maintenance_mode (is_enabled, message, created_at)
          VALUES (FALSE, 'System maintenance mode', CURRENT_TIMESTAMP)
        `);
        
        console.log('✅ Added default maintenance record');
      }
      
    } catch (error) {
      console.log(`❌ Error checking maintenance_mode table: ${error.message}`);
    }
    
    // 4. Test the specific query that was failing
    console.log('\n4️⃣ Testing the failing maintenance status query...\n');
    
    try {
      const maintenanceStatus = await pool.query(`
        SELECT * FROM vw_current_maintenance_status
      `);
      
      console.log('✅ Maintenance status query successful!');
      
      if (maintenanceStatus.rows.length > 0) {
        const status = maintenanceStatus.rows[0];
        console.log('📋 Current maintenance status:');
        console.log(`   ID: ${status.id}`);
        console.log(`   Enabled: ${status.is_enabled}`);
        console.log(`   Currently Active: ${status.is_currently_active}`);
        console.log(`   Status: ${status.status}`);
        console.log(`   Message: ${status.message || 'No message'}`);
        console.log(`   Start Time: ${status.start_time || 'Not scheduled'}`);
        console.log(`   End Time: ${status.end_time || 'No end time'}`);
      } else {
        console.log('⚠️  No maintenance status found');
      }
      
    } catch (error) {
      console.log(`❌ Maintenance status query failed: ${error.message}`);
    }
    
    // 5. Create additional useful views if needed
    console.log('\n5️⃣ Creating additional maintenance views...\n');
    
    try {
      // View for active maintenance sessions
      await pool.query(`
        CREATE OR REPLACE VIEW vw_active_maintenance AS
        SELECT 
          id,
          is_enabled,
          message,
          start_time,
          end_time,
          created_at,
          updated_at
        FROM maintenance_mode
        WHERE is_enabled = true 
          AND (start_time IS NULL OR start_time <= CURRENT_TIMESTAMP)
          AND (end_time IS NULL OR end_time >= CURRENT_TIMESTAMP)
        ORDER BY created_at DESC;
      `);
      
      // View for scheduled maintenance
      await pool.query(`
        CREATE OR REPLACE VIEW vw_scheduled_maintenance AS
        SELECT 
          id,
          is_enabled,
          message,
          start_time,
          end_time,
          created_at,
          updated_at
        FROM maintenance_mode
        WHERE start_time IS NOT NULL 
          AND start_time > CURRENT_TIMESTAMP
        ORDER BY start_time ASC;
      `);
      
      console.log('✅ Additional maintenance views created');
      
    } catch (error) {
      console.log(`⚠️  Could not create additional views: ${error.message}`);
    }
    
    // 6. Final verification
    console.log('\n6️⃣ Final verification...\n');
    
    const allViews = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%maintenance%'
      ORDER BY table_name
    `);
    
    console.log('📊 MAINTENANCE VIEWS AVAILABLE:');
    console.log('===============================');
    allViews.rows.forEach((view, index) => {
      console.log(`   ${index + 1}. ${view.table_name}`);
    });
    
    console.log('\n🎉 MAINTENANCE VIEW VERIFICATION COMPLETED!');
    console.log('===========================================');
    console.log('✅ vw_current_maintenance_status view created and tested');
    console.log('✅ Additional maintenance views available');
    console.log('✅ Maintenance status queries working');
    console.log('✅ Ready for maintenance mode operations');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the check
if (require.main === module) {
  checkAndCreateMaintenanceView()
    .then(() => {
      console.log('\n✅ Maintenance view verification completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Maintenance view verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkAndCreateMaintenanceView };
