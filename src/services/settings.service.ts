import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SettingsService {
  /**
   * Busca todas as configurações
   */
  static async getAllSettings(): Promise<Setting[]> {
    return prisma.settings.findMany({
      orderBy: { key: 'asc' }
    });
  }

  /**
   * Busca uma configuração específica por key
   */
  static async getSetting(key: string): Promise<Setting | null> {
    return prisma.settings.findUnique({
      where: { key }
    });
  }

  /**
   * Cria ou atualiza uma configuração
   */
  static async upsertSetting(
    key: string,
    value: string,
    description?: string
  ): Promise<Setting> {
    return prisma.settings.upsert({
      where: { key },
      update: {
        value,
        description: description || undefined,
        updatedAt: new Date()
      },
      create: {
        key,
        value,
        description: description || undefined
      }
    });
  }

  /**
   * Deleta uma configuração
   */
  static async deleteSetting(key: string): Promise<void> {
    await prisma.settings.delete({
      where: { key }
    });
  }

  /**
   * Busca o valor de uma configuração (retorna apenas o valor)
   */
  static async getSettingValue(key: string): Promise<string | null> {
    const setting = await this.getSetting(key);
    return setting?.value || null;
  }
}
