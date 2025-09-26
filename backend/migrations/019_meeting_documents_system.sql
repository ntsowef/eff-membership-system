
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
    FOREIGN KEY (meeting_type_id) REFERENCES meeting_types(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS meeting_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    document_type ENUM('agenda', 'minutes', 'action_items', 'attendance', 'other') NOT NULL,
    document_title VARCHAR(200) NOT NULL,
    document_content JSON NOT NULL, -- Structured document content
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
);

-- Action Items Table
CREATE TABLE IF NOT EXISTS meeting_action_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    document_id INT NULL, -- Link to meeting_documents if part of minutes
    action_title VARCHAR(200) NOT NULL,
    action_description TEXT,
    assigned_to INT NULL, -- Member responsible
    assigned_role VARCHAR(100) NULL, -- Role/position responsible
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
    FOREIGN KEY (assigned_to) REFERENCES members(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Meeting Decisions Table
CREATE TABLE IF NOT EXISTS meeting_decisions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    document_id INT NULL, -- Link to meeting_documents (minutes)
    decision_title VARCHAR(200) NOT NULL,
    decision_description TEXT NOT NULL,
    decision_type ENUM('resolution', 'motion', 'policy', 'appointment', 'other') NOT NULL,
    voting_result JSON NULL, -- Store voting details if applicable
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
    FOREIGN KEY (proposed_by) REFERENCES members(id) ON DELETE SET NULL,
    FOREIGN KEY (seconded_by) REFERENCES members(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Document Attachments Table
CREATE TABLE IF NOT EXISTS meeting_document_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    attachment_name VARCHAR(200) NOT NULL,
    attachment_path VARCHAR(500) NOT NULL,
    attachment_type VARCHAR(50) NOT NULL, -- pdf, docx, xlsx, etc.
    file_size INT NOT NULL, -- in bytes
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_document_id (document_id),
    INDEX idx_attachment_type (attachment_type),
    FOREIGN KEY (document_id) REFERENCES meeting_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Document Version History Table
CREATE TABLE IF NOT EXISTS meeting_document_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    version_number INT NOT NULL,
    document_content JSON NOT NULL,
    change_summary TEXT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_document_id (document_id),
    INDEX idx_version_number (version_number),
    FOREIGN KEY (document_id) REFERENCES meeting_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    UNIQUE KEY unique_document_version (document_id, version_number)
);
