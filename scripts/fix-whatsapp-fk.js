const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function fixForeignKeys() {
  try {
    // Fix whatsapp_bot_sessions FK
    await pool.query('ALTER TABLE whatsapp_bot_sessions DROP CONSTRAINT IF EXISTS whatsapp_bot_sessions_member_id_fkey');
    await pool.query('ALTER TABLE whatsapp_bot_sessions ADD CONSTRAINT whatsapp_bot_sessions_member_id_fkey FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE');
    console.log('✅ Fixed whatsapp_bot_sessions FK → ON DELETE CASCADE');

    // Fix whatsapp_bot_logs FK
    await pool.query('ALTER TABLE whatsapp_bot_logs DROP CONSTRAINT IF EXISTS whatsapp_bot_logs_member_id_fkey');
    await pool.query('ALTER TABLE whatsapp_bot_logs ADD CONSTRAINT whatsapp_bot_logs_member_id_fkey FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE');
    console.log('✅ Fixed whatsapp_bot_logs FK → ON DELETE CASCADE');

    // Fix whatsapp_notification_queue FK
    await pool.query('ALTER TABLE whatsapp_notification_queue DROP CONSTRAINT IF EXISTS whatsapp_notification_queue_member_id_fkey');
    await pool.query('ALTER TABLE whatsapp_notification_queue ADD CONSTRAINT whatsapp_notification_queue_member_id_fkey FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE');
    console.log('✅ Fixed whatsapp_notification_queue FK → ON DELETE CASCADE');

    // Verify
    const result = await pool.query(
      "SELECT conname, confdeltype FROM pg_constraint WHERE conname IN ('whatsapp_bot_sessions_member_id_fkey', 'whatsapp_bot_logs_member_id_fkey', 'whatsapp_notification_queue_member_id_fkey')"
    );
    console.log('\n📊 Verification (confdeltype c = CASCADE):');
    result.rows.forEach(row => {
      console.log(`  ${row.conname}: ${row.confdeltype === 'c' ? '✅ CASCADE' : '❌ ' + row.confdeltype}`);
    });

    await pool.end();
    console.log('\n✅ Done! WhatsApp tables now support cascading deletes.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

fixForeignKeys();

