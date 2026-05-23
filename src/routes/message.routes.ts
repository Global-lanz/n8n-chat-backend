import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '@middleware/auth.middleware';
import { MessageService } from '@services/message.service';
import { SendMessageDto } from '@dto/message.dto';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();
const messageService = new MessageService();

let io: SocketIOServer;

export const setSocketIO = (socketServer: SocketIOServer): void => {
  io = socketServer;
};

router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await messageService.getUserMessages(req.userId!);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dto = Object.assign(new SendMessageDto(), req.body);
    
    // Save user message
    const userMessage = await messageService.createUserMessage(req.userId!, dto);
    
    // Emit to socket
    if (io) {
      io.to(req.userId!.toString()).emit('new_message', userMessage);
    }
    
    // Send to N8N
    try {
      const botResponse = await messageService.sendToN8N(
        req.userId!,
        req.user!.username,
        dto.content
      );
      
      if (botResponse) {
        const botMessage = await messageService.createBotMessage(req.userId!, botResponse);
        
        // Emit bot response
        if (io) {
          io.to(req.userId!.toString()).emit('new_message', botMessage);
        }
        
        res.json({ userMessage, botMessage });
      } else {
        res.json({ userMessage });
      }
    } catch (n8nError) {
      console.error('Erro ao chamar N8N:', n8nError);
      res.json({
        userMessage,
        error: n8nError instanceof Error ? n8nError.message : 'Erro ao processar resposta'
      });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
