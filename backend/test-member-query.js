// Test script to verify member data query
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'eff_membership_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function testMemberQuery() {
  try {
    console.log('='.repeat(80));
    console.log('TESTING MEMBER QUERY FOR ID: 6610190713081');
    console.log('='.repeat(80));
    console.log();

    const query = `
      SELECT 
        member_id,
        id_number,
        firstname,
        surname,
        membership_number,
        province_code,
        province_name,
        municipality_name,
        ward_code,
        member_created_at,
        expiry_date,
        membership_status,
        membership_amount,
        days_until_expiry,
        CASE 
          WHEN expiry_date >= CURRENT_DATE THEN '✅ Should show Active'
          WHEN expiry_date < CURRENT_DATE THEN '❌ Should show Expired'
          ELSE '⚠️ Unknown'
        END as expected_display
      FROM vw_member_details_optimized
      WHERE id_number = '6610190713081'
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log('❌ NO MEMBER FOUND with ID: 6610190713081');
      return;
    }

    const member = result.rows[0];

    console.log('✅ MEMBER FOUND!');
    console.log();
    console.log('--- MEMBER INFORMATION ---');
    console.log(`Member ID:          ${member.member_id}`);
    console.log(`ID Number:          ${member.id_number}`);
    console.log(`Name:               ${member.firstname} ${member.surname}`);
    console.log(`Membership Number:  ${member.membership_number}`);
    console.log();
    console.log('--- GEOGRAPHIC INFORMATION ---');
    console.log(`Province Code:      ${member.province_code}`);
    console.log(`Province Name:      ${member.province_name}`);
    console.log(`Municipality:       ${member.municipality_name}`);
    console.log(`Ward Code:          ${member.ward_code}`);
    console.log();
    console.log('--- MEMBERSHIP STATUS ---');
    console.log(`Member Created:     ${member.member_created_at}`);
    console.log(`Expiry Date:        ${member.expiry_date}`);
    console.log(`Membership Status:  ${member.membership_status}`);
    console.log(`Membership Amount:  ${member.membership_amount}`);
    console.log(`Days Until Expiry:  ${member.days_until_expiry}`);
    console.log();
    console.log('--- VERIFICATION ---');
    console.log(`Expected Display:   ${member.expected_display}`);
    console.log();

    // Additional verification
    const today = new Date();
    const expiryDate = new Date(member.expiry_date);
    const isExpired = expiryDate < today;

    console.log('--- CALCULATED VERIFICATION ---');
    console.log(`Today's Date:       ${today.toISOString().split('T')[0]}`);
    console.log(`Expiry Date:        ${expiryDate.toISOString().split('T')[0]}`);
    console.log(`Is Expired:         ${isExpired ? '❌ YES' : '✅ NO'}`);
    console.log(`Should Show:        ${isExpired ? 'Expired' : 'Active'}`);
    console.log(`Database Shows:     ${member.membership_status}`);
    console.log(`Match:              ${(isExpired ? 'Expired' : 'Active') === member.membership_status ? '✅ CORRECT' : '❌ MISMATCH'}`);
    console.log();

    console.log('='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testMemberQuery();

