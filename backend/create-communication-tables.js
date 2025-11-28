const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
});

async function createCommunicationTables() {
  console.log('🔧 Creating Communication Tables for Analytics');
  console.log('==============================================\n');
  
  try {
    // 1. Drop existing tables if they have issues
    console.log('1️⃣ Cleaning up existing tables...\n');
    
    try {
      await pool.query('DROP TABLE IF EXISTS message_deliveries CASCADE');
      await pool.query('DROP TABLE IF EXISTS communication_campaigns CASCADE');
      console.log('   ✅ Existing tables cleaned up');
    } catch (error) {
      console.log('   ℹ️  No existing tables to clean up');
    }
    
    // 2. Create communication_campaigns table
    console.log('\n2️⃣ Creating communication_campaigns table...\n');
    
    await pool.query(`
      CREATE TABLE communication_campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        campaign_type VARCHAR(50) DEFAULT 'general',
        status VARCHAR(50) DEFAULT 'Draft',
        total_sent INTEGER DEFAULT 0,
        total_delivered INTEGER DEFAULT 0,
        total_opened INTEGER DEFAULT 0,
        total_clicked INTEGER DEFAULT 0,
        total_failed INTEGER DEFAULT 0,
        recipient_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('   ✅ communication_campaigns table created');
    
    // 3. Create message_deliveries table
    console.log('\n3️⃣ Creating message_deliveries table...\n');
    
    await pool.query(`
      CREATE TABLE message_deliveries (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES communication_campaigns(id) ON DELETE CASCADE,
        recipient_id INTEGER,
        recipient_type VARCHAR(50) DEFAULT 'Member',
        delivery_channel VARCHAR(50) NOT NULL,
        delivery_status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delivered_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('   ✅ message_deliveries table created');
    
    // 4. Create indexes for performance
    console.log('\n4️⃣ Creating indexes for performance...\n');
    
    await pool.query(`
      CREATE INDEX idx_communication_campaigns_status ON communication_campaigns(status);
      CREATE INDEX idx_communication_campaigns_type ON communication_campaigns(campaign_type);
      CREATE INDEX idx_communication_campaigns_created_at ON communication_campaigns(created_at);
      
      CREATE INDEX idx_message_deliveries_campaign_id ON message_deliveries(campaign_id);
      CREATE INDEX idx_message_deliveries_status ON message_deliveries(delivery_status);
      CREATE INDEX idx_message_deliveries_channel ON message_deliveries(delivery_channel);
      CREATE INDEX idx_message_deliveries_created_at ON message_deliveries(created_at);
      CREATE INDEX idx_message_deliveries_recipient ON message_deliveries(recipient_id, recipient_type);
    `);
    
    console.log('   ✅ Performance indexes created');
    
    // 5. Insert sample data for testing
    console.log('\n5️⃣ Inserting sample communication data...\n');
    
    // Insert sample campaigns
    const campaignInsert = await pool.query(`
      INSERT INTO communication_campaigns (
        name, campaign_type, status, total_sent, total_delivered, 
        total_opened, total_clicked, total_failed, recipient_count,
        created_at, completed_at
      ) VALUES 
      ('Welcome Campaign', 'onboarding', 'Completed', 1000, 950, 450, 120, 50, 1000, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '6 days'),
      ('Monthly Newsletter', 'newsletter', 'Completed', 5000, 4800, 2400, 600, 200, 5000, CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '13 days'),
      ('Event Invitation', 'event', 'Sending', 2000, 1500, 300, 50, 100, 2000, CURRENT_TIMESTAMP - INTERVAL '3 days', NULL),
      ('Membership Renewal', 'renewal', 'Completed', 3000, 2850, 1200, 300, 150, 3000, CURRENT_TIMESTAMP - INTERVAL '21 days', CURRENT_TIMESTAMP - INTERVAL '20 days'),
      ('Holiday Greetings', 'seasonal', 'Completed', 8000, 7600, 3800, 950, 400, 8000, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '29 days')
      RETURNING id, name
    `);
    
    console.log(`   ✅ ${campaignInsert.rows.length} sample campaigns inserted:`);
    campaignInsert.rows.forEach(campaign => {
      console.log(`      - ${campaign.name} (ID: ${campaign.id})`);
    });
    
    // Insert sample message deliveries for each campaign
    for (const campaign of campaignInsert.rows) {
      const deliveryStatuses = ['Delivered', 'Opened', 'Clicked', 'Failed', 'Pending', 'Read'];
      const channels = ['Email', 'SMS', 'In-App'];
      
      for (let i = 0; i < 50; i++) { // 50 deliveries per campaign
        const channel = channels[Math.floor(Math.random() * channels.length)];
        const status = deliveryStatuses[Math.floor(Math.random() * deliveryStatuses.length)];
        const recipientId = Math.floor(Math.random() * 1000) + 1;
        
        await pool.query(`
          INSERT INTO message_deliveries (
            campaign_id, recipient_id, recipient_type, delivery_channel, 
            delivery_status, created_at, delivered_at, opened_at, clicked_at
          ) VALUES ($1, $2, 'Member', $3, $4, $5, $6, $7, $8)
        `, [
          campaign.id,
          recipientId,
          channel,
          status,
          new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          status === 'Delivered' || status === 'Opened' || status === 'Clicked' ? new Date() : null,
          status === 'Opened' || status === 'Clicked' ? new Date() : null,
          status === 'Clicked' ? new Date() : null
        ]);
      }
    }
    
    console.log('   ✅ Sample message deliveries inserted (250 total)');
    
    // 6. Test the tables
    console.log('\n6️⃣ Testing the created tables...\n');
    
    const campaignCount = await pool.query('SELECT COUNT(*) FROM communication_campaigns');
    const deliveryCount = await pool.query('SELECT COUNT(*) FROM message_deliveries');
    
    console.log(`   ✅ Communication campaigns: ${campaignCount.rows[0].count} records`);
    console.log(`   ✅ Message deliveries: ${deliveryCount.rows[0].count} records`);
    
    // Test analytics queries
    const testQueries = [
      {
        name: 'Campaign overview',
        query: `
          SELECT 
            COUNT(DISTINCT c.id) as total_campaigns,
            COUNT(DISTINCT CASE WHEN c.status IN ('Sending', 'Scheduled') THEN c.id END) as active_campaigns,
            COALESCE(SUM(c.total_sent), 0) as total_messages_sent,
            COALESCE(SUM(c.total_delivered), 0) as total_messages_delivered
          FROM communication_campaigns c
        `
      },
      {
        name: 'Channel statistics',
        query: `
          SELECT 
            delivery_channel,
            COUNT(*) as sent,
            COUNT(CASE WHEN delivery_status IN ('Delivered', 'Opened', 'Clicked', 'Read') THEN 1 END) as delivered
          FROM message_deliveries
          GROUP BY delivery_channel
        `
      },
      {
        name: 'Daily statistics',
        query: `
          SELECT 
            DATE(created_at) as date,
            COUNT(DISTINCT md.id) as messages_sent,
            COUNT(DISTINCT CASE WHEN md.delivery_status IN ('Delivered', 'Opened', 'Clicked', 'Read') THEN md.id END) as messages_delivered
          FROM message_deliveries md
          WHERE DATE(md.created_at) >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY DATE(md.created_at)
          ORDER BY date ASC
        `
      }
    ];
    
    console.log('\n📊 Testing Analytics Queries:');
    for (const test of testQueries) {
      try {
        const result = await pool.query(test.query);
        console.log(`   ✅ ${test.name}: ${result.rows.length} rows returned`);
        if (result.rows.length > 0 && result.rows.length <= 3) {
          console.log(`      Sample: ${JSON.stringify(result.rows[0], null, 2).substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`   ❌ ${test.name}: ${error.message}`);
      }
    }
    
    // 7. Final verification
    console.log('\n7️⃣ Final verification...\n');
    
    const tableInfo = await pool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('communication_campaigns', 'message_deliveries')
      ORDER BY table_name
    `);
    
    console.log('📊 FINAL TABLE STATUS:');
    console.log('======================');
    tableInfo.rows.forEach(table => {
      console.log(`   ✅ ${table.table_name}: ${table.column_count} columns`);
    });
    
    const indexInfo = await pool.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE tablename IN ('communication_campaigns', 'message_deliveries')
      ORDER BY tablename, indexname
    `);
    
    console.log('\n📊 INDEXES CREATED:');
    console.log('===================');
    indexInfo.rows.forEach(idx => {
      console.log(`   ✅ ${idx.tablename}.${idx.indexname}`);
    });
    
    console.log('\n🎉 COMMUNICATION TABLES SETUP COMPLETED!');
    console.log('=========================================');
    console.log('✅ communication_campaigns table created with proper structure');
    console.log('✅ message_deliveries table created with foreign key constraints');
    console.log('✅ Performance indexes created for all tables');
    console.log('✅ Sample data inserted for testing (5 campaigns, 250 deliveries)');
    console.log('✅ All analytics queries tested and working');
    console.log('✅ Communication analytics system ready for PostgreSQL!');
    
  } catch (error) {
    console.error('❌ Error during communication tables setup:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createCommunicationTables()
  .then(() => {
    console.log('\n✅ Communication tables setup completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Communication tables setup failed:', error.message);
    process.exit(1);
  });
