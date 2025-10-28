const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Конфигурация
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Хранилище в памяти (для онлайн пользователей, сессий и т.д.)
const onlineUsers = new Map();
const userSessions = new Map();
const typingUsers = new Map();
const chatMessages = new Map(); // Кэш сообщений по чатам

// Функция для создания таблиц если не существуют
async function initializeDatabase() {
  // Таблица пользователей
  const { error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (usersError && usersError.code === '42P01') {
    await supabase.rpc('create_users_table');
  }

  // Таблица сообщений
  const { error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .limit(1);

  if (messagesError && messagesError.code === '42P01') {
    await supabase.rpc('create_messages_table');
  }

  // Таблица чатов
  const { error: chatsError } = await supabase
    .from('chats')
    .select('*')
    .limit(1);

  if (chatsError && chatsError.code === '42P01') {
    await supabase.rpc('create_chats_table');
  }
}

// Telegram-подобные функции

// 1. Отправка сообщений с статусом прочтения
async function sendMessageWithStatus(data) {
  const { username, content, chatId = 'general', replyTo = null } = data;
  
  const { data: message, error } = await supabase
    .from('messages')
    .insert([
      {
        username,
        content,
        chat_id: chatId,
        reply_to: replyTo,
        created_at: new Date().toISOString(),
        status: 'sent'
      }
    ])
    .select()
    .single();

  if (!error) {
    // Отправляем сообщение всем в чате
    io.to(chatId).emit('new_message', message);
    
    // Обновляем превью чата
    io.emit('chat_update', {
      chatId,
      lastMessage: content,
      lastMessageTime: message.created_at,
      unreadCount: 0
    });

    return message;
  }
}

// 2. Отметка сообщений как прочитанных
async function markMessagesAsRead(userId, chatId, messageIds) {
  const { error } = await supabase
    .from('messages')
    .update({ status: 'read' })
    .in('id', messageIds)
    .eq('chat_id', chatId);

  if (!error) {
    // Уведомляем отправителей о прочтении
    messageIds.forEach(messageId => {
      const message = chatMessages.get(messageId);
      if (message) {
        io.to(message.username).emit('message_read', {
          messageId,
          reader: userId
        });
      }
    });
  }
}

// 3. Функция редактирования сообщений
async function editMessage(messageId, newContent, userId) {
  const { data: message, error } = await supabase
    .from('messages')
    .update({ 
      content: newContent,
      edited_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('username', userId)
    .select()
    .single();

  if (!error) {
    io.to(message.chat_id).emit('message_edited', message);
  }
}

// 4. Удаление сообщений (для всех или только для себя)
async function deleteMessage(messageId, userId, forEveryone = false) {
  if (forEveryone) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (!error) {
      io.emit('message_deleted', { messageId, deletedFor: 'everyone' });
    }
  } else {
    // Сохраняем в отдельной таблице скрытых сообщений
    const { error } = await supabase
      .from('deleted_messages')
      .insert([{ message_id: messageId, user_id: userId }]);

    if (!error) {
      io.to(userId).emit('message_deleted', { messageId, deletedFor: 'me' });
    }
  }
}

// 5. Ответ на сообщения (reply)
async function sendReply(data) {
  const { username, content, replyTo, chatId = 'general' } = data;
  
  const { data: originalMessage } = await supabase
    .from('messages')
    .select('*')
    .eq('id', replyTo)
    .single();

  if (originalMessage) {
    const replyData = {
      username,
      content,
      chat_id: chatId,
      reply_to: replyTo,
      created_at: new Date().toISOString(),
      status: 'sent'
    };

    const { data: message, error } = await supabase
      .from('messages')
      .insert([replyData])
      .select()
      .single();

    if (!error) {
      // Добавляем информацию об оригинальном сообщении
      message.reply_to_message = originalMessage;
      io.to(chatId).emit('new_message', message);
    }
  }
}

// 6. Индикатор набора сообщения
function handleTyping(userId, chatId) {
  typingUsers.set(userId, {
    chatId,
    lastTyping: Date.now()
  });

  io.to(chatId).emit('user_typing', {
    username: onlineUsers.get(userId)?.username,
    userId
  });

  // Автоматически останавливаем индикатор через 3 секунды
  setTimeout(() => {
    const typingData = typingUsers.get(userId);
    if (typingData && Date.now() - typingData.lastTyping > 2500) {
      typingUsers.delete(userId);
      io.to(chatId).emit('user_stop_typing', { userId });
    }
  }, 3000);
}

// 7. Функция пересылки сообщений
async function forwardMessage(messageId, targetChatId, userId) {
  const { data: originalMessage } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (originalMessage) {
    const forwardData = {
      username: onlineUsers.get(userId)?.username,
      content: `Переслано: ${originalMessage.content}`,
      chat_id: targetChatId,
      forward_from: originalMessage.username,
      forward_from_message_id: messageId,
      created_at: new Date().toISOString(),
      status: 'sent'
    };

    const { data: message, error } = await supabase
      .from('messages')
      .insert([forwardData])
      .select()
      .single();

    if (!error) {
      io.to(targetChatId).emit('new_message', message);
    }
  }
}

// 8. Система сессий и онлайн статусов
function updateUserOnlineStatus(userId, username, isOnline = true) {
  if (isOnline) {
    onlineUsers.set(userId, {
      username,
      lastSeen: new Date().toISOString(),
      isOnline: true
    });
  } else {
    const user = onlineUsers.get(userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date().toISOString();
    }
  }

  // Рассылаем обновление статуса
  io.emit('users_update', Array.from(onlineUsers.values()));
}

// 9. Поиск по сообщениям
async function searchMessages(query, chatId = null) {
  let searchQuery = supabase
    .from('messages')
    .select('*')
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (chatId) {
    searchQuery = searchQuery.eq('chat_id', chatId);
  }

  const { data: messages, error } = await searchQuery;

  if (!error) {
    return messages;
  }
  return [];
}

// 10. Получение истории сообщений с пагинацией
async function getMessagesWithPagination(chatId, page = 1, limit = 50) {
  const from = (page - 1) * limit;
  
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (!error) {
    return messages.reverse(); // Возвращаем в правильном порядке
  }
  return [];
}

// Socket.io обработчики
io.on('connection', (socket) => {
  console.log('👤 Подключен пользователь:', socket.id);

  // Регистрация пользователя
  socket.on('user_join', async (username) => {
    const userId = socket.id;
    onlineUsers.set(userId, {
      username,
      lastSeen: new Date().toISOString(),
      isOnline: true
    });

    socket.userId = userId;
    socket.username = username;

    // Присоединяем к общему чату
    socket.join('general');

    // Отправляем обновленный список пользователей
    io.emit('users_update', Array.from(onlineUsers.values()));

    // Системное сообщение о входе
    const systemMessage = {
      username: 'system',
      content: `${username} присоединился к чату`,
      chat_id: 'general',
      created_at: new Date().toISOString(),
      type: 'system'
    };

    io.to('general').emit('new_message', systemMessage);
  });

  // Получение истории сообщений
  socket.on('get_history', async (data = {}) => {
    const { chatId = 'general', page = 1 } = data;
    const messages = await getMessagesWithPagination(chatId, page);
    socket.emit('message_history', messages);
  });

  // Отправка сообщения
  socket.on('send_message', async (data) => {
    const message = await sendMessageWithStatus({
      ...data,
      chatId: data.chatId || 'general'
    });
  });

  // Ответ на сообщение
  socket.on('send_reply', async (data) => {
    await sendReply(data);
  });

  // Редактирование сообщения
  socket.on('edit_message', async (data) => {
    await editMessage(data.messageId, data.newContent, socket.username);
  });

  // Удаление сообщения
  socket.on('delete_message', async (data) => {
    await deleteMessage(data.messageId, socket.username, data.forEveryone);
  });

  // Пересылка сообщения
  socket.on('forward_message', async (data) => {
    await forwardMessage(data.messageId, data.targetChatId, socket.userId);
  });

  // Индикатор набора
  socket.on('typing', (data) => {
    handleTyping(socket.userId, data.chatId || 'general');
  });

  socket.on('stop_typing', () => {
    typingUsers.delete(socket.userId);
    io.emit('user_stop_typing', { userId: socket.userId });
  });

  // Отметка сообщений как прочитанных
  socket.on('mark_as_read', async (data) => {
    await markMessagesAsRead(socket.userId, data.chatId, data.messageIds);
  });

  // Поиск сообщений
  socket.on('search_messages', async (data) => {
    const results = await searchMessages(data.query, data.chatId);
    socket.emit('search_results', results);
  });

  // Получение онлайн статусов
  socket.on('get_online_status', (userIds) => {
    const statuses = {};
    userIds.forEach(userId => {
      const user = onlineUsers.get(userId);
      statuses[userId] = user ? {
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      } : null;
    });
    socket.emit('online_statuses', statuses);
  });

  // Отключение пользователя
  socket.on('disconnect', () => {
    const userId = socket.userId;
    if (userId) {
      updateUserOnlineStatus(userId, socket.username, false);
      
      // Системное сообщение о выходе
      const systemMessage = {
        username: 'system',
        content: `${socket.username} покинул чат`,
        chat_id: 'general',
        created_at: new Date().toISOString(),
        type: 'system'
      };

      io.to('general').emit('new_message', systemMessage);
    }
    console.log('👤 Отключен пользователь:', socket.id);
  });
});

// API маршруты
app.get('/api/messages/search', async (req, res) => {
  const { q, chat_id } = req.query;
  const results = await searchMessages(q, chat_id);
  res.json(results);
});

app.get('/api/users/online', (req, res) => {
  res.json(Array.from(onlineUsers.values()));
});

app.get('/health', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .limit(1);

  res.json({
    status: error ? 'degraded' : 'healthy',
    database: error ? 'disconnected' : 'connected',
    onlineUsers: onlineUsers.size,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  await initializeDatabase();
});
