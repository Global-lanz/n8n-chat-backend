import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@config/database';
import config from '@config/index';
import { RegisterDto, LoginDto } from '@dto/auth.dto';

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    isAdmin: boolean;
    isActive: boolean;
    licenseExpiresAt: Date | null;
  };
}

export class AuthService {
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Validate DTO
    const errors = dto.validate();
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { username: dto.username },
        ],
      },
    });

    if (existingUser) {
      throw new Error('Usuário ou email já existe');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
      },
    });

    // Generate token
    const token = jwt.sign({ userId: user.id }, config.jwtSecret);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        licenseExpiresAt: user.licenseExpiresAt,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Validate DTO
    const errors = dto.validate();
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    // Check license expiration
    if (user.licenseExpiresAt) {
      const now = new Date();
      if (now > user.licenseExpiresAt) {
        throw new Error('Sua licença expirou. Entre em contato com o suporte.');
      }
    }

    // Verify password
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new Error('Credenciais inválidas');
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, config.jwtSecret);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        licenseExpiresAt: user.licenseExpiresAt,
      },
    };
  }

  async verifyToken(token: string): Promise<{ userId: number }> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: number };
      return decoded;
    } catch (error) {
      throw new Error('Token inválido');
    }
  }
}
