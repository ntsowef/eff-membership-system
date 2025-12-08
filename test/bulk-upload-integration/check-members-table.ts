/**
 * Check Members Table Structure
 * 
 * This script checks what members tables exist and their structure
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkMembersTable() {
  console.log('🔍 Checking members table structure...\n');

  try {
    // Check what tables exist with 'member' in the name
    console.log('📋 Tables with "member" in name:');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%member%'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.log('❌ No tables found with "member" in name');
    } else {
      tablesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    }

    console.log('\n' + '='.repeat(100) + '\n');

    // Check if members_consolidated exists
    const consolidatedExists = tablesResult.rows.some(r => r.table_name === 'members_consolidated');
    
    if (consolidatedExists) {
      console.log('✅ members_consolidated table EXISTS\n');
      
      // Get column details
      const columnsResult = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'members_consolidated'
        ORDER BY ordinal_position
      `);

      console.log('📊 Columns in members_consolidated:');
      columnsResult.rows.forEach((col, index) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
      });

      // Check for constraints
      console.log('\n📋 Constraints:');
      const constraintsResult = await pool.query(`
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'members_consolidated'
        ORDER BY tc.constraint_type, tc.constraint_name
      `);

      constraintsResult.rows.forEach((constraint) => {
        if (constraint.constraint_type === 'FOREIGN KEY') {
          console.log(`   FK: ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
        } else {
          console.log(`   ${constraint.constraint_type}: ${constraint.column_name}`);
        }
      });

    } else {
      console.log('❌ members_consolidated table DOES NOT EXIST\n');
      
      // Check for 'members' table
      const membersExists = tablesResult.rows.some(r => r.table_name === 'members');
      
      if (membersExists) {
        console.log('✅ Found "members" table instead\n');
        
        // Get column details
        const columnsResult = await pool.query(`
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'members'
          ORDER BY ordinal_position
        `);

        console.log('📊 Columns in members:');
        columnsResult.rows.forEach((col, index) => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMembersTable();

