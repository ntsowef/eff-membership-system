/**
 * Diagnose Leadership Assignment Sub-Region Issue
 * 
 * Investigates why selecting leaders from sub-regions (local municipalities) fails
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
console.log('║   Leadership Assignment Sub-Region Issue Diagnostic        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function diagnose() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Test Case 1: Check municipalities with parent-child relationships
    console.log('1️⃣  Municipalities with Parent-Child Relationships:\n');
    
    const metroMunicipalities = await client.query(`
      SELECT 
        m.municipality_id,
        m.municipality_code,
        m.municipality_name,
        m.municipality_type,
        m.parent_municipality_id,
        pm.municipality_code as parent_code,
        pm.municipality_name as parent_name,
        d.district_name,
        p.province_name
      FROM municipalities m
      LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE m.parent_municipality_id IS NOT NULL
      ORDER BY pm.municipality_name, m.municipality_name
      LIMIT 20
    `);

    if (metroMunicipalities.rows.length > 0) {
      console.log(`   Found ${metroMunicipalities.rows.length} sub-regions with parent municipalities:\n`);
      metroMunicipalities.rows.forEach(mu => {
        console.log(`   📍 ${mu.municipality_name} (${mu.municipality_code})`);
        console.log(`      Parent: ${mu.parent_name} (${mu.parent_code})`);
        console.log(`      Type: ${mu.municipality_type}`);
        console.log(`      Province: ${mu.province_name || 'Not set'}`);
        console.log('');
      });
    } else {
      console.log('   No sub-regions with parent municipalities found\n');
    }

    // Test Case 2: Check member distribution in sub-regions
    console.log('2️⃣  Member Distribution in Sub-Regions:\n');
    
    const memberDistribution = await client.query(`
      SELECT 
        m.municipality_code,
        m.municipality_name,
        m.municipality_type,
        pm.municipality_code as parent_code,
        pm.municipality_name as parent_name,
        COUNT(DISTINCT mem.member_id) as member_count
      FROM municipalities m
      LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
      LEFT JOIN wards w ON w.municipality_code = m.municipality_code
      LEFT JOIN members mem ON mem.ward_code = w.ward_code
      WHERE m.parent_municipality_id IS NOT NULL
      GROUP BY m.municipality_code, m.municipality_name, m.municipality_type, pm.municipality_code, pm.municipality_name
      HAVING COUNT(DISTINCT mem.member_id) > 0
      ORDER BY member_count DESC
      LIMIT 10
    `);

    if (memberDistribution.rows.length > 0) {
      console.log(`   Top 10 sub-regions by member count:\n`);
      memberDistribution.rows.forEach(mu => {
        console.log(`   ${mu.municipality_name} (${mu.municipality_code}): ${mu.member_count} members`);
        console.log(`      Parent: ${mu.parent_name} (${mu.parent_code})`);
        console.log('');
      });
    } else {
      console.log('   No members found in sub-regions\n');
    }

    // Test Case 3: Simulate current leadership filtering logic
    console.log('3️⃣  Testing Current Leadership Filtering Logic:\n');

    // Pick a sub-region with members
    if (memberDistribution.rows.length > 0) {
      const testMunicipality = memberDistribution.rows[0];

      // Get municipality_id for the test municipality
      const muIdResult = await client.query(
        'SELECT municipality_id FROM municipalities WHERE municipality_code = $1',
        [testMunicipality.municipality_code]
      );

      if (muIdResult.rows.length === 0) {
        console.log(`   ⚠️  Could not find municipality_id for ${testMunicipality.municipality_code}\n`);
      } else {
        const municipalityId = muIdResult.rows[0].municipality_id;

        console.log(`   Testing with: ${testMunicipality.municipality_name} (${testMunicipality.municipality_code})`);
        console.log(`   Municipality ID: ${municipalityId}`);
        console.log(`   Expected members: ${testMunicipality.member_count}\n`);

        // Current logic (BROKEN)
        const currentLogicQuery = `
          SELECT COUNT(*) as count
          FROM vw_member_details m
          WHERE m.municipality_code = (
            SELECT municipality_code
            FROM municipalities
            WHERE municipality_id = $1
          )
        `;

        const currentResult = await client.query(currentLogicQuery, [municipalityId]);
        console.log(`   ❌ Current Logic Result: ${currentResult.rows[0].count} members`);
        console.log(`      (Uses simple equality: m.municipality_code = selected_municipality_code)\n`);

        // Fixed logic (CORRECT)
        const fixedLogicQuery = `
          SELECT COUNT(*) as count
          FROM vw_member_details m
          WHERE m.municipality_code IN (
            -- Include the selected municipality
            SELECT municipality_code FROM municipalities WHERE municipality_id = $1
            UNION
            -- Include all sub-regions if this is a parent municipality
            SELECT municipality_code FROM municipalities WHERE parent_municipality_id = $1
          )
        `;

        const fixedResult = await client.query(fixedLogicQuery, [municipalityId]);
        console.log(`   ✅ Fixed Logic Result: ${fixedResult.rows[0].count} members`);
        console.log(`      (Includes parent and all sub-regions)\n`);

        if (currentResult.rows[0].count !== fixedResult.rows[0].count) {
          console.log(`   ⚠️  ISSUE CONFIRMED: Current logic misses ${fixedResult.rows[0].count - currentResult.rows[0].count} members!\n`);
        } else {
          console.log(`   ✅ Both methods return same count (${currentResult.rows[0].count} members)\n`);
        }
      }
    }

    // Test Case 4: Check vw_member_details structure
    console.log('4️⃣  Checking vw_member_details Structure:\n');
    
    const viewColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'vw_member_details'
      AND column_name IN ('municipality_code', 'municipality_name', 'municipality_type', 'ward_code', 'district_code', 'province_code')
      ORDER BY ordinal_position
    `);

    console.log('   Geographic columns in vw_member_details:');
    viewColumns.rows.forEach(col => {
      console.log(`      - ${col.column_name} (${col.data_type})`);
    });
    console.log('');

    // Test Case 5: Sample members from sub-regions
    console.log('5️⃣  Sample Members from Sub-Regions:\n');
    
    const sampleMembers = await client.query(`
      SELECT 
        m.member_id,
        m.firstname,
        m.surname,
        m.municipality_code,
        m.municipality_name,
        m.municipality_type,
        mu.parent_municipality_id,
        pm.municipality_name as parent_municipality_name
      FROM vw_member_details m
      LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      WHERE mu.parent_municipality_id IS NOT NULL
      LIMIT 10
    `);

    if (sampleMembers.rows.length > 0) {
      console.log(`   Sample members in sub-regions:\n`);
      sampleMembers.rows.forEach(mem => {
        console.log(`   ${mem.firstname} ${mem.surname}`);
        console.log(`      Sub-Region: ${mem.municipality_name} (${mem.municipality_code})`);
        console.log(`      Parent: ${mem.parent_municipality_name || 'None'}`);
        console.log('');
      });
    } else {
      console.log('   No members found in sub-regions\n');
    }

    // Test Case 6: Check leadership appointments in sub-regions
    console.log('6️⃣  Leadership Appointments in Sub-Regions:\n');
    
    const subregionAppointments = await client.query(`
      SELECT 
        la.id,
        la.hierarchy_level,
        la.entity_id,
        m.firstname || ' ' || m.surname as member_name,
        mu.municipality_name,
        mu.municipality_type,
        pm.municipality_name as parent_municipality_name
      FROM leadership_appointments la
      JOIN members m ON la.member_id = m.member_id
      LEFT JOIN municipalities mu ON la.entity_id = mu.municipality_id AND la.hierarchy_level = 'Municipality'
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      WHERE la.hierarchy_level = 'Municipality'
      AND mu.parent_municipality_id IS NOT NULL
      AND la.appointment_status = 'Active'
      LIMIT 10
    `);

    if (subregionAppointments.rows.length > 0) {
      console.log(`   Found ${subregionAppointments.rows.length} active appointments in sub-regions:\n`);
      subregionAppointments.rows.forEach(appt => {
        console.log(`   ${appt.member_name}`);
        console.log(`      Sub-Region: ${appt.municipality_name}`);
        console.log(`      Parent: ${appt.parent_municipality_name}`);
        console.log('');
      });
    } else {
      console.log('   No active leadership appointments in sub-regions\n');
    }

    client.release();

    // Summary
    console.log('═'.repeat(60));
    console.log('DIAGNOSTIC SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    console.log('🔍 Issue Identified:');
    console.log('   The leadership assignment filtering uses simple equality:');
    console.log('   WHERE m.municipality_code = (SELECT municipality_code FROM municipalities WHERE municipality_id = ?)');
    console.log('');
    console.log('   This FAILS for sub-regions because:');
    console.log('   1. Members are in sub-regions with their own municipality_code');
    console.log('   2. The filter only matches exact municipality_code');
    console.log('   3. Parent-child relationships are not considered');
    console.log('');
    console.log('✅ Solution:');
    console.log('   Update the filtering logic to include:');
    console.log('   1. The selected municipality itself');
    console.log('   2. All sub-regions if the selected municipality is a parent');
    console.log('   3. The parent municipality if the selected municipality is a sub-region');
    console.log('');
    console.log('📋 Files to Fix:');
    console.log('   - backend/src/services/leadershipService.ts (getEligibleLeadershipMembers)');
    console.log('   - Any other code that filters members by municipality for leadership');
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

