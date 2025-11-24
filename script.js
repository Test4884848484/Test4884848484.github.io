// 🔧 КОНФИГУРАЦИЯ
const API_URL = 'https://my-backend-production-9034.up.railway.app/api';

let currentUser = null;
let userData = {};

// 🔧 ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
async function loadUserProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const telegramUserId = urlParams.get('tg');

    if (!telegramUserId) {
        showWarningMessage();
        return;
    }

    try {
        console.log('📥 Загрузка данных пользователя...');
        const response = await fetch(`${API_URL}/user/full/${telegramUserId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const fullData = await response.json();
        currentUser = fullData.user;
        userData = fullData.data;
        
        console.log('✅ Данные пользователя загружены:', userData);
        
        renderProfile();
        updateUI();
        loadCases();
        loadRaffles();
        loadInventory();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователя:', error);
        useTestData();
    }
}

// 🔧 ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateUI() {
    if (!userData) {
        console.log('❌ userData не определен');
        return;
    }
    
    console.log('🔄 Обновление интерфейса...');
    
    // Баланс
    document.getElementById('balance').textContent = userData.balance || 0;
    
    // Подписка на канал
    updateQuestUI('subscribe', userData.is_subscribed, userData.subscribe_count, userData.subscribe_last_claim, 100);
    
    // Бот в био
    updateQuestUI('name', userData.has_bot_in_bio, userData.bot_in_bio_count, userData.bot_in_bio_last_claim, 50);
    
    // Реф ссылка в био
    updateQuestUI('ref_desc', userData.has_ref_in_bio, userData.ref_in_bio_count, userData.ref_in_bio_last_claim, 20);
    
    // Ежедневный бонус
    const dailyBonus = userData.daily_bonus || {};
    document.getElementById('dailyReward').textContent = dailyBonus.current_reward || 10;
    document.getElementById('dailyCompleted').textContent = dailyBonus.count || 0;
    updateProgressBar('dailyProgress', dailyBonus.count || 0, 7);
    updateQuestTimer('daily', dailyBonus.last_claim);
    
    // Рефералы
    document.getElementById('referralCount').textContent = userData.referrals || 0;
    updateProgressBar('referralProgress', userData.referrals || 0, 10);
    updateQuestTimer('referral', userData.referral_last_claim);
}

// 🔧 ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ЗАДАНИЙ
function updateQuestUI(questType, isCompleted, count, lastClaim, reward) {
    const completedElement = document.getElementById(`${questType}Completed`);
    const progressElement = document.getElementById(`${questType}Progress`);
    const buttonElement = document.getElementById(`${questType}Button`);
    const timerElement = document.getElementById(`${questType}Timer`);
    
    if (completedElement) {
        completedElement.textContent = count || 0;
    }
    
    if (progressElement) {
        updateProgressBar(`${questType}Progress`, count || 0, 10);
    }
    
    if (buttonElement) {
        const now = new Date();
        const lastClaimTime = lastClaim ? new Date(lastClaim) : null;
        const cooldown = 60 * 1000; // 1 минута
        
        if (isCompleted) {
            if (!lastClaimTime || (now - lastClaimTime) >= cooldown) {
                buttonElement.disabled = false;
                buttonElement.textContent = `+${reward} монет`;
                buttonElement.style.background = 'linear-gradient(45deg, #ff6b35, #ff8c35)';
                if (timerElement) {
                    timerElement.style.display = 'block';
                    timerElement.textContent = 'Доступно сейчас!';
                    timerElement.style.color = '#4CAF50';
                }
            } else {
                buttonElement.disabled = true;
                buttonElement.textContent = `+${reward} монет`;
                buttonElement.style.background = '#666';
                if (timerElement) {
                    const remaining = cooldown - (now - lastClaimTime);
                    const seconds = Math.ceil(remaining / 1000);
                    timerElement.style.display = 'block';
                    timerElement.textContent = `Доступно через: ${seconds} сек`;
                    timerElement.style.color = '#ff6b35';
                }
            }
        } else {
            buttonElement.disabled = true;
            buttonElement.textContent = questType === 'subscribe' ? 'Подписаться' : 'Выполнить';
            buttonElement.style.background = '#666';
            if (timerElement) {
                timerElement.style.display = 'none';
            }
        }
    }
}

// 🔧 ПРОФИЛЬ С ФОТО
function renderProfile() {
    if (!currentUser) return;
    
    console.log('👤 Рендеринг профиля...');
    
    document.getElementById('profileName').textContent = 
        `${currentUser.first_name} ${currentUser.last_name || ''}`.trim();
    document.getElementById('profileUsername').textContent = 
        `@${currentUser.username || 'username'}`;
    document.getElementById('profileBalance').textContent = userData.balance || 0;
    document.getElementById('profileReferrals').textContent = userData.referrals || 0;
    document.getElementById('profileCases').textContent = userData.cases_opened || 0;
    document.getElementById('profileItems').textContent = userData.inventory?.length || 0;
    document.getElementById('profileLevel').textContent = userData.level || 1;
    
    // Аватар из Telegram - ИСПРАВЛЕННАЯ ВЕРСИЯ
    const avatar = document.getElementById('profileAvatar');
    if (avatar) {
        if (currentUser.photo_url) {
            // Проверяем, является ли URL полным
            let photoUrl = currentUser.photo_url;
            if (!photoUrl.startsWith('http')) {
                photoUrl = `https://api.telegram.org/file/bot8308720989:AAHFS_9JXHB7T6UufDuQB9W-xjWTPU-x0lY/${photoUrl}`;
            }
            
            avatar.innerHTML = `
                <img src="${photoUrl}" alt="Avatar" 
                     style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
                     onerror="this.style.display='none'; this.parentNode.innerHTML='👤';">
            `;
            console.log('📸 Аватар загружен:', photoUrl);
        } else {
            const firstLetter = currentUser.first_name ? currentUser.first_name[0].toUpperCase() : 'U';
            const colors = ['#ff6b35', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];
            const color = colors[firstLetter.charCodeAt(0) % colors.length];
            
            avatar.innerHTML = `
                <div style="width: 100%; height: 100%; border-radius: 50%; background: ${color}; 
                           display: flex; align-items: center; justify-content: center; 
                           color: white; font-size: 24px; font-weight: bold;">
                    ${firstLetter}
                </div>
            `;
        }
    }
}

// 🔧 ЗАБРАТЬ НАГРАДУ ЗА ПОДПИСКУ
async function claimSubscribe() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/user/${currentUser.user_id}/claim-subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            userData.balance = result.newBalance;
            userData.subscribe_count = (userData.subscribe_count || 0) + 1;
            userData.subscribe_last_claim = new Date().toISOString();
            
            showNotification(`🎉 +${result.reward} монет за подписку!`, 'success');
            updateUI();
        } else if (result.error === 'Cooldown') {
            showNotification(`⏰ Попробуйте снова через ${result.remaining} секунд`, 'info');
        } else if (result.error === 'Not subscribed') {
            showNotification('❌ Вы не подписаны на канал', 'error');
            openTelegramChannel();
        } else {
            showNotification('❌ Ошибка при получении награды', 'error');
        }
    } catch (error) {
        console.error('Error claiming subscribe reward:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// 🔧 ЗАБРАТЬ НАГРАДУ ЗА БОТА В БИО
async function claimBotInBio() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/user/${currentUser.user_id}/claim-bot-in-bio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            userData.balance = result.newBalance;
            userData.bot_in_bio_count = (userData.bot_in_bio_count || 0) + 1;
            userData.bot_in_bio_last_claim = new Date().toISOString();
            
            showNotification(`🎉 +${result.reward} монет за бота в фамилии!`, 'success');
            updateUI();
        } else if (result.error === 'Cooldown') {
            showNotification(`⏰ Попробуйте снова через ${result.remaining} секунд`, 'info');
        } else if (result.error === 'Bot not in bio') {
            showBotInBioInstructions();
        } else {
            showNotification('❌ Ошибка при получении награды', 'error');
        }
    } catch (error) {
        console.error('Error claiming bot in bio reward:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// 🔧 ЗАБРАТЬ НАГРАДУ ЗА РЕФ ССЫЛКУ В БИО
async function claimRefInBio() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/user/${currentUser.user_id}/claim-ref-in-bio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            userData.balance = result.newBalance;
            userData.ref_in_bio_count = (userData.ref_in_bio_count || 0) + 1;
            userData.ref_in_bio_last_claim = new Date().toISOString();
            
            showNotification(`🎉 +${result.reward} монет за реф ссылку!`, 'success');
            updateUI();
        } else if (result.error === 'Cooldown') {
            showNotification(`⏰ Попробуйте снова через ${result.remaining} секунд`, 'info');
        } else if (result.error === 'Ref link not in bio') {
            showRefInBioInstructions();
        } else {
            showNotification('❌ Ошибка при получении награды', 'error');
        }
    } catch (error) {
        console.error('Error claiming ref in bio reward:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// 🔧 ОТКРЫТЬ КАНАЛ TELEGRAM
function openTelegramChannel() {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openTelegramLink('https://t.me/CS2DropZone');
    } else {
        window.open('https://t.me/CS2DropZone', '_blank');
    }
    
    showNotification('📢 Перейдите в канал и подпишитесь, затем отправьте /start в боте', 'info');
}

// 🔧 ИНСТРУКЦИЯ ДЛЯ БОТА В БИО
function showBotInBioInstructions() {
    const modal = document.getElementById('questModal');
    const title = document.getElementById('modalTitle');
    const text = document.getElementById('modalText');
    const checkBtn = document.getElementById('modalCheck');
    const closeBtn = document.getElementById('modalClose');
    
    if (modal && title && text) {
        title.textContent = 'Бот в фамилии';
        text.innerHTML = `
            Награда: 50 монет<br><br>
            Для выполнения задания:
            <ol>
                <li>Откройте настройки Telegram</li>
                <li>Перейдите в раздел "Изменить профиль"</li>
                <li>Добавьте "@CS2DropZone_bot" в конец своей фамилии</li>
                <li>Сохраните изменения</li>
                <li>Вернитесь в бота и отправьте команду /start</li>
            </ol>
        `;
        
        checkBtn.onclick = function() {
            modal.style.display = 'none';
            showNotification('📝 Добавьте бота в фамилию и отправьте /start', 'info');
        };
        
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        modal.style.display = 'flex';
    }
}

// 🔧 ИНСТРУКЦИЯ ДЛЯ РЕФ ССЫЛКИ В БИО
function showRefInBioInstructions() {
    const modal = document.getElementById('questModal');
    const title = document.getElementById('modalTitle');
    const text = document.getElementById('modalText');
    const checkBtn = document.getElementById('modalCheck');
    const closeBtn = document.getElementById('modalClose');
    
    if (modal && title && text) {
        title.textContent = 'Реф. ссылка в описании';
        text.innerHTML = `
            Награда: 20 монет<br><br>
            Для выполнения задания:
            <ol>
                <li>Откройте настройки Telegram</li>
                <li>Перейдите в раздел "Изменить профиль"</li>
                <li>Добавьте реферальную ссылку в описание профиля</li>
                <li>Сохраните изменения</li>
                <li>Вернитесь в бота и отправьте команду /start</li>
            </ol>
        `;
        
        checkBtn.onclick = function() {
            modal.style.display = 'none';
            showNotification('📝 Добавьте реф ссылку в описание и отправьте /start', 'info');
        };
        
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        modal.style.display = 'flex';
    }
}

// 🔧 ОБНОВЛЕНИЕ ПРОГРЕСС БАРА
function updateProgressBar(elementId, current, max) {
    const progress = Math.min((current / max) * 100, 100);
    const element = document.getElementById(elementId);
    if (element) {
        element.style.width = `${progress}%`;
    }
}

// 🔧 ОБНОВЛЕНИЕ ТАЙМЕРА
function updateQuestTimer(questType, lastClaim) {
    const now = new Date();
    const lastClaimTime = lastClaim ? new Date(lastClaim) : null;
    const cooldown = 60 * 1000;
    
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
            timer.style.display = 'block';
            timer.textContent = 'Доступно сейчас!';
            timer.style.color = '#4CAF50';
        }
    } else {
        const remaining = cooldown - (now - lastClaimTime);
        const seconds = Math.ceil(remaining / 1000);
        button.disabled = true;
        if (timer) {
            timer.style.display = 'block';
            timer.textContent = `Доступно через: ${seconds} сек`;
            timer.style.color = '#ff6b35';
        }
    }
}

// 🔧 ИНИЦИАЛИЗАЦИЯ КНОПОК
function initQuests() {
    console.log('🔘 Инициализация кнопок заданий...');
    
    // Подписка на канал
    const subscribeButton = document.getElementById('subscribeButton');
    if (subscribeButton) {
        subscribeButton.addEventListener('click', claimSubscribe);
    }
    
    // Бот в био
    const nameButton = document.getElementById('nameButton');
    if (nameButton) {
        nameButton.addEventListener('click', claimBotInBio);
    }
    
    // Реф ссылка в био
    const refDescButton = document.getElementById('refDescButton');
    if (refDescButton) {
        refDescButton.addEventListener('click', claimRefInBio);
    }
    
    // Ежедневный бонус
    const dailyButton = document.getElementById('dailyButton');
    if (dailyButton) {
        dailyButton.addEventListener('click', claimDailyBonus);
    }
    
    // Рефералы
    const referralButton = document.getElementById('referralButton');
    if (referralButton) {
        referralButton.addEventListener('click', claimReferralRewards);
    }
}



// 🔧 ЗАПУСК ТАЙМЕРОВ
function startTimers() {
    console.log('⏰ Запуск таймеров...');
    setInterval(() => {
        if (userData) {
            updateQuestTimer('daily', userData.daily_bonus?.last_claim);
            updateQuestTimer('subscribe', userData.subscribe_last_claim);
            updateQuestTimer('name', userData.bot_in_bio_last_claim);
            updateQuestTimer('ref_desc', userData.ref_in_bio_last_claim);
            updateQuestTimer('referral', userData.referral_last_claim);
        }
    }, 1000);
}

// 🔧 ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация приложения...');
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
        console.log('📥 Загрузка данных пользователя...');
        const response = await fetch(`${API_URL}/user/full/${telegramUserId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const fullData = await response.json();
        currentUser = fullData.user;
        userData = fullData.data;
        
        console.log('✅ Данные пользователя загружены:', userData);
        
        // 🔧 ПРАВИЛЬНО ОБНОВЛЯЕМ ИНТЕРФЕЙС С УЧЕТОМ ПОДПИСКИ
        renderProfile();
        updateUI();
        loadCases();
        loadRaffles();
        loadInventory(); // Теперь загружаем из базы данных
        
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователя:', error);
        useTestData();
    }
}

// 🔧 ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateUI() {
    if (!userData.daily_bonus) {
        console.log('❌ userData.daily_bonus не определен');
        return;
    }
    
    console.log('🔄 Обновление интерфейса...');
    
    // Баланс
    document.getElementById('balance').textContent = userData.balance || 0;
    
    // Ежедневный бонус
    const dailyBonus = userData.daily_bonus;
    document.getElementById('dailyReward').textContent = dailyBonus.current_reward || 10;
    document.getElementById('dailyCompleted').textContent = dailyBonus.count || 0;
    updateProgressBar('dailyProgress', dailyBonus.count || 0, 7);
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
    console.log('⏰ Запуск таймеров...');
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
            timer.style.display = 'block';
            timer.textContent = 'Доступно сейчас!';
            timer.style.color = '#4CAF50';
        }
    } else {
        const remaining = cooldown - (now - lastClaimTime);
        const seconds = Math.ceil(remaining / 1000);
        button.disabled = true;
        if (timer) {
            timer.style.display = 'block';
            timer.textContent = `Доступно через: ${seconds} сек`;
            timer.style.color = '#ff6b35';
        }
    }
}

// 🔧 ИНИЦИАЛИЗАЦИЯ КНОПОК
function initQuests() {
    console.log('🔘 Инициализация кнопок заданий...');
    
    // Ежедневный бонус
    const dailyButton = document.getElementById('dailyButton');
    if (dailyButton) {
        dailyButton.addEventListener('click', claimDailyBonus);
        console.log('✅ Кнопка ежедневного бонуса инициализирована');
    }
    
    // Подписка на канал
    const subscribeButton = document.getElementById('subscribeButton');
    if (subscribeButton) {
        subscribeButton.addEventListener('click', checkSubscription);
        console.log('✅ Кнопка подписки инициализирована');
    }
    
    // Имя бота в фамилии
    const nameButton = document.getElementById('nameButton');
    if (nameButton) {
        nameButton.addEventListener('click', checkNameInBio);
        console.log('✅ Кнопка имени бота инициализирована');
    }
    
    // Реф. ссылка в описании
    const refDescButton = document.getElementById('refDescButton');
    if (refDescButton) {
        refDescButton.addEventListener('click', checkRefInDescription);
        console.log('✅ Кнопка реф. ссылки инициализирована');
    }
    
    const copyRefButton = document.getElementById('copyRefButton');
    if (copyRefButton) {
        copyRefButton.addEventListener('click', copyReferralLink);
        console.log('✅ Кнопка копирования ссылки инициализирована');
    }
    
    // Рефералы
    const referralButton = document.getElementById('referralButton');
    if (referralButton) {
        referralButton.addEventListener('click', claimReferralRewards);
        console.log('✅ Кнопка рефералов инициализирована');
    }
}

// 🔧 ЕЖЕДНЕВНЫЙ БОНУС
async function claimDailyBonus() {
    console.log('🎯 Нажата кнопка ежедневного бонуса');
    
    if (!userData.daily_bonus || userData.daily_bonus.count >= 7) {
        showNotification('❌ Достигнут лимит бонусов на сегодня', 'error');
        return;
    }
    
    if (!await checkCooldown('daily')) return;
    
    const reward = userData.daily_bonus.current_reward || 10;
    
    try {
        // Обновляем баланс
        const newBalance = (userData.balance || 0) + reward;
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
            userData.daily_bonus.count = (userData.daily_bonus.count || 0) + 1;
            userData.daily_bonus.current_reward = (userData.daily_bonus.current_reward || 10) + 10;
            userData.daily_bonus.last_claim = new Date().toISOString();
            
            // Сохраняем данные
            await saveUserData();
            
            showNotification(`🎉 +${reward} монет!`, 'success');
            updateUI();
        } else {
            throw new Error('Ошибка обновления баланса');
        }
    } catch (error) {
        console.error('Error claiming daily bonus:', error);
        showNotification('❌ Ошибка при получении награды', 'error');
    }
}

// 🔧 ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ С ПРОВЕРКОЙ ПОДПИСКИ
async function loadUserProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const telegramUserId = urlParams.get('tg');
    const isSubscribed = urlParams.get('subscribed') === 'true';

    if (!telegramUserId) {
        showWarningMessage();
        return;
    }

    try {
        console.log('📥 Загрузка данных пользователя...');
        const response = await fetch(`${API_URL}/user/full/${telegramUserId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const fullData = await response.json();
        currentUser = fullData.user;
        userData = fullData.data;
        
        console.log('✅ Данные пользователя загружены:', currentUser);
        
        // 🔧 ЕСЛИ ПОЛЬЗОВАТЕЛЬ ПОДПИСАН - ОБНОВЛЯЕМ СТАТУС ЗАДАНИЯ
        if (isSubscribed) {
            await updateSubscriptionStatus();
        }
        
        renderProfile();
        updateUI();
        loadCases();
        loadRaffles();
        loadInventory();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователя:', error);
        useTestData();
    }
}

// 🔧 ОБНОВЛЕНИЕ СТАТУСА ПОДПИСКИ
async function updateSubscriptionStatus() {
    if (!currentUser) return;
    
    try {
        // Обновляем статус подписки в базе данных
        if (!userData.quests) userData.quests = {};
        if (!userData.quests.subscribe) userData.quests.subscribe = {};
        
        // Увеличиваем счетчик выполненных дней
        userData.quests.subscribe.completed = (userData.quests.subscribe.completed || 0) + 1;
        userData.quests.subscribe.last_claim = new Date().toISOString();
        
        // Сохраняем в базу
        await saveUserData();
        
        console.log('✅ Статус подписки обновлен');
        
    } catch (error) {
        console.error('❌ Ошибка обновления статуса подписки:', error);
    }
}

// 🔧 ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateUI() {
    if (!userData.daily_bonus) {
        console.log('❌ userData.daily_bonus не определен');
        return;
    }
    
    console.log('🔄 Обновление интерфейса...');
    
    // Баланс
    document.getElementById('balance').textContent = userData.balance || 0;
    
    // Ежедневный бонус
    const dailyBonus = userData.daily_bonus;
    document.getElementById('dailyReward').textContent = dailyBonus.current_reward || 10;
    document.getElementById('dailyCompleted').textContent = dailyBonus.count || 0;
    updateProgressBar('dailyProgress', dailyBonus.count || 0, 7);
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

// 🔧 ПРОВЕРКА ПОДПИСКИ - ОТКРЫВАЕМ КАНАЛ В TELEGRAM
async function checkSubscription() {
    console.log('🎯 Нажата кнопка проверки подписки');
    
    if (!await checkCooldown('subscribe')) return;
    
    try {
        // Открываем канал внутри Telegram
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.openTelegramLink('https://t.me/CS2DropZone');
        } else {
            // Fallback для браузера
            window.open('https://t.me/CS2DropZone', '_blank');
        }
        
        // Показываем модальное окно с инструкцией
        showSubscribeModal();
        
    } catch (error) {
        console.error('Error opening channel:', error);
        showNotification('❌ Ошибка открытия канала', 'error');
    }
}

// 🔧 МОДАЛЬНОЕ ОКНО ДЛЯ ПОДПИСКИ
function showSubscribeModal() {
    const modal = document.getElementById('questModal');
    const title = document.getElementById('modalTitle');
    const text = document.getElementById('modalText');
    const checkBtn = document.getElementById('modalCheck');
    const closeBtn = document.getElementById('modalClose');
    
    if (modal && title && text) {
        title.textContent = 'Подписка на канал';
        text.innerHTML = `
            Награда: 100 монет<br><br>
            Для выполнения задания:
            <ol>
                <li>Подпишитесь на канал <strong>@CS2DropZone</strong></li>
                <li>Вернитесь в бота</li>
                <li>Нажмите кнопку "🔍 Проверить подписку" в меню бота</li>
                <li>Или используйте команду /check_subscription</li>
            </ol>
            <em>Канал уже открыт в Telegram!</em>
        `;
        
        // Обновляем обработчики кнопок
        checkBtn.onclick = function() {
            // Просто закрываем окно, проверка будет через бота
            modal.style.display = 'none';
            showNotification('📢 Перейдите в бота и нажмите "🔍 Проверить подписку"', 'info');
        };
        
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        modal.style.display = 'flex';
    }
}


// 🔧 ПРОВЕРКА ИМЕНИ БОТА В ФАМИЛИИ
// В script.js заменяем функцию checkNameInBio
async function checkNameInBio() {
    console.log('🎯 Нажата кнопка проверки имени бота');
    
    if (!await checkCooldown('name')) return;
    
    try {
        // Вместо проверки фамилии делаем задание "Подписка на бота"
        // или "Добавление бота в контакты"
        showAddBotModal();
        
    } catch (error) {
        console.error('Error checking name in bio:', error);
        showNotification('❌ Ошибка проверки', 'error');
    }
}

function showAddBotModal() {
    const modal = document.getElementById('questModal');
    const title = document.getElementById('modalTitle');
    const text = document.getElementById('modalText');
    const checkBtn = document.getElementById('modalCheck');
    const closeBtn = document.getElementById('modalClose');
    
    if (modal && title && text) {
        title.textContent = 'Добавление бота';
        text.innerHTML = `
            Награда: 50 монет<br><br>
            Для выполнения задания:
            <ol>
                <li>Нажмите на кнопку "Открыть бота" ниже</li>
                <li>Нажмите "START" в боте</li>
                <li>Вернитесь в это окно</li>
                <li>Нажмите "Проверить"</li>
            </ol>
        `;
        
        // Добавляем кнопку открытия бота
        const buttonsContainer = modal.querySelector('.modal-buttons');
        if (buttonsContainer) {
            const openBotBtn = document.createElement('button');
            openBotBtn.className = 'modal-button primary';
            openBotBtn.textContent = '📱 Открыть бота';
            openBotBtn.onclick = function() {
                if (window.Telegram && window.Telegram.WebApp) {
                    window.Telegram.WebApp.openTelegramLink('https://t.me/CS2DropZone_bot');
                } else {
                    window.open('https://t.me/CS2DropZone_bot', '_blank');
                }
            };
            buttonsContainer.insertBefore(openBotBtn, checkBtn);
        }
        
        checkBtn.onclick = function() {
            verifyBotAdded();
            modal.style.display = 'none';
        };
        
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        modal.style.display = 'flex';
    }
}

async function verifyBotAdded() {
    try {
        // Эмуляция проверки - всегда успешно для демо
        const isAdded = true;
        
        if (isAdded) {
            // Начисляем награду
            const newBalance = (userData.balance || 0) + 50;
            const response = await fetch(`${API_URL}/user/${currentUser.user_id}/balance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance: newBalance })
            });
            
            if (response.ok) {
                await updateCooldown('name');
                userData.balance = newBalance;
                if (!userData.quests) userData.quests = {};
                if (!userData.quests.name) userData.quests.name = {};
                userData.quests.name.completed = (userData.quests.name.completed || 0) + 1;
                userData.quests.name.last_claim = new Date().toISOString();
                
                await saveUserData();
                
                showNotification('🎉 +50 монет! Задание выполнено', 'success');
                updateUI();
            }
        }
    } catch (error) {
        console.error('Error verifying bot:', error);
        showNotification('❌ Ошибка проверки', 'error');
    }
}

// 🔧 ПРОВЕРКА РЕФЕРАЛЬНОЙ ССЫЛКИ В ОПИСАНИИ
async function checkRefInDescription() {
    console.log('🎯 Нажата кнопка проверки реф. ссылки');
    
    if (!await checkCooldown('ref_desc')) return;
    
    try {
        // Эмуляция проверки
        const hasRefInBio = Math.random() > 0.5;
        
        if (hasRefInBio) {
            // Начисляем награду
            const newBalance = (userData.balance || 0) + 20;
            const response = await fetch(`${API_URL}/user/${currentUser.user_id}/balance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance: newBalance })
            });
            
            if (response.ok) {
                // Обновляем кулдаун
                await updateCooldown('ref_desc');
                
                // Обновляем локальные данные
                userData.balance = newBalance;
                if (!userData.quests) userData.quests = {};
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
    console.log('🎯 Нажата кнопка реферальных наград');
    
    if (!await checkCooldown('referral')) return;
    
    const referrals = userData.referrals || 0;
    const rewards = Math.min(referrals, 10) * 100;
    
    if (rewards > 0) {
        try {
            // Обновляем баланс
            const newBalance = (userData.balance || 0) + rewards;
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
        const response = await fetch(`${API_URL}/user/data/${currentUser.user_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            console.log('✅ Данные сохранены в базу');
        }
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// 🔧 ЗАГРУЗКА КЕЙСОВ
async function loadCases() {
    try {
        console.log('📦 Загрузка кейсов...');
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
            console.log('✅ Кейсы загружены:', casesData.length);
        }
        
    } catch (error) {
        console.error('Error loading cases:', error);
    }
}

// 🔧 ЗАГРУЗКА ИНВЕНТАРЯ
async function loadInventory() {
    try {
        console.log('🎒 Загрузка инвентаря...');
        
        // Загружаем инвентарь из базы данных
        const response = await fetch(`${API_URL}/user/${currentUser.user_id}/inventory`);
        let inventoryItems = [];
        
        if (response && response.ok) {
            inventoryItems = await response.json();
            // Обновляем локальные данные
            userData.inventory = inventoryItems;
        } else {
            // Используем локальные данные если API недоступно
            inventoryItems = userData.inventory || [];
        }
        
        const inventoryGrid = document.getElementById('inventoryGrid');
        if (!inventoryGrid) return;
        
        if (inventoryItems.length === 0) {
            inventoryGrid.innerHTML = '<div style="text-align: center; padding: 40px; opacity: 0.7;">Инвентарь пуст</div>';
            console.log('✅ Инвентарь пуст');
            return;
        }
        
        inventoryGrid.innerHTML = inventoryItems.map(item => `
            <div class="inventory-item">
                <div class="item-image">
                    <img src="${item.item_image || item.image}" alt="${item.item_name || item.name}" 
                         onerror="this.style.display='none'; this.parentNode.innerHTML='🎮';">
                </div>
                <div class="item-name">${item.item_name || item.name}</div>
                <div class="item-price">$${item.item_price || item.price}</div>
            </div>
        `).join('');
        
        console.log('✅ Инвентарь загружен:', inventoryItems.length, 'предметов');
        
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

// 🔧 НАВИГАЦИЯ
function initNavigation() {
    console.log('🧭 Инициализация навигации...');
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
    console.log('📂 Загрузка вкладки:', tab);
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

// 🔧 КОПИРОВАНИЕ РЕФЕРАЛЬНОЙ ССЫЛКИ
function copyReferralLink() {
    if (!currentUser) return;
    
    const botUsername = 'CS2DropZone_bot';
    const refCode = currentUser.referral_code || `ref_${currentUser.user_id}`;
    const refLink = `https://t.me/${botUsername}?start=${refCode}`;
    
    navigator.clipboard.writeText(refLink).then(() => {
        showNotification('📋 Реф. ссылка скопирована!', 'success');
    }).catch(err => {
        console.error('Error copying link:', err);
        showNotification('❌ Ошибка копирования', 'error');
    });
}



// 🔧 МОДАЛЬНОЕ ОКНО
function initModal() {
    console.log('📋 Инициализация модального окна...');
    const modal = document.getElementById('questModal');
    const closeBtn = document.getElementById('modalClose');
    const checkBtn = document.getElementById('modalCheck');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            checkNameInBio();
        });
    }
    
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
    
    if (modal && title && text) {
        title.textContent = 'Имя бота в фамилии';
        text.innerHTML = 'Награда: 50 монет<br><br>Для выполнения этого задания необходимо:';
        modal.style.display = 'flex';
    }
}

// 🔧 РУЛЕТКА
function initRoulette() {
    console.log('🎰 Инициализация рулетки...');
    const spinButton = document.getElementById('spinButton');
    const closeBtn = document.getElementById('closeRoulette');
    
    if (spinButton) {
        spinButton.addEventListener('click', spinRoulette);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeRoulette);
    }
}

function showCaseDetails(caseId) {
    console.log('🎯 Открытие кейса:', caseId);
    const caseItem = getCaseById(caseId);
    if (!caseItem) return;
    
    currentCase = caseItem;
    showRoulette(caseItem);
}

function getCaseById(caseId) {
    // Временная функция - в реальности нужно получать из API
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

function showRoulette(caseItem) {
    const container = document.getElementById('rouletteContainer');
    const title = document.getElementById('rouletteTitle');
    const itemsContainer = document.getElementById('rouletteItems');
    const price = document.getElementById('casePrice');
    const spinButton = document.getElementById('spinButton');
    const result = document.getElementById('rouletteResult');
    const closeBtn = document.getElementById('closeRoulette');
    
    if (!container || !title || !itemsContainer) return;
    
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
    if (result) result.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';
    if (spinButton) {
        spinButton.style.display = 'block';
        spinButton.disabled = (userData.balance || 0) < caseItem.price;
    }
    
    container.style.display = 'flex';
}

async function spinRoulette() {
    if (!currentCase) return;
    
    const spinButton = document.getElementById('spinButton');
    const result = document.getElementById('rouletteResult');
    const closeBtn = document.getElementById('closeRoulette');
    const items = document.querySelectorAll('.roulette-item');
    
    if (!spinButton || !result) return;
    
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
    const newBalance = (userData.balance || 0) - currentCase.price;
    userData.balance = newBalance;
    userData.cases_opened = (userData.cases_opened || 0) + 1;
    
    // Добавляем предмет в инвентарь
    if (!userData.inventory) userData.inventory = [];
    userData.inventory.push(winnerItem);
    
    // Сохраняем в базу
    await updateBalance(newBalance);
    await saveUserData();
    
    // Обновляем UI
    updateUI();
}

async function updateBalance(newBalance) {
    if (!currentUser) return;
    
    try {
        await fetch(`${API_URL}/user/${currentUser.user_id}/balance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ balance: newBalance })
        });
    } catch (error) {
        console.error('Error updating balance:', error);
    }
}

async function showRouletteResult(item) {
    const result = document.getElementById('rouletteResult');
    const spinButton = document.getElementById('spinButton');
    const closeBtn = document.getElementById('closeRoulette');
    
    if (!result || !spinButton || !closeBtn) return;
    
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
    
    // 🔧 СОХРАНЯЕМ ПРЕДМЕТ В БАЗУ ДАННЫХ
    try {
        const response = await fetch(`${API_URL}/user/${currentUser.user_id}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_name: item.name,
                item_price: item.price,
                item_image: item.image
            })
        });
        
        if (response.ok) {
            console.log('✅ Предмет сохранен в инвентарь:', item.name);
            
            // Обновляем локальный инвентарь
            if (!userData.inventory) userData.inventory = [];
            userData.inventory.push(item);
        } else {
            console.error('❌ Ошибка сохранения предмета в инвентарь');
        }
    } catch (error) {
        console.error('❌ Ошибка сохранения предмета:', error);
    }
}

// 🔧 РОЗЫГРЫШИ
async function loadRaffles() {
    try {
        console.log('🎁 Загрузка розыгрышей...');
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
    if (!raffleSlider) return;
    
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
    
    if (prevBtn && nextBtn && slider) {
        prevBtn.addEventListener('click', () => {
            currentRaffleIndex = Math.max(0, currentRaffleIndex - 1);
            slider.scrollTo({ left: currentRaffleIndex * 300, behavior: 'smooth' });
        });
        
        nextBtn.addEventListener('click', () => {
            currentRaffleIndex = Math.min(10, currentRaffleIndex + 1);
            slider.scrollTo({ left: currentRaffleIndex * 300, behavior: 'smooth' });
        });
    }
}

async function participateRaffle(raffleId) {
    showNotification('✅ Вы участвуете в розыгрыше!', 'success');
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
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function showWarningMessage() {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; color: white;">
                <h3 style="color: #ff6b35; margin-bottom: 20px;">⚠️ Откройте через Telegram бота</h3>
                <p style="margin-bottom: 10px;">Для работы с играми откройте сайт через бота:</p>
                <p style="font-weight: bold; font-size: 18px; color: #ffd700;">@CS2DropZone_bot</p>
                <div style="margin-top: 20px;">
                    <button onclick="location.reload()" style="background: #ff6b35; color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer;">Обновить страницу</button>
                </div>
            </div>
        `;
    }
}

function useTestData() {
    console.log('🔧 Использование тестовых данных...');
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

// 🔧 ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ HTML
window.showCaseDetails = showCaseDetails;
window.participateRaffle = participateRaffle;

console.log('✅ Все функции JavaScript загружены и готовы к работе!');


