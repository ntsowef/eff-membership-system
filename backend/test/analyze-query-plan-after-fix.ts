import { Pool } from 'pg';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
};

async function analyzeQuery() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('📊 Analyzing query plan AFTER fix...\n');
    console.log('='.repeat(80));
    
    const explainResult = await pool.query(`
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
      SELECT * FROM vw_ward_compliance_summary 
      WHERE municipality_code = 'JHB004'
    `);
    
    explainResult.rows.forEach(row => {
      console.log(row['QUERY PLAN']);
    });
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

analyzeQuery();

