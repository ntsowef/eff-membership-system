const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration012() {
    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected.');

        console.log('\n📦 Processing Migration 012: Communication Groups...');
        const migrationPath = path.join(__dirname, '../prisma/migrations/012_create_communication_groups.sql');

        if (fs.existsSync(migrationPath)) {
            const sql = fs.readFileSync(migrationPath, 'utf8');
            try {
                await client.query(sql);
                console.log('✅ Migration 012 executed successfully.');
            } catch (e) {
                console.error('❌ Error executing Migration 012:', e.message);
            }
        } else {
            console.error('❌ File not found:', migrationPath);
        }

        // Verify
        console.log('\n🔍 Verifying...');
        const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('communication_groups', 'communication_group_members')
    `);

        if (res.rows.length === 2) {
            console.log('✅ Verification Successful: Both tables exist.');
        } else {
            console.log('⚠️ Verification Warning: Found ' + res.rows.length + ' tables. Expected 2.');
            res.rows.forEach(r => console.log(' - ' + r.table_name));
        }

    } catch (err) {
        console.error('❌ FATAL ERROR:', err);
    } finally {
        await client.end();
    }
}

runMigration012();
