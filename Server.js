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

// Военная база данных
const militaryBase = {
  users: new Map(),
  missions: new Map(),
  messages: [],
  squads: new Map(),
  equipment: new Map(),
  onlineOperatives: new Map(),
  typingOperatives: new Map()
};

// Инициализация базы
function initializeBase() {
  // Создаем тестовых оперативников
  const operatives = [
    { id: 'cmd_001', callsign: 'COMMAND', rank: 'COMMANDER', unit: 'COMMAND', password: '123', avatar: '⚡' },
    { id: 'alpha_001', callsign: 'HAWK', rank: 'CAPTAIN', unit: 'ALPHA', password: '123', avatar: '🦅' },
    { id: 'bravo_001', callsign: 'WOLF', rank: 'LIEUTENANT', unit: 'BRAVO', password: '123', avatar: '🐺' },
    { id: 'charlie_001', callsign: 'BEAR', rank: 'SERGEANT', unit: 'CHARLIE', password: '123', avatar: '🐻' },
    { id: 'delta_001', callsign: 'FOX', rank: 'SPECIALIST', unit: 'DELTA', password: '123', avatar: '🦊' }
  ];

  operatives.forEach(op => {
    militaryBase.users.set(op.callsign, { ...op });
  });

  // Создаем тестовые миссии
  const missions = [
    {
      id: 'mission_001',
      codename: 'OPERATION SHIELD',
      status: 'ACTIVE',
      objective: 'Secure communication channels',
      squad: 'ALPHA',
      priority: 'HIGH',
      startTime: new Date().toISOString()
    },
    {
      id: 'mission_002', 
      codename: 'OPERATION GHOST',
      status: 'PLANNING',
      objective: 'Reconnaissance mission',
      squad: 'BRAVO',
      priority: 'MEDIUM',
      startTime: new Date(Date.now() + 86400000).toISOString()
    }
  ];

  missions.forEach(mission => {
    militaryBase.missions.set(mission.id, mission);
  });

  // Инициализируем оборудование
  const equipment = [
    { id: 'eq_001', name: 'Tactical Radio', type: 'COMMUNICATION', status: 'OPERATIONAL', assignedTo: 'ALPHA' },
    { id: 'eq_002', name: 'Night Vision', type: 'VISION', status: 'MAINTENANCE', assignedTo: 'BRAVO' },
    { id: 'eq_003', name: 'GPS Tracker', type: 'NAVIGATION', status: 'OPERATIONAL', assignedTo: 'CHARLIE' }
  ];

  equipment.forEach(eq => {
    militaryBase.equipment.set(eq.id, eq);
  });
}

// API Routes
app.post('/api/authenticate', (req, res) => {
  const { callsign, password } = req.body;
  
  const operative = Array.from(militaryBase.users.values()).find(
    op => op.callsign === callsign && op.password === password
  );

  if (!operative) {
    return res.status(401).json({ 
      status: 'DENIED', 
      message: 'Invalid credentials. Access denied.' 
    });
  }

  const { password: _, ...userData } = operative;
  res.json({
    status: 'GRANTED',
    operative: userData,
    token: generateToken(userData.id)
  });
});

app.get('/api/missions', (req, res) => {
  res.json(Array.from(militaryBase.missions.values()));
});

app.get('/api/equipment', (req, res) => {
  res.json(Array.from(militaryBase.equipment.values()));
});

app.get('/api/operatives', (req, res) => {
  const operatives = Array.from(militaryBase.users.values()).map(({ password, ...op }) => op);
  res.json(operatives);
});

app.post('/api/mission', (req, res) => {
  const mission = {
    id: 'mission_' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    status: 'PLANNING'
  };
  
  militaryBase.missions.set(mission.id, mission);
  io.emit('new_mission', mission);
  res.json(mission);
});

// Socket.io Handlers
io.on('connection', (socket) => {
  console.log('🎖️ Operative connected:', socket.id);

  socket.on('operative_login', (operative) => {
    const operativeData = {
      ...operative,
      socketId: socket.id,
      loginTime: new Date().toISOString(),
      status: 'ONLINE'
    };

    militaryBase.onlineOperatives.set(operative.id, operativeData);
    socket.operativeId = operative.id;
    socket.callsign = operative.callsign;
    socket.unit = operative.unit;

    // Join unit room
    socket.join(operative.unit);
    socket.join('command_channel');

    // Broadcast updates
    io.emit('operatives_update', Array.from(militaryBase.onlineOperatives.values()));
    socket.emit('message_history', militaryBase.messages.slice(-100));
    socket.emit('missions_update', Array.from(militaryBase.missions.values()));
    socket.emit('equipment_update', Array.from(militaryBase.equipment.values()));

    // System message
    const systemMsg = {
      id: generateId(),
      type: 'SYSTEM',
      content: `OPERATIVE ${operative.callsign} REPORTING FOR DUTY`,
      timestamp: new Date().toISOString(),
      unit: 'SYSTEM'
    };

    militaryBase.messages.push(systemMsg);
    io.emit('new_message', systemMsg);

    console.log(`🎖️ ${operative.callsign} reporting for duty`);
  });

  socket.on('send_message', (data) => {
    const message = {
      id: generateId(),
      operativeId: socket.operativeId,
      callsign: socket.callsign,
      rank: data.rank,
      unit: socket.unit,
      content: data.content,
      type: data.type || 'TEXT',
      priority: data.priority || 'NORMAL',
      timestamp: new Date().toISOString(),
      encrypted: data.encrypted || false
    };

    militaryBase.messages.push(message);
    
    // Keep only last 500 messages
    if (militaryBase.messages.length > 500) {
      militaryBase.messages.shift();
    }

    // Broadcast based on message type
    if (data.channel === 'COMMAND') {
      io.to('command_channel').emit('new_message', message);
    } else if (data.channel === 'UNIT') {
      io.to(socket.unit).emit('new_message', message);
    } else {
      io.emit('new_message', message);
    }

    console.log(`📡 ${socket.callsign}: ${data.content}`);
  });

  socket.on('start_typing', () => {
    militaryBase.typingOperatives.set(socket.operativeId, {
      callsign: socket.callsign,
      timestamp: Date.now()
    });
    
    io.emit('typing_update', Array.from(militaryBase.typingOperatives.values()));
  });

  socket.on('stop_typing', () => {
    militaryBase.typingOperatives.delete(socket.operativeId);
    io.emit('typing_update', Array.from(militaryBase.typingOperatives.values()));
  });

  socket.on('update_mission', (mission) => {
    militaryBase.missions.set(mission.id, mission);
    io.emit('mission_updated', mission);
  });

  socket.on('update_equipment', (equipment) => {
    militaryBase.equipment.set(equipment.id, equipment);
    io.emit('equipment_updated', equipment);
  });

  socket.on('request_backup', (data) => {
    const emergencyMsg = {
      id: generateId(),
      type: 'EMERGENCY',
      callsign: socket.callsign,
      unit: socket.unit,
      content: `🚨 BACKUP REQUESTED: ${data.reason}`,
      location: data.location,
      priority: 'CRITICAL',
      timestamp: new Date().toISOString()
    };

    militaryBase.messages.push(emergencyMsg);
    io.emit('emergency_alert', emergencyMsg);
  });

  socket.on('disconnect', () => {
    if (socket.operativeId) {
      militaryBase.onlineOperatives.delete(socket.operativeId);
      militaryBase.typingOperatives.delete(socket.operativeId);
      
      io.emit('operatives_update', Array.from(militaryBase.onlineOperatives.values()));
      io.emit('typing_update', Array.from(militaryBase.typingOperatives.values()));

      const systemMsg = {
        id: generateId(),
        type: 'SYSTEM',
        content: `OPERATIVE ${socket.callsign} WENT OFFLINE`,
        timestamp: new Date().toISOString(),
        unit: 'SYSTEM'
      };

      militaryBase.messages.push(systemMsg);
      io.emit('new_message', systemMsg);

      console.log(`🎖️ ${socket.callsign} went offline`);
    }
  });
});

// Utility functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateToken(userId) {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
}

// Initialize and start server
initializeBase();
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎖️ LOCAL MESSENGER SERVER ACTIVE - PORT ${PORT}`);
  console.log(`📍 MILITARY BASE STATUS: OPERATIONAL`);
  console.log(`👥 ACTIVE OPERATIVES: ${militaryBase.users.size}`);
  console.log(`🎯 ACTIVE MISSIONS: ${militaryBase.missions.size}`);
});
