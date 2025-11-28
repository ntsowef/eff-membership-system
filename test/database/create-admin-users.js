/**
 * Create All Admin Users Script
 * 
 * This script creates admin users at all levels:
 * - National (1 user)
 * - Provincial (9 users - one per province)
 * - District (All districts)
 * - Municipal (All municipalities)
 * - Ward (All wards)
 * 
 * Default Password: Admin@123
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
});

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

async function createAdminUsers() {
    console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║        EFF Membership System - Create All Admin Users         ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    try {
        // Read and execute the SQL file
        const sqlFile = path.join(__dirname, 'create_all_admin_users_postgres.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log(`${colors.cyan}📄 Executing SQL script...${colors.reset}\n`);

        // Execute the SQL
        await pool.query(sql);

        console.log(`${colors.green}✅ Admin users created successfully!${colors.reset}\n`);

        // Get statistics
        console.log(`${colors.bright}${colors.yellow}📊 Admin User Statistics:${colors.reset}\n`);

        const statsQuery = `
            SELECT
                admin_level,
                COUNT(*) as admin_count,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_count
            FROM users
            WHERE admin_level IS NOT NULL
            GROUP BY admin_level
            ORDER BY
                CASE admin_level
                    WHEN 'national' THEN 1
                    WHEN 'province' THEN 2
                    WHEN 'district' THEN 3
                    WHEN 'municipality' THEN 4
                    WHEN 'ward' THEN 5
                    ELSE 6
                END;
        `;

        const stats = await pool.query(statsQuery);
        console.table(stats.rows);

        // Get sample credentials
        console.log(`\n${colors.bright}${colors.yellow}🔑 Sample Admin Credentials:${colors.reset}\n`);

        const credentialsQuery = `
            SELECT
                admin_level,
                email,
                'Admin@123' as password,
                CASE
                    WHEN admin_level = 'national' THEN 'National Level'
                    WHEN admin_level = 'province' THEN province_code || ' Province'
                    WHEN admin_level = 'district' THEN district_code || ' District'
                    WHEN admin_level = 'municipality' THEN municipal_code || ' Municipality'
                    WHEN admin_level = 'ward' THEN 'Ward ' || ward_code
                END as assignment
            FROM users
            WHERE admin_level IN ('national', 'province', 'district', 'municipality', 'ward')
            ORDER BY
                CASE admin_level
                    WHEN 'national' THEN 1
                    WHEN 'province' THEN 2
                    WHEN 'district' THEN 3
                    WHEN 'municipality' THEN 4
                    WHEN 'ward' THEN 5
                END,
                email
            LIMIT 20;
        `;

        const credentials = await pool.query(credentialsQuery);
        console.table(credentials.rows);

        // Get total count
        const totalQuery = `
            SELECT COUNT(*) as total_admins
            FROM users
            WHERE admin_level IS NOT NULL;
        `;

        const total = await pool.query(totalQuery);
        console.log(`\n${colors.bright}${colors.green}✅ Total Admin Users Created: ${total.rows[0].total_admins}${colors.reset}\n`);

        // Display login instructions
        console.log(`${colors.bright}${colors.cyan}📝 Login Instructions:${colors.reset}`);
        console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`\n${colors.bright}Default Password for ALL users: ${colors.green}Admin@123${colors.reset}\n`);
        console.log(`${colors.cyan}Sample Login Credentials:${colors.reset}`);
        console.log(`  • National Admin: ${colors.green}national.admin@eff.org.za${colors.reset}`);
        console.log(`  • Gauteng Provincial: ${colors.green}gauteng.admin@eff.org.za${colors.reset}`);
        console.log(`  • District Admin: ${colors.green}district.[district-name].admin@eff.org.za${colors.reset}`);
        console.log(`  • Municipal Admin: ${colors.green}municipal.[municipality-name].admin@eff.org.za${colors.reset}`);
        console.log(`  • Ward Admin: ${colors.green}ward.[ward-number].[municipality-name].admin@eff.org.za${colors.reset}\n`);

        console.log(`${colors.bright}${colors.green}🎉 Admin user creation completed successfully!${colors.reset}\n`);

    } catch (error) {
        console.error(`${colors.red}❌ Error creating admin users:${colors.reset}`, error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the script
createAdminUsers();

