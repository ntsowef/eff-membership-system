/**
 * HARD DELETE user: limpopoadmin@effonline.org (ID: 4038)
 * Connects to PRODUCTION database remotely
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: '69.164.245.173',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
  ssl: false,
  connectionTimeoutMillis: 10000,
});

async function deleteUser() {
  const client = await pool.connect();
  try {
    const userId = 4038;
    const email = 'limpopoadmin@effonline.org';

    // 1. Find all tables that reference users.id via foreign keys
    const { rows: fkRefs } = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND ccu.column_name = 'id'
    `);

    console.log(`Found ${fkRefs.length} FK references to users table:`);
    fkRefs.forEach(r => console.log(`  ${r.table_name}.${r.column_name}`));

    await client.query('BEGIN');

    // 2. Nullify or delete references
    for (const { table_name, column_name } of fkRefs) {
      try {
        // Try setting to NULL first (for optional FKs)
        const nullResult = await client.query(
          `UPDATE ${table_name} SET ${column_name} = NULL WHERE ${column_name} = $1`,
          [userId]
        );
        if (nullResult.rowCount > 0) {
          console.log(`  Nullified ${nullResult.rowCount} row(s) in ${table_name}.${column_name}`);
        }
      } catch (e) {
        // If NOT NULL constraint, delete the rows instead
        try {
          const delResult = await client.query(
            `DELETE FROM ${table_name} WHERE ${column_name} = $1`,
            [userId]
          );
          if (delResult.rowCount > 0) {
            console.log(`  Deleted ${delResult.rowCount} row(s) from ${table_name}`);
          }
        } catch (e2) {
          console.log(`  Warning: Could not clean ${table_name}.${column_name}: ${e2.message}`);
        }
      }
    }

    // 3. Hard delete the user
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');

    console.log(`\n✅ User "Chantel Moela" (${email}) permanently deleted.`);

    // 4. Verify
    const verify = await client.query(
      `SELECT COUNT(*) as count FROM users WHERE email = $1`,
      [email]
    );
    const gone = verify.rows[0].count === '0' || verify.rows[0].count === 0;
    console.log(`Verification: ${gone ? 'User no longer exists ✅' : '⚠️ User still exists!'}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

deleteUser();
