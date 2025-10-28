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
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Хранилище данных в памяти
const users = new Map();
const messages = [];
const onlineUsers = new Map();
const typingUsers = new Map();

// Регистрация пользователя
app.post('/api/register', (req, res) => {
  const { username, password, phone } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }

  if (users.has(username)) {
    return res.status(400).json({ error: 'Пользователь уже существует' });
  }

  const user = {
    id: generateId(),
    username,
    phone: phone || '',
    avatar: username.charAt(0).toUpperCase(),
    createdAt: new Date().toISOString()
  };

  users.set(username, { ...user, password });
  res.json({ user, token: generateToken(user.id) });
});

// Вход пользователя
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const userData = users.get(username);
  if (!userData || userData.password !== password) {
    return res.status(401).json({ error: 'Неверные данные' });
  }

  const { password: _, ...user } = userData;
  res.json({ user, token: generateToken(user.id) });
});

// Получение пользователей
app.get('/api/users', (req, res) => {
  const usersList = Array.from(users.values()).map(({ password, ...user }) => user);
  res.json(usersList);
});

// Получение сообщений
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// Socket.io соединения
io.on('connection', (socket) => {
  console.log('🔗 Подключен пользователь:', socket.id);

  // Вход пользователя
  socket.on('user_login', (userData) => {
    const user = {
      id: userData.id || generateId(),
      username: userData.username,
      avatar: userData.avatar || userData.username.charAt(0).toUpperCase(),
      socketId: socket.id
    };

    onlineUsers.set(user.id, user);
    socket.userId = user.id;
    socket.username = user.username;

    // Отправляем обновленный список онлайн пользователей
    io.emit('online_users', Array.from(onlineUsers.values()));

    // Отправляем историю сообщений
    socket.emit('message_history', messages);

    console.log(`👤 ${user.username} вошел в чат`);
  });

  // Отправка сообщения
  socket.on('send_message', (data) => {
    const message = {
      id: generateId(),
      userId: socket.userId,
      username: socket.username,
      avatar: data.avatar || socket.username.charAt(0).toUpperCase(),
      content: data.content,
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    messages.push(message);
    
    // Сохраняем только последние 1000 сообщений
    if (messages.length > 1000) {
      messages.shift();
    }

    // Отправляем всем пользователям
    io.emit('new_message', message);
    console.log(`💬 ${socket.username}: ${data.content}`);
  });

  // Пользователь печатает
  socket.on('typing_start', () => {
    typingUsers.set(socket.userId, {
      username: socket.username,
      timestamp: Date.now()
    });
    
    io.emit('user_typing', Array.from(typingUsers.values()));
  });

  socket.on('typing_stop', () => {
    typingUsers.delete(socket.userId);
    io.emit('user_typing', Array.from(typingUsers.values()));
  });

  // Отключение пользователя
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      typingUsers.delete(socket.userId);
      
      io.emit('online_users', Array.from(onlineUsers.values()));
      io.emit('user_typing', Array.from(typingUsers.values()));
      
      console.log(`👤 ${socket.username} вышел из чата`);
    }
  });
});

// Вспомогательные функции
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateToken(userId) {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📱 Mobeil Messenger готов к работе`);
});
