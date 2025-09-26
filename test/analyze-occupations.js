const mysql = require('mysql2/promise');

async function analyzeOccupations() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('🔍 Analyzing current occupation data...\n');

    // Get all occupations
    const [occupations] = await connection.execute(`
      SELECT occupation_id, occupation_name, COUNT(*) as count
      FROM occupations
      GROUP BY occupation_name
      ORDER BY occupation_name
    `);

    console.log(`📊 Total unique occupation names: ${occupations.length}`);
    
    // Categorize occupations
    const legitimate = [];
    const duplicates = [];
    const questionable = [];
    const variations = new Map();

    occupations.forEach(occ => {
      const name = occ.occupation_name.trim();
      const lowerName = name.toLowerCase();
      
      // Check for obvious invalid entries
      if (
        name === 'Other' ||
        name.includes('@') ||
        name.includes('.com') ||
        name.includes('http') ||
        name.match(/^\d+/) ||
        name.includes('Street') ||
        name.includes('Avenue') ||
        name.includes('Road') ||
        name.match(/\d{4}-\d{2}-\d{2}/) ||
        name.match(/\d{10,}/) ||
        name.length < 2 ||
        name.length > 50
      ) {
        questionable.push(name);
        return;
      }

      // Check for variations of the same occupation
      const baseWords = lowerName.replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2);
      const key = baseWords.sort().join('_');
      
      if (variations.has(key)) {
        variations.get(key).push(name);
      } else {
        variations.set(key, [name]);
      }
    });

    // Find duplicates and variations
    variations.forEach((names, key) => {
      if (names.length > 1) {
        duplicates.push({ key, names });
      } else {
        legitimate.push(names[0]);
      }
    });

    console.log(`\n📋 Analysis Results:`);
    console.log(`✅ Legitimate occupations: ${legitimate.length}`);
    console.log(`🔄 Duplicate/variation groups: ${duplicates.length}`);
    console.log(`❌ Questionable entries: ${questionable.length}`);

    console.log(`\n🔄 Sample duplicate groups:`);
    duplicates.slice(0, 10).forEach(group => {
      console.log(`  - ${group.names.join(' | ')}`);
    });

    console.log(`\n❌ Sample questionable entries:`);
    questionable.slice(0, 20).forEach(name => {
      console.log(`  - "${name}"`);
    });

    // Show some legitimate occupations
    console.log(`\n✅ Sample legitimate occupations:`);
    legitimate.slice(0, 20).forEach(name => {
      console.log(`  - ${name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

analyzeOccupations();
