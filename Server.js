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

// Middleware
app.use(cors());
app.use(express.json());

// Обслуживание статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Остальной код сервера (сообщения, пользователи и т.д.)
let messages = [];
let users = new Map();

io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);

  socket.on('user_join', (username) => {
    users.set(socket.id, {
      id: socket.id,
      username: username,
      joinTime: new Date()
    });
    
    socket.emit('message_history', messages);
    socket.broadcast.emit('user_joined', {
      username: username,
      message: `${username} присоединился к чату`,
      timestamp: new Date()
    });
    
    updateOnlineUsers();
  });

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
      
      if (messages.length > 100) {
        messages = messages.slice(-100);
      }
      
      io.emit('new_message', message);
    }
  });

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
