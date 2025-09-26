const mysql = require('mysql2/promise');

async function checkOccupationsData() {
  console.log('🔍 Checking Occupations Table Data...\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // Check total count
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM occupations');
    console.log(`📊 Total occupations: ${countResult[0].total}`);

    // Check first 20 records
    console.log('\n📋 First 20 occupation records:');
    const [occupations] = await connection.execute(
      'SELECT occupation_id, occupation_name, category_id FROM occupations ORDER BY occupation_id LIMIT 20'
    );
    
    occupations.forEach((occ, index) => {
      console.log(`${index + 1}. ID: ${occ.occupation_id}, Name: "${occ.occupation_name}", Category: ${occ.category_id}`);
    });

    // Check for suspicious entries (non-alphabetic occupation names)
    console.log('\n🚨 Checking for suspicious entries (non-alphabetic names):');
    const [suspiciousOccupations] = await connection.execute(`
      SELECT occupation_id, occupation_name, category_id 
      FROM occupations 
      WHERE occupation_name REGEXP '^[^A-Za-z]' 
         OR occupation_name REGEXP '[0-9@.]'
         OR LENGTH(occupation_name) < 2
      ORDER BY occupation_id 
      LIMIT 20
    `);
    
    if (suspiciousOccupations.length > 0) {
      console.log(`Found ${suspiciousOccupations.length} suspicious entries:`);
      suspiciousOccupations.forEach((occ, index) => {
        console.log(`${index + 1}. ID: ${occ.occupation_id}, Name: "${occ.occupation_name}", Category: ${occ.category_id}`);
      });
    } else {
      console.log('No suspicious entries found.');
    }

    // Check for valid occupation entries
    console.log('\n✅ Valid occupation entries (alphabetic names):');
    const [validOccupations] = await connection.execute(`
      SELECT occupation_id, occupation_name, category_id 
      FROM occupations 
      WHERE occupation_name REGEXP '^[A-Za-z]' 
        AND occupation_name NOT REGEXP '[0-9@.]'
        AND LENGTH(occupation_name) >= 3
      ORDER BY occupation_name 
      LIMIT 20
    `);
    
    if (validOccupations.length > 0) {
      console.log(`Found ${validOccupations.length} valid entries (showing first 20):`);
      validOccupations.forEach((occ, index) => {
        console.log(`${index + 1}. ID: ${occ.occupation_id}, Name: "${occ.occupation_name}", Category: ${occ.category_id}`);
      });
    } else {
      console.log('No valid entries found.');
    }

    // Check table structure
    console.log('\n🏗️ Table structure:');
    const [structure] = await connection.execute('DESCRIBE occupations');
    structure.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

  } catch (error) {
    console.error('❌ Error checking occupations data:', error.message);
  } finally {
    await connection.end();
  }
}

checkOccupationsData();
