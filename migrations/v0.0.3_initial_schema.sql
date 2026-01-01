-- ============================================
-- MIGRATION: v0.0.3 - Schema Inicial
-- Data: 2025-01-01
-- Descrição: Criação das tabelas básicas do sistema
-- ============================================

-- ============================================
-- 1. CRIAR TABELA USERS (versão inicial)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CRIAR TABELA MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'bot')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. CRIAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- ============================================
-- VERIFICAÇÃO
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration v0.0.3 executada com sucesso!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tabelas criadas:';
  RAISE NOTICE '  - users (id, username, email, password, created_at)';
  RAISE NOTICE '  - messages (id, user_id, sender, content, timestamp)';
  RAISE NOTICE 'Índices criados:';
  RAISE NOTICE '  - idx_messages_user_id';
  RAISE NOTICE '  - idx_messages_timestamp';
  RAISE NOTICE '========================================';
END $$;
