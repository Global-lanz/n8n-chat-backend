---
"chat-n8n-backend": minor
---

Add optional external authentication mode (resource server). When `AUTH_MODE=external`, the backend validates a central JWT from blueprint-auth and enforces a module entitlement (`MODULE_KEY`, default `chat`) instead of using local login; `POST /api/login` proxies to the central service and the user is mirrored locally (JIT) via the new `auth_id` column. Default `AUTH_MODE=internal` keeps the existing self-contained behavior unchanged — no impact on current deployments.
