#!/usr/bin/env node

/**
 * Deploy Communication Module Database Schema
 * This script creates all necessary tables for the communication module
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'membership_new',
  port: parseInt(process.env.DB_PORT || '3306'),
  multipleStatements: true
};

async function deploySchema() {
  let connection;
  
  try {
    console.log('🚀 Starting Communication Module Database Deployment...\n');
    
    // Connect to database
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database:', dbConfig.database);
    
    // Read the schema file
    console.log('\n📄 Reading communication schema...');
    const schemaPath = path.join(__dirname, '../database/migrations/communication_schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    console.log('✅ Schema file loaded successfully');
    
    // Check if tables already exist
    console.log('\n🔍 Checking existing tables...');
    const [existingTables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN (
        'message_templates', 
        'communication_campaigns', 
        'messages', 
        'message_deliveries', 
        'communication_preferences', 
        'communication_analytics', 
        'message_queue'
      )
    `, [dbConfig.database]);
    
    if (existingTables.length > 0) {
      console.log('⚠️  Found existing communication tables:');
      existingTables.forEach(table => {
        console.log(`   - ${table.TABLE_NAME}`);
      });
      
      // Ask for confirmation to proceed
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('\n❓ Do you want to continue? This will NOT drop existing tables. (y/N): ', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ Deployment cancelled by user');
        return;
      }
    }
    
    // Split schema into individual statements
    console.log('\n⚙️  Executing schema deployment...');
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let createdTables = 0;
    let skippedTables = 0;
    
    for (const statement of statements) {
      try {
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          // Extract table name for better logging
          const tableMatch = statement.match(/CREATE TABLE\s+(\w+)/i);
          const tableName = tableMatch ? tableMatch[1] : 'unknown';
          
          await connection.execute(statement);
          console.log(`✅ Created table: ${tableName}`);
          createdTables++;
        } else if (statement.trim()) {
          await connection.execute(statement);
        }
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          const tableMatch = statement.match(/CREATE TABLE\s+(\w+)/i);
          const tableName = tableMatch ? tableMatch[1] : 'unknown';
          console.log(`⏭️  Table already exists: ${tableName}`);
          skippedTables++;
        } else {
          console.error('❌ Error executing statement:', error.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
          throw error;
        }
      }
    }
    
    // Insert default templates
    console.log('\n📝 Creating default message templates...');
    await createDefaultTemplates(connection);
    
    // Verify deployment
    console.log('\n🔍 Verifying deployment...');
    const [finalTables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN (
        'message_templates', 
        'communication_campaigns', 
        'messages', 
        'message_deliveries', 
        'communication_preferences', 
        'communication_analytics', 
        'message_queue'
      )
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);
    
    console.log('\n📊 Communication Module Tables:');
    finalTables.forEach(table => {
      console.log(`   ✅ ${table.TABLE_NAME} (${table.TABLE_ROWS || 0} rows)`);
    });
    
    console.log('\n🎉 Communication Module Database Deployment Complete!');
    console.log(`📈 Summary:`);
    console.log(`   - Tables created: ${createdTables}`);
    console.log(`   - Tables skipped: ${skippedTables}`);
    console.log(`   - Total tables: ${finalTables.length}`);
    console.log('\n✨ Your communication module is ready to use!');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

async function createDefaultTemplates(connection) {
  const defaultTemplates = [
    {
      name: 'Welcome New Member',
      description: 'Welcome message for new members',
      template_type: 'Email',
      category: 'Welcome',
      subject: 'Welcome to {{organization_name}}, {{member_name}}!',
      content: `
        <h2>Welcome {{member_name}}!</h2>
        <p>We're excited to have you as a member of {{organization_name}}.</p>
        <p>Your membership details:</p>
        <ul>
          <li>Member ID: {{member_id}}</li>
          <li>Membership Type: {{membership_type}}</li>
          <li>Start Date: {{start_date}}</li>
        </ul>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>{{organization_name}} Team</p>
      `,
      variables: JSON.stringify(['member_name', 'organization_name', 'member_id', 'membership_type', 'start_date'])
    },
    {
      name: 'Membership Renewal Reminder',
      description: 'Reminder for membership renewal',
      template_type: 'Email',
      category: 'Reminder',
      subject: 'Membership Renewal Reminder - {{member_name}}',
      content: `
        <h2>Membership Renewal Reminder</h2>
        <p>Dear {{member_name}},</p>
        <p>This is a friendly reminder that your membership will expire on {{expiry_date}}.</p>
        <p>To continue enjoying your membership benefits, please renew before the expiry date.</p>
        <p>Membership Details:</p>
        <ul>
          <li>Member ID: {{member_id}}</li>
          <li>Current Status: {{membership_status}}</li>
          <li>Expiry Date: {{expiry_date}}</li>
        </ul>
        <p>Thank you for being a valued member!</p>
      `,
      variables: JSON.stringify(['member_name', 'expiry_date', 'member_id', 'membership_status'])
    },
    {
      name: 'SMS Welcome',
      description: 'SMS welcome message for new members',
      template_type: 'SMS',
      category: 'Welcome',
      subject: null,
      content: 'Welcome {{member_name}}! Your membership ID is {{member_id}}. Thank you for joining {{organization_name}}.',
      variables: JSON.stringify(['member_name', 'member_id', 'organization_name'])
    },
    {
      name: 'General Announcement',
      description: 'Template for general announcements',
      template_type: 'Email',
      category: 'Announcement',
      subject: '{{announcement_title}}',
      content: `
        <h2>{{announcement_title}}</h2>
        <p>{{announcement_content}}</p>
        <p>Date: {{announcement_date}}</p>
        <p>Best regards,<br>{{organization_name}}</p>
      `,
      variables: JSON.stringify(['announcement_title', 'announcement_content', 'announcement_date', 'organization_name'])
    }
  ];

  for (const template of defaultTemplates) {
    try {
      await connection.execute(`
        INSERT INTO message_templates (name, description, template_type, category, subject, content, variables, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
      `, [
        template.name,
        template.description,
        template.template_type,
        template.category,
        template.subject,
        template.content,
        template.variables
      ]);
      console.log(`✅ Created template: ${template.name}`);
    } catch (error) {
      console.log(`⏭️  Template already exists: ${template.name}`);
    }
  }
}

// Run the deployment
if (require.main === module) {
  deploySchema().catch(console.error);
}

module.exports = { deploySchema };
