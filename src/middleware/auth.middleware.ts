import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@services/auth.service';
import { UserService } from '@services/user.service';

const authService = new AuthService();
const userService = new UserService();

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

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await authService.verifyToken(token);
    
    const user = await userService.getUserById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({ error: 'Conta desabilitada. Contate o administrador.' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    };
    req.userId = user.id;

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
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await authService.verifyToken(token);
    
    const user = await userService.getUserById(decoded.userId);
    if (!user || !user.isAdmin) {
      res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    };
    req.userId = user.id;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Autenticação necessária' });
  }
};
