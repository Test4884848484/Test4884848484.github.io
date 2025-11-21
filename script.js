// 🔧 КОНФИГУРАЦИЯ
const API_URL = 'https://my-backend-production-9034.up.railway.app/api';

let currentUser = null;
let userData = {};
let currentRaffleIndex = 0;
let currentCase = null;

// 🔧 ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    initNavigation();
    initQuests();
    initModal();
    initRoulette();
    initRaffleControls();
    startTimers();
});

// 🔧 ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ С ФОТО
async function loadUserProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const telegramUserId = urlParams.get('tg');

    if (!telegramUserId) {
        showWarningMessage();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user/full/${telegramUserId}`);
        if (!response.ok) throw new Error('Ошибка загрузки профиля');
        
        const fullData = await response.json();
        currentUser = fullData.user;
        userData = fullData.data;
        
        renderProfile();
        updateUI();
        loadCases();
        loadRaffles();
        loadInventory();
        
    } catch (error) {
        console.error('Error loading user:', error);
        useTestData();
    }
}

// 🔧 СОХРАНЕНИЕ ДАННЫХ В БАЗУ
async function saveUserData() {
    if (!currentUser) return;
    
    try {
        await fetch(`${API_URL}/user/data/${currentUser.user_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// 🔧 ОБНОВЛЕНИЕ БАЛАНСА В БАЗЕ
async function updateBalance(newBalance) {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/user/${currentUser.user_id}/balance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ balance: newBalance })
        });
        
        if (response.ok) {
            // Обновляем локальные данные
            userData.balance = newBalance;
            await saveUserData(); // Сохраняем все данные
        }
    } catch (error) {
        console.error('Error updating balance:', error);
    }
}

// 🔧 ДОБАВИТЬ ПРЕДМЕТ В ИНВЕНТАРЬ В БАЗУ
async function addToInventory(item) {
    if (!currentUser) return;
    
    try {
        await fetch(`${API_URL}/user/inventory/${currentUser.user_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
    } catch (error) {
        console.error('Error adding to inventory:', error);
    }
}

// 🔧 ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateUI() {
    if (!userData.daily_bonus) return;
    
    // Баланс
    document.getElementById('balance').textContent = userData.balance;
    
    // Ежедневный бонус
    const dailyBonus = userData.daily_bonus;
    document.getElementById('dailyReward').textContent = dailyBonus.current_reward;
    document.getElementById('dailyCompleted').textContent = dailyBonus.count;
    updateProgressBar('dailyProgress', dailyBonus.count, 7);
    
    // Задания
    const quests = userData.quests || {};
    document.getElementById('subscribeCompleted').textContent = quests.subscribe?.completed || 0;
    updateProgressBar('subscribeProgress', quests.subscribe?.completed || 0, 10);
    
    document.getElementById('nameCompleted').textContent = quests.name?.completed || 0;
    updateProgressBar('nameProgress', quests.name?.completed || 0, 10);
    
    document.getElementById('refDescCompleted').textContent = quests.ref_desc?.completed || 0;
    updateProgressBar('refDescProgress', quests.ref_desc?.completed || 0, 10);
    
    // Рефералы
    document.getElementById('referralCount').textContent = userData.referrals || 0;
    updateProgressBar('referralProgress', userData.referrals || 0, 10);
}

function updateProgressBar(elementId, current, max) {
    const progress = Math.min((current / max) * 100, 100);
    const element = document.getElementById(elementId);
    if (element) {
        element.style.width = `${progress}%`;
    }
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
    document.getElementById('dailyButton').addEventListener('click', claimDailyBonus);
    document.getElementById('subscribeButton').addEventListener('click', checkSubscription);
    document.getElementById('nameButton').addEventListener('click', checkNameInBio);
    document.getElementById('refDescButton').addEventListener('click', checkRefInDescription);
    document.getElementById('copyRefButton').addEventListener('click', copyReferralLink);
    document.getElementById('referralButton').addEventListener('click', claimReferralRewards);
}

// 🔧 ЕЖЕДНЕВНЫЙ БОНУС С СОХРАНЕНИЕМ ВРЕМЕНИ
function startTimers() {
    updateDailyTimer();
    setInterval(updateDailyTimer, 1000);
}

function updateDailyTimer() {
    if (!userData.daily_bonus) return;
    
    const now = new Date();
    const lastClaim = userData.daily_bonus.last_claim ? new Date(userData.daily_bonus.last_claim) : null;
    const cooldown = 60 * 1000; // 1 минута
    const button = document.getElementById('dailyButton');
    const timer = document.getElementById('dailyTimer');
    
    if (!lastClaim || (now - lastClaim) >= cooldown) {
        button.disabled = false;
        button.textContent = 'Забрать';
        if (timer) timer.textContent = 'Доступно сейчас!';
    } else {
        const remaining = cooldown - (now - lastClaim);
        const seconds = Math.ceil(remaining / 1000);
        button.disabled = true;
        button.textContent = 'Забрать';
        if (timer) timer.textContent = `Доступно через: ${seconds} сек`;
    }
}

async function claimDailyBonus() {
    if (!userData.daily_bonus || userData.daily_bonus.count >= 7) {
        showNotification('❌ Достигнут лимит бонусов на сегодня', 'error');
        return;
    }
    
    const newBalance = userData.balance + userData.daily_bonus.current_reward;
    const now = new Date().toISOString();
    
    // Обновляем локальные данные
    userData.daily_bonus.count++;
    userData.daily_bonus.last_claim = now; // Сохраняем точное время
    userData.daily_bonus.current_reward += 10;
    userData.balance = newBalance;
    
    // Сохраняем в базу
    await updateBalance(newBalance);
    
    showNotification(`🎉 +${userData.daily_bonus.current_reward - 10} монет!`, 'success');
    updateUI();
}

// 🔧 ПРОВЕРКА ЗАДАНИЙ TELEGRAM
async function checkSubscription() {
    await processQuest('subscribe', 100, 'канал');
}

async function checkNameInBio() {
    await processQuest('name', 50, 'имя бота в фамилии');
}

async function checkRefInDescription() {
    await processQuest('ref_desc', 20, 'реф. ссылку в описании');
}

async function processQuest(questType, reward, questName) {
    const quest = userData.quests[questType];
    const now = new Date().toISOString().split('T')[0]; // Только дата
    
    if (quest.last_claim === now) {
        showNotification('❌ Уже получали награду сегодня', 'error');
        return;
    }
    
    // Эмуляция проверки через Telegram API
    const isCompleted = await simulateTelegramCheck(questType);
    
    if (isCompleted) {
        const newBalance = userData.balance + reward;
        
        // Обновляем локальные данные
        quest.completed++;
        quest.last_claim = now; // Сохраняем дату
        userData.balance = newBalance;
        
        // Сохраняем в базу
        await updateBalance(newBalance);
        
        showNotification(`🎉 +${reward} монет за ${questName}!`, 'success');
        updateUI();
    } else {
        if (questType === 'name') {
            showNameQuestModal();
        } else if (questType === 'subscribe') {
            window.open('https://t.me/CS2DropZone', '_blank');
            showNotification('📢 Подпишитесь на канал и попробуйте снова', 'info');
        } else {
            showNotification(`❌ Задание не выполнено. Добавьте ${questName}`, 'error');
        }
    }
}

async function simulateTelegramCheck(type) {
    const probabilities = {
        'subscribe': 0.7,
        'name': 0.4,
        'ref_desc': 0.3
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
        const newBalance = userData.balance + rewards;
        
        // Обновляем локальные данные
        userData.balance = newBalance;
        
        // Сохраняем в базу
        await updateBalance(newBalance);
        
        showNotification(`🎉 +${rewards} монет за рефералов!`, 'success');
        updateUI();
    } else {
        showNotification('❌ Нет доступных наград за рефералов', 'error');
    }
}

// 🔧 КЕЙСЫ
async function loadCases() {
    try {
        const response = await fetch(`${API_URL}/cases`);
        let casesData = [];
        
        if (response.ok) {
            casesData = await response.json();
        } else {
            // Тестовые данные
            casesData = [
                {
                    id: 1,
                    name: "Кейс Grunt",
                    price: 100,
                    image: "https://cs-shot.pro/images/new2/Grunt.png",
                    total_opened: 1542,
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
                    total_opened: 892,
                    items: [
                        { name: "M4A4 | Howl", price: "8000", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLkjYbf7itX6vytbbZSKOmsHGKU1edxtfNWQyC0nQlptWWEzd-qd3mVbgR2WZYiFuUMtUG7x4HhYeLhs1fZiN1DnC6viH4Y7TErvbgp6HjWjQ" },
                        { name: "Knife | Fade", price: "12000", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwi5Hf_jdk4OSrerRsM-OsCXWRx9F3peZWRyyygwRp527cn478dXyXbAJ2DZV2QucK5BDukoexMO3m4QWN2o1Hyiz-ii4bvTErvbhWWiFhog" }
                    ]
                }
            ];
        }
        
        const casesGrid = document.getElementById('casesGrid');
        casesGrid.innerHTML = casesData.map(caseItem => `
            <div class="case-card" onclick="showCaseDetails(${caseItem.id})">
                <div class="case-image">
                    <img src="${caseItem.image}" alt="${caseItem.name}" onerror="this.style.display='none'; this.parentNode.innerHTML='${caseItem.name}';">
                </div>
                <div class="case-title">${caseItem.name}</div>
                <div class="case-price">💎 ${caseItem.price} монет</div>
                <div class="case-stats">Открыто: ${caseItem.total_opened} раз</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading cases:', error);
    }
}

function showCaseDetails(caseId) {
    const caseItem = getCaseById(caseId);
    if (!caseItem) return;
    
    currentCase = caseItem;
    showRoulette(caseItem);
}

function getCaseById(caseId) {
    // В реальном приложении здесь будет запрос к API
    const testCases = [
        {
            id: 1,
            name: "Кейс Grunt",
            price: 100,
            image: "https://cs-shot.pro/images/new2/Grunt.png",
            total_opened: 1542,
            items: [
                { name: "AK-47 | Redline", price: "1500", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSIf6GDG6D_uJ_t-l9AX_nzBhw4TvWwo6udC2QbgZyWcN2RuMP4xHrlYDnYezm7geP3d5FyH3gznQeY_Oe4QY" },
                { name: "AWP | Dragon Lore", price: "10000", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwiFO0P_6afBSJeaaAliUwOd7qe5WQyC0nQlp4GqGz42ucCqXaQMhDpd4R-AIsxK6ktXgZePltVPXitoRn3-tjCgd6zErvbijVJZd2Q" }
            ]
        }
    ];
    return testCases.find(c => c.id === caseId);
}

// 🔧 РУЛЕТКА
function initRoulette() {
    document.getElementById('spinButton').addEventListener('click', spinRoulette);
    document.getElementById('closeRoulette').addEventListener('click', closeRoulette);
}

function showRoulette(caseItem) {
    const container = document.getElementById('rouletteContainer');
    const title = document.getElementById('rouletteTitle');
    const itemsContainer = document.getElementById('rouletteItems');
    const price = document.getElementById('casePrice');
    const spinButton = document.getElementById('spinButton');
    const result = document.getElementById('rouletteResult');
    const closeBtn = document.getElementById('closeRoulette');
    
    title.textContent = caseItem.name;
    price.textContent = caseItem.price;
    
    // Показываем предметы кейса
    itemsContainer.innerHTML = caseItem.items.map(item => `
        <div class="roulette-item">
            <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'; this.parentNode.innerHTML='🎮';">
            <div class="roulette-item-name">${item.name}</div>
        </div>
    `).join('');
    
    // Сбрасываем состояние
    result.style.display = 'none';
    closeBtn.style.display = 'none';
    spinButton.style.display = 'block';
    spinButton.disabled = userData.balance < caseItem.price;
    
    container.style.display = 'flex';
}

async function spinRoulette() {
    if (!currentCase) return;
    
    const spinButton = document.getElementById('spinButton');
    const result = document.getElementById('rouletteResult');
    const closeBtn = document.getElementById('closeRoulette');
    const items = document.querySelectorAll('.roulette-item');
    
    // Блокируем кнопку
    spinButton.disabled = true;
    spinButton.textContent = 'Крутится...';
    
    // Спиним рулетку
    const spinDuration = 3000;
    const startTime = Date.now();
    const winnerIndex = Math.floor(Math.random() * currentCase.items.length);
    const winnerItem = currentCase.items[winnerIndex];
    
    // Анимация вращения
    let animationFrame;
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        
        // Подсвечиваем случайный предмет во время вращения
        items.forEach(item => item.classList.remove('active'));
        const randomIndex = Math.floor(Math.random() * items.length);
        items[randomIndex].classList.add('active');
        
        if (progress < 1) {
            animationFrame = requestAnimationFrame(animate);
        } else {
            // Завершаем на победном предмете
            items.forEach(item => item.classList.remove('active'));
            items[winnerIndex].classList.add('active');
            
            // Показываем результат
            showRouletteResult(winnerItem);
        }
    }
    
    animationFrame = requestAnimationFrame(animate);
    
    // Обновляем баланс и инвентарь
    const newBalance = userData.balance - currentCase.price;
    userData.balance = newBalance;
    userData.cases_opened = (userData.cases_opened || 0) + 1;
    
    // Добавляем предмет в инвентарь в базе
    await addToInventory(winnerItem);
    
    // Обновляем локальный инвентарь
    if (!userData.inventory) userData.inventory = [];
    userData.inventory.push(winnerItem);
    
    // Сохраняем в базу
    await updateBalance(newBalance);
    
    // Обновляем UI
    updateUI();
}

function showRouletteResult(item) {
    const result = document.getElementById('rouletteResult');
    const spinButton = document.getElementById('spinButton');
    const closeBtn = document.getElementById('closeRoulette');
    
    result.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 18px; color: #ffd700; margin-bottom: 10px;">🎉 Поздравляем!</div>
            <div style="font-weight: bold; margin-bottom: 5px;">${item.name}</div>
            <div style="color: #ff6b35;">Цена: $${item.price}</div>
        </div>
    `;
    
    result.style.display = 'block';
    spinButton.style.display = 'none';
    closeBtn.style.display = 'block';
}

function closeRoulette() {
    document.getElementById('rouletteContainer').style.display = 'none';
    loadInventory(); // Обновляем инвентарь
}

// 🔧 ИНВЕНТАРЬ
async function loadInventory() {
    try {
        const inventoryGrid = document.getElementById('inventoryGrid');
        
        if (!userData.inventory || userData.inventory.length === 0) {
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
        
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

// 🔧 РОЗЫГРЫШИ
async function loadRaffles() {
    try {
        const response = await fetch(`${API_URL}/raffles`);
        let raffles = [];
        
        if (response.ok) {
            raffles = await response.json();
        } else {
            // Тестовые данные
            raffles = [
                { 
                    id: 1, 
                    name: 'AK-47 | Годовая подписка', 
                    end_date: '2024-12-31T23:59:59', 
                    participants: 1245,
                    image: 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSIf6GDG6D_uJ_t-l9AX_nzBhw4TvWwo6udC2QbgZyWcN2RuMP4xHrlYDnYezm7geP3d5FyH3gznQeY_Oe4QY'
                },
                { 
                    id: 2, 
                    name: 'AWP | Элитный кейс', 
                    end_date: '2024-12-25T23:59:59', 
                    participants: 893,
                    image: 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwiFO0P_6afBSJeaaAliUwOd7qe5WQyC0nQlp4GqGz42ucCqXaQMhDpd4R-AIsxK6ktXgZePltVPXitoRn3-tjCgd6zErvbijVJZd2Q'
                }
            ];
        }
        
        renderRaffles(raffles);
        
    } catch (error) {
        console.error('Error loading raffles:', error);
    }
}

function renderRaffles(raffles) {
    const raffleSlider = document.getElementById('raffleSlider');
    
    raffleSlider.innerHTML = raffles.map(raffle => `
        <div class="raffle-card">
            <div class="raffle-image">
                <img src="${raffle.image}" alt="${raffle.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none';">
                ${raffle.name}
            </div>
            <div class="raffle-info">
                <span>⏰ ${new Date(raffle.end_date).toLocaleDateString()}</span>
                <span>👥 ${raffle.participants}</span>
            </div>
            <button class="raffle-button" onclick="participateRaffle(${raffle.id})">Участвовать</button>
        </div>
    `).join('');
}

function initRaffleControls() {
    const prevBtn = document.getElementById('prevRaffle');
    const nextBtn = document.getElementById('nextRaffle');
    const slider = document.getElementById('raffleSlider');
    
    prevBtn.addEventListener('click', () => {
        currentRaffleIndex = Math.max(0, currentRaffleIndex - 1);
        slider.scrollTo({ left: currentRaffleIndex * 300, behavior: 'smooth' });
    });
    
    nextBtn.addEventListener('click', () => {
        currentRaffleIndex = Math.min(10, currentRaffleIndex + 1); // Предполагаем максимум 10 розыгрышей
        slider.scrollTo({ left: currentRaffleIndex * 300, behavior: 'smooth' });
    });
}

async function participateRaffle(raffleId) {
    showNotification('✅ Вы участвуете в розыгрыше!', 'success');
}

// 🔧 ПРОФИЛЬ С ФОТОГРАФИЕЙ
function renderProfile() {
    if (!currentUser) return;
    
    document.getElementById('profileName').textContent = 
        `${currentUser.first_name} ${currentUser.last_name || ''}`;
    document.getElementById('profileUsername').textContent = 
        `@${currentUser.username || 'username'}`;
    document.getElementById('profileBalance').textContent = userData.balance || 0;
    document.getElementById('profileReferrals').textContent = userData.referrals || 0;
    document.getElementById('profileCases').textContent = userData.cases_opened || 0;
    document.getElementById('profileItems').textContent = userData.inventory?.length || 0;
    document.getElementById('profileLevel').textContent = userData.level || 1;
    
    // Аватар из Telegram
    const avatar = document.getElementById('profileAvatar');
    if (currentUser.photo_url) {
        avatar.innerHTML = `<img src="${currentUser.photo_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
        // Если фото нет, показываем первую букву имени
        const firstLetter = currentUser.first_name ? currentUser.first_name[0].toUpperCase() : 'U';
        avatar.innerHTML = `<span style="font-size: 24px;">${firstLetter}</span>`;
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
    userData = {
        balance: 150,
        daily_bonus: {
            count: 2,
            last_claim: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            current_reward: 30
        },
        quests: {
            subscribe: { completed: 3, last_claim: new Date().toISOString().split('T')[0] },
            name: { completed: 1, last_claim: null },
            ref_desc: { completed: 0, last_claim: null }
        },
        referrals: 3,
        cases_opened: 5,
        inventory: [
            { name: "AK-47 | Redline", price: "1500", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSIf6GDG6D_uJ_t-l9AX_nzBhw4TvWwo6udC2QbgZyWcN2RuMP4xHrlYDnYezm7geP3d5FyH3gznQeY_Oe4QY" }
        ],
        level: 1
    };
    updateUI();
    loadCases();
    loadRaffles();
    loadInventory();
    renderProfile();
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
