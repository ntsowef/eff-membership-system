
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkSchema() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
    });

    try {
        const client = await pool.connect();

        console.log('--- Checking table columns ---');
        const columnsRes = await client.query(`
      SELECT table_name, column_name, data_type, udt_name, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name IN ('message_templates', 'message_deliveries', 'messages', 'communication_campaigns')
      AND (column_name = 'template_type' OR column_name = 'delivery_channel' OR column_name = 'status' OR column_name = 'delivery_status');
    `);
        console.log(JSON.stringify(columnsRes.rows, null, 2));

        console.log('\n--- Checking all types in database ---');
        const typesRes = await client.query(`
      SELECT n.nspname as schema, t.typname as type 
      FROM pg_type t 
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
      WHERE (n.nspname = 'public') 
      AND t.typtype = 'e';
    `);
        console.log(JSON.stringify(typesRes.rows, null, 2));

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();
