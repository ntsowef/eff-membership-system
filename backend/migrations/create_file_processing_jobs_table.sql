-- Create file processing jobs table
CREATE TABLE IF NOT EXISTS file_processing_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id VARCHAR(100) UNIQUE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  ward_number INT,
  status ENUM('queued', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'queued',
  progress INT DEFAULT 0,
  error TEXT,
  result JSON,
  user_id INT,
  priority INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_job_id (job_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_ward_number (ward_number),
  INDEX idx_user_id (user_id)
);

-- Add foreign key constraint if users table exists
-- ALTER TABLE file_processing_jobs 
-- ADD CONSTRAINT fk_file_processing_jobs_user_id 
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
