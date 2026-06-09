const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function investigate() {
  try {
    // Check table structures first
    console.log('\n=== PROVINCES TABLE COLUMNS ===');
    const pCols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'provinces' ORDER BY ordinal_position`);
    pCols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

    console.log('\n=== MUNICIPALITIES TABLE COLUMNS ===');
    const mCols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'municipalities' ORDER BY ordinal_position`);
    mCols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

    console.log('\n=== DISTRICTS TABLE COLUMNS ===');
    const dCols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'districts' ORDER BY ordinal_position`);
    dCols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

    console.log('\n=== LEADERSHIP_POSITIONS TABLE COLUMNS ===');
    const lpCols = await pool.query(`SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'leadership_positions' ORDER BY ordinal_position`);
    lpCols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}) default: ${r.column_default}`));

    console.log('\n=== LEADERSHIP_APPOINTMENTS TABLE COLUMNS ===');
    const laCols = await pool.query(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'leadership_appointments' ORDER BY ordinal_position`);
    laCols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable}) default: ${r.column_default}`));

  } catch (e) {
    console.error('Error:', e.message, e.stack);
  } finally {
    await pool.end();
  }
}

investigate();

