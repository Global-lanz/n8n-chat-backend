import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware para validar token de webhook
 * Verifica se o header x-webhook-token corresponde ao token armazenado no banco
 */
export async function webhookAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const webhookToken = req.headers['x-webhook-token'] as string;

    if (!webhookToken) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Webhook token is required in header: x-webhook-token'
      });
      return;
    }

    // Busca token configurado no banco
    const setting = await prisma.settings.findUnique({
      where: { key: 'webhook_secret_token' }
    });

    if (!setting || !setting.value || setting.value.trim() === '') {
      res.status(500).json({
        error: 'Server Configuration Error',
        message: 'Webhook token not configured in system settings'
      });
      return;
    }

    if (webhookToken !== setting.value) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook token'
      });
      return;
    }

    // Token válido, continua para o próximo middleware
    next();
  } catch (error) {
    console.error('Webhook auth middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error validating webhook token'
    });
  }
}
