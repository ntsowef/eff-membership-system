/**
 * Create the missing vw_enhanced_member_search view with PostgreSQL syntax
 */

const { Pool } = require('pg');

async function createEnhancedMemberSearchView() {
  console.log('🔍 Creating vw_enhanced_member_search view...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Drop existing view if it exists
    await pool.query('DROP VIEW IF EXISTS vw_enhanced_member_search CASCADE;');
    console.log('✅ Dropped existing view (if any)');
    
    // Create the enhanced member search view with PostgreSQL syntax
    const createViewSQL = `
      CREATE OR REPLACE VIEW vw_enhanced_member_search AS
      SELECT 
        m.member_id,
        m.id_number,
        m.firstname,
        m.surname,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
        m.age,
        m.date_of_birth,
        g.gender_name,
        r.race_name,
        c.citizenship_name,
        l.language_name,
        m.cell_number,
        m.landline_number,
        m.email,
        m.residential_address,
        m.ward_code,
        w.ward_name,
        w.ward_number,
        CONCAT('Ward ', w.ward_number, ' - ', w.ward_name) as ward_display,
        w.municipality_code,
        mu.municipality_name,
        mu.district_code,
        d.district_name,
        d.province_code,
        p.province_name,
        CONCAT(w.ward_name, ', ', mu.municipality_name, ', ', d.district_name, ', ', p.province_name) as location_display,
        vs.station_name as voting_station_name,
        o.occupation_name,
        q.qualification_name,
        voter_s.status_name as voter_status,
        voter_s.is_eligible_to_vote,
        m.voter_registration_number,
        m.voter_registration_date,
        ms.status_name as membership_status,
        mem.expiry_date as membership_expiry_date,
        mem.date_joined as membership_date_joined,
        mem.membership_amount,
        CASE 
          WHEN mem.expiry_date > CURRENT_DATE THEN 'Active'
          WHEN mem.expiry_date <= CURRENT_DATE THEN 'Expired'
          ELSE 'Unknown'
        END as membership_status_display,
        (mem.expiry_date - CURRENT_DATE) as days_until_expiry,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, mem.date_joined)) as membership_duration_years,
        -- Enhanced search text with more fields
        CONCAT(
          m.firstname, ' ', COALESCE(m.surname, ''), ' ',
          m.id_number, ' ',
          COALESCE(m.email, ''), ' ',
          COALESCE(m.cell_number, ''), ' ',
          COALESCE(m.landline_number, ''), ' ',
          COALESCE(m.residential_address, ''), ' ',
          COALESCE(w.ward_name, ''), ' ',
          COALESCE(mu.municipality_name, ''), ' ',
          COALESCE(d.district_name, ''), ' ',
          COALESCE(p.province_name, ''), ' ',
          COALESCE(o.occupation_name, ''), ' ',
          COALESCE(g.gender_name, ''), ' ',
          COALESCE(r.race_name, '')
        ) as search_text,
        m.created_at,
        m.updated_at
      FROM members m
      LEFT JOIN genders g ON m.gender_id = g.gender_id
      LEFT JOIN races r ON m.race_id = r.race_id
      LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
      LEFT JOIN languages l ON m.language_id = l.language_id
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
      LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
      LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
      LEFT JOIN voter_statuses voter_s ON m.voter_status_id = voter_s.voter_status_id
      LEFT JOIN memberships mem ON m.member_id = mem.member_id
      LEFT JOIN membership_statuses ms ON mem.status_id = ms.status_id;
    `;
    
    await pool.query(createViewSQL);
    console.log('✅ Created vw_enhanced_member_search view successfully!');
    
    // Test the view
    console.log('\n🔧 Testing the new view...');
    const testQuery = 'SELECT COUNT(*) as count FROM vw_enhanced_member_search WHERE 1=1';
    const result = await pool.query(testQuery);
    console.log(`✅ View test successful! Total records: ${result.rows[0].count}`);
    
    // Test a sample query
    console.log('\n🔧 Testing sample query...');
    const sampleQuery = `
      SELECT member_id, full_name, ward_display, membership_status, membership_expiry_date
      FROM vw_enhanced_member_search 
      WHERE full_name IS NOT NULL
      LIMIT 5
    `;
    const sampleResult = await pool.query(sampleQuery);
    console.log(`✅ Sample query successful! Sample records:`);
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.full_name} - ${row.ward_display} - ${row.membership_status}`);
    });
    
    console.log('\n🎉 vw_enhanced_member_search view created and tested successfully!');
    
  } catch (error) {
    console.error('❌ Error creating view:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

createEnhancedMemberSearchView();
