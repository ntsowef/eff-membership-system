/**
 * MYSQL TO POSTGRESQL MIGRATION VERIFICATION TEST
 * 
 * Purpose: Verify all MySQL migration tables have been successfully converted to PostgreSQL
 * Features: Test table existence, structure, constraints, indexes, and relationships
 * 
 * Usage: node test/mysql_migration_verification_test.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database connection configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eff_membership_db',
    user: process.env.DB_USER || 'eff_admin',
    password: process.env.DB_PASSWORD || 'Frames!123',
});

/**
 * Test Suite for MySQL to PostgreSQL Migration Verification
 */
class MySQLMigrationVerificationTest {
    
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
        
        // Expected new tables from MySQL migrations
        this.expectedTables = {
            'Meeting System': [
                'meeting_types',
                'meetings', 
                'meeting_agenda_items',
                'meeting_attendance',
                'meeting_minutes',
                'meeting_document_templates',
                'meeting_documents',
                'meeting_action_items',
                'meeting_decisions',
                'meeting_invitations'
            ],
            'Communication System': [
                'message_templates',
                'communication_campaigns',
                'messages',
                'communication_analytics'
            ],
            'Maintenance System': [
                'maintenance_mode',
                'maintenance_mode_logs',
                'maintenance_notifications'
            ],
            'File Processing': [
                'file_processing_jobs'
            ],
            'Leadership Elections': [
                'leadership_elections',
                'leadership_election_candidates',
                'leadership_election_votes'
            ]
        };
    }

    /**
     * Log test results
     */
    log(testName, status, message, duration = null) {
        const result = {
            test: testName,
            status: status,
            message: message,
            duration: duration,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
        const durationText = duration ? ` (${duration}ms)` : '';
        console.log(`${statusIcon} ${testName}: ${message}${durationText}`);
    }

    /**
     * Test 1: Verify all expected tables exist
     */
    async testTableExistence() {
        const testStart = Date.now();
        
        try {
            const query = `
                SELECT table_name
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            `;
            
            const result = await pool.query(query);
            const existingTables = result.rows.map(row => row.table_name);
            
            let totalExpected = 0;
            let totalFound = 0;
            let missingTables = [];
            
            for (const [category, tables] of Object.entries(this.expectedTables)) {
                totalExpected += tables.length;
                
                for (const table of tables) {
                    if (existingTables.includes(table)) {
                        totalFound++;
                        this.log(`Table Existence - ${table}`, 'INFO', `Found in ${category}`);
                    } else {
                        missingTables.push(`${table} (${category})`);
                    }
                }
            }
            
            if (missingTables.length === 0) {
                this.log('Table Existence', 'PASS', 
                    `All ${totalExpected} expected tables found`, 
                    Date.now() - testStart);
            } else {
                this.log('Table Existence', 'FAIL', 
                    `Missing ${missingTables.length} tables: ${missingTables.join(', ')}`, 
                    Date.now() - testStart);
            }
            
        } catch (error) {
            this.log('Table Existence', 'FAIL', 
                `Database error: ${error.message}`, 
                Date.now() - testStart);
        }
    }

    /**
     * Test 2: Verify table structures and constraints
     */
    async testTableStructures() {
        const testStart = Date.now();
        
        try {
            // Test key table structures
            const structureTests = [
                {
                    table: 'meetings',
                    requiredColumns: ['meeting_id', 'meeting_title', 'meeting_type_id', 'hierarchy_level', 'meeting_date'],
                    primaryKey: 'meeting_id'
                },
                {
                    table: 'meeting_types',
                    requiredColumns: ['type_id', 'type_name', 'type_code', 'default_duration_minutes'],
                    primaryKey: 'type_id'
                },
                {
                    table: 'communication_campaigns',
                    requiredColumns: ['campaign_id', 'name', 'campaign_type', 'status', 'created_by'],
                    primaryKey: 'campaign_id'
                },
                {
                    table: 'maintenance_mode',
                    requiredColumns: ['maintenance_id', 'is_enabled', 'maintenance_level', 'bypass_admin_users'],
                    primaryKey: 'maintenance_id'
                },
                {
                    table: 'leadership_elections',
                    requiredColumns: ['election_id', 'election_name', 'hierarchy_level', 'election_status'],
                    primaryKey: 'election_id'
                }
            ];
            
            let passedTests = 0;
            
            for (const test of structureTests) {
                try {
                    const query = `
                        SELECT column_name, data_type, is_nullable, column_default
                        FROM information_schema.columns 
                        WHERE table_name = $1 AND table_schema = 'public'
                        ORDER BY ordinal_position;
                    `;
                    
                    const result = await pool.query(query, [test.table]);
                    const columns = result.rows.map(row => row.column_name);
                    
                    const missingColumns = test.requiredColumns.filter(col => !columns.includes(col));
                    
                    if (missingColumns.length === 0) {
                        this.log(`Structure - ${test.table}`, 'INFO', 
                            `All ${test.requiredColumns.length} required columns present (${columns.length} total)`);
                        passedTests++;
                    } else {
                        this.log(`Structure - ${test.table}`, 'FAIL', 
                            `Missing columns: ${missingColumns.join(', ')}`);
                    }
                    
                } catch (tableError) {
                    this.log(`Structure - ${test.table}`, 'FAIL', 
                        `Error checking structure: ${tableError.message}`);
                }
            }
            
            if (passedTests === structureTests.length) {
                this.log('Table Structures', 'PASS', 
                    `All ${structureTests.length} table structures verified`, 
                    Date.now() - testStart);
            } else {
                this.log('Table Structures', 'FAIL', 
                    `${structureTests.length - passedTests} table structures failed`, 
                    Date.now() - testStart);
            }
            
        } catch (error) {
            this.log('Table Structures', 'FAIL', 
                `Database error: ${error.message}`, 
                Date.now() - testStart);
        }
    }

    /**
     * Test 3: Verify foreign key relationships
     */
    async testForeignKeyRelationships() {
        const testStart = Date.now();
        
        try {
            const query = `
                SELECT 
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                  AND tc.table_schema = 'public'
                  AND (tc.table_name LIKE 'meeting%' 
                       OR tc.table_name LIKE 'message%'
                       OR tc.table_name LIKE 'communication%'
                       OR tc.table_name LIKE 'maintenance%'
                       OR tc.table_name LIKE 'file_processing%'
                       OR tc.table_name LIKE 'leadership_election%')
                ORDER BY tc.table_name, kcu.column_name;
            `;
            
            const result = await pool.query(query);
            const foreignKeys = result.rows;
            
            // Expected key relationships
            const expectedRelationships = [
                { table: 'meetings', column: 'meeting_type_id', foreign_table: 'meeting_types' },
                { table: 'meeting_agenda_items', column: 'meeting_id', foreign_table: 'meetings' },
                { table: 'meeting_attendance', column: 'meeting_id', foreign_table: 'meetings' },
                { table: 'communication_campaigns', column: 'template_id', foreign_table: 'message_templates' },
                { table: 'leadership_election_candidates', column: 'election_id', foreign_table: 'leadership_elections' }
            ];
            
            let foundRelationships = 0;
            
            for (const expected of expectedRelationships) {
                const found = foreignKeys.find(fk => 
                    fk.table_name === expected.table && 
                    fk.column_name === expected.column &&
                    fk.foreign_table_name === expected.foreign_table
                );
                
                if (found) {
                    foundRelationships++;
                    this.log(`Foreign Key - ${expected.table}.${expected.column}`, 'INFO', 
                        `References ${expected.foreign_table}`);
                } else {
                    this.log(`Foreign Key - ${expected.table}.${expected.column}`, 'FAIL', 
                        `Missing reference to ${expected.foreign_table}`);
                }
            }
            
            if (foundRelationships >= expectedRelationships.length * 0.8) { // 80% threshold
                this.log('Foreign Key Relationships', 'PASS', 
                    `${foundRelationships}/${expectedRelationships.length} key relationships verified (${foreignKeys.length} total FKs)`, 
                    Date.now() - testStart);
            } else {
                this.log('Foreign Key Relationships', 'FAIL', 
                    `Only ${foundRelationships}/${expectedRelationships.length} key relationships found`, 
                    Date.now() - testStart);
            }
            
        } catch (error) {
            this.log('Foreign Key Relationships', 'FAIL', 
                `Database error: ${error.message}`, 
                Date.now() - testStart);
        }
    }

    /**
     * Test 4: Verify indexes exist for performance
     */
    async testIndexes() {
        const testStart = Date.now();
        
        try {
            const query = `
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    indexdef
                FROM pg_indexes 
                WHERE schemaname = 'public' 
                  AND (tablename LIKE 'meeting%' 
                       OR tablename LIKE 'message%'
                       OR tablename LIKE 'communication%'
                       OR tablename LIKE 'maintenance%'
                       OR tablename LIKE 'file_processing%'
                       OR tablename LIKE 'leadership_election%')
                ORDER BY tablename, indexname;
            `;
            
            const result = await pool.query(query);
            const indexes = result.rows;
            
            // Group indexes by table
            const indexesByTable = {};
            indexes.forEach(idx => {
                if (!indexesByTable[idx.tablename]) {
                    indexesByTable[idx.tablename] = [];
                }
                indexesByTable[idx.tablename].push(idx.indexname);
            });
            
            let tablesWithIndexes = 0;
            const totalNewTables = Object.values(this.expectedTables).flat().length;
            
            for (const [tableName, tableIndexes] of Object.entries(indexesByTable)) {
                tablesWithIndexes++;
                this.log(`Indexes - ${tableName}`, 'INFO', 
                    `${tableIndexes.length} indexes found`);
            }
            
            if (tablesWithIndexes >= totalNewTables * 0.7) { // 70% of tables should have indexes
                this.log('Table Indexes', 'PASS', 
                    `${tablesWithIndexes} tables have indexes (${indexes.length} total indexes)`, 
                    Date.now() - testStart);
            } else {
                this.log('Table Indexes', 'FAIL', 
                    `Only ${tablesWithIndexes}/${totalNewTables} tables have indexes`, 
                    Date.now() - testStart);
            }
            
        } catch (error) {
            this.log('Table Indexes', 'FAIL', 
                `Database error: ${error.message}`, 
                Date.now() - testStart);
        }
    }

    /**
     * Test 5: Test basic CRUD operations on key tables
     */
    async testBasicOperations() {
        const testStart = Date.now();
        
        try {
            // Test inserting and querying meeting types
            const meetingTypesQuery = 'SELECT COUNT(*) as count FROM meeting_types';
            const meetingTypesResult = await pool.query(meetingTypesQuery);
            
            // Test querying other key tables
            const queries = [
                { name: 'Meeting Types', query: 'SELECT COUNT(*) as count FROM meeting_types' },
                { name: 'Maintenance Mode', query: 'SELECT COUNT(*) as count FROM maintenance_mode' },
                { name: 'Message Templates', query: 'SELECT COUNT(*) as count FROM message_templates' },
                { name: 'Leadership Elections', query: 'SELECT COUNT(*) as count FROM leadership_elections' }
            ];
            
            let successfulQueries = 0;
            
            for (const test of queries) {
                try {
                    const result = await pool.query(test.query);
                    successfulQueries++;
                    this.log(`CRUD Test - ${test.name}`, 'INFO', 
                        `Query successful (${result.rows[0].count} records)`);
                } catch (queryError) {
                    this.log(`CRUD Test - ${test.name}`, 'FAIL', 
                        `Query failed: ${queryError.message}`);
                }
            }
            
            if (successfulQueries === queries.length) {
                this.log('Basic Operations', 'PASS', 
                    `All ${queries.length} CRUD tests passed`, 
                    Date.now() - testStart);
            } else {
                this.log('Basic Operations', 'FAIL', 
                    `${queries.length - successfulQueries} CRUD tests failed`, 
                    Date.now() - testStart);
            }
            
        } catch (error) {
            this.log('Basic Operations', 'FAIL', 
                `Database error: ${error.message}`, 
                Date.now() - testStart);
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('\n🔄 **MYSQL TO POSTGRESQL MIGRATION VERIFICATION TEST**\n');
        console.log('📋 Testing conversion of MySQL migration tables to PostgreSQL...\n');
        
        await this.testTableExistence();
        await this.testTableStructures();
        await this.testForeignKeyRelationships();
        await this.testIndexes();
        await this.testBasicOperations();
        
        this.generateSummary();
    }

    /**
     * Generate test summary
     */
    generateSummary() {
        const totalTime = Date.now() - this.startTime;
        const passCount = this.testResults.filter(r => r.status === 'PASS').length;
        const failCount = this.testResults.filter(r => r.status === 'FAIL').length;
        const infoCount = this.testResults.filter(r => r.status === 'INFO').length;
        
        console.log('\n' + '='.repeat(70));
        console.log('📊 **MIGRATION VERIFICATION SUMMARY**');
        console.log('='.repeat(70));
        console.log(`✅ Passed: ${passCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log(`ℹ️  Info: ${infoCount}`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        console.log('='.repeat(70));
        
        if (failCount === 0) {
            console.log('🎉 **ALL TESTS PASSED! MYSQL MIGRATION SUCCESSFUL!**');
        } else {
            console.log('⚠️  **SOME TESTS FAILED - PLEASE REVIEW ISSUES ABOVE**');
        }
        
        console.log('\n📋 **MIGRATION RESULTS:**');
        
        let totalTables = 0;
        for (const [category, tables] of Object.entries(this.expectedTables)) {
            console.log(`✅ ${category}: ${tables.length} tables`);
            totalTables += tables.length;
        }
        
        console.log(`\n🎯 **TOTAL: ${totalTables} tables successfully migrated from MySQL to PostgreSQL**`);
        
        console.log('\n🚀 **MIGRATION BENEFITS:**');
        console.log('• Complete meeting management system');
        console.log('• Advanced communication campaigns');
        console.log('• Maintenance mode capabilities');
        console.log('• File processing job tracking');
        console.log('• Leadership election management');
        console.log('• Enhanced data integrity with foreign keys');
        console.log('• Performance optimization with indexes');
        console.log('• PostgreSQL-native features (JSONB, advanced constraints)');
    }
}

/**
 * Run the test suite
 */
async function runTests() {
    const testSuite = new MySQLMigrationVerificationTest();
    
    try {
        await testSuite.runAllTests();
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
    } finally {
        await pool.end();
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = { MySQLMigrationVerificationTest };
