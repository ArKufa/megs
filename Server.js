const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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

// Инициализация Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Хранилище в памяти
const onlineUsers = new Map();
const typingUsers = new Map();

// Инициализация базы данных
async function initializeDatabase() {
  try {
    console.log('🔄 Инициализация базы данных...');
    
    // Создаем таблицы если не существуют
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        avatar TEXT DEFAULT '👤',
        status TEXT DEFAULT 'В сети',
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        registration_date TIMESTAMPTZ DEFAULT NOW(),
        last_seen TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      `CREATE TABLE IF NOT EXISTS messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        sender_id UUID REFERENCES users(id),
        receiver_id UUID,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      `CREATE TABLE IF NOT EXISTS friendships (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        friend_id UUID REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, friend_id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) UNIQUE,
        bio TEXT DEFAULT '',
        location TEXT DEFAULT '',
        website TEXT DEFAULT '',
        avatar_url TEXT DEFAULT ''
      )`
    ];

    for (const tableSql of tables) {
      const { error } = await supabase.rpc('exec_sql', { sql: tableSql });
      if (error && !error.message.includes('already exists')) {
        console.log('Таблица уже существует или ошибка:', error.message);
      }
    }

    console.log('✅ База данных инициализирована');
  } catch (error) {
    console.error('❌ Ошибка инициализации базы:', error);
  }
}

// Регистрация пользователя
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Заполните имя пользователя и пароль' });
    }

    // Проверяем существование пользователя
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const { data: user, error } = await supabase
      .from('users')
      .insert([
        {
          username,
          email: email || null,
          password: hashedPassword,
          avatar: getRandomAvatar(),
          status: 'В сети'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Создаем профиль
    await supabase
      .from('user_profiles')
      .insert([{ user_id: user.id }]);

    const { password: _, ...userData } = user;
    res.json({ user: userData, message: 'Регистрация успешна' });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход пользователя
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }

    // Ищем пользователя
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Неверные данные' });
    }

    // Проверяем пароль
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Неверные данные' });
    }

    // Обновляем last_seen
    await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', user.id);

    const { password: _, ...userData } = user;
    res.json({ user: userData, message: 'Вход выполнен' });

  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Поиск пользователей
app.get('/api/users/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, avatar, status, level')
      .ilike('username', `%${query}%`)
      .limit(20);

    if (error) throw error;

    res.json(users || []);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

// Получение друзей
app.get('/api/users/:userId/friends', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        friend:users!friendships_friend_id_fkey(id, username, avatar, status, level)
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) throw error;

    const friends = friendships.map(f => f.friend);
    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки друзей' });
  }
});

// Отправка запроса дружбы
app.post('/api/friends/request', async (req, res) => {
  try {
    const { userId, friendId } = req.body;

    const { data: friendship, error } = await supabase
      .from('friendships')
      .insert([
        { user_id: userId, friend_id: friendId, status: 'pending' }
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Запрос дружбы отправлен', friendship });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка отправки запроса' });
  }
});

// Получение сообщений
app.get('/api/messages/:userId/:friendId', async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    res.json(messages || []);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки сообщений' });
  }
});

// Socket.io обработчики
io.on('connection', (socket) => {
  console.log('🔗 Подключен пользователь:', socket.id);

  socket.on('user_online', async (userData) => {
    const user = {
      ...userData,
      socketId: socket.id,
      loginTime: new Date().toISOString()
    };

    onlineUsers.set(userData.id, user);
    socket.userId = userData.id;
    socket.username = userData.username;

    // Обновляем статус в базе
    await supabase
      .from('users')
      .update({ status: 'В сети', last_seen: new Date().toISOString() })
      .eq('id', userData.id);

    // Отправляем обновленный список онлайн пользователей
    io.emit('online_users_update', Array.from(onlineUsers.values()));

    console.log(`👤 ${userData.username} в сети`);
  });

  // Отправка личного сообщения
  socket.on('send_private_message', async (data) => {
    try {
      const { receiverId, content, messageType = 'text' } = data;

      // Сохраняем сообщение в базу
      const { data: message, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: socket.userId,
            receiver_id: receiverId,
            content,
            message_type: messageType
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Отправляем получателю если онлайн
      const receiver = onlineUsers.get(receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit('new_private_message', message);
      }

      // Отправляем обратно отправителю
      socket.emit('new_private_message', message);

      console.log(`💬 ${socket.username} -> ${receiverId}: ${content}`);

    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      socket.emit('message_error', { error: 'Не удалось отправить сообщение' });
    }
  });

  // Пользователь печатает
  socket.on('typing_start', (data) => {
    const { receiverId } = data;
    typingUsers.set(socket.userId, {
      username: socket.username,
      receiverId,
      timestamp: Date.now()
    });

    const receiver = onlineUsers.get(receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit('user_typing', {
        userId: socket.userId,
        username: socket.username
      });
    }
  });

  socket.on('typing_stop', (data) => {
    const { receiverId } = data;
    typingUsers.delete(socket.userId);

    const receiver = onlineUsers.get(receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit('user_stop_typing', {
        userId: socket.userId
      });
    }
  });

  // Отключение пользователя
  socket.on('disconnect', async () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      typingUsers.delete(socket.userId);

      // Обновляем статус в базе
      await supabase
        .from('users')
        .update({ status: 'Не в сети', last_seen: new Date().toISOString() })
        .eq('id', socket.userId);

      io.emit('online_users_update', Array.from(onlineUsers.values()));

      console.log(`👤 ${socket.username} отключился`);
    }
  });
});

// Вспомогательные функции
function getRandomAvatar() {
  const avatars = ['👤', '👨', '👩', '🧑', '👦', '👧', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜'];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

// Health check
app.get('/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    res.json({
      status: 'healthy',
      database: error ? 'disconnected' : 'connected',
      online_users: onlineUsers.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Старт сервера
const PORT = process.env.PORT || 3000;

async function startServer() {
  await initializeDatabase();
  
  server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 Local Messenger готов к работе`);
    console.log(`👥 Онлайн пользователей: ${onlineUsers.size}`);
  });
}

startServer();
