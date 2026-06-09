import { Client } from 'pg';
import { executeQuery, initializeDatabase, closeDatabasePool } from '../src/config/database';

async function addCategoryColumnLocal() {
    try {
        console.log('🔄 Initializing local database connection...');
        await initializeDatabase();

        console.log('🛠️  Adding category column to local sms_messages table...');
        await executeQuery(`
      ALTER TABLE sms_messages 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General';
    `);

        // Index for faster filtering
        await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_sms_messages_category ON sms_messages(category);
    `);

        console.log('✅ Added category column to local DB');
    } catch (error) {
        console.error('❌ Failed to update local database schema:', error);
        throw error;
    } finally {
        await closeDatabasePool();
    }
}

async function addCategoryColumnProd() {
    const client = new Client({
        host: '69.164.245.173',
        port: 5432,
        user: 'eff_admin',
        password: 'Frames!123',
        database: 'eff_membership_database',
    });

    try {
        console.log('🔗 Connecting to production database at 69.164.245.173...');
        await client.connect();
        console.log('✅ Connection successful!');

        console.log('🛠️  Adding category column to production sms_messages table...');
        await client.query(`
      ALTER TABLE sms_messages 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General';
    `);

        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sms_messages_category ON sms_messages(category);
    `);

        console.log('✅ Added category column to production DB');
    } catch (err) {
        console.error('❌ Production Fix Error:', err);
        throw err;
    } finally {
        await client.end();
    }
}

async function main() {
    try {
        await addCategoryColumnLocal();
        await addCategoryColumnProd();
        console.log('✨ All database schema updates complete!');
    } catch (e) {
        console.log('Task Failed');
        process.exit(1);
    }
}

main();
