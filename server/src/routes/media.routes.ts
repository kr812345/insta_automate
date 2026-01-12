import express from 'express';
import multer from 'multer';
import { param, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { mediaService } from '../services/media.service';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// All routes require authentication
router.use(authenticateToken);

// Upload media
router.post(
  '/upload',
  upload.single('file'),
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const result = await mediaService.saveMedia(req.user!.id, req.file);
      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  },
);

// Delete media
router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await mediaService.deleteMedia(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message === 'Media asset not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Unauthorized') {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  },
);

export default router;

