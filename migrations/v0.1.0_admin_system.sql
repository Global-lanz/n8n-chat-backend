-- ============================================
-- MIGRATION: v0.1.0 - Sistema de Administração
-- Data: 2025-12-26
-- Descrição: Adiciona controle de licenças e administração
-- Pré-requisito: v0.0.3 deve estar aplicada
-- ============================================

-- ============================================
-- 1. ADICIONAR COLUNAS À TABELA USERS
-- ============================================

-- Adicionar is_admin (com idempotência)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Coluna is_admin adicionada';
  ELSE
    RAISE NOTICE '✓ Coluna is_admin já existe';
  END IF;
END $$;

-- Adicionar license_expires_at (com idempotência)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'license_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN license_expires_at TIMESTAMP;
    RAISE NOTICE '✅ Coluna license_expires_at adicionada';
  ELSE
    RAISE NOTICE '✓ Coluna license_expires_at já existe';
  END IF;
END $$;

-- ============================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_license_expires ON users(license_expires_at);

-- ============================================
-- 3. CRIAR FUNÇÕES AUXILIARES
-- ============================================

-- Função para verificar se a licença está expirada
CREATE OR REPLACE FUNCTION is_license_expired(user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  expires_at TIMESTAMP;
BEGIN
  SELECT license_expires_at INTO expires_at
  FROM users
  WHERE id = user_id;
  
  IF expires_at IS NULL THEN
    RETURN FALSE; -- Sem limite de licença
  END IF;
  
  RETURN expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Função para obter dias restantes de licença
CREATE OR REPLACE FUNCTION get_license_days_remaining(user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  expires_at TIMESTAMP;
  days_remaining INTEGER;
BEGIN
  SELECT license_expires_at INTO expires_at
  FROM users
  WHERE id = user_id;
  
  IF expires_at IS NULL THEN
    RETURN NULL; -- Sem limite
  END IF;
  
  days_remaining := EXTRACT(DAY FROM (expires_at - NOW()));
  RETURN days_remaining;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CRIAR VIEWS ADMINISTRATIVAS
-- ============================================

-- View com informações completas dos usuários
CREATE OR REPLACE VIEW v_users_admin AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.is_admin,
  u.license_expires_at,
  u.created_at,
  CASE 
    WHEN u.license_expires_at IS NULL THEN 'Sem limite'
    WHEN u.license_expires_at < NOW() THEN 'Expirada'
    WHEN u.license_expires_at < NOW() + INTERVAL '7 days' THEN 'Expira em breve'
    ELSE 'Ativa'
  END as license_status,
  CASE 
    WHEN u.license_expires_at IS NOT NULL THEN 
      EXTRACT(DAY FROM (u.license_expires_at - NOW()))
    ELSE NULL
  END as days_remaining,
  (SELECT COUNT(*) FROM messages WHERE user_id = u.id) as total_messages
FROM users u
ORDER BY u.created_at DESC;

-- View com estatísticas gerais
CREATE OR REPLACE VIEW v_stats_dashboard AS
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE is_admin = TRUE) as total_admins,
  (SELECT COUNT(*) FROM users WHERE license_expires_at IS NOT NULL AND license_expires_at < NOW()) as expired_licenses,
  (SELECT COUNT(*) FROM users WHERE license_expires_at IS NOT NULL AND license_expires_at > NOW()) as active_licenses,
  (SELECT COUNT(*) FROM users WHERE license_expires_at IS NULL) as unlimited_licenses,
  (SELECT COUNT(*) FROM messages) as total_messages,
  (SELECT COUNT(DISTINCT user_id) FROM messages WHERE timestamp > NOW() - INTERVAL '24 hours') as active_users_today;

-- ============================================
-- 5. CRIAR TABELA DE AUDITORIA (OPCIONAL)
-- ============================================

CREATE TABLE IF NOT EXISTS user_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR(50) NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by INTEGER,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

DO $$ 
DECLARE
  users_count INTEGER;
  has_is_admin BOOLEAN;
  has_license BOOLEAN;
BEGIN
  -- Verificar se colunas existem
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) INTO has_is_admin;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'license_expires_at'
  ) INTO has_license;
  
  SELECT COUNT(*) INTO users_count FROM users;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration v0.1.0 executada com sucesso!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Verificação:';
  RAISE NOTICE '  ✓ Coluna is_admin: %', CASE WHEN has_is_admin THEN 'OK' ELSE 'ERRO' END;
  RAISE NOTICE '  ✓ Coluna license_expires_at: %', CASE WHEN has_license THEN 'OK' ELSE 'ERRO' END;
  RAISE NOTICE '  ✓ Usuários existentes preservados: %', users_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Novos recursos:';
  RAISE NOTICE '  - Sistema de administração';
  RAISE NOTICE '  - Controle de licenças';
  RAISE NOTICE '  - Webhook Hotmart';
  RAISE NOTICE '  - Views administrativas';
  RAISE NOTICE '  - Funções auxiliares';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '  1. Criar primeiro administrador';
  RAISE NOTICE '  2. Configurar N8N_EMAIL_WEBHOOK_URL';
  RAISE NOTICE '  3. Testar painel de administração';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
