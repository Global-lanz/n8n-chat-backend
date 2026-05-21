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
}
