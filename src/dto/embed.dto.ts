export class EmbedSessionDto {
  externalId!: string;
  email!: string;
  name!: string;
  // Optional — only present when the person declared them in the host app.
  pronomes?: string;

  validate(): string[] {
    const errors: string[] = [];

    if (!this.externalId || this.externalId.trim().length === 0) {
      errors.push('externalId é obrigatório');
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push('Email inválido');
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push('name é obrigatório');
    }

    if (this.pronomes != null && typeof this.pronomes !== 'string') {
      errors.push('pronomes deve ser texto');
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
