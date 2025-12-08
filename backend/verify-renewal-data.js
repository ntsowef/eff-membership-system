const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db'
});

async function verifyRenewalData() {
  try {
    console.log('🔍 Verifying renewal data for member 7501165402082...\n');

    // Check member data
    const memberQuery = `
      SELECT 
        m.member_id,
        m.id_number,
        m.firstname,
        m.surname,
        m.email,
        m.cell_number,
        ms.membership_number,
        ms.date_joined,
        ms.last_payment_date,
        ms.expiry_date,
        ms.status_id,
        mst.status_name
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
      WHERE m.id_number = $1
    `;

    const memberResult = await pool.query(memberQuery, ['7501165402082']);

    if (memberResult.rows.length === 0) {
      console.log('❌ Member not found!');
      return;
    }

    console.log('✅ Member Data:');
    console.table(memberResult.rows);

    // Check payment record
    const paymentQuery = `
      SELECT 
        payment_id,
        member_id,
        membership_id,
        payment_reference,
        payment_method,
        payment_type,
        amount,
        currency,
        payment_status,
        payment_date,
        created_at
      FROM payments
      WHERE member_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const paymentResult = await pool.query(paymentQuery, [memberResult.rows[0].member_id]);

    console.log('\n✅ Recent Payment Records:');
    console.table(paymentResult.rows);

    // Verify dates
    const member = memberResult.rows[0];
    const lastPayment = new Date(member.last_payment_date);
    const expiry = new Date(member.expiry_date);
    const daysDiff = Math.round((expiry - lastPayment) / (1000 * 60 * 60 * 24));

    console.log('\n📅 Date Verification:');
    console.log(`Last Payment Date: ${member.last_payment_date}`);
    console.log(`Expiry Date: ${member.expiry_date}`);
    console.log(`Days Difference: ${daysDiff} days`);
    console.log(`Expected: 730 days (24 months)`);
    console.log(`Status: ${daysDiff === 730 ? '✅ CORRECT' : '❌ INCORRECT'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyRenewalData();

