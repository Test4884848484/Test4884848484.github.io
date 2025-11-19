// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;

// Расширяем на весь экран
tg.expand();

// Получаем данные пользователя
const user = tg.initDataUnsafe.user;

// Отображаем данные пользователя
if (user) {
    document.getElementById('username').textContent = user.username ? `@${user.username}` : 'Не указан';
    document.getElementById('firstName').textContent = user.first_name || 'Не указано';
    document.getElementById('lastName').textContent = user.last_name || 'Не указано';
} else {
    document.getElementById('userData').innerHTML = '<p>Данные пользователя недоступны</p>';
}

// Функция для показа alert
function showAlert() {
    tg.showAlert('Привет из Telegram Web App!');
}

// Обработчик события нажатия на кнопку "Назад"
tg.BackButton.onClick(() => {
    tg.close();
});

// Показываем кнопку "Назад"
tg.BackButton.show();
