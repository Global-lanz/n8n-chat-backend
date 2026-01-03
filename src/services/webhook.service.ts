import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SettingsService } from './settings.service';

const prisma = new PrismaClient();

export interface WebhookCreateUserPayload {
  email: string;
  name: string;
  event: 'PURCHASE_COMPLETE' | 'PURCHASE_REFUNDED' | 'SUBSCRIPTION_CREATED';
}

export interface WebhookCreateUserResponse {
  message: string;
  userId?: number;
  email: string;
  licenseExpiresAt?: Date;
  temporaryPassword?: string;
}

export class WebhookService {
  /**
   * Processa criação/atualização de usuário via webhook
   */
  static async handleUserCreation(
    data: WebhookCreateUserPayload
  ): Promise<WebhookCreateUserResponse> {
    const { email, name, event } = data;

    // Validação básica
    if (!email || !name) {
      throw new Error('Email and name are required');
    }

    // Se for reembolso, desativa o usuário
    if (event === 'PURCHASE_REFUNDED') {
      return this.handleRefund(email);
    }

    // Verifica se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return this.handleExistingUser(existingUser, event);
    }

    // Cria novo usuário
    return this.createNewUser(email, name);
  }

  /**
   * Desativa usuário em caso de reembolso
   */
  private static async handleRefund(
    email: string
  ): Promise<WebhookCreateUserResponse> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return {
        message: 'User not found for refund',
        email
      };
    }

    await prisma.user.update({
      where: { email },
      data: { isActive: false }
    });

    return {
      message: 'User deactivated due to refund',
      userId: user.id,
      email
    };
  }

  /**
   * Reativa usuário existente ou apenas confirma
   */
  private static async handleExistingUser(
    user: any,
    _event: string
  ): Promise<WebhookCreateUserResponse> {
    // Se estava inativo, reativa
    if (!user.isActive) {
      // Busca duração da licença
      const licenseDays = await this.getLicenseDurationDays();
      const licenseExpiresAt = new Date();
      licenseExpiresAt.setDate(licenseExpiresAt.getDate() + licenseDays);

      await prisma.user.update({
        where: { email: user.email },
        data: {
          isActive: true,
          licenseExpiresAt
        }
      });

      return {
        message: 'User reactivated successfully',
        userId: user.id,
        email: user.email,
        licenseExpiresAt
      };
    }

    // Usuário já existe e está ativo, apenas renova licença
    const licenseDays = await this.getLicenseDurationDays();
    const licenseExpiresAt = new Date();
    licenseExpiresAt.setDate(licenseExpiresAt.getDate() + licenseDays);

    await prisma.user.update({
      where: { email: user.email },
      data: { licenseExpiresAt }
    });

    return {
      message: 'User license renewed',
      userId: user.id,
      email: user.email,
      licenseExpiresAt
    };
  }

  /**
   * Cria um novo usuário
   */
  private static async createNewUser(
    email: string,
    name: string
  ): Promise<WebhookCreateUserResponse> {
    // Busca duração da licença
    const licenseDays = await this.getLicenseDurationDays();
    const licenseExpiresAt = new Date();
    licenseExpiresAt.setDate(licenseExpiresAt.getDate() + licenseDays);

    // Gera senha temporária aleatória
    const temporaryPassword = this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Cria usuário
    const newUser = await prisma.user.create({
      data: {
        username: name,
        email,
        password: hashedPassword,
        isAdmin: false,
        isActive: true,
        licenseExpiresAt
      }
    });

    // TODO: Enviar email com credenciais
    // await EmailService.sendWelcomeEmail(email, temporaryPassword);

    return {
      message: 'User created successfully',
      userId: newUser.id,
      email: newUser.email,
      licenseExpiresAt,
      temporaryPassword // Retorna apenas para debug, remover em produção
    };
  }

  /**
   * Busca duração da licença em dias
   */
  private static async getLicenseDurationDays(): Promise<number> {
    const licenseSetting = await SettingsService.getSetting('default_license_duration');
    return licenseSetting ? parseInt(licenseSetting.value) : 365;
  }

  /**
   * Gera senha aleatória
   */
  private static generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
