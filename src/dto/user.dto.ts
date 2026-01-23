export class CreateUserDto {
  username!: string;
  email!: string;
  password!: string;
  licenseExpiresAt?: Date | null;
  isAdmin?: boolean;
  isActive?: boolean;

  validate(): string[] {
    const errors: string[] = [];

    if (!this.username || this.username.trim().length === 0) {
      errors.push('Username é obrigatório');
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push('Email inválido');
    }

    if (!this.password || this.password.length < 6) {
      errors.push('Senha deve ter no mínimo 6 caracteres');
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export class UpdateUserDto {
  username?: string;
  email?: string;
  password?: string;
  licenseExpiresAt?: Date | null;
  isAdmin?: boolean;
  isActive?: boolean;

  validate(): string[] {
    const errors: string[] = [];

    if (this.email && !this.isValidEmail(this.email)) {
      errors.push('Email inválido');
    }

    if (this.password && this.password.length < 6) {
      errors.push('Senha deve ter no mínimo 6 caracteres');
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export class UpdateUsernameDto {
  username!: string;
  theme?: string;

  validate(): string[] {
    const errors: string[] = [];

    if (!this.username || this.username.trim().length === 0) {
      errors.push('Nome é obrigatório');
    }

    if (this.theme && !['dark', 'light'].includes(this.theme)) {
      errors.push('Tema deve ser "dark" ou "light"');
    }

    return errors;
  }
}

export class ChangePasswordDto {
  newPassword!: string;

  validate(): string[] {
    const errors: string[] = [];

    if (!this.newPassword || this.newPassword.length < 6) {
      errors.push('Nova senha deve ter no mínimo 6 caracteres');
    }

    return errors;
  }
}
