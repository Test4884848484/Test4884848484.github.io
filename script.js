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

// 🔧 ОБНОВЛЕНИЕ ИНТЕРФЕЙСА С ТАЙМЕРАМИ
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
        if (timer) timer.textContent = 'Доступно сейчас!';
    } else {
        const remaining = cooldown - (now - lastClaimTime);
        const seconds = Math.ceil(remaining / 1000);
        button.disabled = true;
        if (timer) timer.textContent = `Доступно через: ${seconds} сек`;
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

// 🔧 ЗАДАНИЯ С ПРОВЕРКАМИ ЧЕРЕЗ TELEGRAM API
async function claimDailyBonus() {
    if (!userData.daily_bonus || userData.daily_bonus.count >= 7) {
        showNotification('❌ Достигнут лимит бонусов на сегодня', 'error');
        return;
    }
    
    if (!await checkCooldown('daily')) return;
    
    const reward = userData.daily_bonus.current_reward;
    
    try {
        // Обновляем баланс и счетчик
        const response = await fetch(`${API_URL}/user/quest-reward/${currentUser.user_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                questType: 'daily', 
                reward: reward 
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Обновляем кулдаун
            await updateCooldown('daily');
            
            // Обновляем локальные данные
            userData.balance = result.newBalance;
            userData.daily_bonus.count++;
            userData.daily_bonus.current_reward += 10;
            userData.daily_bonus.last_claim = new Date().toISOString();
            
            showNotification(`🎉 +${reward} монет!`, 'success');
            updateUI();
        }
    } catch (error) {
        console.error('Error claiming daily bonus:', error);
        showNotification('❌ Ошибка при получении награды', 'error');
    }
}

async function checkSubscription() {
    if (!await checkCooldown('subscribe')) return;
    
    try {
        // Проверяем подписку через Telegram API
        const response = await fetch(`${API_URL}/check-subscription/${currentUser.user_id}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.subscribed) {
                // Начисляем награду
                const rewardResponse = await fetch(`${API_URL}/user/quest-reward/${currentUser.user_id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        questType: 'subscribe', 
                        reward: 100 
                    })
                });
                
                if (rewardResponse.ok) {
                    const rewardResult = await rewardResponse.json();
                    
                    // Обновляем кулдаун
                    await updateCooldown('subscribe');
                    
                    // Обновляем локальные данные
                    userData.balance = rewardResult.newBalance;
                    userData.quests.subscribe.completed++;
                    userData.quests.subscribe.last_claim = new Date().toISOString();
                    
                    showNotification('🎉 +100 монет за подписку!', 'success');
                    updateUI();
                }
            } else {
                // Перенаправляем в канал
                window.open('https://t.me/CS2DropZone', '_blank');
                showNotification('📢 Подпишитесь на канал и попробуйте снова', 'info');
            }
        }
    } catch (error) {
        console.error('Error checking subscription:', error);
        showNotification('❌ Ошибка проверки подписки', 'error');
    }
}

async function checkNameInBio() {
    if (!await checkCooldown('name')) return;
    
    try {
        // Проверяем фамилию через Telegram API
        const response = await fetch(`${API_URL}/check-bio/${currentUser.user_id}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.hasBotInBio) {
                // Начисляем награду
                const rewardResponse = await fetch(`${API_URL}/user/quest-reward/${currentUser.user_id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        questType: 'name', 
                        reward: 50 
                    })
                });
                
                if (rewardResponse.ok) {
                    const rewardResult = await rewardResponse.json();
                    
                    // Обновляем кулдаун
                    await updateCooldown('name');
                    
                    // Обновляем локальные данные
                    userData.balance = rewardResult.newBalance;
                    userData.quests.name.completed++;
                    userData.quests.name.last_claim = new Date().toISOString();
                    
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

async function checkRefInDescription() {
    if (!await checkCooldown('ref_desc')) return;
    
    try {
        // Проверяем реферальную ссылку в описании
        const response = await fetch(`${API_URL}/check-ref-in-bio/${currentUser.user_id}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.hasRefInBio) {
                // Начисляем награду
                const rewardResponse = await fetch(`${API_URL}/user/quest-reward/${currentUser.user_id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        questType: 'ref_desc', 
                        reward: 20 
                    })
                });
                
                if (rewardResponse.ok) {
                    const rewardResult = await rewardResponse.json();
                    
                    // Обновляем кулдаун
                    await updateCooldown('ref_desc');
                    
                    // Обновляем локальные данные
                    userData.balance = rewardResult.newBalance;
                    userData.quests.ref_desc.completed++;
                    userData.quests.ref_desc.last_claim = new Date().toISOString();
                    
                    showNotification('🎉 +20 монет! Реф. ссылка найдена', 'success');
                    updateUI();
                }
            } else {
                showNotification('❌ Реф. ссылка не найдена в описании профиля', 'error');
            }
        }
    } catch (error) {
        console.error('Error checking ref in description:', error);
        showNotification('❌ Ошибка проверки описания', 'error');
    }
}

async function claimReferralRewards() {
    if (!await checkCooldown('referral')) return;
    
    const rewards = Math.min(userData.referrals, 10) * 100;
    
    if (rewards > 0) {
        try {
            // Обновляем баланс
            const response = await fetch(`${API_URL}/user/${currentUser.user_id}/balance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance: userData.balance + rewards })
            });
            
            if (response.ok) {
                // Обновляем кулдаун
                await updateCooldown('referral');
                
                // Обновляем локальные данные
                userData.balance += rewards;
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

// 🔧 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ПРОВЕРОК
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

// 🔧 ПРОФИЛЬ С ЗАГРУЗКОЙ ФОТО ИЗ TELEGRAM
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
        // Добавляем timestamp для избежания кеширования
        const photoUrl = `${currentUser.photo_url}?t=${Date.now()}`;
        avatar.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.parentNode.innerHTML='👤';">`;
    } else {
        // Если фото нет, показываем первую букву имени
        const firstLetter = currentUser.first_name ? currentUser.first_name[0].toUpperCase() : 'U';
        avatar.innerHTML = `<span style="font-size: 24px;">${firstLetter}</span>`;
    }
}

// 🔧 СОХРАНЕНИЕ ДАННЫХ
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

// 🔧 ОСТАЛЬНЫЕ ФУНКЦИИ (без изменений)
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tab).classList.add('active');
            
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

function initQuests() {
    document.getElementById('dailyButton').addEventListener('click', claimDailyBonus);
    document.getElementById('subscribeButton').addEventListener('click', checkSubscription);
    document.getElementById('nameButton').addEventListener('click', checkNameInBio);
    document.getElementById('refDescButton').addEventListener('click', checkRefInDescription);
    document.getElementById('copyRefButton').addEventListener('click', copyReferralLink);
    document.getElementById('referralButton').addEventListener('click', claimReferralRewards);
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

// 🔧 HTML ДОБАВЬТЕ ТАЙМЕРЫ ДЛЯ КАЖДОГО ЗАДАНИЯ
// В каждом quest-card добавьте:
// <div class="quest-timer" id="subscribeTimer" style="display: none;">Доступно через: 60 сек</div>
// и т.д. для каждого задания
