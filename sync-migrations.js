#!/usr/bin/env node

/**
 * Script para Sincronizar Migrations
 * 
 * Este script verifica se as migrations foram aplicadas no banco,
 * mas não foram registradas na tabela migrations.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MIGRATIONS = [
  { version: 'v0.0.3', description: 'Schema inicial' },
  { version: 'v0.1.0', description: 'Sistema de administração' },
  { version: 'v0.2.0', description: 'Usuário admin padrão e status ativo' },
];

async function checkMigrationStatus() {
  try {
    console.log('🔍 Verificando status das migrations...\n');

    // Criar tabela de migrations se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Verificar quais migrations estão registradas
    const result = await pool.query('SELECT version, description, applied_at FROM migrations ORDER BY applied_at');
    const registeredMigrations = result.rows.map(row => row.version);

    console.log('📋 Migrations Registradas no Banco:');
    if (result.rows.length === 0) {
      console.log('   ❌ Nenhuma migration registrada\n');
    } else {
      result.rows.forEach(row => {
        console.log(`   ✅ ${row.version} - ${row.description}`);
        console.log(`      Aplicada em: ${row.applied_at}`);
      });
      console.log('');
    }

    // Verificar se as tabelas/colunas existem (indicando que migration foi executada)
    console.log('🔬 Verificando estrutura do banco...\n');

    // Verificar v0.0.3 - Tabelas users e messages
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'messages')
      ORDER BY table_name
    `);
    
    const hasUsersTable = tablesResult.rows.some(r => r.table_name === 'users');
    const hasMessagesTable = tablesResult.rows.some(r => r.table_name === 'messages');
    
    console.log(`v0.0.3 - Schema Inicial:`);
    console.log(`   ${hasUsersTable ? '✅' : '❌'} Tabela users`);
    console.log(`   ${hasMessagesTable ? '✅' : '❌'} Tabela messages`);
    
    if (hasUsersTable && hasMessagesTable && !registeredMigrations.includes('v0.0.3')) {
      console.log(`   ⚠️  ATENÇÃO: Tabelas existem mas migration NÃO está registrada`);
    }
    console.log('');

    // Verificar v0.1.0 - Colunas is_admin e license_expires_at
    if (hasUsersTable) {
      const columnsResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('is_admin', 'license_expires_at')
      `);
      
      const hasIsAdmin = columnsResult.rows.some(r => r.column_name === 'is_admin');
      const hasLicenseExpires = columnsResult.rows.some(r => r.column_name === 'license_expires_at');
      
      console.log(`v0.1.0 - Sistema de Administração:`);
      console.log(`   ${hasIsAdmin ? '✅' : '❌'} Coluna is_admin`);
      console.log(`   ${hasLicenseExpires ? '✅' : '❌'} Coluna license_expires_at`);
      
      if (hasIsAdmin && hasLicenseExpires && !registeredMigrations.includes('v0.1.0')) {
        console.log(`   ⚠️  ATENÇÃO: Colunas existem mas migration NÃO está registrada`);
      }
      console.log('');

      // Verificar v0.2.0 - Coluna is_active
      const isActiveResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_active'
      `);
      
      const hasIsActive = isActiveResult.rows.length > 0;
      
      console.log(`v0.2.0 - Usuário Admin e Status Ativo:`);
      console.log(`   ${hasIsActive ? '✅' : '❌'} Coluna is_active`);
      
      // Verificar se usuário admin existe
      const adminResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_admin = TRUE');
      const hasAdmin = adminResult.rows[0].count > 0;
      console.log(`   ${hasAdmin ? '✅' : '❌'} Usuário admin criado (${adminResult.rows[0].count} admins)`);
      
      if (hasIsActive && !registeredMigrations.includes('v0.2.0')) {
        console.log(`   ⚠️  ATENÇÃO: Coluna exists mas migration NÃO está registrada`);
      }
      console.log('');
    }

    // Sugestões de correção
    console.log('\n📝 Ações Sugeridas:\n');
    
    let needsSync = false;
    
    for (const migration of MIGRATIONS) {
      if (!registeredMigrations.includes(migration.version)) {
        let shouldRegister = false;
        
        if (migration.version === 'v0.0.3' && hasUsersTable && hasMessagesTable) {
          shouldRegister = true;
        } else if (migration.version === 'v0.1.0' && hasUsersTable) {
          const columnsResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('is_admin', 'license_expires_at')
          `);
          shouldRegister = columnsResult.rows.length >= 2;
        } else if (migration.version === 'v0.2.0' && hasUsersTable) {
          const isActiveResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'is_active'
          `);
          shouldRegister = isActiveResult.rows.length > 0;
        }
        
        if (shouldRegister) {
          console.log(`   ⚠️  Registrar ${migration.version} manualmente (estrutura já existe)`);
          needsSync = true;
        } else {
          console.log(`   📄 Executar migration ${migration.version} (estrutura não encontrada)`);
        }
      }
    }

    if (needsSync) {
      console.log('\n🔧 Para sincronizar, execute: node sync-migrations.js --fix\n');
    } else if (registeredMigrations.length === MIGRATIONS.length) {
      console.log('   ✅ Todas as migrations estão sincronizadas!\n');
    } else {
      console.log('   💡 Inicie o servidor (npm start) para aplicar migrations pendentes\n');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

async function fixMigrations() {
  try {
    console.log('🔧 Sincronizando migrations...\n');

    const result = await pool.query('SELECT version FROM migrations');
    const registeredMigrations = result.rows.map(row => row.version);

    // Verificar estrutura do banco
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'messages')
    `);
    
    const hasUsersTable = tablesResult.rows.some(r => r.table_name === 'users');
    const hasMessagesTable = tablesResult.rows.some(r => r.table_name === 'messages');

    // Registrar v0.0.3 se tabelas existem
    if (hasUsersTable && hasMessagesTable && !registeredMigrations.includes('v0.0.3')) {
      await pool.query(
        `INSERT INTO migrations (version, description, applied_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (version) DO NOTHING`,
        ['v0.0.3', 'Schema inicial']
      );
      console.log('✅ Migration v0.0.3 registrada');
    }

    // Registrar v0.1.0 se colunas existem
    if (hasUsersTable) {
      const columnsResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('is_admin', 'license_expires_at')
      `);
      
      if (columnsResult.rows.length >= 2 && !registeredMigrations.includes('v0.1.0')) {
        await pool.query(
          `INSERT INTO migrations (version, description, applied_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (version) DO NOTHING`,
          ['v0.1.0', 'Sistema de administração']
        );
        console.log('✅ Migration v0.1.0 registrada');
      }

      // Registrar v0.2.0 se coluna is_active existe
      const isActiveResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_active'
      `);
      
      if (isActiveResult.rows.length > 0 && !registeredMigrations.includes('v0.2.0')) {
        await pool.query(
          `INSERT INTO migrations (version, description, applied_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (version) DO NOTHING`,
          ['v0.2.0', 'Usuário admin padrão e status ativo']
        );
        console.log('✅ Migration v0.2.0 registrada');
      }
    }

    console.log('\n✅ Sincronização concluída!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

// Executar
const args = process.argv.slice(2);
if (args.includes('--fix')) {
  fixMigrations();
} else {
  checkMigrationStatus();
}
