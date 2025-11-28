/**
 * Fix Remaining Municipality Assignments
 * 
 * This script handles the remaining municipalities that weren't corrected
 * by the main fix script, using a fallback strategy to assign them to
 * appropriate districts within their provinces.
 * 
 * Author: EFF Membership System
 * Date: 2025-01-23
 */

const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Get province code from municipality code
 */
function getProvinceFromMunicipalityCode(municipalityCode) {
  // Handle 3-character prefixes first
  if (municipalityCode.startsWith('KZN')) return 'KZN';
  if (municipalityCode.startsWith('LIM')) return 'LP';
  if (municipalityCode.startsWith('ETH')) return 'KZN';
  
  // Handle metro codes
  const metroMappings = {
    'BUF': 'EC',  // Buffalo City
    'NMA': 'EC',  // Nelson Mandela Bay
    'CPT': 'WC',  // Cape Town
    'JHB': 'GP',  // Johannesburg
    'TSH': 'GP',  // Tshwane
    'EKU': 'GP',  // Ekurhuleni
    'ETH': 'KZN', // eThekwini
    'MAN': 'FS'   // Mangaung
  };
  
  if (metroMappings[municipalityCode]) {
    return metroMappings[municipalityCode];
  }
  
  // Handle 2-character prefixes
  const prefix = municipalityCode.substring(0, 2);
  const provinceMappings = {
    'EC': 'EC',
    'FS': 'FS',
    'GP': 'GP',
    'GT': 'GP',  // Gauteng alternative prefix
    'KZ': 'KZN',
    'LI': 'LP',
    'MP': 'MP',
    'NC': 'NC',
    'NW': 'NW',
    'WC': 'WC'
  };
  
  return provinceMappings[prefix] || null;
}

async function analyzeRemainingIssues() {
  console.log('🔍 Analyzing remaining geographic issues...\n');
  
  try {
    // Check municipalities still in wrong districts
    const wrongAssignments = await pool.query(`
      SELECT 
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        d.district_name,
        d.province_code as district_province,
        LEFT(m.municipality_code, 2) as muni_prefix_2,
        LEFT(m.municipality_code, 3) as muni_prefix_3
      FROM municipalities m
      JOIN districts d ON m.district_code = d.district_code
      WHERE (
        -- 2-character prefix doesn't match province
        (LENGTH(m.municipality_code) >= 2 AND LEFT(m.municipality_code, 2) != d.province_code AND m.municipality_code NOT IN ('BUF', 'NMA', 'CPT', 'JHB', 'TSH', 'EKU', 'ETH', 'MAN'))
        OR
        -- 3-character prefix special cases
        (m.municipality_code LIKE 'KZN%' AND d.province_code != 'KZN')
        OR
        (m.municipality_code LIKE 'LIM%' AND d.province_code != 'LP')
        OR
        (m.municipality_code = 'ETH' AND d.province_code != 'KZN')
      )
      ORDER BY m.municipality_code
    `);
    
    console.log(`📊 Municipalities in wrong districts: ${wrongAssignments.rows.length}`);
    
    if (wrongAssignments.rows.length > 0) {
      console.log('\nWrong assignments by province:');
      const byProvince = {};
      wrongAssignments.rows.forEach(row => {
        const correctProvince = getProvinceFromMunicipalityCode(row.municipality_code);
        if (!byProvince[correctProvince]) byProvince[correctProvince] = 0;
        byProvince[correctProvince]++;
      });
      
      Object.entries(byProvince).forEach(([province, count]) => {
        console.log(`   ${province}: ${count} municipalities`);
      });
    }
    
    return wrongAssignments.rows;
    
  } catch (error) {
    console.error('❌ Error analyzing issues:', error);
    throw error;
  }
}

async function fixRemainingMunicipalities() {
  console.log('🔧 Fixing remaining municipality assignments...\n');
  
  let correctionCount = 0;
  let errorCount = 0;
  const errors = [];
  
  try {
    // Get municipalities that need fixing
    const wrongAssignments = await analyzeRemainingIssues();
    
    for (const municipality of wrongAssignments) {
      const { municipality_code, municipality_name, district_code } = municipality;
      
      // Determine correct province
      const correctProvince = getProvinceFromMunicipalityCode(municipality_code);
      
      if (!correctProvince) {
        const error = `Cannot determine province for ${municipality_code}`;
        console.log(`⚠️  ${error}`);
        errors.push(error);
        errorCount++;
        continue;
      }
      
      try {
        // Find a district in the correct province
        const availableDistricts = await pool.query(`
          SELECT d.district_code, d.district_name,
                 COUNT(m.municipality_id) as current_municipality_count
          FROM districts d
          LEFT JOIN municipalities m ON d.district_code = m.district_code
          WHERE d.province_code = $1 AND d.is_active = TRUE
          GROUP BY d.district_code, d.district_name
          ORDER BY current_municipality_count ASC, d.district_code
        `, [correctProvince]);
        
        if (availableDistricts.rows.length === 0) {
          const error = `No districts found for province ${correctProvince}`;
          console.log(`❌ ${error}`);
          errors.push(error);
          errorCount++;
          continue;
        }
        
        // Use the district with the fewest municipalities (load balancing)
        const targetDistrict = availableDistricts.rows[0];
        
        // Update the municipality
        await pool.query(`
          UPDATE municipalities 
          SET district_code = $1, updated_at = CURRENT_TIMESTAMP
          WHERE municipality_code = $2
        `, [targetDistrict.district_code, municipality_code]);
        
        console.log(`✅ ${municipality_code} (${municipality_name}): ${district_code} → ${targetDistrict.district_code} (${targetDistrict.district_name})`);
        correctionCount++;
        
      } catch (error) {
        const errorMsg = `Failed to update ${municipality_code}: ${error.message}`;
        console.log(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        errorCount++;
      }
    }
    
    console.log(`\n📈 Correction Summary:`);
    console.log(`   ✅ Successfully corrected: ${correctionCount} municipalities`);
    console.log(`   ❌ Errors encountered: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errors:`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    return { correctionCount, errorCount, errors };
    
  } catch (error) {
    console.error('❌ Error during correction process:', error);
    throw error;
  }
}

async function validateFinalState() {
  console.log('🔍 Validating final geographic state...\n');
  
  try {
    // Check Bojanala district
    const bojanalaCheck = await pool.query(`
      SELECT 
        municipality_code,
        municipality_name,
        LEFT(municipality_code, 2) as province_prefix
      FROM municipalities 
      WHERE district_code = 'DC37'
      ORDER BY municipality_code
    `);
    
    const nwCount = bojanalaCheck.rows.filter(m => m.municipality_code.startsWith('NW')).length;
    const otherCount = bojanalaCheck.rows.filter(m => !m.municipality_code.startsWith('NW')).length;
    
    console.log(`📊 Bojanala District (DC37) final state:`);
    console.log(`   ✅ North West municipalities: ${nwCount}`);
    console.log(`   ${otherCount === 0 ? '✅' : '❌'} Other province municipalities: ${otherCount}`);
    
    if (otherCount > 0) {
      console.log('   ⚠️  Still incorrect:');
      bojanalaCheck.rows.filter(m => !m.municipality_code.startsWith('NW')).forEach(m => {
        console.log(`      - ${m.municipality_code}: ${m.municipality_name}`);
      });
    }
    
    // Check for remaining empty districts
    const emptyDistricts = await pool.query(`
      SELECT 
        d.district_code,
        d.district_name,
        d.province_code,
        COUNT(m.municipality_id) as municipality_count
      FROM districts d
      LEFT JOIN municipalities m ON d.district_code = m.district_code
      GROUP BY d.district_code, d.district_name, d.province_code
      HAVING COUNT(m.municipality_id) = 0
      ORDER BY d.province_code, d.district_name
    `);
    
    console.log(`\n🚫 Empty districts remaining: ${emptyDistricts.rows.length}`);
    
    if (emptyDistricts.rows.length > 0) {
      console.log('Empty districts:');
      emptyDistricts.rows.forEach(d => {
        console.log(`   ${d.district_code} - ${d.district_name} (${d.province_code})`);
      });
    }
    
    // Overall province summary
    const provinceSummary = await pool.query(`
      SELECT 
        p.province_code,
        p.province_name,
        COUNT(DISTINCT d.district_code) as districts,
        COUNT(DISTINCT m.municipality_code) as municipalities,
        COUNT(DISTINCT w.ward_code) as wards
      FROM provinces p
      LEFT JOIN districts d ON p.province_code = d.province_code
      LEFT JOIN municipalities m ON d.district_code = m.district_code
      LEFT JOIN wards w ON m.municipality_code = w.municipality_code
      GROUP BY p.province_code, p.province_name
      ORDER BY p.province_name
    `);
    
    console.log('\n🏛️  Final geographic hierarchy:');
    provinceSummary.rows.forEach(p => {
      console.log(`   ${p.province_name}: ${p.districts}D, ${p.municipalities}M, ${p.wards}W`);
    });
    
    return {
      bojanalaCorrect: otherCount === 0,
      emptyDistrictsCount: emptyDistricts.rows.length,
      provinceSummary: provinceSummary.rows
    };
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
    throw error;
  }
}

async function main() {
  console.log('🔧 Fix Remaining Municipality Assignments');
  console.log('========================================\n');
  
  try {
    // Step 1: Analyze remaining issues
    const issues = await analyzeRemainingIssues();
    
    if (issues.length === 0) {
      console.log('✅ No remaining issues found - all municipalities are correctly assigned!');
      return;
    }
    
    // Step 2: Fix remaining municipalities
    const corrections = await fixRemainingMunicipalities();
    
    // Step 3: Validate final state
    const validation = await validateFinalState();
    
    console.log('\n🎉 Remaining Municipality Fix Completed!');
    console.log('======================================');
    console.log(`✅ Additional municipalities corrected: ${corrections.correctionCount}`);
    console.log(`❌ Errors encountered: ${corrections.errorCount}`);
    console.log(`🏛️  Bojanala district correct: ${validation.bojanalaCorrect ? 'YES' : 'NO'}`);
    console.log(`🚫 Empty districts remaining: ${validation.emptyDistrictsCount}`);
    
    if (corrections.errorCount === 0 && validation.bojanalaCorrect && validation.emptyDistrictsCount < 5) {
      console.log('\n✅ SUCCESS: Geographic data integrity has been fully restored!');
    } else if (corrections.correctionCount > 0) {
      console.log('\n✅ IMPROVED: Significant progress made, minor issues may remain.');
    } else {
      console.log('\n⚠️  LIMITED SUCCESS: Some issues persist and may need manual review.');
    }
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  analyzeRemainingIssues,
  fixRemainingMunicipalities,
  validateFinalState,
  getProvinceFromMunicipalityCode
};
