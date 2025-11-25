// 🔧 КОНФИГУРАЦИЯ
const API_URL = 'https://my-backend-production-9034.up.railway.app/api';

let currentUser = null;
let userData = {};
let currentCase = null;

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
        userData = fullData.quests;
        
        console.log('✅ Данные пользователя загружены:', currentUser);
        
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
    
    console.log('🔄 Обновление интерфейса...', userData);
    
    // Баланс
    document.getElementById('balance').textContent = currentUser?.balance || 0;
    
    // Ежедневный бонус
    const dailyBonus = userData.daily_bonus || {};
    document.getElementById('dailyReward').textContent = dailyBonus.current_reward || 10;
    document.getElementById('dailyCompleted').textContent = dailyBonus.count || 0;
    updateProgressBar('dailyProgress', dailyBonus.count || 0, 7);
    updateQuestTimer('daily', dailyBonus.last_claim);
    
    // Задания (только отображение статуса)
    updateQuestDisplay('subscribe', userData.subscribe_completed, userData.subscribe_last_claim, 100);
    updateQuestDisplay('name', userData.bot_in_bio_completed, userData.bot_in_bio_last_claim, 50);
    updateQuestDisplay('ref_desc', userData.ref_in_bio_completed, userData.ref_in_bio_last_claim, 20);
    
    // Рефералы
    document.getElementById('referralCount').textContent = userData.referrals || 0;
    updateProgressBar('referralProgress', userData.referrals || 0, 10);
}

// 🔧 ОТОБРАЖЕНИЕ СТАТУСА ЗАДАНИЙ (только информация)
function updateQuestDisplay(questType, completed, lastClaim, reward) {
    const completedElement = document.getElementById(`${questType}Completed`);
    const progressElement = document.getElementById(`${questType}Progress`);
    const buttonElement = document.getElementById(`${questType}Button`);
    const timerElement = document.getElementById(`${questType}Timer`);
    
    if (completedElement) {
        completedElement.textContent = completed || 0;
    }
    
    if (progressElement) {
        updateProgressBar(`${questType}Progress`, completed || 0, 10);
    }
    
    if (buttonElement) {
        const now = new Date();
        const lastClaimTime = lastClaim ? new Date(lastClaim) : null;
        const cooldown = 24 * 60 * 60 * 1000; // 24 часа
        
        if (lastClaimTime && (now - lastClaimTime) < cooldown) {
            // Задание уже выполнено сегодня
            buttonElement.disabled = true;
            buttonElement.textContent = 'Выполнено сегодня';
            buttonElement.style.background = '#666';
            buttonElement.onclick = null;
            
            if (timerElement) {
                const remaining = cooldown - (now - lastClaimTime);
                const hours = Math.floor(remaining / (60 * 60 * 1000));
                const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                timerElement.style.display = 'block';
                timerElement.textContent = `Доступно через: ${hours}ч ${minutes}м`;
                timerElement.style.color = '#ff6b35';
            }
        } else {
            // Задание можно выполнить (но только через бота)
            buttonElement.disabled = false;
            buttonElement.textContent = 'Выполнить в боте';
            buttonElement.style.background = 'linear-gradient(45deg, #2196F3, #21CBF3)';
            buttonElement.onclick = function() {
                showBotInstructions(questType);
            };
            
            if (timerElement) {
                timerElement.style.display = 'block';
                timerElement.textContent = 'Доступно сейчас!';
                timerElement.style.color = '#4CAF50';
            }
        }
    }
}

// 🔧 ИНСТРУКЦИЯ ДЛЯ ВЫПОЛНЕНИЯ ЗАДАНИЯ В БОТЕ
function showBotInstructions(questType) {
    const modal = document.getElementById('questModal');
    const title = document.getElementById('modalTitle');
    const text = document.getElementById('modalText');
    const checkBtn = document.getElementById('modalCheck');
    const closeBtn = document.getElementById('modalClose');
    
    if (!modal || !title || !text) return;
    
    let questInfo = {};
    
    switch(questType) {
        case 'subscribe':
            questInfo = {
                title: 'Подписка на канал',
                reward: '100 монет',
                steps: [
                    'Откройте Telegram бота @CS2DropZone_bot',
                    'Нажмите кнопку "📋 Задания"',
                    'Выберите "📢 Подписка на канал"',
                    'Нажмите "🔍 Проверить подписку"',
                    'Получите награду!'
                ]
            };
            break;
        case 'name':
            questInfo = {
                title: 'Бот в фамилии',
                reward: '50 монет',
                steps: [
                    'Откройте Telegram бота @CS2DropZone_bot',
                    'Нажмите кнопку "📋 Задания"',
                    'Выберите "🤖 Бот в фамилии"',
                    'Нажмите "🔍 Проверить фамилию"',
                    'Получите награду!'
                ]
            };
            break;
        case 'ref_desc':
            questInfo = {
                title: 'Реф. ссылка в описании',
                reward: '20 монет',
                steps: [
                    'Откройте Telegram бота @CS2DropZone_bot',
                    'Нажмите кнопку "📋 Задания"',
                    'Выберите "🔗 Реф. ссылка в описании"',
                    'Нажмите "🔍 Проверить описание"',
                    'Получите награду!'
                ]
            };
            break;
    }
    
    title.textContent = questInfo.title;
    text.innerHTML = `
        Награда: ${questInfo.reward}<br><br>
        Для выполнения задания:
        <ol>
            ${questInfo.steps.map(step => `<li>${step}</li>`).join('')}
        </ol>
        <br>
        <em>Задание выполняется только через Telegram бота!</em>
    `;
    
    // Добавляем кнопку открытия бота
    const buttonsContainer = modal.querySelector('.modal-buttons');
    if (buttonsContainer) {
        // Удаляем старую кнопку если есть
        const oldBtn = buttonsContainer.querySelector('.open-bot-btn');
        if (oldBtn) oldBtn.remove();
        
        const openBotBtn = document.createElement('button');
        openBotBtn.className = 'modal-button primary open-bot-btn';
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
        modal.style.display = 'none';
        // Обновляем данные
        loadUserProfile();
    };
    
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    modal.style.display = 'flex';
}

// 🔧 ОБНОВЛЕНИЕ ПРОГРЕСС БАРА
function updateProgressBar(elementId, current, max) {
    const progress = Math.min((current / max) * 100, 100);
    const element = document.getElementById(elementId);
    if (element) {
        element.style.width = `${progress}%`;
    }
}

// 🔧 ОБНОВЛЕНИЕ ТАЙМЕРА (только для ежедневного бонуса)
function updateQuestTimer(questType, lastClaim) {
    if (questType !== 'daily') return;
    
    const button = document.getElementById('dailyButton');
    const timer = document.getElementById('dailyTimer');
    
    if (!button) return;
    
    const now = new Date();
    const lastClaimTime = lastClaim ? new Date(lastClaim) : null;
    const cooldown = 60 * 1000; // 1 минута для теста
    
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
    
    // Остальные кнопки - обработчики устанавливаются динамически в updateQuestDisplay
    console.log('✅ Все кнопки инициализированы');
}

// 🔧 ЕЖЕДНЕВНЫЙ БОНУС (исправленная версия)
async function claimDailyBonus() {
    console.log('🎯 Нажата кнопка ежедневного бонуса');
    
    if (!currentUser) {
        showNotification('❌ Пользователь не найден', 'error');
        return;
    }
    
    const dailyBonus = userData.daily_bonus || {};
    const reward = dailyBonus.current_reward || 10;
    
    try {
        // ТОЛЬКО ОДИН ЗАПРОС - обновляем все данные сразу
        const saveResponse = await fetch(`${API_URL}/user/data/${currentUser.user_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                balance: (currentUser.balance || 0) + reward,
                daily_bonus: {
                    count: (dailyBonus.count || 0) + 1,
                    last_claim: new Date().toISOString(),
                    current_reward: (dailyBonus.current_reward || 10) + 10
                }
            })
        });
        
        if (saveResponse.ok) {
            // Обновляем локальные данные
            currentUser.balance = (currentUser.balance || 0) + reward;
            userData.daily_bonus = {
                count: (dailyBonus.count || 0) + 1,
                last_claim: new Date().toISOString(),
                current_reward: (dailyBonus.current_reward || 10) + 10
            };
            
            showNotification(`🎉 +${reward} монет!`, 'success');
            updateUI();
        } else {
            throw new Error('Ошибка сохранения данных');
        }
    } catch (error) {
        console.error('Error claiming daily bonus:', error);
        showNotification('❌ Ошибка при получении награды', 'error');
    }
}

// 🔧 ПРОФИЛЬ С ФОТО ИЗ БАЗЫ ДАННЫХ
function renderProfile() {
    if (!currentUser) return;
    
    console.log('👤 Рендеринг профиля...', currentUser);
    
    document.getElementById('profileName').textContent = 
        `${currentUser.first_name} ${currentUser.last_name || ''}`.trim();
    document.getElementById('profileUsername').textContent = 
        `@${currentUser.username || 'username'}`;
    document.getElementById('profileBalance').textContent = currentUser.balance || 0;
    document.getElementById('profileReferrals').textContent = userData.referrals || 0;
    document.getElementById('profileCases').textContent = userData.cases_opened || 0;
    document.getElementById('profileItems').textContent = currentUser.inventory?.length || 0;
    document.getElementById('profileLevel').textContent = userData.level || 1;
    
    // Аватар из базы данных
    const avatar = document.getElementById('profileAvatar');
    if (avatar) {
        if (currentUser.photo_base64) {
            // Используем base64 фото из базы
            avatar.innerHTML = `
                <img src="data:image/jpeg;base64,${currentUser.photo_base64}" alt="Avatar" 
                     style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
                     onerror="showAvatarPlaceholder(this.parentNode, '${currentUser.first_name}')">
            `;
            console.log('✅ Аватар загружен из базы данных (base64)');
        } else if (currentUser.photo_url) {
            // Используем URL фото из базы
            avatar.innerHTML = `
                <img src="${currentUser.photo_url}" alt="Avatar" 
                     style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
                     onerror="showAvatarPlaceholder(this.parentNode, '${currentUser.first_name}')">
            `;
            console.log('✅ Аватар загружен из базы данных (URL)');
        } else {
            showAvatarPlaceholder(avatar, currentUser.first_name);
        }
    }
}

// 🔧 PLACEHOLDER ДЛЯ АВАТАРА
function showAvatarPlaceholder(avatarElement, firstName) {
    if (!avatarElement) return;
    
    const firstLetter = firstName ? firstName[0].toUpperCase() : 'U';
    const colors = ['#ff6b35', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];
    const color = colors[firstLetter.charCodeAt(0) % colors.length];
    
    avatarElement.innerHTML = `
        <div style="width: 100%; height: 100%; border-radius: 50%; background: ${color}; 
                   display: flex; align-items: center; justify-content: center; 
                   color: white; font-size: 24px; font-weight: bold;">
            ${firstLetter}
        </div>
    `;
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
            casesData = [{
                id: 1,
                name: "Кейс Grunt",
                price: 100,
                image: "https://cs-shot.pro/images/new2/Grunt.png",
                total_opened: 1542,
                items: [
                    { name: "AK-47 | Redline", price: "1500", image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSIf6GDG6D_uJ_t-l9AX_nzBhw4TvWwo6udC2QbgZyWcN2RuMP4xHrlYDnYezm7geP3d5FyH3gznQeY_Oe4QY" }
                ]
            }];
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

// 🔧 ЗАГРУЗКА ИНВЕНТАРЯ
async function loadInventory() {
    try {
        console.log('🎒 Загрузка инвентаря...');
        const response = await fetch(`${API_URL}/user/${currentUser.user_id}/inventory`);
        let inventoryItems = [];
        
        if (response && response.ok) {
            inventoryItems = await response.json();
        }
        
        const inventoryGrid = document.getElementById('inventoryGrid');
        if (!inventoryGrid) return;
        
        if (inventoryItems.length === 0) {
            inventoryGrid.innerHTML = '<div style="text-align: center; padding: 40px; opacity: 0.7;">Инвентарь пуст</div>';
            return;
        }
        
        inventoryGrid.innerHTML = inventoryItems.map(item => `
            <div class="inventory-item">
                <div class="item-image">
                    <img src="${item.item_image}" alt="${item.item_name}" 
                         onerror="this.style.display='none'; this.parentNode.innerHTML='🎮';">
                </div>
                <div class="item-name">${item.item_name}</div>
                <div class="item-price">$${item.item_price}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

// 🔧 ЗАГРУЗКА РОЗЫГРЫШЕЙ
async function loadRaffles() {
    try {
        console.log('🎁 Загрузка розыгрышей...');
        const response = await fetch(`${API_URL}/raffles`);
        let raffles = [];
        
        if (response.ok) {
            raffles = await response.json();
        }
        
        renderRaffles(raffles);
        
    } catch (error) {
        console.error('Error loading raffles:', error);
    }
}

// 🔧 ОТОБРАЖЕНИЕ РОЗЫГРЫШЕЙ
function renderRaffles(raffles) {
    const raffleSlider = document.getElementById('raffleSlider');
    if (!raffleSlider) return;
    
    if (raffles.length === 0) {
        raffleSlider.innerHTML = '<div style="text-align: center; padding: 40px; opacity: 0.7;">Розыгрышей пока нет</div>';
        return;
    }
    
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

// 🔧 НАВИГАЦИЯ
function initNavigation() {
    console.log('🧭 Инициализация навигации...');
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

// 🔧 ИНИЦИАЛИЗАЦИЯ МОДАЛЬНОГО ОКНА
function initModal() {
    const modal = document.getElementById('questModal');
    const closeBtn = document.getElementById('modalClose');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// 🔧 УЧАСТИЕ В РОЗЫГРЫШЕ
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

// 🔧 ТЕСТОВЫЕ ДАННЫЕ
function useTestData() {
    console.log('🔧 Использование тестовых данных...');
    currentUser = {
        user_id: 6311564665,
        first_name: "Test",
        last_name: "User", 
        username: "testuser",
        balance: 150,
        photo_url: null
    };
    userData = {
        subscribe_completed: 2,
        bot_in_bio_completed: 1,
        ref_in_bio_completed: 0,
        daily_bonus: {
            count: 2,
            last_claim: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            current_reward: 30
        },
        referrals: 3,
        cases_opened: 5,
        level: 1
    };
    
    renderProfile();
    updateUI();
    loadCases();
    loadRaffles();
    loadInventory();
}

// 🔧 ЗАПУСК ТАЙМЕРОВ
function startTimers() {
    setInterval(() => {
        if (userData) {
            updateQuestTimer('daily', userData.daily_bonus?.last_claim);
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
    startTimers();
});

// 🔧 ГЛОБАЛЬНЫЕ ФУНКЦИИ
window.showCaseDetails = function(caseId) {
    showNotification('🎯 Функция открытия кейсов в разработке', 'info');
};

window.participateRaffle = participateRaffle;

console.log('✅ Все функции JavaScript загружены и готовы к работе!');

