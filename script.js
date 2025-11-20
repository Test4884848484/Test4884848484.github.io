// 🔧 КОНФИГУРАЦИЯ
const API_URL = 'https://my-backend-production-9034.up.railway.app/api';

// Получаем параметры из URL
const urlParams = new URLSearchParams(window.location.search);
const telegramUserId = urlParams.get('tg');

// Элементы DOM
const userProfile = document.getElementById('userProfile');
const gameSection = document.getElementById('gameSection');
const statusDiv = document.getElementById('status');

let currentUser = null;

// Загрузка данных пользователя
async function loadUserProfile() {
    if (!telegramUserId) {
        userProfile.innerHTML = `
            <div class="warning">
                <h3>⚠️ Доступ через Telegram</h3>
                <p>Пожалуйста, откройте это приложение через Telegram бота для полного доступа к функциям.</p>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user/${telegramUserId}`);
        if (!response.ok) throw new Error('Ошибка загрузки профиля');
        
        currentUser = await response.json();
        renderUserProfile();
        
    } catch (error) {
        userProfile.innerHTML = '<p>❌ Ошибка загрузки профиля</p>';
    }
}

// Отображение профиля пользователя
function renderUserProfile() {
    if (!currentUser) return;

    userProfile.innerHTML = `
        <div class="profile-card">
            <div class="profile-header">
                <img src="${currentUser.photo_url || 'https://via.placeholder.com/100/667eea/ffffff?text=TG'}" 
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
                    <span class="stat-value">${currentUser.referral_count || 0}</span>
                    <span class="stat-label">👥 Рефералов</span>
                </div>
            </div>
            
            <div class="referral-section">
                <h3>🔗 Реферальная ссылка</h3>
                <div class="referral-link">
                    <input type="text" id="referralInput" 
                           value="https://t.me/your_bot_username?start=${currentUser.referral_code}" 
                           readonly>
                    <button onclick="copyReferralLink()">📋</button>
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
    showStatus('Ссылка скопирована в буфер!', 'success');
}

// Простая игра для заработка монет
function startGame() {
    if (!currentUser) {
        showStatus('Войдите через Telegram бота', 'error');
        return;
    }

    // Простая игра - кликер
    let coins = 0;
    
    gameSection.innerHTML = `
        <div class="game-container">
            <h3>🎮 Простая игра</h3>
            <p>Нажимай на кнопку чтобы зарабатывать монеты!</p>
            <div class="game-stats">
                <span>Монеты: <span id="coinCount">0</span></span>
            </div>
            <button class="game-button" onclick="clickCoin()">🪙 Нажми меня!</button>
            <button class="save-button" onclick="saveCoins()">💾 Сохранить монеты</button>
        </div>
    `;
}

let gameCoins = 0;

function clickCoin() {
    if (!currentUser) return;
    
    gameCoins++;
    document.getElementById('coinCount').textContent = gameCoins;
}

async function saveCoins() {
    if (!currentUser || gameCoins === 0) return;

    try {
        // Здесь можно добавить логику сохранения монет в базу
        showStatus(`🎉 Сохранено ${gameCoins} монет!`, 'success');
        gameCoins = 0;
        document.getElementById('coinCount').textContent = '0';
        
        // Перезагружаем профиль для обновления баланса
        await loadUserProfile();
        
    } catch (error) {
        showStatus('❌ Ошибка сохранения', 'error');
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

// Загрузка при запуске
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserProfile();
    
    // Показываем кнопку игры если пользователь авторизован
    if (telegramUserId) {
        document.getElementById('playButton').style.display = 'block';
    }
});
