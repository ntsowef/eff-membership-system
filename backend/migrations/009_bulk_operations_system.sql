-- Bulk Operations System Migration
-- This migration creates tables for bulk operations and batch processing

START TRANSACTION;

-- 1. Create bulk_operations table
CREATE TABLE IF NOT EXISTS bulk_operations (
  operation_id INT AUTO_INCREMENT PRIMARY KEY,
  operation_type ENUM('member_update', 'member_delete', 'member_transfer', 'notification_send', 'document_process') NOT NULL,
  operation_status ENUM('Pending', 'In Progress', 'Completed', 'Failed', 'Cancelled') DEFAULT 'Pending',
  total_records INT NOT NULL DEFAULT 0,
  processed_records INT NOT NULL DEFAULT 0,
  successful_records INT NOT NULL DEFAULT 0,
  failed_records INT NOT NULL DEFAULT 0,
  operation_data JSON NULL,
  error_log JSON NULL,
  created_by INT NOT NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_bulk_operations_type (operation_type),
  INDEX idx_bulk_operations_status (operation_status),
  INDEX idx_bulk_operations_created_by (created_by),
  INDEX idx_bulk_operations_created_at (created_at),
  INDEX idx_bulk_operations_status_created (operation_status, created_at)
);

-- 2. Create member_transfers table for tracking member transfers
CREATE TABLE IF NOT EXISTS member_transfers (
  transfer_id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  from_hierarchy_level ENUM('National', 'Province', 'Region', 'Municipality', 'Ward', 'Branch') NOT NULL,
  from_entity_id INT NOT NULL,
  to_hierarchy_level ENUM('National', 'Province', 'Region', 'Municipality', 'Ward', 'Branch') NOT NULL,
  to_entity_id INT NOT NULL,
  transfer_reason TEXT NOT NULL,
  transfer_date DATE NOT NULL,
  transferred_by INT NOT NULL,
  transfer_status ENUM('Pending', 'Approved', 'Completed', 'Rejected') DEFAULT 'Completed',
  approval_notes TEXT NULL,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (transferred_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_member_transfers_member (member_id),
  INDEX idx_member_transfers_from (from_hierarchy_level, from_entity_id),
  INDEX idx_member_transfers_to (to_hierarchy_level, to_entity_id),
  INDEX idx_member_transfers_date (transfer_date),
  INDEX idx_member_transfers_status (transfer_status),
  INDEX idx_member_transfers_transferred_by (transferred_by)
);

-- 3. Create member_notes table for tracking member-related notes
CREATE TABLE IF NOT EXISTS member_notes (
  note_id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  note_text TEXT NOT NULL,
  note_type ENUM('General', 'Administrative', 'Disciplinary', 'Transfer', 'Status Change', 'Other') DEFAULT 'General',
  is_internal BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_member_notes_member (member_id),
  INDEX idx_member_notes_type (note_type),
  INDEX idx_member_notes_created_by (created_by),
  INDEX idx_member_notes_created_at (created_at)
);

-- 4. Create bulk_notification_recipients table for tracking bulk notification recipients
CREATE TABLE IF NOT EXISTS bulk_notification_recipients (
  recipient_id INT AUTO_INCREMENT PRIMARY KEY,
  operation_id INT NOT NULL,
  member_id INT NOT NULL,
  notification_id INT NULL,
  recipient_status ENUM('Pending', 'Sent', 'Delivered', 'Failed', 'Bounced') DEFAULT 'Pending',
  delivery_channel ENUM('email', 'sms', 'in_app') NOT NULL,
  delivery_attempt INT DEFAULT 0,
  last_attempt_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (operation_id) REFERENCES bulk_operations(operation_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (notification_id) REFERENCES notifications(notification_id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_bulk_notification_recipients_operation (operation_id),
  INDEX idx_bulk_notification_recipients_member (member_id),
  INDEX idx_bulk_notification_recipients_status (recipient_status),
  INDEX idx_bulk_notification_recipients_channel (delivery_channel),
  INDEX idx_bulk_notification_recipients_attempt (last_attempt_at)
);

-- 5. Create scheduled_operations table for scheduled bulk operations
CREATE TABLE IF NOT EXISTS scheduled_operations (
  schedule_id INT AUTO_INCREMENT PRIMARY KEY,
  operation_name VARCHAR(255) NOT NULL,
  operation_type ENUM('member_update', 'member_delete', 'member_transfer', 'notification_send', 'document_process', 'report_generation') NOT NULL,
  operation_config JSON NOT NULL,
  schedule_pattern VARCHAR(100) NOT NULL, -- Cron-like pattern
  next_execution TIMESTAMP NOT NULL,
  last_execution TIMESTAMP NULL,
  execution_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_scheduled_operations_type (operation_type),
  INDEX idx_scheduled_operations_next_execution (next_execution),
  INDEX idx_scheduled_operations_active (is_active),
  INDEX idx_scheduled_operations_created_by (created_by)
);

-- 6. Create batch_processing_queue table for queue management
CREATE TABLE IF NOT EXISTS batch_processing_queue (
  queue_id INT AUTO_INCREMENT PRIMARY KEY,
  operation_id INT NOT NULL,
  batch_number INT NOT NULL,
  batch_data JSON NOT NULL,
  batch_status ENUM('Pending', 'Processing', 'Completed', 'Failed') DEFAULT 'Pending',
  processing_started_at TIMESTAMP NULL,
  processing_completed_at TIMESTAMP NULL,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (operation_id) REFERENCES bulk_operations(operation_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_batch_processing_queue_operation (operation_id),
  INDEX idx_batch_processing_queue_status (batch_status),
  INDEX idx_batch_processing_queue_batch_number (batch_number),
  INDEX idx_batch_processing_queue_retry (retry_count),
  INDEX idx_batch_processing_queue_created (created_at)
);

-- 7. Create operation_templates table for reusable operation templates
CREATE TABLE IF NOT EXISTS operation_templates (
  template_id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL,
  template_description TEXT NULL,
  operation_type ENUM('member_update', 'member_delete', 'member_transfer', 'notification_send', 'document_process') NOT NULL,
  template_config JSON NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INT DEFAULT 0,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_operation_templates_type (operation_type),
  INDEX idx_operation_templates_public (is_public),
  INDEX idx_operation_templates_usage (usage_count),
  INDEX idx_operation_templates_created_by (created_by),
  INDEX idx_operation_templates_name (template_name)
);

-- 8. Create views for bulk operations analytics
CREATE OR REPLACE VIEW vw_bulk_operations_summary AS
SELECT 
  operation_type,
  COUNT(*) as total_operations,
  COUNT(CASE WHEN operation_status = 'Completed' THEN 1 END) as completed_operations,
  COUNT(CASE WHEN operation_status = 'Failed' THEN 1 END) as failed_operations,
  COUNT(CASE WHEN operation_status IN ('Pending', 'In Progress') THEN 1 END) as active_operations,
  SUM(total_records) as total_records_processed,
  SUM(successful_records) as total_successful_records,
  SUM(failed_records) as total_failed_records,
  AVG(CASE 
    WHEN operation_status = 'Completed' AND total_records > 0 
    THEN (successful_records * 100.0 / total_records) 
    ELSE NULL 
  END) as average_success_rate,
  AVG(CASE 
    WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
    THEN TIMESTAMPDIFF(SECOND, started_at, completed_at) 
    ELSE NULL 
  END) as average_duration_seconds
FROM bulk_operations
GROUP BY operation_type
ORDER BY total_operations DESC;

-- 9. Create view for recent bulk operations
CREATE OR REPLACE VIEW vw_recent_bulk_operations AS
SELECT 
  bo.operation_id,
  bo.operation_type,
  bo.operation_status,
  bo.total_records,
  bo.processed_records,
  bo.successful_records,
  bo.failed_records,
  CASE 
    WHEN bo.total_records > 0 THEN ROUND((bo.processed_records * 100.0) / bo.total_records, 2)
    ELSE 0 
  END as progress_percentage,
  CONCAT(u.firstname, ' ', u.surname) as created_by_name,
  bo.created_at,
  bo.started_at,
  bo.completed_at,
  CASE 
    WHEN bo.completed_at IS NOT NULL AND bo.started_at IS NOT NULL 
    THEN TIMESTAMPDIFF(SECOND, bo.started_at, bo.completed_at)
    ELSE NULL 
  END as duration_seconds
FROM bulk_operations bo
LEFT JOIN users u ON bo.created_by = u.id
WHERE bo.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY bo.created_at DESC;

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_status_hierarchy ON members(membership_status, hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_members_entity_status ON members(entity_id, membership_status);
CREATE INDEX IF NOT EXISTS idx_notifications_bulk_operation ON notifications(created_at, notification_type);

-- 11. Add triggers for automatic cleanup of old bulk operations
DELIMITER //

CREATE TRIGGER IF NOT EXISTS cleanup_old_bulk_operations
AFTER INSERT ON bulk_operations
FOR EACH ROW
BEGIN
  -- Clean up bulk operations older than 90 days that are completed or failed
  DELETE FROM bulk_operations 
  WHERE operation_status IN ('Completed', 'Failed', 'Cancelled') 
    AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
    AND operation_id != NEW.operation_id;
END//

DELIMITER ;

COMMIT;
