import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Production database configuration
const PRODUCTION_CONFIG = {
  host: '69.164.245.173',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
};

const pool = new Pool(PRODUCTION_CONFIG);

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running birthday monthly stats view migration on PRODUCTION...');
    console.log(`📍 Target: ${PRODUCTION_CONFIG.host}:${PRODUCTION_CONFIG.port}/${PRODUCTION_CONFIG.database}\n`);
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'database', 'migrations', 'create_birthday_monthly_stats_view.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split by semicolons but handle the verification queries separately
    const mainSQL = sqlContent.split('-- Verify the views')[0];
    
    // Execute the main migration
    await client.query(mainSQL);
    console.log('✅ Views created successfully on PRODUCTION!\n');
    
    // Verify and show results
    console.log('📊 Monthly Birthday Statistics (PRODUCTION):');
    console.log('='.repeat(100));
    
    const statsResult = await client.query(`
      SELECT 
        month_name,
        total_birthdays,
        good_standing_count,
        sms_eligible_count,
        not_good_standing_count,
        no_phone_count,
        good_standing_percentage || '%' AS good_standing_pct,
        sms_eligible_percentage || '%' AS sms_eligible_pct
      FROM vw_birthday_monthly_stats
      ORDER BY birth_month
    `);
    
    console.table(statsResult.rows);
    
    // Show current month details
    console.log('\n📅 Active Members with Birthdays This Month (PRODUCTION):');
    console.log('='.repeat(100));
    
    const currentMonthResult = await client.query(`
      SELECT 
        full_name,
        cell_number,
        birth_day,
        current_age,
        province_name,
        membership_status,
        CASE WHEN message_sent_this_year THEN 'Yes' ELSE 'No' END AS msg_sent
      FROM vw_birthday_active_members_current_month
      LIMIT 20
    `);
    
    if (currentMonthResult.rows.length > 0) {
      console.table(currentMonthResult.rows);
      
      const totalCount = await client.query(`SELECT COUNT(*) FROM vw_birthday_active_members_current_month`);
      console.log(`\nTotal active members with birthdays this month: ${totalCount.rows[0].count}`);
    } else {
      console.log('No active members with birthdays this month found.');
    }
    
    console.log('\n✅ PRODUCTION migration completed successfully!');
    
  } catch (error) {
    console.error('❌ PRODUCTION Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);

