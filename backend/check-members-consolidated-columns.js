const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkColumns() {
  try {
    console.log('🔍 Checking members_consolidated table structure...\n');

    // Get all columns from members_consolidated
    const columnsQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'members_consolidated' 
      ORDER BY ordinal_position;
    `;
    const columnsResult = await pool.query(columnsQuery);
    console.log('📊 members_consolidated columns:');
    console.table(columnsResult.rows);
    console.log('Total columns:', columnsResult.rows.length);
    console.log('');

    // Get current vw_enhanced_member_search columns
    const viewColumnsQuery = `
      SELECT 
        column_name, 
        data_type
      FROM information_schema.columns 
      WHERE table_name = 'vw_enhanced_member_search' 
      ORDER BY ordinal_position;
    `;
    const viewColumnsResult = await pool.query(viewColumnsQuery);
    console.log('📊 vw_enhanced_member_search columns:');
    console.table(viewColumnsResult.rows);
    console.log('Total columns:', viewColumnsResult.rows.length);
    console.log('');

    // Find columns in members_consolidated that are NOT in the view
    const consolidatedColumns = columnsResult.rows.map(r => r.column_name);
    const viewColumns = viewColumnsResult.rows.map(r => r.column_name);
    
    const missingColumns = consolidatedColumns.filter(col => !viewColumns.includes(col));
    console.log('📊 Columns in members_consolidated but NOT in vw_enhanced_member_search:');
    console.log(missingColumns);
    console.log('');

    // Get current vw_member_details columns
    const detailsViewQuery = `
      SELECT 
        column_name, 
        data_type
      FROM information_schema.columns 
      WHERE table_name = 'vw_member_details' 
      ORDER BY ordinal_position;
    `;
    const detailsViewResult = await pool.query(detailsViewQuery);
    console.log('📊 vw_member_details columns:');
    console.table(detailsViewResult.rows);
    console.log('Total columns:', detailsViewResult.rows.length);
    console.log('');

    const detailsViewColumns = detailsViewResult.rows.map(r => r.column_name);
    const missingInDetails = consolidatedColumns.filter(col => !detailsViewColumns.includes(col));
    console.log('📊 Columns in members_consolidated but NOT in vw_member_details:');
    console.log(missingInDetails);

    await pool.end();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkColumns();

