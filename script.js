// 🔧 КОНФИГУРАЦИЯ
const API_URL = 'https://my-backend-production-9034.up.railway.app/api';

let currentUser = null;
let userData = {
    balance: 0,
    dailyBonus: {
        count: 0,
        lastClaim: null,
        currentReward: 10
    },
    quests: {
        subscribe: { completed: 0, lastClaim: null },
        name: { completed: 0, lastClaim: null },
        refDesc: { completed: 0, lastClaim: null }
    },
    referrals: 0,
    casesOpened: 0,
    inventory: []
};

// 🔧 ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    initNavigation();
    initQuests();
    initModal();
    startTimers();
});

// 🔧 ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
async function loadUserProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const telegramUserId = urlParams.get('tg');

    if (!telegramUserId) {
        showWarningMessage();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user/${telegramUserId}`);
        if (!response.ok) throw new Error('Ошибка загрузки профиля');
        
        currentUser = await response.json();
        updateUserData();
        renderProfile();
        
    } catch (error) {
        console.error('Error loading user:', error);
        // Используем тестовые данные
        useTestData();
    }
}

function updateUserData() {
    if (currentUser) {
        userData.balance = currentUser.balance || 0;
        userData.referrals = currentUser.referral_count || 0;
        
        // Загружаем дополнительные данные из localStorage
        const savedData = localStorage.getItem(`userData_${currentUser.user_id}`);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            Object.assign(userData, parsed);
        }
        
        updateUI();
    }
}

function useTestData() {
    currentUser = {
        user_id: 6311564665,
        first_name: "Тестовый",
        last_name: "Пользователь",
        username: "testuser",
        balance: 150,
        referral_count: 3
    };
    updateUserData();
}

// 🔧 ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateUI() {
    // Баланс
    document.getElementById('balance').textContent = userData.balance;
    
    // Ежедневный бонус
    document.getElementById('dailyReward').textContent = userData.dailyBonus.currentReward;
    document.getElementById('dailyCompleted').textContent = userData.dailyBonus.count;
    updateProgressBar('dailyProgress', userData.dailyBonus.count, 7);
    
    // Задания
    document.getElementById('subscribeCompleted').textContent = userData.quests.subscribe.completed;
    updateProgressBar('subscribeProgress', userData.quests.subscribe.completed, 10);
    
    document.getElementById('nameCompleted').textContent = userData.quests.name.completed;
    updateProgressBar('nameProgress', userData.quests.name.completed, 10);
    
    document.getElementById('refDescCompleted').textContent = userData.quests.refDesc.completed;
    updateProgressBar('refDescProgress', userData.quests.refDesc.completed, 10);
    
    // Рефералы
    document.getElementById('referralCount').textContent = userData.referrals;
    updateProgressBar('referralProgress', userData.referrals, 10);
    
    // Игры
    document.getElementById('casesOpened').textContent = userData.casesOpened;
    
    // Профиль
    renderProfile();
}

function updateProgressBar(elementId, current, max) {
    const progress = (current / max) * 100;
    document.getElementById(elementId).style.width = `${progress}%`;
}

// 🔧 НАВИГАЦИЯ
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            // Обновляем активные элементы
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tab).classList.add('active');
            
            // Загружаем контент для вкладки
            loadTabContent(tab);
        });
    });
}

function loadTabContent(tab) {
    switch(tab) {
        case 'games':
            loadGames();
            break;
        case 'inventory':
            loadInventory();
            break;
        case 'profile':
            renderProfile();
            break;
    }
}

// 🔧 ЗАДАНИЯ
function initQuests() {
    // Ежедневный бонус
    document.getElementById('dailyButton').addEventListener('click', claimDailyBonus);
    
    // Подписка на канал
    document.getElementById('subscribeButton').addEventListener('click', checkSubscription);
    
    // Имя бота в фамилии
    document.getElementById('nameButton').addEventListener('click', checkNameInBio);
    
    // Реф. ссылка в описании
    document.getElementById('refDescButton').addEventListener('click', checkRefInDescription);
    document.getElementById('copyRefButton').addEventListener('click', copyReferralLink);
    
    // Рефералы
    document.getElementById('referralButton').addEventListener('click', claimReferralRewards);
}

// 🔧 ЕЖЕДНЕВНЫЙ БОНУС
function startTimers() {
    updateDailyTimer();
    setInterval(updateDailyTimer, 1000);
}

function updateDailyTimer() {
    const now = Date.now();
    const lastClaim = userData.dailyBonus.lastClaim;
    const cooldown = 60 * 1000; // 1 минута
    const button = document.getElementById('dailyButton');
    const timer = document.getElementById('dailyTimer');
    
    if (!lastClaim || (now - lastClaim) >= cooldown) {
        button.disabled = false;
        button.textContent = 'Забрать';
        timer.textContent = 'Доступно сейчас!';
    } else {
        const remaining = cooldown - (now - lastClaim);
        const seconds = Math.ceil(remaining / 1000);
        button.disabled = true;
        button.textContent = 'Забрать';
        timer.textContent = `Доступно через: ${seconds} сек`;
    }
}

async function claimDailyBonus() {
    if (userData.dailyBonus.count >= 7) {
        showStatus('❌ Достигнут лимит бонусов на сегодня', 'error');
        return;
    }
    
    userData.dailyBonus.count++;
    userData.balance += userData.dailyBonus.currentReward;
    userData.dailyBonus.lastClaim = Date.now();
    userData.dailyBonus.currentReward += 10;
    
    showStatus(`🎉 +${userData.dailyBonus.currentReward - 10} монет!`, 'success');
    updateUI();
    saveUserData();
    
    // Обновляем API
    await updateBalance();
}

// 🔧 ПОДПИСКА НА КАНАЛ
async function checkSubscription() {
    // Здесь должна быть логика проверки подписки через Telegram API
    // Временно эмулируем успешную проверку
    
    const quest = userData.quests.subscribe;
    const now = new Date().toDateString();
    
    if (quest.lastClaim === now) {
        showStatus('❌ Уже получали награду сегодня', 'error');
        return;
    }
    
    // Эмуляция проверки - 80% шанс успеха
    const isSubscribed = Math.random() > 0.2;
    
    if (isSubscribed) {
        quest.completed++;
        quest.lastClaim = now;
        userData.balance += 100;
        
        showStatus('🎉 +100 монет за подписку!', 'success');
        updateUI();
        saveUserData();
        await updateBalance();
    } else {
        // Перенаправляем в канал
        window.open('https://t.me/CS2DropZone', '_blank');
        showStatus('📢 Подпишитесь на канал и попробуйте снова', 'info');
    }
}

// 🔧 ИМЯ БОТА В ФАМИЛИИ
async function checkNameInBio() {
    // Здесь должна быть логика проверки через Telegram API
    // Временно показываем модальное окно с инструкциями
    
    showNameQuestModal();
}

function showNameQuestModal() {
    const modal = document.getElementById('questModal');
    const title = document.getElementById('modalTitle');
    const text = document.getElementById('modalText');
    
    title.textContent = 'Имя бота в фамилии';
    text.innerHTML = 'Награда: 50 монет<br><br>Для выполнения этого задания необходимо:';
    
    modal.style.display = 'flex';
}

// 🔧 РЕФ. ССЫЛКА В ОПИСАНИИ
async function checkRefInDescription() {
    // Эмуляция проверки
    const quest = userData.quests.refDesc;
    const now = new Date().toDateString();
    
    if (quest.lastClaim === now) {
        showStatus('❌ Уже получали награду сегодня', 'error');
        return;
    }
    
    const hasRefInBio = Math.random() > 0.3;
    
    if (hasRefInBio) {
        quest.completed++;
        quest.lastClaim = now;
        userData.balance += 20;
        
        showStatus('🎉 +20 монет!', 'success');
        updateUI();
        saveUserData();
        await updateBalance();
    } else {
        showStatus('❌ Реф. ссылка не найдена в описании профиля', 'error');
    }
}

function copyReferralLink() {
    if (!currentUser) return;
    
    const botUsername = 'CS2DropZone_bot';
    const refCode = currentUser.referral_code || `ref_${currentUser.user_id}`;
    const refLink = `https://t.me/${botUsername}?start=${refCode}`;
    
    navigator.clipboard.writeText(refLink).then(() => {
        showStatus('📋 Реф. ссылка скопирована!', 'success');
    });
}

// 🔧 РЕФЕРАЛЫ
async function claimReferralRewards() {
    const rewards = Math.min(userData.referrals, 10) * 100;
    
    if (rewards > 0) {
        userData.balance += rewards;
        showStatus(`🎉 +${rewards} монет за рефералов!`, 'success');
        updateUI();
        saveUserData();
        await updateBalance();
    } else {
        showStatus('❌ Нет доступных наград за рефералов', 'error');
    }
}

// 🔧 ИГРЫ
function loadGames() {
    // Загрузка игр будет реализована позже
    console.log('Loading games...');
}

// 🔧 ИНВЕНТАРЬ
function loadInventory() {
    const inventoryGrid = document.getElementById('inventoryGrid');
    
    // Пример предметов
    const items = [
        { name: 'AK-47 | Redline', price: '1500' },
        { name: 'AWP | Dragon Lore', price: '10000' },
        { name: 'M4A4 | Howl', price: '8000' },
        { name: 'Knife | Fade', price: '12000' },
        { name: 'Gloves | Sport', price: '6000' },
        { name: 'Pistol | Neo-Noir', price: '2000' }
    ];
    
    inventoryGrid.innerHTML = items.map(item => `
        <div class="inventory-item">
            <div class="item-image">🎮</div>
            <div class="item-name">${item.name}</div>
            <div class="item-price">$${item.price}</div>
        </div>
    `).join('');
}

// 🔧 ПРОФИЛЬ
function renderProfile() {
    if (!currentUser) return;
    
    document.getElementById('profileName').textContent = 
        `${currentUser.first_name} ${currentUser.last_name || ''}`;
    document.getElementById('profileBalance').textContent = userData.balance;
    document.getElementById('profileReferrals').textContent = userData.referrals;
    document.getElementById('profileCases').textContent = userData.casesOpened;
    document.getElementById('profileItems').textContent = userData.inventory.length;
    
    // Аватар
    const avatar = document.getElementById('profileAvatar');
    if (currentUser.photo_url) {
        avatar.style.backgroundImage = `url(${currentUser.photo_url})`;
        avatar.textContent = '';
    }
}

// 🔧 МОДАЛЬНОЕ ОКНО
function initModal() {
    const modal = document.getElementById('questModal');
    const closeBtn = document.getElementById('modalClose');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// 🔧 УТИЛИТЫ
function showStatus(message, type = 'success') {
    // Простая реализация уведомлений
    console.log(`${type}: ${message}`);
    alert(message);
}

function saveUserData() {
    if (currentUser) {
        localStorage.setItem(`userData_${currentUser.user_id}`, JSON.stringify(userData));
    }
}

async function updateBalance() {
    if (!currentUser) return;
    
    try {
        await fetch(`${API_URL}/user/${currentUser.user_id}/balance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ balance: userData.balance })
        });
    } catch (error) {
        console.error('Error updating balance:', error);
    }
}

function showWarningMessage() {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="warning">
            <h3>⚠️ Откройте через Telegram бота</h3>
            <p>Для работы с играми откройте сайт через бота:</p>
            <p><strong>@CS2DropZone_bot</strong></p>
        </div>
    `;
}

// 🔧 РОЗЫГРЫШИ
function loadRaffles() {
    const raffleSlider = document.getElementById('raffleSlider');
    
    const raffles = [
        { id: 1, name: 'AK-47 Годовая подписка', endTime: '2024-12-31', participants: 1245 },
        { id: 2, name: 'AWP Элитный кейс', endTime: '2024-12-25', participants: 893 },
        { id: 3, name: 'Нож Легендарный', endTime: '2024-12-20', participants: 2156 }
    ];
    
    raffleSlider.innerHTML = raffles.map(raffle => `
        <div class="raffle-card">
            <div class="raffle-image">${raffle.name}</div>
            <div class="raffle-info">
                <span>⏰ ${raffle.endTime}</span>
                <span>👥 ${raffle.participants}</span>
            </div>
            <button class="raffle-button">Участвовать</button>
        </div>
    `).join('');
}

// Загружаем розыгрыши при старте
loadRaffles();
