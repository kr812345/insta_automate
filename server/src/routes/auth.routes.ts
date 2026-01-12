import express from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const router = express.Router();
const authService = new AuthService();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').optional().trim(),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await authService.login(req.body);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ message: error.message });
      }
      next(error);
    }
  },
);

// Get profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    name: req.user!.name,
  });
});

// Get Instagram OAuth URL
router.get('/instagram/oauth-url', authenticateToken, (req, res, next) => {
  try {
    const url = authService.getInstagramOAuthUrl();
    res.json({ url });
  } catch (error: any) {
    next(error);
  }
});

// Instagram OAuth callback
router.get('/instagram/callback', (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code) {
    return res.status(400).json({ message: 'Missing authorization code' });
  }

  res.json({ code, state });
});

export default router;

