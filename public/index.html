<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NeoConnect</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --secondary: #10b981;
            --background: #0f172a;
            --surface: #1e293b;
            --surface-light: #334155;
            --text: #f1f5f9;
            --text-muted: #94a3b8;
            --error: #ef4444;
            --success: #22c55e;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--background);
            color: var(--text);
            height: 100vh;
            overflow: hidden;
            background-image: 
                radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);
        }

        /* Auth Screen */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
        }

        .auth-card {
            background: var(--surface);
            padding: 40px;
            border-radius: 20px;
            width: 100%;
            max-width: 400px;
            box-shadow: 
                0 25px 50px -12px rgba(0, 0, 0, 0.5),
                0 0 0 1px rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
        }

        .app-logo {
            text-align: center;
            margin-bottom: 32px;
        }

        .logo-icon {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            font-size: 24px;
        }

        .logo-text {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .auth-tabs {
            display: flex;
            background: var(--background);
            border-radius: 12px;
            padding: 4px;
            margin-bottom: 24px;
        }

        .auth-tab {
            flex: 1;
            padding: 12px;
            text-align: center;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
        }

        .auth-tab.active {
            background: var(--primary);
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-muted);
        }

        .form-input {
            width: 100%;
            padding: 14px 16px;
            background: var(--background);
            border: 2px solid var(--surface-light);
            border-radius: 12px;
            color: var(--text);
            font-size: 16px;
            transition: all 0.3s ease;
        }

        .form-input:focus {
            border-color: var(--primary);
            outline: none;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        .auth-button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 8px;
        }

        .auth-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }

        /* Main App */
        .app-container {
            display: none;
            height: 100vh;
            grid-template-columns: 280px 1fr 300px;
        }

        /* Sidebar */
        .sidebar {
            background: var(--surface);
            border-right: 1px solid var(--surface-light);
            display: flex;
            flex-direction: column;
        }

        .sidebar-header {
            padding: 24px;
            border-bottom: 1px solid var(--surface-light);
        }

        .user-profile {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .user-avatar {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
        }

        .user-info h3 {
            font-size: 16px;
            font-weight: 600;
        }

        .user-status {
            font-size: 12px;
            color: var(--success);
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
        }

        .channels-section {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }

        .section-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-bottom: 16px;
            letter-spacing: 1px;
        }

        .channel-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .channel-item {
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .channel-item:hover {
            background: var(--surface-light);
        }

        .channel-item.active {
            background: var(--primary);
        }

        .channel-icon {
            font-size: 18px;
        }

        /* Chat Area */
        .chat-area {
            display: flex;
            flex-direction: column;
            background: var(--background);
        }

        .chat-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--surface-light);
            background: var(--surface);
        }

        .channel-header {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .channel-hashtag {
            color: var(--text-muted);
            font-size: 20px;
            font-weight: 600;
        }

        .channel-title {
            font-size: 18px;
            font-weight: 600;
        }

        .channel-description {
            color: var(--text-muted);
            font-size: 14px;
            margin-top: 4px;
        }

        .messages-container {
            flex: 1;
            padding: 24px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message {
            display: flex;
            gap: 16px;
            padding: 8px;
            border-radius: 8px;
            transition: background 0.3s ease;
        }

        .message:hover {
            background: rgba(255, 255, 255, 0.02);
        }

        .message-avatar {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            flex-shrink: 0;
        }

        .message-content {
            flex: 1;
        }

        .message-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
        }

        .message-username {
            font-weight: 600;
            font-size: 15px;
        }

        .message-time {
            color: var(--text-muted);
            font-size: 12px;
        }

        .message-text {
            color: var(--text);
            line-height: 1.5;
            font-size: 15px;
        }

        .input-area {
            padding: 20px 24px;
            background: var(--surface);
            border-top: 1px solid var(--surface-light);
        }

        .message-input-container {
            background: var(--background);
            border: 2px solid var(--surface-light);
            border-radius: 12px;
            padding: 12px 16px;
            transition: all 0.3s ease;
        }

        .message-input-container:focus-within {
            border-color: var(--primary);
        }

        .message-input {
            width: 100%;
            background: transparent;
            border: none;
            color: var(--text);
            font-size: 15px;
            outline: none;
            resize: none;
            max-height: 120px;
            line-height: 1.5;
        }

        .message-input::placeholder {
            color: var(--text-muted);
        }

        /* Members Sidebar */
        .members-sidebar {
            background: var(--surface);
            border-left: 1px solid var(--surface-light);
            padding: 24px;
        }

        .members-header {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-bottom: 20px;
            letter-spacing: 1px;
        }

        .members-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .member-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 12px;
            border-radius: 8px;
            transition: background 0.3s ease;
        }

        .member-item:hover {
            background: var(--surface-light);
        }

        .member-avatar {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
        }

        .member-info {
            flex: 1;
        }

        .member-name {
            font-size: 14px;
            font-weight: 500;
        }

        .member-status {
            font-size: 12px;
            color: var(--success);
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            .app-container {
                grid-template-columns: 1fr;
            }

            .sidebar,
            .members-sidebar {
                display: none;
            }

            .mobile-header {
                display: flex;
                align-items: center;
                padding: 16px 20px;
                background: var(--surface);
                border-bottom: 1px solid var(--surface-light);
            }

            .mobile-menu-btn {
                background: none;
                border: none;
                color: var(--text);
                font-size: 20px;
                margin-right: 12px;
                cursor: pointer;
            }

            .messages-container {
                padding: 16px;
            }

            .input-area {
                padding: 16px 20px;
            }
        }

        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .fade-in {
            animation: fadeIn 0.3s ease;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
        }

        ::-webkit-scrollbar-track {
            background: transparent;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--surface-light);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--primary);
        }
    </style>
</head>
<body>
    <!-- Auth Screen -->
    <div class="auth-screen" id="authScreen">
        <div class="auth-card">
            <div class="app-logo">
                <div class="logo-icon">⚡</div>
                <div class="logo-text">NeoConnect</div>
            </div>
            
            <div class="auth-tabs">
                <div class="auth-tab active" onclick="showAuthForm('login')">Вход</div>
                <div class="auth-tab" onclick="showAuthForm('register')">Регистрация</div>
            </div>

            <!-- Login Form -->
            <div class="auth-form active" id="loginForm">
                <div class="form-group">
                    <label class="form-label">Имя пользователя</label>
                    <input type="text" class="form-input" id="loginUsername" placeholder="Введите имя пользователя">
                </div>
                <div class="form-group">
                    <label class="form-label">Пароль</label>
                    <input type="password" class="form-input" id="loginPassword" placeholder="Введите пароль">
                </div>
                <button class="auth-button" onclick="login()">Войти в систему</button>
                <div style="text-align: center; margin-top: 20px; color: var(--text-muted); font-size: 14px;">
                    Демо доступ: testuser / 123456
                </div>
            </div>

            <!-- Register Form -->
            <div class="auth-form" id="registerForm">
                <div class="form-group">
                    <label class="form-label">Имя пользователя</label>
                    <input type="text" class="form-input" id="registerUsername" placeholder="Придумайте имя пользователя">
                </div>
                <div class="form-group">
                    <label class="form-label">Пароль</label>
                    <input type="password" class="form-input" id="registerPassword" placeholder="Создайте надежный пароль">
                </div>
                <button class="auth-button" onclick="register()">Создать аккаунт</button>
            </div>
        </div>
    </div>

    <!-- Main App -->
    <div class="app-container" id="appContainer">
        <!-- Mobile Header -->
        <div class="mobile-header">
            <button class="mobile-menu-btn">☰</button>
            <div class="channel-title"># general</div>
        </div>

        <!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <div class="user-profile">
                    <div class="user-avatar" id="userAvatar">U</div>
                    <div class="user-info">
                        <h3 id="userName">Пользователь</h3>
                        <div class="user-status">
                            <div class="status-dot"></div>
                            <span>В сети</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="channels-section">
                <div class="section-title">Текстовые каналы</div>
                <div class="channel-list">
                    <div class="channel-item active">
                        <span class="channel-icon">#</span>
                        general
                    </div>
                    <div class="channel-item">
                        <span class="channel-icon">#</span>
                        random
                    </div>
                    <div class="channel-item">
                        <span class="channel-icon">#</span>
                        support
                    </div>
                </div>

                <div class="section-title" style="margin-top: 32px;">Голосовые каналы</div>
                <div class="channel-list">
                    <div class="channel-item">
                        <span class="channel-icon">🔊</span>
                        General Voice
                    </div>
                    <div class="channel-item">
                        <span class="channel-icon">🔊</span>
                        Gaming
                    </div>
                </div>
            </div>
        </div>

        <!-- Chat Area -->
        <div class="chat-area">
            <div class="chat-header">
                <div class="channel-header">
                    <span class="channel-hashtag">#</span>
                    <span class="channel-title">general</span>
                </div>
                <div class="channel-description">Общий канал для общения</div>
            </div>

            <div class="messages-container" id="messagesContainer">
                <div class="message fade-in">
                    <div class="message-avatar">🤖</div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-username">NeoConnect Bot</span>
                            <span class="message-time" id="currentTime"></span>
                        </div>
                        <div class="message-text">Добро пожаловать в NeoConnect! Начните общение с сообщения ниже.</div>
                    </div>
                </div>
            </div>

            <div class="input-area">
                <div class="message-input-container">
                    <textarea 
                        class="message-input" 
                        id="messageInput" 
                        placeholder="Написать сообщение в #general"
                        rows="1"
                        disabled
                    ></textarea>
                </div>
            </div>
        </div>

        <!-- Members Sidebar -->
        <div class="members-sidebar">
            <div class="members-header">Участники — <span id="onlineCount">0</span></div>
            <div class="members-list" id="membersList">
                <!-- Members will be populated here -->
            </div>
        </div>
    </div>

    <script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
    <script>
        class NeoConnect {
            constructor() {
                this.socket = null;
                this.currentUser = null;
                this.isConnected = false;
                
                this.initializeElements();
                this.setupEventListeners();
                this.startClock();
            }

            initializeElements() {
                // Auth elements
                this.authScreen = document.getElementById('authScreen');
                this.appContainer = document.getElementById('appContainer');
                this.loginForm = document.getElementById('loginForm');
                this.registerForm = document.getElementById('registerForm');
                
                // Login form
                this.loginUsername = document.getElementById('loginUsername');
                this.loginPassword = document.getElementById('loginPassword');
                
                // Register form
                this.registerUsername = document.getElementById('registerUsername');
                this.registerPassword = document.getElementById('registerPassword');
                
                // Chat elements
                this.messagesContainer = document.getElementById('messagesContainer');
                this.messageInput = document.getElementById('messageInput');
                this.membersList = document.getElementById('membersList');
                this.onlineCount = document.getElementById('onlineCount');
                this.currentTime = document.getElementById('currentTime');
                
                // User info
                this.userName = document.getElementById('userName');
                this.userAvatar = document.getElementById('userAvatar');
            }

            setupEventListeners() {
                // Message input
                this.messageInput.addEventListener('input', this.autoResize.bind(this));
                this.messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                });

                // Mobile menu
                document.querySelector('.mobile-menu-btn').addEventListener('click', () => {
                    this.toggleSidebar();
                });
            }

            async login() {
                const username = this.loginUsername.value.trim();
                const password = this.loginPassword.value.trim();

                if (!username || !password) {
                    this.showNotification('Заполните все поля', 'error');
                    return;
                }

                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, password })
                    });

                    const data = await response.json();

                    if (data.success) {
                        this.currentUser = data.user;
                        this.connectToServer();
                        this.authScreen.style.display = 'none';
                        this.appContainer.style.display = 'grid';
                        this.updateUserInfo();
                        this.showNotification('Успешный вход!', 'success');
                    } else {
                        this.showNotification(data.error, 'error');
                    }
                } catch (error) {
                    this.showNotification('Ошибка подключения к серверу', 'error');
                }
            }

            async register() {
                const username = this.registerUsername.value.trim();
                const password = this.registerPassword.value.trim();

                if (!username || !password) {
                    this.showNotification('Заполните все поля', 'error');
                    return;
                }

                if (password.length < 6) {
                    this.showNotification('Пароль должен быть не менее 6 символов', 'error');
                    return;
                }

                try {
                    const response = await fetch('/api/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, password })
                    });

                    const data = await response.json();

                    if (data.success) {
                        this.showNotification('Регистрация успешна!', 'success');
                        showAuthForm('login');
                        this.registerUsername.value = '';
                        this.registerPassword.value = '';
                    } else {
                        this.showNotification(data.error, 'error');
                    }
                } catch (error) {
                    this.showNotification('Ошибка подключения к серверу', 'error');
                }
            }

            connectToServer() {
                this.socket = io(window.location.origin);

                this.socket.on('connect', () => {
                    this.isConnected = true;
                    this.socket.emit('user_authenticated', this.currentUser);
                    this.enableChat();
                });

                this.socket.on('disconnect', () => {
                    this.isConnected = false;
                    this.disableChat();
                    this.showNotification('Потеряно соединение с сервером', 'error');
                });

                this.socket.on('message_history', (messages) => {
                    this.displayMessageHistory(messages);
                });

                this.socket.on('new_message', (message) => {
                    this.displayMessage(message);
                    this.scrollToBottom();
                });

                this.socket.on('user_joined', (data) => {
                    this.displaySystemMessage(data.message);
                    this.showNotification(`${data.username} присоединился к чату`, 'info');
                });

                this.socket.on('user_left', (data) => {
                    this.displaySystemMessage(data.message);
                });

                this.socket.on('online_users', (users) => {
                    this.updateOnlineUsers(users);
                });
            }

            sendMessage() {
                const content = this.messageInput.value.trim();
                if (!content || !this.isConnected) return;

                this.socket.emit('send_message', { content });
                this.messageInput.value = '';
                this.autoResize();
            }

            displayMessage(message) {
                const messageElement = document.createElement('div');
                messageElement.className = 'message fade-in';
                
                const time = new Date(message.created_at).toLocaleTimeString();
                const avatarText = message.avatar || message.username.charAt(0).toUpperCase();
                
                messageElement.innerHTML = `
                    <div class="message-avatar">${avatarText}</div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-username">${this.escapeHtml(message.username)}</span>
                            <span class="message-time">${time}</span>
                        </div>
                        <div class="message-text">${this.escapeHtml(message.content)}</div>
                    </div>
                `;
                
                this.messagesContainer.appendChild(messageElement);
            }

            displayMessageHistory(messages) {
                // Clear existing messages except system welcome
                const systemMessage = this.messagesContainer.querySelector('.message:first-child');
                this.messagesContainer.innerHTML = '';
                if (systemMessage) {
                    this.messagesContainer.appendChild(systemMessage);
                }
                
                messages.forEach(message => this.displayMessage(message));
                this.scrollToBottom();
            }

            displaySystemMessage(text) {
                const messageElement = document.createElement('div');
                messageElement.className = 'message fade-in';
                
                messageElement.innerHTML = `
                    <div class="message-avatar">🤖</div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-username">Система</span>
                            <span class="message-time">${new Date().toLocaleTimeString()}</span>
                        </div>
                        <div class="message-text" style="color: var(--text-muted); font-style: italic;">${this.escapeHtml(text)}</div>
                    </div>
                `;
                
                this.messagesContainer.appendChild(messageElement);
                this.scrollToBottom();
            }

            updateOnlineUsers(users) {
                this.membersList.innerHTML = '';
                this.onlineCount.textContent = users.length;
                
                users.forEach(user => {
                    const memberElement = document.createElement('div');
                    memberElement.className = 'member-item fade-in';
                    const avatarText = user.avatar || user.username.charAt(0).toUpperCase();
                    
                    memberElement.innerHTML = `
                        <div class="member-avatar">${avatarText}</div>
                        <div class="member-info">
                            <div class="member-name">${this.escapeHtml(user.username)}</div>
                            <div class="member-status">в сети</div>
                        </div>
                    `;
                    this.membersList.appendChild(memberElement);
                });
            }

            updateUserInfo() {
                if (this.currentUser) {
                    this.userName.textContent = this.currentUser.username;
                    this.userAvatar.textContent = this.currentUser.avatar || 
                                                this.currentUser.username.charAt(0).toUpperCase();
                }
            }

            enableChat() {
                this.messageInput.disabled = false;
                this.messageInput.placeholder = `Написать сообщение в #general`;
                this.messageInput.focus();
            }

            disableChat() {
                this.messageInput.disabled = true;
                this.messageInput.placeholder = 'Подключение...';
            }

            autoResize() {
                this.messageInput.style.height = 'auto';
                this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
            }

            scrollToBottom() {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }

            toggleSidebar() {
                const sidebar = document.querySelector('.sidebar');
                sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
            }

            showNotification(message, type = 'info') {
                // Simple notification implementation
                console.log(`[${type.toUpperCase()}] ${message}`);
                // You can add a proper notification system here
            }

            startClock() {
                setInterval(() => {
                    this.currentTime.textContent = new Date().toLocaleTimeString();
                }, 1000);
            }

            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
        }

        // Global functions for auth forms
        function showAuthForm(form) {
            document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(form + 'Form').classList.add('active');
        }

        function login() {
            app.login();
        }

        function register() {
            app.register();
        }

        // Initialize app
        let app;
        document.addEventListener('DOMContentLoaded', () => {
            app = new NeoConnect();
            
            // Enter key for auth forms
            document.getElementById('loginPassword').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') login();
            });
            document.getElementById('registerPassword').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') register();
            });
        });
    </script>
</body>
</html>
