/**
 * Check Job Status in Database
 * 
 * This script checks the bulk_upload_jobs table to see the actual job status
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'eff_membership_database',
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123'
});

async function checkJobStatus() {
  console.log('🔍 Checking bulk upload jobs in database...\n');

  try {
    // Get all jobs
    const result = await pool.query(`
      SELECT 
        job_id,
        file_name,
        status,
        uploaded_by,
        uploaded_at,
        processing_start,
        processing_end,
        processing_duration_ms,
        validation_stats,
        database_stats,
        report_filename,
        error_message
      FROM bulk_upload_jobs
      ORDER BY uploaded_at DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('❌ No jobs found in database');
      return;
    }

    console.log(`✅ Found ${result.rows.length} job(s):\n`);

    result.rows.forEach((job, index) => {
      console.log(`Job ${index + 1}:`);
      console.log(`  Job ID: ${job.job_id}`);
      console.log(`  File: ${job.file_name}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Uploaded by: ${job.uploaded_by}`);
      console.log(`  Uploaded at: ${job.uploaded_at}`);
      console.log(`  Processing start: ${job.processing_start || 'N/A'}`);
      console.log(`  Processing end: ${job.processing_end || 'N/A'}`);
      console.log(`  Duration: ${job.processing_duration_ms || 0}ms`);
      
      if (job.validation_stats) {
        const stats = typeof job.validation_stats === 'string' 
          ? JSON.parse(job.validation_stats) 
          : job.validation_stats;
        console.log(`  Validation stats:`, stats);
      }
      
      if (job.database_stats) {
        const stats = typeof job.database_stats === 'string'
          ? JSON.parse(job.database_stats)
          : job.database_stats;
        console.log(`  Database stats:`, stats);
      }
      
      if (job.report_filename) {
        console.log(`  Report: ${job.report_filename}`);
      }
      
      if (job.error_message) {
        console.log(`  Error: ${job.error_message}`);
      }
      
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error checking job status:', error.message);
  } finally {
    await pool.end();
  }
}

checkJobStatus();

