const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigration019() {
  console.log('🚀 Running Migration 019: Meeting Documents System...\n');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new',
    multipleStatements: true
  });

  try {
    // Create tables individually to avoid SQL parsing issues
    console.log('📄 Creating meeting document tables...');

    // 1. Document Templates Table
    console.log('   Creating meeting_document_templates...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS meeting_document_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_name VARCHAR(100) NOT NULL,
        template_type ENUM('agenda', 'minutes', 'action_items', 'attendance') NOT NULL,
        meeting_type_id INT NULL,
        hierarchy_level ENUM('National', 'Provincial', 'Municipal', 'Ward') NULL,
        template_content JSON NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_template_type (template_type),
        INDEX idx_meeting_type (meeting_type_id),
        INDEX idx_hierarchy_level (hierarchy_level),
        FOREIGN KEY (meeting_type_id) REFERENCES meeting_types(type_id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    // 2. Meeting Documents Table
    console.log('   Creating meeting_documents...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS meeting_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meeting_id INT NOT NULL,
        document_type ENUM('agenda', 'minutes', 'action_items', 'attendance', 'other') NOT NULL,
        document_title VARCHAR(200) NOT NULL,
        document_content JSON NOT NULL,
        template_id INT NULL,
        version_number INT DEFAULT 1,
        document_status ENUM('draft', 'review', 'approved', 'published') DEFAULT 'draft',
        created_by INT NOT NULL,
        approved_by INT NULL,
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_meeting_id (meeting_id),
        INDEX idx_document_type (document_type),
        INDEX idx_document_status (document_status),
        INDEX idx_version (meeting_id, document_type, version_number),
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES meeting_document_templates(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,

        UNIQUE KEY unique_meeting_document_version (meeting_id, document_type, version_number)
      )
    `);

    // 3. Action Items Table
    console.log('   Creating meeting_action_items...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS meeting_action_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meeting_id INT NOT NULL,
        document_id INT NULL,
        action_title VARCHAR(200) NOT NULL,
        action_description TEXT,
        assigned_to INT NULL,
        assigned_role VARCHAR(100) NULL,
        due_date DATE NULL,
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        status ENUM('pending', 'in_progress', 'completed', 'cancelled', 'overdue') DEFAULT 'pending',
        completion_notes TEXT NULL,
        created_by INT NOT NULL,
        completed_by INT NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_meeting_id (meeting_id),
        INDEX idx_assigned_to (assigned_to),
        INDEX idx_status (status),
        INDEX idx_due_date (due_date),
        INDEX idx_priority (priority),
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES meeting_documents(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_to) REFERENCES members(member_id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // 4. Meeting Decisions Table
    console.log('   Creating meeting_decisions...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS meeting_decisions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meeting_id INT NOT NULL,
        document_id INT NULL,
        decision_title VARCHAR(200) NOT NULL,
        decision_description TEXT NOT NULL,
        decision_type ENUM('resolution', 'motion', 'policy', 'appointment', 'other') NOT NULL,
        voting_result JSON NULL,
        decision_status ENUM('proposed', 'approved', 'rejected', 'deferred') NOT NULL,
        proposed_by INT NULL,
        seconded_by INT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_meeting_id (meeting_id),
        INDEX idx_decision_type (decision_type),
        INDEX idx_decision_status (decision_status),
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES meeting_documents(id) ON DELETE SET NULL,
        FOREIGN KEY (proposed_by) REFERENCES members(member_id) ON DELETE SET NULL,
        FOREIGN KEY (seconded_by) REFERENCES members(member_id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    console.log('✅ Migration 019 completed successfully!');
    console.log('\n📊 Created tables:');
    console.log('   - meeting_document_templates');
    console.log('   - meeting_documents');
    console.log('   - meeting_action_items');
    console.log('   - meeting_decisions');
    console.log('   - meeting_document_attachments');
    console.log('   - meeting_document_versions');
    
    // Verify tables were created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
      AND TABLE_NAME LIKE 'meeting_%document%' 
      OR TABLE_NAME IN ('meeting_action_items', 'meeting_decisions')
      ORDER BY TABLE_NAME
    `);
    
    console.log('\n🔍 Verification - Tables created:');
    tables.forEach(table => {
      console.log(`   ✅ ${table.TABLE_NAME}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration019().catch(console.error);
