#!/usr/bin/env node
/**
 * Script para executar migrations do banco de dados
 * 
 * Uso:
 *   node run-migrations.js              # Executa todas as migrations pendentes
 *   node run-migrations.js v0.1.0       # Executa migration específica
 *   node run-migrations.js --rollback   # Rollback última migration (em desenvolvimento)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Lista de migrations disponíveis (em ordem)
const MIGRATIONS = [
  { version: 'v0.0.3', file: 'v0.0.3_initial_schema.sql', description: 'Schema inicial' },
  { version: 'v0.1.0', file: 'v0.1.0_admin_system.sql', description: 'Sistema de administração' },
];

// Criar tabela de controle de migrations
async function createMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Verificar quais migrations já foram aplicadas
async function getAppliedMigrations() {
  const result = await pool.query('SELECT version FROM migrations ORDER BY applied_at');
  return result.rows.map(row => row.version);
}

// Executar uma migration
async function runMigration(migration) {
  const filePath = path.join(__dirname, 'migrations', migration.file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    return false;
  }

  console.log(`\n📄 Executando migration: ${migration.version} - ${migration.description}`);
  console.log(`   Arquivo: ${migration.file}`);

  const sql = fs.readFileSync(filePath, 'utf8');

  try {
    // Executar SQL
    await pool.query(sql);

    // Registrar migration como aplicada
    await pool.query(
      'INSERT INTO migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
      [migration.version, migration.description]
    );

    console.log(`✅ Migration ${migration.version} aplicada com sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao aplicar migration ${migration.version}:`, error.message);
    return false;
  }
}

// Executar todas as migrations pendentes
async function runPendingMigrations() {
  console.log('🔍 Verificando migrations pendentes...\n');

  await createMigrationsTable();
  const appliedMigrations = await getAppliedMigrations();

  console.log('📊 Status das migrations:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let pendingCount = 0;
  let successCount = 0;

  for (const migration of MIGRATIONS) {
    const isApplied = appliedMigrations.includes(migration.version);
    
    if (isApplied) {
      console.log(`✓ ${migration.version.padEnd(10)} - ${migration.description} (aplicada)`);
    } else {
      console.log(`⏳ ${migration.version.padEnd(10)} - ${migration.description} (pendente)`);
      pendingCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (pendingCount === 0) {
    console.log('\n✅ Todas as migrations estão atualizadas!');
    return;
  }

  console.log(`\n⚡ Executando ${pendingCount} migration(s) pendente(s)...\n`);

  for (const migration of MIGRATIONS) {
    const isApplied = appliedMigrations.includes(migration.version);
    
    if (!isApplied) {
      const success = await runMigration(migration);
      if (success) {
        successCount++;
      } else {
        console.error('\n❌ Parando execução devido a erro na migration');
        break;
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ ${successCount} migration(s) aplicada(s) com sucesso`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Executar migration específica
async function runSpecificMigration(version) {
  await createMigrationsTable();
  
  const migration = MIGRATIONS.find(m => m.version === version);
  
  if (!migration) {
    console.error(`❌ Migration ${version} não encontrada`);
    console.log('\nMigrations disponíveis:');
    MIGRATIONS.forEach(m => console.log(`  - ${m.version}: ${m.description}`));
    return;
  }

  await runMigration(migration);
}

// Exibir status das migrations
async function showStatus() {
  await createMigrationsTable();
  const appliedMigrations = await getAppliedMigrations();

  console.log('\n📊 Status das Migrations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Versão      | Status    | Descrição');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const migration of MIGRATIONS) {
    const isApplied = appliedMigrations.includes(migration.version);
    const status = isApplied ? '✅ Aplicada' : '⏳ Pendente';
    console.log(`${migration.version.padEnd(12)}| ${status.padEnd(10)}| ${migration.description}`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Main
async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
📚 Sistema de Migrations

Uso:
  node run-migrations.js              Executar todas as migrations pendentes
  node run-migrations.js v0.1.0       Executar migration específica
  node run-migrations.js --status     Mostrar status das migrations
  node run-migrations.js --help       Mostrar esta ajuda

Migrations disponíveis:
${MIGRATIONS.map(m => `  - ${m.version}: ${m.description}`).join('\n')}
      `);
      process.exit(0);
    }

    if (args.includes('--status')) {
      await showStatus();
    } else if (args.length === 0) {
      await runPendingMigrations();
    } else {
      await runSpecificMigration(args[0]);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
