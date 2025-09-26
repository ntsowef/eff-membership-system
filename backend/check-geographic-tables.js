const mysql = require('mysql2/promise');

async function checkGeographicTables() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking geographic tables structure...\n');

    const tables = ['wards', 'municipalities', 'districts', 'provinces'];

    for (const table of tables) {
      try {
        console.log(`📋 **${table.toUpperCase()} Table:**`);
        
        // Check if table exists
        const [tableExists] = await connection.execute(`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_schema = 'membership_new' AND table_name = ?
        `, [table]);

        if (tableExists[0].count === 0) {
          console.log(`   ❌ Table '${table}' does not exist`);
          continue;
        }

        // Get table structure
        const [columns] = await connection.execute(`DESCRIBE ${table}`);
        console.log('   Columns:');
        columns.forEach(col => {
          console.log(`     • ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Get sample data
        const [sampleData] = await connection.execute(`SELECT * FROM ${table} LIMIT 3`);
        if (sampleData.length > 0) {
          console.log('   Sample data:');
          sampleData.forEach((row, index) => {
            console.log(`     ${index + 1}. ${JSON.stringify(row)}`);
          });
        } else {
          console.log('   ❌ No data found');
        }
        console.log('');

      } catch (error) {
        console.log(`   ❌ Error checking ${table}: ${error.message}`);
      }
    }

    // Check voting_districts table as well
    try {
      console.log('📋 **VOTING_DISTRICTS Table:**');
      const [votingColumns] = await connection.execute(`DESCRIBE voting_districts`);
      console.log('   Columns:');
      votingColumns.forEach(col => {
        console.log(`     • ${col.Field} (${col.Type})`);
      });
    } catch (error) {
      console.log('   ❌ voting_districts table does not exist');
    }

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkGeographicTables();
