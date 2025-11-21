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
    inventory: [],
    level: 1
};

// 🔧 КЕЙСЫ И ПРЕДМЕТЫ
const cases = [
    {
        id: 1,
        name: "Кейс Grunt",
        price: 100,
        image: "https://cs-shot.pro/images/new2/Grunt.png",
        opened: 0,
        items: [
            { name: "AK-47 | Redline", price: "1500", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSIf6GDG6D_uJ_t-l9AX_nzBhw4TvWwo6udC2QbgZyWcN2RuMP4xHrlYDnYezm7geP3d5FyH3gznQeY_Oe4QY" },
            { name: "AWP | Dragon Lore", price: "10000", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwiFO0P_6afBSJeaaAliUwOd7qe5WQyC0nQlp4GqGz42ucCqXaQMhDpd4R-AIsxK6ktXgZePltVPXitoRn3-tjCgd6zErvbijVJZd2Q" }
        ]
    },
    {
        id: 2,
        name: "Кейс Lurk",
        price: 200,
        image: "https://cs-shot.pro/images/new2/Lurk.png",
        opened: 0,
        items: [
            { name: "M4A4 | Howl", price: "8000", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLkjYbf7itX6vytbbZSKOmsHGKU1edxtfNWQyC0nQlptWWEzd-qd3mVbgR2WZYiFuUMtUG7x4HhYeLhs1fZiN1DnC6viH4Y7TErvbgp6HjWjQ" },
            { name: "Knife | Fade", price: "12000", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwi5Hf_jdk4OSrerRsM-OsCXWRx9F3peZWRyyygwRp527cn478dXyXbAJ2DZV2QucK5BDukoexMO3m4QWN2o1Hyiz-ii4bvTErvbhWWiFhog" }
        ]
    },
    {
        id: 3,
        name: "Кейс Vandal",
        price: 300,
        image: "https://cs-shot.pro/images/new2/Vandal.png",
        opened: 0,
        items: [
            { name: "Gloves | Sport", price: "6000", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSMP-aAHOvxedlsfN7TjCMmRQguynLnIz_dXnEbFcoDsNzQLMN40S7mte0Zuzl5gbY34JEnnr52ChA7ytisPFCD_Rw7udDlA" },
            { name: "Pistol | Neo-Noir", price: "2000", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1L-uGmV6VgH_2SHGyVxdFjoN4wHxa_nBovp3OHzomhdC3BbwIiDZV2Ru9ZukK4ld2zYerg4AGNjItExCT52C0c7H0__a9cBh2VpMK4" }
        ]
    }
];

// 🔧 ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    initNavigation();
    initQuests();
    initModal();
    startTimers();
    loadCases();
    loadRaffles();
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
        referral_count: 3,
        photo_url: null
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
    
    // Профиль
    renderProfile();
}

function updateProgressBar(elementId, current, max) {
    const progress = Math.min((current / max) * 100, 100);
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
            loadCases();
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
        showNotification('❌ Достигнут лимит бонусов на сегодня', 'error');
        return;
    }
    
    userData.dailyBonus.count++;
    userData.balance += userData.dailyBonus.currentReward;
    userData.dailyBonus.lastClaim = Date.now();
    userData.dailyBonus.currentReward += 10;
    
    showNotification(`🎉 +${userData.dailyBonus.currentReward - 10} монет!`, 'success');
    updateUI();
    saveUserData();
    
    // Обновляем API
    await updateBalance();
}

// 🔧 ПОДПИСКА НА КАНАЛ
async function checkSubscription() {
    const quest = userData.quests.subscribe;
    const now = new Date().toDateString();
    
    if (quest.lastClaim === now) {
        showNotification('❌ Уже получали награду сегодня', 'error');
        return;
    }
    
    // В реальном приложении здесь будет проверка через Telegram API
    // Пока используем эмуляцию с 70% шансом успеха
    const isSubscribed = await simulateTelegramCheck('channel_subscription');
    
    if (isSubscribed) {
        quest.completed++;
        quest.lastClaim = now;
        userData.balance += 100;
        
        showNotification('🎉 +100 монет за подписку!', 'success');
        updateUI();
        saveUserData();
        await updateBalance();
    } else {
        // Перенаправляем в канал
        window.open('https://t.me/CS2DropZone', '_blank');
        showNotification('📢 Подпишитесь на канал и попробуйте снова', 'info');
    }
}

// 🔧 ИМЯ БОТА В ФАМИЛИИ
async function checkNameInBio() {
    // В реальном приложении здесь будет проверка через Telegram API
    const hasBotInName = await simulateTelegramCheck('bot_in_bio');
    
    if (hasBotInName) {
        const quest = userData.quests.name;
        const now = new Date().toDateString();
        
        if (quest.lastClaim === now) {
            showNotification('❌ Уже получали награду сегодня', 'error');
            return;
        }
        
        quest.completed++;
        quest.lastClaim = now;
        userData.balance += 50;
        
        showNotification('🎉 +50 монет! Бот найден в фамилии', 'success');
        updateUI();
        saveUserData();
        await updateBalance();
    } else {
        showNameQuestModal();
    }
}

// 🔧 РЕФ. ССЫЛКА В ОПИСАНИИ
async function checkRefInDescription() {
    const quest = userData.quests.refDesc;
    const now = new Date().toDateString();
    
    if (quest.lastClaim === now) {
        showNotification('❌ Уже получали награду сегодня', 'error');
        return;
    }
    
    // В реальном приложении здесь будет проверка через Telegram API
    const hasRefInBio = await simulateTelegramCheck('ref_in_bio');
    
    if (hasRefInBio) {
        quest.completed++;
        quest.lastClaim = now;
        userData.balance += 20;
        
        showNotification('🎉 +20 монет! Реф. ссылка найдена', 'success');
        updateUI();
        saveUserData();
        await updateBalance();
    } else {
        showNotification('❌ Реф. ссылка не найдена в описании профиля', 'error');
    }
}

// 🔧 ЭМУЛЯЦИЯ ПРОВЕРКИ TELEGRAM
async function simulateTelegramCheck(type) {
    // В реальном приложении здесь будет вызов Telegram API
    // Пока используем случайный результат с разной вероятностью
    
    const probabilities = {
        'channel_subscription': 0.7,    // 70% шанс что подписан
        'bot_in_bio': 0.4,              // 40% шанс что добавил бота в фамилию
        'ref_in_bio': 0.3               // 30% шанс что добавил реф. ссылку
    };
    
    return Math.random() < probabilities[type];
}

function copyReferralLink() {
    if (!currentUser) return;
    
    const botUsername = 'CS2DropZone_bot';
    const refCode = currentUser.referral_code || `ref_${currentUser.user_id}`;
    const refLink = `https://t.me/${botUsername}?start=${refCode}`;
    
    navigator.clipboard.writeText(refLink).then(() => {
        showNotification('📋 Реф. ссылка скопирована!', 'success');
    });
}

// 🔧 РЕФЕРАЛЫ
async function claimReferralRewards() {
    const rewards = Math.min(userData.referrals, 10) * 100;
    
    if (rewards > 0) {
        userData.balance += rewards;
        showNotification(`🎉 +${rewards} монет за рефералов!`, 'success');
        updateUI();
        saveUserData();
        await updateBalance();
    } else {
        showNotification('❌ Нет доступных наград за рефералов', 'error');
    }
}

// 🔧 КЕЙСЫ
function loadCases() {
    const casesGrid = document.getElementById('casesGrid');
    
    casesGrid.innerHTML = cases.map(caseItem => `
        <div class="case-card" onclick="openCase(${caseItem.id})">
            <div class="case-image">
                <img src="${caseItem.image}" alt="${caseItem.name}" onerror="this.style.display='none'; this.parentNode.innerHTML='${caseItem.name}';">
            </div>
            <div class="case-title">${caseItem.name}</div>
            <div class="case-price">💎 ${caseItem.price} монет</div>
            <div class="case-stats">Открыто: ${caseItem.opened} раз</div>
        </div>
    `).join('');
}

function openCase(caseId) {
    const caseItem = cases.find(c => c.id === caseId);
    if (!caseItem) return;
    
    if (userData.balance < caseItem.price) {
        showNotification('❌ Недостаточно монет для открытия кейса', 'error');
        return;
    }
    
    // Спиним кейс
    const randomItem = caseItem.items[Math.floor(Math.random() * caseItem.items.length)];
    
    // Вычитаем стоимость
    userData.balance -= caseItem.price;
    caseItem.opened++;
    userData.casesOpened++;
    
    // Добавляем предмет в инвентарь
    userData.inventory.push(randomItem);
    
    showNotification(`🎉 Вы выиграли: ${randomItem.name}!`, 'success');
    updateUI();
    saveUserData();
    updateBalance();
    
    // Обновляем инвентарь если открыта вкладка
    if (document.getElementById('inventory').classList.contains('active')) {
        loadInventory();
    }
}

// 🔧 ИНВЕНТАРЬ
function loadInventory() {
    const inventoryGrid = document.getElementById('inventoryGrid');
    
    if (userData.inventory.length === 0) {
        inventoryGrid.innerHTML = '<div style="text-align: center; padding: 40px; opacity: 0.7;">Инвентарь пуст</div>';
        return;
    }
    
    inventoryGrid.innerHTML = userData.inventory.map(item => `
        <div class="inventory-item">
            <div class="item-image">
                <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'; this.parentNode.innerHTML='🎮';">
            </div>
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
    document.getElementById('profileUsername').textContent = 
        `@${currentUser.username || 'username'}`;
    document.getElementById('profileBalance').textContent = userData.balance;
    document.getElementById('profileReferrals').textContent = userData.referrals;
    document.getElementById('profileCases').textContent = userData.casesOpened;
    document.getElementById('profileItems').textContent = userData.inventory.length;
    document.getElementById('profileLevel').textContent = userData.level;
    
    // Аватар
    const avatar = document.getElementById('profileAvatar');
    if (currentUser.photo_url) {
        avatar.innerHTML = `<img src="${currentUser.photo_url}" alt="Avatar">`;
    }
}

// 🔧 МОДАЛЬНОЕ ОКНО
function initModal() {
    const modal = document.getElementById('questModal');
    const closeBtn = document.getElementById('modalClose');
    const checkBtn = document.getElementById('modalCheck');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    checkBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        checkNameInBio();
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function showNameQuestModal() {
    const modal = document.getElementById('questModal');
    const title = document.getElementById('modalTitle');
    const text = document.getElementById('modalText');
    
    title.textContent = 'Имя бота в фамилии';
    text.innerHTML = 'Награда: 50 монет<br><br>Для выполнения этого задания необходимо:';
    
    modal.style.display = 'flex';
}

// 🔧 РОЗЫГРЫШИ
function loadRaffles() {
    const raffleSlider = document.getElementById('raffleSlider');
    
    const raffles = [
        { id: 1, name: 'AK-47 | Годовая подписка', endTime: '2024-12-31', participants: 1245 },
        { id: 2, name: 'AWP | Элитный кейс', endTime: '2024-12-25', participants: 893 },
        { id: 3, name: 'Нож | Легендарный', endTime: '2024-12-20', participants: 2156 }
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

// 🔧 УТИЛИТЫ
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.background = type === 'error' ? 'rgba(220, 53, 69, 0.95)' : 
                                  type === 'info' ? 'rgba(23, 162, 184, 0.95)' : 
                                  'rgba(255, 107, 53, 0.95)';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
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
        <div style="text-align: center; padding: 50px 20px; color: white;">
            <h3 style="color: #ff6b35; margin-bottom: 20px;">⚠️ Откройте через Telegram бота</h3>
            <p style="margin-bottom: 10px;">Для работы с играми откройте сайт через бота:</p>
            <p style="font-weight: bold; font-size: 18px; color: #ffd700;">@CS2DropZone_bot</p>
        </div>
    `;
}
