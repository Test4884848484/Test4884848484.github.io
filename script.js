// 🔧 КОНФИГУРАЦИЯ - ТВОЙ URL БЭКЕНДА
const API_URL = 'https://my-backend-production-9034.up.railway.app/api';

// Элементы DOM
const messagesList = document.getElementById('messagesList');
const messageInput = document.getElementById('messageInput');
const statusDiv = document.getElementById('status');

// Показать статус
function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status';
    }, 3000);
}

// Загрузить сообщения
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
                <button class="delete-btn" onclick="deleteMessage(${message.id})">Удалить</button>
            </div>
        `).join('');
        
    } catch (error) {
        messagesList.innerHTML = '<div class="loading">Ошибка загрузки сообщений</div>';
        showStatus('Ошибка загрузки сообщений', 'error');
    }
}

// Добавить сообщение
async function addMessage() {
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
            body: JSON.stringify({ text }),
        });
        
        if (!response.ok) throw new Error('Ошибка добавления');
        
        messageInput.value = '';
        showStatus('Сообщение добавлено!');
        await loadMessages();
        
    } catch (error) {
        showStatus('Ошибка добавления сообщения', 'error');
    }
}

// Удалить сообщение
async function deleteMessage(id) {
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

// Отправка по Enter
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addMessage();
    }
});

// Загрузить сообщения при загрузке страницы
document.addEventListener('DOMContentLoaded', loadMessages);
