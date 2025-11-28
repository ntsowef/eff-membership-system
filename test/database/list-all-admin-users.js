/**
 * List All Admin Users Script
 * 
 * This script lists all existing admin users at all levels
 */

const { Pool } = require('pg');

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

async function listAdminUsers() {
    console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║        EFF Membership System - List All Admin Users           ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    try {
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

        // Get total count
        const totalQuery = `
            SELECT COUNT(*) as total_admins
            FROM users
            WHERE admin_level IS NOT NULL;
        `;

        const total = await pool.query(totalQuery);
        console.log(`\n${colors.bright}${colors.green}✅ Total Admin Users: ${total.rows[0].total_admins}${colors.reset}\n`);

        // Get sample users from each level
        console.log(`\n${colors.bright}${colors.yellow}👥 Sample Admin Users by Level:${colors.reset}\n`);

        const levelsQuery = `
            WITH ranked_users AS (
                SELECT
                    admin_level,
                    name,
                    email,
                    is_active,
                    ROW_NUMBER() OVER (PARTITION BY admin_level ORDER BY created_at) as rn
                FROM users
                WHERE admin_level IS NOT NULL
            )
            SELECT
                admin_level,
                name,
                email,
                is_active
            FROM ranked_users
            WHERE rn <= 5
            ORDER BY
                CASE admin_level
                    WHEN 'national' THEN 1
                    WHEN 'province' THEN 2
                    WHEN 'district' THEN 3
                    WHEN 'municipality' THEN 4
                    WHEN 'ward' THEN 5
                    ELSE 6
                END,
                rn;
        `;

        const levels = await pool.query(levelsQuery);
        console.table(levels.rows);

        // Display login instructions
        console.log(`\n${colors.bright}${colors.cyan}📝 Login Instructions:${colors.reset}`);
        console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`\n${colors.bright}Default Password for ALL users: ${colors.green}Admin@123${colors.reset}\n`);
        console.log(`${colors.cyan}Use any email from the list above with password: Admin@123${colors.reset}\n`);

        console.log(`${colors.bright}${colors.green}🎉 Admin user listing completed successfully!${colors.reset}\n`);

    } catch (error) {
        console.error(`${colors.red}❌ Error listing admin users:${colors.reset}`, error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the script
listAdminUsers();

