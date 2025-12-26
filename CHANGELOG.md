# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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