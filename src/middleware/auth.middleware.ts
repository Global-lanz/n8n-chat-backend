import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '@config/index';
import { AuthService } from '@services/auth.service';
import { UserService } from '@services/user.service';
import { ExternalAuthService } from '@services/external-auth.service';

const authService = new AuthService();
const userService = new UserService();
const externalAuthService = new ExternalAuthService();

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    isAdmin: boolean;
    isActive: boolean;
  };
  userId?: number;
}

/** Loads the local user for an embed-SSO token's userId claim, in the shape resolveUser returns. */
const loadEmbedUser = async (userId: number): Promise<{ user: AuthRequest['user']; forbidden?: boolean } | null> => {
  const user = await userService.getUserById(userId);
  if (!user) return null;
  if (!user.isActive) return { user: undefined, forbidden: true };
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    },
  };
};

/**
 * Resolves the authenticated local user from the request.
 * - internal mode: verifies the local token and loads the local user (unchanged).
 * - external mode: verifies the central JWT, enforces the module entitlement,
 *   and JIT-mirrors the user locally.
 * Either mode also accepts an embed-SSO token (POST /api/embed/session) —
 * those are always signed with the local JWT_SECRET regardless of AUTH_MODE,
 * so a deployment can serve its own module's central SSO (e.g. guia's
 * blueprint-auth integration) and third-party embed-SSO side by side. Tried
 * first since it's a cheap local verify with no network call.
 * Returns null when authentication fails; throws nothing.
 */
const resolveUser = async (
  req: AuthRequest,
): Promise<{ user: AuthRequest['user']; forbidden?: boolean } | null> => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: number; embed?: boolean };
    if (decoded.embed) {
      return await loadEmbedUser(decoded.userId);
    }
  } catch {
    // Not a local/embed token (wrong secret, expired, malformed) — fall
    // through to whichever verification AUTH_MODE actually configures.
  }

  if (config.authMode === 'external') {
    const claims = externalAuthService.verify(token);
    if (!externalAuthService.hasModuleEntitlement(claims)) {
      return { user: undefined, forbidden: true };
    }
    const local = await externalAuthService.upsertLocalUser(claims);
    if (!local.isActive) return { user: undefined, forbidden: true };
    return { user: local };
  }

  // internal mode (default)
  const decoded = await authService.verifyToken(token);
  return await loadEmbedUser(decoded.userId);
};

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resolved = await resolveUser(req);
    if (!resolved) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }
    if (resolved.forbidden || !resolved.user) {
      res.status(403).json({ error: 'Acesso negado.' });
      return;
    }

    req.user = resolved.user;
    req.userId = resolved.user.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Autenticação necessária' });
  }
};

export const adminMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resolved = await resolveUser(req);
    if (!resolved) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }
    if (resolved.forbidden || !resolved.user || !resolved.user.isAdmin) {
      res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      return;
    }

    req.user = resolved.user;
    req.userId = resolved.user.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Autenticação necessária' });
  }
};
