/**
 * Check VD Code Length in Database
 * 
 * This script checks the actual length of voting district codes in the database
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkVDCodeLength() {
  try {
    console.log('🔍 Checking VD code lengths in database...\n');

    // Check voting_districts table
    const vdQuery = `
      SELECT 
        LENGTH(voting_district_code) as code_length,
        COUNT(*) as count,
        MIN(voting_district_code) as example
      FROM voting_districts
      WHERE voting_district_code IS NOT NULL
      GROUP BY LENGTH(voting_district_code)
      ORDER BY code_length
    `;

    const vdResult = await pool.query(vdQuery);
    
    console.log('📊 Voting Districts Table:');
    console.log('   Code Length | Count | Example');
    console.log('   ------------|-------|--------');
    vdResult.rows.forEach(row => {
      console.log(`   ${row.code_length.toString().padEnd(11)} | ${row.count.toString().padEnd(5)} | ${row.example}`);
    });

    // Check for special codes
    console.log('\n🔍 Checking for special VD codes...\n');
    
    const specialCodes = ['22222222', '99999999', '222222222', '999999999'];
    
    for (const code of specialCodes) {
      const checkQuery = `
        SELECT voting_district_code, voting_district_name
        FROM voting_districts
        WHERE voting_district_code = $1
      `;
      const result = await pool.query(checkQuery, [code]);
      
      if (result.rows.length > 0) {
        console.log(`   ✅ ${code} (${code.length} digits) EXISTS: ${result.rows[0].voting_district_name}`);
      } else {
        console.log(`   ❌ ${code} (${code.length} digits) NOT FOUND`);
      }
    }

    await pool.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkVDCodeLength();

