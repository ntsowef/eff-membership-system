/**
 * Diagnose Limpopo Geographic Hierarchy Issues
 * 
 * Investigates district-municipality relationships in Limpopo province
 * to identify incorrect mappings
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
console.log('║   Limpopo Geographic Hierarchy Diagnostic                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function diagnose() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Find Limpopo province code
    console.log('1️⃣  Finding Limpopo province...');
    const limpopoProvince = await client.query(`
      SELECT province_code, province_name
      FROM provinces
      WHERE province_name ILIKE '%limpopo%'
    `);

    if (limpopoProvince.rows.length === 0) {
      console.log('   ❌ Limpopo province not found!');
      client.release();
      await pool.end();
      return;
    }

    const provinceCode = limpopoProvince.rows[0].province_code;
    const provinceName = limpopoProvince.rows[0].province_name;
    console.log(`   ✅ Found: ${provinceName} (${provinceCode})\n`);

    // Get all districts in Limpopo
    console.log('2️⃣  Districts in Limpopo:');
    const districts = await client.query(`
      SELECT 
        district_code,
        district_name,
        province_code
      FROM districts
      WHERE province_code = $1
      ORDER BY district_name
    `, [provinceCode]);

    console.log(`   Total districts: ${districts.rows.length}\n`);
    districts.rows.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.district_name} (${d.district_code})`);
    });
    console.log('');

    // Get all municipalities in Limpopo
    console.log('3️⃣  Municipalities in Limpopo:');
    const municipalities = await client.query(`
      SELECT 
        mu.municipality_code,
        mu.municipality_name,
        mu.municipality_type,
        mu.district_code,
        d.district_name,
        mu.parent_municipality_id,
        parent_mu.municipality_name as parent_municipality_name
      FROM municipalities mu
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN municipalities parent_mu ON mu.parent_municipality_id = parent_mu.municipality_id
      WHERE d.province_code = $1
      ORDER BY d.district_name, mu.municipality_name
    `, [provinceCode]);

    console.log(`   Total municipalities: ${municipalities.rows.length}\n`);

    // Group by district
    const byDistrict = {};
    municipalities.rows.forEach(mu => {
      const districtName = mu.district_name || 'NO DISTRICT';
      if (!byDistrict[districtName]) {
        byDistrict[districtName] = [];
      }
      byDistrict[districtName].push(mu);
    });

    Object.keys(byDistrict).sort().forEach(districtName => {
      console.log(`   📍 ${districtName}:`);
      byDistrict[districtName].forEach(mu => {
        const type = mu.municipality_type || 'Unknown';
        const parent = mu.parent_municipality_name ? ` (Parent: ${mu.parent_municipality_name})` : '';
        console.log(`      - ${mu.municipality_name} [${type}]${parent}`);
      });
      console.log('');
    });

    // Check for potential issues
    console.log('4️⃣  Checking for potential issues...\n');

    // Issue 1: Municipalities with no district
    const noDistrict = await client.query(`
      SELECT 
        mu.municipality_code,
        mu.municipality_name,
        mu.municipality_type
      FROM municipalities mu
      LEFT JOIN districts d ON mu.district_code = d.district_code
      WHERE mu.district_code IS NULL
      OR d.province_code = $1
      ORDER BY mu.municipality_name
    `, [provinceCode]);

    if (noDistrict.rows.some(m => !m.district_code)) {
      console.log('   ⚠️  Municipalities with no district assignment:');
      noDistrict.rows.filter(m => !m.district_code).forEach(mu => {
        console.log(`      - ${mu.municipality_name} (${mu.municipality_code})`);
      });
      console.log('');
    }

    // Issue 2: Check member distribution
    console.log('5️⃣  Member distribution by district in Limpopo:');
    const memberDistribution = await client.query(`
      SELECT 
        d.district_name,
        mu.municipality_name,
        COUNT(m.member_id) as member_count
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      WHERE d.province_code = $1
      GROUP BY d.district_name, mu.municipality_name
      ORDER BY d.district_name, member_count DESC
    `, [provinceCode]);

    const membersByDistrict = {};
    memberDistribution.rows.forEach(row => {
      const districtName = row.district_name || 'NO DISTRICT';
      if (!membersByDistrict[districtName]) {
        membersByDistrict[districtName] = { total: 0, municipalities: [] };
      }
      membersByDistrict[districtName].total += parseInt(row.member_count);
      membersByDistrict[districtName].municipalities.push({
        name: row.municipality_name,
        count: row.member_count
      });
    });

    Object.keys(membersByDistrict).sort().forEach(districtName => {
      const data = membersByDistrict[districtName];
      console.log(`\n   📍 ${districtName}: ${data.total} members`);
      data.municipalities.forEach(mu => {
        console.log(`      - ${mu.name}: ${mu.count} members`);
      });
    });
    console.log('');

    // Issue 3: Check official Limpopo district structure
    console.log('6️⃣  Official Limpopo District Structure:\n');
    console.log('   According to South African municipal demarcation:\n');
    console.log('   1. Capricorn District (DC35)');
    console.log('      - Blouberg (LIM331)');
    console.log('      - Molemole (LIM332)');
    console.log('      - Aganang (LIM333)');
    console.log('      - Polokwane (LIM351)');
    console.log('      - Lepelle-Nkumpi (LIM353)');
    console.log('');
    console.log('   2. Mopani District (DC33)');
    console.log('      - Greater Giyani (LIM331)');
    console.log('      - Greater Letaba (LIM332)');
    console.log('      - Greater Tzaneen (LIM333)');
    console.log('      - Ba-Phalaborwa (LIM334)');
    console.log('      - Maruleng (LIM335)');
    console.log('');
    console.log('   3. Sekhukhune District (DC47)');
    console.log('      - Elias Motsoaledi (LIM471)');
    console.log('      - Makhuduthamaga (LIM472)');
    console.log('      - Fetakgomo Tubatse (LIM473)');
    console.log('      - Ephraim Mogale (LIM474)');
    console.log('');
    console.log('   4. Vhembe District (DC34)');
    console.log('      - Musina (LIM341)');
    console.log('      - Mutale (LIM342)');
    console.log('      - Thulamela (LIM343)');
    console.log('      - Makhado (LIM344)');
    console.log('      - Collins Chabane (LIM345)');
    console.log('');
    console.log('   5. Waterberg District (DC36)');
    console.log('      - Bela-Bela (LIM361)');
    console.log('      - Modimolle-Mookgophong (LIM362)');
    console.log('      - Mogalakwena (LIM364)');
    console.log('      - Lephalale (LIM366)');
    console.log('      - Thabazimbi (LIM367)');
    console.log('');

    // Compare with actual data
    console.log('7️⃣  Comparing actual data with official structure...\n');
    
    const comparisonQuery = await client.query(`
      SELECT 
        d.district_code,
        d.district_name,
        mu.municipality_code,
        mu.municipality_name,
        COUNT(m.member_id) as member_count
      FROM districts d
      LEFT JOIN municipalities mu ON d.district_code = mu.district_code
      LEFT JOIN wards w ON mu.municipality_code = w.municipality_code
      LEFT JOIN members m ON w.ward_code = m.ward_code
      WHERE d.province_code = $1
      GROUP BY d.district_code, d.district_name, mu.municipality_code, mu.municipality_name
      ORDER BY d.district_name, mu.municipality_name
    `, [provinceCode]);

    const actualStructure = {};
    comparisonQuery.rows.forEach(row => {
      const key = `${row.district_name} (${row.district_code})`;
      if (!actualStructure[key]) {
        actualStructure[key] = [];
      }
      if (row.municipality_name) {
        actualStructure[key].push({
          code: row.municipality_code,
          name: row.municipality_name,
          members: row.member_count
        });
      }
    });

    console.log('   Actual structure in database:\n');
    Object.keys(actualStructure).sort().forEach(district => {
      console.log(`   ${district}:`);
      actualStructure[district].forEach(mu => {
        console.log(`      - ${mu.name} (${mu.code}) - ${mu.members} members`);
      });
      console.log('');
    });

    client.release();

    // Summary
    console.log('═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`Province: ${provinceName} (${provinceCode})`);
    console.log(`Districts: ${districts.rows.length}`);
    console.log(`Municipalities: ${municipalities.rows.length}`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Review the comparison between official and actual structure');
    console.log('   2. Identify municipalities in wrong districts');
    console.log('   3. Create fix script to correct the mappings');
    console.log('   4. Verify impact on views and birthday SMS system');
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

