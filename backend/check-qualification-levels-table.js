/**
 * Check if qualification_levels table exists and its structure
 */

const { Pool } = require('pg');

async function checkQualificationLevelsTable() {
  console.log('🔍 Checking qualification_levels table...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Check if qualification_levels table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'qualification_levels'
      );
    `;
    
    const tableExists = await pool.query(tableExistsQuery);
    console.log('qualification_levels table exists:', tableExists.rows[0].exists);
    
    if (!tableExists.rows[0].exists) {
      console.log('\n❌ qualification_levels table does not exist!');
      
      // Check what qualification-related tables do exist
      const relatedTablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%qualification%'
        ORDER BY table_name;
      `;
      
      const relatedTables = await pool.query(relatedTablesQuery);
      console.log('\n📋 Related tables found:');
      if (relatedTables.rows.length > 0) {
        relatedTables.rows.forEach(row => {
          console.log(`  - ${row.table_name}`);
        });
      } else {
        console.log('  No qualification-related tables found');
      }
      
      // Check members table structure for qualification columns
      const membersColumnsQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'members'
        AND column_name LIKE '%qualification%'
        ORDER BY column_name;
      `;
      
      const membersColumns = await pool.query(membersColumnsQuery);
      console.log('\n📋 Qualification columns in members table:');
      if (membersColumns.rows.length > 0) {
        membersColumns.rows.forEach(row => {
          console.log(`  - ${row.column_name} (${row.data_type})`);
        });
      } else {
        console.log('  No qualification columns found in members table');
      }
      
      console.log('\n💡 SOLUTION OPTIONS:');
      console.log('1. Create qualification_levels table with basic structure');
      console.log('2. Update queries to not use qualification_levels table');
      console.log('3. Use a different approach for qualification data');
      
    } else {
      // Get table structure
      const structureQuery = `
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qualification_levels'
        ORDER BY ordinal_position;
      `;
      
      const structure = await pool.query(structureQuery);
      console.log('\n📋 qualification_levels table structure:');
      console.log('Column Name | Data Type | Nullable | Default');
      console.log('------------|-----------|----------|--------');
      
      structure.rows.forEach(row => {
        console.log(`${row.column_name.padEnd(11)} | ${row.data_type.padEnd(9)} | ${row.is_nullable.padEnd(8)} | ${row.column_default || 'NULL'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking qualification_levels table:', error.message);
  } finally {
    await pool.end();
  }
}

checkQualificationLevelsTable();
