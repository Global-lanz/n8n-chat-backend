# 🗄️ Sistema de Migrations

## 📋 Visão Geral

Este projeto usa um sistema de migrations versionadas para gerenciar mudanças no banco de dados de forma segura e rastreável.

## 📁 Estrutura

```
backend/
├── migrations/                    # Pasta com todas as migrations
│   ├── v0.0.3_initial_schema.sql # Schema inicial
│   └── v0.1.0_admin_system.sql   # Sistema de administração
├── run-migrations.js              # Script para executar migrations
└── server.js                      # Apenas verifica estrutura básica
```

## 🔄 Como Funciona

### 1️⃣ **server.js - Verificação Automática**
```javascript
// Executa TODA VEZ que o servidor inicia
initDatabase() {
  - Cria tabelas se não existirem
  - Adiciona colunas faltantes (auto-migration)
  - NÃO apaga dados
  - Idempotente (seguro executar múltiplas vezes)
}
```

**Responsabilidade:**
- ✅ Garantir que estrutura mínima existe
- ✅ Auto-migration de colunas simples
- ❌ NÃO faz mudanças complexas
- ❌ NÃO substitui migrations completas

### 2️⃣ **Migrations - Mudanças Versionadas**
```sql
-- Cada migration é um arquivo SQL independente
-- Executado UMA VEZ por versão
-- Registrado na tabela 'migrations'
-- Idempotente (pode executar múltiplas vezes)
```

**Responsabilidade:**
- ✅ Mudanças de schema complexas
- ✅ Criação de views e funções
- ✅ Migração de dados
- ✅ Índices e otimizações

## 🚀 Uso

### Ver Status das Migrations
```bash
node run-migrations.js --status
```

**Output:**
```
📊 Status das Migrations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Versão      | Status    | Descrição
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.0.3      | ✅ Aplicada | Schema inicial
v0.1.0      | ⏳ Pendente | Sistema de administração
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Executar Todas as Migrations Pendentes
```bash
node run-migrations.js
```

**Output:**
```
🔍 Verificando migrations pendentes...

📊 Status das migrations:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ v0.0.3      - Schema inicial (aplicada)
⏳ v0.1.0      - Sistema de administração (pendente)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ Executando 1 migration(s) pendente(s)...

📄 Executando migration: v0.1.0 - Sistema de administração
   Arquivo: v0.1.0_admin_system.sql
✅ Migration v0.1.0 aplicada com sucesso!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 1 migration(s) aplicada(s) com sucesso
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Executar Migration Específica
```bash
node run-migrations.js v0.1.0
```

## 📊 Histórico de Migrations

### v0.0.3 - Schema Inicial
**Data:** 2025-01-01  
**Arquivo:** `v0.0.3_initial_schema.sql`

**Mudanças:**
- ✅ Tabela `users` (sem is_admin, sem license_expires_at)
- ✅ Tabela `messages`
- ✅ Índices básicos

**Estrutura users v0.0.3:**
```sql
users (
  id,
  username,
  email,
  password,
  created_at
)
```

---

### v0.1.0 - Sistema de Administração
**Data:** 2025-12-26  
**Arquivo:** `v0.1.0_admin_system.sql`

**Mudanças:**
- ✅ Coluna `is_admin` em users
- ✅ Coluna `license_expires_at` em users
- ✅ Índices de performance
- ✅ Funções `is_license_expired()` e `get_license_days_remaining()`
- ✅ Views `v_users_admin` e `v_stats_dashboard`
- ✅ Tabela `user_audit_log`

**Estrutura users v0.1.0:**
```sql
users (
  id,
  username,
  email,
  password,
  is_admin,              -- ✨ NOVO
  license_expires_at,    -- ✨ NOVO
  created_at
)
```

## 🎯 Fluxo de Atualização

### Cenário 1: Instalação Nova (Banco Vazio)
```bash
# Opção A: Usar migrations (recomendado)
node run-migrations.js

# Opção B: Deixar server.js criar estrutura básica
npm start  # Auto-cria tabelas com estrutura completa
```

### Cenário 2: Atualização v0.0.3 → v0.1.0
```bash
# Já tem dados de produção
# Método 1: Migration automática via server.js
npm start  # Auto-adiciona colunas novas

# Método 2: Migration manual (mais controle)
node run-migrations.js v0.1.0

# Método 3: SQL direto
psql -d chat_n8n -f migrations/v0.1.0_admin_system.sql
```

### Cenário 3: Verificar Status
```bash
node run-migrations.js --status
```

## 🔒 Segurança

### Todas as migrations são IDEMPOTENTES

✅ **Pode executar múltiplas vezes sem problemas**

```sql
-- Exemplo de idempotência
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
```

Isso significa:
- ✅ Primeira execução: Adiciona coluna
- ✅ Segunda execução: Não faz nada
- ✅ Terceira execução: Não faz nada
- ✅ **DADOS SEMPRE PRESERVADOS**

## 📝 Criar Nova Migration

### 1. Criar arquivo
```bash
touch backend/migrations/v0.2.0_feature_name.sql
```

### 2. Estrutura do arquivo
```sql
-- ============================================
-- MIGRATION: v0.2.0 - Nome da Feature
-- Data: YYYY-MM-DD
-- Descrição: O que esta migration faz
-- Pré-requisito: v0.1.0
-- ============================================

-- Suas mudanças aqui (sempre idempotentes!)
DO $$ 
BEGIN
  -- Verificar antes de criar/alterar
  IF NOT EXISTS (...) THEN
    -- Sua mudança
  END IF;
END $$;

-- Verificação final
DO $$ 
BEGIN
  RAISE NOTICE 'Migration v0.2.0 executada com sucesso!';
END $$;
```

### 3. Registrar no run-migrations.js
```javascript
const MIGRATIONS = [
  { version: 'v0.0.3', file: 'v0.0.3_initial_schema.sql', description: 'Schema inicial' },
  { version: 'v0.1.0', file: 'v0.1.0_admin_system.sql', description: 'Sistema de administração' },
  { version: 'v0.2.0', file: 'v0.2.0_feature_name.sql', description: 'Nova feature' }, // ← ADICIONAR
];
```

### 4. Executar
```bash
node run-migrations.js v0.2.0
```

## 🧪 Testar Migrations

### Ambiente de Testes
```bash
# 1. Criar banco de testes
createdb chat_n8n_test

# 2. Configurar .env.test
DATABASE_URL=postgresql://postgres:senha@localhost:5432/chat_n8n_test

# 3. Executar migrations
DATABASE_URL=$DATABASE_URL_TEST node run-migrations.js

# 4. Verificar
DATABASE_URL=$DATABASE_URL_TEST node run-migrations.js --status
```

## ⚠️ Importante

### ✅ FAÇA
- Use migrations para mudanças complexas
- Sempre torne migrations idempotentes
- Teste em ambiente de desenvolvimento primeiro
- Faça backup antes de migrations em produção
- Documente cada migration

### ❌ NÃO FAÇA
- Modificar migrations já aplicadas em produção
- Deletar arquivos de migration
- Executar SQL direto sem migration
- Esquecer de testar rollback (quando aplicável)

## 🆘 Troubleshooting

### Migration falhou no meio
```bash
# Verificar qual migration falhou
node run-migrations.js --status

# Corrigir o SQL e executar novamente
node run-migrations.js v0.x.x
```

### Tabela migrations não existe
```bash
# O script cria automaticamente, mas se necessário:
psql -d chat_n8n -c "
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"
```

### Marcar migration como aplicada manualmente
```bash
psql -d chat_n8n -c "
INSERT INTO migrations (version, description) 
VALUES ('v0.1.0', 'Sistema de administração')
ON CONFLICT (version) DO NOTHING;
"
```

## 📚 Referências

- [Migrations no PostgreSQL](https://www.postgresql.org/docs/current/ddl-schemas.html)
- [Boas práticas de migrations](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)
- [Idempotência em SQL](https://en.wikipedia.org/wiki/Idempotence)

## 🎯 Vantagens deste Sistema

✅ **Rastreabilidade:** Cada mudança é versionada  
✅ **Segurança:** Idempotente, não perde dados  
✅ **Controle:** Sabe exatamente o que foi aplicado  
✅ **Rollback:** Fácil reverter (quando necessário)  
✅ **Documentação:** Histórico completo de mudanças  
✅ **CI/CD:** Pode automatizar no deploy  

---

**Versão Atual:** v0.1.0  
**Última Atualização:** 26/12/2025
