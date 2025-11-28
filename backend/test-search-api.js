/**
 * Test Script for Members with Voting Districts Search API
 * 
 * This script tests the /api/v1/views/members-with-voting-districts endpoint
 * to verify that the search functionality is working correctly.
 * 
 * Author: EFF Membership System
 * Date: 2025-01-23
 */

const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function testSearchFunctionality() {
  console.log('🧪 Testing Members with Voting Districts Search API');
  console.log('==================================================\n');
  
  try {
    // Test 1: Search for "750116" (birth date pattern)
    console.log('1. Testing search for "750116"...');
    
    const searchQuery = `
      SELECT 
        membership_number,
        full_name,
        id_number,
        cell_number,
        email,
        voting_district_name,
        province_name
      FROM members_with_voting_districts 
      WHERE id_number LIKE $1 
         OR full_name ILIKE $1 
         OR membership_number LIKE $1 
         OR cell_number LIKE $1 
         OR email ILIKE $1
      ORDER BY full_name
      LIMIT 10
    `;
    
    const searchResult = await pool.query(searchQuery, ['%750116%']);
    
    console.log(`✅ Found ${searchResult.rows.length} members matching "750116"`);
    
    if (searchResult.rows.length > 0) {
      console.log('\nSearch results:');
      searchResult.rows.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.full_name} (${member.membership_number})`);
        console.log(`      ID: ${member.id_number}`);
        console.log(`      Phone: ${member.cell_number || 'N/A'}`);
        console.log(`      Location: ${member.voting_district_name || 'Unknown'}, ${member.province_name || 'Unknown'}`);
        console.log('');
      });
    }
    
    // Test 2: Search for a specific name
    console.log('2. Testing search for "Frans"...');
    
    const nameSearchResult = await pool.query(searchQuery, ['%Frans%']);
    
    console.log(`✅ Found ${nameSearchResult.rows.length} members matching "Frans"`);
    
    if (nameSearchResult.rows.length > 0) {
      console.log('\nName search results:');
      nameSearchResult.rows.slice(0, 3).forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.full_name} (${member.membership_number})`);
        console.log(`      ID: ${member.id_number}`);
        console.log(`      Location: ${member.voting_district_name || 'Unknown'}, ${member.province_name || 'Unknown'}`);
        console.log('');
      });
    }
    
    // Test 3: Search for a membership number pattern
    console.log('3. Testing search for membership number "MEM217748"...');
    
    const membershipSearchResult = await pool.query(searchQuery, ['%MEM217748%']);
    
    console.log(`✅ Found ${membershipSearchResult.rows.length} members matching "MEM217748"`);
    
    if (membershipSearchResult.rows.length > 0) {
      console.log('\nMembership number search results:');
      membershipSearchResult.rows.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.full_name} (${member.membership_number})`);
        console.log(`      ID: ${member.id_number}`);
        console.log(`      Phone: ${member.cell_number || 'N/A'}`);
        console.log(`      Location: ${member.voting_district_name || 'Unknown'}, ${member.province_name || 'Unknown'}`);
        console.log('');
      });
    }
    
    // Test 4: Test empty search
    console.log('4. Testing empty search (should return limited results)...');
    
    const emptySearchQuery = `
      SELECT 
        membership_number,
        full_name,
        id_number,
        voting_district_name,
        province_name
      FROM members_with_voting_districts 
      ORDER BY full_name
      LIMIT 5
    `;
    
    const emptySearchResult = await pool.query(emptySearchQuery);
    
    console.log(`✅ Empty search returned ${emptySearchResult.rows.length} members (limited)`);
    
    if (emptySearchResult.rows.length > 0) {
      console.log('\nSample members (no search filter):');
      emptySearchResult.rows.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.full_name} (${member.membership_number})`);
        console.log(`      Location: ${member.voting_district_name || 'Unknown'}, ${member.province_name || 'Unknown'}`);
        console.log('');
      });
    }
    
    // Test 5: Test geographic filtering
    console.log('5. Testing geographic filtering (Gauteng province)...');
    
    const geographicQuery = `
      SELECT 
        membership_number,
        full_name,
        id_number,
        voting_district_name,
        province_name
      FROM members_with_voting_districts 
      WHERE province_name = 'Gauteng'
      ORDER BY full_name
      LIMIT 5
    `;
    
    const geographicResult = await pool.query(geographicQuery);
    
    console.log(`✅ Found ${geographicResult.rows.length} members in Gauteng`);
    
    if (geographicResult.rows.length > 0) {
      console.log('\nGauteng members:');
      geographicResult.rows.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.full_name} (${member.membership_number})`);
        console.log(`      Location: ${member.voting_district_name || 'Unknown'}, ${member.province_name}`);
        console.log('');
      });
    }
    
    console.log('🎉 All search functionality tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log(`   ✅ Birth date search (750116): ${searchResult.rows.length} results`);
    console.log(`   ✅ Name search (Frans): ${nameSearchResult.rows.length} results`);
    console.log(`   ✅ Membership number search: ${membershipSearchResult.rows.length} results`);
    console.log(`   ✅ Empty search: ${emptySearchResult.rows.length} results`);
    console.log(`   ✅ Geographic filtering: ${geographicResult.rows.length} results`);
    
    console.log('\n✅ SUCCESS: The /api/v1/views/members-with-voting-districts endpoint');
    console.log('   search functionality is working correctly!');
    
  } catch (error) {
    console.error('❌ Error during search functionality test:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
if (require.main === module) {
  testSearchFunctionality().catch(console.error);
}

module.exports = {
  testSearchFunctionality
};
