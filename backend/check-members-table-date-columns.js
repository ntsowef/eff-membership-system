/**
 * Check members table for date-related columns
 */

const { Pool } = require('pg');

async function checkMembersTableDateColumns() {
  console.log('🔍 Checking members table for date columns...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Get all date-related columns in members table
    const dateColumnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'members'
      AND (column_name LIKE '%date%' OR column_name LIKE '%time%' OR data_type LIKE '%timestamp%' OR data_type LIKE '%date%')
      ORDER BY column_name;
    `;
    
    const dateColumns = await pool.query(dateColumnsQuery);
    console.log('\n📋 Date-related columns in members table:');
    if (dateColumns.rows.length > 0) {
      console.log('Column Name | Data Type');
      console.log('------------|----------');
      dateColumns.rows.forEach(row => {
        console.log(`${row.column_name.padEnd(11)} | ${row.data_type}`);
      });
    } else {
      console.log('  No date-related columns found');
    }
    
    // Test the corrected query
    console.log('\n🔧 Testing corrected query with created_at...');
    try {
      const correctedQuery = `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent
       FROM members`;
      
      const result = await pool.query(correctedQuery);
      console.log('✅ Corrected query works! Result:', result.rows[0]);
    } catch (error) {
      console.log('❌ Corrected query failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking members table:', error.message);
  } finally {
    await pool.end();
  }
}

checkMembersTableDateColumns();
