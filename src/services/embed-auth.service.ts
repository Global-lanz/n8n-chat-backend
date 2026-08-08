import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@config/database';
import config from '@config/index';

export interface EmbedIdentity {
  externalId: string;
  email: string;
  name: string;
}

export interface EmbedSessionResult {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export class EmbedAuthService {
  /**
   * Mints a session for a user already authenticated in a third-party app.
   * JIT-provisions (or reuses) a local user keyed by embedExternalId, then
   * signs the exact same token shape AuthService.login produces — no
   * expiresIn, matching every other internal-mode session. The frontend has
   * no token-refresh flow, so a short-lived token here would silently drop
   * the embedded widget back to the login screen mid-conversation, defeating
   * the point of this endpoint. The existing /auth/callback route consumes
   * it as-is; no frontend changes needed.
   */
  async mintSession(identity: EmbedIdentity): Promise<EmbedSessionResult> {
    const user = await this.upsertLocalUser(identity);
    const token = jwt.sign({ userId: user.id }, config.jwtSecret);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  private async upsertLocalUser(identity: EmbedIdentity) {
    let user = await prisma.user.findUnique({ where: { embedExternalId: identity.externalId } });

    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { embedExternalId: identity.externalId, isActive: true },
        });
      }
    }

    if (!user) {
      const placeholderPassword = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          embedExternalId: identity.externalId,
          email: identity.email,
          username: await this.resolveUniqueUsername(identity.name || identity.email),
          password: placeholderPassword,
          isAdmin: false,
          isActive: true,
        },
      });
    }

    if (!user.isActive) {
      throw new Error('Usuário inativo');
    }

    return user;
  }

  private async resolveUniqueUsername(base: string): Promise<string> {
    const candidate = base.trim() || 'user';
    const clash = await prisma.user.findUnique({ where: { username: candidate } });
    if (!clash) return candidate;
    // Append a short random suffix to satisfy the unique constraint.
    return `${candidate}-${randomBytes(3).toString('hex')}`;
  }
}
