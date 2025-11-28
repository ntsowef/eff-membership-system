import * as cron from 'node-cron';
import { MeetingStatusService } from '../services/meetingStatusService';

export class MeetingStatusJob {
  private static task: cron.ScheduledTask | null = null;
  
  /**
   * Start the meeting status update job
   * Runs every 5 minutes
   */
  static start(): void {
    if (this.task) {
      console.log('⚠️  Meeting status job already running');
      return;
    }
    
    // Run every 5 minutes: */5 * * * *
    // For testing, you can use: * * * * * (every minute)
    this.task = cron.schedule('*/5 * * * *', async () => {
      console.log('🔄 Running meeting status update job...');
      try {
        const result = await MeetingStatusService.batchUpdateMeetingStatuses();
        if (result.updated > 0 || result.errors > 0) {
          console.log(`✅ Meeting status job completed: ${result.updated} updated, ${result.errors} errors`);
        }
      } catch (error) {
        console.error('❌ Meeting status job failed:', error);
      }
    });
    
    console.log('✅ Meeting status job started (runs every 5 minutes)');
    
    // Run immediately on startup
    this.runNow();
  }
  
  /**
   * Run the job immediately (useful for testing or manual trigger)
   */
  static async runNow(): Promise<void> {
    console.log('🔄 Running meeting status update job (manual trigger)...');
    try {
      const result = await MeetingStatusService.batchUpdateMeetingStatuses();
      console.log(`✅ Meeting status job completed: ${result.updated} updated, ${result.errors} errors`);
    } catch (error) {
      console.error('❌ Meeting status job failed:', error);
    }
  }
  
  /**
   * Stop the meeting status update job
   */
  static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('🛑 Meeting status job stopped');
    }
  }
  
  /**
   * Check if the job is running
   */
  static isRunning(): boolean {
    return this.task !== null;
  }
}

