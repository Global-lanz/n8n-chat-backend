import { Router, Request, Response } from 'express';
import { embedAuthMiddleware } from '@middleware/embed-auth.middleware';
import { EmbedAuthService } from '@services/embed-auth.service';
import { EmbedSessionDto } from '@dto/embed.dto';

const router = Router();
const embedAuthService = new EmbedAuthService();

/**
 * POST /api/embed/session
 * Mints a chat session for a user already authenticated in a third-party
 * app, so its embedded iframe can open straight into /chat with no login
 * screen. Called server-to-server only — never from a browser — guarded by
 * embedAuthMiddleware (header x-embed-token).
 */
router.post('/session', embedAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const dto = Object.assign(new EmbedSessionDto(), req.body);
    const errors = dto.validate();
    if (errors.length > 0) {
      res.status(400).json({ error: 'Bad Request', message: errors.join(', ') });
      return;
    }

    const result = await embedAuthService.mintSession({
      externalId: dto.externalId,
      email: dto.email,
      name: dto.name,
    });

    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('inativo')) {
      res.status(403).json({ error: 'Forbidden', message: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

export default router;
