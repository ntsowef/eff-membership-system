
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  host: '69.164.245.173', port: 5432, user: 'eff_admin', password: 'Frames!123', database: 'eff_membership_database'
});

async function backupMember(idNumber) {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM members WHERE id_number = $1', [idNumber]);
    if (res.rows.length > 0) {
      const backupFile = `backup_member_${res.rows[0].member_id}.json`;
      fs.writeFileSync(backupFile, JSON.stringify(res.rows, null, 2));
      console.log(`✅ Backup saved to: ${backupFile}`);
    } else {
      console.log('❌ Member not found in production.');
    }
  } finally {
    client.release(); await pool.end();
  }
}

const targetID = process.argv[2] || '7808020703087';
backupMember(targetID).catch(console.error);
