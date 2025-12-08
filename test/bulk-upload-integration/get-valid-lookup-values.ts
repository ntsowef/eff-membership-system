/**
 * Get Valid Lookup Values from Database
 * 
 * This script queries the database for valid lookup values to use in test data
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function getLookupValues() {
  console.log('🔍 Fetching valid lookup values from database...\n');

  const lookupData: any = {};

  try {
    // Get ward codes (sample)
    console.log('📋 Fetching ward codes...');
    const wardsResult = await pool.query(`
      SELECT ward_code, ward_name, municipality_code
      FROM wards
      ORDER BY ward_code
      LIMIT 50
    `);
    lookupData.wards = wardsResult.rows;
    console.log(`   ✅ Found ${wardsResult.rows.length} wards`);

    // Get genders
    console.log('📋 Fetching genders...');
    const gendersResult = await pool.query('SELECT * FROM genders ORDER BY gender_id');
    lookupData.genders = gendersResult.rows;
    console.log(`   ✅ Found ${gendersResult.rows.length} genders`);

    // Get races
    console.log('📋 Fetching races...');
    const racesResult = await pool.query('SELECT * FROM races ORDER BY race_id');
    lookupData.races = racesResult.rows;
    console.log(`   ✅ Found ${racesResult.rows.length} races`);

    // Get citizenships
    console.log('📋 Fetching citizenships...');
    const citizenshipsResult = await pool.query('SELECT * FROM citizenships ORDER BY citizenship_id');
    lookupData.citizenships = citizenshipsResult.rows;
    console.log(`   ✅ Found ${citizenshipsResult.rows.length} citizenships`);

    // Get languages
    console.log('📋 Fetching languages...');
    const languagesResult = await pool.query('SELECT * FROM languages ORDER BY language_id');
    lookupData.languages = languagesResult.rows;
    console.log(`   ✅ Found ${languagesResult.rows.length} languages`);

    // Get occupations
    console.log('📋 Fetching occupations...');
    const occupationsResult = await pool.query('SELECT * FROM occupations ORDER BY occupation_id LIMIT 20');
    lookupData.occupations = occupationsResult.rows;
    console.log(`   ✅ Found ${occupationsResult.rows.length} occupations`);

    // Get qualifications
    console.log('📋 Fetching qualifications...');
    const qualificationsResult = await pool.query('SELECT * FROM qualifications ORDER BY qualification_id');
    lookupData.qualifications = qualificationsResult.rows;
    console.log(`   ✅ Found ${qualificationsResult.rows.length} qualifications`);

    // Get subscription types
    console.log('📋 Fetching subscription types...');
    const subscriptionTypesResult = await pool.query('SELECT * FROM subscription_types ORDER BY subscription_type_id');
    lookupData.subscription_types = subscriptionTypesResult.rows;
    console.log(`   ✅ Found ${subscriptionTypesResult.rows.length} subscription types`);

    // Get membership statuses
    console.log('📋 Fetching membership statuses...');
    const membershipStatusesResult = await pool.query('SELECT * FROM membership_statuses ORDER BY status_id');
    lookupData.membership_statuses = membershipStatusesResult.rows;
    console.log(`   ✅ Found ${membershipStatusesResult.rows.length} membership statuses`);

    // Get provinces (from wards or municipalities)
    console.log('📋 Fetching provinces...');
    const provincesResult = await pool.query(`
      SELECT DISTINCT province_code, province_name
      FROM provinces
      ORDER BY province_code
    `);
    lookupData.provinces = provincesResult.rows;
    console.log(`   ✅ Found ${provincesResult.rows.length} provinces`);

    // Get municipalities (sample)
    console.log('📋 Fetching municipalities...');
    const municipalitiesResult = await pool.query(`
      SELECT municipality_code, municipality_name, province_code
      FROM municipalities
      ORDER BY municipality_code
      LIMIT 50
    `);
    lookupData.municipalities = municipalitiesResult.rows;
    console.log(`   ✅ Found ${municipalitiesResult.rows.length} municipalities`);

    // Save to JSON file
    const outputPath = path.resolve(process.cwd(), '../test/bulk-upload-integration/valid-lookup-values.json');
    fs.writeFileSync(outputPath, JSON.stringify(lookupData, null, 2));
    console.log(`\n✅ Lookup values saved to: ${outputPath}`);

    // Print summary
    console.log('\n📊 Summary:');
    console.log(`   Wards: ${lookupData.wards.length}`);
    console.log(`   Genders: ${lookupData.genders.length}`);
    console.log(`   Races: ${lookupData.races.length}`);
    console.log(`   Citizenships: ${lookupData.citizenships.length}`);
    console.log(`   Languages: ${lookupData.languages.length}`);
    console.log(`   Occupations: ${lookupData.occupations.length}`);
    console.log(`   Qualifications: ${lookupData.qualifications.length}`);
    console.log(`   Subscription Types: ${lookupData.subscription_types.length}`);
    console.log(`   Membership Statuses: ${lookupData.membership_statuses.length}`);
    console.log(`   Provinces: ${lookupData.provinces.length}`);
    console.log(`   Municipalities: ${lookupData.municipalities.length}`);

    // Print sample values for quick reference
    console.log('\n📝 Sample Values for Test Data:');
    console.log(`   Ward: ${lookupData.wards[0]?.ward_code} (${lookupData.wards[0]?.ward_name})`);
    console.log(`   Gender: ${lookupData.genders[0]?.gender_name} (ID: ${lookupData.genders[0]?.gender_id})`);
    console.log(`   Race: ${lookupData.races[0]?.race_name} (ID: ${lookupData.races[0]?.race_id})`);
    console.log(`   Citizenship: ${lookupData.citizenships[0]?.citizenship_name} (ID: ${lookupData.citizenships[0]?.citizenship_id})`);
    console.log(`   Language: ${lookupData.languages[0]?.language_name} (ID: ${lookupData.languages[0]?.language_id})`);
    console.log(`   Occupation: ${lookupData.occupations[0]?.occupation_name} (ID: ${lookupData.occupations[0]?.occupation_id})`);
    console.log(`   Qualification: ${lookupData.qualifications[0]?.qualification_name} (ID: ${lookupData.qualifications[0]?.qualification_id})`);
    console.log(`   Subscription: ${lookupData.subscription_types[0]?.subscription_type_name} (ID: ${lookupData.subscription_types[0]?.subscription_type_id})`);
    console.log(`   Province: ${lookupData.provinces[0]?.province_name} (Code: ${lookupData.provinces[0]?.province_code})`);
    console.log(`   Municipality: ${lookupData.municipalities[0]?.municipality_name} (Code: ${lookupData.municipalities[0]?.municipality_code})`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

getLookupValues();

