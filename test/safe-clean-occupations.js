const mysql = require('mysql2/promise');

async function safeCleanOccupations() {
  console.log('🧹 Safe Occupations Cleanup (preserving referenced records)...');

  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    // First, let's see which occupation IDs are referenced by members
    console.log('🔍 Checking which occupations are referenced by members...');
    const [referencedOccupations] = await connection.execute(`
      SELECT DISTINCT o.occupation_id, o.occupation_name 
      FROM occupations o 
      INNER JOIN members m ON o.occupation_id = m.occupation_id
      ORDER BY o.occupation_id
    `);
    
    console.log(`📌 Found ${referencedOccupations.length} occupations referenced by members:`);
    referencedOccupations.forEach((occ, i) => {
      console.log(`${i+1}. ID: ${occ.occupation_id}, Name: "${occ.occupation_name}"`);
    });

    // Check which occupations are NOT referenced and are invalid
    console.log('\n🗑️ Finding unreferenced invalid occupations to delete...');
    const [unreferencedInvalid] = await connection.execute(`
      SELECT o.occupation_id, o.occupation_name 
      FROM occupations o 
      LEFT JOIN members m ON o.occupation_id = m.occupation_id
      WHERE m.occupation_id IS NULL
        AND (
          o.occupation_name REGEXP '[0-9]'
          OR o.occupation_name LIKE '%@%'
          OR o.occupation_name LIKE '%/%'
          OR o.occupation_name LIKE '%.%'
          OR o.occupation_name LIKE '%-%-%'
          OR LENGTH(o.occupation_name) < 2
        )
      ORDER BY o.occupation_id
      LIMIT 20
    `);
    
    console.log(`🚨 Found ${unreferencedInvalid.length} unreferenced invalid occupations (showing first 20):`);
    unreferencedInvalid.forEach((occ, i) => {
      console.log(`${i+1}. ID: ${occ.occupation_id}, Name: "${occ.occupation_name}"`);
    });

    // Delete only unreferenced invalid occupations
    if (unreferencedInvalid.length > 0) {
      console.log('\n🗑️ Deleting unreferenced invalid occupations...');
      const [deleteResult] = await connection.execute(`
        DELETE FROM occupations 
        WHERE occupation_id NOT IN (
          SELECT DISTINCT occupation_id FROM members WHERE occupation_id IS NOT NULL
        )
        AND (
          occupation_name REGEXP '[0-9]'
          OR occupation_name LIKE '%@%'
          OR occupation_name LIKE '%/%'
          OR occupation_name LIKE '%.%'
          OR occupation_name LIKE '%-%-%'
          OR LENGTH(occupation_name) < 2
        )
      `);
      
      console.log(`✅ Deleted ${deleteResult.affectedRows} unreferenced invalid occupations`);
    }

    // For referenced invalid occupations, let's update them to "Other" or a generic name
    console.log('\n🔧 Fixing referenced invalid occupations...');
    const [referencedInvalid] = await connection.execute(`
      SELECT o.occupation_id, o.occupation_name 
      FROM occupations o 
      INNER JOIN members m ON o.occupation_id = m.occupation_id
      WHERE o.occupation_name REGEXP '[0-9]'
         OR o.occupation_name LIKE '%@%'
         OR o.occupation_name LIKE '%/%'
         OR o.occupation_name LIKE '%.%'
         OR o.occupation_name LIKE '%-%-%'
         OR LENGTH(o.occupation_name) < 2
      GROUP BY o.occupation_id, o.occupation_name
    `);

    if (referencedInvalid.length > 0) {
      console.log(`🔧 Found ${referencedInvalid.length} referenced invalid occupations to fix:`);
      
      for (const occ of referencedInvalid) {
        console.log(`  Fixing ID: ${occ.occupation_id}, Name: "${occ.occupation_name}" -> "Other"`);
        await connection.execute(
          'UPDATE occupations SET occupation_name = ? WHERE occupation_id = ?',
          ['Other', occ.occupation_id]
        );
      }
      console.log(`✅ Fixed ${referencedInvalid.length} referenced invalid occupations`);
    }

    // Final count and sample
    const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM occupations');
    console.log(`\n📊 Final occupation count: ${finalCount[0].count}`);

    // Show first 20 occupations
    const [sample] = await connection.execute(
      'SELECT occupation_id, occupation_name FROM occupations ORDER BY occupation_name LIMIT 20'
    );
    
    console.log('\n📋 Sample occupations after cleanup:');
    sample.forEach((occ, i) => {
      console.log(`${i+1}. ID: ${occ.occupation_id}, Name: "${occ.occupation_name}"`);
    });

    await connection.end();
    console.log('\n🎉 Safe cleanup completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

safeCleanOccupations();
