const { Pool } = require('pg');

// PostgreSQL connection configuration
const pool = new Pool({
    user: 'eff_admin',
    host: 'localhost',
    database: 'eff_membership_db',
    password: 'eff_secure_2024!',
    port: 5432,
});

// List of all 45 additional missing tables that should be created
const expectedTables = [
    // Leadership Enhancement System (8 tables)
    'election_candidates', 'election_votes', 'leadership_terms', 
    'leadership_succession_plans', 'leadership_performance_reviews',
    'leadership_goals', 'leadership_meetings', 'leadership_meeting_attendees',
    
    // Bulk Operations System (7 tables)
    'bulk_operations', 'member_transfers', 'member_notes',
    'bulk_notification_recipients', 'scheduled_operations',
    'batch_processing_queue', 'operation_templates',
    
    // Advanced Security Features (10 tables)
    'user_mfa_settings', 'login_attempts', 'user_sessions',
    'security_events', 'user_security_settings', 'password_history',
    'api_rate_limits', 'security_policies', 'security_alerts',
    'trusted_devices',
    
    // User Management System (5 tables)
    'admin_user_creation_log', 'user_role_history',
    'concurrent_session_limits', 'user_creation_workflow',
    'system_configuration',
    
    // SMS Management System (4 tables)
    'sms_contact_lists', 'sms_contact_list_members',
    'sms_provider_config', 'sms_campaign_recipients',
    
    // Birthday SMS System (3 tables)
    'birthday_sms_config', 'birthday_sms_history', 'birthday_sms_queue',
    
    // Renewal Pricing System (3 tables)
    'renewal_pricing_tiers', 'renewal_pricing_rules', 'renewal_pricing_overrides',
    
    // War Council Structure (1 table)
    'leadership_structures',
    
    // IEC Electoral Events System (4 tables)
    'iec_electoral_event_types', 'iec_electoral_events',
    'iec_electoral_event_delimitations', 'iec_electoral_event_sync_logs',
    
    // Performance Optimization (1 table)
    'member_cache_summary'
];

async function runTests() {
    console.log('🔍 ADDITIONAL MIGRATION VERIFICATION TEST');
    console.log('==========================================');
    
    try {
        // Test 1: Check total table count
        console.log('\n📊 Test 1: Checking total table count...');
        const totalTablesResult = await pool.query(`
            SELECT COUNT(*) as total_tables 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
        `);
        
        const totalTables = parseInt(totalTablesResult.rows[0].total_tables);
        console.log(`✅ Total tables in database: ${totalTables}`);
        
        // Test 2: Check which expected tables exist
        console.log('\n📋 Test 2: Checking additional missing tables...');
        const existingTablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
              AND table_name = ANY($1)
            ORDER BY table_name
        `, [expectedTables]);
        
        const existingTables = existingTablesResult.rows.map(row => row.table_name);
        const missingTables = expectedTables.filter(table => !existingTables.includes(table));
        
        console.log(`✅ Successfully created tables: ${existingTables.length}/${expectedTables.length}`);
        
        if (existingTables.length > 0) {
            console.log('\n🎉 SUCCESSFULLY CREATED TABLES:');
            existingTables.forEach(table => {
                const category = getTableCategory(table);
                console.log(`   ✅ ${table} (${category})`);
            });
        }
        
        if (missingTables.length > 0) {
            console.log('\n❌ MISSING TABLES:');
            missingTables.forEach(table => {
                const category = getTableCategory(table);
                console.log(`   ❌ ${table} (${category})`);
            });
        }
        
        // Test 3: Check sample table structures
        console.log('\n🏗️  Test 3: Verifying table structures...');
        
        if (existingTables.includes('election_candidates')) {
            const candidatesStructure = await pool.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'election_candidates' 
                  AND table_schema = 'public'
                ORDER BY ordinal_position
            `);
            console.log(`✅ election_candidates table has ${candidatesStructure.rows.length} columns`);
        }
        
        if (existingTables.includes('renewal_pricing_tiers')) {
            const pricingStructure = await pool.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'renewal_pricing_tiers' 
                  AND table_schema = 'public'
                ORDER BY ordinal_position
            `);
            console.log(`✅ renewal_pricing_tiers table has ${pricingStructure.rows.length} columns`);
        }
        
        // Test 4: Check indexes
        console.log('\n📇 Test 4: Checking indexes...');
        const indexResult = await pool.query(`
            SELECT COUNT(*) as index_count
            FROM pg_indexes 
            WHERE schemaname = 'public'
              AND tablename = ANY($1)
        `, [existingTables]);
        
        const indexCount = parseInt(indexResult.rows[0].index_count);
        console.log(`✅ Created ${indexCount} indexes for new tables`);
        
        // Test 5: Check foreign key constraints
        console.log('\n🔗 Test 5: Checking foreign key constraints...');
        const fkResult = await pool.query(`
            SELECT COUNT(*) as fk_count
            FROM information_schema.table_constraints tc
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
              AND tc.table_name = ANY($1)
        `);
        
        const fkCount = parseInt(fkResult.rows[0].fk_count);
        console.log(`✅ Created ${fkCount} foreign key constraints for new tables`);
        
        // Test 6: Check sample data insertions
        console.log('\n💾 Test 6: Checking sample data...');
        
        if (existingTables.includes('iec_electoral_event_types')) {
            const eventTypesCount = await pool.query(`
                SELECT COUNT(*) as count FROM iec_electoral_event_types
            `);
            console.log(`✅ IEC Electoral Event Types: ${eventTypesCount.rows[0].count} records`);
        }
        
        if (existingTables.includes('renewal_pricing_tiers')) {
            const pricingTiersCount = await pool.query(`
                SELECT COUNT(*) as count FROM renewal_pricing_tiers
            `);
            console.log(`✅ Renewal Pricing Tiers: ${pricingTiersCount.rows[0].count} records`);
        }
        
        if (existingTables.includes('security_policies')) {
            const securityPoliciesCount = await pool.query(`
                SELECT COUNT(*) as count FROM security_policies
            `);
            console.log(`✅ Security Policies: ${securityPoliciesCount.rows[0].count} records`);
        }
        
        // Final Summary
        console.log('\n🎯 MIGRATION SUMMARY:');
        console.log('====================');
        console.log(`📊 Total Database Tables: ${totalTables}`);
        console.log(`✅ Successfully Migrated: ${existingTables.length}/${expectedTables.length} additional tables`);
        console.log(`📇 New Indexes Created: ${indexCount}`);
        console.log(`🔗 New Foreign Keys: ${fkCount}`);
        
        const successRate = Math.round((existingTables.length / expectedTables.length) * 100);
        console.log(`📈 Migration Success Rate: ${successRate}%`);
        
        if (successRate >= 80) {
            console.log('\n🎉 MIGRATION STATUS: HIGHLY SUCCESSFUL!');
        } else if (successRate >= 60) {
            console.log('\n✅ MIGRATION STATUS: PARTIALLY SUCCESSFUL');
        } else {
            console.log('\n⚠️  MIGRATION STATUS: NEEDS ATTENTION');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await pool.end();
    }
}

function getTableCategory(tableName) {
    if (['election_candidates', 'election_votes', 'leadership_terms', 'leadership_succession_plans', 'leadership_performance_reviews', 'leadership_goals', 'leadership_meetings', 'leadership_meeting_attendees'].includes(tableName)) {
        return 'Leadership Enhancement';
    } else if (['bulk_operations', 'member_transfers', 'member_notes', 'bulk_notification_recipients', 'scheduled_operations', 'batch_processing_queue', 'operation_templates'].includes(tableName)) {
        return 'Bulk Operations';
    } else if (['user_mfa_settings', 'login_attempts', 'user_sessions', 'security_events', 'user_security_settings', 'password_history', 'api_rate_limits', 'security_policies', 'security_alerts', 'trusted_devices'].includes(tableName)) {
        return 'Advanced Security';
    } else if (['admin_user_creation_log', 'user_role_history', 'concurrent_session_limits', 'user_creation_workflow', 'system_configuration'].includes(tableName)) {
        return 'User Management';
    } else if (['sms_contact_lists', 'sms_contact_list_members', 'sms_provider_config', 'sms_campaign_recipients'].includes(tableName)) {
        return 'SMS Management';
    } else if (['birthday_sms_config', 'birthday_sms_history', 'birthday_sms_queue'].includes(tableName)) {
        return 'Birthday SMS';
    } else if (['renewal_pricing_tiers', 'renewal_pricing_rules', 'renewal_pricing_overrides'].includes(tableName)) {
        return 'Renewal Pricing';
    } else if (['leadership_structures'].includes(tableName)) {
        return 'War Council Structure';
    } else if (['iec_electoral_event_types', 'iec_electoral_events', 'iec_electoral_event_delimitations', 'iec_electoral_event_sync_logs'].includes(tableName)) {
        return 'IEC Electoral Events';
    } else if (['member_cache_summary'].includes(tableName)) {
        return 'Performance Optimization';
    }
    return 'Unknown';
}

// Run the tests
runTests();
