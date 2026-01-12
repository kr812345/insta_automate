import { Job } from 'bull';
import { prisma } from '../index';
import { PostStatus } from '@prisma/client';
import { PostType } from '../platforms/base/platform-adapter.interface';
import { postsService } from '../services/posts.service';
import { platformFactory } from '../services/platform-factory.service';
import { publishQueue, PUBLISH_QUEUE } from '../services/scheduler.service';

interface PublishJobData {
  postId: string;
}

/**
 * Process publish jobs from BullMQ queue
 */
export function setupPublishWorker() {
  publishQueue.process('publish-post', async (job: Job<PublishJobData>) => {
    const { postId } = job.data;
    const startTime = Date.now();

    console.log(`Processing publish job for post ${postId}`);

    try {
      // Prepare post for publishing
      const post = await postsService.preparePostForPublishing(postId);

      // Check if post is still pending (might have been cancelled)
      const dbPost = await prisma.scheduledPost.findUnique({
        where: { id: postId },
      });

      if (!dbPost) {
        throw new Error(`Post ${postId} not found`);
      }

      if (dbPost.status !== PostStatus.PENDING) {
        console.warn(`Post ${postId} is not in pending status, skipping. Current status: ${dbPost.status}`);
        return { skipped: true, reason: `Status is ${dbPost.status}` };
      }

      // Get platform adapter
      const adapter = platformFactory.getAdapter(post.platform);

      // Publish based on post type
      let result;
      if (post.postType === PostType.REEL) {
        result = await adapter.publishReel(post);
      } else {
        result = await adapter.publishPost(post);
      }

      const executionTime = Date.now() - startTime;

      // Update post status in database
      if (result.success) {
        await prisma.scheduledPost.update({
          where: { id: postId },
          data: {
            status: PostStatus.PUBLISHED,
            platformPostId: result.platformPostId,
            publishedAt: new Date(),
            errorMessage: null,
          },
        });

        // Log success
        await prisma.jobLog.create({
          data: {
            scheduledPostId: postId,
            status: 'published',
            message: `Post published successfully. Platform Post ID: ${result.platformPostId}`,
            executionTimeMs: executionTime,
            errorDetails: {
              platformPostUrl: result.platformPostUrl,
            },
          },
        });

        console.log(
          `Post ${postId} published successfully. Platform Post ID: ${result.platformPostId}. Time: ${executionTime}ms`,
        );

        return {
          success: true,
          platformPostId: result.platformPostId,
          executionTime,
        };
      } else {
        // Update post status to failed
        const retryCount = dbPost.retryCount + 1;
        const shouldRetry = retryCount < 3;

        await prisma.scheduledPost.update({
          where: { id: postId },
          data: {
            status: shouldRetry ? PostStatus.PENDING : PostStatus.FAILED,
            retryCount,
            errorMessage: result.error || 'Unknown error',
          },
        });

        // Log error
        await prisma.jobLog.create({
          data: {
            scheduledPostId: postId,
            status: 'failed',
            message: result.error || 'Publish failed',
            executionTimeMs: executionTime,
            errorDetails: {
              error: result.error,
              errorCode: result.errorCode,
              retryCount,
              willRetry: shouldRetry,
            },
          },
        });

        console.error(`Post ${postId} publish failed: ${result.error}. Retry count: ${retryCount}`);

        // Throw error to trigger retry if applicable
        if (shouldRetry) {
          throw new Error(result.error || 'Publish failed');
        }

        return {
          success: false,
          error: result.error,
          retryCount,
          executionTime,
        };
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Update post status
      const dbPost = await prisma.scheduledPost.findUnique({
        where: { id: postId },
      });

      if (dbPost) {
        const retryCount = dbPost.retryCount + 1;
        const shouldRetry = retryCount < 3;

        await prisma.scheduledPost.update({
          where: { id: postId },
          data: {
            status: shouldRetry ? PostStatus.PENDING : PostStatus.FAILED,
            retryCount,
            errorMessage: error.message,
          },
        });

        // Log error
        await prisma.jobLog.create({
          data: {
            scheduledPostId: postId,
            status: 'error',
            message: error.message,
            executionTimeMs: executionTime,
            errorDetails: {
              error: error.message,
              stack: error.stack,
              retryCount,
              willRetry: shouldRetry,
            },
          },
        });
      }

      console.error(`Error processing post ${postId}: ${error.message}`, error.stack);

      // Re-throw to trigger BullMQ retry mechanism if applicable
      if (dbPost && dbPost.retryCount < 2) {
        throw error;
      }

      return {
        success: false,
        error: error.message,
        executionTime,
      };
    }
  });

  console.log('✅ Publish worker started');
}
