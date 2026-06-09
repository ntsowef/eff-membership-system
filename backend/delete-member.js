
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: '69.164.245.173', port: 5432, user: 'eff_admin', password: 'Frames!123', database: 'eff_membership_database'
});

async function deleteMember(idNumber) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Perform delete on members table
    const res = await client.query('DELETE FROM members WHERE id_number = $1', [idNumber]);
    
    if (res.rowCount > 0) {
      console.log(`✅ Successfully deleted ${res.rowCount} record(s) with ID ${idNumber} from the 'members' table.`);
      
      // Optionally delete from members_consolidated as well (though my research showed it empty for this ID)
      const resConsol = await client.query('DELETE FROM members_consolidated WHERE id_number = $1', [idNumber]);
      if (resConsol.rowCount > 0) {
          console.log(`✅ Also deleted ${resConsol.rowCount} record(s) from 'members_consolidated'.`);
      }
      
      await client.query('COMMIT');
    } else {
      console.log('❌ No record found to delete.');
      await client.query('ROLLBACK');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during deletion:', err.message);
  } finally {
    client.release(); await pool.end();
  }
}

const targetID = process.argv[2] || '7808020703087';
deleteMember(targetID).catch(console.error);
