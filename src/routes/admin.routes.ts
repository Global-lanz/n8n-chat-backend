import { Router, Response } from 'express';
import { adminMiddleware, AuthRequest } from '@middleware/auth.middleware';
import { UserService } from '@services/user.service';
import { MessageService } from '@services/message.service';
import { CreateUserDto, UpdateUserDto } from '@dto/user.dto';

const router = Router();
const userService = new UserService();
const messageService = new MessageService();

// List all users
router.get('/users', adminMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await userService.getAllUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create user
router.post('/users', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dto = Object.assign(new CreateUserDto(), req.body);
    const user = await userService.createUser(dto);
    res.status(201).json({ user, message: 'Usuário criado com sucesso' });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Update user
router.put('/users/:id', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const dto = Object.assign(new UpdateUserDto(), req.body);
    const user = await userService.updateUser(id, dto);
    res.json({ user, message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    const err = error as Error;
    if (err.message === 'Usuário não encontrado') {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(400).json({ error: err.message });
  }
});

// Delete user
router.delete('/users/:id', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    
    // Prevent deleting own user
    if (id === req.userId) {
      res.status(400).json({ error: 'Você não pode deletar seu próprio usuário' });
      return;
    }
    
    await userService.deleteUser(id);
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get all messages from all users
router.get('/messages', adminMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await messageService.getAllMessages();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get messages from specific user
router.get('/messages/:userId', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const messages = await messageService.getUserMessages(userId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
