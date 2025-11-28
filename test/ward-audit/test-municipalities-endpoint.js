const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function testMunicipalitiesQuery() {
  try {
    console.log('\n=== Testing Municipalities Query for Gauteng (GP) ===\n');
    
    // Step 1: Get all municipalities for GP
    const query = `
      SELECT
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        COALESCE(d.province_code, pd.province_code) as province_code,
        m.municipality_type,
        m.parent_municipality_id,
        pm.municipality_code as parent_municipality_code,
        pm.municipality_name as parent_municipality_name
      FROM municipalities m
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts pd ON pm.district_code = pd.district_code
      WHERE COALESCE(d.province_code, pd.province_code) = $1
      ORDER BY m.municipality_name
    `;
    
    const result = await pool.query(query, ['GP']);
    const municipalities = result.rows;
    
    console.log(`Total municipalities found: ${municipalities.length}\n`);
    
    // Step 2: Separate by type
    const metroParents = municipalities.filter(m => m.municipality_type === 'Metropolitan');
    const metroSubregions = municipalities.filter(m => m.municipality_type === 'Metro Sub-Region');
    const regularMunicipalities = municipalities.filter(m => 
      m.municipality_type === 'Local' || m.municipality_type === 'District'
    );
    
    console.log(`Metro Parents: ${metroParents.length}`);
    metroParents.forEach(m => {
      console.log(`  - ${m.municipality_code}: ${m.municipality_name}`);
    });
    
    console.log(`\nMetro Sub-Regions: ${metroSubregions.length}`);
    metroSubregions.forEach(m => {
      console.log(`  - ${m.municipality_code}: ${m.municipality_name} (Parent: ${m.parent_municipality_code})`);
    });
    
    console.log(`\nRegular Municipalities: ${regularMunicipalities.length}`);
    regularMunicipalities.slice(0, 5).forEach(m => {
      console.log(`  - ${m.municipality_code}: ${m.municipality_name}`);
    });
    if (regularMunicipalities.length > 5) {
      console.log(`  ... and ${regularMunicipalities.length - 5} more`);
    }
    
    // Step 3: Filter and enhance
    const metroParentCodes = metroParents.map(m => m.municipality_code);
    
    let filteredMunicipalities = [
      ...metroSubregions,
      ...regularMunicipalities.filter(m => !metroParentCodes.includes(m.municipality_code))
    ];
    
    console.log(`\n=== After Filtering ===`);
    console.log(`Filtered municipalities: ${filteredMunicipalities.length}`);
    console.log(`(Excluded ${metroParents.length} parent metros)\n`);
    
    // Step 4: Enhance names
    filteredMunicipalities = filteredMunicipalities.map(m => {
      if (m.municipality_type === 'Metro Sub-Region' && m.parent_municipality_code) {
        const parentMetro = metroParents.find(p => p.municipality_code === m.parent_municipality_code);
        if (parentMetro) {
          const parentName = parentMetro.municipality_name
            .replace('City of ', '')
            .replace('Metropolitan Municipality', '')
            .trim();
          return {
            ...m,
            municipality_name: `${parentName} - ${m.municipality_name} (${m.municipality_code})`
          };
        }
      }
      return m;
    });
    
    console.log('=== Enhanced Sub-Region Names ===');
    filteredMunicipalities
      .filter(m => m.municipality_type === 'Metro Sub-Region')
      .forEach(m => {
        console.log(`  - ${m.municipality_name}`);
      });
    
    console.log('\n=== First 10 Results (as would be returned by API) ===');
    filteredMunicipalities.slice(0, 10).forEach((m, i) => {
      console.log(`${i + 1}. ${m.municipality_name} (${m.municipality_code}) - ${m.municipality_type}`);
    });
    
    console.log('\n✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testMunicipalitiesQuery();

