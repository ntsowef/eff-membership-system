-- Document Management System Migration
-- This migration creates a comprehensive document management system

START TRANSACTION;

-- 1. Create document_categories table
CREATE TABLE IF NOT EXISTS document_categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  category_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NULL,
  allowed_file_types JSON NULL, -- Array of allowed file extensions
  max_file_size_mb INT DEFAULT 10,
  requires_approval BOOLEAN DEFAULT FALSE,
  retention_days INT NULL, -- NULL means permanent
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_document_categories_code (category_code),
  INDEX idx_document_categories_active (is_active),
  INDEX idx_document_categories_order (display_order)
);

-- 2. Insert default document categories
INSERT INTO document_categories (category_name, category_code, description, allowed_file_types, max_file_size_mb, requires_approval) VALUES
('Identity Documents', 'identity', 'Identity documents such as ID cards, passports, driver licenses', '["pdf", "jpg", "jpeg", "png"]', 5, FALSE),
('Membership Applications', 'applications', 'Membership application forms and supporting documents', '["pdf", "doc", "docx", "jpg", "jpeg", "png"]', 10, TRUE),
('Proof of Residence', 'residence', 'Proof of residence documents', '["pdf", "jpg", "jpeg", "png"]', 5, FALSE),
('Financial Documents', 'financial', 'Bank statements, payment receipts, financial records', '["pdf", "jpg", "jpeg", "png", "xls", "xlsx"]', 10, TRUE),
('Meeting Documents', 'meetings', 'Meeting minutes, agendas, presentations', '["pdf", "doc", "docx", "ppt", "pptx"]', 20, FALSE),
('Legal Documents', 'legal', 'Contracts, agreements, legal correspondence', '["pdf", "doc", "docx"]', 15, TRUE),
('Reports', 'reports', 'Generated reports and analytics documents', '["pdf", "xls", "xlsx", "doc", "docx"]', 25, FALSE),
('Photos', 'photos', 'Member photos and event images', '["jpg", "jpeg", "png", "gif"]', 5, FALSE),
('Certificates', 'certificates', 'Certificates, awards, qualifications', '["pdf", "jpg", "jpeg", "png"]', 5, FALSE),
('Correspondence', 'correspondence', 'Letters, emails, official correspondence', '["pdf", "doc", "docx", "txt"]', 10, FALSE);

-- 3. Create documents table
CREATE TABLE IF NOT EXISTS documents (
  document_id INT AUTO_INCREMENT PRIMARY KEY,
  document_name VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for integrity checking
  
  -- Categorization
  category_id INT NOT NULL,
  
  -- Ownership and access
  uploaded_by INT NOT NULL,
  member_id INT NULL, -- If document belongs to a specific member
  entity_type ENUM('member', 'application', 'meeting', 'renewal', 'system', 'user') NULL,
  entity_id INT NULL, -- ID of the related entity
  
  -- Status and approval
  status ENUM('pending', 'approved', 'rejected', 'archived', 'deleted') DEFAULT 'pending',
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  
  -- Metadata
  description TEXT NULL,
  tags JSON NULL, -- Array of tags for better organization
  is_public BOOLEAN DEFAULT FALSE,
  is_sensitive BOOLEAN DEFAULT FALSE,
  
  -- Version control
  version_number INT DEFAULT 1,
  parent_document_id INT NULL, -- For document versions
  is_current_version BOOLEAN DEFAULT TRUE,
  
  -- Access control
  access_level ENUM('public', 'members', 'admins', 'restricted') DEFAULT 'members',
  allowed_roles JSON NULL, -- Array of role names that can access
  allowed_users JSON NULL, -- Array of user IDs that can access
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  

  
  -- Indexes
  INDEX idx_documents_category (category_id),
  INDEX idx_documents_uploaded_by (uploaded_by),
  INDEX idx_documents_member (member_id),
  INDEX idx_documents_entity (entity_type, entity_id),
  INDEX idx_documents_status (status),
  INDEX idx_documents_hash (file_hash),
  INDEX idx_documents_version (parent_document_id, version_number),
  INDEX idx_documents_current (is_current_version),
  INDEX idx_documents_access (access_level),
  INDEX idx_documents_created (created_at),
  INDEX idx_documents_deleted (deleted_at)
);

-- Add foreign keys for documents table
ALTER TABLE documents
ADD CONSTRAINT fk_documents_category FOREIGN KEY (category_id) REFERENCES document_categories(category_id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_documents_member FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_documents_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_documents_parent FOREIGN KEY (parent_document_id) REFERENCES documents(document_id) ON DELETE SET NULL;

-- 4. Create document_access_log table for tracking access
CREATE TABLE IF NOT EXISTS document_access_log (
  access_id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  user_id INT NOT NULL,
  access_type ENUM('view', 'download', 'edit', 'delete', 'share') NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  access_granted BOOLEAN DEFAULT TRUE,
  denial_reason VARCHAR(255) NULL,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_document_access_document (document_id),
  INDEX idx_document_access_user (user_id),
  INDEX idx_document_access_type (access_type),
  INDEX idx_document_access_date (accessed_at)
);

-- Add foreign keys after table creation
ALTER TABLE document_access_log
ADD CONSTRAINT fk_document_access_document FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_document_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 5. Create document_shares table for sharing documents
CREATE TABLE IF NOT EXISTS document_shares (
  share_id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  shared_by INT NOT NULL,
  shared_with INT NULL, -- NULL means public share
  share_token VARCHAR(64) NOT NULL UNIQUE,
  share_type ENUM('user', 'public', 'link') NOT NULL,
  permissions JSON NOT NULL, -- Array of permissions: view, download, edit
  expires_at TIMESTAMP NULL,
  max_downloads INT NULL,
  download_count INT DEFAULT 0,
  password_hash VARCHAR(255) NULL, -- Optional password protection
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  

  
  -- Indexes
  INDEX idx_document_shares_document (document_id),
  INDEX idx_document_shares_token (share_token),
  INDEX idx_document_shares_shared_by (shared_by),
  INDEX idx_document_shares_shared_with (shared_with),
  INDEX idx_document_shares_expires (expires_at),
  INDEX idx_document_shares_active (is_active)
);

-- Add foreign keys for document_shares table
ALTER TABLE document_shares
ADD CONSTRAINT fk_document_shares_document FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_document_shares_shared_by FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_document_shares_shared_with FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE;

-- 6. Create document_comments table for document collaboration
CREATE TABLE IF NOT EXISTS document_comments (
  comment_id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_comment_id INT NULL, -- For threaded comments
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Internal comments vs public
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by INT NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  

  
  -- Indexes
  INDEX idx_document_comments_document (document_id),
  INDEX idx_document_comments_user (user_id),
  INDEX idx_document_comments_parent (parent_comment_id),
  INDEX idx_document_comments_resolved (is_resolved),
  INDEX idx_document_comments_created (created_at)
);

-- Add foreign keys for document_comments table
ALTER TABLE document_comments
ADD CONSTRAINT fk_document_comments_document FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_document_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_document_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES document_comments(comment_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_document_comments_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;

-- 7. Create document_workflows table for approval workflows
CREATE TABLE IF NOT EXISTS document_workflows (
  workflow_id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  workflow_type ENUM('approval', 'review', 'verification') NOT NULL,
  current_step INT DEFAULT 1,
  total_steps INT NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'rejected', 'cancelled') DEFAULT 'pending',
  assigned_to INT NULL,
  due_date TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  workflow_data JSON NULL, -- Workflow-specific data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  

  
  -- Indexes
  INDEX idx_document_workflows_document (document_id),
  INDEX idx_document_workflows_assigned (assigned_to),
  INDEX idx_document_workflows_status (status),
  INDEX idx_document_workflows_due (due_date)
);

-- Add foreign keys for document_workflows table
ALTER TABLE document_workflows
ADD CONSTRAINT fk_document_workflows_document FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_document_workflows_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- 8. Create document_tags table for better organization
CREATE TABLE IF NOT EXISTS document_tags (
  tag_id INT AUTO_INCREMENT PRIMARY KEY,
  tag_name VARCHAR(50) NOT NULL UNIQUE,
  tag_color VARCHAR(7) DEFAULT '#007bff', -- Hex color code
  description TEXT NULL,
  usage_count INT DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  

  
  -- Indexes
  INDEX idx_document_tags_name (tag_name),
  INDEX idx_document_tags_usage (usage_count)
);

-- Add foreign keys for document_tags table
ALTER TABLE document_tags
ADD CONSTRAINT fk_document_tags_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 9. Insert default document tags
INSERT INTO document_tags (tag_name, tag_color, description) VALUES
('urgent', '#dc3545', 'Urgent documents requiring immediate attention'),
('confidential', '#6f42c1', 'Confidential documents with restricted access'),
('draft', '#ffc107', 'Draft documents pending finalization'),
('approved', '#28a745', 'Approved documents'),
('archived', '#6c757d', 'Archived documents'),
('financial', '#17a2b8', 'Financial-related documents'),
('legal', '#343a40', 'Legal documents'),
('personal', '#fd7e14', 'Personal member documents'),
('official', '#20c997', 'Official organizational documents'),
('temporary', '#e83e8c', 'Temporary documents with limited retention');

-- 10. Create views for document management
CREATE OR REPLACE VIEW vw_document_summary AS
SELECT 
  d.document_id,
  d.document_name,
  d.original_filename,
  d.file_size_bytes,
  d.file_type,
  d.status,
  d.version_number,
  d.is_current_version,
  d.access_level,
  d.is_public,
  d.is_sensitive,
  dc.category_name,
  dc.category_code,
  uploader.name as uploaded_by_name,
  approver.name as approved_by_name,
  m.firstname as member_firstname,
  m.surname as member_surname,
  CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, '')) as member_name,
  d.created_at,
  d.updated_at,
  d.approved_at,
  CASE 
    WHEN d.deleted_at IS NOT NULL THEN 'Deleted'
    WHEN d.status = 'approved' THEN 'Approved'
    WHEN d.status = 'rejected' THEN 'Rejected'
    WHEN d.status = 'pending' THEN 'Pending Approval'
    WHEN d.status = 'archived' THEN 'Archived'
    ELSE 'Unknown'
  END as status_display
FROM documents d
LEFT JOIN document_categories dc ON d.category_id = dc.category_id
LEFT JOIN users uploader ON d.uploaded_by = uploader.id
LEFT JOIN users approver ON d.approved_by = approver.id
LEFT JOIN members m ON d.member_id = m.member_id
WHERE d.deleted_at IS NULL;

-- 11. Create view for document statistics
CREATE OR REPLACE VIEW vw_document_statistics AS
SELECT 
  dc.category_name,
  COUNT(d.document_id) as total_documents,
  COUNT(CASE WHEN d.status = 'approved' THEN 1 END) as approved_documents,
  COUNT(CASE WHEN d.status = 'pending' THEN 1 END) as pending_documents,
  COUNT(CASE WHEN d.status = 'rejected' THEN 1 END) as rejected_documents,
  SUM(d.file_size_bytes) as total_size_bytes,
  AVG(d.file_size_bytes) as average_size_bytes,
  COUNT(CASE WHEN d.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_documents
FROM document_categories dc
LEFT JOIN documents d ON dc.category_id = d.category_id AND d.deleted_at IS NULL
GROUP BY dc.category_id, dc.category_name
ORDER BY total_documents DESC;

COMMIT;
