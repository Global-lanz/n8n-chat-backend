import { Router, Response } from 'express';
import { authMiddleware, adminMiddleware, AuthRequest } from '@middleware/auth.middleware';
import { UserService } from '@services/user.service';
import { CreateUserDto, UpdateUserDto, UpdateUsernameDto } from '@dto/user.dto';

const router = Router();
const userService = new UserService();

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await userService.getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update username
router.put('/username', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dto = Object.assign(new UpdateUsernameDto(), req.body);
    const user = await userService.updateUsername(req.userId!, dto);
    res.json({ user, message: 'Nome atualizado com sucesso' });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
