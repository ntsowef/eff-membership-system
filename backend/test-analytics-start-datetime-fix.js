/**
 * Test the analytics start_datetime fix
 */

const { Pool } = require('pg');

async function testAnalyticsStartDatetimeFix() {
  console.log('🔍 Testing analytics start_datetime fix...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Test the original failing query (should fail)
    console.log('\n1. Testing original failing query...');
    try {
      const originalQuery = `SELECT COUNT(*) as count FROM meetings
                            WHERE meeting_status = 'Scheduled' AND start_datetime::DATE >= CURRENT_DATE`;
      await pool.query(originalQuery);
      console.log('❌ Original query should have failed but didn\'t');
    } catch (error) {
      console.log('✅ Original query failed as expected:', error.message);
    }
    
    // Test the fixed query (should work)
    console.log('\n2. Testing fixed query...');
    try {
      const fixedQuery = `SELECT COUNT(*) as count FROM meetings
                         WHERE meeting_status = 'Scheduled' AND meeting_date >= CURRENT_DATE`;
      const result = await pool.query(fixedQuery);
      console.log('✅ Fixed query works! Result:', result.rows[0]);
    } catch (error) {
      console.log('❌ Fixed query failed:', error.message);
    }
    
    // Test other analytics queries that were fixed
    console.log('\n3. Testing other fixed analytics queries...');
    
    const testQueries = [
      {
        name: 'Meeting date filtering',
        query: `SELECT COUNT(*) as count FROM meetings WHERE meeting_date >= CURRENT_DATE - INTERVAL '30 days'`
      },
      {
        name: 'Monthly meetings grouping',
        query: `SELECT 
                  TO_CHAR(meeting_date, 'YYYY-MM') as month,
                  COUNT(*) as meeting_count
                FROM meetings
                WHERE meeting_date >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY TO_CHAR(meeting_date, 'YYYY-MM')
                ORDER BY month
                LIMIT 5`
      },
      {
        name: 'Meeting status filtering',
        query: `SELECT 
                  meeting_status,
                  COUNT(*) as count
                FROM meetings
                GROUP BY meeting_status`
      }
    ];
    
    for (const test of testQueries) {
      try {
        const result = await pool.query(test.query);
        console.log(`✅ ${test.name}: Success (${result.rows.length} rows)`);
        if (result.rows.length > 0) {
          console.log('   Sample result:', result.rows[0]);
        }
      } catch (error) {
        console.log(`❌ ${test.name}: Failed - ${error.message}`);
      }
    }
    
    console.log('\n🎉 Analytics start_datetime fix testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testAnalyticsStartDatetimeFix();
