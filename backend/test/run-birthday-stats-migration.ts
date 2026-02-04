import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running birthday monthly stats view migration...\n');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'database', 'migrations', 'create_birthday_monthly_stats_view.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split by semicolons but handle the verification queries separately
    const mainSQL = sqlContent.split('-- Verify the views')[0];
    
    // Execute the main migration
    await client.query(mainSQL);
    console.log('✅ Views created successfully!\n');
    
    // Verify and show results
    console.log('📊 Monthly Birthday Statistics:');
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
    console.log('\n📅 Active Members with Birthdays This Month:');
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
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);

