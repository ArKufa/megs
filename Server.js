const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Настройка Socket.io с улучшенными параметрами
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Маршруты
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Хранилище данных
class MessageStore {
  constructor() {
    this.messages = [];
    this.users = new Map();
    this.maxMessages = 200;
  }

  addMessage(message) {
    this.messages.push(message);
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
    return message;
  }

  addUser(socketId, userData) {
    this.users.set(socketId, {
      ...userData,
      joinTime: new Date(),
      lastActive: new Date()
    });
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);
    this.users.delete(socketId);
    return user;
  }

  updateUserActivity(socketId) {
    const user = this.users.get(socketId);
    if (user) {
      user.lastActive = new Date();
    }
  }

  getOnlineUsers() {
    return Array.from(this.users.values()).map(user => ({
      id: user.id,
      username: user.username,
      codename: user.codename,
      status: user.status
    }));
  }
}

const store = new MessageStore();

// Socket.io обработчики
io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);

  // Новый пользователь
  socket.on('user_join', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username,
      codename: userData.codename || 'Агент',
      status: 'В сети',
      joinTime: new Date()
    };

    store.addUser(socket.id, user);
    
    // Отправляем историю сообщений
    socket.emit('message_history', store.messages);
    
    // Уведомляем всех о новом агенте
    socket.broadcast.emit('agent_joined', {
      username: user.username,
      codename: user.codename,
      message: `Агент ${user.codename} присоединился к сети`,
      timestamp: new Date()
    });
    
    // Обновляем список агентов
    updateOnlineAgents();
  });

  // Отправка сообщения
  socket.on('send_message', (data) => {
    const user = store.users.get(socket.id);
    if (user && data.text.trim()) {
      const message = {
        id: Date.now().toString(),
        username: user.username,
        codename: user.codename,
        text: data.text.trim(),
        timestamp: new Date(),
        userId: socket.id,
        type: 'message'
      };
      
      const savedMessage = store.addMessage(message);
      io.emit('new_message', savedMessage);
    }
  });

  // Системное сообщение
  socket.on('send_system_message', (data) => {
    const message = {
      id: Date.now().toString(),
      username: 'СИСТЕМА',
      codename: 'СИСТЕМА',
      text: data.text,
      timestamp: new Date(),
      type: 'system',
      color: '#ff4444'
    };
    
    const savedMessage = store.addMessage(message);
    io.emit('new_message', savedMessage);
  });

  // Обновление активности
  socket.on('user_activity', () => {
    store.updateUserActivity(socket.id);
  });

  // Отключение
  socket.on('disconnect', (reason) => {
    const user = store.removeUser(socket.id);
    if (user) {
      socket.broadcast.emit('agent_left', {
        username: user.username,
        codename: user.codename,
        message: `Агент ${user.codename} покинул сеть`,
        timestamp: new Date(),
        reason: reason
      });
      
      updateOnlineAgents();
    }
    console.log('Агент отключен:', socket.id, reason);
  });

  // Ошибка соединения
  socket.on('connect_error', (error) => {
    console.log('Ошибка подключения:', error);
  });
});

function updateOnlineAgents() {
  const onlineAgents = store.getOnlineUsers();
  io.emit('online_agents', onlineAgents);
}

// Статус сервера
app.get('/status', (req, res) => {
  res.json({
    status: 'active',
    agentsOnline: store.users.size,
    totalMessages: store.messages.length,
    serverTime: new Date()
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🕵️ Сервер активен на порту ${PORT}`);
  console.log(`🌐 Доступен глобально`);
  console.log(`👥 Агентов онлайн: ${store.users.size}`);
});
