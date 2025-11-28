/**
 * Update Admin User Passwords
 * 
 * This script updates all admin user passwords to the correct bcrypt hash
 * Password: Admin@123
 */

const { Pool } = require('pg');
const bcrypt = require('../../backend/node_modules/bcrypt');

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

async function updatePasswords() {
    console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║        EFF Membership System - Update Admin Passwords         ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    try {
        // Generate proper bcrypt hash for Admin@123
        console.log(`${colors.cyan}🔐 Generating password hash for: Admin@123${colors.reset}\n`);
        const password = 'Admin@123';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log(`${colors.green}✅ Password hash generated successfully${colors.reset}\n`);
        console.log(`${colors.yellow}Hash: ${hashedPassword}${colors.reset}\n`);

        // Update all admin users
        console.log(`${colors.cyan}📝 Updating all admin user passwords...${colors.reset}\n`);

        const updateQuery = `
            UPDATE users
            SET password = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE admin_level IS NOT NULL
        `;

        const result = await pool.query(updateQuery, [hashedPassword]);
        
        console.log(`${colors.green}✅ Updated ${result.rowCount} admin user passwords${colors.reset}\n`);

        // Get statistics
        console.log(`${colors.bright}${colors.yellow}📊 Updated Admin User Statistics:${colors.reset}\n`);

        const statsQuery = `
            SELECT
                admin_level,
                COUNT(*) as admin_count
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

        // Display login instructions
        console.log(`\n${colors.bright}${colors.cyan}📝 Login Instructions:${colors.reset}`);
        console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`\n${colors.bright}Password for ALL admin users: ${colors.green}Admin@123${colors.reset}\n`);
        console.log(`${colors.cyan}Sample Login Credentials:${colors.reset}`);
        console.log(`  • National Admin: ${colors.green}national.admin@eff.org.za${colors.reset} / ${colors.green}Admin@123${colors.reset}`);
        console.log(`  • Gauteng Provincial: ${colors.green}gauteng.admin@eff.org.za${colors.reset} / ${colors.green}Admin@123${colors.reset}`);
        console.log(`  • District Admin: ${colors.green}district.[district-code].admin@eff.org.za${colors.reset} / ${colors.green}Admin@123${colors.reset}`);
        console.log(`  • Municipal Admin: ${colors.green}municipal.[municipality-code].admin@eff.org.za${colors.reset} / ${colors.green}Admin@123${colors.reset}`);
        console.log(`  • Ward Admin: ${colors.green}ward.[ward-code].admin@eff.org.za${colors.reset} / ${colors.green}Admin@123${colors.reset}\n`);

        console.log(`${colors.bright}${colors.green}🎉 Password update completed successfully!${colors.reset}\n`);
        console.log(`${colors.yellow}⚠️  You can now login with any admin user using password: Admin@123${colors.reset}\n`);

    } catch (error) {
        console.error(`${colors.red}❌ Error updating passwords:${colors.reset}`, error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the script
updatePasswords();

