import prisma from '@config/database';
import config from '@config/index';
import axios, { AxiosError } from 'axios';
import { SendMessageDto } from '@dto/message.dto';

export interface MessageData {
  id: number;
  userId: number;
  sender: string;
  content: string;
  timestamp: Date;
}

export class MessageService {
  async getAllMessages(limit: number = 1000): Promise<MessageData[]> {
    const messages = await prisma.message.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        }
      }
    });

    return messages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
      user: msg.user,
    })) as any;
  }

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
      // Buscar o prompt do sistema da tabela de settings
      const systemPromptSetting = await prisma.settings.findUnique({
        where: { key: 'system_prompt' }
      });
      const systemPrompt = systemPromptSetting?.value || 'Você é um assistente virtual útil.';

      const response = await axios.post(
        config.n8nWebhookUrl,
        {
          userId,
          username,
          message: content,
          systemPrompt,
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
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        const status = axiosError.response?.status;
        const responseData = axiosError.response?.data;

        console.error('Erro ao chamar N8N:', {
          url: config.n8nWebhookUrl,
          status,
          responseData,
          message: axiosError.message,
        });

        if (status === 404) {
          throw new Error(`Webhook N8N não encontrado: verifique N8N_WEBHOOK_URL (${config.n8nWebhookUrl}) e se o workflow está ativo`);
        }

        throw new Error(
          status
            ? `Erro ao chamar N8N (${status})`
            : 'Erro ao chamar N8N'
        );
      }

      console.error('Erro ao chamar N8N:', error);
      throw new Error('Erro ao processar resposta');
    }
  }
}
