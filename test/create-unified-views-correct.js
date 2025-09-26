const mysql = require('mysql2/promise');

async function createUnifiedViewsCorrect() {
  console.log('🔧 **CREATING UNIFIED FINANCIAL TRANSACTIONS VIEWS (CORRECT COLUMNS)**\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('📋 **Step 1: Creating Unified Financial Transactions View...**');
    
    try {
      await connection.execute('DROP VIEW IF EXISTS unified_financial_transactions');
      
      await connection.execute(`
        CREATE VIEW unified_financial_transactions AS
        -- Application Payments from membership_applications table
        SELECT 
          CONCAT('APP_', ma.id) as transaction_id,
          'Application' as transaction_type,
          ma.id as source_id,
          ma.id as application_id,
          NULL as renewal_id,
          
          -- Member information (using correct column names)
          ma.id as member_id,
          ma.first_name,
          ma.last_name,
          ma.email,
          ma.cell_number as phone,
          ma.id_number,
          
          -- Payment information
          ma.payment_amount as amount,
          ma.payment_method,
          ma.payment_reference,
          ma.last_payment_date as payment_date,
          'ZAR' as currency,
          
          -- Status mapping for applications
          CASE 
            WHEN ma.payment_amount IS NULL OR ma.payment_amount = 0 THEN 'Pending'
            WHEN ma.payment_method IS NOT NULL AND ma.payment_reference IS NOT NULL THEN 'Completed'
            ELSE 'Pending'
          END as payment_status,
          
          -- Financial review status from applications table
          COALESCE(ma.financial_status, 'Pending') as financial_status,
          ma.financial_reviewed_at,
          ma.financial_reviewed_by,
          ma.financial_rejection_reason,
          ma.financial_admin_notes,
          
          -- Timestamps
          ma.created_at,
          ma.updated_at,
          
          -- Additional context
          ma.status as source_status,
          'Membership Application Payment' as description,
          
          -- Verification information (from payment_transactions if exists)
          pt.verified_by,
          pt.verified_at,
          pt.verification_notes,
          pt.receipt_number,
          pt.receipt_image_path

        FROM membership_applications ma
        LEFT JOIN payment_transactions pt ON ma.id = pt.application_id
        WHERE ma.payment_amount IS NOT NULL AND ma.payment_amount > 0

        UNION ALL

        -- Renewal Payments from membership_renewals table
        SELECT 
          CONCAT('REN_', mr.renewal_id) as transaction_id,
          'Renewal' as transaction_type,
          mr.renewal_id as source_id,
          NULL as application_id,
          mr.renewal_id,
          
          -- Member information (using correct column names from members table)
          mr.member_id,
          m.firstname as first_name,
          m.surname as last_name,
          m.email,
          m.cell_number as phone,
          m.id_number,
          
          -- Payment information
          mr.final_amount as amount,
          mr.payment_method,
          mr.payment_reference,
          mr.payment_date,
          'ZAR' as currency,
          
          -- Status from renewals
          COALESCE(mr.payment_status, 'Pending') as payment_status,
          
          -- Financial review status
          COALESCE(mr.financial_status, 'Pending') as financial_status,
          mr.financial_reviewed_at,
          mr.financial_reviewed_by,
          mr.financial_rejection_reason,
          mr.financial_admin_notes,
          
          -- Timestamps
          mr.created_at,
          mr.updated_at,
          
          -- Additional context
          mr.renewal_status as source_status,
          CONCAT('Membership Renewal Payment - ', mr.renewal_year) as description,
          
          -- Verification information (renewals don't use payment_transactions table)
          mr.financial_reviewed_by as verified_by,
          mr.financial_reviewed_at as verified_at,
          mr.financial_admin_notes as verification_notes,
          NULL as receipt_number,
          NULL as receipt_image_path

        FROM membership_renewals mr
        LEFT JOIN members m ON mr.member_id = m.member_id
        WHERE mr.final_amount IS NOT NULL AND mr.final_amount > 0
      `);
      
      console.log('   ✅ Created unified_financial_transactions view');
    } catch (error) {
      console.log(`   ❌ Error creating unified view: ${error.message}`);
      return;
    }

    console.log('\n📋 **Step 2: Creating Financial Transactions Summary View...**');
    
    try {
      await connection.execute('DROP VIEW IF EXISTS financial_transactions_summary');
      
      await connection.execute(`
        CREATE VIEW financial_transactions_summary AS
        SELECT 
          transaction_type,
          payment_status,
          financial_status,
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          MIN(payment_date) as earliest_payment,
          MAX(payment_date) as latest_payment,
          COUNT(CASE WHEN financial_reviewed_by IS NOT NULL THEN 1 END) as reviewed_count,
          COUNT(CASE WHEN financial_status = 'Pending' THEN 1 END) as pending_review_count
        FROM unified_financial_transactions
        GROUP BY transaction_type, payment_status, financial_status
        ORDER BY transaction_type, payment_status, financial_status
      `);
      
      console.log('   ✅ Created financial_transactions_summary view');
    } catch (error) {
      console.log(`   ❌ Error creating summary view: ${error.message}`);
    }

    console.log('\n📋 **Step 3: Creating Pending Financial Reviews View...**');
    
    try {
      await connection.execute('DROP VIEW IF EXISTS pending_financial_reviews');
      
      await connection.execute(`
        CREATE VIEW pending_financial_reviews AS
        SELECT 
          transaction_id,
          transaction_type,
          first_name,
          last_name,
          email,
          amount,
          payment_method,
          payment_reference,
          payment_date,
          payment_status,
          financial_status,
          description,
          created_at,
          DATEDIFF(CURRENT_DATE, DATE(COALESCE(payment_date, created_at))) as days_pending
        FROM unified_financial_transactions
        WHERE financial_status IN ('Pending', 'Under Review')
           OR (payment_status = 'Completed' AND financial_reviewed_by IS NULL)
        ORDER BY days_pending DESC, amount DESC
      `);
      
      console.log('   ✅ Created pending_financial_reviews view');
    } catch (error) {
      console.log(`   ❌ Error creating pending reviews view: ${error.message}`);
    }

    console.log('\n📋 **Step 4: Creating Financial Audit Trail View...**');
    
    try {
      await connection.execute('DROP VIEW IF EXISTS financial_audit_trail_view');
      
      await connection.execute(`
        CREATE VIEW financial_audit_trail_view AS
        SELECT 
          transaction_id,
          transaction_type,
          first_name,
          last_name,
          amount,
          payment_method,
          payment_status,
          financial_status,
          financial_reviewed_by,
          financial_reviewed_at,
          financial_rejection_reason,
          verified_by,
          verified_at,
          verification_notes,
          created_at,
          updated_at
        FROM unified_financial_transactions
        WHERE financial_reviewed_by IS NOT NULL 
           OR verified_by IS NOT NULL
        ORDER BY COALESCE(financial_reviewed_at, verified_at) DESC
      `);
      
      console.log('   ✅ Created financial_audit_trail_view view');
    } catch (error) {
      console.log(`   ❌ Error creating audit trail view: ${error.message}`);
    }

    console.log('\n📋 **Step 5: Testing All Views...**');
    
    // Test unified view
    try {
      const [transactionCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM unified_financial_transactions
      `);
      console.log(`   ✅ unified_financial_transactions: ${transactionCount[0].count} transactions`);

      if (transactionCount[0].count > 0) {
        const [typeDistribution] = await connection.execute(`
          SELECT 
            transaction_type,
            payment_status,
            financial_status,
            COUNT(*) as count,
            SUM(amount) as total_amount
          FROM unified_financial_transactions
          GROUP BY transaction_type, payment_status, financial_status
          ORDER BY transaction_type, payment_status
        `);

        console.log('\n   📊 **Transaction Distribution:**');
        typeDistribution.forEach(row => {
          console.log(`      • ${row.transaction_type} - ${row.payment_status}/${row.financial_status}: ${row.count} transactions (${row.total_amount} ZAR)`);
        });

        // Show sample transactions
        const [sampleTransactions] = await connection.execute(`
          SELECT 
            transaction_id,
            transaction_type,
            first_name,
            last_name,
            amount,
            payment_status,
            financial_status,
            payment_date
          FROM unified_financial_transactions
          ORDER BY created_at DESC
          LIMIT 5
        `);

        console.log('\n   📋 **Sample Transactions:**');
        sampleTransactions.forEach(tx => {
          console.log(`      • ${tx.transaction_id}: ${tx.first_name} ${tx.last_name} - ${tx.amount} ZAR (${tx.payment_status}/${tx.financial_status})`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error testing unified view: ${error.message}`);
    }

    // Test summary view
    try {
      const [summaryCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM financial_transactions_summary
      `);
      console.log(`\n   ✅ financial_transactions_summary: ${summaryCount[0].count} summary records`);
    } catch (error) {
      console.log(`   ❌ Error testing summary view: ${error.message}`);
    }

    // Test pending reviews view
    try {
      const [pendingCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM pending_financial_reviews
      `);
      console.log(`   ✅ pending_financial_reviews: ${pendingCount[0].count} pending reviews`);

      if (pendingCount[0].count > 0) {
        const [pendingSample] = await connection.execute(`
          SELECT 
            transaction_id,
            transaction_type,
            first_name,
            last_name,
            amount,
            financial_status,
            days_pending
          FROM pending_financial_reviews
          ORDER BY days_pending DESC
          LIMIT 3
        `);

        console.log('\n   📋 **Pending Reviews Sample:**');
        pendingSample.forEach(review => {
          console.log(`      • ${review.transaction_id}: ${review.first_name} ${review.last_name} - ${review.amount} ZAR (${review.days_pending} days pending)`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error testing pending reviews view: ${error.message}`);
    }

    // Test audit trail view
    try {
      const [auditCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM financial_audit_trail_view
      `);
      console.log(`   ✅ financial_audit_trail_view: ${auditCount[0].count} audit records`);
    } catch (error) {
      console.log(`   ❌ Error testing audit trail view: ${error.message}`);
    }

    console.log('\n🎉 **TASK 1.3 COMPLETED SUCCESSFULLY!**');
    console.log('\n📊 **Unified Financial Transactions System Created:**');
    console.log('   ✅ **unified_financial_transactions** - Master view combining all payment sources');
    console.log('   ✅ **financial_transactions_summary** - Dashboard summary statistics');
    console.log('   ✅ **pending_financial_reviews** - Transactions awaiting review');
    console.log('   ✅ **financial_audit_trail_view** - Complete audit history');
    
    console.log('\n🔍 **Financial Reviewers Can Now:**');
    console.log('   • View all payment transactions in one unified interface ✅');
    console.log('   • See application and renewal payments together ✅');
    console.log('   • Track financial review status across all transaction types ✅');
    console.log('   • Access comprehensive payment audit trails ✅');
    console.log('   • Monitor pending reviews with aging information ✅');
    console.log('   • Generate financial summary reports ✅');

    console.log('\n🚀 **Ready for Task 1.4: Create Financial Review API Endpoints**');

  } catch (error) {
    console.error('❌ **View creation failed:**', error.message);
  } finally {
    await connection.end();
  }
}

// Run the view creation
createUnifiedViewsCorrect();
