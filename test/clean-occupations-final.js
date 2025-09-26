const mysql = require('mysql2/promise');

// Comprehensive list of legitimate occupations (alphabetically organized)
const CLEAN_OCCUPATIONS = [
  'Accountant',
  'Administrator', 
  'Advocate',
  'Agent',
  'Apprentice',
  'Architect',
  'Artisan',
  'Assistant Manager',
  'Attorney',
  'Auditor',
  'Bartender',
  'Boilermaker',
  'Bricklayer',
  'Bus Driver',
  'Business Owner',
  'Carpenter',
  'Cashier',
  'Chef',
  'Civil Engineer',
  'Cleaner',
  'Clerk',
  'Community Health Worker',
  'Computer Programmer',
  'Construction Worker',
  'Consultant',
  'Cook',
  'Correctional Officer',
  'Data Capturer',
  'Delivery Driver',
  'Dentist',
  'Director',
  'Doctor',
  'Domestic Worker',
  'Driver',
  'Educator',
  'Electrical Engineer',
  'Electrician',
  'Engineer',
  'Entrepreneur',
  'Farmer',
  'Financial Advisor',
  'Firefighter',
  'Fitter',
  'Foreman',
  'General Manager',
  'General Worker',
  'Hairdresser',
  'Housekeeper',
  'HR Manager',
  'IT Technician',
  'Journalist',
  'Labourer',
  'Lawyer',
  'Lecturer',
  'Librarian',
  'Machine Operator',
  'Manager',
  'Marketing Manager',
  'Mechanic',
  'Medical Technologist',
  'Miner',
  'Nurse',
  'Office Assistant',
  'Operations Manager',
  'Painter',
  'Paramedic',
  'Pastor',
  'Pensioner',
  'Personal Assistant',
  'Pharmacist',
  'Plumber',
  'Police Officer',
  'Principal',
  'Professional Nurse',
  'Professor',
  'Project Manager',
  'Psychologist',
  'Receptionist',
  'Retired',
  'Sales Assistant',
  'Sales Consultant',
  'Sales Manager',
  'Secretary',
  'Security Guard',
  'Self-Employed',
  'Shop Assistant',
  'Social Worker',
  'Software Developer',
  'Store Manager',
  'Student',
  'Supervisor',
  'Taxi Driver',
  'Teacher',
  'Team Leader',
  'Technician',
  'Teller',
  'Trainer',
  'Truck Driver',
  'Unemployed',
  'Waiter',
  'Waitress',
  'Welder',
  'Other'
];

async function cleanOccupations() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected! Starting cleanup...\n');

    // Create backup table
    const backupTable = `occupations_backup_${Date.now()}`;
    console.log(`💾 Creating backup table: ${backupTable}`);
    await connection.execute(`CREATE TABLE ${backupTable} AS SELECT * FROM occupations`);

    // Get current occupation references from members
    console.log('📊 Checking member occupation references...');
    const [memberOccupations] = await connection.execute(`
      SELECT DISTINCT occupation_id FROM members WHERE occupation_id IS NOT NULL
    `);
    console.log(`Found ${memberOccupations.length} occupation IDs referenced by members`);

    // Clear and rebuild occupations table
    console.log('🗑️ Clearing occupations table...');
    await connection.execute('DELETE FROM occupations');
    await connection.execute('ALTER TABLE occupations AUTO_INCREMENT = 1');

    console.log('✨ Inserting clean occupations...');
    for (const occupation of CLEAN_OCCUPATIONS) {
      await connection.execute(`
        INSERT INTO occupations (occupation_name, category_id, created_at) 
        VALUES (?, 1, NOW())
      `, [occupation]);
    }

    // Get the "Other" occupation ID for unmapped references
    const [otherResult] = await connection.execute(`
      SELECT occupation_id FROM occupations WHERE occupation_name = 'Other'
    `);
    const otherId = otherResult[0].occupation_id;

    // Update all member references to point to "Other" for now
    // (This preserves referential integrity)
    console.log('🔄 Updating member references to maintain integrity...');
    await connection.execute(`
      UPDATE members SET occupation_id = ? WHERE occupation_id IS NOT NULL
    `, [otherId]);

    // Show results
    const [newCount] = await connection.execute('SELECT COUNT(*) as count FROM occupations');
    const [memberCount] = await connection.execute('SELECT COUNT(*) as count FROM members WHERE occupation_id = ?', [otherId]);
    
    console.log('\n📊 Cleanup Results:');
    console.log(`✅ Clean occupations created: ${newCount[0].count}`);
    console.log(`✅ Member references updated: ${memberCount[0].count} members now reference "Other"`);
    console.log(`✅ Backup table created: ${backupTable}`);
    console.log(`✅ All referential integrity maintained`);

    console.log('\n🎯 Clean occupation list:');
    const [cleanOccupations] = await connection.execute(`
      SELECT occupation_name FROM occupations ORDER BY occupation_name
    `);
    cleanOccupations.forEach((occ, index) => {
      console.log(`  ${index + 1}. ${occ.occupation_name}`);
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

console.log('🚀 Starting occupation cleanup...');
cleanOccupations();
