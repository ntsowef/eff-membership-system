/**
 * EFF MEMBERSHIP - BIRTHDAY SMS BACKEND INTEGRATION
 * 
 * This file demonstrates how to integrate the birthday SMS system
 * with your Node.js/Express backend for daily automation
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cron = require('node-cron');

class BirthdayService {
    constructor(dbConfig) {
        this.dbConfig = dbConfig;
        this.pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    /**
     * Get today's birthday statistics
     */
    async getBirthdayStatistics() {
        try {
            const [rows] = await this.pool.execute(`
                SELECT * FROM vw_birthday_statistics
            `);
            
            return {
                success: true,
                data: rows[0]
            };
        } catch (error) {
            return {
                success: false,
                error: 'STATISTICS_ERROR',
                message: error.message
            };
        }
    }

    /**
     * Get today's birthday members
     */
    async getTodaysBirthdayMembers() {
        try {
            const [rows] = await this.pool.execute(`
                SELECT 
                    member_id, full_name, current_age, cell_number,
                    ward_name, municipality_name, province_name,
                    sms_eligible, birthday_sms_sent_this_year
                FROM vw_todays_birthday_members 
                ORDER BY province_name, municipality_name, surname
            `);
            
            return {
                success: true,
                data: {
                    count: rows.length,
                    members: rows
                }
            };
        } catch (error) {
            return {
                success: false,
                error: 'MEMBERS_ERROR',
                message: error.message
            };
        }
    }

    /**
     * Get available birthday templates
     */
    async getBirthdayTemplates() {
        try {
            const [rows] = await this.pool.execute(`
                SELECT 
                    template_id, template_name, template_code, 
                    subject, message_template, variables
                FROM sms_templates 
                WHERE category = 'birthday' AND is_active = TRUE
                ORDER BY template_name
            `);
            
            return {
                success: true,
                data: {
                    count: rows.length,
                    templates: rows
                }
            };
        } catch (error) {
            return {
                success: false,
                error: 'TEMPLATES_ERROR',
                message: error.message
            };
        }
    }

    /**
     * Process daily birthdays
     */
    async processDailyBirthdays(templateCode = 'BIRTHDAY_STANDARD', senderId = 1, dryRun = false, maxRecipients = 1000) {
        try {
            const [rows] = await this.pool.execute(`
                SELECT sp_process_daily_birthdays(?, ?, ?, ?) as result
            `, [templateCode, senderId, dryRun, maxRecipients]);
            
            const result = JSON.parse(rows[0].result);
            return result;
        } catch (error) {
            return {
                success: false,
                error: 'PROCESSING_ERROR',
                message: error.message
            };
        }
    }

    /**
     * Preview birthday processing
     */
    async previewBirthdayProcessing(templateCode = 'BIRTHDAY_STANDARD') {
        return await this.processDailyBirthdays(templateCode, 1, true, 10);
    }

    /**
     * Execute birthday processing
     */
    async executeBirthdayProcessing(templateCode = 'BIRTHDAY_STANDARD', senderId = 1) {
        return await this.processDailyBirthdays(templateCode, senderId, false, 1000);
    }
}

/**
 * Express.js Route Handlers
 */
function createBirthdayRoutes(birthdayService) {
    const router = express.Router();

    // Get birthday statistics
    router.get('/statistics', async (req, res) => {
        try {
            const result = await birthdayService.getBirthdayStatistics();
            res.json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'SERVER_ERROR',
                message: error.message
            });
        }
    });

    // Get today's birthday members
    router.get('/today', async (req, res) => {
        try {
            const result = await birthdayService.getTodaysBirthdayMembers();
            res.json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'SERVER_ERROR',
                message: error.message
            });
        }
    });

    // Get birthday templates
    router.get('/templates', async (req, res) => {
        try {
            const result = await birthdayService.getBirthdayTemplates();
            res.json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'SERVER_ERROR',
                message: error.message
            });
        }
    });

    // Preview birthday processing
    router.post('/preview', async (req, res) => {
        try {
            const { templateCode = 'BIRTHDAY_STANDARD' } = req.body;
            const result = await birthdayService.previewBirthdayProcessing(templateCode);
            res.json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'SERVER_ERROR',
                message: error.message
            });
        }
    });

    // Process daily birthdays
    router.post('/process', async (req, res) => {
        try {
            const { 
                templateCode = 'BIRTHDAY_STANDARD', 
                dryRun = false,
                maxRecipients = 1000 
            } = req.body;
            
            const senderId = req.user?.id || 1; // Get from authenticated user
            
            const result = await birthdayService.processDailyBirthdays(
                templateCode, 
                senderId, 
                dryRun, 
                maxRecipients
            );
            
            if (result.success) {
                // Log successful processing
                console.log(`✅ Birthday processing completed: ${result.data.processed_count} messages`);
                
                // You could add webhook notifications here
                // await notifySlack(`Birthday SMS: ${result.data.processed_count} messages sent`);
            }
            
            res.json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'SERVER_ERROR',
                message: error.message
            });
        }
    });

    return router;
}

/**
 * Daily Automation Setup
 */
function setupDailyAutomation(birthdayService) {
    // Schedule daily birthday processing at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('🎂 Starting daily birthday SMS processing...');
        
        try {
            // First, get statistics
            const stats = await birthdayService.getBirthdayStatistics();
            
            if (stats.success && stats.data.todays_birthdays_eligible > 0) {
                console.log(`📊 Found ${stats.data.todays_birthdays_eligible} eligible birthday members`);
                
                // Process birthdays with standard template
                const result = await birthdayService.executeBirthdayProcessing('BIRTHDAY_STANDARD', 1);
                
                if (result.success) {
                    console.log(`✅ Successfully processed ${result.data.processed_count} birthday SMS messages`);
                    
                    // Optional: Send notification to admin
                    // await sendAdminNotification({
                    //     type: 'birthday_processing',
                    //     count: result.data.processed_count,
                    //     date: result.data.processing_date
                    // });
                } else {
                    console.error('❌ Birthday processing failed:', result.message);
                    
                    // Optional: Send error notification
                    // await sendErrorNotification('Birthday SMS processing failed', result.message);
                }
            } else {
                console.log('ℹ️  No eligible birthday members today');
            }
        } catch (error) {
            console.error('❌ Daily birthday automation error:', error);
            
            // Optional: Send error notification
            // await sendErrorNotification('Birthday automation error', error.message);
        }
    });

    console.log('⏰ Daily birthday automation scheduled for 9:00 AM');
}

/**
 * Example Express App Setup
 */
function createBirthdayApp() {
    const app = express();
    app.use(express.json());

    // Database configuration
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'eff_membership_db',
        port: 3306
    };

    // Initialize birthday service
    const birthdayService = new BirthdayService(dbConfig);

    // Setup routes
    app.use('/api/birthdays', createBirthdayRoutes(birthdayService));

    // Setup daily automation
    setupDailyAutomation(birthdayService);

    // Health check endpoint
    app.get('/api/health', (req, res) => {
        res.json({
            success: true,
            service: 'EFF Birthday SMS Service',
            status: 'running',
            timestamp: new Date().toISOString()
        });
    });

    return app;
}

/**
 * Manual Testing Functions
 */
async function testBirthdaySystem() {
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'eff_membership_db',
        port: 3306
    };

    const birthdayService = new BirthdayService(dbConfig);

    console.log('🧪 Testing Birthday System...');

    try {
        // Test statistics
        console.log('\n📊 Getting statistics...');
        const stats = await birthdayService.getBirthdayStatistics();
        console.log('Statistics:', stats);

        // Test templates
        console.log('\n📝 Getting templates...');
        const templates = await birthdayService.getBirthdayTemplates();
        console.log(`Found ${templates.data?.count || 0} templates`);

        // Test preview
        console.log('\n🎭 Testing preview...');
        const preview = await birthdayService.previewBirthdayProcessing();
        console.log('Preview result:', preview);

        console.log('\n✅ Birthday system test completed');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Export for use in other modules
module.exports = {
    BirthdayService,
    createBirthdayRoutes,
    setupDailyAutomation,
    createBirthdayApp,
    testBirthdaySystem
};

// Run test if this file is executed directly
if (require.main === module) {
    testBirthdaySystem();
}
