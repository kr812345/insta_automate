import Queue from 'bull';

export const PUBLISH_QUEUE = 'publish';

// Create Redis connection
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

// Create Bull queue
export const publishQueue = new Queue(PUBLISH_QUEUE, {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export class SchedulerService {
  /**
   * Schedule a post to be published at a specific time
   */
  async schedulePost(postId: string, scheduledAt: Date): Promise<void> {
    const delay = scheduledAt.getTime() - Date.now();

    if (delay < 0) {
      // If time has passed, schedule immediately with a small delay
      await publishQueue.add(
        'publish-post',
        { postId },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
      console.warn(`Post ${postId} scheduled time has passed, publishing immediately`);
      return;
    }

    await publishQueue.add(
      'publish-post',
      { postId },
      {
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5s, then 10s, then 20s
        },
      },
    );

    console.log(`Post ${postId} scheduled for ${scheduledAt.toISOString()}`);
  }

  /**
   * Reschedule a post
   */
  async reschedulePost(postId: string, oldScheduledAt: Date, newScheduledAt: Date): Promise<void> {
    // Cancel existing job (if exists)
    await this.cancelPost(postId);

    // Schedule new job
    await this.schedulePost(postId, newScheduledAt);
  }

  /**
   * Cancel a scheduled post
   */
  async cancelPost(postId: string): Promise<void> {
    const jobs = await publishQueue.getJobs(['waiting', 'delayed', 'active']);
    
    for (const job of jobs) {
      if (job.data.postId === postId) {
        await job.remove();
        console.log(`Cancelled job for post ${postId}`);
      }
    }
  }

  /**
   * Get queue stats
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      publishQueue.getWaitingCount(),
      publishQueue.getActiveCount(),
      publishQueue.getCompletedCount(),
      publishQueue.getFailedCount(),
      publishQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }
}

export const schedulerService = new SchedulerService();

