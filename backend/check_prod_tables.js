const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function listTables() {
    try {
        await client.connect();
        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

        console.log(`Found ${res.rows.length} tables:`);
        res.rows.forEach(row => console.log(`- ${row.table_name}`));

        // Also check for _prisma_migrations
        const prismaRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = '_prisma_migrations';
    `);

        if (prismaRes.rows.length > 0) {
            console.log('\n_prisma_migrations table EXISTS.');
        } else {
            console.log('\n_prisma_migrations table DOES NOT EXIST.');
        }

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await client.end();
    }
}

listTables();
