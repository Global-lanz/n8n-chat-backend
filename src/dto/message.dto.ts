export class SendMessageDto {
  content!: string;

  validate(): string[] {
    const errors: string[] = [];

    if (!this.content || this.content.trim().length === 0) {
      errors.push('Conteúdo da mensagem é obrigatório');
    }

    return errors;
  }
}
