import { Pool } from 'pg';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
};

async function checkIndexes() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 Checking indexes on key tables...\n');
    
    // Check indexes on members_consolidated
    console.log('📊 Indexes on members_consolidated:');
    console.log('='.repeat(80));
    const membersIndexes = await pool.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'members_consolidated'
      ORDER BY indexname
    `);
    
    membersIndexes.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
      console.log(`    ${row.indexdef}`);
    });
    
    // Check if ward_code index exists
    const hasWardCodeIndex = membersIndexes.rows.some(row => 
      row.indexname.includes('ward_code') || row.indexdef.includes('ward_code')
    );
    
    if (!hasWardCodeIndex) {
      console.log('\n❌ MISSING INDEX: No index on members_consolidated.ward_code!');
      console.log('   This is causing the slow query performance.');
      console.log('   Recommendation: CREATE INDEX idx_members_consolidated_ward_code ON members_consolidated(ward_code);');
    } else {
      console.log('\n✅ Index on ward_code exists');
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Check indexes on wards
    console.log('\n📊 Indexes on wards:');
    console.log('='.repeat(80));
    const wardsIndexes = await pool.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'wards'
      ORDER BY indexname
    `);
    
    wardsIndexes.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Check indexes on ward_delegates
    console.log('\n📊 Indexes on ward_delegates:');
    console.log('='.repeat(80));
    const delegatesIndexes = await pool.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'ward_delegates'
      ORDER BY indexname
    `);
    
    delegatesIndexes.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Analyze query plan
    console.log('\n📊 Query Plan Analysis:');
    console.log('='.repeat(80));
    const explainResult = await pool.query(`
      EXPLAIN ANALYZE
      SELECT * FROM vw_ward_compliance_summary 
      WHERE municipality_code = 'JHB004'
    `);
    
    explainResult.rows.forEach(row => {
      console.log(row['QUERY PLAN']);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkIndexes();

