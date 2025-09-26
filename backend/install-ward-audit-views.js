const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// MySQL database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'membership_new',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function installWardAuditViews() {
  let connection;

  try {
    console.log('🔗 Connecting to MySQL database...');
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);

    connection = await mysql.createConnection(dbConfig);

    console.log('📖 Reading SQL file...');
    const sqlPath = path.join(__dirname, 'database', 'views', 'ward_membership_audit_views.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Installing Ward Membership Audit views...');

    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        try {
          await connection.execute(trimmedStatement);
          console.log(`✅ Executed: ${trimmedStatement.substring(0, 50)}...`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.log(`⚠️  Warning: ${error.message}`);
          }
        }
      }
    }

    console.log('✅ Ward Membership Audit views installed successfully!');

    // Test the views
    console.log('\n🧪 Testing views...');

    const testQueries = [
      {
        name: 'Ward Membership Audit View',
        query: 'SELECT COUNT(*) as ward_count FROM vw_ward_membership_audit'
      },
      {
        name: 'Municipality Ward Performance View',
        query: 'SELECT COUNT(*) as municipality_count FROM vw_municipality_ward_performance'
      },
      {
        name: 'Ward Membership Trends View',
        query: 'SELECT COUNT(*) as trend_count FROM vw_ward_membership_trends'
      }
    ];

    for (const test of testQueries) {
      try {
        const [rows] = await connection.execute(test.query);
        const count = rows[0][Object.keys(rows[0])[0]];
        console.log(`✅ ${test.name}: ${count} records`);
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }

    // Test sample data from ward audit view
    console.log('\n📊 Sample data from Ward Audit View:');
    try {
      const [rows] = await connection.execute(`
        SELECT
          ward_name,
          municipality_name,
          active_members,
          ward_standing,
          target_achievement_percentage
        FROM vw_ward_membership_audit
        ORDER BY active_members DESC
        LIMIT 5
      `);

      if (rows.length > 0) {
        console.log('Top 5 wards by active members:');
        rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.ward_name} (${row.municipality_name}): ${row.active_members} members - ${row.ward_standing} (${row.target_achievement_percentage}% target achievement)`);
        });
      } else {
        console.log('No ward data found. Make sure you have members and wards in your database.');
      }
    } catch (error) {
      console.log(`❌ Sample data query failed: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error installing Ward Membership Audit views:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the installation
installWardAuditViews();
