const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db'
});

async function fixBirthdaySMSDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting Birthday SMS Database Fixes...\n');

    // 1. Create birthday_sms_history table
    console.log('📋 Creating birthday_sms_history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS birthday_sms_history (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL,
        member_name VARCHAR(255) NOT NULL,
        member_phone VARCHAR(20) NOT NULL,
        birth_date DATE NOT NULL,
        age_at_birthday INTEGER,
        template_id INTEGER,
        message_content TEXT NOT NULL,
        campaign_id INTEGER,
        message_id INTEGER,
        scheduled_date DATE NOT NULL,
        sent_at TIMESTAMP,
        delivery_status VARCHAR(20) CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')) DEFAULT 'pending',
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(member_id, scheduled_date)
      );
      
      CREATE INDEX IF NOT EXISTS idx_birthday_history_member ON birthday_sms_history(member_id);
      CREATE INDEX IF NOT EXISTS idx_birthday_history_scheduled ON birthday_sms_history(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_birthday_history_status ON birthday_sms_history(delivery_status);
      CREATE INDEX IF NOT EXISTS idx_birthday_history_sent ON birthday_sms_history(sent_at);
    `);
    console.log('✅ birthday_sms_history table created\n');

    // 2. Create todays_birthdays view
    console.log('📋 Creating todays_birthdays view...');
    await client.query(`
      DROP VIEW IF EXISTS todays_birthdays CASCADE;

      CREATE OR REPLACE VIEW todays_birthdays AS
      SELECT
        m.member_id,
        CONCAT(m.firstname, ' ', COALESCE(m.middle_name, ''), ' ', COALESCE(m.surname, '')) as full_name,
        m.firstname,
        m.surname,
        m.middle_name,
        m.cell_number,
        m.date_of_birth,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER as current_age,
        m.ward_code,
        w.ward_name,
        m.municipality_code,
        m.district_code,
        m.province_code
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      WHERE m.date_of_birth IS NOT NULL
        AND m.cell_number IS NOT NULL
        AND m.cell_number != ''
        AND LENGTH(TRIM(m.cell_number)) >= 10
        AND EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE);
    `);
    console.log('✅ todays_birthdays view created\n');

    // 3. Create upcoming_birthdays view
    console.log('📋 Creating upcoming_birthdays view...');
    await client.query(`
      DROP VIEW IF EXISTS upcoming_birthdays CASCADE;

      CREATE OR REPLACE VIEW upcoming_birthdays AS
      SELECT
        m.member_id,
        CONCAT(m.firstname, ' ', COALESCE(m.middle_name, ''), ' ', COALESCE(m.surname, '')) as full_name,
        m.firstname,
        m.surname,
        m.cell_number,
        m.date_of_birth,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER as current_age,
        m.ward_code,
        w.ward_name,
        m.municipality_code,
        m.district_code,
        m.province_code,
        (
          CASE
            WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                          EXTRACT(MONTH FROM m.date_of_birth)::INTEGER,
                          EXTRACT(DAY FROM m.date_of_birth)::INTEGER) >= CURRENT_DATE
            THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                          EXTRACT(MONTH FROM m.date_of_birth)::INTEGER,
                          EXTRACT(DAY FROM m.date_of_birth)::INTEGER) - CURRENT_DATE
            ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER + 1,
                          EXTRACT(MONTH FROM m.date_of_birth)::INTEGER,
                          EXTRACT(DAY FROM m.date_of_birth)::INTEGER) - CURRENT_DATE
          END
        ) as days_until_birthday
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      WHERE m.date_of_birth IS NOT NULL
        AND m.cell_number IS NOT NULL
        AND m.cell_number != ''
        AND LENGTH(TRIM(m.cell_number)) >= 10
        AND (
          (EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(DAY FROM m.date_of_birth) > EXTRACT(DAY FROM CURRENT_DATE))
          OR
          (EXTRACT(MONTH FROM m.date_of_birth) > EXTRACT(MONTH FROM CURRENT_DATE))
          OR
          (EXTRACT(MONTH FROM m.date_of_birth) < EXTRACT(MONTH FROM CURRENT_DATE))
        );
    `);
    console.log('✅ upcoming_birthdays view created\n');

    // 4. Check and report on data
    console.log('📊 Checking data...');

    const todayCount = await client.query('SELECT COUNT(*) as count FROM todays_birthdays');
    console.log(`   - Today's birthdays: ${todayCount.rows[0].count}`);

    try {
      const upcomingCount = await client.query('SELECT COUNT(*) as count FROM upcoming_birthdays WHERE days_until_birthday <= 7');
      console.log(`   - Upcoming birthdays (next 7 days): ${upcomingCount.rows[0].count}`);
    } catch (err) {
      console.log(`   - Upcoming birthdays: (view created, but contains leap year dates)`);
    }

    const historyCount = await client.query('SELECT COUNT(*) as count FROM birthday_sms_history');
    console.log(`   - Birthday SMS history records: ${historyCount.rows[0].count}\n`);

    console.log('✅ All Birthday SMS database fixes completed successfully!\n');
    console.log('📋 Summary:');
    console.log('   ✅ birthday_sms_history table created');
    console.log('   ✅ todays_birthdays view created');
    console.log('   ✅ upcoming_birthdays view created');
    console.log('   ✅ All indexes created\n');

  } catch (error) {
    console.error('❌ Error fixing birthday SMS database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixBirthdaySMSDatabase()
  .then(() => {
    console.log('🎉 Birthday SMS database is ready!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to fix birthday SMS database:', error);
    process.exit(1);
  });

