import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { socialAccountsService } from '../services/social-accounts.service';
import { AppError } from '../middleware/error.middleware';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user accounts
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const accounts = await socialAccountsService.getUserAccounts(req.user!.id);
    res.json(accounts);
  } catch (error: any) {
    next(error);
  }
});

// Get account by ID
router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const account = await socialAccountsService.getAccountById(req.params.id, req.user!.id);
      res.json(account);
    } catch (error: any) {
      if (error.message === 'Social account not found') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  },
);

// Connect Instagram account
router.post(
  '/instagram/connect',
  [body('code').notEmpty()],
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const account = await socialAccountsService.connectInstagramAccount(
        req.user!.id,
        req.body.code,
      );
      res.status(201).json(account);
    } catch (error: any) {
      next(error);
    }
  },
);

// Validate account
router.post(
  '/:id/validate',
  [param('id').isUUID()],
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const isValid = await socialAccountsService.validateAccount(req.params.id, req.user!.id);
      res.json({ valid: isValid });
    } catch (error: any) {
      next(error);
    }
  },
);

// Disconnect account
router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await socialAccountsService.disconnectAccount(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message === 'Social account not found') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  },
);

export default router;

