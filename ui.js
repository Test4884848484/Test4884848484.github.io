// UI.js - Управление интерфейсом

const UI = {
    // Инициализация UI
    init: function() {
        console.log('Инициализация UI...');
        
        // Настройка кнопки старта
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
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
                this.restartGame();
            });
        }
        
        console.log('UI инициализирован');
    },

    // Начать игру
    startGame: function() {
        console.log('Запуск игры...');
        
        // Скрыть инструкции
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.style.display = 'none';
        }
        
        // Показать подсказку для смахивания
        const swipeHint = document.getElementById('swipe-hint');
        if (swipeHint) {
            swipeHint.style.display = 'block';
        }
        
        // Включить игру
        Game.state.gameStarted = true;
        
        // Обновить UI
        this.updateUI();
        
        console.log('Игра запущена!');
    },

    // Обновление UI
    updateUI: function() {
        const state = Game.state;
        
        // Здоровье
        const healthPercent = (state.health / state.maxHealth) * 100;
        const healthFill = document.getElementById('health-fill');
        const healthText = document.getElementById('health-text');
        
        if (healthFill) healthFill.style.width = `${healthPercent}%`;
        if (healthText) healthText.textContent = `${Math.round(state.health)}/${state.maxHealth}`;
        
        // Счет
        const scoreElement = document.getElementById('score');
        if (scoreElement) scoreElement.textContent = state.score;
        
        // Армия
        const armyCount = document.getElementById('army-count');
        if (armyCount) armyCount.textContent = state.army;
        
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
        
        // Текущие врата
        const currentGate = document.getElementById('current-gate');
        if (currentGate && Game.gates.length > 0) {
            const visibleGates = Game.gates.filter(gate => 
                Math.abs(gate.position.x - Game.config.platformPositions[state.currentPlatform]) < 2 &&
                gate.position.z > 5
            );
            
            if (visibleGates.length > 0) {
                currentGate.textContent = visibleGates[0].userData.value;
                currentGate.style.color = visibleGates[0].userData.isPositive ? '#00ff88' : '#ff5555';
            }
        }
    },

    // Показать уведомление
    showNotification: function(message, color = '#00ff88') {
        const notification = document.getElementById('gate-notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.style.borderColor = color;
        notification.style.color = color;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 2000);
    },

    // Показать экран окончания игры
    showGameOver: function() {
        const gameOverScreen = document.getElementById('game-over');
        if (!gameOverScreen) return;
        
        const state = Game.state;
        
        document.getElementById('final-army').textContent = state.army;
        document.getElementById('final-score').textContent = state.score;
        document.getElementById('gates-passed').textContent = state.gatesPassed;
        document.getElementById('high-score').textContent = state.highScore;
        
        gameOverScreen.style.display = 'flex';
    },

    // Перезапустить игру
    restartGame: function() {
        console.log('Перезапуск игры...');
        
        // Скрыть экран окончания игры
        const gameOverScreen = document.getElementById('game-over');
        if (gameOverScreen) {
            gameOverScreen.style.display = 'none';
        }
        
        // Сброс состояния игры
        Game.state = {
            score: 0,
            health: Game.config.initialHealth,
            maxHealth: Game.config.initialHealth,
            army: Game.config.initialArmy,
            currentPlatform: 1,
            weaponIndex: 0,
            gates: [],
            activeGates: [],
            boss: null,
            particles: [],
            gameOver: false,
            gameStarted: true,
            gatesPassed: 0,
            multiplier: 1,
            difficulty: 1.0
        };
        
        // Очистка сцены
        while(Game.scene.children.length > 0) {
            Game.scene.remove(Game.scene.children[0]);
        }
        
        // Очистка массивов
        Game.gates = [];
        Game.playerArmy = [];
        Game.particles = [];
        Game.platforms = [];
        
        // Пересоздание игры
        Game.createLighting();
        Game.createFloor();
        Game.createPlatforms();
        Game.createPlayer();
        Game.createArmy();
        Game.createInitialGates();
        
        // Обновление UI
        this.updateUI();
        
        console.log('Игра перезапущена!');
    }
};

// Инициализация UI при загрузке
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
