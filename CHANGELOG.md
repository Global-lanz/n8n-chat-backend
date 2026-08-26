# Changelog

## 1.5.0

### Minor Changes

- 388885d: Add embed SSO: `POST /api/embed/session` lets a third-party backend mint a session for one of its own already-authenticated users (guarded by a shared secret, `EMBED_SHARED_SECRET`, header `x-embed-token`). JIT-provisions a local user keyed by the new `embed_external_id` column, falling back to matching by email — same pattern as the existing blueprint-auth external-mode JIT provisioning. Returns a normal internal-mode session token, so the existing `/auth/callback` route needs no changes to consume it. Independent of `AUTH_MODE`; when `EMBED_SHARED_SECRET` is unset the endpoint responds 500 and is effectively disabled.

## 1.4.0

### Minor Changes

- cb21e4d: Add optional external authentication mode (resource server). When `AUTH_MODE=external`, the backend validates a central JWT from blueprint-auth and enforces a module entitlement (`MODULE_KEY`, default `chat`) instead of using local login; `POST /api/login` proxies to the central service and the user is mirrored locally (JIT) via the new `auth_id` column. Default `AUTH_MODE=internal` keeps the existing self-contained behavior unchanged — no impact on current deployments.

## 1.3.0

### Minor Changes

- c0c3db0: Expõe o campo `appLogo` no endpoint público `/api/config`, lido da chave `app_logo` na tabela de settings. Permite que o frontend exiba a logo personalizada da aplicação sem autenticação.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-01

### 🚀 Major Refactoring: TypeScript + Clean Architecture

#### Added

- **TypeScript**: Full TypeScript implementation with strict mode
- **Prisma ORM**: Type-safe database access replacing direct PostgreSQL queries
- **Clean Architecture**:
  - Service layer for business logic
  - DTO validation for requests
  - Middleware for cross-cutting concerns
  - Dependency injection ready structure
- **Project Structure**:
  - `src/config/` - Configuration management
  - `src/dto/` - Data Transfer Objects with validation
  - `src/middleware/` - Auth and error handling
  - `src/routes/` - Route handlers
  - `src/services/` - Business logic layer
- **Best Practices**:
  - SOLID principles
  - Separation of concerns
  - Type safety throughout
  - Professional error handling
  - Path aliases for imports

#### Changed

- Migrated from JavaScript to TypeScript
- Replaced `pg` with Prisma ORM
- Refactored monolithic server.js into modular architecture
- Updated Dockerfile for multi-stage TypeScript build
- Enhanced package.json with TypeScript tooling
- Improved development workflow with hot reload

#### Maintained

- ✅ All API endpoints remain compatible
- ✅ Same request/response formats
- ✅ Same authentication mechanism
- ✅ Same database schema
- ✅ Same WebSocket events
- ✅ No frontend changes required

#### Technical Improvements

- Type-safe database queries
- Compile-time error checking
- Better IDE support and IntelliSense
- Easier testing and maintenance
- Professional codebase structure
- Industry-standard architecture

---

## [0.1.0] - 2025-12-26

### Added

- 🔐 Sistema completo de administração de usuários
- 👥 Painel de administração no frontend
- 📅 Sistema de controle de licenças com data de expiração
- 🔒 Bloqueio automático de login para licenças expiradas
- 🎯 Webhook para integração com Hotmart via N8N
- ✉️ Integração com N8N para envio de emails de boas-vindas
- 🛡️ Middleware de autenticação de administrador
- 📊 Interface de gerenciamento de usuários (criar, editar, deletar)
- 🔄 Renovação automática de licença via webhook
- 📧 Criação automática de usuários a partir de compras na Hotmart

### Changed

- 🗃️ Atualizada tabela `users` com campos `is_admin` e `license_expires_at`
- 🔐 Melhorado sistema de autenticação para incluir verificação de licença
- 📱 Atualizada interface do frontend com botão de admin
- 🎨 Melhorados estilos CSS com painel de administração responsivo

### API Endpoints Added

- `GET /api/admin/users` - Listar todos os usuários (Admin)
- `POST /api/admin/users` - Criar novo usuário (Admin)
- `PUT /api/admin/users/:id` - Atualizar usuário (Admin)
- `DELETE /api/admin/users/:id` - Deletar usuário (Admin)
- `POST /api/webhook/hotmart` - Webhook para receber compras da Hotmart

### Documentation

- 📚 Adicionado `ADMIN_GUIDE.md` com guia completo de administração
- 📖 Adicionado `N8N_INTEGRATION_GUIDE.md` com exemplos de workflows N8N
- 📝 Documentação de todos os endpoints da API

### Environment Variables Added

- `N8N_EMAIL_WEBHOOK_URL` - URL do webhook N8N para envio de emails

## [0.0.3]

### Added

- Initial release of chat backend with N8N integration
- User authentication and registration
- Message handling with WebSocket support
- Health check endpoint
- CORS configuration via environment variables
- new environment variable: ALLOWED_ORIGINS
- Endpoint to get current user information (/api/user/me)

### Changed

- Updated CORS to use ALLOWED_ORIGINS environment variable

### Fixed

- CORS issues for cross-origin requests
