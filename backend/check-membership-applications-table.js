/**
 * Check membership_applications table structure
 * This will help us identify the correct primary key column name
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  ssl: false,
  connectionTimeoutMillis: 30000,
});

async function checkTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking membership_applications table structure...\n');
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'membership_applications'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.error('❌ membership_applications table does not exist!');
      process.exit(1);
    }
    
    console.log('✅ membership_applications table exists\n');
    
    // Get all columns
    const columns = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'membership_applications'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Columns:');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`   - ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
    });
    
    // Get primary key
    const primaryKey = await client.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'membership_applications'::regclass
      AND i.indisprimary;
    `);
    
    console.log('\n🔑 Primary Key:');
    if (primaryKey.rows.length > 0) {
      primaryKey.rows.forEach(pk => {
        console.log(`   - ${pk.attname}`);
      });
    } else {
      console.log('   ⚠️  No primary key found!');
    }
    
    // Get foreign keys that reference this table
    const foreignKeys = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'membership_applications';
    `);
    
    console.log('\n🔗 Foreign Keys referencing this table:');
    if (foreignKeys.rows.length > 0) {
      foreignKeys.rows.forEach(fk => {
        console.log(`   - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('   None found');
    }
    
    console.log('\n✅ Table structure check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTable();

