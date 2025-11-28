/**
 * Check all table structures needed for the enhanced member search view
 */

const { Pool } = require('pg');

async function checkAllTableStructures() {
  console.log('🔍 Checking all table structures for enhanced member search view...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  const tables = [
    'members',
    'voter_statuses', 
    'voting_stations',
    'memberships',
    'membership_statuses'
  ];

  try {
    for (const tableName of tables) {
      console.log(`\n📋 ${tableName.toUpperCase()} table structure:`);
      
      // Check if table exists first
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        );
      `;
      
      const tableExists = await pool.query(tableExistsQuery);
      
      if (!tableExists.rows[0].exists) {
        console.log(`❌ Table ${tableName} does not exist!`);
        continue;
      }
      
      const structureQuery = `
        SELECT 
          column_name, 
          data_type, 
          is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
        ORDER BY ordinal_position;
      `;
      
      const structure = await pool.query(structureQuery);
      console.log('Column Name | Data Type | Nullable');
      console.log('------------|-----------|----------');
      
      structure.rows.forEach(row => {
        console.log(`${row.column_name.padEnd(11)} | ${row.data_type.padEnd(9)} | ${row.is_nullable}`);
      });
    }
    
    // Now create a simplified view with only existing columns
    console.log('\n🔧 Creating simplified enhanced member search view...');
    
    const simplifiedViewSQL = `
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
        o.occupation_name,
        q.qualification_name,
        -- Enhanced search text with available fields
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
      LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
      LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id;
    `;
    
    await pool.query(simplifiedViewSQL);
    console.log('✅ Created simplified vw_enhanced_member_search view successfully!');
    
    // Test the view
    console.log('\n🔧 Testing the new view...');
    const testQuery = 'SELECT COUNT(*) as count FROM vw_enhanced_member_search WHERE 1=1';
    const result = await pool.query(testQuery);
    console.log(`✅ View test successful! Total records: ${result.rows[0].count}`);
    
    // Test a sample query
    console.log('\n🔧 Testing sample query...');
    const sampleQuery = `
      SELECT member_id, full_name, ward_display, occupation_name, qualification_name
      FROM vw_enhanced_member_search 
      WHERE full_name IS NOT NULL
      LIMIT 5
    `;
    const sampleResult = await pool.query(sampleQuery);
    console.log(`✅ Sample query successful! Sample records:`);
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.full_name} - ${row.ward_display} - ${row.occupation_name || 'N/A'}`);
    });
    
    console.log('\n🎉 Simplified vw_enhanced_member_search view created and tested successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAllTableStructures();
