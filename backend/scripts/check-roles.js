/**
 * Script to check what roles exist in the database
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
});

async function checkRoles() {
  const client = await pool.connect();
  
  try {
    console.log('\n📋 Checking roles in database...\n');

    // Check roles table
    const rolesResult = await client.query(`
      SELECT role_id, role_name, role_code, description, is_active 
      FROM roles 
      ORDER BY role_id
    `);

    if (rolesResult.rows.length === 0) {
      console.log('❌ No roles found in the database!');
    } else {
      console.log(`✅ Found ${rolesResult.rows.length} roles:\n`);
      rolesResult.rows.forEach(role => {
        console.log(`   ID: ${role.role_id}`);
        console.log(`   Name: ${role.role_name}`);
        console.log(`   Code: ${role.role_code}`);
        console.log(`   Description: ${role.description || 'N/A'}`);
        console.log(`   Active: ${role.is_active}`);
        console.log('   ---');
      });
    }

    // Also check if there's a 'name' column (legacy)
    console.log('\n📋 Checking for legacy "name" column...\n');
    try {
      const legacyResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'roles' 
        AND column_name = 'name'
      `);
      
      if (legacyResult.rows.length > 0) {
        console.log('⚠️  Legacy "name" column exists!');
        
        const nameResult = await client.query(`
          SELECT role_id, name, role_name 
          FROM roles 
          ORDER BY role_id
        `);
        
        console.log('\nLegacy name values:');
        nameResult.rows.forEach(role => {
          console.log(`   ID ${role.role_id}: name="${role.name}", role_name="${role.role_name}"`);
        });
      } else {
        console.log('✅ No legacy "name" column found');
      }
    } catch (err) {
      console.log('ℹ️  Could not check for legacy column:', err.message);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkRoles();

