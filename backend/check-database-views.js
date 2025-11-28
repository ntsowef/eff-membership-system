/**
 * Check database views and their columns to identify missing columns
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
});

async function checkDatabaseViews() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database views and their columns...\n');

    // Get all views in the database
    const viewsResult = await client.query(`
      SELECT schemaname, viewname, definition 
      FROM pg_views 
      WHERE schemaname = 'public'
      ORDER BY viewname;
    `);

    console.log(`📊 Found ${viewsResult.rows.length} views in the database:\n`);

    for (const view of viewsResult.rows) {
      console.log(`🔍 VIEW: ${view.viewname}`);
      console.log('─'.repeat(50));

      // Get columns for this view
      try {
        const columnsResult = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position;
        `, [view.viewname]);

        if (columnsResult.rows.length > 0) {
          console.log('Columns:');
          columnsResult.rows.forEach((col, index) => {
            console.log(`  ${(index + 1).toString().padStart(2)}. ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable}`);
          });
        } else {
          console.log('  ❌ No columns found (view might be broken)');
        }

        // Check if this is the vw_member_search view that was causing issues
        if (view.viewname === 'vw_member_search') {
          console.log('\n🔍 DETAILED ANALYSIS OF vw_member_search:');
          
          const hasSearchText = columnsResult.rows.some(col => col.column_name === 'search_text');
          console.log(`  search_text column exists: ${hasSearchText ? '✅ YES' : '❌ NO'}`);
          
          if (!hasSearchText) {
            console.log('  🔧 ISSUE IDENTIFIED: Missing search_text column');
            console.log('  💡 SOLUTION: Need to recreate view with search_text column');
          }

          // Show view definition (truncated)
          console.log('\n  View Definition (first 200 chars):');
          console.log(`  ${view.definition.substring(0, 200)}...`);
        }

      } catch (error) {
        console.log(`  ❌ Error getting columns: ${error.message}`);
      }

      console.log('\n');
    }

    // Check for specific problematic views mentioned in errors
    const problematicViews = ['vw_member_search', 'vw_members', 'vw_member_directory'];
    
    console.log('🚨 CHECKING PROBLEMATIC VIEWS FROM ERROR LOGS:\n');
    
    for (const viewName of problematicViews) {
      const viewExists = viewsResult.rows.some(v => v.viewname === viewName);
      console.log(`${viewName.padEnd(20)}: ${viewExists ? '✅ EXISTS' : '❌ MISSING'}`);
      
      if (viewExists) {
        // Try to query the view to see if it works
        try {
          await client.query(`SELECT * FROM ${viewName} LIMIT 1`);
          console.log(`${' '.repeat(20)}  ✅ Query successful`);
        } catch (error) {
          console.log(`${' '.repeat(20)}  ❌ Query failed: ${error.message.substring(0, 80)}...`);
        }
      }
    }

    // Check members table structure for reference
    console.log('\n📋 MEMBERS TABLE STRUCTURE (for reference):');
    console.log('─'.repeat(50));
    
    const membersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'members' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    membersColumns.rows.slice(0, 15).forEach((col, index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable}`);
    });
    
    if (membersColumns.rows.length > 15) {
      console.log(`  ... and ${membersColumns.rows.length - 15} more columns`);
    }

    console.log('\n🎯 SUMMARY:');
    console.log(`✅ Total views found: ${viewsResult.rows.length}`);
    console.log('🔧 Issues to fix:');
    console.log('   1. vw_member_search missing search_text column');
    console.log('   2. Possible other view column mismatches');

  } catch (error) {
    console.error('❌ Error checking database views:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
checkDatabaseViews().catch(console.error);
