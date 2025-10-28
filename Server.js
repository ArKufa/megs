const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Инициализация базы данных
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'online',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    channel TEXT DEFAULT 'general',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    description TEXT
  )`);

  // Создаем общий канал
  db.run("INSERT INTO channels (name, description) VALUES ('general', 'Основной канал')");
  db.run("INSERT INTO channels (name, description) VALUES ('voice', 'Голосовой чат')");

  // Создаем тестового пользователя
  const hashedPassword = bcrypt.hashSync('123456', 10);
  db.run("INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)", 
    ['testuser', hashedPassword, '🦊']);
});

// Хранилище активных пользователей
const activeUsers = new Map();

class MessageStore {
  constructor() {
    this.messages = [];
    this.maxMessages = 1000;
  }

  async addMessage(userId, content, channel = 'general') {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO messages (user_id, content, channel) VALUES (?, ?, ?)",
        [userId, content, channel],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getMessages(limit = 100) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT m.*, u.username, u.avatar 
        FROM messages m 
        JOIN users u ON m.user_id = u.id 
        ORDER BY m.created_at DESC 
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.reverse());
      });
    });
  }
}

const store = new MessageStore();

// API Routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)", 
      [username, hashedPassword, '👤'], 
      function(err) {
        if (err) {
          res.status(400).json({ error: 'Username already exists' });
        } else {
          res.json({ success: true, userId: this.lastID });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        status: user.status
      }
    });
  });
});

app.get('/api/channels', (req, res) => {
  db.all("SELECT * FROM channels", (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json(rows);
    }
  });
});

// Socket.io обработчики
io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);

  socket.on('user_authenticated', async (userData) => {
    const user = {
      id: userData.id,
      username: userData.username,
      avatar: userData.avatar,
      socketId: socket.id,
      status: 'online',
      joinTime: new Date()
    };

    activeUsers.set(socket.id, user);
    
    // Отправляем историю сообщений
    const messages = await store.getMessages(100);
    socket.emit('message_history', messages);
    
    // Уведомляем всех о новом пользователе
    socket.broadcast.emit('user_joined', {
      username: user.username,
      avatar: user.avatar,
      message: `${user.username} присоединился к чату`,
      timestamp: new Date()
    });
    
    updateOnlineUsers();
  });

  socket.on('send_message', async (data) => {
    const user = activeUsers.get(socket.id);
    if (user && data.content.trim()) {
      const messageId = await store.addMessage(user.id, data.content.trim());
      
      const message = {
        id: messageId,
        user_id: user.id,
        username: user.username,
        avatar: user.avatar,
        content: data.content.trim(),
        created_at: new Date()
      };
      
      io.emit('new_message', message);
    }
  });

  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id);
      
      socket.broadcast.emit('user_left', {
        username: user.username,
        avatar: user.avatar,
        message: `${user.username} покинул чат`,
        timestamp: new Date()
      });
      
      updateOnlineUsers();
    }
  });

  function updateOnlineUsers() {
    const onlineUsers = Array.from(activeUsers.values()).map(user => ({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      status: user.status
    }));
    
    io.emit('online_users', onlineUsers);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`💬 Discord-like сервер запущен на порту ${PORT}`);
});
