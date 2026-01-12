import axios, { AxiosInstance } from 'axios';

/**
 * Instagram Graph API Service
 * 
 * Handles all direct communication with Instagram Graph API.
 * Reference: https://developers.facebook.com/docs/instagram-api
 */
export class InstagramGraphApiService {
  private readonly apiVersion = 'v18.0';
  private readonly baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

  /**
   * Exchange short-lived token for long-lived token
   */
  async exchangeToken(shortLivedToken: string, appId: string, appSecret: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error(`Token exchange failed: ${error.message}`, error.stack);
      throw new Error(`Failed to exchange token: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get user's Instagram Business Account ID
   */
  async getInstagramBusinessAccount(userId: string, accessToken: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/${userId}/accounts`, {
        params: {
          access_token: accessToken,
        },
      });

      const pages = response.data.data;
      if (!pages || pages.length === 0) {
        throw new Error('No Facebook pages found. User must have a Facebook page connected to Instagram Business account.');
      }

      // Get first page's Instagram Business Account
      const pageId = pages[0].id;
      const pageResponse = await axios.get(`${this.baseUrl}/${pageId}`, {
        params: {
          access_token: accessToken,
          fields: 'instagram_business_account',
        },
      });

      const igAccount = pageResponse.data.instagram_business_account;
      if (!igAccount || !igAccount.id) {
        throw new Error('No Instagram Business account found. Please connect Instagram to your Facebook page.');
      }

      return igAccount.id;
    } catch (error: any) {
      console.error(`Failed to get Instagram Business Account: ${error.message}`, error.stack);
      throw new Error(`Failed to get Instagram Business Account: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get Instagram account info
   */
  async getAccountInfo(igAccountId: string, accessToken: string): Promise<{
    id: string;
    username: string;
    account_type: string;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/${igAccountId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,username,account_type',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error(`Failed to get account info: ${error.message}`, error.stack);
      throw new Error(`Failed to get account info: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Upload image to Instagram (step 1: create container)
   */
  async createImageContainer(
    igAccountId: string,
    imageUrl: string,
    caption: string,
    accessToken: string,
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${igAccountId}/media`,
        null,
        {
          params: {
            image_url: imageUrl,
            caption: caption || '',
            access_token: accessToken,
          },
        },
      );

      return response.data.id; // Container ID
    } catch (error: any) {
      console.error(`Failed to create image container: ${error.message}`, error.stack);
      throw new Error(`Failed to create image container: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Upload carousel to Instagram (step 1: create containers for each image)
   */
  async createCarouselContainers(
    igAccountId: string,
    imageUrls: string[],
    caption: string,
    accessToken: string,
  ): Promise<string[]> {
    try {
      const containerIds: string[] = [];

      // Create container for each image
      for (let i = 0; i < imageUrls.length; i++) {
        const response = await axios.post(
          `${this.baseUrl}/${igAccountId}/media`,
          null,
          {
            params: {
              is_carousel_item: true,
              image_url: imageUrls[i],
              access_token: accessToken,
            },
          },
        );
        containerIds.push(response.data.id);
      }

      // Create carousel container
      const carouselResponse = await axios.post(
        `${this.baseUrl}/${igAccountId}/media`,
        null,
        {
          params: {
            media_type: 'CAROUSEL',
            children: containerIds.join(','),
            caption: caption || '',
            access_token: accessToken,
          },
        },
      );

      return [carouselResponse.data.id]; // Return carousel container ID
    } catch (error: any) {
      console.error(`Failed to create carousel containers: ${error.message}`, error.stack);
      throw new Error(`Failed to create carousel: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Upload reel to Instagram (step 1: upload video and create container)
   */
  async createReelContainer(
    igAccountId: string,
    videoUrl: string,
    caption: string,
    coverUrl: string,
    accessToken: string,
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${igAccountId}/media`,
        null,
        {
          params: {
            media_type: 'REELS',
            video_url: videoUrl,
            caption: caption || '',
            thumb_offset: 0, // Can be adjusted
            access_token: accessToken,
          },
        },
      );

      return response.data.id; // Container ID
    } catch (error: any) {
      console.error(`Failed to create reel container: ${error.message}`, error.stack);
      throw new Error(`Failed to create reel container: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Publish container (step 2: publish)
   */
  async publishContainer(
    igAccountId: string,
    containerId: string,
    accessToken: string,
  ): Promise<{
    id: string;
    status_code: string;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${igAccountId}/media_publish`,
        null,
        {
          params: {
            creation_id: containerId,
            access_token: accessToken,
          },
        },
      );

      return response.data; // Published post ID
    } catch (error: any) {
      console.error(`Failed to publish container: ${error.message}`, error.stack);
      throw new Error(`Failed to publish post: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Check container status (for async publishing)
   */
  async getContainerStatus(containerId: string, accessToken: string): Promise<{
    id: string;
    status_code: string;
    status: string;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/${containerId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,status_code,status',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error(`Failed to get container status: ${error.message}`, error.stack);
      throw new Error(`Failed to get container status: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get published post info
   */
  async getPostInfo(postId: string, accessToken: string): Promise<{
    id: string;
    permalink: string;
    timestamp: string;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/${postId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,permalink,timestamp',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error(`Failed to get post info: ${error.message}`, error.stack);
      throw new Error(`Failed to get post info: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        params: {
          access_token: accessToken,
        },
      });

      return !!response.data.id;
    } catch (error: any) {
      console.warn(`Token validation failed: ${error.message}`);
      return false;
    }
  }
}
