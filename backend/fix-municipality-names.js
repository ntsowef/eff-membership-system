const { Pool } = require('pg');

// Usage: node fix-municipality-names.js [local|production] [preview|apply]
const TARGET = process.argv[2] || 'local';
const MODE = process.argv[3] || 'preview';

const config = TARGET === 'production' ? {
  host: '69.164.245.173',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
} : {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
};

const pool = new Pool(config);

async function fixMunicipalityNames() {
  console.log(`\n🔧 Municipality Name Fix - ${TARGET.toUpperCase()} (${config.host})`);
  console.log(`📋 Mode: ${MODE.toUpperCase()}\n`);
  console.log('='.repeat(80));

  try {
    // 1. Preview: Show municipalities that will be affected
    console.log('\n📊 PREVIEW: Municipalities with "Sub-Region" in name:\n');

    // Handle edge cases:
    // - "Sub-Region of Madibeng" should become "Madibeng" (not "of Madibeng")
    // - "Something Sub-Region" should become "Something"
    const previewQuery = `
      SELECT
        municipality_code,
        municipality_name as current_name,
        CASE
          WHEN municipality_name LIKE 'Sub-Region of %'
            THEN TRIM(REPLACE(municipality_name, 'Sub-Region of ', ''))
          ELSE TRIM(REPLACE(municipality_name, 'Sub-Region', ''))
        END as new_name,
        municipality_type,
        district_code
      FROM municipalities
      WHERE municipality_name LIKE '%Sub-Region%'
      ORDER BY municipality_name
    `;
    
    const preview = await pool.query(previewQuery);
    
    if (preview.rows.length === 0) {
      console.log('✅ No municipalities found with "Sub-Region" in their name.');
      console.log('   Nothing to update.');
      return;
    }

    console.log(`Found ${preview.rows.length} municipalities to update:\n`);
    console.log('┌' + '─'.repeat(12) + '┬' + '─'.repeat(40) + '┬' + '─'.repeat(35) + '┐');
    console.log('│ Code       │ Current Name                           │ New Name                          │');
    console.log('├' + '─'.repeat(12) + '┼' + '─'.repeat(40) + '┼' + '─'.repeat(35) + '┤');
    
    preview.rows.forEach(row => {
      const code = row.municipality_code.padEnd(10);
      const current = row.current_name.substring(0, 38).padEnd(38);
      const newName = row.new_name.substring(0, 33).padEnd(33);
      console.log(`│ ${code} │ ${current} │ ${newName} │`);
    });
    
    console.log('└' + '─'.repeat(12) + '┴' + '─'.repeat(40) + '┴' + '─'.repeat(35) + '┘');
    console.log(`\nTotal: ${preview.rows.length} municipalities will be updated`);

    // 2. Apply changes if mode is 'apply'
    if (MODE === 'apply') {
      console.log('\n' + '='.repeat(80));
      console.log('\n🚀 APPLYING CHANGES...\n');
      
      // Handle edge cases in update as well
      const updateQuery = `
        UPDATE municipalities
        SET municipality_name = CASE
          WHEN municipality_name LIKE 'Sub-Region of %'
            THEN TRIM(REPLACE(municipality_name, 'Sub-Region of ', ''))
          ELSE TRIM(REPLACE(municipality_name, 'Sub-Region', ''))
        END
        WHERE municipality_name LIKE '%Sub-Region%'
      `;
      
      const result = await pool.query(updateQuery);
      console.log(`✅ Updated ${result.rowCount} municipality names`);

      // 3. Verify changes
      console.log('\n' + '='.repeat(80));
      console.log('\n📋 VERIFICATION: Updated municipality names:\n');
      
      const verifyQuery = `
        SELECT 
          municipality_code,
          municipality_name,
          municipality_type
        FROM municipalities
        WHERE municipality_type = 'Metro Sub-Region'
        ORDER BY municipality_name
        LIMIT 20
      `;
      
      const verify = await pool.query(verifyQuery);
      console.table(verify.rows);
      
      console.log('\n✅ Changes applied successfully!');
    } else {
      console.log('\n' + '─'.repeat(80));
      console.log('\n💡 To apply these changes, run:');
      console.log(`   node fix-municipality-names.js ${TARGET} apply\n`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

fixMunicipalityNames();

