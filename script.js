// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Расширяем на весь экран
tg.expand();

// Получаем данные из initData
function getUserIdFromInitData() {
    try {
        const initData = tg.initData;
        if (initData) {
            const urlParams = new URLSearchParams(initData);
            const userStr = urlParams.get('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.id;
            }
        }
        return null;
    } catch (error) {
        console.error('Error parsing initData:', error);
        return null;
    }
}

// Основная функция загрузки
async function initializeApp() {
    const userId = getUserIdFromInitData();
    
    if (!userId) {
        showError('Не удалось получить данные пользователя');
        return;
    }
    
    await displayUserData(userId);
}

// Функция для отображения данных пользователя
function displayUserData(userId) {
    // В GitHub Pages мы используем данные из Telegram Web App
    const tgUser = tg.initDataUnsafe.user;
    
    if (tgUser) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
        document.getElementById('userName').textContent = 
            tgUser.first_name || 'Пользователь';
        document.getElementById('userUsername').textContent = 
            tgUser.username ? `@${tgUser.username}` : 'Username не указан';
        
        // Фото профиля (если доступно)
        if (tgUser.photo_url) {
            document.getElementById('avatar').src = tgUser.photo_url;
        } else {
            // Заглушка для аватара
            document.getElementById('avatar').src = getDefaultAvatar(tgUser.first_name);
        }
    } else {
        showError('Данные пользователя не доступны');
    }
}

// Функция для создания заглушки аватара
function getDefaultAvatar(name) {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return `data:image/svg+xml;base64,${btoa(`
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="120" height="120" rx="60" fill="${color}"/>
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
                  font-family="Arial" font-size="40" fill="white">
                ${name ? name.charAt(0).toUpperCase() : 'U'}
            </text>
        </svg>
    `)}`;
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = message;
}

// Запуск приложения когда Telegram Web App готов
tg.ready();
initializeApp();
