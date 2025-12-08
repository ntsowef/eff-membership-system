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
    console.log('🔧 Running migration to create complete vw_enhanced_member_search...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'fix-vw-enhanced-member-search-complete.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration executed successfully!\n');

    // Verify the view
    console.log('🔍 Verifying the complete view...\n');

    // Check column count
    const columnsQuery = `
      SELECT COUNT(*) as column_count
      FROM information_schema.columns 
      WHERE table_name = 'vw_enhanced_member_search';
    `;
    const columnsResult = await pool.query(columnsQuery);
    console.log('📊 Total columns in vw_enhanced_member_search:', columnsResult.rows[0].column_count);
    console.log('');

    // Check total member count
    const countQuery = 'SELECT COUNT(*) as total FROM vw_enhanced_member_search;';
    const countResult = await pool.query(countQuery);
    console.log('📊 Total members in view:', countResult.rows[0].total);
    console.log('');

    // Check province distribution
    const provinceQuery = `
      SELECT province_code, COUNT(*) as member_count 
      FROM vw_enhanced_member_search 
      GROUP BY province_code 
      ORDER BY province_code;
    `;
    const provinceResult = await pool.query(provinceQuery);
    console.log('📊 Province distribution:');
    console.table(provinceResult.rows);
    console.log('');

    // Check district distribution (first 10)
    const districtQuery = `
      SELECT district_code, COUNT(*) as member_count 
      FROM vw_enhanced_member_search 
      WHERE district_code IS NOT NULL
      GROUP BY district_code 
      ORDER BY member_count DESC
      LIMIT 10;
    `;
    const districtResult = await pool.query(districtQuery);
    console.log('📊 Top 10 districts by member count:');
    console.table(districtResult.rows);
    console.log('');

    // Sample member with all fields
    const sampleQuery = `
      SELECT * FROM vw_enhanced_member_search 
      WHERE province_code = 'MP' AND district_code = 'DC32'
      LIMIT 1;
    `;
    const sampleResult = await pool.query(sampleQuery);
    console.log('📊 Sample member record (all fields):');
    console.log(JSON.stringify(sampleResult.rows[0], null, 2));

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

