import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@config/database';
import config from '@config/index';

/**
 * External (resource-server) authentication against the central blueprint-auth
 * service. Only used when AUTH_MODE=external. Generic: the central provider is
 * configured purely via env (AUTH_JWT_SECRET, AUTH_BASE_URL, MODULE_KEY) — no
 * product is hardcoded.
 */

export interface CentralClaims {
  sub: string;
  email: string;
  name: string;
  isAdmin?: boolean;
  entitlements: string[];
}

export interface LocalUser {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
}

export class ExternalAuthService {
  /** Verifies the central JWT signature/expiry and returns its claims. */
  verify(token: string): CentralClaims {
    const payload = jwt.verify(token, config.authJwtSecret as string) as any;
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      isAdmin: Boolean(payload.isAdmin),
      entitlements: Array.isArray(payload.entitlements) ? payload.entitlements : [],
    };
  }

  /** True when the token grants access to this app's module. */
  hasModuleEntitlement(claims: CentralClaims): boolean {
    return claims.entitlements.includes(config.moduleKey);
  }

  /**
   * Mirrors the central identity into the local users table (JIT provisioning),
   * keyed by authId. Falls back to matching an existing local user by email
   * (e.g. before the migration backfilled authId) to avoid duplicates.
   * Chat-specific preferences (username, theme) stay local.
   */
  async upsertLocalUser(claims: CentralClaims): Promise<LocalUser> {
    let user = await prisma.user.findUnique({ where: { authId: claims.sub } });

    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email: claims.email } });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { authId: claims.sub, isActive: true, isAdmin: claims.isAdmin ?? byEmail.isAdmin },
        });
      }
    }

    if (!user) {
      const placeholderPassword = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          authId: claims.sub,
          email: claims.email,
          username: await this.resolveUniqueUsername(claims.name || claims.email),
          password: placeholderPassword,
          isAdmin: claims.isAdmin ?? false,
          isActive: true,
        },
      });
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    };
  }

  /** Proxies a credential login to the central service and returns its response. */
  async proxyLogin(email: string, password: string): Promise<any> {
    const fetchFn: any = (globalThis as any).fetch;
    const res = await fetchFn(`${config.authBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = (data as any)?.message || 'Credenciais inválidas';
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }
    return data;
  }

  /**
   * Full external login: authenticates against blueprint-auth, enforces this
   * app's module entitlement, mirrors the user locally and returns a response
   * shaped like the internal login ({ token, user }) so the frontend is agnostic
   * to the auth mode.
   */
  async loginAndMirror(email: string, password: string) {
    const data = await this.proxyLogin(email, password);
    const accessToken: string = data.accessToken;
    const claims = this.verify(accessToken);

    if (!this.hasModuleEntitlement(claims)) {
      throw new Error('Acesso negado: sua conta não possui licença para este módulo.');
    }

    const local = await this.upsertLocalUser(claims);
    const full = await prisma.user.findUnique({ where: { id: local.id } });

    return {
      token: accessToken,
      refreshToken: data.refreshToken,
      user: {
        id: local.id,
        username: local.username,
        email: local.email,
        isAdmin: local.isAdmin,
        isActive: local.isActive,
        theme: full?.theme ?? 'light',
        licenseExpiresAt: null,
      },
      entitlements: claims.entitlements,
    };
  }

  private async resolveUniqueUsername(base: string): Promise<string> {
    const candidate = base.trim() || 'user';
    const clash = await prisma.user.findUnique({ where: { username: candidate } });
    if (!clash) return candidate;
    // Append a short random suffix to satisfy the unique constraint.
    return `${candidate}-${randomBytes(3).toString('hex')}`;
  }
}
