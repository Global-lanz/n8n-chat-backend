---
"chat-n8n-backend": minor
---

Add embed SSO: `POST /api/embed/session` lets a third-party backend mint a session for one of its own already-authenticated users (guarded by a shared secret, `EMBED_SHARED_SECRET`, header `x-embed-token`). JIT-provisions a local user keyed by the new `embed_external_id` column, falling back to matching by email — same pattern as the existing blueprint-auth external-mode JIT provisioning. Returns a normal internal-mode session token, so the existing `/auth/callback` route needs no changes to consume it. Independent of `AUTH_MODE`; when `EMBED_SHARED_SECRET` is unset the endpoint responds 500 and is effectively disabled.
