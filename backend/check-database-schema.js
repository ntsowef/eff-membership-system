const mysql = require('mysql2/promise');

// MySQL database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'membership_new',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function checkDatabaseSchema() {
  let connection;
  
  try {
    console.log('🔗 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('📋 Checking database tables...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Available tables:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    // Check members table structure
    console.log('\n👥 Members table structure:');
    try {
      const [memberColumns] = await connection.execute('DESCRIBE members');
      memberColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (error) {
      console.log('❌ Members table not found or error:', error.message);
    }
    
    // Check wards table structure
    console.log('\n🏘️  Wards table structure:');
    try {
      const [wardColumns] = await connection.execute('DESCRIBE wards');
      wardColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (error) {
      console.log('❌ Wards table not found or error:', error.message);
    }
    
    // Check municipalities table structure
    console.log('\n🏛️  Municipalities table structure:');
    try {
      const [municipalityColumns] = await connection.execute('DESCRIBE municipalities');
      municipalityColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (error) {
      console.log('❌ Municipalities table not found or error:', error.message);
    }
    
    // Check districts table structure
    console.log('\n🗺️  Districts table structure:');
    try {
      const [districtColumns] = await connection.execute('DESCRIBE districts');
      districtColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (error) {
      console.log('❌ Districts table not found or error:', error.message);
    }
    
    // Check provinces table structure
    console.log('\n🌍 Provinces table structure:');
    try {
      const [provinceColumns] = await connection.execute('DESCRIBE provinces');
      provinceColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (error) {
      console.log('❌ Provinces table not found or error:', error.message);
    }
    
    // Check memberships table structure
    console.log('\n💳 Memberships table structure:');
    try {
      const [membershipColumns] = await connection.execute('DESCRIBE memberships');
      membershipColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (error) {
      console.log('❌ Memberships table not found or error:', error.message);
    }

    // Check membership_statuses table structure
    console.log('\n📋 Membership Statuses table structure:');
    try {
      const [statusColumns] = await connection.execute('DESCRIBE membership_statuses');
      statusColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (error) {
      console.log('❌ Membership Statuses table not found or error:', error.message);
    }

    // Sample data from memberships table
    console.log('\n📊 Sample data from memberships table:');
    try {
      const [membershipSample] = await connection.execute('SELECT * FROM memberships LIMIT 3');
      if (membershipSample.length > 0) {
        console.log('Sample membership records:');
        membershipSample.forEach((membership, index) => {
          console.log(`${index + 1}. Membership ID: ${membership.membership_id || membership.id}`);
          console.log(`   Member ID: ${membership.member_id}`);
          console.log(`   Status: ${membership.status || membership.membership_status || 'unknown'}`);
          console.log(`   Start Date: ${membership.start_date || membership.created_at || 'unknown'}`);
          console.log(`   End Date: ${membership.end_date || membership.expiry_date || 'unknown'}`);
        });
      } else {
        console.log('No membership records found.');
      }
    } catch (error) {
      console.log('❌ Error querying memberships:', error.message);
    }

    // Sample data from members table
    console.log('\n📊 Sample data from members table:');
    try {
      const [memberSample] = await connection.execute('SELECT * FROM members LIMIT 3');
      if (memberSample.length > 0) {
        console.log('Sample member records:');
        memberSample.forEach((member, index) => {
          console.log(`${index + 1}. Member ID: ${member.member_id || member.id}, Status: ${member.status || member.membership_status || 'unknown'}`);
          console.log(`   Ward: ${member.ward_code || member.ward_id || 'unknown'}`);
          console.log(`   Created: ${member.created_at || member.date_created || 'unknown'}`);
        });
      } else {
        console.log('No member records found.');
      }
    } catch (error) {
      console.log('❌ Error querying members:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the schema check
checkDatabaseSchema();
