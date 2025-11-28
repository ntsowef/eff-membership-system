import BirthdaySMSService from './birthdaySMSService';

// Create a simple logger if it doesn't exist
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || '')
};

export class BirthdayScheduler {
  private static queueInterval: NodeJS.Timeout | null = null;
  private static processInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  // Start the birthday scheduler
  static start(): void {
    if (this.isRunning) {
      logger.warn('Birthday scheduler is already running');
      return;
    }

    logger.info('Starting birthday SMS scheduler...');
    this.isRunning = true;

    // Queue birthday messages daily at 8:00 AM
    this.scheduleQueueing();
    
    // Process queued messages every 5 minutes
    this.scheduleProcessing();

    logger.info('Birthday SMS scheduler started successfully');
  }

  // Stop the birthday scheduler
  static stop(): void {
    if (!this.isRunning) {
      logger.warn('Birthday scheduler is not running');
      return;
    }

    logger.info('Stopping birthday SMS scheduler...');

    if (this.queueInterval) {
      clearInterval(this.queueInterval);
      this.queueInterval = null;
    }

    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    this.isRunning = false;
    logger.info('Birthday SMS scheduler stopped');
  }

  // Schedule daily queueing of birthday messages
  private static scheduleQueueing(): void {
    // Check every hour if it's time to queue messages
    this.queueInterval = setInterval(async () => {
      try {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

        // Queue messages at 8:00 AM (08:00)
        if (hour === 8 && minute >= 0 && minute < 5) {
          logger.info('Queueing daily birthday messages...');
          const result = await BirthdaySMSService.queueTodaysBirthdayMessages();
          logger.info('Daily birthday message queueing completed', result);
        }
      } catch (error: any) {
        logger.error('Failed to queue daily birthday messages', { error: error.message });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  // Schedule processing of queued messages
  private static scheduleProcessing(): void {
    // Process queued messages every 5 minutes
    this.processInterval = setInterval(async () => {
      try {
        const result = await BirthdaySMSService.processQueuedMessages(20);
        
        if (result.processed > 0) {
          logger.info('Processed queued birthday messages', result);
        }
      } catch (error: any) {
        logger.error('Failed to process queued birthday messages', { error: error.message });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Manual trigger for queueing today's messages
  static async queueTodaysMessages(): Promise<any> {
    try {
      logger.info('Manually queueing today\'s birthday messages...');
      const result = await BirthdaySMSService.queueTodaysBirthdayMessages();
      logger.info('Manual birthday message queueing completed', result);
      return result;
    } catch (error: any) {
      logger.error('Failed to manually queue birthday messages', { error: error.message });
      throw error;
    }
  }

  // Manual trigger for processing queue
  static async processQueue(limit: number = 50): Promise<any> {
    try {
      logger.info('Manually processing birthday message queue...');
      const result = await BirthdaySMSService.processQueuedMessages(limit);
      logger.info('Manual birthday message processing completed', result);
      return result;
    } catch (error: any) {
      logger.error('Failed to manually process birthday messages', { error: error.message });
      throw error;
    }
  }

  // Get scheduler status
  static getStatus(): { isRunning: boolean; queueInterval: boolean; processInterval: boolean } {
    return {
      isRunning: this.isRunning,
      queueInterval: this.queueInterval !== null,
      processInterval: this.processInterval !== null
    };
  }

  // Run birthday message workflow immediately (for testing)
  static async runImmediately(): Promise<{ queue: any; process: any }> {
    try {
      logger.info('Running birthday message workflow immediately...');
      
      // Queue today's messages
      const queueResult = await this.queueTodaysMessages();
      
      // Wait a moment then process the queue
      await new Promise(resolve => setTimeout(resolve, 1000));
      const processResult = await this.processQueue();

      logger.info('Immediate birthday workflow completed', { queue: queueResult, process: processResult });
      
      return {
        queue: queueResult,
        process: processResult
      };
    } catch (error: any) {
      logger.error('Failed to run immediate birthday workflow', { error: error.message });
      throw error;
    }
  }
}

// Auto-start the scheduler when the module is loaded (for production)
// Uncomment the line below to enable automatic startup
// BirthdayScheduler.start();

export default BirthdayScheduler;
