const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function debugMembershipApplicationsTable() {
  console.log('🔍 Debugging membership_applications table structure...\n');

  try {
    // 1. Check if the table exists
    console.log('1. Checking if membership_applications table exists...');
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'membership_applications'
      );
    `;
    
    const tableExistsResult = await pool.query(tableExistsQuery);
    const tableExists = tableExistsResult.rows[0].exists;
    
    console.log(`Table exists: ${tableExists}`);
    
    if (!tableExists) {
      console.log('❌ membership_applications table does not exist!');
      
      // Check for similar table names
      console.log('\n2. Looking for similar table names...');
      const similarTablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%application%'
        ORDER BY table_name;
      `;
      
      const similarTablesResult = await pool.query(similarTablesQuery);
      console.log('Similar tables found:', similarTablesResult.rows);
      
      return;
    }

    // 2. Get the table structure
    console.log('\n2. Getting table structure...');
    const structureQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'membership_applications'
      ORDER BY ordinal_position;
    `;
    
    const structureResult = await pool.query(structureQuery);
    console.log('Table structure:');
    console.table(structureResult.rows);

    // 3. Check for primary key
    console.log('\n3. Checking primary key...');
    const primaryKeyQuery = `
      SELECT 
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'membership_applications'
        AND tc.constraint_type = 'PRIMARY KEY';
    `;
    
    const primaryKeyResult = await pool.query(primaryKeyQuery);
    console.log('Primary key columns:', primaryKeyResult.rows);

    // 4. Get sample data to understand the structure
    console.log('\n4. Getting sample data (first 3 rows)...');
    const sampleDataQuery = `
      SELECT * FROM membership_applications 
      ORDER BY created_at DESC 
      LIMIT 3;
    `;
    
    const sampleDataResult = await pool.query(sampleDataQuery);
    console.log('Sample data:');
    if (sampleDataResult.rows.length > 0) {
      console.table(sampleDataResult.rows);
    } else {
      console.log('No data found in table');
    }

    // 5. Count total records
    console.log('\n5. Counting total records...');
    const countQuery = `SELECT COUNT(*) as total_records FROM membership_applications;`;
    const countResult = await pool.query(countQuery);
    console.log(`Total records: ${countResult.rows[0].total_records}`);

  } catch (error) {
    console.error('❌ Error debugging table:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

debugMembershipApplicationsTable().catch(console.error);
