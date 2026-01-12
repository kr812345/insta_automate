import { prisma } from '../index';
import * as fs from 'fs/promises';
import * as path from 'path';

export class MediaService {
  private readonly uploadPath: string;

  constructor() {
    this.uploadPath = process.env.STORAGE_LOCAL_PATH || './uploads';
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      console.error(`Failed to create upload directory: ${error}`);
    }
  }

  /**
   * Save uploaded file and create media asset record
   */
  async saveMedia(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ id: string; fileUrl: string; fileType: string; fileSize: number }> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const extension = path.extname(file.originalname);
      const filename = `${timestamp}-${randomStr}${extension}`;
      const filepath = path.join(this.uploadPath, filename);

      // Save file
      await fs.writeFile(filepath, file.buffer);

      // Create media asset record
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          scheduledPostId: '', // Will be set when post is created
          fileUrl: `/uploads/${filename}`, // Relative URL
          fileType: file.mimetype,
          fileSize: file.size,
          width: (file as any).width,
          height: (file as any).height,
          storageKey: filename,
        },
      });

      console.log(`Media asset saved: ${mediaAsset.id}`);

      return {
        id: mediaAsset.id,
        fileUrl: `${process.env.API_URL || 'http://localhost:3000'}${mediaAsset.fileUrl}`,
        fileType: mediaAsset.fileType || '',
        fileSize: mediaAsset.fileSize || 0,
      };
    } catch (error: any) {
      console.error(`Failed to save media: ${error.message}`, error.stack);
      throw new Error(`Failed to save media: ${error.message}`);
    }
  }

  /**
   * Delete media asset
   */
  async deleteMedia(mediaId: string, userId: string): Promise<void> {
    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id: mediaId },
      include: {
        scheduledPost: {
          select: { userId: true },
        },
      },
    });

    if (!mediaAsset) {
      throw new Error('Media asset not found');
    }

    // Check if media belongs to user's post (if scheduled)
    if (mediaAsset.scheduledPost && mediaAsset.scheduledPost.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Delete file
    if (mediaAsset.storageKey) {
      try {
        const filepath = path.join(this.uploadPath, mediaAsset.storageKey);
        await fs.unlink(filepath);
      } catch (error) {
        console.warn(`Failed to delete file: ${error}`);
      }
    }

    // Delete record (will cascade if post exists)
    await prisma.mediaAsset.delete({
      where: { id: mediaId },
    });
  }

  /**
   * Get media asset by ID
   */
  async getMediaById(mediaId: string) {
    return prisma.mediaAsset.findUnique({
      where: { id: mediaId },
    });
  }
}

export const mediaService = new MediaService();

