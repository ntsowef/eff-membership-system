/**
 * Execute SQL File Script
 * 
 * This script executes a SQL file against the PostgreSQL database
 * Usage: node scripts/execute-sql-file.js <path-to-sql-file>
 */

require('dotenv').config({ path: '.env.postgres' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get SQL file path from command line argument
const sqlFilePath = process.argv[2];

if (!sqlFilePath) {
  console.error('❌ Error: Please provide SQL file path');
  console.error('Usage: node scripts/execute-sql-file.js <path-to-sql-file>');
  process.exit(1);
}

// Resolve full path
const fullPath = path.resolve(sqlFilePath);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ Error: SQL file not found: ${fullPath}`);
  process.exit(1);
}

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
});

async function executeSqlFile() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Execute SQL File                                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('🔧 Database Configuration:');
  console.log(`   Host: ${pool.options.host}`);
  console.log(`   Port: ${pool.options.port}`);
  console.log(`   User: ${pool.options.user}`);
  console.log(`   Database: ${pool.options.database}`);
  console.log('');

  console.log(`📄 SQL File: ${fullPath}`);
  console.log('');

  try {
    // Read SQL file
    console.log('📖 Reading SQL file...');
    const sqlContent = fs.readFileSync(fullPath, 'utf8');
    console.log(`   ✅ File read successfully (${sqlContent.length} characters)`);
    console.log('');

    // Test database connection
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    console.log('   ✅ Connected to database');
    console.log('');

    // Execute SQL
    console.log('🚀 Executing SQL script...');
    console.log('   This may take a moment...');
    console.log('');

    try {
      const result = await client.query(sqlContent);
      console.log('   ✅ SQL script executed successfully!');
      console.log('');

      // Show any notices or messages
      if (client._queryable && client._queryable.notices) {
        console.log('📋 Database Messages:');
        client._queryable.notices.forEach(notice => {
          console.log(`   ${notice.message}`);
        });
        console.log('');
      }

      // Verify views were created
      console.log('🔍 Verifying views...');
      const viewsCheck = await client.query(`
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name IN ('vw_expiring_soon', 'vw_expired_memberships')
        ORDER BY table_name
      `);

      if (viewsCheck.rows.length === 2) {
        console.log('   ✅ vw_expiring_soon created');
        console.log('   ✅ vw_expired_memberships created');
      } else {
        console.log('   ⚠️  Warning: Not all views were created');
        viewsCheck.rows.forEach(row => {
          console.log(`   ✅ ${row.table_name} created`);
        });
      }
      console.log('');

      // Get record counts
      console.log('📊 Checking record counts...');
      try {
        const expiringSoonCount = await client.query('SELECT COUNT(*) as count FROM vw_expiring_soon');
        const expiredCount = await client.query('SELECT COUNT(*) as count FROM vw_expired_memberships');
        
        console.log(`   vw_expiring_soon: ${expiringSoonCount.rows[0].count} records`);
        console.log(`   vw_expired_memberships: ${expiredCount.rows[0].count} records`);
      } catch (countError) {
        console.log('   ⚠️  Could not get record counts');
      }
      console.log('');

      console.log('═'.repeat(60));
      console.log('✅ SUCCESS!');
      console.log('═'.repeat(60));
      console.log('');
      console.log('📋 Next Steps:');
      console.log('   1. Restart the backend server:');
      console.log('      cd backend && npm run dev');
      console.log('');
      console.log('   2. Test the API endpoint:');
      console.log('      curl http://localhost:8000/api/v1/membership-expiration/enhanced-overview');
      console.log('');
      console.log('   3. Verify the Enhanced Membership Overview dashboard');
      console.log('');

    } catch (execError) {
      console.error('❌ Error executing SQL:');
      console.error(`   ${execError.message}`);
      console.error('');
      
      if (execError.position) {
        console.error(`   Error at position: ${execError.position}`);
      }
      
      if (execError.detail) {
        console.error(`   Detail: ${execError.detail}`);
      }
      
      if (execError.hint) {
        console.error(`   Hint: ${execError.hint}`);
      }
      
      throw execError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
executeSqlFile().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

