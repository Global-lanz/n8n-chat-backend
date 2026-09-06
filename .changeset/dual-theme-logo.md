---
"chat-n8n-backend": minor
---

`GET /api/config` agora também expõe `appLogoDark`, lida da nova chave de settings `app_logo_dark` — a logo usada quando o usuário está no tema escuro. A chave `app_logo` existente passa a ser especificamente a logo do tema claro; sem `app_logo_dark` definida, o frontend cai de volta pra `app_logo` nos dois temas, então nenhuma instalação existente perde a logo já configurada.
