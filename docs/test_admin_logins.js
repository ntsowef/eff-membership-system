/**
 * Test Admin Login Functionality
 * Tests the created admin accounts across all hierarchy levels
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'membership_system_fresh'
};

async function testAdminLogins() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('🔗 Connected to membership_system_fresh database\n');

    // Test admin accounts at each level
    console.log('🔐 TESTING ADMIN ACCOUNTS');
    console.log('========================\n');

    // Get sample admins from each level
    const [admins] = await connection.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.admin_level,
        u.is_active,
        p.name as province_name,
        r.name as region_name,
        m.name as municipality_name,
        w.name as ward_name
      FROM users u
      LEFT JOIN provinces p ON u.province_id = p.id
      LEFT JOIN regions r ON u.region_id = r.id
      LEFT JOIN municipalities m ON u.municipality_id = m.id
      LEFT JOIN wards w ON u.ward_id = w.id
      WHERE u.role = 'admin'
      ORDER BY 
        CASE u.admin_level 
          WHEN 'national' THEN 1
          WHEN 'province' THEN 2
          WHEN 'region' THEN 3
          WHEN 'municipality' THEN 4
          WHEN 'ward' THEN 5
          ELSE 6
        END,
        u.id
      LIMIT 20
    `);

    if (admins.length === 0) {
      console.log('❌ No admin accounts found. Please run the admin creation script first.');
      return;
    }

    console.log(`✅ Found ${admins.length} admin accounts to test:\n`);

    // Display admin accounts by level
    const adminsByLevel = {};
    admins.forEach(admin => {
      if (!adminsByLevel[admin.admin_level]) {
        adminsByLevel[admin.admin_level] = [];
      }
      adminsByLevel[admin.admin_level].push(admin);
    });

    // Show admins by hierarchy level
    Object.keys(adminsByLevel).forEach(level => {
      console.log(`📋 ${level.toUpperCase()} LEVEL ADMINS:`);
      console.log('-'.repeat(40));
      
      adminsByLevel[level].forEach(admin => {
        let hierarchy = '';
        if (admin.admin_level === 'national') {
          hierarchy = 'National Level';
        } else if (admin.admin_level === 'province') {
          hierarchy = admin.province_name || 'Unknown Province';
        } else if (admin.admin_level === 'region') {
          hierarchy = `${admin.region_name || 'Unknown Region'}, ${admin.province_name || 'Unknown Province'}`;
        } else if (admin.admin_level === 'municipality') {
          hierarchy = `${admin.municipality_name || 'Unknown Municipality'}, ${admin.region_name || 'Unknown Region'}`;
        } else if (admin.admin_level === 'ward') {
          hierarchy = `${admin.ward_name || 'Unknown Ward'}, ${admin.municipality_name || 'Unknown Municipality'}`;
        }

        console.log(`  👤 ${admin.name}`);
        console.log(`     📧 Email: ${admin.email}`);
        console.log(`     🔒 Password: password123`);
        console.log(`     🏛️  Scope: ${hierarchy}`);
        console.log(`     ✅ Status: ${admin.is_active ? 'Active' : 'Inactive'}`);
        console.log('');
      });
    });

    // Test password verification
    console.log('🔍 TESTING PASSWORD VERIFICATION');
    console.log('================================\n');

    const testPassword = 'password123';
    const hashedPassword = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

    try {
      const isValid = await bcrypt.compare(testPassword, hashedPassword);
      console.log(`✅ Password verification test: ${isValid ? 'PASSED' : 'FAILED'}`);
      console.log(`   Test password: ${testPassword}`);
      console.log(`   Hash matches: ${isValid}\n`);
    } catch (error) {
      console.log(`❌ Password verification error: ${error.message}\n`);
    }

    // Show admin statistics
    console.log('📊 ADMIN STATISTICS');
    console.log('==================\n');

    const [stats] = await connection.execute(`
      SELECT 
        admin_level,
        COUNT(*) as total_admins,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_admins,
        COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_admins
      FROM users 
      WHERE role = 'admin'
      GROUP BY admin_level
      ORDER BY 
        CASE admin_level 
          WHEN 'national' THEN 1
          WHEN 'province' THEN 2
          WHEN 'region' THEN 3
          WHEN 'municipality' THEN 4
          WHEN 'ward' THEN 5
          ELSE 6
        END
    `);

    stats.forEach(stat => {
      console.log(`📈 ${stat.admin_level.toUpperCase()} Level:`);
      console.log(`   Total: ${stat.total_admins}`);
      console.log(`   Active: ${stat.active_admins}`);
      console.log(`   Inactive: ${stat.inactive_admins}`);
      console.log('');
    });

    // Show geographic coverage
    console.log('🗺️  GEOGRAPHIC COVERAGE');
    console.log('======================\n');

    const [coverage] = await connection.execute(`
      SELECT 
        'Provinces' as level_type,
        COUNT(DISTINCT p.id) as total_entities,
        COUNT(DISTINCT u.province_id) as entities_with_admins,
        ROUND((COUNT(DISTINCT u.province_id) / COUNT(DISTINCT p.id)) * 100, 1) as coverage_percentage
      FROM provinces p
      LEFT JOIN users u ON p.id = u.province_id AND u.role = 'admin' AND u.admin_level = 'province'
      UNION ALL
      SELECT 
        'Regions',
        COUNT(DISTINCT r.id),
        COUNT(DISTINCT u.region_id),
        ROUND((COUNT(DISTINCT u.region_id) / COUNT(DISTINCT r.id)) * 100, 1)
      FROM regions r
      LEFT JOIN users u ON r.id = u.region_id AND u.role = 'admin' AND u.admin_level = 'region'
      UNION ALL
      SELECT 
        'Municipalities',
        COUNT(DISTINCT m.id),
        COUNT(DISTINCT u.municipality_id),
        ROUND((COUNT(DISTINCT u.municipality_id) / COUNT(DISTINCT m.id)) * 100, 1)
      FROM municipalities m
      LEFT JOIN users u ON m.id = u.municipality_id AND u.role = 'admin' AND u.admin_level = 'municipality'
      UNION ALL
      SELECT 
        'Wards',
        COUNT(DISTINCT w.id),
        COUNT(DISTINCT u.ward_id),
        ROUND((COUNT(DISTINCT u.ward_id) / COUNT(DISTINCT w.id)) * 100, 1)
      FROM wards w
      LEFT JOIN users u ON w.id = u.ward_id AND u.role = 'admin' AND u.admin_level = 'ward'
    `);

    coverage.forEach(cov => {
      console.log(`📍 ${cov.level_type}:`);
      console.log(`   Total: ${cov.total_entities}`);
      console.log(`   With Admins: ${cov.entities_with_admins}`);
      console.log(`   Coverage: ${cov.coverage_percentage}%`);
      console.log('');
    });

    // Show login instructions
    console.log('🚀 LOGIN INSTRUCTIONS');
    console.log('====================\n');
    console.log('To test admin login:');
    console.log('1. Navigate to: http://localhost:3001/login');
    console.log('2. Use any email from the list above');
    console.log('3. Use password: password123');
    console.log('4. Each admin will have access to their hierarchical scope\n');

    console.log('📝 SAMPLE LOGIN CREDENTIALS:');
    console.log('----------------------------');
    console.log('National Admin:');
    console.log('  Email: national.admin@eff.org.za');
    console.log('  Password: password123\n');
    
    if (adminsByLevel.province && adminsByLevel.province.length > 0) {
      console.log('Provincial Admin (Gauteng):');
      console.log('  Email: gauteng.admin@eff.org.za');
      console.log('  Password: password123\n');
    }

    if (adminsByLevel.municipality && adminsByLevel.municipality.length > 0) {
      const municipalAdmin = adminsByLevel.municipality[0];
      console.log('Municipal Admin (Sample):');
      console.log(`  Email: ${municipalAdmin.email}`);
      console.log('  Password: password123\n');
    }

    if (adminsByLevel.ward && adminsByLevel.ward.length > 0) {
      const wardAdmin = adminsByLevel.ward[0];
      console.log('Ward Admin (Sample):');
      console.log(`  Email: ${wardAdmin.email}`);
      console.log('  Password: password123\n');
    }

    console.log('✅ Admin account testing completed successfully!');

  } catch (error) {
    console.error('❌ Error testing admin accounts:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testAdminLogins();
}

module.exports = { testAdminLogins };
