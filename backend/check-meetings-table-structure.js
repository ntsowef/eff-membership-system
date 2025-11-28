/**
 * Check the actual structure of the meetings table
 */

const { Pool } = require('pg');

async function checkMeetingsTableStructure() {
  console.log('🔍 Checking meetings table structure...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Check if meetings table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'meetings'
      );
    `;
    
    const tableExists = await pool.query(tableExistsQuery);
    console.log('Meetings table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Get table structure
      const structureQuery = `
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'meetings'
        ORDER BY ordinal_position;
      `;
      
      const structure = await pool.query(structureQuery);
      console.log('\n📋 Meetings table structure:');
      console.log('Column Name | Data Type | Nullable | Default');
      console.log('------------|-----------|----------|--------');
      
      structure.rows.forEach(row => {
        console.log(`${row.column_name.padEnd(11)} | ${row.data_type.padEnd(9)} | ${row.is_nullable.padEnd(8)} | ${row.column_default || 'NULL'}`);
      });
      
      // Check for specific columns
      const hasStartDatetime = structure.rows.some(row => row.column_name === 'start_datetime');
      const hasMeetingDate = structure.rows.some(row => row.column_name === 'meeting_date');
      const hasMeetingTime = structure.rows.some(row => row.column_name === 'meeting_time');
      
      console.log('\n🔍 Column Analysis:');
      console.log('Has start_datetime:', hasStartDatetime);
      console.log('Has meeting_date:', hasMeetingDate);
      console.log('Has meeting_time:', hasMeetingTime);
      
      if (!hasStartDatetime && hasMeetingDate && hasMeetingTime) {
        console.log('\n💡 SOLUTION: The table uses meeting_date + meeting_time instead of start_datetime');
        console.log('The analytics query should be updated to use:');
        console.log('  (meeting_date + meeting_time)::timestamp instead of start_datetime');
      }
      
      // Check sample data
      const sampleQuery = `SELECT COUNT(*) as total_meetings FROM meetings;`;
      const sampleResult = await pool.query(sampleQuery);
      console.log('\nTotal meetings in table:', sampleResult.rows[0].total_meetings);
      
    } else {
      console.log('❌ Meetings table does not exist!');
    }
    
  } catch (error) {
    console.error('❌ Error checking meetings table:', error.message);
  } finally {
    await pool.end();
  }
}

checkMeetingsTableStructure();
