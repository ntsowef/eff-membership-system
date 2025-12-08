/**
 * Script to analyze membership status data
 * This will help us understand the current state before implementing automation
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function analyzeMembershipStatus() {
  try {
    console.log('='.repeat(80));
    console.log('MEMBERSHIP STATUS ANALYSIS');
    console.log('='.repeat(80));
    console.log('');

    // 1. Check membership_statuses lookup table
    console.log('1. MEMBERSHIP STATUS LOOKUP TABLE:');
    console.log('-'.repeat(80));
    const statusesResult = await pool.query(`
      SELECT 
        status_id,
        status_name,
        status_code,
        is_active,
        allows_voting,
        allows_leadership,
        description
      FROM membership_statuses
      ORDER BY status_id
    `);
    console.table(statusesResult.rows);
    console.log('');

    // 2. Check members table structure
    console.log('2. MEMBERS TABLE - MEMBERSHIP STATUS DISTRIBUTION:');
    console.log('-'.repeat(80));
    const memberStatusDistribution = await pool.query(`
      SELECT 
        m.membership_status_id,
        ms.status_name,
        COUNT(*) as member_count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM members_consolidated m
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      GROUP BY m.membership_status_id, ms.status_name
      ORDER BY member_count DESC
    `);
    console.table(memberStatusDistribution.rows);
    console.log('');

    // 3. Check expiry date vs membership_status_id mismatch
    console.log('3. EXPIRY DATE VS MEMBERSHIP STATUS ANALYSIS:');
    console.log('-'.repeat(80));
    const mismatchAnalysis = await pool.query(`
      SELECT 
        CASE
          WHEN m.expiry_date IS NULL THEN 'No Expiry Date'
          WHEN m.expiry_date >= CURRENT_DATE THEN 'Should be Good Standing'
          WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Should be Grace Period'
          ELSE 'Should be Expired'
        END as expected_status,
        ms.status_name as current_status,
        COUNT(*) as member_count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM members_consolidated m
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      GROUP BY expected_status, ms.status_name
      ORDER BY member_count DESC
    `);
    console.table(mismatchAnalysis.rows);
    console.log('');

    // 4. Sample of members with mismatched status
    console.log('4. SAMPLE OF MEMBERS WITH POTENTIAL STATUS MISMATCH:');
    console.log('-'.repeat(80));
    const sampleMismatch = await pool.query(`
      SELECT 
        m.member_id,
        m.membership_number,
        m.firstname,
        m.surname,
        m.expiry_date,
        ms.status_name as current_status,
        CASE
          WHEN m.expiry_date IS NULL THEN 'Unknown'
          WHEN m.expiry_date >= CURRENT_DATE THEN 'Good Standing'
          WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
          ELSE 'Expired'
        END as expected_status,
        (m.expiry_date - CURRENT_DATE) as days_until_expiry
      FROM members_consolidated m
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      WHERE
        (m.expiry_date >= CURRENT_DATE AND ms.status_name != 'Active') OR
        (m.expiry_date < CURRENT_DATE - INTERVAL '90 days' AND ms.status_name NOT IN ('Expired', 'Inactive')) OR
        (m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND m.expiry_date < CURRENT_DATE AND ms.status_name != 'Grace Period')
      LIMIT 10
    `);
    console.table(sampleMismatch.rows);
    console.log('');

    // 5. Count of members needing status update
    console.log('5. MEMBERS NEEDING STATUS UPDATE:');
    console.log('-'.repeat(80));
    const needsUpdate = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE m.expiry_date >= CURRENT_DATE AND ms.status_name != 'Active') as needs_active,
        COUNT(*) FILTER (WHERE m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND m.expiry_date < CURRENT_DATE AND ms.status_name != 'Grace Period') as needs_grace,
        COUNT(*) FILTER (WHERE m.expiry_date < CURRENT_DATE - INTERVAL '90 days' AND ms.status_name NOT IN ('Expired', 'Inactive')) as needs_expired,
        COUNT(*) as total_members
      FROM members_consolidated m
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
    `);
    console.table(needsUpdate.rows);
    console.log('');

    console.log('='.repeat(80));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error analyzing membership status:', error);
  } finally {
    await pool.end();
  }
}

analyzeMembershipStatus();

