const mysql = require('mysql2/promise');

async function checkDatabaseTables() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking database tables for financial transactions...');

    // Check if unified_financial_transactions table exists
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'unified_financial_transactions'
    `);

    if (tables.length === 0) {
      console.log('❌ unified_financial_transactions table does not exist');
      
      // Check what financial-related tables do exist
      console.log('\n🔍 Looking for other financial tables...');
      const [allTables] = await connection.query(`
        SHOW TABLES LIKE '%financial%'
      `);
      
      if (allTables.length > 0) {
        console.log('📋 Found financial-related tables:');
        allTables.forEach(table => {
          console.log(`  • ${Object.values(table)[0]}`);
        });
      } else {
        console.log('❌ No financial-related tables found');
      }

      // Check for payment-related tables
      console.log('\n🔍 Looking for payment-related tables...');
      const [paymentTables] = await connection.query(`
        SHOW TABLES LIKE '%payment%'
      `);
      
      if (paymentTables.length > 0) {
        console.log('📋 Found payment-related tables:');
        paymentTables.forEach(table => {
          console.log(`  • ${Object.values(table)[0]}`);
        });
      }

      // Check for transaction-related tables
      console.log('\n🔍 Looking for transaction-related tables...');
      const [transactionTables] = await connection.query(`
        SHOW TABLES LIKE '%transaction%'
      `);
      
      if (transactionTables.length > 0) {
        console.log('📋 Found transaction-related tables:');
        transactionTables.forEach(table => {
          console.log(`  • ${Object.values(table)[0]}`);
        });
      }

      // Check applications table for payment data
      console.log('\n🔍 Checking applications table structure...');
      try {
        const [appColumns] = await connection.query(`
          DESCRIBE applications
        `);
        
        console.log('📋 Applications table columns:');
        appColumns.forEach(col => {
          if (col.Field.toLowerCase().includes('payment') || 
              col.Field.toLowerCase().includes('amount') || 
              col.Field.toLowerCase().includes('financial')) {
            console.log(`  • ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'nullable' : 'not null'}`);
          }
        });
      } catch (error) {
        console.log('❌ Applications table not found or error:', error.message);
      }

      // Check renewals table for payment data
      console.log('\n🔍 Checking renewals table structure...');
      try {
        const [renewalColumns] = await connection.query(`
          DESCRIBE renewals
        `);
        
        console.log('📋 Renewals table columns:');
        renewalColumns.forEach(col => {
          if (col.Field.toLowerCase().includes('payment') || 
              col.Field.toLowerCase().includes('amount') || 
              col.Field.toLowerCase().includes('financial')) {
            console.log(`  • ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'nullable' : 'not null'}`);
          }
        });
      } catch (error) {
        console.log('❌ Renewals table not found or error:', error.message);
      }

    } else {
      console.log('✅ unified_financial_transactions table exists');
      
      // Check table structure
      const [columns] = await connection.query(`
        DESCRIBE unified_financial_transactions
      `);
      
      console.log('\n📋 Table structure:');
      columns.forEach(col => {
        console.log(`  • ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'nullable' : 'not null'} - ${col.Key ? col.Key : 'no key'}`);
      });

      // Check if table has data
      const [countResult] = await connection.query(`
        SELECT COUNT(*) as count FROM unified_financial_transactions
      `);
      
      console.log(`\n📊 Table has ${countResult[0].count} records`);

      if (countResult[0].count > 0) {
        // Show sample data
        const [sampleData] = await connection.query(`
          SELECT * FROM unified_financial_transactions LIMIT 3
        `);
        
        console.log('\n📋 Sample data:');
        sampleData.forEach((row, index) => {
          console.log(`  Record ${index + 1}:`);
          console.log(`    • ID: ${row.id || 'N/A'}`);
          console.log(`    • Transaction ID: ${row.transaction_id || 'N/A'}`);
          console.log(`    • Entity Type: ${row.transaction_type || 'N/A'}`);
          console.log(`    • Amount: R${row.amount || 0}`);
          console.log(`    • Status: ${row.payment_status || 'N/A'}`);
          console.log(`    • Created: ${row.created_at || 'N/A'}`);
        });
      }
    }

    console.log('\n✅ Database table check completed!');

  } catch (error) {
    console.error('❌ Error checking database tables:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the check
checkDatabaseTables();
