const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

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

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Create messages table in Supabase first
async function initializeDatabase() {
  const { error } = await supabase
    .from('messages')
    .insert([
      { 
        content: 'Система: Чат инициализирован!', 
        username: 'system',
        created_at: new Date().toISOString()
      }
    ])
    .select();
    
  if (error && error.code !== '42P01') {
    console.log('База данных готова');
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Пользователь подключен:', socket.id);

  // Send message history to new client
  socket.on('get_history', async () => {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && messages) {
        socket.emit('message_history', messages);
      }
    } catch (error) {
      console.error('Ошибка получения истории:', error);
    }
  });

  // Handle new message
  socket.on('send_message', async (data) => {
    try {
      const { username, content } = data;
      
      if (!username || !content) return;

      // Save to Supabase
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert([
          { 
            username: username.trim(), 
            content: content.trim(),
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (!error && newMessage) {
        // Broadcast to all clients
        io.emit('new_message', newMessage);
      }
    } catch (error) {
      console.error('Ошибка сохранения сообщения:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключен:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
  });
});
