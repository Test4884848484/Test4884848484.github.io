// Controls.js - Управление игрой

const Controls = {
    isMouseDown: false,
    lastMouseX: 0,
    lastMouseY: 0,
    touchStartX: 0,

    // Инициализация управления
    init: function() {
        console.log('Инициализация управления...');
        
        // Мышь - вращение камеры
        document.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
        
        // Клик - атака
        document.addEventListener('click', this.onClick.bind(this));
        
        // Клавиатура
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Сенсорное управление
        document.addEventListener('touchstart', this.onTouchStart.bind(this));
        document.addEventListener('touchmove', this.onTouchMove.bind(this));
        document.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // Мобильные кнопки
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        
        if (btnLeft) {
            btnLeft.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.moveToLeftPlatform();
            });
        }
        
        if (btnRight) {
            btnRight.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.moveToRightPlatform();
            });
        }
        
        console.log('Управление инициализировано');
    },

    // Обработка нажатия мыши
    onMouseDown: function(e) {
        if (!Game.state.gameStarted) return;
        
        this.isMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    },

    // Обработка движения мыши
    onMouseMove: function(e) {
        if (!this.isMouseDown || !Game.state.gameStarted) return;
        
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        
        if (Game.camera) {
            Game.camera.rotation.y -= deltaX * 0.01;
            Game.camera.rotation.x = Math.max(-0.5, Math.min(0.5, Game.camera.rotation.x - deltaY * 0.01));
        }
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    },

    // Обработка отпускания мыши
    onMouseUp: function() {
        this.isMouseDown = false;
    },

    // Обработка клика
    onClick: function() {
        if (!Game.state.gameStarted) return;
        
        // Атака
        if (typeof Game.attack === 'function') {
            Game.attack();
        }
    },

    // Обработка нажатия клавиш
    onKeyDown: function(e) {
        if (!Game.state.gameStarted) return;
        
        switch(e.key) {
            case 'ArrowLeft':
            case 'a':
                this.moveToLeftPlatform();
                break;
            case 'ArrowRight':
            case 'd':
                this.moveToRightPlatform();
                break;
            case ' ':
                if (typeof Game.attack === 'function') {
                    Game.attack();
                }
                break;
        }
    },

    // Обработка касания
    onTouchStart: function(e) {
        e.preventDefault();
        
        if (!Game.state.gameStarted) return;
        
        this.touchStartX = e.touches[0].clientX;
        
        // Атака при касании
        if (typeof Game.attack === 'function') {
            Game.attack();
        }
    },

    // Обработка движения пальца
    onTouchMove: function(e) {
        e.preventDefault();
        
        if (!Game.state.gameStarted) return;
        
        const touchX = e.touches[0].clientX;
        const deltaX = touchX - this.touchStartX;
        
        // Управление камерой
        if (Game.camera) {
            Game.camera.rotation.y -= deltaX * 0.005;
            this.touchStartX = touchX;
        }
    },

    // Обработка окончания касания
    onTouchEnd: function(e) {
        e.preventDefault();
        
        if (!Game.state.gameStarted) return;
        
        // Определение свайпа
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - this.touchStartX;
        
        if (Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                this.moveToRightPlatform();
            } else {
                this.moveToLeftPlatform();
            }
        }
    },

    // Перемещение на левую платформу
    moveToLeftPlatform: function() {
        if (Game.state.currentPlatform > 0) {
            Game.state.currentPlatform--;
            this.animateCameraMove();
            UI.updateUI();
        }
    },

    // Перемещение на правую платформу
    moveToRightPlatform: function() {
        if (Game.state.currentPlatform < Game.config.platforms - 1) {
            Game.state.currentPlatform++;
            this.animateCameraMove();
            UI.updateUI();
        }
    },

    // Анимация перемещения камеры
    animateCameraMove: function() {
        if (!Game.camera) return;
        
        const targetX = Game.config.platformPositions[Game.state.currentPlatform];
        const startX = Game.camera.position.x;
        const duration = 300;
        let startTime = null;
        
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            
            // Плавное движение
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            Game.camera.position.x = startX + (targetX - startX) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
};

// Инициализация управления при загрузке
document.addEventListener('DOMContentLoaded', () => {
    Controls.init();
});
