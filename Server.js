const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Настройка CORS для Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Проверка переменных окружения
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL или SUPABASE_KEY не установлены');
  process.exit(1);
}

console.log('🔑 Supabase конфигурация загружена');

// Инициализация Supabase клиента
const supabase = createClient(supabaseUrl, supabaseKey);

// Проверка подключения к Supabase
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка подключения к Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Успешное подключение к Supabase');
    return true;
  } catch (error) {
    console.error('❌ Непредвиденная ошибка:', error.message);
    return false;
  }
}

// Создание таблицы если не существует
async function initializeDatabase() {
  try {
    console.log('🔄 Инициализация базы данных...');
    
    const { error } = await supabase
      .from('messages')
      .insert([
        { 
          content: 'Система: Чат запущен!', 
          username: 'system',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error && error.code === '42P01') {
      console.log('📋 Таблица messages не существует, нужно создать вручную в Supabase');
    } else if (error) {
      console.log('ℹ️ База данных готова, сообщение не требуется');
    } else {
      console.log('✅ База данных инициализирована');
    }
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error.message);
  }
}

// Socket.io обработка подключений
io.on('connection', (socket) => {
  console.log('👤 Пользователь подключен:', socket.id);

  // Отправка истории сообщений новому клиенту
  socket.on('get_history', async () => {
    try {
      console.log('📨 Запрос истории сообщений');
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('❌ Ошибка получения истории:', error.message);
        return;
      }

      console.log(`📊 Отправлено ${messages?.length || 0} сообщений`);
      socket.emit('message_history', messages || []);
    } catch (error) {
      console.error('❌ Непредвиденная ошибка получения истории:', error.message);
    }
  });

  // Обработка нового сообщения
  socket.on('send_message', async (data) => {
    try {
      const { username, content } = data;
      
      if (!username || !content) {
        console.log('⚠️ Пустое сообщение или имя пользователя');
        return;
      }

      console.log(`💬 Новое сообщение от ${username}`);

      // Сохранение в Supabase
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

      if (error) {
        console.error('❌ Ошибка сохранения сообщения:', error.message);
        return;
      }

      console.log('✅ Сообщение сохранено в базе данных');
      
      // Отправка всем клиентам
      io.emit('new_message', newMessage);
      
    } catch (error) {
      console.error('❌ Непредвиденная ошибка отправки сообщения:', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('👤 Пользователь отключен:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'browser-messenger'
  });
});

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

// Запуск сервера
async function startServer() {
  console.log('🚀 Запуск сервера...');
  
  // Тестируем подключение к базе данных
  const dbConnected = await testSupabaseConnection();
  
  if (!dbConnected) {
    console.log('⚠️ Предупреждение: проблемы с подключением к базе данных');
  }
  
  await initializeDatabase();
  
  server.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Доступно по адресу: http://localhost:${PORT}`);
  });
}

// Обработка непредвиденных ошибок
process.on('uncaughtException', (error) => {
  console.error('❌ Непредвиденная ошибка:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанное обещание:', reason);
});

startServer();
