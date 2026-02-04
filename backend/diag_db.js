const { Client } = require('pg');

const connectionString = 'postgresql://eff_admin:Frames!123@localhost:5432/eff_membership_database';

async function diag() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to database');

        const tables = ['messages', 'members', 'members_consolidated', 'message_templates', 'communication_preferences', 'communication_campaigns', 'message_deliveries', 'communication_analytics'];

        for (const table of tables) {
            console.log(`\n--- Columns for table: ${table} ---`);
            const res = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

            if (res.rows.length === 0) {
                console.log('Table not found or no columns.');
            } else {
                res.rows.forEach(row => {
                    console.log(`${row.column_name}: ${row.data_type} (Nullable: ${row.is_nullable})`);
                });
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

diag();
