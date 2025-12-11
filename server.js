const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');

const VERSION = require('./package.json').version;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: allowedOrigins }
});

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Conectar ao PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Criar tabelas se não existirem
const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'bot')),
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    `);

    console.log('✅ Tabelas criadas/verificadas com sucesso');
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
    
    // Verificar senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    
    res.json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email } 
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