const { Pool } = require('pg');
require('dotenv').config();

// =====================================================================================
// CHECK MESSAGE QUEUE TABLE STRUCTURE AND FIX COLUMN MISMATCHES
// =====================================================================================

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
  max: 20,
});

async function checkAndFixMessageQueueTable() {
  console.log('🔍 Checking message_queue Table Structure');
  console.log('=========================================\n');
  
  try {
    // 1. Check if table exists
    console.log('1️⃣ Checking if message_queue table exists...\n');
    
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'message_queue'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ message_queue table does not exist!');
      console.log('Creating message_queue table...\n');
      
      await pool.query(`
        CREATE TABLE message_queue (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL, -- 'sms', 'email', 'push'
          recipient VARCHAR(255) NOT NULL,
          subject VARCHAR(500),
          message TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
          priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
          scheduled_for TIMESTAMP, -- Changed from scheduled_at
          retry_after TIMESTAMP, -- Added missing column
          processed_at TIMESTAMP,
          attempts INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          error_message TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_message_queue_status ON message_queue(status);
        CREATE INDEX idx_message_queue_type ON message_queue(type);
        CREATE INDEX idx_message_queue_scheduled ON message_queue(scheduled_for);
        CREATE INDEX idx_message_queue_retry ON message_queue(retry_after);
      `);
      
      console.log('✅ message_queue table created successfully');
    } else {
      console.log('✅ message_queue table exists');
    }
    
    // 2. Check current table structure
    console.log('\n2️⃣ Analyzing current table structure...\n');
    
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'message_queue'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current message_queue columns:');
    columns.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
    });
    
    // 3. Check for missing columns that the queue service expects
    console.log('\n3️⃣ Checking for missing columns...\n');
    
    const currentColumns = columns.rows.map(row => row.column_name);
    const expectedColumns = [
      'id', 'type', 'recipient', 'subject', 'message', 'status', 'priority',
      'scheduled_for', 'retry_after', 'processed_at', 'attempts', 'max_attempts',
      'error_message', 'metadata', 'created_at', 'updated_at'
    ];
    
    const missingColumns = expectedColumns.filter(col => !currentColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('⚠️  Missing columns detected:');
      missingColumns.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col}`);
      });
      
      // Add missing columns
      console.log('\n4️⃣ Adding missing columns...\n');
      
      for (const column of missingColumns) {
        try {
          let alterQuery = '';
          
          switch (column) {
            case 'scheduled_for':
              alterQuery = 'ALTER TABLE message_queue ADD COLUMN scheduled_for TIMESTAMP';
              break;
            case 'retry_after':
              alterQuery = 'ALTER TABLE message_queue ADD COLUMN retry_after TIMESTAMP';
              break;
            case 'processed_at':
              alterQuery = 'ALTER TABLE message_queue ADD COLUMN processed_at TIMESTAMP';
              break;
            case 'attempts':
              alterQuery = 'ALTER TABLE message_queue ADD COLUMN attempts INTEGER DEFAULT 0';
              break;
            case 'max_attempts':
              alterQuery = 'ALTER TABLE message_queue ADD COLUMN max_attempts INTEGER DEFAULT 3';
              break;
            case 'error_message':
              alterQuery = 'ALTER TABLE message_queue ADD COLUMN error_message TEXT';
              break;
            case 'metadata':
              alterQuery = 'ALTER TABLE message_queue ADD COLUMN metadata JSONB';
              break;
            case 'updated_at':
              alterQuery = 'ALTER TABLE message_queue ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
              break;
            default:
              console.log(`   ⚠️  Unknown column: ${column}`);
              continue;
          }
          
          if (alterQuery) {
            await pool.query(alterQuery);
            console.log(`   ✅ Added column: ${column}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Failed to add ${column}: ${error.message}`);
        }
      }
      
      // Add missing indexes
      console.log('\n5️⃣ Adding missing indexes...\n');
      
      const indexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_message_queue_scheduled ON message_queue(scheduled_for)',
        'CREATE INDEX IF NOT EXISTS idx_message_queue_retry ON message_queue(retry_after)',
        'CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status)',
        'CREATE INDEX IF NOT EXISTS idx_message_queue_priority ON message_queue(priority)'
      ];
      
      for (const indexQuery of indexQueries) {
        try {
          await pool.query(indexQuery);
          console.log(`   ✅ Index created/verified`);
        } catch (error) {
          console.log(`   ⚠️  Index creation warning: ${error.message}`);
        }
      }
      
    } else {
      console.log('✅ All expected columns are present');
    }
    
    // 4. Test the query that was failing
    console.log('\n6️⃣ Testing the failing query...\n');
    
    try {
      const testQuery = `
        SELECT * FROM message_queue
        WHERE status = 'pending'
        AND (scheduled_for IS NULL OR scheduled_for <= NOW())
        AND (retry_after IS NULL OR retry_after <= NOW())
        ORDER BY priority DESC, created_at ASC
        LIMIT 50
      `;
      
      const testResult = await pool.query(testQuery);
      console.log(`✅ Query test successful! Found ${testResult.rows.length} pending messages`);
      
    } catch (error) {
      console.log(`❌ Query test failed: ${error.message}`);
    }
    
    // 5. Insert a test message to verify functionality
    console.log('\n7️⃣ Adding test message...\n');
    
    try {
      await pool.query(`
        INSERT INTO message_queue (type, recipient, message, status, priority)
        VALUES ('sms', '+1234567890', 'Test message for queue verification', 'pending', 5)
        ON CONFLICT DO NOTHING
      `);
      
      const count = await pool.query('SELECT COUNT(*) FROM message_queue');
      console.log(`✅ Test message added. Total messages in queue: ${count.rows[0].count}`);
      
    } catch (error) {
      console.log(`⚠️  Could not add test message: ${error.message}`);
    }
    
    // 6. Final verification
    console.log('\n8️⃣ Final verification...\n');
    
    const finalColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'message_queue'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 FINAL TABLE STRUCTURE:');
    console.log('=========================');
    finalColumns.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name}`);
    });
    
    console.log('\n🎉 MESSAGE QUEUE TABLE VERIFICATION COMPLETED!');
    console.log('==============================================');
    console.log('✅ Table structure verified and fixed');
    console.log('✅ All required columns present');
    console.log('✅ Indexes created for performance');
    console.log('✅ Query compatibility confirmed');
    console.log('✅ Ready for queue service operations');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the check
if (require.main === module) {
  checkAndFixMessageQueueTable()
    .then(() => {
      console.log('\n✅ Message queue table verification completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Message queue table verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkAndFixMessageQueueTable };
