require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration...\n');
    
    const migrationFile = path.join(__dirname, 'migrations', 'add_missing_columns_to_membership_applications.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🗄️  Executing migration...\n');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await client.query(statement);
          console.log(`✓ Statement ${i + 1} completed`);
        } catch (error) {
          console.error(`✗ Error in statement ${i + 1}:`, error.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }
    
    console.log('\n✅ Migration completed!\n');
    
    // Verify columns were added
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'membership_applications'
      AND column_name IN ('citizenship_status', 'signature_type', 'signature_data', 'declaration_accepted', 'constitution_accepted')
      ORDER BY column_name;
    `);
    
    console.log('Verification - Columns added:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name}`);
    });
    
    if (result.rows.length === 5) {
      console.log('\n🎉 All required columns successfully added!');
    } else {
      console.log(`\n⚠️  Only ${result.rows.length}/5 columns were added`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

