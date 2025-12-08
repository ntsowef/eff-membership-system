const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkMetroStructure() {
  try {
    console.log('🔍 Checking Metro Municipality Structure\n');
    
    // Check City of Johannesburg municipality
    const jhbResult = await pool.query(`
      SELECT 
        municipality_code,
        municipality_name,
        municipality_type,
        parent_municipality_id,
        district_code
      FROM municipalities 
      WHERE municipality_code = 'JHB' OR municipality_name LIKE '%Johannesburg%'
      ORDER BY municipality_name
    `);
    
    console.log('City of Johannesburg municipalities:');
    jhbResult.rows.forEach(row => {
      console.log(`  ${row.municipality_code} - ${row.municipality_name}`);
      console.log(`    Type: ${row.municipality_type}`);
      console.log(`    Parent ID: ${row.parent_municipality_id}`);
      console.log(`    District: ${row.district_code}\n`);
    });
    
    // Check for Metro Sub-regions
    const subRegionsResult = await pool.query(`
      SELECT 
        municipality_code,
        municipality_name,
        municipality_type,
        parent_municipality_id,
        district_code
      FROM municipalities 
      WHERE municipality_type = 'Metro Sub-region'
      ORDER BY parent_municipality_id, municipality_name
      LIMIT 20
    `);
    
    console.log('\nMetro Sub-regions (first 20):');
    subRegionsResult.rows.forEach(row => {
      console.log(`  ${row.municipality_code} - ${row.municipality_name}`);
      console.log(`    Parent ID: ${row.parent_municipality_id}`);
      console.log(`    District: ${row.district_code}\n`);
    });
    
    // Check wards for metro sub-regions
    const wardsResult = await pool.query(`
      SELECT 
        m.municipality_code,
        m.municipality_name,
        m.parent_municipality_id,
        COUNT(w.ward_code) as ward_count
      FROM municipalities m
      LEFT JOIN wards w ON w.municipality_code = m.municipality_code
      WHERE m.municipality_type = 'Metro Sub-region'
      GROUP BY m.municipality_code, m.municipality_name, m.parent_municipality_id
      HAVING COUNT(w.ward_code) > 0
      ORDER BY ward_count DESC
      LIMIT 10
    `);
    
    console.log('\nMetro Sub-regions with wards (top 10):');
    wardsResult.rows.forEach(row => {
      console.log(`  ${row.municipality_code} - ${row.municipality_name}`);
      console.log(`    Parent ID: ${row.parent_municipality_id}`);
      console.log(`    Ward Count: ${row.ward_count}\n`);
    });
    
    // Get sample wards for a metro sub-region
    if (wardsResult.rows.length > 0) {
      const sampleMuniCode = wardsResult.rows[0].municipality_code;
      const sampleWardsResult = await pool.query(`
        SELECT ward_code, ward_name, ward_number
        FROM wards
        WHERE municipality_code = $1
        ORDER BY ward_number
        LIMIT 5
      `, [sampleMuniCode]);
      
      console.log(`\nSample wards for ${sampleMuniCode}:`);
      sampleWardsResult.rows.forEach(row => {
        console.log(`  ${row.ward_code} - ${row.ward_name} (Ward ${row.ward_number})`);
      });
    }
    
    // Check if there's a parent municipality for JHB
    const parentResult = await pool.query(`
      SELECT 
        municipality_id,
        municipality_code,
        municipality_name,
        municipality_type
      FROM municipalities 
      WHERE municipality_type = 'Metropolitan'
      AND (municipality_name LIKE '%Johannesburg%' OR municipality_code LIKE '%JHB%')
    `);
    
    console.log('\n\nMetropolitan municipalities (Johannesburg):');
    parentResult.rows.forEach(row => {
      console.log(`  ID: ${row.municipality_id}`);
      console.log(`  Code: ${row.municipality_code}`);
      console.log(`  Name: ${row.municipality_name}`);
      console.log(`  Type: ${row.municipality_type}\n`);
    });
    
    // Now check for sub-regions with this parent ID
    if (parentResult.rows.length > 0) {
      const parentId = parentResult.rows[0].municipality_id;
      const subRegionsForParent = await pool.query(`
        SELECT 
          municipality_code,
          municipality_name,
          municipality_type
        FROM municipalities 
        WHERE parent_municipality_id = $1
        ORDER BY municipality_name
      `, [parentId]);
      
      console.log(`\nSub-regions for parent ID ${parentId}:`);
      subRegionsForParent.rows.forEach(row => {
        console.log(`  ${row.municipality_code} - ${row.municipality_name} (${row.municipality_type})`);
      });
      
      // Get total wards for all sub-regions
      const totalWardsResult = await pool.query(`
        SELECT COUNT(DISTINCT w.ward_code) as total_wards
        FROM municipalities m
        JOIN wards w ON w.municipality_code = m.municipality_code
        WHERE m.parent_municipality_id = $1
      `, [parentId]);
      
      console.log(`\n📊 Total wards across all sub-regions: ${totalWardsResult.rows[0].total_wards}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkMetroStructure();

