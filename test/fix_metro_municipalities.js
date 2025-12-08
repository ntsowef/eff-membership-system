const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function fixMetroMunicipalities() {
  const client = await pool.connect();
  
  try {
    console.log('=== Fixing Metro Municipality Geographic Data ===\n');
    
    // First, let's understand the metro municipality structure
    console.log('Checking metro municipality structure...\n');
    
    const metroCheckResult = await client.query(`
      SELECT 
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        d.district_name,
        d.province_code,
        p.province_name
      FROM municipalities m
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE m.municipality_code LIKE 'JHB%'
         OR m.municipality_code LIKE 'TSH%'
         OR m.municipality_code LIKE 'EKU%'
         OR m.municipality_code LIKE 'CPT%'
         OR m.municipality_code LIKE 'NMA%'
         OR m.municipality_code LIKE 'BUF%'
         OR m.municipality_code LIKE 'MAN%'
         OR m.municipality_code LIKE 'ETH%'
      ORDER BY m.municipality_code
      LIMIT 20
    `);
    
    console.log('Sample Metro Municipalities:');
    console.table(metroCheckResult.rows);
    
    // Strategy: For metro municipalities, we need to:
    // 1. Get the parent metro code (e.g., JHB from JHB005)
    // 2. Look up the parent metro as a district
    // 3. Get province from the district
    
    console.log('\n=== Starting Update for Metro Municipalities ===\n');
    
    // Update records where municipality exists but district is NULL
    // This handles metro sub-regions (JHB005, TSH003, etc.)
    const updateResult = await client.query(`
      UPDATE members_consolidated mc
      SET 
        district_code = CASE 
          WHEN m.municipality_code LIKE 'JHB%' THEN 'JHB'
          WHEN m.municipality_code LIKE 'TSH%' THEN 'TSH'
          WHEN m.municipality_code LIKE 'EKU%' THEN 'EKU'
          WHEN m.municipality_code LIKE 'CPT%' THEN 'CPT'
          WHEN m.municipality_code LIKE 'NMA%' THEN 'NMA'
          WHEN m.municipality_code LIKE 'BUF%' THEN 'BUF'
          WHEN m.municipality_code LIKE 'MAN%' THEN 'MAN'
          WHEN m.municipality_code LIKE 'ETH%' THEN 'ETH'
        END,
        district_name = CASE 
          WHEN m.municipality_code LIKE 'JHB%' THEN 'City of Johannesburg'
          WHEN m.municipality_code LIKE 'TSH%' THEN 'City of Tshwane'
          WHEN m.municipality_code LIKE 'EKU%' THEN 'Ekurhuleni'
          WHEN m.municipality_code LIKE 'CPT%' THEN 'City of Cape Town'
          WHEN m.municipality_code LIKE 'NMA%' THEN 'Nelson Mandela Bay'
          WHEN m.municipality_code LIKE 'BUF%' THEN 'Buffalo City'
          WHEN m.municipality_code LIKE 'MAN%' THEN 'Mangaung'
          WHEN m.municipality_code LIKE 'ETH%' THEN 'eThekwini'
        END,
        province_code = CASE 
          WHEN m.municipality_code LIKE 'JHB%' THEN 'GT'
          WHEN m.municipality_code LIKE 'TSH%' THEN 'GT'
          WHEN m.municipality_code LIKE 'EKU%' THEN 'GT'
          WHEN m.municipality_code LIKE 'CPT%' THEN 'WC'
          WHEN m.municipality_code LIKE 'NMA%' THEN 'EC'
          WHEN m.municipality_code LIKE 'BUF%' THEN 'EC'
          WHEN m.municipality_code LIKE 'MAN%' THEN 'FS'
          WHEN m.municipality_code LIKE 'ETH%' THEN 'KZN'
        END,
        province_name = CASE 
          WHEN m.municipality_code LIKE 'JHB%' THEN 'Gauteng'
          WHEN m.municipality_code LIKE 'TSH%' THEN 'Gauteng'
          WHEN m.municipality_code LIKE 'EKU%' THEN 'Gauteng'
          WHEN m.municipality_code LIKE 'CPT%' THEN 'Western Cape'
          WHEN m.municipality_code LIKE 'NMA%' THEN 'Eastern Cape'
          WHEN m.municipality_code LIKE 'BUF%' THEN 'Eastern Cape'
          WHEN m.municipality_code LIKE 'MAN%' THEN 'Free State'
          WHEN m.municipality_code LIKE 'ETH%' THEN 'KwaZulu-Natal'
        END
      FROM wards w
      JOIN municipalities m ON w.municipality_code = m.municipality_code
      WHERE mc.ward_code = w.ward_code
        AND (mc.district_code IS NULL OR mc.province_code IS NULL)
        AND (
          m.municipality_code LIKE 'JHB%'
          OR m.municipality_code LIKE 'TSH%'
          OR m.municipality_code LIKE 'EKU%'
          OR m.municipality_code LIKE 'CPT%'
          OR m.municipality_code LIKE 'NMA%'
          OR m.municipality_code LIKE 'BUF%'
          OR m.municipality_code LIKE 'MAN%'
          OR m.municipality_code LIKE 'ETH%'
        )
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount.toLocaleString()} metro municipality records\n`);
    
    // Verify the fix
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count
      FROM members_consolidated
      WHERE municipality_code IS NULL 
        OR district_code IS NULL 
        OR province_code IS NULL
    `);
    
    console.log('=== Verification ===');
    console.log(`Records still needing fix: ${verifyResult.rows[0].count.toLocaleString()}\n`);
    
    if (parseInt(verifyResult.rows[0].count) === 0) {
      console.log('🎉 All geographic data has been fixed!');
    } else {
      console.log(`⚠️  ${verifyResult.rows[0].count.toLocaleString()} records still need fixing`);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

fixMetroMunicipalities().catch(console.error);

