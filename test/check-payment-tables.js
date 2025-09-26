const mysql = require('mysql2/promise');

async function checkPaymentTables() {
  console.log('🔍 **CHECKING PAYMENT TABLES STRUCTURE**\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('📋 **Step 1: Listing All Payment-Related Tables...**');
    
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'membership_new' 
      AND (table_name LIKE '%payment%' OR table_name LIKE '%transaction%' OR table_name LIKE '%renewal%')
      ORDER BY table_name
    `);

    console.log('   📋 Payment-related tables found:');
    tables.forEach(table => {
      console.log(`      • ${table.table_name}`);
    });

    console.log('\n📋 **Step 2: Checking Payment Transactions Table...**');
    
    const [paymentTransactionsExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'membership_new' 
      AND table_name = 'payment_transactions'
    `);

    if (paymentTransactionsExists[0].count > 0) {
      console.log('   ✅ payment_transactions table exists');
      
      const [paymentColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM information_schema.columns 
        WHERE table_schema = 'membership_new' 
        AND table_name = 'payment_transactions'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('   📋 payment_transactions columns:');
      paymentColumns.forEach(col => {
        console.log(`      • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      // Check sample data
      const [paymentCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM payment_transactions
      `);
      console.log(`   📊 Records in payment_transactions: ${paymentCount[0].count}`);
    } else {
      console.log('   ❌ payment_transactions table does not exist');
    }

    console.log('\n📋 **Step 3: Checking Renewal Payments Table...**');
    
    const [renewalPaymentsExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'membership_new' 
      AND table_name = 'renewal_payments'
    `);

    if (renewalPaymentsExists[0].count > 0) {
      console.log('   ✅ renewal_payments table exists');
      
      const [renewalPaymentColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM information_schema.columns 
        WHERE table_schema = 'membership_new' 
        AND table_name = 'renewal_payments'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('   📋 renewal_payments columns:');
      renewalPaymentColumns.forEach(col => {
        console.log(`      • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      // Check sample data
      const [renewalPaymentCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM renewal_payments
      `);
      console.log(`   📊 Records in renewal_payments: ${renewalPaymentCount[0].count}`);
    } else {
      console.log('   ❌ renewal_payments table does not exist');
    }

    console.log('\n📋 **Step 4: Checking Membership Applications Payment Fields...**');
    
    const [applicationColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.columns 
      WHERE table_schema = 'membership_new' 
      AND table_name = 'membership_applications'
      AND COLUMN_NAME LIKE '%payment%'
      ORDER BY ORDINAL_POSITION
    `);

    if (applicationColumns.length > 0) {
      console.log('   📋 Payment fields in membership_applications:');
      applicationColumns.forEach(col => {
        console.log(`      • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('   ❌ No payment fields found in membership_applications');
    }

    console.log('\n📋 **Step 5: Checking Membership Renewals Payment Fields...**');
    
    const [renewalColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.columns 
      WHERE table_schema = 'membership_new' 
      AND table_name = 'membership_renewals'
      AND (COLUMN_NAME LIKE '%payment%' OR COLUMN_NAME LIKE '%amount%' OR COLUMN_NAME LIKE '%financial%')
      ORDER BY ORDINAL_POSITION
    `);

    if (renewalColumns.length > 0) {
      console.log('   📋 Payment/Financial fields in membership_renewals:');
      renewalColumns.forEach(col => {
        console.log(`      • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('   ❌ No payment/financial fields found in membership_renewals');
    }

    console.log('\n📋 **Step 6: Checking Members Payment Fields...**');
    
    const [memberPaymentColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.columns 
      WHERE table_schema = 'membership_new' 
      AND table_name = 'members'
      AND COLUMN_NAME LIKE '%payment%'
      ORDER BY ORDINAL_POSITION
    `);

    if (memberPaymentColumns.length > 0) {
      console.log('   📋 Payment fields in members table:');
      memberPaymentColumns.forEach(col => {
        console.log(`      • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('   ❌ No payment fields found in members table');
    }

    console.log('\n📋 **Step 7: Sample Data Analysis...**');
    
    // Check if we have any application data with payment info
    const [applicationPaymentData] = await connection.execute(`
      SELECT COUNT(*) as total,
             COUNT(payment_method) as with_payment_method,
             COUNT(payment_reference) as with_payment_reference,
             COUNT(payment_amount) as with_payment_amount
      FROM membership_applications
    `);

    console.log('   📊 Application Payment Data:');
    console.log(`      • Total applications: ${applicationPaymentData[0].total}`);
    console.log(`      • With payment method: ${applicationPaymentData[0].with_payment_method}`);
    console.log(`      • With payment reference: ${applicationPaymentData[0].with_payment_reference}`);
    console.log(`      • With payment amount: ${applicationPaymentData[0].with_payment_amount}`);

    // Check renewal payment data
    const [renewalPaymentData] = await connection.execute(`
      SELECT COUNT(*) as total,
             COUNT(payment_method) as with_payment_method,
             COUNT(payment_reference) as with_payment_reference,
             COUNT(final_amount) as with_final_amount,
             COUNT(financial_status) as with_financial_status
      FROM membership_renewals
    `);

    console.log('\n   📊 Renewal Payment Data:');
    console.log(`      • Total renewals: ${renewalPaymentData[0].total}`);
    console.log(`      • With payment method: ${renewalPaymentData[0].with_payment_method}`);
    console.log(`      • With payment reference: ${renewalPaymentData[0].with_payment_reference}`);
    console.log(`      • With final amount: ${renewalPaymentData[0].with_final_amount}`);
    console.log(`      • With financial status: ${renewalPaymentData[0].with_financial_status}`);

    console.log('\n🎯 **ANALYSIS COMPLETE**');
    console.log('\n📋 **Summary for Unified Financial Transactions View:**');
    console.log('   • Application payments: Stored in membership_applications table');
    console.log('   • Renewal payments: Stored in membership_renewals table');
    console.log('   • Separate payment_transactions table may exist for detailed tracking');
    console.log('   • Need to create unified view combining both payment sources');

  } catch (error) {
    console.error('❌ **Analysis failed:**', error.message);
  } finally {
    await connection.end();
  }
}

// Run the analysis
checkPaymentTables();
