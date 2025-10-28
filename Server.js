const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

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

// Хранилище в памяти
const activeUsers = new Map();
const messages = [];
const MAX_MESSAGES = 1000;

// Простые пользователи для демо (в реальном приложении убрать)
const demoUsers = [
  { id: 1, username: 'testuser', password: '123456', avatar: '🦊' },
  { id: 2, username: 'alice', password: '123456', avatar: '🐰' },
  { id: 3, username: 'bob', password: '123456', avatar: '🐻' }
];

// API Routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Проверяем, нет ли уже такого пользователя
  const existingUser = demoUsers.find(u => u.username === username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  // Создаем нового пользователя
  const newUser = {
    id: demoUsers.length + 1,
    username: username,
    password: password,
    avatar: '👤'
  };
  
  demoUsers.push(newUser);
  
  res.json({ 
    success: true, 
    user: {
      id: newUser.id,
      username: newUser.username,
      avatar: newUser.avatar
    }
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Ищем пользователя
  const user = demoUsers.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      status: 'online'
    }
  });
});

// Socket.io обработчики
io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);

  socket.on('user_authenticated', (userData) => {
    const user = {
      id: userData.id,
      username: userData.username,
      avatar: userData.avatar,
      socketId: socket.id,
      status: 'online'
    };

    activeUsers.set(socket.id, user);
    
    // Отправляем историю сообщений
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

  socket.on('send_message', (data) => {
    const user = activeUsers.get(socket.id);
    if (user && data.content.trim()) {
      const message = {
        id: Date.now().toString(),
        user_id: user.id,
        username: user.username,
        avatar: user.avatar,
        content: data.content.trim(),
        created_at: new Date()
      };
      
      // Сохраняем сообщение
      messages.push(message);
      
      // Ограничиваем количество сообщений в памяти
      if (messages.length > MAX_MESSAGES) {
        messages.shift(); // Удаляем самое старое сообщение
      }
      
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
  console.log(`💬 Сервер запущен на порту ${PORT}`);
  console.log(`👥 Демо пользователи: testuser/123456, alice/123456, bob/123456`);
});
