import { PlatformAdapter } from '../platforms/base/platform-adapter.interface';
import { InstagramAdapter } from '../platforms/instagram/instagram.adapter';

/**
 * Platform Factory
 * 
 * Creates platform adapter instances based on platform name.
 * This is where you register new platform adapters.
 */
export class PlatformFactory {
  private adapters: Map<string, PlatformAdapter> = new Map();
  private instagramAdapter: InstagramAdapter;

  constructor() {
    // Initialize Instagram adapter
    this.instagramAdapter = new InstagramAdapter();
    
    // Register Instagram adapter
    this.register('instagram', this.instagramAdapter);
    
    // Future platforms can be registered here:
    // this.register('youtube', this.youtubeAdapter);
    // this.register('twitter', this.twitterAdapter);
    // this.register('linkedin', this.linkedinAdapter);
  }

  /**
   * Register a platform adapter
   */
  private register(platformName: string, adapter: PlatformAdapter): void {
    this.adapters.set(platformName.toLowerCase(), adapter);
  }

  /**
   * Get a platform adapter instance
   */
  getAdapter(platformName: string): PlatformAdapter {
    const adapter = this.adapters.get(platformName.toLowerCase());
    
    if (!adapter) {
      throw new Error(`Platform adapter not found: ${platformName}`);
    }

    return adapter;
  }

  /**
   * Check if a platform is supported
   */
  isSupported(platformName: string): boolean {
    return this.adapters.has(platformName.toLowerCase());
  }

  /**
   * Get all supported platforms
   */
  getSupportedPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// Export singleton instance
export const platformFactory = new PlatformFactory();

