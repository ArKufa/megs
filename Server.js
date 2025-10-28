// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

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

// Хранилище сообщений и пользователей
let messages = [];
let users = new Map();

io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);

  // Новый пользователь
  socket.on('user_join', (username) => {
    users.set(socket.id, {
      id: socket.id,
      username: username,
      joinTime: new Date()
    });
    
    // Отправляем историю сообщений новому пользователю
    socket.emit('message_history', messages);
    
    // Уведомляем всех о новом пользователе
    socket.broadcast.emit('user_joined', {
      username: username,
      message: `${username} присоединился к чату`,
      timestamp: new Date()
    });
    
    // Обновляем список пользователей
    updateOnlineUsers();
  });

  // Обработка сообщений
  socket.on('send_message', (data) => {
    const user = users.get(socket.id);
    if (user) {
      const message = {
        id: Date.now().toString(),
        username: user.username,
        text: data.text,
        timestamp: new Date(),
        userId: socket.id
      };
      
      messages.push(message);
      
      // Сохраняем только последние 100 сообщений
      if (messages.length > 100) {
        messages = messages.slice(-100);
      }
      
      // Отправляем сообщение всем пользователям
      io.emit('new_message', message);
    }
  });

  // Обработка отключения
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      
      socket.broadcast.emit('user_left', {
        username: user.username,
        message: `${user.username} покинул чат`,
        timestamp: new Date()
      });
      
      updateOnlineUsers();
    }
    console.log('Пользователь отключен:', socket.id);
  });

  function updateOnlineUsers() {
    const onlineUsers = Array.from(users.values()).map(user => ({
      id: user.id,
      username: user.username
    }));
    
    io.emit('online_users', onlineUsers);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
