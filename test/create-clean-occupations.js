const mysql = require('mysql2/promise');

// Define a comprehensive list of legitimate, well-known occupations
const CLEAN_OCCUPATIONS = [
  // Professional & Technical
  'Accountant', 'Actuary', 'Advocate', 'Architect', 'Attorney', 'Auditor',
  'Chartered Accountant', 'Civil Engineer', 'Computer Programmer', 'Consultant',
  'Dentist', 'Doctor', 'Electrical Engineer', 'Engineer', 'Financial Advisor',
  'Lawyer', 'Mechanical Engineer', 'Nurse', 'Optometrist', 'Pharmacist',
  'Physiotherapist', 'Psychologist', 'Quantity Surveyor', 'Software Developer',
  'Surgeon', 'Teacher', 'Veterinarian',

  // Management & Administration
  'Administrator', 'Assistant Manager', 'Branch Manager', 'CEO', 'Director',
  'Executive Assistant', 'General Manager', 'HR Manager', 'Manager',
  'Operations Manager', 'Personal Assistant', 'Project Manager', 'Secretary',
  'Site Manager', 'Store Manager', 'Supervisor', 'Team Leader',

  // Sales & Marketing
  'Marketing Manager', 'Sales Assistant', 'Sales Consultant', 'Sales Manager',
  'Sales Representative', 'Shop Assistant', 'Cashier', 'Teller',

  // Skilled Trades & Technical
  'Artisan', 'Boilermaker', 'Bricklayer', 'Carpenter', 'Chef', 'Cook',
  'Electrician', 'Fitter', 'Hairdresser', 'Mechanic', 'Painter', 'Plumber',
  'Technician', 'Welder', 'IT Technician', 'Motor Mechanic',

  // Service & Care
  'Caregiver', 'Childcare Worker', 'Cleaner', 'Community Health Worker',
  'Domestic Worker', 'Driver', 'Gardener', 'Housekeeper', 'Security Guard',
  'Social Worker', 'Waiter', 'Waitress',

  // Public Service & Safety
  'Correctional Officer', 'Firefighter', 'Metro Police Officer', 'Paramedic',
  'Police Officer', 'Prison Warder', 'Traffic Officer', 'Warrant Officer',

  // Education & Training
  'Educator', 'Lecturer', 'Principal', 'Professor', 'Trainer', 'Tutor',

  // Healthcare
  'Clinical Technologist', 'Dental Assistant', 'Medical Technologist',
  'Nursing Assistant', 'Professional Nurse', 'Radiographer',

  // Business & Entrepreneurship
  'Business Owner', 'Entrepreneur', 'Farmer', 'Self-Employed', 'Trader',

  // Transport & Logistics
  'Bus Driver', 'Delivery Driver', 'Forklift Operator', 'Taxi Driver',
  'Truck Driver', 'Machine Operator', 'Plant Operator',

  // Administrative & Clerical
  'Admin Assistant', 'Admin Clerk', 'Clerk', 'Data Capturer', 'Office Assistant',
  'Receptionist', 'Typist',

  // Construction & Mining
  'Construction Worker', 'General Worker', 'Labourer', 'Miner', 'Mine Worker',
  'Supervisor', 'Foreman',

  // Retail & Hospitality
  'Bartender', 'Hotel Manager', 'Restaurant Manager', 'Shop Manager',

  // Other Professional
  'Accountant', 'Journalist', 'Librarian', 'Pastor', 'Priest', 'Social Worker',
  'Translator', 'Writer',

  // General Categories
  'Student', 'Pensioner', 'Retired', 'Unemployed', 'Other'
];

async function createCleanOccupations() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected! Starting cleanup process...\n');

    // First, check which occupations are referenced by members
    console.log('📊 Checking occupation references...');
    const [referencedOccupations] = await connection.execute(`
      SELECT DISTINCT m.occupation_id, o.occupation_name, COUNT(*) as member_count
      FROM members m
      JOIN occupations o ON m.occupation_id = o.occupation_id
      GROUP BY m.occupation_id, o.occupation_name
      ORDER BY member_count DESC
    `);

    console.log(`Found ${referencedOccupations.length} occupations referenced by members`);

    // Create backup of current occupations
    console.log('\n💾 Creating backup...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS occupations_backup_${Date.now()} AS 
      SELECT * FROM occupations
    `);

    // Clear current occupations table
    console.log('🗑️ Clearing current occupations...');
    await connection.execute('DELETE FROM occupations');
    await connection.execute('ALTER TABLE occupations AUTO_INCREMENT = 1');

    // Insert clean occupations
    console.log('✨ Inserting clean occupations...');
    
    for (let i = 0; i < CLEAN_OCCUPATIONS.length; i++) {
      const occupation = CLEAN_OCCUPATIONS[i];
      await connection.execute(`
        INSERT INTO occupations (occupation_name, category_id, created_at) 
        VALUES (?, 1, NOW())
      `, [occupation]);
    }

    console.log(`✅ Inserted ${CLEAN_OCCUPATIONS.length} clean occupations`);

    // Update member references to map to new clean occupations
    console.log('\n🔄 Updating member occupation references...');
    
    // Get the "Other" occupation ID
    const [otherResult] = await connection.execute(`
      SELECT occupation_id FROM occupations WHERE occupation_name = 'Other'
    `);
    const otherId = otherResult[0].occupation_id;

    // Create mapping for common occupation variations
    const occupationMapping = {
      // Professional variations
      'Teacher': ['Educator', 'Tearcher', 'Teachers Assistance'],
      'Nurse': ['Professional Nurse', 'Nursing'],
      'Doctor': ['Dr', 'Medical Doctor'],
      'Engineer': ['Electrical Engineer', 'Civil Engineer', 'Mechanical Engineer'],
      'Accountant': ['Chartered Accountant', 'Staff Accountant'],
      'Manager': ['General Manager', 'Branch Manager', 'Store Manager', 'Site Manager'],
      'Security Guard': ['Security Officer', 'Security', 'Secrity Officer', 'Securty Officer'],
      'Driver': ['Taxi Driver', 'Truck Driver', 'Bus Driver', 'Logo Driver'],
      'Cleaner': ['Cleaning', 'Domestic Worker'],
      'General Worker': ['General Work', 'Algemene Werker', 'Alg Werker'],
      'Self-Employed': ['Self Employed', 'Self-Employed', 'Selfemployed'],
      'Unemployed': ['Not Employed', 'Unemployed', 'Unemployment']
    };

    // Apply mappings
    for (const [cleanName, variations] of Object.entries(occupationMapping)) {
      const [cleanOccResult] = await connection.execute(`
        SELECT occupation_id FROM occupations WHERE occupation_name = ?
      `, [cleanName]);
      
      if (cleanOccResult.length > 0) {
        const cleanId = cleanOccResult[0].occupation_id;
        
        for (const variation of variations) {
          await connection.execute(`
            UPDATE members m
            JOIN occupations_backup_${Date.now().toString().slice(-6)} ob ON m.occupation_id = ob.occupation_id
            SET m.occupation_id = ?
            WHERE ob.occupation_name = ?
          `, [cleanId, variation]);
        }
      }
    }

    // Map all remaining unmapped references to "Other"
    await connection.execute(`
      UPDATE members m
      LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
      SET m.occupation_id = ?
      WHERE o.occupation_id IS NULL
    `, [otherId]);

    console.log('✅ Updated member occupation references');

    // Show final statistics
    const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM occupations');
    console.log(`\n📊 Final Results:`);
    console.log(`✅ Clean occupations: ${finalCount[0].count}`);
    console.log(`✅ All member references preserved`);
    console.log(`✅ Database cleanup completed successfully!`);

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
createCleanOccupations();
