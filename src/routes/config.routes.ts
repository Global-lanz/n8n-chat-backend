import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const router = Router();
const prisma = new PrismaClient();

interface VersionInfo {
  version: string;
  buildDate: string;
}

// Ler versão do backend (prioriza version.json, fallback para package.json)
let versionInfo: VersionInfo = {
  version: '1.0.0',
  buildDate: new Date().toISOString()
};

try {
  // Tenta ler version.json primeiro (build Docker/produção)
  const versionFilePath = join(__dirname, '../../version.json');
  
  if (existsSync(versionFilePath)) {
    const versionFile = JSON.parse(readFileSync(versionFilePath, 'utf-8'));
    versionInfo = {
      version: versionFile.version,
      buildDate: versionFile.buildDate || new Date().toISOString()
    };
    console.log(`✅ Versão carregada de version.json: v${versionInfo.version}`);
  } else {
    // Fallback para package.json (desenvolvimento)
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../../package.json'), 'utf-8')
    );
    versionInfo.version = packageJson.version;
    console.log(`✅ Versão carregada de package.json: v${versionInfo.version}`);
  }
} catch (error) {
  console.error('⚠️ Erro ao ler versão:', error);
}

// Get app configuration
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [botNameSetting, paletteSetting, logoSetting, logoDarkSetting, welcomeMessageSetting, inputPlaceholderSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'default_bot_name' } }),
      prisma.settings.findUnique({ where: { key: 'system_color_palette' } }),
      prisma.settings.findUnique({ where: { key: 'app_logo' } }),
      prisma.settings.findUnique({ where: { key: 'app_logo_dark' } }),
      prisma.settings.findUnique({ where: { key: 'chat_welcome_message' } }),
      prisma.settings.findUnique({ where: { key: 'chat_input_placeholder' } }),
    ]);

    const authMode = process.env.AUTH_MODE || 'internal';

    res.json({
      botName: botNameSetting?.value || process.env.BOT_NAME || 'NorteIA',
      systemPalette: paletteSetting?.value || 'green',
      appLogo: logoSetting?.value || null,
      appLogoDark: logoDarkSetting?.value || null,
      welcomeMessage: welcomeMessageSetting?.value || 'Envie uma mensagem para iniciar a conversa.',
      inputPlaceholder: inputPlaceholderSetting?.value || 'Digite uma mensagem...',
      version: versionInfo.version,
      buildDate: versionInfo.buildDate,
      environment: process.env.APP_ENVIRONMENT || process.env.NODE_ENV || 'development',
      authMode,
      authPortalUrl: authMode === 'external' ? (process.env.AUTH_PORTAL_URL || null) : null,
    });
  } catch (error) {
    const fallbackAuthMode = process.env.AUTH_MODE || 'internal';
    res.json({
      botName: process.env.BOT_NAME || 'Assistente de IA',
      systemPalette: 'green',
      welcomeMessage: 'Envie uma mensagem para iniciar a conversa.',
      inputPlaceholder: 'Digite uma mensagem...',
      version: versionInfo.version,
      buildDate: versionInfo.buildDate,
      environment: process.env.APP_ENVIRONMENT || process.env.NODE_ENV || 'development',
      authMode: fallbackAuthMode,
      authPortalUrl: fallbackAuthMode === 'external' ? (process.env.AUTH_PORTAL_URL || null) : null,
    });
  }
});

export default router;
