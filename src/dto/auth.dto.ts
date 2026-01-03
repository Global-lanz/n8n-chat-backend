export class RegisterDto {
  username!: string;
  email!: string;
  password!: string;

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

export class LoginDto {
  email!: string;
  password!: string;

  validate(): string[] {
    const errors: string[] = [];

    if (!this.email || this.email.trim().length === 0) {
      errors.push('Email é obrigatório');
    }

    if (!this.password || this.password.trim().length === 0) {
      errors.push('Senha é obrigatória');
    }

    return errors;
  }
}
