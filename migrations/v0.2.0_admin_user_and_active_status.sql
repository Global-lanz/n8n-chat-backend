-- ============================================
-- MIGRATION: v0.2.0 - Usuário Admin Padrão e Status Ativo
-- Data: 2025-12-29
-- Descrição: Adiciona coluna is_active e cria usuário admin padrão
-- Pré-requisito: v0.1.0 deve estar aplicada
-- ============================================

-- ============================================
-- 1. ADICIONAR COLUNA IS_ACTIVE
-- ============================================

-- Adicionar is_active (com idempotência)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    RAISE NOTICE '✅ Coluna is_active adicionada';
    
    -- Ativar todos os usuários existentes
    UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
    RAISE NOTICE '✅ Todos os usuários existentes ativados';
  ELSE
    RAISE NOTICE '✓ Coluna is_active já existe';
  END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ============================================
-- 2. ATUALIZAR VIEW DE ADMINISTRAÇÃO
-- ============================================

-- View com informações completas dos usuários (incluindo is_active)
CREATE OR REPLACE VIEW v_users_admin AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.is_admin,
  u.is_active,
  u.license_expires_at,
  u.created_at,
  CASE 
    WHEN NOT u.is_active THEN 'Desabilitado'
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

-- Atualizar view de estatísticas
CREATE OR REPLACE VIEW v_stats_dashboard AS
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as active_users,
  (SELECT COUNT(*) FROM users WHERE is_active = FALSE) as disabled_users,
  (SELECT COUNT(*) FROM users WHERE is_admin = TRUE) as total_admins,
  (SELECT COUNT(*) FROM users WHERE license_expires_at IS NOT NULL AND license_expires_at < NOW()) as expired_licenses,
  (SELECT COUNT(*) FROM users WHERE license_expires_at IS NOT NULL AND license_expires_at > NOW()) as active_licenses,
  (SELECT COUNT(*) FROM users WHERE license_expires_at IS NULL) as unlimited_licenses,
  (SELECT COUNT(*) FROM messages) as total_messages,
  (SELECT COUNT(DISTINCT user_id) FROM messages WHERE timestamp > NOW() - INTERVAL '24 hours') as active_users_today;

-- ============================================
-- 3. ATUALIZAR FUNÇÃO DE VERIFICAÇÃO DE LICENÇA
-- ============================================

-- Função para verificar se a licença está expirada (incluindo is_active)
CREATE OR REPLACE FUNCTION is_license_expired(user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT is_active, license_expires_at INTO user_record
  FROM users
  WHERE id = user_id;
  
  -- Se usuário não está ativo, considerar como "expirado"
  IF NOT user_record.is_active THEN
    RETURN TRUE;
  END IF;
  
  -- Se não tem limite de licença
  IF user_record.license_expires_at IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN user_record.license_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CRIAR USUÁRIO ADMIN PADRÃO
-- ============================================

-- Criar usuário admin padrão se não existir
DO $$ 
DECLARE
  admin_exists BOOLEAN;
  admin_password_hash TEXT;
BEGIN
  -- Verificar se já existe algum admin
  SELECT EXISTS (
    SELECT 1 FROM users WHERE is_admin = TRUE
  ) INTO admin_exists;
  
  IF NOT admin_exists THEN
    -- Hash da senha: admin123 (DEVE SER ALTERADO EM PRODUÇÃO!)
    -- Gerado com bcrypt rounds=10
    admin_password_hash := '$2a$10$rZ7YvGE8M3kpJMYHJxKVH.Y2YQj3y5vMHPXs7dUH8qE0WqWYYKH/a';
    
    INSERT INTO users (username, email, password, is_admin, is_active, license_expires_at)
    VALUES (
      'admin',
      'admin@admin.com',
      admin_password_hash,
      TRUE,
      TRUE,
      NULL  -- Sem limite de licença para admin
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔐 USUÁRIO ADMIN CRIADO!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Credenciais padrão:';
    RAISE NOTICE '  Email: admin@admin.com';
    RAISE NOTICE '  Senha: admin123';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANTE: Altere a senha imediatamente!';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '✓ Já existe um usuário administrador';
  END IF;
END $$;

-- ============================================
-- 5. TRIGGER PARA AUDITORIA (OPCIONAL)
-- ============================================

-- Função para registrar alterações de usuários
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Registrar mudança de status ativo
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      INSERT INTO user_audit_log (user_id, action, field_changed, old_value, new_value)
      VALUES (NEW.id, 'UPDATE', 'is_active', OLD.is_active::TEXT, NEW.is_active::TEXT);
    END IF;
    
    -- Registrar mudança de licença
    IF OLD.license_expires_at IS DISTINCT FROM NEW.license_expires_at THEN
      INSERT INTO user_audit_log (user_id, action, field_changed, old_value, new_value)
      VALUES (NEW.id, 'UPDATE', 'license_expires_at', 
              COALESCE(OLD.license_expires_at::TEXT, 'NULL'), 
              COALESCE(NEW.license_expires_at::TEXT, 'NULL'));
    END IF;
    
    -- Registrar mudança de admin
    IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
      INSERT INTO user_audit_log (user_id, action, field_changed, old_value, new_value)
      VALUES (NEW.id, 'UPDATE', 'is_admin', OLD.is_admin::TEXT, NEW.is_admin::TEXT);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger (se não existir)
DROP TRIGGER IF EXISTS trigger_user_changes ON users;
CREATE TRIGGER trigger_user_changes
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_changes();

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

DO $$ 
DECLARE
  has_is_active BOOLEAN;
  admin_count INTEGER;
BEGIN
  -- Verificar se coluna is_active existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) INTO has_is_active;
  
  -- Contar admins
  SELECT COUNT(*) INTO admin_count FROM users WHERE is_admin = TRUE;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration v0.2.0 executada com sucesso!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Verificação:';
  RAISE NOTICE '  ✓ Coluna is_active: %', CASE WHEN has_is_active THEN 'OK' ELSE 'ERRO' END;
  RAISE NOTICE '  ✓ Administradores cadastrados: %', admin_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Novos recursos:';
  RAISE NOTICE '  - Status ativo/desabilitado para usuários';
  RAISE NOTICE '  - Validação de licença considera status ativo';
  RAISE NOTICE '  - Usuário admin padrão criado';
  RAISE NOTICE '  - Auditoria de mudanças de usuários';
  RAISE NOTICE '  - Views atualizadas';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
