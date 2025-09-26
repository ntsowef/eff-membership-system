const mysql = require('mysql2/promise');

async function cleanOccupationsData() {
  console.log('🧹 Cleaning Occupations Table Data...\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // First, let's see how many invalid entries we have
    const [invalidCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM occupations 
      WHERE occupation_name REGEXP '^[^A-Za-z]' 
         OR occupation_name REGEXP '[0-9@.]'
         OR LENGTH(occupation_name) < 2
         OR occupation_name LIKE '%@%'
         OR occupation_name LIKE '%/%'
         OR occupation_name LIKE '%-%-%'
         OR occupation_name REGEXP '^[0-9]'
    `);
    
    console.log(`🚨 Found ${invalidCount[0].count} invalid occupation entries to remove`);

    // Get count of valid entries before cleanup
    const [validCountBefore] = await connection.execute(`
      SELECT COUNT(*) as count FROM occupations 
      WHERE occupation_name REGEXP '^[A-Za-z]' 
        AND occupation_name NOT REGEXP '[0-9@.]'
        AND LENGTH(occupation_name) >= 2
        AND occupation_name NOT LIKE '%@%'
        AND occupation_name NOT LIKE '%/%'
        AND occupation_name NOT LIKE '%-%-%'
        AND occupation_name NOT REGEXP '^[0-9]'
    `);
    
    console.log(`✅ Found ${validCountBefore[0].count} valid occupation entries to keep`);

    // Delete invalid entries
    console.log('\n🗑️ Removing invalid occupation entries...');
    const [deleteResult] = await connection.execute(`
      DELETE FROM occupations 
      WHERE occupation_name REGEXP '^[^A-Za-z]' 
         OR occupation_name REGEXP '[0-9@.]'
         OR LENGTH(occupation_name) < 2
         OR occupation_name LIKE '%@%'
         OR occupation_name LIKE '%/%'
         OR occupation_name LIKE '%-%-%'
         OR occupation_name REGEXP '^[0-9]'
    `);
    
    console.log(`✅ Removed ${deleteResult.affectedRows} invalid entries`);

    // Get final count
    const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM occupations');
    console.log(`📊 Final occupation count: ${finalCount[0].count}`);

    // Show first 20 remaining entries
    console.log('\n📋 First 20 remaining occupation entries:');
    const [remainingOccupations] = await connection.execute(
      'SELECT occupation_id, occupation_name, category_id FROM occupations ORDER BY occupation_name LIMIT 20'
    );
    
    remainingOccupations.forEach((occ, index) => {
      console.log(`${index + 1}. ID: ${occ.occupation_id}, Name: "${occ.occupation_name}", Category: ${occ.category_id}`);
    });

    // Add some common occupations if we don't have enough
    if (finalCount[0].count < 50) {
      console.log('\n➕ Adding common South African occupations...');
      
      const commonOccupations = [
        'Administrative Assistant',
        'Business Analyst', 
        'Call Centre Agent',
        'Community Worker',
        'Construction Worker',
        'Consultant',
        'Customer Service Representative',
        'Data Analyst',
        'Domestic Worker',
        'Financial Advisor',
        'General Worker',
        'Government Official',
        'Healthcare Worker',
        'IT Specialist',
        'Journalist',
        'Laboratory Technician',
        'Marketing Specialist',
        'Project Manager',
        'Receptionist',
        'Sales Representative',
        'Social Worker',
        'Supervisor',
        'Technician',
        'Translator',
        'Welder'
      ];

      for (const occupation of commonOccupations) {
        // Check if occupation already exists
        const [existing] = await connection.execute(
          'SELECT COUNT(*) as count FROM occupations WHERE occupation_name = ?',
          [occupation]
        );
        
        if (existing[0].count === 0) {
          await connection.execute(
            'INSERT INTO occupations (occupation_name, category_id) VALUES (?, ?)',
            [occupation, 1] // Category 1 for professional occupations
          );
          console.log(`  ✅ Added: ${occupation}`);
        }
      }
    }

    // Final verification
    const [verificationCount] = await connection.execute('SELECT COUNT(*) as count FROM occupations');
    console.log(`\n🎉 Cleanup completed! Final occupation count: ${verificationCount[0].count}`);

  } catch (error) {
    console.error('❌ Error cleaning occupations data:', error.message);
  } finally {
    await connection.end();
  }
}

cleanOccupationsData();
