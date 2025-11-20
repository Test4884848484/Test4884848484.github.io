// 🔧 КОНФИГУРАЦИЯ
const API_URL = 'https://my-backend-production-9034.up.railway.app/api';

// Получаем параметры из URL
const urlParams = new URLSearchParams(window.location.search);
const telegramUserId = urlParams.get('tg');

// Элементы DOM
const messagesList = document.getElementById('messagesList');
const messageInput = document.getElementById('messageInput');
const statusDiv = document.getElementById('status');
const userProfile = document.getElementById('userProfile');

let currentUser = null;

// Загрузка данных пользователя
async function loadUserProfile() {
    if (!telegramUserId) {
        userProfile.innerHTML = '<p>Пожалуйста, откройте приложение через Telegram бота</p>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user/${telegramUserId}`);
        if (!response.ok) throw new Error('Ошибка загрузки профиля');
        
        currentUser = await response.json();
        renderUserProfile();
        
    } catch (error) {
        userProfile.innerHTML = '<p>Ошибка загрузки профиля</p>';
    }
}

// Отображение профиля пользователя
function renderUserProfile() {
    if (!currentUser) return;

    userProfile.innerHTML = `
        <div class="profile-card">
            <div class="profile-header">
                <img src="${currentUser.photo_url || 'https://via.placeholder.com/100'}" 
                     alt="Avatar" class="profile-avatar">
                <h2>${currentUser.first_name} ${currentUser.last_name || ''}</h2>
                <p class="username">@${currentUser.username || 'без username'}</p>
            </div>
            
            <div class="profile-stats">
                <div class="stat">
                    <span class="stat-value">${currentUser.balance}</span>
                    <span class="stat-label">💎 Монет</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${currentUser.referral_count}</span>
                    <span class="stat-label">👥 Рефералов</span>
                </div>
            </div>
            
            <div class="referral-section">
                <h3>🔗 Реферальная ссылка</h3>
                <div class="referral-link">
                    <input type="text" id="referralInput" 
                           value="https://t.me/your_bot_username?start=${currentUser.referral_code}" 
                           readonly>
                    <button onclick="copyReferralLink()">Копировать</button>
                </div>
                <p class="referral-info">💵 За каждого друга: +10 монет!</p>
            </div>
        </div>
    `;
}

// Копирование реферальной ссылки
function copyReferralLink() {
    const input = document.getElementById('referralInput');
    input.select();
    document.execCommand('copy');
    showStatus('Ссылка скопирована!', 'success');
}

// Остальные функции остаются такими же как раньше...
async function loadMessages() {
    try {
        messagesList.innerHTML = '<div class="loading">Загрузка сообщений...</div>';
        
        const response = await fetch(`${API_URL}/messages`);
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const messages = await response.json();
        
        if (messages.length === 0) {
            messagesList.innerHTML = '<div class="loading">Сообщений пока нет</div>';
            return;
        }
        
        messagesList.innerHTML = messages.map(message => `
            <div class="message">
                <div class="message-text">${message.text}</div>
                <div class="message-time">${new Date(message.created_at).toLocaleString()}</div>
                ${currentUser ? `<button class="delete-btn" onclick="deleteMessage(${message.id})">Удалить</button>` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        messagesList.innerHTML = '<div class="loading">Ошибка загрузки сообщений</div>';
        showStatus('Ошибка загрузки сообщений', 'error');
    }
}

async function addMessage() {
    if (!currentUser) {
        showStatus('Войдите через Telegram бота', 'error');
        return;
    }

    const text = messageInput.value.trim();
    
    if (!text) {
        showStatus('Введите сообщение', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, user_id: currentUser.user_id }),
        });
        
        if (!response.ok) throw new Error('Ошибка добавления');
        
        messageInput.value = '';
        showStatus('Сообщение добавлено!');
        await loadMessages();
        
    } catch (error) {
        showStatus('Ошибка добавления сообщения', 'error');
    }
}

async function deleteMessage(id) {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/messages/${id}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Ошибка удаления');
        
        showStatus('Сообщение удалено!');
        await loadMessages();
        
    } catch (error) {
        showStatus('Ошибка удаления сообщения', 'error');
    }
}

function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status';
    }, 3000);
}

// Отправка по Enter
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addMessage();
    }
});

// Загрузка при запуске
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserProfile();
    await loadMessages();
});
