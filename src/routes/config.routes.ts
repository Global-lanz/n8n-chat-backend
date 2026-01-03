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

// Ler versão (prioriza version.json, fallback para package.json)
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
    // Buscar o nome do bot da tabela de settings
    const botNameSetting = await prisma.settings.findUnique({
      where: { key: 'default_bot_name' }
    });

    res.json({
      botName: botNameSetting?.value || process.env.BOT_NAME || 'NorteIA',
      version: versionInfo.version,
      buildDate: versionInfo.buildDate,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    // Fallback em caso de erro
    res.json({
      botName: process.env.BOT_NAME || 'Assistente de IA',
      version: versionInfo.version,
      buildDate: versionInfo.buildDate,
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

export default router;
