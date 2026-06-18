import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import config from '@config/index';
import prisma from '@config/database';
import { errorHandler } from '@middleware/error.middleware';
import authRoutes from '@routes/auth.routes';
import messageRoutes from '@routes/message.routes';
import userRoutes from '@routes/user.routes';
import adminRoutes from '@routes/admin.routes';
import webhookRoutes from '@routes/webhook.routes';
import configRoutes from '@routes/config.routes';
import settingsRoutes from './routes/settings.routes';
import { setSocketIO as setMessageSocket } from '@routes/message.routes';
import { setSocketIO as setWebhookSocket } from '@routes/webhook.routes';
import { AuthService } from '@services/auth.service';
import { BootstrapService } from '@services/bootstrap.service';
import pkg from '../package.json';

const VERSION = pkg.version;

class Server {
  private app: Application;
  private server: http.Server;
  private io: SocketIOServer;
  private authService: AuthService;
  private bootstrapService: BootstrapService;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: this.getCorsConfig(),
    });
    this.authService = new AuthService();
    this.bootstrapService = new BootstrapService();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandler();
  }

  private getCorsConfig() {
    if (config.allowedOrigins.includes('*')) {
      return { origin: '*' };
    }
    return {
      origin: config.allowedOrigins,
      credentials: true,
    };
  }

  private setupMiddleware(): void {
    this.app.use(cors(this.getCorsConfig()));
    this.app.use(express.json({ limit: '5mb' }));
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api', authRoutes);
    this.app.use('/api/messages', messageRoutes);
    this.app.use('/api/user', userRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/admin/settings', settingsRoutes);
    this.app.use('/api/webhook', webhookRoutes);
    this.app.use('/api/config', configRoutes);

    // Set socket IO for routes that need it
    setMessageSocket(this.io);
    setWebhookSocket(this.io);

    // Version endpoint
    this.app.get('/api/version', (_req: Request, res: Response) => {
      res.json({ version: VERSION });
    });

    // Health check
    this.app.get('/api/health', async (_req: Request, res: Response) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', database: 'connected' });
      } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
      }
    });
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      console.log('✅ Cliente conectado');

      socket.on('authenticate', async (token: string) => {
        try {
          const decoded = await this.authService.verifyToken(token);
          socket.join(decoded.userId.toString());
          console.log(`✅ Usuário ${decoded.userId} autenticado no socket`);
        } catch (error) {
          console.error('❌ Erro na autenticação do socket:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado');
      });
    });
  }

  private setupErrorHandler(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Test database connection
      await prisma.$connect();
      console.log('✅ Database connected');

      // Ensure there is at least one admin account configured by environment
      await this.bootstrapService.ensureInitialAdmin();

      // Ensure default settings are seeded
      await this.bootstrapService.ensureDefaultSettings();

      // Start server
      this.server.listen(config.port, () => {
        console.log(`🚀 Servidor rodando na porta ${config.port}`);
        console.log(`📦 Versão: ${VERSION}`);
        console.log(`🌍 Ambiente: ${config.nodeEnv}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    } catch (error) {
      console.error('❌ Erro ao iniciar servidor:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    console.log('🛑 Encerrando servidor...');

    this.server.close(async () => {
      await prisma.$disconnect();
      console.log('✅ Servidor encerrado');
      process.exit(0);
    });
  }
}

// Start server
const server = new Server();
server.start();
