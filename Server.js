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

// Хранилище данных
class MessageStore {
  constructor() {
    this.messages = [];
    this.users = new Map();
    this.maxMessages = 200;
    this.missions = [];
    this.activeCalls = new Map();
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
      lastActive: new Date(),
      status: 'online',
      isInCall: false
    });
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);
    
    // Завершаем активные звонки пользователя
    if (this.activeCalls.has(socketId)) {
      const callData = this.activeCalls.get(socketId);
      this.activeCalls.delete(socketId);
      if (callData.targetSocketId && this.users.has(callData.targetSocketId)) {
        this.activeCalls.delete(callData.targetSocketId);
      }
    }
    
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
      status: user.status,
      isInCall: user.isInCall
    }));
  }

  // Управление звонками
  startCall(callerSocketId, targetSocketId) {
    const callData = {
      callerSocketId,
      targetSocketId,
      startTime: new Date(),
      status: 'ringing'
    };
    
    this.activeCalls.set(callerSocketId, callData);
    this.activeCalls.set(targetSocketId, callData);
    
    // Обновляем статусы пользователей
    const caller = this.users.get(callerSocketId);
    const target = this.users.get(targetSocketId);
    if (caller) caller.isInCall = true;
    if (target) target.isInCall = true;
    
    return callData;
  }

  endCall(socketId) {
    const callData = this.activeCalls.get(socketId);
    if (!callData) return null;

    const { callerSocketId, targetSocketId } = callData;
    
    // Обновляем статусы пользователей
    const caller = this.users.get(callerSocketId);
    const target = this.users.get(targetSocketId);
    if (caller) caller.isInCall = false;
    if (target) target.isInCall = false;
    
    this.activeCalls.delete(callerSocketId);
    this.activeCalls.delete(targetSocketId);
    
    return callData;
  }

  // Управление заданиями
  addMission(mission) {
    this.missions.push({
      ...mission,
      id: Date.now().toString(),
      createdAt: new Date(),
      status: 'active'
    });
  }

  completeMission(missionId) {
    const mission = this.missions.find(m => m.id === missionId);
    if (mission) {
      mission.status = 'completed';
      mission.completedAt = new Date();
    }
    return mission;
  }
}

const store = new MessageStore();

// Пример заданий
store.addMission({
  title: 'Защита периметра',
  description: 'Обеспечить безопасность восточного сектора',
  priority: 'high',
  assignedTo: []
});

store.addMission({
  title: 'Сбор информации',
  description: 'Собрать данные о подозрительной активности',
  priority: 'medium',
  assignedTo: []
});

// Socket.io обработчики
io.on('connection', (socket) => {
  console.log('Новый агент подключен:', socket.id);

  socket.on('user_join', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username,
      codename: userData.codename || 'Агент',
      status: 'online',
      joinTime: new Date(),
      isInCall: false
    };

    store.addUser(socket.id, user);
    
    socket.emit('message_history', store.messages);
    socket.emit('missions_update', store.missions);
    
    socket.broadcast.emit('agent_joined', {
      username: user.username,
      codename: user.codename,
      message: `Агент ${user.codename} присоединился к сети`,
      timestamp: new Date()
    });
    
    updateOnlineAgents();
  });

  // Сообщения
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

  // Звонки
  socket.on('call_user', (data) => {
    const caller = store.users.get(socket.id);
    const targetUser = Array.from(store.users.values()).find(u => u.codename === data.targetCodename);
    
    if (caller && targetUser && !targetUser.isInCall) {
      const callData = store.startCall(socket.id, targetUser.id);
      
      // Уведомляем вызываемого
      io.to(targetUser.id).emit('incoming_call', {
        callerCodename: caller.codename,
        callerUsername: caller.username,
        callId: callData.startTime.getTime()
      });
      
      socket.emit('call_initiated', {
        targetCodename: targetUser.codename,
        status: 'ringing'
      });
    } else {
      socket.emit('call_failed', {
        reason: targetUser ? 'Агент занят' : 'Агент не найден'
      });
    }
  });

  socket.on('accept_call', (data) => {
    const user = store.users.get(socket.id);
    if (user) {
      const callData = store.activeCalls.get(socket.id);
      if (callData && callData.status === 'ringing') {
        callData.status = 'active';
        
        // Уведомляем обоих пользователей
        io.to(callData.callerSocketId).emit('call_accepted', {
          targetCodename: user.codename
        });
        
        io.to(callData.callerSocketId).to(socket.id).emit('call_connected', {
          callId: callData.startTime.getTime()
        });
      }
    }
  });

  socket.on('reject_call', (data) => {
    const user = store.users.get(socket.id);
    if (user) {
      const endedCall = store.endCall(socket.id);
      if (endedCall) {
        io.to(endedCall.callerSocketId).emit('call_rejected', {
          targetCodename: user.codename
        });
      }
    }
  });

  socket.on('end_call', (data) => {
    const endedCall = store.endCall(socket.id);
    if (endedCall) {
      const otherSocketId = endedCall.callerSocketId === socket.id ? 
                           endedCall.targetSocketId : endedCall.callerSocketId;
      
      io.to(otherSocketId).emit('call_ended', {
        reason: 'Собеседник завершил звонок'
      });
    }
  });

  // Задания
  socket.on('assign_mission', (data) => {
    const mission = store.missions.find(m => m.id === data.missionId);
    if (mission) {
      if (!mission.assignedTo.includes(data.codename)) {
        mission.assignedTo.push(data.codename);
        io.emit('missions_update', store.missions);
      }
    }
  });

  socket.on('complete_mission', (data) => {
    const mission = store.completeMission(data.missionId);
    if (mission) {
      io.emit('missions_update', store.missions);
      io.emit('new_message', {
        id: Date.now().toString(),
        username: 'СИСТЕМА',
        codename: 'СИСТЕМА',
        text: `Задание "${mission.title}" выполнено агентом ${data.codename}`,
        timestamp: new Date(),
        type: 'system'
      });
    }
  });

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
    activeMissions: store.missions.filter(m => m.status === 'active').length,
    activeCalls: store.activeCalls.size / 2,
    serverTime: new Date()
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🕵️ Сервер активен на порту ${PORT}`);
  console.log(`🌐 Доступен глобально`);
  console.log(`👥 Агентов онлайн: ${store.users.size}`);
});
