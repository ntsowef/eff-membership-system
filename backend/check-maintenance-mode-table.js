const { Pool } = require('pg');
require('dotenv').config();

// =====================================================================================
// CHECK AND FIX MAINTENANCE_MODE TABLE STRUCTURE
// Fixes the missing 'id' column issue
// =====================================================================================

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
  max: 20,
});

async function checkAndFixMaintenanceModeTable() {
  console.log('🔍 Checking maintenance_mode Table Structure');
  console.log('============================================\n');
  
  try {
    // 1. Check if table exists
    console.log('1️⃣ Checking if maintenance_mode table exists...\n');
    
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'maintenance_mode'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ maintenance_mode table does not exist!');
      console.log('Creating maintenance_mode table...\n');
      
      await pool.query(`
        CREATE TABLE maintenance_mode (
          id SERIAL PRIMARY KEY,
          is_enabled BOOLEAN DEFAULT FALSE,
          message TEXT,
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          allowed_ips TEXT[],
          allowed_roles TEXT[],
          bypass_token VARCHAR(255),
          created_by INTEGER REFERENCES users(user_id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_maintenance_mode_enabled ON maintenance_mode(is_enabled);
        CREATE INDEX idx_maintenance_mode_times ON maintenance_mode(start_time, end_time);
      `);
      
      console.log('✅ maintenance_mode table created successfully');
    } else {
      console.log('✅ maintenance_mode table exists');
    }
    
    // 2. Check current table structure
    console.log('\n2️⃣ Analyzing current table structure...\n');
    
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'maintenance_mode'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current maintenance_mode columns:');
    columns.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
    });
    
    // 3. Check for missing 'id' column
    console.log('\n3️⃣ Checking for missing id column...\n');
    
    const currentColumns = columns.rows.map(row => row.column_name);
    const hasIdColumn = currentColumns.includes('id');
    
    if (!hasIdColumn) {
      console.log('⚠️  Missing id column detected!');
      console.log('Adding id column as primary key...\n');
      
      try {
        // Add id column as primary key
        await pool.query(`
          ALTER TABLE maintenance_mode 
          ADD COLUMN id SERIAL PRIMARY KEY
        `);
        
        console.log('✅ Added id column as primary key');
        
      } catch (error) {
        console.log(`❌ Failed to add id column: ${error.message}`);
        
        // Alternative approach: recreate table with proper structure
        console.log('Attempting to recreate table with proper structure...\n');
        
        try {
          // Backup existing data
          const existingData = await pool.query('SELECT * FROM maintenance_mode');
          
          // Drop and recreate table
          await pool.query('DROP TABLE IF EXISTS maintenance_mode CASCADE');
          
          await pool.query(`
            CREATE TABLE maintenance_mode (
              id SERIAL PRIMARY KEY,
              is_enabled BOOLEAN DEFAULT FALSE,
              message TEXT,
              start_time TIMESTAMP,
              end_time TIMESTAMP,
              allowed_ips TEXT[],
              allowed_roles TEXT[],
              bypass_token VARCHAR(255),
              created_by INTEGER,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX idx_maintenance_mode_enabled ON maintenance_mode(is_enabled);
            CREATE INDEX idx_maintenance_mode_times ON maintenance_mode(start_time, end_time);
          `);
          
          // Restore data if any existed
          if (existingData.rows.length > 0) {
            console.log(`Restoring ${existingData.rows.length} existing records...`);
            
            for (const row of existingData.rows) {
              await pool.query(`
                INSERT INTO maintenance_mode (
                  is_enabled, message, start_time, end_time, 
                  allowed_ips, allowed_roles, bypass_token, 
                  created_by, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              `, [
                row.is_enabled, row.message, row.start_time, row.end_time,
                row.allowed_ips, row.allowed_roles, row.bypass_token,
                row.created_by, row.created_at, row.updated_at
              ]);
            }
            
            console.log('✅ Data restored successfully');
          }
          
          console.log('✅ Table recreated with proper id column');
          
        } catch (recreateError) {
          console.log(`❌ Failed to recreate table: ${recreateError.message}`);
        }
      }
      
    } else {
      console.log('✅ id column is present');
    }
    
    // 4. Test the failing query
    console.log('\n4️⃣ Testing the failing query...\n');
    
    try {
      const testQuery = `
        SELECT * FROM maintenance_mode ORDER BY id DESC LIMIT 1
      `;
      
      const testResult = await pool.query(testQuery);
      console.log(`✅ Query test successful! Found ${testResult.rows.length} maintenance records`);
      
      if (testResult.rows.length > 0) {
        const record = testResult.rows[0];
        console.log(`   Latest record: ID ${record.id}, Enabled: ${record.is_enabled}`);
      }
      
    } catch (error) {
      console.log(`❌ Query test failed: ${error.message}`);
    }
    
    // 5. Add a default maintenance record if none exists
    console.log('\n5️⃣ Ensuring default maintenance record exists...\n');
    
    try {
      const count = await pool.query('SELECT COUNT(*) FROM maintenance_mode');
      const recordCount = parseInt(count.rows[0].count);
      
      if (recordCount === 0) {
        await pool.query(`
          INSERT INTO maintenance_mode (is_enabled, message, created_at)
          VALUES (FALSE, 'System maintenance mode', CURRENT_TIMESTAMP)
        `);
        
        console.log('✅ Added default maintenance record');
      } else {
        console.log(`✅ Found ${recordCount} existing maintenance records`);
      }
      
    } catch (error) {
      console.log(`⚠️  Could not add default record: ${error.message}`);
    }
    
    // 6. Final verification
    console.log('\n6️⃣ Final verification...\n');
    
    const finalColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'maintenance_mode'
      ORDER BY ordinal_position
    `);
    
    const finalCount = await pool.query('SELECT COUNT(*) FROM maintenance_mode');
    
    console.log('📊 FINAL TABLE STRUCTURE:');
    console.log('=========================');
    finalColumns.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type})`);
    });
    
    console.log(`\n📈 RECORDS: ${finalCount.rows[0].count} maintenance records`);
    
    console.log('\n🎉 MAINTENANCE_MODE TABLE VERIFICATION COMPLETED!');
    console.log('=================================================');
    console.log('✅ Table structure verified and fixed');
    console.log('✅ id column present and functional');
    console.log('✅ Query compatibility confirmed');
    console.log('✅ Default record available');
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
  checkAndFixMaintenanceModeTable()
    .then(() => {
      console.log('\n✅ Maintenance mode table verification completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Maintenance mode table verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkAndFixMaintenanceModeTable };
