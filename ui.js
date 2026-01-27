// UI.js - Управление интерфейсом

const UI = {
    // Инициализация UI
    init: function() {
        console.log('Инициализация UI...');
        
        // Настройка кнопки старта
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            console.log('Найдена кнопка start-btn');
            startBtn.addEventListener('click', () => {
                console.log('Кнопка "Начать путешествие" нажата!');
                this.startGame();
            });
        } else {
            console.error('Кнопка start-btn не найдена!');
        }
        
        // Настройка кнопки рестарта
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                console.log('Перезапуск игры');
                this.restartGame();
            });
        }
        
        // Инициализация значений UI
        this.updateUI();
        
        console.log('UI инициализирован');
        return true;
    },

    // Начать игру
    startGame: function() {
        console.log('Запуск игры через UI.startGame()');
        
        // Скрыть инструкции
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.style.display = 'none';
            console.log('Инструкции скрыты');
        }
        
        // Показать подсказку для смахивания
        const swipeHint = document.getElementById('swipe-hint');
        if (swipeHint) {
            swipeHint.style.display = 'block';
        }
        
        // Включить игру
        Game.state.gameStarted = true;
        console.log('Игра активирована: gameStarted =', Game.state.gameStarted);
        
        // Запустить игровой цикл
        Game.gameLoop();
        
        console.log('Игра запущена!');
    },

    // Обновление UI
    updateUI: function() {
        const state = Game.state;
        
        // Здоровье
        const healthFill = document.getElementById('health-fill');
        const healthText = document.getElementById('health-text');
        
        if (healthFill && healthText) {
            const healthPercent = (state.health / state.maxHealth) * 100;
            healthFill.style.width = `${healthPercent}%`;
            healthText.textContent = `${Math.round(state.health)}/${state.maxHealth}`;
        }
        
        // Счет
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = state.score;
        }
        
        // Армия
        const armyCount = document.getElementById('army-count');
        if (armyCount) {
            armyCount.textContent = state.army;
        }
        
        // Оружие
        const weaponName = document.getElementById('weapon-name');
        const weaponDamage = document.getElementById('weapon-damage');
        const weaponSpeed = document.getElementById('weapon-speed');
        
        if (weaponName && weaponDamage && weaponSpeed) {
            const currentWeapon = Game.config.weapons[state.weaponIndex];
            weaponName.textContent = currentWeapon.name;
            weaponDamage.textContent = currentWeapon.damage;
            weaponSpeed.textContent = currentWeapon.speed.toFixed(1);
        }
    },
