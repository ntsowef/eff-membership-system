/**
 * Test Script: Check Analytics Data
 *
 * This script checks if there's actual data in the database that should be
 * returned by the analytics endpoints.
 */

const { PrismaClient } = require('../backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function checkAnalyticsData() {
  try {
    console.log('🔍 Checking Analytics Data...\n');
    
    // 1. Check members_consolidated count
    console.log('1. MEMBERS_CONSOLIDATED TABLE:');
    console.log('-'.repeat(60));
    const totalMembers = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM members_consolidated
    `;
    console.log(`Total Members: ${totalMembers[0].count}`);
    
    const activeMembers = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM members_consolidated 
      WHERE membership_status_id = 1
    `;
    console.log(`Active Members (status_id=1): ${activeMembers[0].count}`);
    
    const recentMembers = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM members_consolidated 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;
    console.log(`Recent Registrations (last 30 days): ${recentMembers[0].count}`);
    console.log('');
    
    // 2. Check membership_applications count
    console.log('2. MEMBERSHIP_APPLICATIONS TABLE:');
    console.log('-'.repeat(60));
    const pendingApps = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM membership_applications 
      WHERE status = 'Submitted'
    `;
    console.log(`Pending Applications: ${pendingApps[0].count}`);
    console.log('');
    
    // 3. Check meetings count
    console.log('3. MEETINGS TABLE:');
    console.log('-'.repeat(60));
    const totalMeetings = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM meetings
    `;
    console.log(`Total Meetings: ${totalMeetings[0].count}`);
    
    const upcomingMeetings = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM meetings 
      WHERE meeting_status = 'Scheduled' AND meeting_date >= CURRENT_DATE
    `;
    console.log(`Upcoming Meetings: ${upcomingMeetings[0].count}`);
    console.log('');
    
    // 4. Check leadership_elections count
    console.log('4. LEADERSHIP_ELECTIONS TABLE:');
    console.log('-'.repeat(60));
    const totalElections = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM leadership_elections
    `;
    console.log(`Total Elections: ${totalElections[0].count}`);
    
    const activeElections = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM leadership_elections 
      WHERE election_status IN ('Nominations Open', 'Voting Open')
    `;
    console.log(`Active Elections: ${activeElections[0].count}`);
    console.log('');
    
    // 5. Check leadership_appointments count
    console.log('5. LEADERSHIP_APPOINTMENTS TABLE:');
    console.log('-'.repeat(60));
    const filledPositions = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM leadership_appointments 
      WHERE appointment_status = 'Active'
    `;
    console.log(`Filled Leadership Positions: ${filledPositions[0].count}`);
    console.log('');
    
    // 6. Test the actual analytics query
    console.log('6. TESTING ACTUAL ANALYTICS QUERY:');
    console.log('-'.repeat(60));
    const analyticsResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM members_consolidated m
    `;
    console.log(`Analytics Query Result: ${analyticsResult[0].count}`);
    console.log('');
    
    // 7. Check if there's a table existence issue
    console.log('7. CHECKING TABLE EXISTENCE:');
    console.log('-'.repeat(60));
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('members_consolidated', 'membership_applications', 'meetings', 'leadership_elections', 'leadership_appointments')
      ORDER BY table_name
    `;
    console.log('Tables found:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    console.log('');
    
    // Summary
    console.log('='.repeat(60));
    console.log('SUMMARY:');
    console.log('='.repeat(60));
    if (totalMembers[0].count > 0) {
      console.log('✅ Database has member data');
      console.log(`   Total: ${totalMembers[0].count} members`);
      console.log(`   Active: ${activeMembers[0].count} members`);
    } else {
      console.log('❌ Database has NO member data!');
      console.log('   This is why analytics returns zeros.');
    }
    
  } catch (error) {
    console.error('❌ Error checking analytics data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkAnalyticsData()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

