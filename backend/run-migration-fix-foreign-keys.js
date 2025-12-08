const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function runMigration() {
  try {
    console.log('🔧 Running migration to fix foreign keys to reference members_consolidated...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'fix-foreign-keys-to-members-consolidated.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration (this may take a few moments)...');
    await pool.query(migrationSQL);
    console.log('✅ Migration executed successfully!\n');

    // Verify the foreign keys
    console.log('🔍 Verifying foreign keys now reference members_consolidated...\n');

    const fkQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
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
        AND ccu.table_name IN ('members', 'members_consolidated')
      ORDER BY ccu.table_name, tc.table_name;
    `;
    
    const fkResult = await pool.query(fkQuery);
    
    const membersFK = fkResult.rows.filter(row => row.foreign_table_name === 'members');
    const consolidatedFK = fkResult.rows.filter(row => row.foreign_table_name === 'members_consolidated');
    
    console.log('📊 Foreign keys referencing "members" table:', membersFK.length);
    if (membersFK.length > 0) {
      console.table(membersFK);
    }
    console.log('');
    
    console.log('📊 Foreign keys referencing "members_consolidated" table:', consolidatedFK.length);
    console.log('');

    // Test the original failing query
    console.log('🧪 Testing the original failing query (member_id 765751)...\n');
    
    const testQuery = `
      INSERT INTO leadership_appointments (
        position_id, member_id, hierarchy_level, entity_id, appointment_type,
        start_date, end_date, appointed_by, appointment_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id;
    `;
    
    try {
      const testResult = await pool.query(testQuery, [
        2,
        765751,
        'National',
        1,
        'Elected',
        '2024-12-17',
        null,
        1,
        'Test appointment'
      ]);
      
      console.log('✅ Test insert successful! Appointment ID:', testResult.rows[0].id);
      
      // Clean up test data
      await pool.query('DELETE FROM leadership_appointments WHERE id = $1', [testResult.rows[0].id]);
      console.log('✅ Test data cleaned up\n');
    } catch (error) {
      console.error('❌ Test insert failed:', error.message);
    }

    await pool.end();
    console.log('✅ Migration and verification complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

