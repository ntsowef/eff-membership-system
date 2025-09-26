// War Council Structure Database Test Script
// Tests the database schema and data integrity for War Council Structure

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'membership_new'
};

async function testWarCouncilDatabase() {
  let connection;
  
  try {
    console.log('🔍 Starting War Council Database Tests...\n');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');

    // Test 1: Check if leadership_structures table exists
    console.log('\n📋 Test 1: Leadership Structures Table');
    try {
      const [structures] = await connection.execute('SELECT * FROM leadership_structures WHERE name = "War Council Structure"');
      if (structures.length > 0) {
        console.log('✅ War Council Structure found in leadership_structures table');
        console.log(`   Structure ID: ${structures[0].id}`);
        console.log(`   Description: ${structures[0].description}`);
      } else {
        console.log('❌ War Council Structure not found in leadership_structures table');
      }
    } catch (error) {
      console.log('❌ leadership_structures table does not exist or query failed:', error.message);
    }

    // Test 2: Check War Council positions
    console.log('\n📋 Test 2: War Council Positions');
    try {
      const [positions] = await connection.execute(`
        SELECT lp.*, ls.name as structure_name 
        FROM leadership_positions lp
        LEFT JOIN leadership_structures ls ON lp.structure_id = ls.id
        WHERE ls.name = 'War Council Structure'
        ORDER BY lp.order_index
      `);
      
      console.log(`✅ Found ${positions.length} War Council positions:`);
      positions.forEach(pos => {
        console.log(`   - ${pos.position_name} (${pos.position_code})`);
        if (pos.province_specific) {
          console.log(`     Province: ${pos.province_code}`);
        }
        console.log(`     Unique: ${pos.is_unique_position ? 'Yes' : 'No'}`);
      });

      // Check for expected positions
      const expectedPositions = ['PRES', 'DPRES', 'SG', 'DSG', 'NCHAIR', 'TG'];
      const expectedCCTPositions = ['CCT-EC', 'CCT-FS', 'CCT-GP', 'CCT-KZN', 'CCT-LP', 'CCT-MP', 'CCT-NC', 'CCT-NW', 'CCT-WC'];
      
      const foundCodes = positions.map(p => p.position_code);
      const missingCore = expectedPositions.filter(code => !foundCodes.includes(code));
      const missingCCT = expectedCCTPositions.filter(code => !foundCodes.includes(code));
      
      if (missingCore.length === 0) {
        console.log('✅ All core positions found');
      } else {
        console.log(`❌ Missing core positions: ${missingCore.join(', ')}`);
      }
      
      if (missingCCT.length === 0) {
        console.log('✅ All CCT Deployee positions found');
      } else {
        console.log(`❌ Missing CCT positions: ${missingCCT.join(', ')}`);
      }
      
    } catch (error) {
      console.log('❌ Failed to query War Council positions:', error.message);
    }

    // Test 3: Check War Council view
    console.log('\n📋 Test 3: War Council Structure View');
    try {
      const [viewData] = await connection.execute('SELECT * FROM vw_war_council_structure LIMIT 5');
      console.log(`✅ War Council view accessible, showing ${viewData.length} sample records`);
      
      if (viewData.length > 0) {
        console.log('   Sample view columns:', Object.keys(viewData[0]).join(', '));
      }
    } catch (error) {
      console.log('❌ War Council view not accessible:', error.message);
    }

    // Test 4: Check current appointments
    console.log('\n📋 Test 4: Current War Council Appointments');
    try {
      const [appointments] = await connection.execute(`
        SELECT 
          lp.position_name,
          lp.position_code,
          m.first_name,
          m.last_name,
          la.appointment_type,
          la.start_date,
          la.appointment_status
        FROM leadership_appointments la
        JOIN leadership_positions lp ON la.position_id = lp.id
        JOIN leadership_structures ls ON lp.structure_id = ls.id
        LEFT JOIN members m ON la.member_id = m.id
        WHERE ls.name = 'War Council Structure'
          AND la.appointment_status = 'Active'
        ORDER BY lp.order_index
      `);
      
      console.log(`✅ Found ${appointments.length} active War Council appointments:`);
      appointments.forEach(app => {
        console.log(`   - ${app.position_name}: ${app.first_name} ${app.last_name} (${app.appointment_type})`);
      });
      
      if (appointments.length === 0) {
        console.log('   ℹ️  No active appointments found (this is normal for a new installation)');
      }
      
    } catch (error) {
      console.log('❌ Failed to query War Council appointments:', error.message);
    }

    // Test 5: Test position uniqueness constraints
    console.log('\n📋 Test 5: Position Uniqueness Validation');
    try {
      const [uniquePositions] = await connection.execute(`
        SELECT position_code, COUNT(*) as count
        FROM leadership_positions lp
        JOIN leadership_structures ls ON lp.structure_id = ls.id
        WHERE ls.name = 'War Council Structure' AND lp.is_unique_position = TRUE
        GROUP BY position_code
        HAVING COUNT(*) > 1
      `);
      
      if (uniquePositions.length === 0) {
        console.log('✅ All unique positions have single entries');
      } else {
        console.log('❌ Found duplicate unique positions:');
        uniquePositions.forEach(pos => {
          console.log(`   - ${pos.position_code}: ${pos.count} entries`);
        });
      }
    } catch (error) {
      console.log('❌ Failed to validate position uniqueness:', error.message);
    }

    // Test 6: Test province-specific positions
    console.log('\n📋 Test 6: Province-Specific Position Validation');
    try {
      const [provincePositions] = await connection.execute(`
        SELECT position_code, province_code
        FROM leadership_positions lp
        JOIN leadership_structures ls ON lp.structure_id = ls.id
        WHERE ls.name = 'War Council Structure' AND lp.province_specific = TRUE
        ORDER BY province_code
      `);
      
      console.log(`✅ Found ${provincePositions.length} province-specific positions:`);
      const provinces = [...new Set(provincePositions.map(p => p.province_code))];
      console.log(`   Provinces covered: ${provinces.join(', ')}`);
      
      const expectedProvinces = ['EC', 'FS', 'GP', 'KZN', 'LP', 'MP', 'NC', 'NW', 'WC'];
      const missingProvinces = expectedProvinces.filter(p => !provinces.includes(p));
      
      if (missingProvinces.length === 0) {
        console.log('✅ All 9 provinces have CCT Deployee positions');
      } else {
        console.log(`❌ Missing provinces: ${missingProvinces.join(', ')}`);
      }
      
    } catch (error) {
      console.log('❌ Failed to validate province-specific positions:', error.message);
    }

    console.log('\n🎉 War Council Database Tests Completed!');
    
  } catch (error) {
    console.error('💥 Database test failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the tests
if (require.main === module) {
  testWarCouncilDatabase().catch(console.error);
}

module.exports = { testWarCouncilDatabase };
