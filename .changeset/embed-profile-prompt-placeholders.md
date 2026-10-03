---
"chat-n8n-backend": minor
---

Embed SSO: `POST /api/embed/session` agora aceita `pronomes` (opcional) e atualiza nome e pronomes do usuário a cada sessão. O backend substitui `{{NOME}}` e `{{PRONOMES}}` no system prompt antes de enviar ao N8N, valendo para todos os workflows (prompts sem esses marcadores não mudam).
