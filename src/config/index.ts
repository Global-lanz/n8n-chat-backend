import dotenv from 'dotenv';

dotenv.config();

export type AuthMode = 'internal' | 'external';

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
  // --- External authentication (optional, opt-in) ---
  // When authMode === 'external' the app behaves as a resource server that
  // validates a central JWT (blueprint-auth) and checks a module entitlement.
  // Default 'internal' keeps the existing self-contained behavior unchanged.
  authMode: AuthMode;
  authJwtSecret?: string;
  authBaseUrl?: string;
  moduleKey: string;
  // --- Embed SSO (optional, opt-in) ---
  // Shared secret a third-party backend presents (header x-embed-token) to
  // POST /api/embed/session to mint a session for one of its own logged-in
  // users. Independent of AUTH_MODE — works the same whether this app runs
  // internal or external auth for its own browser-based login.
  embedSharedSecret?: string;
}

const authMode: AuthMode = process.env.AUTH_MODE === 'external' ? 'external' : 'internal';

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
  authMode,
  authJwtSecret: process.env.AUTH_JWT_SECRET,
  authBaseUrl: process.env.AUTH_BASE_URL,
  moduleKey: process.env.MODULE_KEY || 'chat',
  embedSharedSecret: process.env.EMBED_SHARED_SECRET,
};

// Validation
// In internal mode the local JWT secret signs the tokens, so it is required.
// In external mode tokens are issued/validated by blueprint-auth instead.
if (config.authMode === 'internal' && !config.jwtSecret) {
  throw new Error('JWT_SECRET is required when AUTH_MODE=internal');
}

if (config.authMode === 'external') {
  if (!config.authJwtSecret) {
    throw new Error('AUTH_JWT_SECRET is required when AUTH_MODE=external');
  }
  if (!config.authBaseUrl) {
    throw new Error('AUTH_BASE_URL is required when AUTH_MODE=external');
  }
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
