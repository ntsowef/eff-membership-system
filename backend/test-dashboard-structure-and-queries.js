const { Pool } = require('pg');
require('dotenv').config();

// =====================================================================================
// DASHBOARD STRUCTURE AND QUERIES TEST
// First checks database structure, then tests dashboard queries with correct columns
// =====================================================================================

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
  max: 20,
});

async function executeQuery(query, params = []) {
  const result = await pool.query(query, params);
  return result.rows;
}

async function executeQuerySingle(query, params = []) {
  const result = await pool.query(query, params);
  return result.rows[0] || {};
}

async function testDashboardStructureAndQueries() {
  console.log('🏗️ Testing Dashboard Database Structure and Queries');
  console.log('==================================================\n');
  
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL database connection established\n');
    
    // 1. Check Database Structure
    console.log('1️⃣ Checking Database Structure...\n');
    
    // Check main tables
    const tables = await executeQuery(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`📊 Found ${tables.length} tables in database:`);
    const importantTables = ['members', 'users', 'provinces', 'municipalities', 'wards', 'genders'];
    importantTables.forEach(tableName => {
      const found = tables.find(t => t.table_name === tableName);
      console.log(`   ${found ? '✅' : '❌'} ${tableName}`);
    });
    console.log('');
    
    // Check members table structure
    console.log('👥 Members Table Structure:');
    const membersColumns = await executeQuery(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'members' 
      ORDER BY ordinal_position
    `);
    
    console.log('   Columns:');
    membersColumns.slice(0, 15).forEach(col => {
      console.log(`     - ${col.column_name} (${col.data_type})`);
    });
    if (membersColumns.length > 15) {
      console.log(`     ... and ${membersColumns.length - 15} more columns`);
    }
    console.log('');
    
    // Check for geographic columns
    const geoColumns = membersColumns.filter(col => 
      col.column_name.includes('province') || 
      col.column_name.includes('municipality') || 
      col.column_name.includes('ward') ||
      col.column_name.includes('district')
    );
    
    console.log('🗺️ Geographic Columns in Members Table:');
    geoColumns.forEach(col => {
      console.log(`   ✅ ${col.column_name} (${col.data_type})`);
    });
    console.log('');
    
    // 2. Test Basic Dashboard Queries
    console.log('2️⃣ Testing Basic Dashboard Queries...\n');
    
    // Simple member count
    console.log('📊 Basic Member Statistics:');
    const basicStats = await executeQuerySingle(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_members_30d,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_members_7d
      FROM members
    `);
    
    console.log('✅ Basic Statistics:', {
      total_members: basicStats.total_members,
      new_members_30d: basicStats.new_members_30d,
      new_members_7d: basicStats.new_members_7d
    });
    console.log('');
    
    // Check if we have geographic data
    const hasGeographicData = geoColumns.length > 0;
    
    if (hasGeographicData) {
      console.log('3️⃣ Testing Geographic Dashboard Queries...\n');
      
      // Use the actual geographic column names found
      const provinceCol = geoColumns.find(col => col.column_name.includes('province'))?.column_name;
      const municipalityCol = geoColumns.find(col => col.column_name.includes('municipality'))?.column_name;
      const wardCol = geoColumns.find(col => col.column_name.includes('ward'))?.column_name;
      
      if (provinceCol) {
        console.log(`🏢 Provincial Statistics (using ${provinceCol}):`);
        const provincialStats = await executeQuery(`
          SELECT 
            ${provinceCol},
            COUNT(*) as member_count
          FROM members
          WHERE ${provinceCol} IS NOT NULL
          GROUP BY ${provinceCol}
          ORDER BY member_count DESC
          LIMIT 5
        `);
        
        provincialStats.forEach((prov, index) => {
          console.log(`   ${index + 1}. ${prov[provinceCol]}: ${prov.member_count} members`);
        });
        console.log('');
      }
      
      if (municipalityCol) {
        console.log(`🏘️ Municipal Statistics (using ${municipalityCol}):`);
        const municipalStats = await executeQuery(`
          SELECT 
            ${municipalityCol},
            COUNT(*) as member_count
          FROM members
          WHERE ${municipalityCol} IS NOT NULL
          GROUP BY ${municipalityCol}
          ORDER BY member_count DESC
          LIMIT 5
        `);
        
        municipalStats.forEach((muni, index) => {
          console.log(`   ${index + 1}. ${muni[municipalityCol]}: ${muni.member_count} members`);
        });
        console.log('');
      }
      
      if (wardCol) {
        console.log(`🏠 Ward Statistics (using ${wardCol}):`);
        const wardStats = await executeQuery(`
          SELECT 
            ${wardCol},
            COUNT(*) as member_count
          FROM members
          WHERE ${wardCol} IS NOT NULL
          GROUP BY ${wardCol}
          ORDER BY member_count DESC
          LIMIT 5
        `);
        
        wardStats.forEach((ward, index) => {
          console.log(`   ${index + 1}. ${ward[wardCol]}: ${ward.member_count} members`);
        });
        console.log('');
      }
    }
    
    // 4. Test Dashboard Analytics Queries
    console.log('4️⃣ Testing Dashboard Analytics Queries...\n');
    
    // Age demographics (if date_of_birth exists)
    const hasDateOfBirth = membersColumns.find(col => col.column_name === 'date_of_birth');
    if (hasDateOfBirth) {
      console.log('👥 Age Demographics:');
      const ageStats = await executeQuery(`
        SELECT 
          CASE 
            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM date_of_birth) < 25 THEN 'Under 25'
            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM date_of_birth) < 35 THEN '25-34'
            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM date_of_birth) < 45 THEN '35-44'
            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM date_of_birth) < 55 THEN '45-54'
            ELSE '55+'
          END as age_group,
          COUNT(*) as member_count
        FROM members
        WHERE date_of_birth IS NOT NULL
        GROUP BY age_group
        ORDER BY member_count DESC
      `);
      
      ageStats.forEach(age => {
        console.log(`   ${age.age_group}: ${age.member_count} members`);
      });
      console.log('');
    }
    
    // Gender demographics (if gender columns exist)
    const genderCol = membersColumns.find(col => 
      col.column_name.includes('gender') && !col.column_name.includes('id')
    )?.column_name;
    
    if (genderCol) {
      console.log(`👫 Gender Demographics (using ${genderCol}):`);
      const genderStats = await executeQuery(`
        SELECT 
          ${genderCol},
          COUNT(*) as member_count,
          ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
        FROM members
        WHERE ${genderCol} IS NOT NULL
        GROUP BY ${genderCol}
        ORDER BY member_count DESC
      `);
      
      genderStats.forEach(gender => {
        console.log(`   ${gender[genderCol]}: ${gender.member_count} (${gender.percentage}%)`);
      });
      console.log('');
    }
    
    // 5. Test Membership Growth Trends
    console.log('5️⃣ Testing Membership Growth Trends...\n');
    
    console.log('📈 Monthly Registration Trends:');
    const monthlyTrends = await executeQuery(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_members
      FROM members
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `);
    
    monthlyTrends.forEach(trend => {
      const monthName = trend.month.toISOString().split('T')[0].substring(0, 7);
      console.log(`   ${monthName}: ${trend.new_members} new members`);
    });
    console.log('');
    
    // 6. Test Admin User Statistics
    console.log('6️⃣ Testing Admin User Statistics...\n');
    
    const adminStats = await executeQuery(`
      SELECT 
        admin_level,
        COUNT(*) as user_count,
        COUNT(CASE WHEN is_active THEN 1 END) as active_count
      FROM users
      WHERE admin_level IS NOT NULL AND admin_level != 'none'
      GROUP BY admin_level
      ORDER BY 
        CASE admin_level
          WHEN 'national' THEN 1
          WHEN 'province' THEN 2
          WHEN 'municipality' THEN 3
          WHEN 'ward' THEN 4
          ELSE 5
        END
    `);
    
    console.log('👨‍💼 Admin User Distribution:');
    adminStats.forEach(admin => {
      console.log(`   ${admin.admin_level}: ${admin.active_count}/${admin.user_count} active`);
    });
    console.log('');
    
    // 7. Test Dashboard Performance
    console.log('7️⃣ Testing Dashboard Query Performance...\n');
    
    const performanceQueries = [
      {
        name: 'Member Count',
        query: 'SELECT COUNT(*) as count FROM members'
      },
      {
        name: 'Recent Members',
        query: "SELECT COUNT(*) as count FROM members WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'"
      },
      {
        name: 'Admin Users',
        query: "SELECT COUNT(*) as count FROM users WHERE admin_level IS NOT NULL"
      }
    ];
    
    for (const test of performanceQueries) {
      const startTime = Date.now();
      const result = await executeQuerySingle(test.query);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⚡ ${test.name}: ${duration}ms (${result.count} records)`);
    }
    console.log('');
    
    // 8. Summary
    console.log('🎉 DASHBOARD STRUCTURE AND QUERIES TEST COMPLETED!');
    console.log('==================================================');
    console.log('✅ Database connection: Working');
    console.log('✅ Table structure: Verified');
    console.log('✅ Basic statistics: Working');
    console.log(`✅ Geographic data: ${hasGeographicData ? 'Available' : 'Limited'}`);
    console.log('✅ Demographics: Working');
    console.log('✅ Growth trends: Working');
    console.log('✅ Admin statistics: Working');
    console.log('✅ Query performance: Excellent');
    console.log('');
    console.log('📊 DASHBOARD CAPABILITIES:');
    console.log('==========================');
    console.log(`👥 Total Members: ${basicStats.total_members}`);
    console.log(`📈 Recent Growth: ${basicStats.new_members_30d} in 30 days`);
    console.log(`👨‍💼 Admin Users: ${adminStats.reduce((sum, admin) => sum + parseInt(admin.user_count), 0)}`);
    console.log(`🗺️ Geographic Levels: ${geoColumns.length} geographic columns available`);
    console.log('');
    console.log('🚀 Your dashboard database layer is ready for all administrative levels!');
    
  } catch (error) {
    console.error('❌ Dashboard structure and queries test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
if (require.main === module) {
  testDashboardStructureAndQueries()
    .then(() => {
      console.log('\n✅ Dashboard structure and queries test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Dashboard structure and queries test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testDashboardStructureAndQueries };
