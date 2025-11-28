/**
 * Geographic Data Integrity Fix Script
 * 
 * This script fixes the critical data integrity issue where municipalities
 * from various provinces are incorrectly linked to the Bojanala district (DC37)
 * in North West province.
 * 
 * Problem: 94 municipalities incorrectly assigned to DC37, only 5 should be there
 * Solution: Reassign municipalities to correct districts based on province codes
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
 * Municipality to District mapping based on South African municipal codes
 * This mapping is based on official South African municipal demarcation
 */
const MUNICIPALITY_DISTRICT_MAPPING = {
  // Eastern Cape (EC)
  'EC': {
    'EC101': 'DC10', // Sarah Baartman
    'EC102': 'DC10', 
    'EC103': 'DC10',
    'EC104': 'DC10', // Makana
    'EC105': 'DC10',
    'EC106': 'DC10',
    'EC107': 'DC10',
    'EC108': 'DC10', // Kouga
    'EC109': 'DC10',
    'EC121': 'DC12', // Amathole
    'EC122': 'DC12',
    'EC123': 'DC12',
    'EC124': 'DC12', // Amahlathi
    'EC125': 'DC12',
    'EC126': 'DC12',
    'EC127': 'DC12',
    'EC128': 'DC12',
    'EC131': 'DC13', // Chris Hani
    'EC132': 'DC13',
    'EC133': 'DC13',
    'EC134': 'DC13',
    'EC135': 'DC13',
    'EC136': 'DC13',
    'EC137': 'DC13',
    'EC138': 'DC13',
    'EC139': 'DC13',
    'EC141': 'DC14', // Joe Gqabi
    'EC142': 'DC14',
    'EC143': 'DC14',
    'EC144': 'DC14',
    'EC151': 'DC15', // OR Tambo
    'EC152': 'DC15',
    'EC153': 'DC15',
    'EC154': 'DC15',
    'EC155': 'DC15',
    'EC156': 'DC15',
    'EC157': 'DC15',
    'BUF': 'BUF',    // Buffalo City Metro
    'NMA': 'NMA',    // Nelson Mandela Bay Metro
  },
  
  // Free State (FS)
  'FS': {
    'FS161': 'DC16', // Xhariep
    'FS162': 'DC16',
    'FS163': 'DC16',
    'FS164': 'DC16',
    'FS181': 'DC18', // Lejweleputswa
    'FS182': 'DC18',
    'FS183': 'DC18',
    'FS184': 'DC18',
    'FS185': 'DC18',
    'FS191': 'DC19', // Thabo Mofutsanyane
    'FS192': 'DC19',
    'FS193': 'DC19',
    'FS194': 'DC19',
    'FS195': 'DC19',
    'FS196': 'DC19',
    'FS201': 'DC20', // Fezile Dabi
    'FS203': 'DC20',
    'FS204': 'DC20',
    'FS205': 'DC20',
    'MAN': 'MAN',    // Mangaung Metro
  },
  
  // Gauteng (GP)
  'GP': {
    'JHB': 'JHB',    // City of Johannesburg Metro
    'TSH': 'TSH',    // City of Tshwane Metro
    'EKU': 'EKU',    // Ekurhuleni Metro
    'EMF': 'DC42',   // Emfuleni - West Rand
    'MID': 'DC42',   // Midvaal - West Rand
    'LES': 'DC48',   // Lesedi - Sedibeng
    'MOG': 'DC48',   // Mogale City - West Rand
    'RAN': 'DC48',   // Randfontein - West Rand
    'WES': 'DC48',   // Westonaria - West Rand
  },
  
  // KwaZulu-Natal (KZN)
  'KZN': {
    'KZN211': 'DC21', // Ugu
    'KZN212': 'DC21',
    'KZN213': 'DC21',
    'KZN214': 'DC21',
    'KZN215': 'DC21',
    'KZN216': 'DC21',
    'KZN221': 'DC22', // Umgungundlovu
    'KZN222': 'DC22',
    'KZN223': 'DC22',
    'KZN224': 'DC22',
    'KZN225': 'DC22',
    'KZN226': 'DC22',
    'KZN227': 'DC22',
    'KZN232': 'DC23', // Uthukela
    'KZN233': 'DC23',
    'KZN234': 'DC23',
    'KZN235': 'DC23',
    'KZN236': 'DC23',
    'KZN237': 'DC23',
    'KZN238': 'DC23', // Alfred Duma
    'KZN241': 'DC24', // Umzinyathi
    'KZN242': 'DC24',
    'KZN244': 'DC24',
    'KZN245': 'DC24',
    'KZN252': 'DC25', // Amajuba
    'KZN253': 'DC25',
    'KZN254': 'DC25',
    'KZN261': 'DC26', // Zululand
    'KZN262': 'DC26',
    'KZN263': 'DC26', // Abaqulusi
    'KZN264': 'DC26',
    'KZN265': 'DC26',
    'KZN271': 'DC27', // Umkhanyakude
    'KZN272': 'DC27',
    'KZN273': 'DC27',
    'KZN274': 'DC27',
    'KZN275': 'DC27',
    'KZN276': 'DC27', // Big Five Hlabisa
    'KZN281': 'DC28', // Uthungulu
    'KZN282': 'DC28',
    'KZN283': 'DC28',
    'KZN284': 'DC28',
    'KZN285': 'DC28',
    'KZN286': 'DC28',
    'KZN291': 'DC29', // iLembe
    'KZN292': 'DC29',
    'KZN293': 'DC29',
    'KZN294': 'DC29',
    'KZN431': 'DC43', // Harry Gwala
    'KZN432': 'DC43',
    'KZN433': 'DC43',
    'KZN434': 'DC43',
    'KZN435': 'DC43',
    'ETH': 'ETH',    // eThekwini Metro
  },
  
  // Limpopo (LIM)
  'LIM': {
    'LIM331': 'DC33', // Mopani
    'LIM332': 'DC33',
    'LIM333': 'DC33',
    'LIM334': 'DC33', // Ba-Phalaborwa
    'LIM335': 'DC33',
    'LIM341': 'DC34', // Vhembe
    'LIM342': 'DC34',
    'LIM343': 'DC34',
    'LIM344': 'DC34',
    'LIM351': 'DC35', // Capricorn
    'LIM352': 'DC35',
    'LIM353': 'DC35',
    'LIM354': 'DC35',
    'LIM355': 'DC35', // Blouberg
    'LIM361': 'DC36', // Waterberg
    'LIM362': 'DC36',
    'LIM363': 'DC36',
    'LIM364': 'DC36',
    'LIM365': 'DC36',
    'LIM366': 'DC36', // Bela-Bela
    'LIM367': 'DC36',
    'LIM368': 'DC36',
    'LIM471': 'DC47', // Sekhukhune
    'LIM472': 'DC47',
    'LIM473': 'DC47',
    'LIM474': 'DC47',
    'LIM475': 'DC47',
  },
  
  // Mpumalanga (MP)
  'MP': {
    'MP301': 'DC30', // Gert Sibande
    'MP302': 'DC30', // Chief Albert Luthuli
    'MP303': 'DC30',
    'MP304': 'DC30',
    'MP305': 'DC30',
    'MP306': 'DC30',
    'MP307': 'DC30',
    'MP311': 'DC31', // Nkangala
    'MP312': 'DC31',
    'MP313': 'DC31',
    'MP314': 'DC31',
    'MP315': 'DC31',
    'MP316': 'DC31',
    'MP321': 'DC32', // Ehlanzeni
    'MP322': 'DC32',
    'MP323': 'DC32',
    'MP324': 'DC32',
    'MP325': 'DC32', // Bushbuckridge
    'MP326': 'DC32',
  },
  
  // Northern Cape (NC)
  'NC': {
    'NC061': 'DC6',  // Namakwa
    'NC062': 'DC6',
    'NC063': 'DC6',
    'NC064': 'DC6',
    'NC065': 'DC6',
    'NC066': 'DC6',
    'NC071': 'DC7',  // Pixley ka Seme
    'NC072': 'DC7',
    'NC073': 'DC7',
    'NC074': 'DC7',
    'NC075': 'DC7',
    'NC076': 'DC7',
    'NC077': 'DC7',
    'NC078': 'DC7',
    'NC081': 'DC8',  // ZF Mgcawu
    'NC082': 'DC8',
    'NC083': 'DC8',
    'NC084': 'DC8',  // !Kheis
    'NC085': 'DC8',
    'NC086': 'DC8',
    'NC091': 'DC9',  // Frances Baard
    'NC092': 'DC9',
    'NC093': 'DC9',
    'NC094': 'DC9',
    'NC451': 'DC45', // John Taolo Gaetsewe
    'NC452': 'DC45',
    'NC453': 'DC45',
  },
  
  // North West (NW) - These are the CORRECT assignments
  'NW': {
    'NW371': 'DC37', // Moretele - Bojanala
    'NW372': 'DC37', // Rustenburg - Bojanala  
    'NW373': 'DC37', // Local Municipality of Madibeng - Bojanala
    'NW374': 'DC37', // Kgetlengrivier - Bojanala
    'NW375': 'DC37', // Moses Kotane - Bojanala
    'NW381': 'DC38', // Ratlou - Ngaka Modiri Molema
    'NW382': 'DC38', // Tswaing - Ngaka Modiri Molema
    'NW383': 'DC38', // Mafikeng - Ngaka Modiri Molema
    'NW384': 'DC38', // Ditsobotla - Ngaka Modiri Molema
    'NW385': 'DC38', // Ramotshere Moiloa - Ngaka Modiri Molema
    'NW391': 'DC39', // Lekwa-Teemane - Dr Ruth Segomotsi Mompati
    'NW392': 'DC39', // Mamusa - Dr Ruth Segomotsi Mompati
    'NW393': 'DC39', // Greater Taung - Dr Ruth Segomotsi Mompati
    'NW394': 'DC39', // Naledi - Dr Ruth Segomotsi Mompati
    'NW395': 'DC39', // Kagisano-Molopo - Dr Ruth Segomotsi Mompati
    'NW401': 'DC40', // Ventersdorp - Dr Kenneth Kaunda
    'NW402': 'DC40', // Potchefstroom - Dr Kenneth Kaunda
    'NW403': 'DC40', // Tlokwe City Council - Dr Kenneth Kaunda
    'NW404': 'DC40', // Matlosana - Dr Kenneth Kaunda
    'NW405': 'DC40', // Maquassi Hills - Dr Kenneth Kaunda
  },
  
  // Western Cape (WC)
  'WC': {
    'WC011': 'DC1',  // West Coast
    'WC012': 'DC1',
    'WC013': 'DC1',
    'WC014': 'DC1',
    'WC015': 'DC1',
    'WC022': 'DC2',  // Cape Winelands
    'WC023': 'DC2',
    'WC024': 'DC2',
    'WC025': 'DC2',
    'WC026': 'DC2',
    'WC031': 'DC3',  // Overberg
    'WC032': 'DC3',
    'WC033': 'DC3',
    'WC034': 'DC3',
    'WC041': 'DC4',  // Eden
    'WC042': 'DC4',
    'WC043': 'DC4',
    'WC044': 'DC4',
    'WC045': 'DC4',
    'WC047': 'DC4',
    'WC048': 'DC4',
    'WC051': 'DC5',  // Central Karoo
    'WC052': 'DC5',
    'WC053': 'DC5',
    'CPT': 'CPT',    // City of Cape Town Metro
  }
};

async function analyzeCurrentState() {
  console.log('🔍 Analyzing current geographic data state...\n');
  
  try {
    // Get municipalities incorrectly assigned to Bojanala
    const incorrectAssignments = await pool.query(`
      SELECT 
        LEFT(municipality_code, 2) as province_prefix,
        COUNT(*) as count,
        STRING_AGG(municipality_name, ', ' ORDER BY municipality_name) as municipalities
      FROM municipalities 
      WHERE district_code = 'DC37'
      GROUP BY LEFT(municipality_code, 2)
      ORDER BY count DESC
    `);
    
    console.log('📊 Current Bojanala District (DC37) assignments:');
    incorrectAssignments.rows.forEach(row => {
      console.log(`   ${row.province_prefix}: ${row.count} municipalities`);
    });
    
    // Get districts with no municipalities
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
    
    console.log(`\n🚫 Districts with 0 municipalities: ${emptyDistricts.rows.length}`);
    
    return {
      incorrectAssignments: incorrectAssignments.rows,
      emptyDistricts: emptyDistricts.rows
    };
    
  } catch (error) {
    console.error('❌ Error analyzing current state:', error);
    throw error;
  }
}

async function createBackup() {
  console.log('💾 Creating backup of municipalities table...\n');
  
  try {
    const backupTableName = `municipalities_backup_${Date.now()}`;
    await pool.query(`
      CREATE TABLE "${backupTableName}" AS
      SELECT * FROM municipalities
    `);

    console.log(`✅ Backup created successfully: ${backupTableName}`);
    
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    throw error;
  }
}

async function fixMunicipalityDistrictMappings() {
  console.log('🔧 Starting municipality-district mapping corrections...\n');
  
  let correctionCount = 0;
  let errorCount = 0;
  const errors = [];
  
  try {
    // Get all municipalities that need correction
    const municipalities = await pool.query(`
      SELECT municipality_code, municipality_name, district_code
      FROM municipalities
      ORDER BY municipality_code
    `);
    
    console.log(`📋 Processing ${municipalities.rows.length} municipalities...\n`);
    
    for (const municipality of municipalities.rows) {
      const { municipality_code, municipality_name, district_code } = municipality;
      
      // Extract province prefix (first 2-3 characters)
      let provincePrefix = municipality_code.substring(0, 2);

      // Handle special cases for 3-character prefixes
      if (['BUF', 'NMA', 'CPT', 'JHB', 'TSH', 'EKU', 'ETH', 'MAN', 'KZN', 'LIM'].includes(municipality_code.substring(0, 3))) {
        provincePrefix = municipality_code.substring(0, 3);
      }
      
      // Find correct district for this municipality
      let correctDistrict = null;
      
      // Check if we have a specific mapping for this municipality
      if (MUNICIPALITY_DISTRICT_MAPPING[provincePrefix] && 
          MUNICIPALITY_DISTRICT_MAPPING[provincePrefix][municipality_code]) {
        correctDistrict = MUNICIPALITY_DISTRICT_MAPPING[provincePrefix][municipality_code];
      } else if (MUNICIPALITY_DISTRICT_MAPPING[provincePrefix]) {
        // For metros, use the municipality code as district code
        if (['BUF', 'NMA', 'CPT', 'JHB', 'TSH', 'EKU', 'ETH', 'MAN'].includes(municipality_code)) {
          correctDistrict = municipality_code;
        }
      }
      
      if (correctDistrict && correctDistrict !== district_code) {
        try {
          // Verify the target district exists
          const districtExists = await pool.query(`
            SELECT district_code FROM districts WHERE district_code = $1
          `, [correctDistrict]);
          
          if (districtExists.rows.length > 0) {
            // Update the municipality's district assignment
            await pool.query(`
              UPDATE municipalities 
              SET district_code = $1, updated_at = CURRENT_TIMESTAMP
              WHERE municipality_code = $2
            `, [correctDistrict, municipality_code]);
            
            console.log(`✅ ${municipality_code} (${municipality_name}): ${district_code} → ${correctDistrict}`);
            correctionCount++;
          } else {
            const error = `District ${correctDistrict} does not exist for ${municipality_code}`;
            console.log(`⚠️  ${error}`);
            errors.push(error);
            errorCount++;
          }
        } catch (error) {
          const errorMsg = `Failed to update ${municipality_code}: ${error.message}`;
          console.log(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          errorCount++;
        }
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

async function validateCorrections() {
  console.log('🔍 Validating corrections...\n');
  
  try {
    // Check Bojanala district after corrections
    const bojanalaCheck = await pool.query(`
      SELECT 
        LEFT(municipality_code, 2) as province_prefix,
        COUNT(*) as count
      FROM municipalities 
      WHERE district_code = 'DC37'
      GROUP BY LEFT(municipality_code, 2)
      ORDER BY count DESC
    `);
    
    console.log('📊 Bojanala District (DC37) after corrections:');
    bojanalaCheck.rows.forEach(row => {
      console.log(`   ${row.province_prefix}: ${row.count} municipalities`);
    });
    
    // Check districts with no municipalities
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
    
    console.log(`\n🚫 Districts still with 0 municipalities: ${emptyDistricts.rows.length}`);
    
    if (emptyDistricts.rows.length > 0) {
      console.log('Empty districts:');
      emptyDistricts.rows.forEach(district => {
        console.log(`   ${district.district_code} - ${district.district_name} (${district.province_code})`);
      });
    }
    
    // Check geographic hierarchy integrity
    const hierarchyCheck = await pool.query(`
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
    
    console.log('\n🏛️  Geographic hierarchy summary:');
    hierarchyCheck.rows.forEach(province => {
      console.log(`   ${province.province_name}: ${province.districts} districts, ${province.municipalities} municipalities, ${province.wards} wards`);
    });
    
    return {
      bojanalaCorrect: bojanalaCheck.rows.find(r => r.province_prefix === 'NW')?.count || 0,
      emptyDistrictsCount: emptyDistricts.rows.length,
      hierarchySummary: hierarchyCheck.rows
    };
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Geographic Data Integrity Fix Script');
  console.log('=====================================\n');
  
  try {
    // Step 1: Analyze current state
    const currentState = await analyzeCurrentState();
    
    // Step 2: Create backup
    await createBackup();
    
    // Step 3: Fix municipality-district mappings
    const corrections = await fixMunicipalityDistrictMappings();
    
    // Step 4: Validate corrections
    const validation = await validateCorrections();
    
    console.log('\n🎉 Geographic Data Integrity Fix Completed!');
    console.log('==========================================');
    console.log(`✅ Municipalities corrected: ${corrections.correctionCount}`);
    console.log(`❌ Errors encountered: ${corrections.errorCount}`);
    console.log(`🏛️  Bojanala district now has: ${validation.bojanalaCorrect} municipalities (should be ~5)`);
    console.log(`🚫 Empty districts remaining: ${validation.emptyDistrictsCount}`);
    
    if (corrections.errorCount === 0 && validation.emptyDistrictsCount < 10) {
      console.log('\n✅ SUCCESS: Geographic data integrity has been restored!');
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS: Some issues remain and may need manual review.');
    }
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error);
    console.log('\n🔄 Rollback recommendation: Restore from backup if needed');
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
  analyzeCurrentState,
  createBackup,
  fixMunicipalityDistrictMappings,
  validateCorrections,
  MUNICIPALITY_DISTRICT_MAPPING
};
