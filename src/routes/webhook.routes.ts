import { Router, Request, Response } from 'express';
import { MessageService } from '@services/message.service';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();
const messageService = new MessageService();

let io: SocketIOServer;

export const setSocketIO = (socketServer: SocketIOServer): void => {
  io = socketServer;
};

// Webhook for async N8N responses
router.post('/response', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, response } = req.body;
    
    const botMessage = await messageService.createBotMessage(userId, response);
    
    if (io) {
      io.to(userId.toString()).emit('new_message', botMessage);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Hotmart webhook (for license management)
router.post('/hotmart', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name } = req.body;
    
    console.log('📦 Webhook Hotmart recebido:', req.body);
    
    if (!email || !name) {
      res.status(400).json({ error: 'Email e nome são obrigatórios' });
      return;
    }
    
    // Implementation for Hotmart integration
    // This would be in a separate service in a real application
    res.json({ success: true, message: 'Webhook processado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
