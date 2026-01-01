import prisma from '@config/database';
import config from '@config/index';
import axios from 'axios';
import { SendMessageDto } from '@dto/message.dto';

export interface MessageData {
  id: number;
  userId: number;
  sender: string;
  content: string;
  timestamp: Date;
}

export class MessageService {
  async getUserMessages(userId: number, limit: number = 100): Promise<MessageData[]> {
    const messages = await prisma.message.findMany({
      where: { userId },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });

    return messages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
    }));
  }

  async createUserMessage(userId: number, dto: SendMessageDto): Promise<MessageData> {
    // Validate DTO
    const errors = dto.validate();
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const message = await prisma.message.create({
      data: {
        userId,
        sender: 'user',
        content: dto.content,
      },
    });

    return {
      id: message.id,
      userId: message.userId,
      sender: message.sender,
      content: message.content,
      timestamp: message.timestamp,
    };
  }

  async createBotMessage(userId: number, content: string): Promise<MessageData> {
    const message = await prisma.message.create({
      data: {
        userId,
        sender: 'bot',
        content,
      },
    });

    return {
      id: message.id,
      userId: message.userId,
      sender: message.sender,
      content: message.content,
      timestamp: message.timestamp,
    };
  }

  async sendToN8N(userId: number, username: string, content: string): Promise<string | null> {
    try {
      const response = await axios.post(
        config.n8nWebhookUrl,
        {
          userId,
          username,
          message: content,
          timestamp: new Date(),
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      if (response.data && response.data.response) {
        return response.data.response;
      }

      return null;
    } catch (error) {
      console.error('Erro ao chamar N8N:', error);
      throw new Error('Erro ao processar resposta');
    }
  }
}
