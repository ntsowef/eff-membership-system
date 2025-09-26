const { executeQuery, initializeDatabase } = require('./dist/config/database');

async function checkMembershipTables() {
  try {
    console.log('🔍 Checking membership-related tables...\n');
    
    // Initialize database connection
    await initializeDatabase();

    // Check memberships table
    console.log('📋 memberships table structure:');
    try {
      const membershipsStructureQuery = `DESCRIBE memberships`;
      const membershipsStructure = await executeQuery(membershipsStructureQuery);
      
      membershipsStructure.forEach(field => {
        console.log(`- ${field.Field}: ${field.Type} (${field.Null === 'YES' ? 'nullable' : 'not null'})`);
      });

      // Sample data from memberships
      console.log('\n📊 Sample memberships data:');
      const sampleMembershipsQuery = `SELECT * FROM memberships LIMIT 3`;
      const sampleMemberships = await executeQuery(sampleMembershipsQuery);
      
      if (sampleMemberships.length > 0) {
        console.log('Sample membership record:');
        Object.keys(sampleMemberships[0]).forEach(key => {
          const value = sampleMemberships[0][key];
          console.log(`- ${key}: ${value}`);
        });
      } else {
        console.log('No data in memberships table');
      }

    } catch (error) {
      console.log('❌ memberships table not found or not accessible');
    }

    // Check vw_expired_memberships view
    console.log('\n📋 vw_expired_memberships view structure:');
    try {
      const expiredViewQuery = `DESCRIBE vw_expired_memberships`;
      const expiredViewStructure = await executeQuery(expiredViewQuery);
      
      expiredViewStructure.forEach(field => {
        console.log(`- ${field.Field}: ${field.Type} (${field.Null === 'YES' ? 'nullable' : 'not null'})`);
      });

      // Sample data from expired memberships view
      console.log('\n📊 Sample expired memberships data:');
      const sampleExpiredQuery = `SELECT * FROM vw_expired_memberships LIMIT 5`;
      const sampleExpired = await executeQuery(sampleExpiredQuery);
      
      console.log(`Found ${sampleExpired.length} expired memberships`);
      if (sampleExpired.length > 0) {
        console.log('Sample expired membership record:');
        Object.keys(sampleExpired[0]).forEach(key => {
          const value = sampleExpired[0][key];
          console.log(`- ${key}: ${value}`);
        });
      }

    } catch (error) {
      console.log('❌ vw_expired_memberships view not found or not accessible');
    }

    // Check membership_renewals table
    console.log('\n📋 membership_renewals table structure:');
    try {
      const renewalsStructureQuery = `DESCRIBE membership_renewals`;
      const renewalsStructure = await executeQuery(renewalsStructureQuery);
      
      renewalsStructure.forEach(field => {
        console.log(`- ${field.Field}: ${field.Type} (${field.Null === 'YES' ? 'nullable' : 'not null'})`);
      });

      // Count renewals
      const renewalsCountQuery = `SELECT COUNT(*) as count FROM membership_renewals`;
      const [renewalsCount] = await executeQuery(renewalsCountQuery);
      console.log(`\n📊 Total renewals: ${renewalsCount.count}`);

    } catch (error) {
      console.log('❌ membership_renewals table not found or not accessible');
    }

    // Check membership_statuses table
    console.log('\n📋 membership_statuses table structure:');
    try {
      const statusesStructureQuery = `DESCRIBE membership_statuses`;
      const statusesStructure = await executeQuery(statusesStructureQuery);
      
      statusesStructure.forEach(field => {
        console.log(`- ${field.Field}: ${field.Type} (${field.Null === 'YES' ? 'nullable' : 'not null'})`);
      });

      // Sample statuses
      const statusesQuery = `SELECT * FROM membership_statuses`;
      const statuses = await executeQuery(statusesQuery);
      console.log('\n📊 Available membership statuses:');
      statuses.forEach(status => {
        console.log(`- ${status.id}: ${status.name} (${status.description})`);
      });

    } catch (error) {
      console.log('❌ membership_statuses table not found or not accessible');
    }

    // Check if there's a way to determine membership expiry
    console.log('\n🔍 Looking for expiry logic...');
    
    // Check if members have a membership_type that could indicate expiry
    const membershipTypesQuery = `
      SELECT 
        membership_type,
        COUNT(*) as count
      FROM members 
      WHERE membership_type IS NOT NULL
      GROUP BY membership_type
    `;
    
    const membershipTypes = await executeQuery(membershipTypesQuery);
    if (membershipTypes.length > 0) {
      console.log('📊 Membership types:');
      membershipTypes.forEach(type => {
        console.log(`- ${type.membership_type}: ${type.count} members`);
      });
    }

    // Check if we can simulate expiry based on creation date
    console.log('\n💡 Suggestion for expired members implementation:');
    console.log('Since there\'s no explicit expiry date field, we can:');
    console.log('1. Use member creation date + 1 year as expiry date');
    console.log('2. Use the vw_expired_memberships view if it contains relevant data');
    console.log('3. Add a membership_expiry_date field to the members table');
    
    // Show a sample query that could work
    console.log('\n📝 Sample query using creation date as basis:');
    const sampleExpiryQuery = `
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN DATE_ADD(member_created_at, INTERVAL 1 YEAR) < CURDATE() THEN 1 END) as expired_count,
        COUNT(CASE WHEN DATE_ADD(member_created_at, INTERVAL 1 YEAR) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiring_soon_count
      FROM vw_member_details
      LIMIT 1
    `;
    
    const [expiryStats] = await executeQuery(sampleExpiryQuery);
    console.log('📊 Simulated expiry statistics (based on creation date + 1 year):');
    console.log(`- Total members: ${expiryStats.total_members}`);
    console.log(`- Expired (created > 1 year ago): ${expiryStats.expired_count}`);
    console.log(`- Expiring soon: ${expiryStats.expiring_soon_count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking membership tables:', error);
    process.exit(1);
  }
}

checkMembershipTables();
