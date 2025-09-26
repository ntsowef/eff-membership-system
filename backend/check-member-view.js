#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkMemberView() {
  let connection;
  try {
    console.log('🔍 Checking vw_member_details view...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    // Check if the view exists
    const [views] = await connection.execute("SHOW TABLES LIKE 'vw_member_details'");
    
    if (views.length === 0) {
      console.log('❌ vw_member_details view does not exist');
      
      // Check what views exist
      const [allViews] = await connection.execute("SHOW TABLES LIKE 'vw_%'");
      console.log('\n📋 Available views:');
      allViews.forEach(view => {
        console.log('- ', Object.values(view)[0]);
      });
      
      // Let's try the members table directly
      console.log('\n🔍 Checking members table columns with GP province...');
      const [gpMembers] = await connection.execute(`
        SELECT COUNT(*) as total, province_code
        FROM members 
        WHERE province_code = 'GP'
        GROUP BY province_code
      `);
      
      if (gpMembers.length > 0) {
        console.log(`✅ Found ${gpMembers[0].total} members in Gauteng (GP)`);
      } else {
        console.log('❌ No members found in Gauteng (GP)');
        
        // Check what province codes exist
        const [provinces] = await connection.execute(`
          SELECT DISTINCT province_code, COUNT(*) as count
          FROM members 
          WHERE province_code IS NOT NULL
          GROUP BY province_code
          ORDER BY count DESC
          LIMIT 10
        `);
        console.log('\n📊 Available province codes:');
        console.table(provinces);
      }
      
      return;
    }
    
    console.log('✅ vw_member_details view exists');
    
    // Check view structure
    const [columns] = await connection.execute('DESCRIBE vw_member_details');
    console.log('\n📊 vw_member_details view structure:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type}`);
    });
    
    // Check sample data
    const [sample] = await connection.execute('SELECT * FROM vw_member_details LIMIT 2');
    console.log('\n📄 Sample data:');
    console.table(sample);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkMemberView();
