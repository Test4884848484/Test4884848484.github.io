// 🔧 КОНФИГУРАЦИЯ
const API_URL = 'https://my-backend-production-9034.up.railway.app/api';

let currentUser = null;
let telegramUserData = null;
let clickerCoins = 0;
let clickCount = 0;

// 🔧 ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ МОНЕТ В БАЗУ
async function saveCoinsToDatabase(userId, coins) {
  try {
    const response = await fetch(`${API_URL}/user/${userId}/balance`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ balance: coins })
    });

    if (!response.ok) {
      throw new Error('Ошибка сохранения в базу');
    }

    const updatedUser = await response.json();
    return updatedUser;
  } catch (error) {
    console.error('Error saving coins:', error);
    throw error;
  }
}

// 🔧 ОБНОВИТЬ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
async function updateUserProfile(userId, userData) {
  try {
    const response = await fetch(`${API_URL}/user/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) throw new Error('Ошибка обновления профиля');
    return await response.json();
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

// 🔧 ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
async function loadUserProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const telegramUserId = urlParams.get('tg');

  if (!telegramUserId) {
    showWarningMessage();
    return;
  }

  try {
    // Загружаем данные пользователя
    const response = await fetch(`${API_URL}/user/${telegramUserId}`);
    if (!response.ok) throw new Error('Ошибка загрузки профиля');
    
    currentUser = await response.json();
    renderUserProfile();
    initGames();
    
  } catch (error) {
    console.error('Error loading user:', error);
    showErrorMessage();
  }
}

// 🔧 СОХРАНЕНИЕ МОНЕТ ИЗ ИГРЫ
async function saveCoins() {
  if (!currentUser || clickerCoins === 0) {
    showStatus('❌ Нет монет для сохранения', 'error');
    return;
  }

  try {
    // Сохраняем монеты в базу
    const newBalance = currentUser.balance + clickerCoins;
    const updatedUser = await saveCoinsToDatabase(currentUser.user_id, newBalance);
    
    // Обновляем текущего пользователя
    currentUser = updatedUser;
    
    showStatus(`🎉 Сохранено ${clickerCoins} монет! Новый баланс: ${newBalance}`, 'success');
    
    // Сбрасываем счетчики и обновляем интерфейс
    clickerCoins = 0;
    clickCount = 0;
    updateGameStats();
    renderUserProfile();
    
  } catch (error) {
    showStatus('❌ Ошибка сохранения монет', 'error');
  }
}

// 🔧 ИНИЦИАЛИЗАЦИЯ ИГРЫ
function initGames() {
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

// 🔧 ОТОБРАЖЕНИЕ ПРОФИЛЯ
function renderUserProfile() {
  if (!currentUser) return;

  const userProfile = document.getElementById('userProfile');
  userProfile.innerHTML = `
    <div class="profile-card">
      <div class="profile-header">
        <img src="${currentUser.photo_url || 'https://via.placeholder.com/100/667eea/ffffff?text=TG'}" 
             alt="Avatar" class="profile-avatar">
        <div class="profile-info">
          <h2>${currentUser.first_name} ${currentUser.last_name || ''}</h2>
          <p class="username">@${currentUser.username || 'без username'}</p>
          <div class="user-badge">🆔 ID: ${currentUser.user_id}</div>
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
                 value="https://t.me/CS2DropZone_bot?start=${currentUser.referral_code}" 
                 readonly>
          <button onclick="copyReferralLink()">📋</button>
        </div>
        <p class="referral-info">💵 За каждого друга: +10 монет!</p>
      </div>

      <div class="game-stats-current">
        <h4>🎮 Текущая игра</h4>
        <p>Кликов: <strong>${clickCount}</strong> | Монет: <strong>${clickerCoins}</strong></p>
        <button onclick="saveCoins()" class="save-btn">💾 Сохранить монеты в базу</button>
      </div>
    </div>
  `;
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
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
}

function showWarningMessage() {
  const userProfile = document.getElementById('userProfile');
  userProfile.innerHTML = `
    <div class="warning">
      <h3>⚠️ Откройте через Telegram бота</h3>
      <p>Для работы с играми и сохранения прогресса откройте сайт через бота:</p>
      <p><strong>@CS2DropZone_bot</strong></p>
      <div class="test-buttons">
        <button onclick="testWithUser(6311564665)">🧪 Тест: User 1</button>
        <button onclick="testWithUser(6525927982)">🧪 Тест: User 2</button>
      </div>
    </div>
  `;
}

function showErrorMessage() {
  const userProfile = document.getElementById('userProfile');
  userProfile.innerHTML = `
    <div class="error">
      <p>❌ Ошибка загрузки профиля</p>
      <button onclick="loadUserProfile()">🔄 Повторить</button>
    </div>
  `;
}

// 🔧 ТЕСТОВЫЕ ФУНКЦИИ
async function testWithUser(userId) {
  try {
    const response = await fetch(`${API_URL}/user/${userId}`);
    if (response.ok) {
      currentUser = await response.json();
      renderUserProfile();
      initGames();
    } else {
      showStatus('❌ Пользователь не найден в базе', 'error');
    }
  } catch (error) {
    showStatus('❌ Ошибка тестирования', 'error');
  }
}

// 🔧 ЗАГРУЗКА ПРИ ЗАПУСКЕ
document.addEventListener('DOMContentLoaded', loadUserProfile);
