const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function getViewDefinition() {
  try {
    console.log('🔍 Getting vw_enhanced_member_search definition...\n');

    const query = `
      SELECT pg_get_viewdef('vw_enhanced_member_search', true) as view_definition;
    `;
    const result = await pool.query(query);
    
    console.log('📊 View Definition:');
    console.log('='.repeat(80));
    console.log(result.rows[0].view_definition);
    console.log('='.repeat(80));

    await pool.end();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

getViewDefinition();

