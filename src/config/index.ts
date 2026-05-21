import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  n8nWebhookUrl: string;
  n8nEmailWebhookUrl?: string;
  initialAdminEmail?: string;
  initialAdminPassword?: string;
  initialAdminUsername?: string;
  allowedOrigins: string[];
  nodeEnv: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || '',
  n8nEmailWebhookUrl: process.env.N8N_EMAIL_WEBHOOK_URL,
  initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL,
  initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD,
  initialAdminUsername: process.env.INITIAL_ADMIN_USERNAME,
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'],
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Validation
if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is required in environment variables');
}

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required in environment variables');
}

const hasInitialAdminEmail = Boolean(config.initialAdminEmail);
const hasInitialAdminPassword = Boolean(config.initialAdminPassword);

if (hasInitialAdminEmail !== hasInitialAdminPassword) {
  throw new Error('INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set together');
}

export default config;
