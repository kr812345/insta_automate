import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { postsService } from '../services/posts.service';
import { PostType, PostStatus } from '@prisma/client';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create scheduled post
router.post(
  '/',
  [
    body('socialAccountId').isUUID(),
    body('postType').isIn(['IMAGE', 'CAROUSEL', 'REEL']),
    body('caption').optional().isString(),
    body('scheduledAt').isISO8601(),
    body('mediaAssetIds').isArray().notEmpty(),
    body('mediaAssetIds.*').isUUID(),
  ],
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const post = await postsService.createScheduledPost({
        ...req.body,
        userId: req.user!.id,
        scheduledAt: new Date(req.body.scheduledAt),
      });
      res.status(201).json(post);
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('inactive')) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('validation failed') || error.message.includes('must be')) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  },
);

// Get user posts
router.get(
  '/',
  [query('status').optional().isIn(['PENDING', 'PUBLISHED', 'FAILED', 'CANCELLED'])],
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const status = req.query.status as PostStatus | undefined;
      const posts = await postsService.getUserPosts(req.user!.id, status);
      res.json(posts);
    } catch (error: any) {
      next(error);
    }
  },
);

// Get post by ID
router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const post = await postsService.getPostById(req.params.id, req.user!.id);
      res.json(post);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  },
);

// Update post
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('caption').optional().isString(),
    body('scheduledAt').optional().isISO8601(),
    body('status').optional().isIn(['PENDING', 'PUBLISHED', 'FAILED', 'CANCELLED']),
  ],
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const post = await postsService.updatePost(req.params.id, req.user!.id, {
        ...req.body,
        scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
      });
      res.json(post);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('Cannot update') || error.message.includes('must be')) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  },
);

// Delete post
router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await postsService.deletePost(req.params.id, req.user!.id);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('Cannot delete')) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  },
);

// Retry failed post
router.post(
  '/:id/retry',
  [param('id').isUUID()],
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const post = await postsService.retryPost(req.params.id, req.user!.id);
      res.json(post);
    } catch (error: any) {
      if (error.message === 'Failed post not found') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  },
);

export default router;

