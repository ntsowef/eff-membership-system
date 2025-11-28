/**
 * Check the qualifications table structure
 */

const { Pool } = require('pg');

async function checkQualificationsTable() {
  console.log('🔍 Checking qualifications table structure...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Get table structure
    const structureQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'qualifications'
      ORDER BY ordinal_position;
    `;
    
    const structure = await pool.query(structureQuery);
    console.log('\n📋 qualifications table structure:');
    console.log('Column Name | Data Type | Nullable | Default');
    console.log('------------|-----------|----------|--------');
    
    structure.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(11)} | ${row.data_type.padEnd(9)} | ${row.is_nullable.padEnd(8)} | ${row.column_default || 'NULL'}`);
    });
    
    // Check sample data
    const sampleQuery = `SELECT * FROM qualifications LIMIT 5;`;
    const sampleResult = await pool.query(sampleQuery);
    console.log('\n📊 Sample data:');
    if (sampleResult.rows.length > 0) {
      console.log(sampleResult.rows);
    } else {
      console.log('No data in qualifications table');
    }
    
    // Test the failing query with correct table name
    console.log('\n🔧 Testing corrected query...');
    try {
      const correctedQuery = `
        SELECT
          q.qualification_name,
          COUNT(*) as count,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members m2 LEFT JOIN wards w2 ON m2.ward_code = w2.ward_code WHERE 1=1)), 2) as percentage 
        FROM members m
        LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        WHERE 1=1
        AND q.qualification_name IS NOT NULL
        GROUP BY q.qualification_id, q.qualification_name
        ORDER BY q.qualification_level
        LIMIT 5
      `;
      
      const result = await pool.query(correctedQuery);
      console.log('✅ Corrected query works! Results:', result.rows.length, 'rows');
      if (result.rows.length > 0) {
        console.log('Sample result:', result.rows[0]);
      }
    } catch (error) {
      console.log('❌ Corrected query failed:', error.message);
      
      // Try without qualification_level ordering
      try {
        const simpleQuery = `
          SELECT
            q.qualification_name,
            COUNT(*) as count
          FROM members m
          LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
          WHERE q.qualification_name IS NOT NULL
          GROUP BY q.qualification_id, q.qualification_name
          LIMIT 5
        `;
        
        const simpleResult = await pool.query(simpleQuery);
        console.log('✅ Simple query works! Results:', simpleResult.rows.length, 'rows');
        if (simpleResult.rows.length > 0) {
          console.log('Sample result:', simpleResult.rows[0]);
        }
      } catch (simpleError) {
        console.log('❌ Simple query also failed:', simpleError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking qualifications table:', error.message);
  } finally {
    await pool.end();
  }
}

checkQualificationsTable();
