import {
  PlatformAdapter,
  ConnectedAccount,
  ScheduledPost,
  ValidationResult,
  PublishResult,
  PostStatus,
  PostType,
  MediaAsset,
} from '../base/platform-adapter.interface';
import { InstagramGraphApiService } from './instagram-graph-api.service';

/**
 * Instagram Platform Adapter
 * 
 * Implements PlatformAdapter interface for Instagram.
 * Handles Instagram-specific OAuth, validation, and publishing logic.
 */
export class InstagramAdapter implements PlatformAdapter {
  private graphApi: InstagramGraphApiService;

  constructor() {
    this.graphApi = new InstagramGraphApiService();
  }

  getPlatformName(): string {
    return 'instagram';
  }

  getSupportedPostTypes(): PostType[] {
    return [PostType.IMAGE, PostType.CAROUSEL, PostType.REEL];
  }

  /**
   * Connect Instagram account via OAuth
   */
  async connectAccount(oauthCode: string, redirectUri: string): Promise<ConnectedAccount> {
    try {
      const appId = process.env.INSTAGRAM_APP_ID;
      const appSecret = process.env.INSTAGRAM_APP_SECRET;

      if (!appId || !appSecret) {
        throw new Error('Instagram app credentials not configured');
      }

      // Step 1: Exchange code for short-lived token
      const tokenResponse = await this.graphApi.exchangeToken(
        oauthCode,
        appId,
        appSecret,
      );

      const shortLivedToken = tokenResponse.access_token;

      // Step 2: Get user ID from token
      const userResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?access_token=${shortLivedToken}`,
      );
      const userData = await userResponse.json() as { id: string };

      // Step 3: Get Instagram Business Account ID
      const igAccountId = await this.graphApi.getInstagramBusinessAccount(
        userData.id,
        shortLivedToken,
      );

      // Step 4: Get account info
      const accountInfo = await this.graphApi.getAccountInfo(igAccountId, shortLivedToken);

      // Calculate token expiration
      const expiresIn = tokenResponse.expires_in || 5184000; // Default 60 days
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        platformUserId: igAccountId,
        platformUsername: accountInfo.username,
        accessToken: shortLivedToken,
        tokenExpiresAt,
      };
    } catch (error: any) {
      console.error(`Failed to connect Instagram account: ${error.message}`, error.stack);
      throw new Error(`Failed to connect Instagram account: ${error.message}`);
    }
  }

  /**
   * Validate Instagram account is still connected
   */
  async validateAccount(accountId: string, accessToken: string): Promise<boolean> {
    try {
      return await this.graphApi.validateToken(accessToken);
    } catch (error: any) {
      console.warn(`Account validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Refresh Instagram access token
   */
  async refreshToken(accountId: string, refreshToken: string): Promise<ConnectedAccount> {
    try {
      const appId = process.env.INSTAGRAM_APP_ID;
      const appSecret = process.env.INSTAGRAM_APP_SECRET;

      if (!appId || !appSecret) {
        throw new Error('Instagram app credentials not configured');
      }

      // Exchange refresh token for new long-lived token
      const tokenResponse = await this.graphApi.exchangeToken(
        refreshToken,
        appId,
        appSecret,
      );

      const accountInfo = await this.graphApi.getAccountInfo(
        accountId,
        tokenResponse.access_token,
      );

      const expiresIn = tokenResponse.expires_in || 5184000;
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        platformUserId: accountId,
        platformUsername: accountInfo.username,
        accessToken: tokenResponse.access_token,
        tokenExpiresAt,
      };
    } catch (error: any) {
      console.error(`Failed to refresh token: ${error.message}`, error.stack);
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Disconnect Instagram account
   */
  async disconnectAccount(accountId: string, accessToken: string): Promise<void> {
    try {
      // Instagram doesn't have a direct disconnect endpoint
      // The token will expire naturally
      console.log(`Account disconnected: ${accountId}`);
    } catch (error: any) {
      console.error(`Failed to disconnect account: ${error.message}`, error.stack);
      throw new Error(`Failed to disconnect account: ${error.message}`);
    }
  }

  /**
   * Validate media before scheduling
   */
  validateMedia(media: MediaAsset[], postType: PostType): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Image posts
    if (postType === PostType.IMAGE) {
      if (media.length !== 1) {
        errors.push('Image post must have exactly 1 image');
      }
      if (media[0]?.fileType && !media[0].fileType.startsWith('image/')) {
        errors.push('Invalid file type for image post. Must be an image.');
      }
      if (media[0]?.fileSize && media[0].fileSize > 8 * 1024 * 1024) {
        errors.push('Image file size must be less than 8MB');
      }
      if (media[0]?.width && (media[0].width < 320 || media[0].width > 1440)) {
        warnings.push('Image width should be between 320 and 1440 pixels for best quality');
      }
      if (media[0]?.height && (media[0].height < 320 || media[0].height > 1440)) {
        warnings.push('Image height should be between 320 and 1440 pixels for best quality');
      }
    }

    // Carousel posts
    if (postType === PostType.CAROUSEL) {
      if (media.length < 2 || media.length > 10) {
        errors.push('Carousel post must have between 2 and 10 images');
      }
      media.forEach((m, index) => {
        if (m.fileType && !m.fileType.startsWith('image/')) {
          errors.push(`Item ${index + 1} in carousel must be an image`);
        }
        if (m.fileSize && m.fileSize > 8 * 1024 * 1024) {
          errors.push(`Item ${index + 1} in carousel exceeds 8MB limit`);
        }
      });
    }

    // Reels
    if (postType === PostType.REEL) {
      if (media.length !== 1) {
        errors.push('Reel must have exactly 1 video');
      }
      if (media[0]?.fileType && !media[0].fileType.startsWith('video/')) {
        errors.push('Invalid file type for reel. Must be a video.');
      }
      if (media[0]?.fileSize && media[0].fileSize > 100 * 1024 * 1024) {
        errors.push('Video file size must be less than 100MB');
      }
      if (media[0]?.width && media[0].width !== 1080) {
        warnings.push('Reel width should be 1080 pixels for best quality');
      }
      if (media[0]?.height && media[0].height !== 1920) {
        warnings.push('Reel height should be 1920 pixels (9:16 aspect ratio)');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Publish post (image or carousel)
   */
  async publishPost(post: ScheduledPost): Promise<PublishResult> {
    try {
      const accessToken = (post as any).accessToken;
      const igAccountId = (post as any).igAccountId;

      if (!accessToken || !igAccountId) {
        throw new Error('Missing access token or Instagram account ID');
      }

      let containerId: string;

      // Create container based on post type
      if (post.postType === PostType.IMAGE) {
        if (post.mediaAssets.length !== 1) {
          throw new Error('Image post must have exactly 1 image');
        }
        containerId = await this.graphApi.createImageContainer(
          igAccountId,
          post.mediaAssets[0].fileUrl,
          post.caption || '',
          accessToken,
        );
      } else if (post.postType === PostType.CAROUSEL) {
        const imageUrls = post.mediaAssets
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map((m) => m.fileUrl);
        
        const containerIds = await this.graphApi.createCarouselContainers(
          igAccountId,
          imageUrls,
          post.caption || '',
          accessToken,
        );
        containerId = containerIds[0];
      } else {
        throw new Error(`Unsupported post type: ${post.postType}`);
      }

      // Wait for container to be ready (Instagram requires this)
      await this.waitForContainerReady(containerId, accessToken);

      // Publish container
      const publishResult = await this.graphApi.publishContainer(
        igAccountId,
        containerId,
        accessToken,
      );

      // Get post info
      const postInfo = await this.graphApi.getPostInfo(
        publishResult.id,
        accessToken,
      );

      return {
        success: true,
        platformPostId: publishResult.id,
        platformPostUrl: postInfo.permalink,
      };
    } catch (error: any) {
      console.error(`Failed to publish post: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        errorCode: error.response?.data?.error?.code?.toString() || 'UNKNOWN',
      };
    }
  }

  /**
   * Publish reel
   */
  async publishReel(reel: ScheduledPost): Promise<PublishResult> {
    try {
      const accessToken = (reel as any).accessToken;
      const igAccountId = (reel as any).igAccountId;

      if (!accessToken || !igAccountId) {
        throw new Error('Missing access token or Instagram account ID');
      }

      if (reel.mediaAssets.length !== 1) {
        throw new Error('Reel must have exactly 1 video');
      }

      // Create reel container
      const containerId = await this.graphApi.createReelContainer(
        igAccountId,
        reel.mediaAssets[0].fileUrl,
        reel.caption || '',
        reel.mediaAssets[0].fileUrl, // Cover URL (same as video for now)
        accessToken,
      );

      // Wait for container to be ready
      await this.waitForContainerReady(containerId, accessToken, 30000); // 30s timeout for videos

      // Publish reel
      const publishResult = await this.graphApi.publishContainer(
        igAccountId,
        containerId,
        accessToken,
      );

      // Get post info
      const postInfo = await this.graphApi.getPostInfo(
        publishResult.id,
        accessToken,
      );

      return {
        success: true,
        platformPostId: publishResult.id,
        platformPostUrl: postInfo.permalink,
      };
    } catch (error: any) {
      console.error(`Failed to publish reel: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        errorCode: error.response?.data?.error?.code?.toString() || 'UNKNOWN',
      };
    }
  }

  /**
   * Get post status
   */
  async getPostStatus(
    postId: string,
    platformPostId: string,
    accessToken: string,
  ): Promise<PostStatus> {
    try {
      const postInfo = await this.graphApi.getPostInfo(platformPostId, accessToken);

      return {
        status: 'published',
        platformPostId: postInfo.id,
        platformPostUrl: postInfo.permalink,
        publishedAt: new Date(postInfo.timestamp),
      };
    } catch (error: any) {
      console.error(`Failed to get post status: ${error.message}`, error.stack);
      return {
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * Wait for container to be ready before publishing
   */
  private async waitForContainerReady(
    containerId: string,
    accessToken: string,
    timeout: number = 10000,
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < timeout) {
      const status = await this.graphApi.getContainerStatus(containerId, accessToken);

      if (status.status_code === 'FINISHED') {
        return;
      }

      if (status.status_code === 'ERROR') {
        throw new Error(`Container processing failed: ${status.status || 'Unknown error'}`);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Container processing timeout');
  }
}
