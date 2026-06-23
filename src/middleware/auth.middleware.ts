import { Request, Response, NextFunction } from 'express';
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

/**
 * Resolves the authenticated local user from the request.
 * - internal mode: verifies the local token and loads the local user (unchanged).
 * - external mode: verifies the central JWT, enforces the module entitlement,
 *   and JIT-mirrors the user locally.
 * Returns null when authentication fails; throws nothing.
 */
const resolveUser = async (
  req: AuthRequest,
): Promise<{ user: AuthRequest['user']; forbidden?: boolean } | null> => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');

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
  const user = await userService.getUserById(decoded.userId);
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
