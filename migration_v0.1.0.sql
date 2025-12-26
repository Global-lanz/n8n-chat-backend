-- Migration Script: Adicionar funcionalidades de administração e controle de licenças
-- Versão: 0.1.0
-- Data: 2025-12-26

-- ============================================
-- 1. ADICIONAR COLUNAS À TABELA USERS
-- ============================================

-- Verificar se a coluna is_admin já existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Coluna is_admin adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna is_admin já existe';
    END IF;
END $$;

-- Verificar se a coluna license_expires_at já existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'license_expires_at'
    ) THEN
        ALTER TABLE users ADD COLUMN license_expires_at TIMESTAMP;
        RAISE NOTICE 'Coluna license_expires_at adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna license_expires_at já existe';
    END IF;
END $$;

-- ============================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para consultas de administradores
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Índice para consultas de licenças expiradas
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
-- 4. VIEWS ÚTEIS PARA ADMINISTRAÇÃO
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
-- 5. CRIAR PRIMEIRO ADMINISTRADOR (OPCIONAL)
-- ============================================

-- DESCOMENTE E AJUSTE AS LINHAS ABAIXO PARA CRIAR SEU PRIMEIRO ADMIN
-- Gere o hash da senha usando bcrypt com 10 rounds

/*
-- Exemplo: Criar usuário admin
INSERT INTO users (username, email, password, is_admin)
VALUES (
    'Administrador',
    'admin@exemplo.com',
    '$2a$10$YourBcryptHashHere', -- Substitua pelo hash real
    TRUE
)
ON CONFLICT (email) DO UPDATE 
SET is_admin = TRUE;
*/

-- OU atualizar um usuário existente para admin:
/*
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'seu-email@exemplo.com';
*/

-- ============================================
-- 6. TRIGGERS PARA AUDITORIA (OPCIONAL)
-- ============================================

-- Tabela de log de alterações de usuários
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

-- Função trigger para registrar mudanças
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log de mudança de admin
        IF OLD.is_admin != NEW.is_admin THEN
            INSERT INTO user_audit_log (user_id, action, field_changed, old_value, new_value)
            VALUES (NEW.id, 'UPDATE', 'is_admin', OLD.is_admin::TEXT, NEW.is_admin::TEXT);
        END IF;
        
        -- Log de mudança de licença
        IF OLD.license_expires_at IS DISTINCT FROM NEW.license_expires_at THEN
            INSERT INTO user_audit_log (user_id, action, field_changed, old_value, new_value)
            VALUES (NEW.id, 'UPDATE', 'license_expires_at', 
                    COALESCE(OLD.license_expires_at::TEXT, 'NULL'), 
                    COALESCE(NEW.license_expires_at::TEXT, 'NULL'));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO user_audit_log (user_id, action)
        VALUES (OLD.id, 'DELETE');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger (DESCOMENTE SE QUISER AUDITORIA)
/*
CREATE TRIGGER user_changes_trigger
AFTER UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION log_user_changes();
*/

-- ============================================
-- 7. CONSULTAS ÚTEIS PARA ADMINISTRAÇÃO
-- ============================================

-- Listar usuários com licença expirando em 7 dias
-- SELECT * FROM v_users_admin WHERE license_status = 'Expira em breve';

-- Listar todas as licenças expiradas
-- SELECT * FROM v_users_admin WHERE license_status = 'Expirada';

-- Estatísticas gerais
-- SELECT * FROM v_stats_dashboard;

-- Verificar se usuário específico tem licença expirada
-- SELECT is_license_expired(1); -- Substitua 1 pelo ID do usuário

-- Obter dias restantes de licença
-- SELECT get_license_days_remaining(1); -- Substitua 1 pelo ID do usuário

-- ============================================
-- 8. LIMPEZA E MANUTENÇÃO
-- ============================================

-- Função para deletar usuários com licença expirada há mais de X dias
CREATE OR REPLACE FUNCTION cleanup_expired_users(days_after_expiration INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM users
        WHERE license_expires_at < NOW() - (days_after_expiration || ' days')::INTERVAL
        AND is_admin = FALSE
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Executar limpeza (CUIDADO: Isso deleta usuários permanentemente!)
-- SELECT cleanup_expired_users(30); -- Deleta usuários expirados há mais de 30 dias

-- ============================================
-- 9. VERIFICAÇÃO FINAL
-- ============================================

-- Verificar estrutura da tabela users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Verificar índices criados
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;

-- ============================================
-- MIGRATION COMPLETA
-- ============================================

-- Exibir mensagem de sucesso
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration concluída com sucesso!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '1. Crie seu primeiro administrador';
    RAISE NOTICE '2. Configure as variáveis de ambiente';
    RAISE NOTICE '3. Reinicie o servidor backend';
    RAISE NOTICE '4. Acesse o painel admin';
    RAISE NOTICE '';
    RAISE NOTICE 'Versão: 0.1.0';
    RAISE NOTICE '========================================';
END $$;
