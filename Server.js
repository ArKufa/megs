// server.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Инициализация Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Маршруты API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Messenger API is running' });
});

// Получение профиля пользователя
app.get('/api/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(500).json({ error: profileError.message });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение сообщений
app.get('/api/messages/:contactId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const contactId = req.params.contactId;

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return res.status(500).json({ error: messagesError.message });
    }

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отправка сообщения
app.post('/api/messages', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { receiver_id, content } = req.body;

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: user.id,
          receiver_id,
          content
        }
      ])
      .select()
      .single();

    if (messageError) {
      return res.status(500).json({ error: messageError.message });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение оперативных данных
app.get('/api/operational-data', async (req, res) => {
  try {
    const { data: records, error } = await supabase
      .from('operational_data')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Messenger API running on port ${port}`);
});
