const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function runMigration() {
  try {
    console.log('🔧 Running migration to fix vw_enhanced_member_search province_code...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'fix-vw-enhanced-member-search-province-code.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log('='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80));
    console.log('');

    // Execute the migration
    console.log('⚙️  Executing migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration executed successfully!\n');

    // Verify the fix - check counts by province
    console.log('🔍 Verifying the fix...\n');

    const verifyQuery = `
      SELECT province_code, COUNT(*) as member_count 
      FROM vw_enhanced_member_search 
      GROUP BY province_code 
      ORDER BY province_code;
    `;
    const result = await pool.query(verifyQuery);
    
    console.log('📊 Province counts in vw_enhanced_member_search after fix:');
    console.table(result.rows);
    console.log('Total:', result.rows.reduce((sum, row) => sum + parseInt(row.member_count), 0));
    console.log('');

    // Check MP specifically
    const mpQuery = `
      SELECT province_code, COUNT(*) as member_count
      FROM vw_enhanced_member_search
      WHERE province_code = 'MP'
      GROUP BY province_code;
    `;
    const mpResult = await pool.query(mpQuery);
    console.log('📊 MP Province count:');
    console.log(mpResult.rows[0]);
    console.log('');

    // Sample MP members
    const sampleQuery = `
      SELECT member_id, firstname, surname, province_code, province_name, district_code, municipality_code
      FROM vw_enhanced_member_search 
      WHERE province_code = 'MP' 
      LIMIT 5;
    `;
    const sampleResult = await pool.query(sampleQuery);
    console.log('📊 Sample MP members:');
    console.table(sampleResult.rows);

    await pool.end();
    console.log('\n✅ Migration and verification complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

