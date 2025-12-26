const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');

const VERSION = require('./package.json').version;

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : ['http://localhost:3000', 'http://localhost:3001'];

const corsOptions = allowedOrigins.includes('*') ? { origin: '*', credentials: true } : { origin: allowedOrigins, credentials: true };

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: allowedOrigins.includes('*') ? { origin: '*' } : { origin: allowedOrigins }
});

app.use(cors(corsOptions));
app.use(express.json());

// Conectar ao PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Verificar e criar estrutura básica do banco de dados
// NOTA: Para adicionar novas funcionalidades, use migrations em /backend/migrations/
const initDatabase = async () => {
  try {
    // Criar tabela de controle de migrations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Verificar versão atual do banco
    const versionCheck = await pool.query(`
      SELECT version FROM migrations ORDER BY applied_at DESC LIMIT 1
    `);
    const currentVersion = versionCheck.rows[0]?.version || 'none';

    // Criar tabela users (estrutura completa para compatibilidade)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        license_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Auto-migration: Adicionar colunas faltantes (apenas se necessário)
    await pool.query(`
      DO $$ 
      BEGIN
        -- Adicionar is_admin se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'is_admin'
        ) THEN
          ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
          RAISE NOTICE '✅ Coluna is_admin adicionada automaticamente';
        END IF;
        
        -- Adicionar license_expires_at se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'license_expires_at'
        ) THEN
          ALTER TABLE users ADD COLUMN license_expires_at TIMESTAMP;
          RAISE NOTICE '✅ Coluna license_expires_at adicionada automaticamente';
        END IF;
      END $$;
    `);

    // Criar tabela messages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'bot')),
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar índices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
      CREATE INDEX IF NOT EXISTS idx_users_license_expires ON users(license_expires_at);
    `);

    console.log('✅ Banco de dados verificado e atualizado');
    console.log(`📊 Versão atual: ${currentVersion === 'none' ? 'Base instalada' : currentVersion}`);
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  }
};

initDatabase();

// Middleware de autenticação
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) throw new Error();
    
    req.user = result.rows[0];
    req.userId = result.rows[0].id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Autenticação necessária' });
  }
};

// Middleware de administrador
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    
    req.user = result.rows[0];
    req.userId = result.rows[0].id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Autenticação necessária' });
  }
};

// Rotas de autenticação
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Verificar se usuário já existe
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário ou email já existe' });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    
    res.status(201).json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email } 
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Buscar usuário
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const user = result.rows[0];
    
    // Verificar se a licença expirou
    if (user.license_expires_at) {
      const now = new Date();
      const expiresAt = new Date(user.license_expires_at);
      if (now > expiresAt) {
        return res.status(403).json({ error: 'Sua licença expirou. Entre em contato com o suporte.' });
      }
    }
    
    // Verificar senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        is_admin: user.is_admin || false,
        license_expires_at: user.license_expires_at 
      } 
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(400).json({ error: error.message });
  }
});

// Rotas de mensagens
app.get('/api/messages', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM messages WHERE user_id = $1 ORDER BY timestamp ASC LIMIT 100',
      [req.userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    // Salvar mensagem do usuário
    const userMessageResult = await pool.query(
      'INSERT INTO messages (user_id, sender, content) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, 'user', content]
    );
    
    const userMessage = userMessageResult.rows[0];
    
    // Emitir para o socket
    io.to(req.userId.toString()).emit('new_message', userMessage);
    
    // Enviar para N8N webhook
    try {
      const n8nResponse = await axios.post(process.env.N8N_WEBHOOK_URL, {
        userId: req.userId,
        username: req.user.username,
        message: content,
        timestamp: new Date()
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      // Salvar resposta do bot
      if (n8nResponse.data && n8nResponse.data.response) {
        const botMessageResult = await pool.query(
          'INSERT INTO messages (user_id, sender, content) VALUES ($1, $2, $3) RETURNING *',
          [req.userId, 'bot', n8nResponse.data.response]
        );
        
        const botMessage = botMessageResult.rows[0];
        
        // Emitir resposta do bot
        io.to(req.userId.toString()).emit('new_message', botMessage);
        
        res.json({ userMessage, botMessage });
      } else {
        res.json({ userMessage });
      }
    } catch (n8nError) {
      console.error('Erro ao chamar N8N:', n8nError);
      res.json({ userMessage, error: 'Erro ao processar resposta' });
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para N8N enviar respostas assíncronas
app.post('/api/webhook/response', async (req, res) => {
  try {
    const { userId, response } = req.body;
    
    const botMessageResult = await pool.query(
      'INSERT INTO messages (user_id, sender, content) VALUES ($1, $2, $3) RETURNING *',
      [userId, 'bot', response]
    );
    
    const botMessage = botMessageResult.rows[0];
    io.to(userId.toString()).emit('new_message', botMessage);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para obter informações do usuário atual
app.get('/api/user/me', auth, async (req, res) => {
  try {
    res.json({ 
      user: { 
        id: req.user.id, 
        username: req.user.username, 
        email: req.user.email,
        is_admin: req.user.is_admin || false,
        license_expires_at: req.user.license_expires_at 
      } 
    });
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para atualizar nome de usuário
app.put('/api/user/username', auth, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || username.trim().length === 0) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    // Verificar se o nome já existe para outro usuário
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username.trim(), req.userId]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Nome já está em uso' });
    }
    
    // Atualizar nome
    const result = await pool.query(
      'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, email',
      [username.trim(), req.userId]
    );
    
    res.json({ 
      user: result.rows[0],
      message: 'Nome atualizado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar nome:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE ADMINISTRAÇÃO =====

// Listar todos os usuários (Admin)
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, is_admin, license_expires_at, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo usuário (Admin)
app.post('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const { username, email, password, license_expires_at } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email e senha são obrigatórios' });
    }
    
    // Verificar se usuário já existe
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário ou email já existe' });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário
    const result = await pool.query(
      'INSERT INTO users (username, email, password, license_expires_at) VALUES ($1, $2, $3, $4) RETURNING id, username, email, license_expires_at, created_at',
      [username, email, hashedPassword, license_expires_at || null]
    );
    
    res.status(201).json({ 
      user: result.rows[0],
      message: 'Usuário criado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar usuário (Admin)
app.put('/api/admin/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, license_expires_at, is_admin } = req.body;
    
    // Verificar se o usuário existe
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Atualizar usuário
    const result = await pool.query(
      `UPDATE users 
       SET username = COALESCE($1, username), 
           email = COALESCE($2, email),
           license_expires_at = $3,
           is_admin = COALESCE($4, is_admin)
       WHERE id = $5 
       RETURNING id, username, email, is_admin, license_expires_at, created_at`,
      [username, email, license_expires_at, is_admin, id]
    );
    
    res.json({ 
      user: result.rows[0],
      message: 'Usuário atualizado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar usuário (Admin)
app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Não permitir deletar o próprio usuário
    if (parseInt(id) === req.userId) {
      return res.status(400).json({ error: 'Você não pode deletar seu próprio usuário' });
    }
    
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== WEBHOOK HOTMART/N8N =====

// Webhook para receber compras da Hotmart via N8N
app.post('/api/webhook/hotmart', async (req, res) => {
  try {
    const { email, name, transaction_id, product_id } = req.body;
    
    console.log('📦 Webhook Hotmart recebido:', req.body);
    
    if (!email || !name) {
      return res.status(400).json({ error: 'Email e nome são obrigatórios' });
    }
    
    // Verificar se o usuário já existe
    let user;
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      // Atualizar licença do usuário existente
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 12); // 12 meses de acesso
      
      const result = await pool.query(
        'UPDATE users SET license_expires_at = $1 WHERE email = $2 RETURNING id, username, email, license_expires_at',
        [expiresAt, email]
      );
      user = result.rows[0];
      
      console.log('✅ Licença renovada para usuário existente:', user.email);
    } else {
      // Criar novo usuário
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 12); // 12 meses de acesso
      
      const result = await pool.query(
        'INSERT INTO users (username, email, password, license_expires_at) VALUES ($1, $2, $3, $4) RETURNING id, username, email, license_expires_at',
        [name, email, hashedPassword, expiresAt]
      );
      user = result.rows[0];
      
      console.log('✅ Novo usuário criado:', user.email);
      
      // Enviar email com credenciais (via N8N)
      if (process.env.N8N_EMAIL_WEBHOOK_URL) {
        try {
          await axios.post(process.env.N8N_EMAIL_WEBHOOK_URL, {
            email: user.email,
            username: user.username,
            password: tempPassword,
            license_expires_at: user.license_expires_at
          });
          console.log('📧 Email de boas-vindas enviado');
        } catch (emailError) {
          console.error('❌ Erro ao enviar email:', emailError.message);
        }
      }
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        license_expires_at: user.license_expires_at
      },
      message: 'Usuário processado com sucesso' 
    });
  } catch (error) {
    console.error('❌ Erro no webhook Hotmart:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para obter versão
app.get('/api/version', (req, res) => {
  res.json({ version: VERSION });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// WebSocket
io.on('connection', (socket) => {
  console.log('✅ Cliente conectado');
  
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.join(decoded.userId.toString());
      console.log(`✅ Usuário ${decoded.userId} autenticado no socket`);
    } catch (error) {
      console.error('❌ Erro na autenticação do socket:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado');
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, fechando conexões...');
  await pool.end();
  server.close(() => {
    console.log('Servidor encerrado');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});