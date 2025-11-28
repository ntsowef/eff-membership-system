/**
 * Diagnose Member Selector Issue
 * 
 * Investigates why only a few members show in the leadership assignment selector for Gauteng
 */

require('dotenv').config({ path: '.env.postgres' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Diagnose Member Selector Issue - Gauteng Province       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function diagnose() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Get Gauteng province info
    console.log('1️⃣  Gauteng Province Information:\n');
    
    const gautengInfo = await client.query(`
      SELECT 
        province_id,
        province_code,
        province_name
      FROM provinces
      WHERE province_code = 'GT' OR province_name ILIKE '%gauteng%'
    `);

    if (gautengInfo.rows.length === 0) {
      console.log('   ⚠️  Gauteng province not found!\n');
      client.release();
      await pool.end();
      return;
    }

    const gauteng = gautengInfo.rows[0];
    console.log(`   Province: ${gauteng.province_name} (${gauteng.province_code})`);
    console.log(`   Province ID: ${gauteng.province_id}\n`);

    // Step 2: Count total members in Gauteng
    console.log('2️⃣  Total Members in Gauteng:\n');
    
    const totalMembersQuery = await client.query(`
      SELECT COUNT(*) as total
      FROM vw_member_details
      WHERE province_code = $1
    `, [gauteng.province_code]);

    const totalMembers = parseInt(totalMembersQuery.rows[0].total);
    console.log(`   Total members: ${totalMembers.toLocaleString()}\n`);

    // Step 3: Test the leadership eligible members query (Province level)
    console.log('3️⃣  Leadership Eligible Members Query (Province Level):\n');
    
    const eligibleQuery = `
      SELECT COUNT(*) as total
      FROM vw_member_details m
      WHERE m.member_id IS NOT NULL
      AND m.province_code = (SELECT province_code FROM provinces WHERE province_id = $1)
    `;

    const eligibleResult = await client.query(eligibleQuery, [gauteng.province_id]);
    const eligibleCount = parseInt(eligibleResult.rows[0].total);
    
    console.log(`   Eligible members (using province_id): ${eligibleCount.toLocaleString()}`);
    console.log(`   Expected: ${totalMembers.toLocaleString()}`);
    
    if (eligibleCount === totalMembers) {
      console.log(`   ✅ Counts match!\n`);
    } else {
      console.log(`   ❌ Mismatch: ${Math.abs(eligibleCount - totalMembers)} members difference\n`);
    }

    // Step 4: Check metropolitan municipalities in Gauteng
    console.log('4️⃣  Metropolitan Municipalities in Gauteng:\n');
    
    const metrosQuery = await client.query(`
      SELECT 
        m.municipality_id,
        m.municipality_code,
        m.municipality_name,
        m.municipality_type,
        COUNT(sm.municipality_id) as subregion_count,
        COUNT(DISTINCT mem.member_id) as total_members
      FROM municipalities m
      LEFT JOIN municipalities sm ON sm.parent_municipality_id = m.municipality_id
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN wards w ON w.municipality_code = m.municipality_code OR w.municipality_code = sm.municipality_code
      LEFT JOIN members mem ON mem.ward_code = w.ward_code
      WHERE d.province_code = $1
      AND m.municipality_type = 'Metropolitan'
      GROUP BY m.municipality_id, m.municipality_code, m.municipality_name, m.municipality_type
      ORDER BY total_members DESC
    `, [gauteng.province_code]);

    if (metrosQuery.rows.length > 0) {
      console.log(`   Found ${metrosQuery.rows.length} metropolitan municipalities:\n`);
      metrosQuery.rows.forEach(metro => {
        console.log(`   📍 ${metro.municipality_name} (${metro.municipality_code})`);
        console.log(`      Sub-regions: ${metro.subregion_count}`);
        console.log(`      Total members: ${parseInt(metro.total_members).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('   No metropolitan municipalities found in Gauteng\n');
    }

    // Step 5: Check if there are any filters that might reduce member count
    console.log('5️⃣  Potential Filtering Issues:\n');
    
    // Check for members with NULL values
    const nullCheckQuery = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE member_id IS NULL) as null_member_id,
        COUNT(*) FILTER (WHERE firstname IS NULL OR firstname = '') as null_firstname,
        COUNT(*) FILTER (WHERE surname IS NULL OR surname = '') as null_surname,
        COUNT(*) FILTER (WHERE province_code IS NULL OR province_code = '') as null_province,
        COUNT(*) as total
      FROM vw_member_details
      WHERE province_code = $1
    `, [gauteng.province_code]);

    const nullCheck = nullCheckQuery.rows[0];
    console.log(`   Members with NULL member_id: ${nullCheck.null_member_id}`);
    console.log(`   Members with NULL firstname: ${nullCheck.null_firstname}`);
    console.log(`   Members with NULL surname: ${nullCheck.null_surname}`);
    console.log(`   Members with NULL province: ${nullCheck.null_province}`);
    console.log(`   Total members checked: ${nullCheck.total}\n`);

    // Step 6: Simulate the actual API call with pagination
    console.log('6️⃣  Simulating API Call with Pagination:\n');
    
    const page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const paginatedQuery = `
      SELECT
        m.member_id,
        m.firstname,
        m.surname,
        m.province_code,
        m.province_name,
        m.municipality_code,
        m.municipality_name
      FROM vw_member_details m
      WHERE m.member_id IS NOT NULL
      AND m.province_code = (SELECT province_code FROM provinces WHERE province_id = $1)
      ORDER BY m.firstname, m.surname
      LIMIT $2 OFFSET $3
    `;

    const paginatedResult = await client.query(paginatedQuery, [gauteng.province_id, limit, offset]);
    
    console.log(`   Page: ${page}`);
    console.log(`   Limit: ${limit}`);
    console.log(`   Offset: ${offset}`);
    console.log(`   Members returned: ${paginatedResult.rows.length}\n`);
    
    if (paginatedResult.rows.length > 0) {
      console.log(`   Sample members:\n`);
      paginatedResult.rows.slice(0, 5).forEach(member => {
        console.log(`      ${member.firstname} ${member.surname} - ${member.municipality_name}`);
      });
      console.log('');
    }

    // Step 7: Check the count query (the one that might be broken)
    console.log('7️⃣  Testing Count Query (Pagination Total):\n');
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vw_member_details m
      WHERE m.member_id IS NOT NULL
      AND m.province_code = (SELECT province_code FROM provinces WHERE province_id = $1)
    `;

    const countResult = await client.query(countQuery, [gauteng.province_id]);
    const countTotal = parseInt(countResult.rows[0].total);
    
    console.log(`   Count query result: ${countTotal.toLocaleString()}`);
    console.log(`   Expected: ${totalMembers.toLocaleString()}`);
    
    if (countTotal === totalMembers) {
      console.log(`   ✅ Count query is correct!\n`);
    } else {
      console.log(`   ❌ Count query mismatch: ${Math.abs(countTotal - totalMembers)} members difference\n`);
    }

    client.release();

    // Summary
    console.log('═'.repeat(60));
    console.log('DIAGNOSTIC SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`📊 Gauteng Province: ${gauteng.province_name} (${gauteng.province_code})`);
    console.log(`   Province ID: ${gauteng.province_id}`);
    console.log(`   Total Members: ${totalMembers.toLocaleString()}`);
    console.log('');
    console.log('🔍 Key Findings:');
    console.log(`   1. Total members in Gauteng: ${totalMembers.toLocaleString()}`);
    console.log(`   2. Eligible members (Province filter): ${eligibleCount.toLocaleString()}`);
    console.log(`   3. Metropolitan municipalities: ${metrosQuery.rows.length}`);
    console.log(`   4. Pagination working: ${paginatedResult.rows.length > 0 ? 'Yes' : 'No'}`);
    console.log('');
    console.log('💡 Possible Issues:');
    console.log('   1. Frontend might be using wrong API endpoint');
    console.log('   2. Frontend might have additional client-side filters');
    console.log('   3. Geographic selection might not be passing province_id correctly');
    console.log('   4. Pagination might be showing only first page (10 members)');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Check frontend console logs for API calls');
    console.log('   2. Verify which API endpoint is being called');
    console.log('   3. Check if hierarchy_level and entity_id are being passed');
    console.log('   4. Verify pagination total is displayed correctly in UI');
    console.log('');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

diagnose();

