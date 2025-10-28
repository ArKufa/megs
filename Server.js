const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Получаем URL приложения на Render
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;

console.log('🌐 URL приложения:', RENDER_URL);

// Настройка Socket.io с правильным CORS
const io = socketIo(server, {
  cors: {
    origin: "*", // Разрешаем все домены для тестирования
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Проверка переменных окружения
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('🔧 Проверка конфигурации Supabase...');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Установлен' : '❌ Отсутствует');
console.log('SUPABASE_KEY:', supabaseKey ? '✅ Установлен' : '❌ Отсутствует');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ОШИБКА: Отсутствуют переменные окружения Supabase');
  process.exit(1);
}

// Инициализация Supabase
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase клиент инициализирован');

// Проверка подключения к базе данных
async function testSupabaseConnection() {
  try {
    console.log('🔄 Проверка подключения к базе данных...');
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
    
    // Просто проверяем подключение, не пытаемся создать таблицу
    const { error } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('📋 Таблица messages не существует');
      console.log('ℹ️ Создайте таблицу вручную в Supabase:');
      console.log(`
        CREATE TABLE messages (
          id BIGSERIAL PRIMARY KEY,
          username TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } else if (error) {
      console.log('⚠️ Ошибка при проверке таблицы:', error.message);
    } else {
      console.log('✅ База данных готова');
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
      console.log('📨 Запрос истории сообщений от', socket.id);
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('❌ Ошибка получения истории:', error.message);
        socket.emit('error', 'Ошибка загрузки истории');
        return;
      }

      console.log(`📊 Отправлено ${messages?.length || 0} сообщений`);
      socket.emit('message_history', messages || []);
    } catch (error) {
      console.error('❌ Непредвиденная ошибка получения истории:', error.message);
      socket.emit('error', 'Ошибка загрузки истории');
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

      console.log(`💬 Новое сообщение от ${username}: ${content.substring(0, 50)}...`);

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
        socket.emit('error', 'Ошибка отправки сообщения');
        return;
      }

      console.log('✅ Сообщение сохранено в базе данных');
      
      // Отправка всем клиентам
      io.emit('new_message', newMessage);
      
    } catch (error) {
      console.error('❌ Непредвиденная ошибка отправки сообщения:', error.message);
      socket.emit('error', 'Ошибка отправки сообщения');
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('👤 Пользователь отключен:', socket.id, 'Причина:', reason);
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await testSupabaseConnection();
  res.json({ 
    status: dbConnected ? 'healthy' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    service: 'browser-messenger',
    url: RENDER_URL
  });
});

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API для тестирования
app.get('/api/test', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .limit(5);

    if (error) throw error;

    res.json({
      status: 'success',
      message: 'API работает корректно',
      data: data,
      count: data?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

// Запуск сервера
async function startServer() {
  console.log('🚀 Запуск сервера Messenger...');
  
  // Тестируем подключение к базе данных
  const dbConnected = await testSupabaseConnection();
  
  if (!dbConnected) {
    console.log('⚠️ Предупреждение: проблемы с подключением к базе данных');
  }
  
  await initializeDatabase();
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Локальный URL: http://localhost:${PORT}`);
    console.log(`🌐 Внешний URL: ${RENDER_URL}`);
    console.log(`❤️  Health check: ${RENDER_URL}/health`);
    console.log(`🔧 API тест: ${RENDER_URL}/api/test`);
  });
}

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('❌ Непредвиденная ошибка:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанное обещание:', reason);
});

startServer();
