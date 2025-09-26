const mysql = require('mysql2/promise');

// Clean, professional occupation list
const CLEAN_OCCUPATIONS = [
  'Accountant', 'Administrator', 'Advocate', 'Apprentice', 'Architect', 'Artisan',
  'Assistant Manager', 'Attorney', 'Auditor', 'Bartender', 'Boilermaker', 'Bricklayer',
  'Bus Driver', 'Business Owner', 'Carpenter', 'Cashier', 'Chef', 'Civil Engineer',
  'Cleaner', 'Clerk', 'Community Health Worker', 'Computer Programmer', 'Construction Worker',
  'Consultant', 'Cook', 'Correctional Officer', 'Data Capturer', 'Delivery Driver',
  'Dentist', 'Director', 'Doctor', 'Domestic Worker', 'Driver', 'Educator',
  'Electrical Engineer', 'Electrician', 'Engineer', 'Entrepreneur', 'Farmer',
  'Financial Advisor', 'Firefighter', 'Fitter', 'Foreman', 'General Manager',
  'General Worker', 'Hairdresser', 'Housekeeper', 'HR Manager', 'IT Technician',
  'Journalist', 'Labourer', 'Lawyer', 'Lecturer', 'Librarian', 'Machine Operator',
  'Manager', 'Marketing Manager', 'Mechanic', 'Medical Technologist', 'Miner',
  'Nurse', 'Office Assistant', 'Operations Manager', 'Painter', 'Paramedic',
  'Pastor', 'Pensioner', 'Personal Assistant', 'Pharmacist', 'Plumber',
  'Police Officer', 'Principal', 'Professional Nurse', 'Professor', 'Project Manager',
  'Psychologist', 'Receptionist', 'Retired', 'Sales Assistant', 'Sales Consultant',
  'Sales Manager', 'Secretary', 'Security Guard', 'Self-Employed', 'Shop Assistant',
  'Social Worker', 'Software Developer', 'Store Manager', 'Student', 'Supervisor',
  'Taxi Driver', 'Teacher', 'Team Leader', 'Technician', 'Teller', 'Trainer',
  'Truck Driver', 'Unemployed', 'Waiter', 'Waitress', 'Welder', 'Other'
];

async function safeCleanup() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected! Starting safe cleanup...\n');

    // Step 1: Create backup
    const backupTable = `occupations_backup_${Date.now()}`;
    console.log(`💾 Creating backup: ${backupTable}`);
    await connection.execute(`CREATE TABLE ${backupTable} AS SELECT * FROM occupations`);

    // Step 2: Disable foreign key checks temporarily
    console.log('🔓 Temporarily disabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Step 3: Get current max ID to continue sequence
    const [maxId] = await connection.execute('SELECT MAX(occupation_id) as max_id FROM occupations');
    let nextId = (maxId[0].max_id || 0) + 1;

    // Step 4: Clear occupations table
    console.log('🗑️ Clearing occupations table...');
    await connection.execute('DELETE FROM occupations');

    // Step 5: Insert clean occupations with sequential IDs
    console.log('✨ Inserting clean occupations...');
    for (let i = 0; i < CLEAN_OCCUPATIONS.length; i++) {
      await connection.execute(`
        INSERT INTO occupations (occupation_id, occupation_name, category_id, created_at) 
        VALUES (?, ?, 1, NOW())
      `, [i + 1, CLEAN_OCCUPATIONS[i]]);
    }

    // Step 6: Get "Other" occupation ID
    const [otherResult] = await connection.execute(`
      SELECT occupation_id FROM occupations WHERE occupation_name = 'Other'
    `);
    const otherId = otherResult[0].occupation_id;

    // Step 7: Update all member references to "Other" (preserves referential integrity)
    console.log('🔄 Updating member references...');
    await connection.execute(`UPDATE members SET occupation_id = ?`, [otherId]);

    // Step 8: Re-enable foreign key checks
    console.log('🔒 Re-enabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // Step 9: Reset auto increment
    await connection.execute(`ALTER TABLE occupations AUTO_INCREMENT = ${CLEAN_OCCUPATIONS.length + 1}`);

    // Show results
    const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM occupations');
    const [memberCount] = await connection.execute('SELECT COUNT(*) as count FROM members WHERE occupation_id = ?', [otherId]);
    
    console.log('\n📊 Cleanup Results:');
    console.log(`✅ Clean occupations: ${finalCount[0].count}`);
    console.log(`✅ Members updated: ${memberCount[0].count} now reference "Other"`);
    console.log(`✅ Backup created: ${backupTable}`);
    console.log(`✅ Foreign key integrity maintained`);

    console.log('\n🎯 New occupation list:');
    const [cleanList] = await connection.execute(`
      SELECT occupation_id, occupation_name FROM occupations ORDER BY occupation_name
    `);
    cleanList.forEach(occ => {
      console.log(`  ${occ.occupation_id}. ${occ.occupation_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    // Try to re-enable foreign keys if there was an error
    try {
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) {
      console.error('Failed to re-enable foreign keys:', e.message);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

console.log('🚀 Starting safe occupation cleanup...');
safeCleanup();
