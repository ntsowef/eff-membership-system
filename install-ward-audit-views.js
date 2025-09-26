const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'geomaps_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password123',
};

async function installWardAuditViews() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔗 Connecting to database...');
    const client = await pool.connect();
    
    console.log('📖 Reading SQL file...');
    const sqlPath = path.join(__dirname, 'database', 'views', 'ward_membership_audit_views.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🚀 Installing Ward Membership Audit views...');
    await client.query(sql);
    
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
        const result = await client.query(test.query);
        console.log(`✅ ${test.name}: ${result.rows[0][Object.keys(result.rows[0])[0]]} records`);
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error installing Ward Membership Audit views:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the installation
installWardAuditViews();
