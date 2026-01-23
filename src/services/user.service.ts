import prisma from '@config/database';
import bcrypt from 'bcryptjs';
import { CreateUserDto, UpdateUserDto, UpdateUsernameDto, ChangePasswordDto } from '@dto/user.dto';

export interface UserData {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  theme: string;
  licenseExpiresAt: Date | null;
  createdAt: Date;
}

export class UserService {
  async getUserById(id: number): Promise<UserData | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isActive: true,
        theme: true,
        licenseExpiresAt: true,
        createdAt: true,
      },
    });

    return user;
  }

  async getAllUsers(): Promise<UserData[]> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isActive: true,
        theme: true,
        licenseExpiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  async createUser(dto: CreateUserDto): Promise<UserData> {
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
        licenseExpiresAt: dto.licenseExpiresAt,
        isAdmin: dto.isAdmin ?? false,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isActive: true,
        theme: true,
        licenseExpiresAt: true,
        createdAt: true,
      },
    });

    return user;
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<UserData> {
    // Validate DTO
    const errors = dto.validate();
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new Error('Usuário não encontrado');
    }

    // Prepare update data
    const updateData: any = {
      username: dto.username,
      email: dto.email,
      licenseExpiresAt: dto.licenseExpiresAt,
      isAdmin: dto.isAdmin,
      isActive: dto.isActive,
    };

    // Hash password if provided
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isActive: true,
        theme: true,
        licenseExpiresAt: true,
        createdAt: true,
      },
    });

    return user;
  }

  async updateUsername(id: number, dto: UpdateUsernameDto): Promise<UserData> {
    // Validate DTO
    const errors = dto.validate();
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Check if username is already taken
    const existingUser = await prisma.user.findFirst({
      where: {
        username: dto.username.trim(),
        NOT: { id },
      },
    });

    if (existingUser) {
      throw new Error('Nome já está em uso');
    }

    // Update username
    const user = await prisma.user.update({
      where: { id },
      data: { 
        username: dto.username.trim(),
        ...(dto.theme && { theme: dto.theme })
      },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isActive: true,
        theme: true,
        licenseExpiresAt: true,
        createdAt: true,
      },
    });

    return user;
  }

  async changePassword(id: number, dto: ChangePasswordDto): Promise<void> {
    // Validate DTO
    const errors = dto.validate();
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Senha atual incorreta');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async deleteUser(id: number): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async isUserActive(id: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { isActive: true },
    });

    return user?.isActive ?? false;
  }

  async isUserAdmin(id: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { isAdmin: true },
    });

    return user?.isAdmin ?? false;
  }
}
