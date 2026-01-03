import { Router, Request, Response } from 'express';

const router = Router();

// Get app configuration
router.get('/', (_req: Request, res: Response): void => {
  res.json({
    botName: process.env.BOT_NAME || 'NorteIA',
    version: process.env.APP_VERSION || '0.2.0'
  });
});

export default router;
