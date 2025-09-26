const mysql = require('mysql2/promise');

async function simpleAlertsFix() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('Creating financial.view_alerts permission...');

    // Create permission
    await connection.execute(`
      INSERT IGNORE INTO permissions (name, description, resource, action) 
      VALUES ('financial.view_alerts', 'View financial system alerts', 'financial', 'view_alerts')
    `);

    // Get permission ID
    const [permission] = await connection.execute(`
      SELECT id FROM permissions WHERE name = 'financial.view_alerts'
    `);
    const permissionId = permission[0].id;

    // Get role IDs
    const [roles] = await connection.execute(`
      SELECT id, name FROM roles WHERE name IN ('financial_reviewer', 'membership_approver')
    `);

    // Assign to both roles
    for (const role of roles) {
      await connection.execute(`
        INSERT IGNORE INTO role_permissions (role_id, permission_id) 
        VALUES (?, ?)
      `, [role.id, permissionId]);
      console.log(`Assigned to ${role.name}`);
    }

    await connection.end();
    console.log('✅ Alerts permission fixed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleAlertsFix();
