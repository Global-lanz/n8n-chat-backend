/**
 * Script auxiliar para gerar hash de senha para administradores
 * 
 * USO:
 * node generate-password-hash.js minhasenha123
 * 
 * O hash gerado pode ser usado diretamente no SQL para criar usuários
 */

const bcrypt = require('bcryptjs');

// Obter senha do argumento da linha de comando
const password = process.argv[2];

if (!password) {
  console.error('❌ Erro: Senha não fornecida');
  console.log('');
  console.log('📝 Uso:');
  console.log('  node generate-password-hash.js <senha>');
  console.log('');
  console.log('📋 Exemplo:');
  console.log('  node generate-password-hash.js minhasenha123');
  console.log('');
  process.exit(1);
}

// Gerar hash
const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log('');
console.log('✅ Hash gerado com sucesso!');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 HASH DA SENHA:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(hash);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('📝 Usar no SQL:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`INSERT INTO users (username, email, password, is_admin)`);
console.log(`VALUES (`);
console.log(`  'Admin',`);
console.log(`  'admin@exemplo.com',`);
console.log(`  '${hash}',`);
console.log(`  TRUE`);
console.log(`);`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('⚠️  IMPORTANTE:');
console.log('  - Não compartilhe este hash publicamente');
console.log('  - Substitua admin@exemplo.com pelo email real');
console.log('  - Guarde a senha original em local seguro');
console.log('');

// Verificar se o hash funciona
const isValid = bcrypt.compareSync(password, hash);
console.log(`🔐 Verificação: ${isValid ? '✅ Hash válido' : '❌ Erro no hash'}`);
console.log('');
