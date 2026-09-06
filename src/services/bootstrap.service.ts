import bcrypt from 'bcryptjs';
import prisma from '@config/database';
import config from '@config/index';

export class BootstrapService {
  async ensureInitialAdmin(): Promise<void> {
    const adminCount = await prisma.user.count({
      where: { isAdmin: true },
    });

    if (adminCount > 0) {
      return;
    }

    const email = config.initialAdminEmail?.trim().toLowerCase();
    const password = config.initialAdminPassword;
    const requestedUsername = config.initialAdminUsername?.trim() || 'admin';

    if (!email || !password) {
      console.warn('⚠️ Nenhum admin encontrado. Defina INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD para criar o primeiro admin automaticamente.');
      return;
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isAdmin: true, isActive: true, username: true },
    });

    if (existingByEmail) {
      if (!existingByEmail.isAdmin || !existingByEmail.isActive) {
        await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            isAdmin: true,
            isActive: true,
            licenseExpiresAt: null,
          },
        });
      }

      console.log(`✅ Primeiro admin garantido a partir do usuário existente: ${email}`);
      return;
    }

    let username = requestedUsername;
    const usernameExists = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (usernameExists) {
      username = `${requestedUsername}_${Date.now()}`;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isAdmin: true,
        isActive: true,
        licenseExpiresAt: null,
      },
    });

    console.log(`✅ Primeiro admin criado automaticamente via Prisma: ${email}`);
  }

  async ensureDefaultSettings(): Promise<void> {
    const defaultSettings = [
      { key: 'default_bot_name', value: 'NorteIA', description: 'Nome padrão do bot' },
      { key: 'default_license_duration', value: '365', description: 'Duração padrão da licença em dias' },
      { key: 'system_color_palette', value: 'green', description: 'Paleta de cores do sistema' },
      { key: 'system_prompt', value: 'Você é um assistente virtual útil.', description: 'Prompt padrão enviado para a ferramenta de IA' },
      { key: 'chat_welcome_message', value: 'Envie uma mensagem para iniciar a conversa.', description: 'Mensagem inicial exibida antes da primeira mensagem do chat' },
      { key: 'chat_input_placeholder', value: 'Digite uma mensagem...', description: 'Texto de placeholder da caixa de mensagem' }
    ];

    for (const setting of defaultSettings) {
      const existing = await prisma.settings.findUnique({
        where: { key: setting.key }
      });
      if (!existing) {
        await prisma.settings.create({
          data: setting
        });
        console.log(`✅ Configuração padrão inicializada: ${setting.key}`);
      }
    }
  }
}

