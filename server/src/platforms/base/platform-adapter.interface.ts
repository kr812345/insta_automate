/**
 * Platform Abstraction Interface
 * 
 * All platform adapters (Instagram, YouTube, Twitter, etc.) must implement this interface.
 * This ensures consistent behavior across platforms and easy extensibility.
 */

export enum PostType {
  IMAGE = 'IMAGE',
  CAROUSEL = 'CAROUSEL',
  REEL = 'REEL',
  VIDEO = 'VIDEO', // For future platforms
  TEXT = 'TEXT',   // For future platforms
}

export interface ConnectedAccount {
  platformUserId: string;
  platformUsername: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

export interface MediaAsset {
  id: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  width?: number;
  height?: number;
  position?: number;
}

export interface ScheduledPost {
  id: string;
  userId: string;
  socialAccountId: string;
  platform: string;
  postType: PostType;
  caption?: string;
  scheduledAt: Date;
  mediaAssets: MediaAsset[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface PostStatus {
  status: 'published' | 'failed' | 'pending';
  platformPostId?: string;
  platformPostUrl?: string;
  publishedAt?: Date;
  error?: string;
}

/**
 * Platform Adapter Interface
 * 
 * Implement this interface to add support for a new social media platform.
 */
export interface PlatformAdapter {
  /**
   * Connect an account using OAuth code
   */
  connectAccount(oauthCode: string, redirectUri: string): Promise<ConnectedAccount>;

  /**
   * Validate that an account is still connected and accessible
   */
  validateAccount(accountId: string, accessToken: string): Promise<boolean>;

  /**
   * Refresh an expired access token
   */
  refreshToken(accountId: string, refreshToken: string): Promise<ConnectedAccount>;

  /**
   * Disconnect an account
   */
  disconnectAccount(accountId: string, accessToken: string): Promise<void>;

  /**
   * Publish a post (image or carousel)
   */
  publishPost(post: ScheduledPost): Promise<PublishResult>;

  /**
   * Publish a reel/video
   */
  publishReel(reel: ScheduledPost): Promise<PublishResult>;

  /**
   * Get the status of a published post
   */
  getPostStatus(postId: string, platformPostId: string, accessToken: string): Promise<PostStatus>;

  /**
   * Get platform name (e.g., 'instagram', 'youtube')
   */
  getPlatformName(): string;

  /**
   * Get supported post types for this platform
   */
  getSupportedPostTypes(): PostType[];

  /**
   * Validate media before scheduling
   */
  validateMedia(media: MediaAsset[], postType: PostType): ValidationResult;
}

