// 🔧 КОНФИГУРАЦИЯ
const API_URL = 'https://my-backend-production-9034.up.railway.app/api';

// Элементы DOM
const userProfile = document.getElementById('userProfile');
const gameSection = document.getElementById('gameSection');
const statusDiv = document.getElementById('status');

let currentUser = null;
let telegramUserData = null;

// 🔧 ФУНКЦИЯ ДЛЯ ПАРСИНГА TELEGRAM WEB APP DATA
function parseTelegramData() {
    // Проверяем есть ли данные от Telegram Web App
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const tgWebAppData = urlParams.get('tgWebAppData');
    
    if (tgWebAppData) {
        try {
            // Парсим данные от Telegram
            const decodedData = new URLSearchParams(tgWebAppData);
            const userJson = decodedData.get('user');
            if (userJson) {
                return JSON.parse(decodeURIComponent(userJson));
            }
        } catch (e) {
            console.error('Error parsing Telegram data:', e);
        }
    }
    
    // Альтернативный способ для тестирования
    const urlSearchParams = new URLSearchParams(window.location.search);
    const testUserId = urlSearchParams.get('tg');
    
    if (testUserId) {
        return {
            id: parseInt(testUserId),
            first_name: "Test User",
            username: "testuser"
        };
    }
    
    return null;
}

// 🔧 ФУНКЦИЯ ДЛЯ ПРОВЕРКИ TELEGRAM WEB APP
function isTelegramWebApp() {
    return window.Telegram && window.Telegram.WebApp || 
           window.location.hash.includes('tgWebAppData') ||
           window.location.search.includes('tg=');
}

// 🔧 ИНИЦИАЛИЗАЦИЯ TELEGRAM WEB APP
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        // Официальный Telegram Web App
        const tg = window.Telegram.WebApp;
        
        // Показываем основной интерфейс
        tg.expand();
        tg.enableClosingConfirmation();
        
        // Получаем данные пользователя
        telegramUserData = tg.initDataUnsafe.user;
        
        console.log('✅ Telegram Web App detected:', telegramUserData);
        return true;
    } else {
        // Проверяем данные в URL (для тестирования)
        telegramUserData = parseTelegramData();
        if (telegramUserData) {
            console.log('✅ Telegram data from URL:', telegramUserData);
            return true;
        }
    }
    
    return false;
}

// 🔧 ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
async function loadUserProfile() {
    const isTelegram = initTelegramWebApp();
    
    if (!isTelegram || !telegramUserData) {
        userProfile.innerHTML = `
            <div class="warning">
                <h3>⚠️ Откройте через Telegram</h3>
                <p>Для полного доступа к функциям откройте это приложение через Telegram бота.</p>
                <div class="test-buttons">
                    <button onclick="testWithUser(123456789)">🧪 Тест: User 1</button>
                    <button onclick="testWithUser(987654321)">🧪 Тест: User 2</button>
                </div>
            </div>
        `;
        return;
    }

    try {
        // Регистрируем/получаем пользователя
        const userData = {
            user_id: telegramUserData.id,
            username: telegramUserData.username,
            first_name: telegramUserData.first_name,
            last_name: telegramUserData.last_name || '',
            photo_url: telegramUserData.photo_url
        };

        const response = await fetch(`${API_URL}/user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки профиля');
        
        currentUser = await response.json();
        renderUserProfile();
        initGames();
        
    } catch (error) {
        console.error('Error loading user:', error);
        userProfile.innerHTML = `
            <div class="error">
                <p>❌ Ошибка загрузки профиля</p>
                <button onclick="loadUserProfile()">🔄 Повторить</button>
            </div>
        `;
    }
}

// 🔧 ОТОБРАЖЕНИЕ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
function renderUserProfile() {
    if (!currentUser) return;

    userProfile.innerHTML = `
        <div class="profile-card">
            <div class="profile-header">
                <img src="${currentUser.photo_url || 'https://via.placeholder.com/100/667eea/ffffff?text=TG'}" 
                     alt="Avatar" class="profile-avatar">
                <div class="profile-info">
                    <h2>${currentUser.first_name} ${currentUser.last_name || ''}</h2>
                    <p class="username">@${currentUser.username || 'без username'}</p>
                    <div class="user-badge">✅ Telegram User</div>
                </div>
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
                <div class="stat">
                    <span class="stat-value">${(currentUser.referral_count || 0) * 10}</span>
                    <span class="stat-label">💰 Заработано</span>
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

// 🔧 ФУНКЦИИ ДЛЯ ИГР
function initGames() {
    if (!currentUser) return;
    
    // Инициализация игр
    initClickerGame();
}

let clickerCoins = 0;
let clickCount = 0;

function initClickerGame() {
    const clickerCoin = document.getElementById('clickerCoin');
    if (clickerCoin) {
        clickerCoin.onclick = function() {
            clickCount++;
            clickerCoins++;
            updateGameStats();
            
            // Анимация клика
            this.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 100);
        };
    }
}

function updateGameStats() {
    const clickCountElement = document.getElementById('clickCount');
    const coinCountElement = document.getElementById('coinCount');
    
    if (clickCountElement) clickCountElement.textContent = clickCount;
    if (coinCountElement) coinCountElement.textContent = clickerCoins;
}

async function saveCoins() {
    if (!currentUser || clickerCoins === 0) {
        showStatus('❌ Нет монет для сохранения', 'error');
        return;
    }

    try {
        // Здесь можно добавить API вызов для сохранения монет
        showStatus(`🎉 Сохранено ${clickerCoins} монет!`, 'success');
        
        // Сбрасываем счетчики
        clickerCoins = 0;
        clickCount = 0;
        updateGameStats();
        
        // Перезагружаем профиль
        await loadUserProfile();
        
    } catch (error) {
        showStatus('❌ Ошибка сохранения', 'error');
    }
}

// 🔧 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function copyReferralLink() {
    const input = document.getElementById('referralInput');
    if (input) {
        input.select();
        document.execCommand('copy');
        showStatus('📋 Ссылка скопирована!', 'success');
    }
}

function showStatus(message, type = 'success') {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 3000);
    }
}

// 🔧 ТЕСТОВЫЕ ФУНКЦИИ
async function testWithUser(userId) {
    telegramUserData = {
        id: userId,
        first_name: `Test User ${userId}`,
        username: `testuser${userId}`,
        photo_url: null
    };
    
    await loadUserProfile();
}

// 🔧 ЗАГРУЗКА ПРИ ЗАПУСКЕ
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App started');
    console.log('URL:', window.location.href);
    console.log('Telegram WebApp available:', !!window.Telegram);
    
    loadUserProfile();
});
