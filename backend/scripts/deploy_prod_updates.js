const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function runUpdates() {
    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected.');

        // --- Migration 010 ---
        console.log('\n📦 Processing Migration 010: Workflow fields to membership_renewals...');
        const path010 = path.join(__dirname, '../prisma/migrations/010_add_workflow_fields_to_membership_renewals.sql');
        if (fs.existsSync(path010)) {
            const sql010 = fs.readFileSync(path010, 'utf8');
            try {
                await client.query(sql010);
                console.log('✅ Migration 010 executed successfully.');
            } catch (e) {
                console.error('❌ Error executing Migration 010:', e.message);
                // Proceed? Maybe depends on error. usually "duplicate column" is okay if we use IF NOT EXISTS.
                // But if the script uses IF NOT EXISTS, it shouldn't error.
            }
        } else {
            console.error('❌ File not found: 010_...sql');
        }


        // --- Migration 011 ---
        console.log('\n📦 Processing Migration 011: Voter registration tracking...');
        const path011 = path.join(__dirname, '../prisma/migrations/011_add_voter_registration_tracking.sql');
        if (fs.existsSync(path011)) {
            const sql011 = fs.readFileSync(path011, 'utf8');
            try {
                await client.query(sql011);
                console.log('✅ Migration 011 executed successfully.');
            } catch (e) {
                console.error('❌ Error executing Migration 011:', e.message);
            }
        } else {
            console.error('❌ File not found: 011_...sql');
        }

        // --- Verification ---
        console.log('\n🔍 Verifying Updates...');

        // Check membership_renewals
        const res1 = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'membership_renewals' AND column_name = 'workflow_stage'
    `);
        if (res1.rows.length > 0) console.log('✅ Verified: membership_renewals.workflow_stage exists');
        else console.error('❌ FAILED: membership_renewals.workflow_stage MISSING');

        // Check members_consolidated
        const res2 = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'members_consolidated' AND column_name = 'voter_registration_id'
    `);
        if (res2.rows.length > 0) console.log('✅ Verified: members_consolidated.voter_registration_id exists');
        else console.error('❌ FAILED: members_consolidated.voter_registration_id MISSING');


    } catch (err) {
        console.error('❌ FATAL ERROR:', err);
    } finally {
        await client.end();
    }
}

runUpdates();
