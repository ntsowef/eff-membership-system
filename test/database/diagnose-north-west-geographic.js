/**
 * Diagnostic Script: North West Province Geographic Data
 * 
 * This script checks for data integrity issues with North West province
 * in the geographic hierarchy tables.
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.postgres') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'ChangeThis!SuperSecure123',
  database: process.env.DB_NAME || 'eff_membership_db',
});

async function diagnoseNorthWest() {
  const client = await pool.connect();
  
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   North West Province Geographic Data Diagnostic          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Check if North West province exists
    console.log('1️⃣  Checking North West Province...');
    const provinceQuery = `
      SELECT province_code, province_name, is_active
      FROM provinces
      WHERE province_name ILIKE '%north%west%' OR province_code = 'NW'
    `;
    const provinces = await client.query(provinceQuery);
    console.log('   Found provinces:', provinces.rows);
    
    if (provinces.rows.length === 0) {
      console.log('   ❌ ERROR: North West province not found!\n');
      return;
    }
    
    const nwProvince = provinces.rows[0];
    console.log(`   ✅ Found: ${nwProvince.province_name} (${nwProvince.province_code})`);
    console.log(`   Active: ${nwProvince.is_active}\n`);

    // 2. Check districts for North West
    console.log('2️⃣  Checking Districts in North West...');
    const districtQuery = `
      SELECT 
        d.district_code,
        d.district_name,
        d.province_code,
        d.is_active,
        COUNT(m.municipality_id) as municipality_count
      FROM districts d
      LEFT JOIN municipalities m ON d.district_code = m.district_code
      WHERE d.province_code = $1
      GROUP BY d.district_code, d.district_name, d.province_code, d.is_active
      ORDER BY d.district_name
    `;
    const districts = await client.query(districtQuery, [nwProvince.province_code]);
    
    if (districts.rows.length === 0) {
      console.log('   ❌ ERROR: No districts found for North West!\n');
    } else {
      console.log(`   ✅ Found ${districts.rows.length} districts:`);
      districts.rows.forEach(d => {
        console.log(`      - ${d.district_name} (${d.district_code})`);
        console.log(`        Active: ${d.is_active}, Municipalities: ${d.municipality_count}`);
      });
      console.log('');
    }

    // 3. Check municipalities for North West
    console.log('3️⃣  Checking Municipalities in North West...');
    const municipalityQuery = `
      SELECT 
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        m.municipality_type,
        m.is_active,
        d.district_name,
        d.province_code,
        COUNT(w.ward_id) as ward_count
      FROM municipalities m
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN wards w ON m.municipality_code = w.municipality_code
      WHERE d.province_code = $1
      GROUP BY m.municipality_code, m.municipality_name, m.district_code, 
               m.municipality_type, m.is_active, d.district_name, d.province_code
      ORDER BY d.district_name, m.municipality_name
    `;
    const municipalities = await client.query(municipalityQuery, [nwProvince.province_code]);
    
    if (municipalities.rows.length === 0) {
      console.log('   ❌ ERROR: No municipalities found for North West!\n');
    } else {
      console.log(`   ✅ Found ${municipalities.rows.length} municipalities:`);
      
      // Group by district
      const byDistrict = {};
      municipalities.rows.forEach(m => {
        if (!byDistrict[m.district_name]) {
          byDistrict[m.district_name] = [];
        }
        byDistrict[m.district_name].push(m);
      });
      
      Object.keys(byDistrict).forEach(districtName => {
        console.log(`\n      District: ${districtName}`);
        byDistrict[districtName].forEach(m => {
          console.log(`        - ${m.municipality_name} (${m.municipality_code})`);
          console.log(`          Type: ${m.municipality_type}, Active: ${m.is_active}, Wards: ${m.ward_count}`);
        });
      });
      console.log('');
    }

    // 4. Check for NULL or invalid province_code in districts
    console.log('4️⃣  Checking for Data Integrity Issues...');
    const integrityQuery = `
      SELECT 
        'Districts with NULL province_code' as issue,
        COUNT(*) as count
      FROM districts
      WHERE province_code IS NULL
      
      UNION ALL
      
      SELECT 
        'Districts with invalid province_code' as issue,
        COUNT(*) as count
      FROM districts d
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE p.province_code IS NULL AND d.province_code IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'Municipalities with NULL district_code' as issue,
        COUNT(*) as count
      FROM municipalities
      WHERE district_code IS NULL
      
      UNION ALL
      
      SELECT 
        'Municipalities with invalid district_code' as issue,
        COUNT(*) as count
      FROM municipalities m
      LEFT JOIN districts d ON m.district_code = d.district_code
      WHERE d.district_code IS NULL AND m.district_code IS NOT NULL
    `;
    const integrity = await client.query(integrityQuery);
    
    let hasIssues = false;
    integrity.rows.forEach(row => {
      if (row.count > 0) {
        console.log(`   ❌ ${row.issue}: ${row.count}`);
        hasIssues = true;
      }
    });
    
    if (!hasIssues) {
      console.log('   ✅ No data integrity issues found\n');
    } else {
      console.log('');
    }

    // 5. Test the actual API query
    console.log('5️⃣  Testing API Query (stats/districts)...');
    const apiQuery = `
      SELECT
        d.district_code,
        d.district_name,
        COALESCE(
          -- Direct members assigned to municipalities in this district
          (SELECT COUNT(DISTINCT m1.member_id)
           FROM municipalities mu1
           JOIN vw_member_details m1 ON mu1.municipality_code = m1.municipality_code
           WHERE mu1.district_code = d.district_code
             AND mu1.municipality_type != 'Metro Sub-Region')
          +
          -- Members assigned to metro subregions in this district
          (SELECT COUNT(DISTINCT m2.member_id)
           FROM municipalities mu2
           JOIN municipalities sub ON sub.parent_municipality_id = mu2.municipality_id
           JOIN vw_member_details m2 ON sub.municipality_code = m2.municipality_code
           WHERE mu2.district_code = d.district_code
             AND mu2.municipality_type = 'Metropolitan')
        , 0) as member_count
      FROM districts d
      WHERE d.province_code = $1
      GROUP BY d.district_code, d.district_name
      ORDER BY member_count DESC
    `;
    
    const apiResult = await client.query(apiQuery, [nwProvince.province_code]);
    
    if (apiResult.rows.length === 0) {
      console.log('   ❌ API Query returned NO results!\n');
    } else {
      console.log(`   ✅ API Query returned ${apiResult.rows.length} districts:`);
      apiResult.rows.forEach(d => {
        console.log(`      - ${d.district_name} (${d.district_code}): ${d.member_count} members`);
      });
      console.log('');
    }

    // 6. Compare with other provinces
    console.log('6️⃣  Comparing with Other Provinces...');
    const comparisonQuery = `
      SELECT 
        p.province_code,
        p.province_name,
        COUNT(DISTINCT d.district_code) as district_count,
        COUNT(DISTINCT m.municipality_code) as municipality_count
      FROM provinces p
      LEFT JOIN districts d ON p.province_code = d.province_code
      LEFT JOIN municipalities m ON d.district_code = m.district_code
      GROUP BY p.province_code, p.province_name
      ORDER BY p.province_name
    `;
    const comparison = await client.query(comparisonQuery);
    
    console.log('   Province Summary:');
    comparison.rows.forEach(p => {
      const marker = p.province_code === nwProvince.province_code ? '👉' : '  ';
      console.log(`   ${marker} ${p.province_name} (${p.province_code}): ${p.district_count} districts, ${p.municipality_count} municipalities`);
    });
    console.log('');

    // Summary
    console.log('═'.repeat(60));
    console.log('SUMMARY:');
    console.log('═'.repeat(60));
    
    if (districts.rows.length === 0) {
      console.log('❌ ISSUE FOUND: North West has NO districts in the database');
      console.log('   → This explains why the dropdown is empty');
      console.log('   → Need to insert district data for North West province');
    } else if (municipalities.rows.length === 0) {
      console.log('⚠️  WARNING: North West has districts but NO municipalities');
      console.log('   → Districts will show but municipalities won\'t');
    } else {
      console.log('✅ North West province has complete geographic data');
      console.log(`   → ${districts.rows.length} districts`);
      console.log(`   → ${municipalities.rows.length} municipalities`);
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the diagnostic
diagnoseNorthWest().catch(console.error);

