const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: '69.164.245.173', // Production Database IP
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

const genderMap = {
  'Male': 1,
  'Female': 2,
  'Other': 3,
  'Prefer not to say': 3
};

async function syncApprovedApplications() {
  const client = await pool.connect();
  try {
    console.log('====================================================');
    console.log('PRODUCTION DATABASE SYNC: APPROVED APPLICATIONS');
    console.log('====================================================\n');

    // 1. Get all approved applications
    const appsRes = await client.query(`
      SELECT *
      FROM membership_applications
      WHERE LOWER(status) = 'approved'
      ORDER BY application_id ASC
    `);

    const approvedApps = appsRes.rows;
    console.log(`📊 Found ${approvedApps.length} approved applications in production.\n`);

    let syncedCount = 0;
    let existingCount = 0;
    let errorCount = 0;

    for (const app of approvedApps) {
      const { application_id, id_number, first_name, last_name, gender, ward_code, created_at, last_payment_date, payment_amount, payment_method, payment_status, iec_is_registered, voting_district_code } = app;

      // Check if member record already exists in members_consolidated
      const memberCheck = await client.query(
        'SELECT member_id, membership_number FROM members_consolidated WHERE id_number = $1',
        [id_number]
      );

      if (memberCheck.rows.length > 0) {
        console.log(`ℹ️ [ALREADY EXISTS] App #${application_id} (${first_name} ${last_name}, ID: ${id_number}) -> Member ID: ${memberCheck.rows[0].member_id} (${memberCheck.rows[0].membership_number})`);
        existingCount++;
        continue;
      }

      console.log(`⏳ [SYNCING] App #${application_id} (${first_name} ${last_name}, ID: ${id_number}) is missing in members_consolidated. Creating member...`);

      // Determine voter status & VD code
      let voter_status_id = null;
      let vd_code = voting_district_code;

      if (iec_is_registered === true) {
        voter_status_id = 1; // Registered
        if (!vd_code) vd_code = '22222222';
      } else if (iec_is_registered === false) {
        voter_status_id = 2; // Not Registered
        vd_code = '999999999';
      } else {
        voter_status_id = 4; // Verification Failed / Pending
        if (!vd_code) vd_code = '888888888';
      }

      // Lookup ward's municipality code
      let correctMunicipalityCode = app.municipal_code;
      if (ward_code) {
        const wardRes = await client.query('SELECT municipality_code FROM wards WHERE ward_code = $1', [ward_code]);
        if (wardRes.rows.length > 0 && wardRes.rows[0].municipality_code) {
          correctMunicipalityCode = wardRes.rows[0].municipality_code;
        }
      }

      // Lookup geographic names
      const geoRes = await client.query(`
        SELECT
          p.province_name,
          d.district_name,
          m.municipality_name
        FROM provinces p
        LEFT JOIN districts d ON d.province_code = p.province_code AND d.district_code = $2
        LEFT JOIN municipalities m ON m.district_code = d.district_code AND m.municipality_code = $3
        WHERE p.province_code = $1
        LIMIT 1
      `, [app.province_code, app.district_code, correctMunicipalityCode]);

      const geo = geoRes.rows[0] || { province_name: null, district_name: null, municipality_name: null };

      // Membership dates
      const dateJoined = created_at ? new Date(created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const baseDate = last_payment_date ? new Date(last_payment_date) : new Date(dateJoined);
      const expiryDate = new Date(baseDate);
      expiryDate.setMonth(expiryDate.getMonth() + 24); // 2 years expiry
      const expiryDateStr = expiryDate.toISOString().split('T')[0];

      const tempMembershipNumber = `TEMP${Date.now()}`;

      try {
        await client.query('BEGIN');

        const insertQuery = `
          INSERT INTO members_consolidated (
            id_number, firstname, surname, date_of_birth, gender_id,
            ward_code, voting_district_code, voter_status_id,
            cell_number, email, residential_address, postal_address,
            membership_type, application_id,
            province_code, province_name, district_code, district_name,
            municipality_code, municipality_name,
            membership_number, date_joined, last_payment_date, expiry_date,
            subscription_type_id, membership_amount, membership_status_id,
            payment_method, payment_status,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          RETURNING member_id
        `;

        const insertParams = [
          id_number,
          first_name,
          last_name,
          app.date_of_birth,
          genderMap[gender] || 3,
          ward_code,
          vd_code,
          voter_status_id,
          app.cell_number,
          app.email,
          app.residential_address,
          app.postal_address,
          app.membership_type || 'Regular',
          application_id,
          app.province_code,
          geo.province_name,
          app.district_code,
          geo.district_name,
          correctMunicipalityCode,
          geo.municipality_name,
          tempMembershipNumber,
          dateJoined,
          last_payment_date || null,
          expiryDateStr,
          1,
          payment_amount || 10.00,
          1, // Active status
          payment_method || 'Card Payment',
          payment_status || 'Completed'
        ];

        const insertRes = await client.query(insertQuery, insertParams);
        const memberId = insertRes.rows[0].member_id;

        // Generate proper membership number EFF2026xxxxxx
        const year = new Date().getFullYear();
        const membershipNumber = `EFF${year}${memberId.toString().padStart(6, '0')}`;

        await client.query(
          'UPDATE members_consolidated SET membership_number = $1 WHERE member_id = $2',
          [membershipNumber, memberId]
        );

        await client.query('COMMIT');

        console.log(`✅ [CREATED] App #${application_id} -> Member ID ${memberId} (${membershipNumber})`);
        syncedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Error syncing App #${application_id}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n====================================================');
    console.log('PRODUCTION SYNC COMPLETE');
    console.log('====================================================');
    console.log(`- Total Approved Applications: ${approvedApps.length}`);
    console.log(`- Already Existing in members_consolidated: ${existingCount}`);
    console.log(`- Newly Created in members_consolidated: ${syncedCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log('====================================================\n');

  } finally {
    client.release();
    await pool.end();
  }
}

syncApprovedApplications().catch(console.error);
