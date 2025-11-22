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

// 🔧 ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
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
        
        console.log('✅ Данные пользователя загружены:', currentUser);
        
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
    updateQuestTimer('daily', dailyBonus.last_claim);
    
    // Задания
    const quests = userData.quests || {};
    document.getElementById('subscribeCompleted').textContent = quests.subscribe?.completed || 0;
    updateProgressBar('subscribeProgress', quests.subscribe?.completed || 0, 10);
    updateQuestTimer('subscribe', quests.subscribe?.last_claim);
    
    document.getElementById('nameCompleted').textContent = quests.name?.completed || 0;
    updateProgressBar('nameProgress', quests.name?.completed || 0, 10);
    updateQuestTimer('name', quests.name?.last_claim);
    
    document.getElementById('refDescCompleted').textContent = quests.ref_desc?.completed || 0;
    updateProgressBar('refDescProgress', quests.ref_desc?.completed || 0, 10);
    updateQuestTimer('ref_desc', quests.ref_desc?.last_claim);
    
    // Рефералы
    document.getElementById('referralCount').textContent = userData.referrals || 0;
    updateProgressBar('referralProgress', userData.referrals || 0, 10);
    updateQuestTimer('referral', userData.referral_last_claim);
}

function updateProgressBar(elementId, current, max) {
    const progress = Math.min((current / max) * 100, 100);
    const element = document.getElementById(elementId);
    if (element) {
        element.style.width = `${progress}%`;
    }
}

// 🔧 ТАЙМЕРЫ ДЛЯ ВСЕХ ЗАДАНИЙ
function startTimers() {
    setInterval(() => {
        if (userData.daily_bonus) {
            updateQuestTimer('daily', userData.daily_bonus.last_claim);
            updateQuestTimer('subscribe', userData.quests?.subscribe?.last_claim);
            updateQuestTimer('name', userData.quests?.name?.last_claim);
            updateQuestTimer('ref_desc', userData.quests?.ref_desc?.last_claim);
            updateQuestTimer('referral', userData.referral_last_claim);
        }
    }, 1000);
}

function updateQuestTimer(questType, lastClaim) {
    const now = new Date();
    const lastClaimTime = lastClaim ? new Date(lastClaim) : null;
    const cooldown = 60 * 1000; // 1 минута
    
    let button, timer;
    
    switch(questType) {
        case 'daily':
            button = document.getElementById('dailyButton');
            timer = document.getElementById('dailyTimer');
            break;
        case 'subscribe':
            button = document.getElementById('subscribeButton');
            timer = document.getElementById('subscribeTimer');
            break;
        case 'name':
            button = document.getElementById('nameButton');
            timer = document.getElementById('nameTimer');
            break;
        case 'ref_desc':
            button = document.getElementById('refDescButton');
            timer = document.getElementById('refDescTimer');
            break;
        case 'referral':
            button = document.getElementById('referralButton');
            timer = document.getElementById('referralTimer');
            break;
    }
    
    if (!button) return;
    
    if (!lastClaimTime || (now - lastClaimTime) >= cooldown) {
        button.disabled = false;
        if (timer) {
            timer.style.display = 'none';
            timer.textContent = 'Доступно сейчас!';
        }
    } else {
        const remaining = cooldown - (now - lastClaimTime);
        const seconds = Math.ceil(remaining / 1000);
        button.disabled = true;
        if (timer) {
            timer.style.display = 'block';
            timer.textContent = `Доступно через: ${seconds} сек`;
        }
    }
}

// 🔧 ИНИЦИАЛИЗАЦИЯ КНОПОК
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
    
    console.log('✅ Кнопки инициализированы');
}

// 🔧 ЕЖЕДНЕВНЫЙ БОНУС
async function claimDailyBonus() {
    console.log('🎯 Claim daily bonus clicked');
    
    if (!userData.daily_bonus || userData.daily_bonus.count >= 7) {
        showNotification('❌ Достигнут лимит бонусов на сегодня', 'error');
        return;
    }
    
    if (!await checkCooldown('daily')) return;
    
    const reward = userData.daily_bonus.current_reward;
    
    try {
        // Обновляем баланс
        const newBalance = userData.balance + reward;
        const response = await fetch(`${API_URL}/user/${currentUser.user_id}/balance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ balance: newBalance })
        });
        
        if (response.ok) {
            // Обновляем кулдаун
            await updateCooldown('daily');
            
            // Обновляем локальные данные
            userData.balance = newBalance;
            userData.daily_bonus.count++;
            userData.daily_bonus.current_reward += 10;
            userData.daily_bonus.last_claim = new Date().toISOString();
            
            // Сохраняем данные
            await saveUserData();
            
            showNotification(`🎉 +${reward} монет!`, 'success');
            updateUI();
        }
    } catch (error) {
        console.error('Error claiming daily bonus:', error);
        showNotification('❌ Ошибка при получении награды', 'error');
    }
}

// 🔧 ПРОВЕРКА ПОДПИСКИ С TELEGRAM API
async function checkSubscription() {
    console.log('🎯 Check subscription clicked');
    
    if (!await checkCooldown('subscribe')) return;
    
    try {
        // Проверяем подписку через Telegram API
        const response = await fetch(`${API_URL}/check-subscription/${currentUser.user_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.subscribed) {
                // Начисляем награду
                const newBalance = userData.balance + 100;
                const balanceResponse = await fetch(`${API_URL}/user/${currentUser.user_id}/balance`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ balance: newBalance })
                });
                
                if (balanceResponse.ok) {
                    // Обновляем кулдаун
                    await updateCooldown('subscribe');
                    
                    // Обновляем локальные данные
                    userData.balance = newBalance;
                    if (!userData.quests.subscribe) userData.quests.subscribe = {};
                    userData.quests.subscribe.completed = (userData.quests.subscribe.completed || 0) + 1;
                    userData.quests.subscribe.last_claim = new Date().toISOString();
                    
                    // Сохраняем данные
                    await saveUserData();
                    
                    showNotification('🎉 +100 монет за подписку!', 'success');
                    updateUI();
                }
            } else {
                // Открываем канал в Telegram
                if (window.Telegram && window.Telegram.WebApp) {
                    // Если открыто в Telegram WebApp
                    window.Telegram.WebApp.openTelegramLink('https://t.me/CS2DropZone');
                } else {
                    // Если открыто в браузере
                    window.open('https://t.me/CS2DropZone', '_blank');
                }
                showNotification('📢 Подпишитесь на канал и попробуйте снова', 'info');
            }
        }
    } catch (error) {
        console.error('Error checking subscription:', error);
        showNotification('❌ Ошибка проверки подписки', 'error');
    }
}

// 🔧 ПРОВЕРКА ИМЕНИ БОТА В ФАМИЛИИ
async function checkNameInBio() {
    console.log('🎯 Check name in bio clicked');
    
    if (!await checkCooldown('name')) return;
    
    try {
        // Проверяем фамилию через API
        const response = await fetch(`${API_URL}/check-bio/${currentUser.user_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.hasBotInBio) {
                // Начисляем награду
                const newBalance = userData.balance + 50;
                const balanceResponse = await fetch(`${API_URL}/user/${currentUser.user_id}/balance`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ balance: newBalance })
                });
                
                if (balanceResponse.ok) {
                    // Обновляем кулдаун
                    await updateCooldown('name');
                    
                    // Обновляем локальные данные
                    userData.balance = newBalance;
                    if (!userData.quests.name) userData.quests.name = {};
                    userData.quests.name.completed = (userData.quests.name.completed || 0) + 1;
                    userData.quests.name.last_claim = new Date().toISOString();
                    
                    // Сохраняем данные
                    await saveUserData();
                    
                    showNotification('🎉 +50 монет! Бот найден в фамилии', 'success');
                    updateUI();
                }
            } else {
                showNameQuestModal();
            }
        }
    } catch (error) {
        console.error('Error checking name in bio:', error);
        showNotification('❌ Ошибка проверки фамилии', 'error');
    }
}

// 🔧 ПРОВЕРКА РЕФЕРАЛЬНОЙ ССЫЛКИ В ОПИСАНИИ
async function checkRefInDescription() {
    console.log('🎯 Check ref in description clicked');
    
    if (!await checkCooldown('ref_desc')) return;
    
    try {
        // Временно используем эмуляцию (заменить на реальную проверку)
        const hasRefInBio = Math.random() > 0.5;
        
        if (hasRefInBio) {
            // Начисляем награду
            const newBalance = userData.balance + 20;
            const balanceResponse = await fetch(`${API_URL}/user/${currentUser.user_id}/balance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance: newBalance })
            });
            
            if (balanceResponse.ok) {
                // Обновляем кулдаун
                await updateCooldown('ref_desc');
                
                // Обновляем локальные данные
                userData.balance = newBalance;
                if (!userData.quests.ref_desc) userData.quests.ref_desc = {};
                userData.quests.ref_desc.completed = (userData.quests.ref_desc.completed || 0) + 1;
                userData.quests.ref_desc.last_claim = new Date().toISOString();
                
                // Сохраняем данные
                await saveUserData();
                
                showNotification('🎉 +20 монет! Реф. ссылка найдена', 'success');
                updateUI();
            }
        } else {
            showNotification('❌ Реф. ссылка не найдена в описании профиля', 'error');
        }
    } catch (error) {
        console.error('Error checking ref in description:', error);
        showNotification('❌ Ошибка проверки описания', 'error');
    }
}

// 🔧 РЕФЕРАЛЬНЫЕ НАГРАДЫ
async function claimReferralRewards() {
    console.log('🎯 Claim referral rewards clicked');
    
    if (!await checkCooldown('referral')) return;
    
    const rewards = Math.min(userData.referrals, 10) * 100;
    
    if (rewards > 0) {
        try {
            // Обновляем баланс
            const newBalance = userData.balance + rewards;
            const response = await fetch(`${API_URL}/user/${currentUser.user_id}/balance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance: newBalance })
            });
            
            if (response.ok) {
                // Обновляем кулдаун
                await updateCooldown('referral');
                
                // Обновляем локальные данные
                userData.balance = newBalance;
                userData.referral_last_claim = new Date().toISOString();
                
                // Сохраняем данные
                await saveUserData();
                
                showNotification(`🎉 +${rewards} монет за рефералов!`, 'success');
                updateUI();
            }
        } catch (error) {
            console.error('Error claiming referral rewards:', error);
            showNotification('❌ Ошибка при получении награды', 'error');
        }
    } else {
        showNotification('❌ Нет доступных наград за рефералов', 'error');
    }
}

// 🔧 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
async function checkCooldown(questType) {
    const lastClaim = getLastClaim(questType);
    const now = new Date();
    const cooldown = 60 * 1000; // 1 минута
    
    if (lastClaim && (now - new Date(lastClaim)) < cooldown) {
        const remaining = cooldown - (now - new Date(lastClaim));
        const seconds = Math.ceil(remaining / 1000);
        showNotification(`⏰ Попробуйте снова через ${seconds} секунд`, 'info');
        return false;
    }
    
    return true;
}

function getLastClaim(questType) {
    switch(questType) {
        case 'daily':
            return userData.daily_bonus?.last_claim;
        case 'subscribe':
            return userData.quests?.subscribe?.last_claim;
        case 'name':
            return userData.quests?.name?.last_claim;
        case 'ref_desc':
            return userData.quests?.ref_desc?.last_claim;
        case 'referral':
            return userData.referral_last_claim;
        default:
            return null;
    }
}

async function updateCooldown(questType) {
    try {
        await fetch(`${API_URL}/user/quest-cooldown/${currentUser.user_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questType: questType })
        });
    } catch (error) {
        console.error('Error updating cooldown:', error);
    }
}

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

// 🔧 ЗАГРУЗКА КЕЙСОВ И ИНВЕНТАРЯ
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
        if (casesGrid) {
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
        }
        
    } catch (error) {
        console.error('Error loading cases:', error);
    }
}

async function loadInventory() {
    try {
        const inventoryGrid = document.getElementById('inventoryGrid');
        
        if (!inventoryGrid) return;
        
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

// 🔧 ОСТАЛЬНЫЕ ФУНКЦИИ
function copyReferralLink() {
    if (!currentUser) return;
    
    const botUsername = 'CS2DropZone_bot';
    const refCode = currentUser.referral_code || `ref_${currentUser.user_id}`;
    const refLink = `https://t.me/${botUsername}?start=${refCode}`;
    
    navigator.clipboard.writeText(refLink).then(() => {
        showNotification('📋 Реф. ссылка скопирована!', 'success');
    });
}

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
        const photoUrl = `${currentUser.photo_url}?t=${Date.now()}`;
        avatar.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.parentNode.innerHTML='👤';">`;
    } else {
        const firstLetter = currentUser.first_name ? currentUser.first_name[0].toUpperCase() : 'U';
        avatar.innerHTML = `<span style="font-size: 24px;">${firstLetter}</span>`;
    }
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
