---
"chat-n8n-backend": minor
---

`GET /api/config` agora também expõe `welcomeMessage` e `inputPlaceholder`, lidos das novas chaves de settings `chat_welcome_message` e `chat_input_placeholder` (com os textos atuais como valor padrão, seedadas em `ensureDefaultSettings`).

O valor padrão da coluna `theme` de `User` passa de `dark` para `light` (novos usuários), replicado também no fallback de provisionamento JIT do modo de autenticação externa — usuários existentes mantêm o tema que já tinham.
