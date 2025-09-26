const mysql = require('mysql2/promise');

async function analyzeOccupations() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected! Fetching occupations...');

    // Get all unique occupation names
    const [occupations] = await connection.execute(`
      SELECT DISTINCT occupation_name 
      FROM occupations 
      ORDER BY occupation_name
    `);

    console.log(`📊 Found ${occupations.length} unique occupations\n`);

    // Categorize occupations
    const legitimate = [];
    const duplicates = [];
    const questionable = [];

    occupations.forEach(row => {
      const name = row.occupation_name.trim();
      
      // Check for invalid entries
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
        name.length > 50 ||
        name.toLowerCase().includes('unemployed') ||
        name.toLowerCase().includes('unempl') ||
        name.toLowerCase().includes('employed') && !name.toLowerCase().includes('self') ||
        name.toLowerCase() === 'na' ||
        name.toLowerCase() === 'no' ||
        name.toLowerCase() === 'none' ||
        name.toLowerCase() === 'not' ||
        name.toLowerCase().includes('not applicable') ||
        name.toLowerCase().includes('not specified') ||
        name.toLowerCase().includes('not provided')
      ) {
        questionable.push(name);
      } else {
        legitimate.push(name);
      }
    });

    console.log(`📋 Analysis Results:`);
    console.log(`✅ Legitimate occupations: ${legitimate.length}`);
    console.log(`❌ Questionable entries: ${questionable.length}\n`);

    console.log(`❌ Questionable entries (first 30):`);
    questionable.slice(0, 30).forEach((name, index) => {
      console.log(`  ${index + 1}. "${name}"`);
    });

    console.log(`\n✅ Legitimate occupations (first 30):`);
    legitimate.slice(0, 30).forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

console.log('🚀 Starting occupation analysis...');
analyzeOccupations();
