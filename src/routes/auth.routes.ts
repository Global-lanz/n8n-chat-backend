import { Router, Request, Response } from 'express';
import config from '@config/index';
import { AuthService } from '@services/auth.service';
import { ExternalAuthService } from '@services/external-auth.service';
import { LoginDto } from '@dto/auth.dto';

const router = Router();
const authService = new AuthService();
const externalAuthService = new ExternalAuthService();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // External mode: delegate authentication to the central blueprint-auth.
    if (config.authMode === 'external') {
      const { email, password } = req.body || {};
      const result = await externalAuthService.loginAndMirror(email, password);
      res.json(result);
      return;
    }

    // Internal mode (default): unchanged local login.
    const dto = Object.assign(new LoginDto(), req.body);
    const result = await authService.login(dto);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('expirou') || err.message.includes('expirada')) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (err.message.includes('Acesso negado')) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(401).json({ error: err.message });
  }
});

export default router;
