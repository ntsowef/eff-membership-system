const mysql = require('mysql2/promise');

async function checkApplicationsTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking membership_applications table structure...\n');

    // Get table structure
    const [columns] = await connection.execute(`
      DESCRIBE membership_applications
    `);

    console.log('📋 **Table Columns:**');
    columns.forEach(col => {
      console.log(`   • ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check for applications that might be ready for approval
    console.log('\n📋 **Sample Applications:**');
    const [apps] = await connection.execute(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        workflow_stage,
        financial_status,
        status,
        created_at
      FROM membership_applications 
      LIMIT 5
    `);

    apps.forEach(app => {
      console.log(`   • ID: ${app.id} | ${app.first_name} ${app.last_name} | ${app.email}`);
      console.log(`     Workflow: ${app.workflow_stage} | Financial: ${app.financial_status} | Status: ${app.status}`);
    });

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkApplicationsTable();
