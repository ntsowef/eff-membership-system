const mysql = require('mysql2/promise');

async function fixVotingDistrictsSchema() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Empty password for root user
      database: 'membership_new'
    });

    console.log('🔧 Fixing voting districts schema to match API expectations...\n');
    
    // 1. Add missing columns to voting_districts table
    console.log('1. Adding missing columns to voting_districts table:');
    
    try {
      // Add voting_district_code column (alias for vd_code)
      await connection.execute(`
        ALTER TABLE voting_districts 
        ADD COLUMN voting_district_code VARCHAR(20) GENERATED ALWAYS AS (vd_code) VIRTUAL
      `);
      console.log('   ✅ Added voting_district_code virtual column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ℹ️  voting_district_code column already exists');
      } else {
        console.log('   ⚠️  Could not add voting_district_code:', error.message);
      }
    }
    
    try {
      // Add voting_district_name column (alias for vd_name)
      await connection.execute(`
        ALTER TABLE voting_districts 
        ADD COLUMN voting_district_name VARCHAR(255) GENERATED ALWAYS AS (vd_name) VIRTUAL
      `);
      console.log('   ✅ Added voting_district_name virtual column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ℹ️  voting_district_name column already exists');
      } else {
        console.log('   ⚠️  Could not add voting_district_name:', error.message);
      }
    }
    
    try {
      // Add voting_district_number column (extract from vd_code or use id)
      await connection.execute(`
        ALTER TABLE voting_districts 
        ADD COLUMN voting_district_number VARCHAR(10) GENERATED ALWAYS AS (
          CASE 
            WHEN vd_code REGEXP '^[A-Z]+[0-9]+$' THEN REGEXP_REPLACE(vd_code, '^[A-Z]+', '')
            ELSE CAST(id AS CHAR)
          END
        ) VIRTUAL
      `);
      console.log('   ✅ Added voting_district_number virtual column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ℹ️  voting_district_number column already exists');
      } else {
        console.log('   ⚠️  Could not add voting_district_number:', error.message);
        // Fallback: add simple number column
        try {
          await connection.execute(`
            ALTER TABLE voting_districts 
            ADD COLUMN voting_district_number VARCHAR(10) GENERATED ALWAYS AS (CAST(id AS CHAR)) VIRTUAL
          `);
          console.log('   ✅ Added voting_district_number virtual column (fallback)');
        } catch (fallbackError) {
          console.log('   ❌ Could not add voting_district_number even with fallback');
        }
      }
    }
    
    try {
      // Add is_active column
      await connection.execute(`
        ALTER TABLE voting_districts 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE
      `);
      console.log('   ✅ Added is_active column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ℹ️  is_active column already exists');
      } else {
        console.log('   ⚠️  Could not add is_active:', error.message);
      }
    }
    
    // 2. Update members table to use vd_code instead of voting_district_code
    console.log('\n2. Checking members.voting_district_code references:');
    
    // Check if we need to update the foreign key reference
    const [membersWithVotingDistrict] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM members 
      WHERE voting_district_code IS NOT NULL
    `);
    
    console.log(`   📊 ${membersWithVotingDistrict[0].count} members have voting_district_code set`);
    
    // 3. Create indexes for better performance
    console.log('\n3. Creating indexes:');
    
    try {
      await connection.execute(`
        CREATE INDEX idx_voting_districts_vd_code ON voting_districts(vd_code)
      `);
      console.log('   ✅ Created index on vd_code');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('   ℹ️  Index on vd_code already exists');
      } else {
        console.log('   ⚠️  Could not create index on vd_code:', error.message);
      }
    }
    
    try {
      await connection.execute(`
        CREATE INDEX idx_voting_districts_ward ON voting_districts(ward_code)
      `);
      console.log('   ✅ Created index on ward_code');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('   ℹ️  Index on ward_code already exists');
      } else {
        console.log('   ⚠️  Could not create index on ward_code:', error.message);
      }
    }
    
    // 4. Test the virtual columns
    console.log('\n4. Testing virtual columns:');
    
    const [testData] = await connection.execute(`
      SELECT 
        vd_code,
        vd_name,
        voting_district_code,
        voting_district_name,
        voting_district_number,
        is_active
      FROM voting_districts 
      LIMIT 5
    `);
    
    console.log('   📋 Sample data:');
    testData.forEach((row, index) => {
      console.log(`      ${index + 1}. Code: ${row.vd_code} → ${row.voting_district_code}`);
      console.log(`         Name: ${row.vd_name} → ${row.voting_district_name}`);
      console.log(`         Number: ${row.voting_district_number}, Active: ${row.is_active}`);
    });
    
    console.log('\n🎉 Voting districts schema fix completed!');
    console.log('\n📝 Summary:');
    console.log('   - voting_districts table now has API-compatible column names');
    console.log('   - Virtual columns map existing data to expected API format');
    console.log('   - Indexes created for better performance');
    console.log('   - Ready for API integration');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixVotingDistrictsSchema();
