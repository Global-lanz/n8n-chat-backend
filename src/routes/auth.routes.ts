import { Router, Request, Response } from 'express';
import { AuthService } from '@services/auth.service';
import { LoginDto } from '@dto/auth.dto';

const router = Router();
const authService = new AuthService();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const dto = Object.assign(new LoginDto(), req.body);
    const result = await authService.login(dto);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('expirou') || err.message.includes('expirada')) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(401).json({ error: err.message });
  }
});

export default router;
