import { prisma } from '../index';
import { PostStatus, PostType as PrismaPostType } from '@prisma/client';
import { platformFactory } from './platform-factory.service';
import { schedulerService } from './scheduler.service';
import { ScheduledPost as PlatformPost, PostType as PlatformPostType } from '../platforms/base/platform-adapter.interface';

// Convert Prisma PostType to Platform PostType
function toPlatformPostType(type: PrismaPostType): PlatformPostType {
  return type as unknown as PlatformPostType;
}

export interface CreateScheduledPostDto {
  userId: string;
  socialAccountId: string;
  postType: PrismaPostType;
  caption?: string;
  scheduledAt: Date;
  mediaAssetIds: string[];
}

export interface UpdateScheduledPostDto {
  caption?: string;
  scheduledAt?: Date;
  status?: PostStatus;
}

export class PostsService {
  /**
   * Create a scheduled post
   */
  async createScheduledPost(dto: CreateScheduledPostDto) {
    // Validate social account exists and belongs to user
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        id: dto.socialAccountId,
        userId: dto.userId,
        isActive: true,
      },
    });

    if (!socialAccount) {
      throw new Error('Social account not found or inactive');
    }

    // Validate platform is supported
    if (!platformFactory.isSupported(socialAccount.platform)) {
      throw new Error(`Platform ${socialAccount.platform} is not supported`);
    }

    // Get media assets
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: dto.mediaAssetIds },
      },
    });

    if (mediaAssets.length !== dto.mediaAssetIds.length) {
      throw new Error('Some media assets not found');
    }

    // Validate media for platform
    const adapter = platformFactory.getAdapter(socialAccount.platform);
    const validation = adapter.validateMedia(
      mediaAssets.map((m) => ({
        id: m.id,
        fileUrl: m.fileUrl,
        fileType: m.fileType || '',
        fileSize: m.fileSize || undefined,
        width: m.width || undefined,
        height: m.height || undefined,
        position: m.position,
      })),
      toPlatformPostType(dto.postType),
    );

    if (!validation.valid) {
      throw new Error(`Media validation failed: ${validation.errors?.join(', ')}`);
    }

    // Validate scheduled time is in future
    if (new Date(dto.scheduledAt) <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Create scheduled post
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        userId: dto.userId,
        socialAccountId: dto.socialAccountId,
        platform: socialAccount.platform,
        postType: dto.postType,
        caption: dto.caption,
        scheduledAt: dto.scheduledAt,
        status: PostStatus.PENDING,
        mediaAssets: {
          connect: mediaAssets.map((m) => ({ id: m.id })),
        },
      },
      include: {
        mediaAssets: true,
        socialAccount: {
          select: {
            platformUsername: true,
          },
        },
      },
    });

    // Schedule job in BullMQ
    await schedulerService.schedulePost(scheduledPost.id, dto.scheduledAt);

    console.log(`Scheduled post created: ${scheduledPost.id} for ${dto.scheduledAt}`);

    return scheduledPost;
  }

  /**
   * Get scheduled posts for user
   */
  async getUserPosts(userId: string, status?: PostStatus) {
    return prisma.scheduledPost.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        mediaAssets: true,
        socialAccount: {
          select: {
            platform: true,
            platformUsername: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    });
  }

  /**
   * Get single scheduled post
   */
  async getPostById(postId: string, userId: string) {
    const post = await prisma.scheduledPost.findFirst({
      where: {
        id: postId,
        userId,
      },
      include: {
        mediaAssets: true,
        socialAccount: true,
        jobLogs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    return post;
  }

  /**
   * Update scheduled post (only if not published)
   */
  async updatePost(postId: string, userId: string, dto: UpdateScheduledPostDto) {
    const post = await prisma.scheduledPost.findFirst({
      where: {
        id: postId,
        userId,
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.status === PostStatus.PUBLISHED) {
      throw new Error('Cannot update published post');
    }

    if (post.status === PostStatus.CANCELLED) {
      throw new Error('Cannot update cancelled post');
    }

    // If scheduled time changed, reschedule job
    if (dto.scheduledAt && dto.scheduledAt !== post.scheduledAt) {
      if (new Date(dto.scheduledAt) <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
      await schedulerService.reschedulePost(postId, post.scheduledAt, dto.scheduledAt);
    }

    return prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        caption: dto.caption,
        scheduledAt: dto.scheduledAt,
        status: dto.status,
      },
      include: {
        mediaAssets: true,
      },
    });
  }

  /**
   * Delete scheduled post
   */
  async deletePost(postId: string, userId: string) {
    const post = await prisma.scheduledPost.findFirst({
      where: {
        id: postId,
        userId,
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.status === PostStatus.PUBLISHED) {
      throw new Error('Cannot delete published post');
    }

    // Cancel scheduled job
    await schedulerService.cancelPost(postId);

    // Delete post (cascades to media assets)
    await prisma.scheduledPost.delete({
      where: { id: postId },
    });

    return { success: true };
  }

  /**
   * Retry failed post
   */
  async retryPost(postId: string, userId: string) {
    const post = await prisma.scheduledPost.findFirst({
      where: {
        id: postId,
        userId,
        status: PostStatus.FAILED,
      },
      include: {
        socialAccount: true,
        mediaAssets: true,
      },
    });

    if (!post) {
      throw new Error('Failed post not found');
    }

    // Reset retry count and status
    const updatedPost = await prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        status: PostStatus.PENDING,
        retryCount: 0,
        errorMessage: null,
      },
    });

    // Schedule immediate retry (or reschedule for future)
    await schedulerService.schedulePost(postId, new Date());

    return updatedPost;
  }

  /**
   * Convert Prisma post to platform post format
   */
  async preparePostForPublishing(postId: string): Promise<PlatformPost & { accessToken: string; igAccountId: string }> {
    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
      include: {
        socialAccount: true,
        mediaAssets: true,
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Check if token needs refresh
    let accessToken = post.socialAccount.accessToken;
    if (post.socialAccount.tokenExpiresAt && post.socialAccount.tokenExpiresAt <= new Date()) {
      // Refresh token
      const adapter = platformFactory.getAdapter(post.platform);
      const refreshed = await adapter.refreshToken(
        post.socialAccount.platformUserId,
        post.socialAccount.refreshToken || post.socialAccount.accessToken,
      );

      // Update in database
      await prisma.socialAccount.update({
        where: { id: post.socialAccountId },
        data: {
          accessToken: refreshed.accessToken,
          tokenExpiresAt: refreshed.tokenExpiresAt,
        },
      });

      accessToken = refreshed.accessToken;
    }

    return {
      id: post.id,
      userId: post.userId,
      socialAccountId: post.socialAccountId,
      platform: post.platform,
      postType: toPlatformPostType(post.postType),
      caption: post.caption || undefined,
      scheduledAt: post.scheduledAt,
      mediaAssets: post.mediaAssets.map((m) => ({
        id: m.id,
        fileUrl: m.fileUrl,
        fileType: m.fileType || '',
        fileSize: m.fileSize || undefined,
        width: m.width || undefined,
        height: m.height || undefined,
        position: m.position,
      })),
      accessToken,
      igAccountId: post.socialAccount.platformUserId,
    };
  }
}

export const postsService = new PostsService();

