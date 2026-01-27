// Game.js - Основная логика игры

const Game = {
    // Конфигурация игры
    config: {
        platforms: 3,
        platformPositions: [-6, 0, 6],
        platformWidth: 3,
        platformDepth: 20,
        
        gateTypes: {
            positive: ['x2', 'x3', 'x5', '+10', '+20', '+50'],
            negative: ['÷2', '÷3', '-10', '-20', '-50', 'БОСС'],
            weapon: ['⚔️+', '🔥+', '⚡+', '❄️+']
        },
        
        initialHealth: 100,
        initialArmy: 1,
        
        weapons: [
            { name: 'ВОКСЕЛЬНЫЙ МЕЧ', damage: 10, speed: 1.0, color: 0xaaaaaa },
            { name: 'ЛАЗЕРНАЯ ПУШКА', damage: 25, speed: 0.8, color: 0x00ffff },
            { name: 'ОГНЕННЫЙ МОЛОТ', damage: 40, speed: 0.6, color: 0xff5500 },
            { name: 'ЛЕДЯНОЙ КЛИНОК', damage: 30, speed: 1.2, color: 0x0088ff }
        ],
        
        bosses: ['ДРАКОН', 'ГИГАНТСКИЙ ПАУК', 'КОРОЛЬ ГОБЛИНОВ'],
        
        difficultyIncrement: 0.05,
        maxGates: 8
    },

    // Игровое состояние
    state: {
        score: 0,
        health: 100,
        maxHealth: 100,
        army: 1,
        currentPlatform: 1,
        weaponIndex: 0,
        gates: [],
        activeGates: [],
        boss: null,
        particles: [],
        gameOver: false,
        gameStarted: false,
        gatesPassed: 0,
        multiplier: 1,
        difficulty: 1.0,
        highScore: 0
    },

    // Графические объекты
    scene: null,
    camera: null,
    renderer: null,
    platforms: [],
    gates: [],
    boss: null,
    weapon: null,
    playerArmy: [],
    particles: [],
    isAttacking: false,

    // Инициализация игры
    init: function() {
        console.log('Инициализация игры...');
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createLighting();
        this.createFloor();
        this.createPlatforms();
        this.createPlayer();
        this.createArmy();
        this.createInitialGates();
        
        // Загрузка рекорда
        this.state.highScore = localStorage.getItem('voxelGatesHighScore') || 0;
        if (document.getElementById('high-score')) {
            document.getElementById('high-score').textContent = this.state.highScore;
        }
        
        console.log('Игра инициализирована!');
        return true;
    },

    // Создание сцены
    createScene: function() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        this.scene.fog = new THREE.Fog(0x0a0a1a, 10, 100);
    },

    // Создание камеры
    createCamera: function() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 15);
        this.camera.lookAt(0, 0, 0);
    },

    // Создание рендерера
    createRenderer: function() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    },

    // Создание освещения
    createLighting: function() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    },

    // Создание пола
    createFloor: function() {
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x222244,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Клетчатый узор
        const gridHelper = new THREE.GridHelper(100, 50, 0x444466, 0x333355);
        gridHelper.position.y = -0.95;
        this.scene.add(gridHelper);
    },

    // Создание платформ
    createPlatforms: function() {
        this.platforms = [];
        const platformMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x444477,
            emissive: 0x111133,
            emissiveIntensity: 0.3
        });
        
        for (let i = 0; i < this.config.platforms; i++) {
            const geometry = new THREE.BoxGeometry(
                this.config.platformWidth,
                0.5,
                this.config.platformDepth
            );
            const platform = new THREE.Mesh(geometry, platformMaterial);
            platform.position.x = this.config.platformPositions[i];
            platform.position.y = 0;
            platform.position.z = 0;
            platform.receiveShadow = true;
            platform.castShadow = true;
            
            // Края платформы
            const edgeGeometry = new THREE.BoxGeometry(
                this.config.platformWidth + 0.3,
                0.1,
                this.config.platformDepth + 0.3
            );
            const edgeMaterial = new THREE.MeshPhongMaterial({ 
                color: i === 1 ? 0x00ff88 : 0x0088ff,
                emissive: i === 1 ? 0x004400 : 0x001144,
                emissiveIntensity: 0.8
            });
            const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
            edge.position.x = this.config.platformPositions[i];
            edge.position.y = 0.3;
            edge.position.z = 0;
            
            this.scene.add(platform);
            this.scene.add(edge);
            this.platforms.push({ platform, edge, index: i });
        }
    },

    // Создание игрока
    createPlayer: function() {
        const knight = Voxel.createVoxelModel(0xaaaaaa, 0.2);
        
        // Детализация брони
        const helmet = Voxel.createVoxel(0xcccccc, 0.25);
        helmet.position.y = 1.2;
        knight.add(helmet);
        
        const shoulderL = Voxel.createVoxel(0x999999, 0.3);
        shoulderL.position.set(-0.4, 0.8, 0);
        knight.add(shoulderL);
        
        const shoulderR = Voxel.createVoxel(0x999999, 0.3);
        shoulderR.position.set(0.4, 0.8, 0);
        knight.add(shoulderR);
        
        // Оружие
        this.weapon = this.createWeapon();
        this.weapon.position.set(1, 0.5, 0);
        knight.add(this.weapon);
        
        knight.position.y = 1;
        knight.position.z = -8;
        this.scene.add(knight);
        
        this.state.player = knight;
    },

    // Создание оружия
    createWeapon: function() {
        const weaponGroup = new THREE.Group();
        const currentWeapon = this.config.weapons[this.state.weaponIndex];
        
        // Рукоять меча
        const handle = Voxel.createVoxel(0x8B4513, 0.1);
        handle.position.y = 0;
        weaponGroup.add(handle);
        
        // Гарда
        const guard = Voxel.createVoxel(0xcccccc, 0.2);
        guard.position.y = 0.2;
        weaponGroup.add(guard);
        
        // Клинок
        for (let i = 0; i < 5; i++) {
            const blade = Voxel.createVoxel(currentWeapon.color, 0.12);
            blade.position.y = 0.4 + i * 0.25;
            blade.position.x = 0;
            weaponGroup.add(blade);
        }
        
        // Эффекты оружия
        const glowGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: currentWeapon.color,
            transparent: true,
            opacity: 0.7
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = 1.5;
        weaponGroup.add(glow);
        
        return weaponGroup;
    },

    // Создание армии
    createArmy: function() {
        this.playerArmy = [];
        
        // Позиции воинов вокруг игрока
        const positions = [
            [-1, 0, -1], [1, 0, -1], [-1.5, 0, -0.5], [1.5, 0, -0.5],
            [-2, 0, 0], [2, 0, 0], [-1.5, 0, 0.5], [1.5, 0, 0.5],
            [-1, 0, 1], [1, 0, 1]
        ];
        
        for (let i = 0; i < Math.min(this.state.army, 10); i++) {
            const soldier = Voxel.createSoldier(i % 3);
            soldier.position.set(
                positions[i][0],
                positions[i][1],
                positions[i][2] - 8
            );
            this.scene.add(soldier);
            this.playerArmy.push(soldier);
            
            // Анимация
            soldier.userData = {
                bobOffset: Math.random() * Math.PI * 2,
                rotationSpeed: 0.01 + Math.random() * 0.02
            };
        }
    },

    // Создание врат
    createGate: function(platformIndex, type, value) {
        const gateGroup = new THREE.Group();
        const isPositive = !value.includes('-') && !value.includes('÷') && value !== 'БОСС';
        const isWeapon = value.includes('⚔️') || value.includes('🔥') || value.includes('⚡') || value.includes('❄️');
        const isBoss = value === 'БОСС';
        
        let gateColor, particleColor, emissiveColor;
        
        if (isBoss) {
            gateColor = 0xff0000;
            particleColor = 0xff5500;
            emissiveColor = 0x440000;
        } else if (isWeapon) {
            gateColor = 0x0088ff;
            particleColor = 0x00ffff;
            emissiveColor = 0x001144;
        } else if (isPositive) {
            gateColor = 0x00ff88;
            particleColor = 0x88ffaa;
            emissiveColor = 0x004400;
        } else {
            gateColor = 0xff5555;
            particleColor = 0xffaa00;
            emissiveColor = 0x440000;
        }
        
        // Колонны врат
        const columnGeometry = new THREE.BoxGeometry(0.5, 6, 0.5);
        const columnMaterial = new THREE.MeshPhongMaterial({ 
            color: gateColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        });
        
        const leftColumn = new THREE.Mesh(columnGeometry, columnMaterial);
        leftColumn.position.x = -1.5;
        leftColumn.position.y = 3;
        leftColumn.position.z = 0;
        leftColumn.castShadow = true;
        
        const rightColumn = new THREE.Mesh(columnGeometry, columnMaterial);
        rightColumn.position.x = 1.5;
        rightColumn.position.y = 3;
        rightColumn.position.z = 0;
        rightColumn.castShadow = true;
        
        gateGroup.add(leftColumn);
        gateGroup.add(rightColumn);
        
        // Горизонтальная табличка
        const signGeometry = new THREE.BoxGeometry(3.5, 1, 0.2);
        const signMaterial = new THREE.MeshPhongMaterial({ 
            color: gateColor,
            emissive: emissiveColor,
            emissiveIntensity: 1.0
        });
        
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.y = 6;
        sign.position.z = 0.1;
        sign.castShadow = true;
        gateGroup.add(sign);
        
        // Текст на табличке
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Градиентный фон
        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        if (isBoss) {
            gradient.addColorStop(0, '#ff0000');
            gradient.addColorStop(1, '#ff8800');
        } else if (isPositive) {
            gradient.addColorStop(0, '#00ff88');
            gradient.addColorStop(1, '#0088ff');
        } else {
            gradient.addColorStop(0, '#ff5555');
            gradient.addColorStop(1, '#ffaa00');
        }
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Текст
        context.font = 'bold 100px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.8)';
        context.shadowBlur = 20;
        context.fillText(value, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textGeometry = new THREE.PlaneGeometry(3, 0.8);
        const textMaterial = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true
        });
        
        const text = new THREE.Mesh(textGeometry, textMaterial);
        text.position.y = 6;
        text.position.z = 0.3;
        gateGroup.add(text);
        
        // Энергетический портал
        const portalGeometry = new THREE.CylinderGeometry(1.2, 1.5, 0.1, 32);
        const portalMaterial = new THREE.MeshPhongMaterial({ 
            color: particleColor,
            emissive: particleColor,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        portal.position.y = 3;
        portal.rotation.x = Math.PI / 2;
        gateGroup.add(portal);
        
        // Позиционирование
        gateGroup.position.x = this.config.platformPositions[platformIndex];
        gateGroup.position.z = 20;
        gateGroup.position.y = 0;
        
        // Анимация парения
        gateGroup.userData = {
            floatOffset: Math.random() * Math.PI * 2,
            rotationSpeed: 0.005,
            type: type,
            value: value,
            isPositive: isPositive,
            isWeapon: isWeapon,
            isBoss: isBoss,
            color: gateColor,
            particleColor: particleColor
        };
        
        this.scene.add(gateGroup);
        this.gates.push(gateGroup);
        
        return gateGroup;
    },

    // Создание начальных врат
    createInitialGates: function() {
        const gateValues = ['x2', '-10', '⚔️+', 'x3', '÷2', '+20', '🔥+', 'БОСС'];
        
        gateValues.forEach((value, index) => {
            setTimeout(() => {
                this.createGate(index % 3, 'gate', value);
            }, index * 500);
        });
    },

    // Обновление врат
    updateGates: function() {
        for (let i = this.gates.length - 1; i >= 0; i--) {
            const gate = this.gates[i];
            
            // Движение врат к игроку
            gate.position.z -= 0.1 * this.state.difficulty;
            
            // Анимация парения
            const float = Math.sin(Date.now() * 0.001 + gate.userData.floatOffset) * 0.2;
            gate.position.y = float;
            
            // Вращение
            gate.rotation.y += gate.userData.rotationSpeed;
            
            // Проверка столкновения с игроком
            if (gate.position.z < 5 && gate.position.z > -5) {
                const distance = Math.abs(gate.position.x - this.config.platformPositions[this.state.currentPlatform]);
                
                if (distance < 2) {
                    this.processGate(gate);
                    this.scene.remove(gate);
                    this.gates.splice(i, 1);
                    
                    // Создать новые врата
                    setTimeout(() => this.createNewGate(), 500);
                }
            }
            
            // Удаление врат за игроком
            if (gate.position.z < -10) {
                this.scene.remove(gate);
                this.gates.splice(i, 1);
            }
        }
    },

    // Обработка прохождения через врата
    processGate: function(gate) {
        this.state.gatesPassed++;
        const value = gate.userData.value;
        
        if (gate.userData.isBoss) {
            // Босс
            this.createBoss(this.config.bosses[Math.floor(Math.random() * this.config.bosses.length)]);
            this.state.score += 1000;
            UI.showNotification('ПОЯВИЛСЯ БОСС!');
            
        } else if (gate.userData.isWeapon) {
            // Улучшение оружия
            this.state.weaponIndex = Math.min(this.state.weaponIndex + 1, this.config.weapons.length - 1);
            this.updateWeapon();
            UI.showNotification(`ОРУЖИЕ УЛУЧШЕНО: ${this.config.weapons[this.state.weaponIndex].name}`);
            this.state.score += 500;
            
        } else if (gate.userData.isPositive) {
            // Положительные врата
            if (value.startsWith('x')) {
                const multiplier = parseInt(value.substring(1));
                this.state.army *= multiplier;
                this.state.multiplier *= multiplier;
                UI.showNotification(`АРМИЯ УМНОЖЕНА ${value}!`);
            } else if (value.startsWith('+')) {
                const bonus = parseInt(value.substring(1));
                this.state.health = Math.min(this.state.maxHealth, this.state.health + bonus);
                UI.showNotification(`+${bonus} ЗДОРОВЬЯ`);
            }
            this.state.score += 100;
            
        } else {
            // Отрицательные врата
            if (value.startsWith('÷')) {
                const divider = parseInt(value.substring(1));
                this.state.army = Math.max(1, Math.floor(this.state.army / divider));
                UI.showNotification(`АРМИЯ РАЗДЕЛЕНА ${value}`);
            } else if (value.startsWith('-')) {
                const damage = parseInt(value.substring(1));
                this.state.health -= damage * this.state.difficulty;
                
                if (this.state.health <= 0) {
                    this.state.health = 0;
                    this.gameOver();
                }
                UI.showNotification(`-${damage} ЗДОРОВЬЯ`);
            }
        }
        
        // Обновление сложности
        this.state.difficulty += this.config.difficultyIncrement;
        
        // Обновление армии
        this.updateArmy();
        
        // Обновление UI
        UI.updateUI();
    },

    // Создание новых врат
    createNewGate: function() {
        if (this.gates.length >= this.config.maxGates) return;
        
        const platformIndex = Math.floor(Math.random() * this.config.platforms);
        const gateTypes = Object.keys(this.config.gateTypes);
        const type = gateTypes[Math.floor(Math.random() * gateTypes.length)];
        const values = this.config.gateTypes[type];
        const value = values[Math.floor(Math.random() * values.length)];
        
        this.createGate(platformIndex, type, value);
    },

    // Создание босса
    createBoss: function(type) {
        const boss = Voxel.createBoss(type);
        boss.position.z = 25;
        boss.position.y = 2;
        this.scene.add(boss);
        this.boss = boss;
        this.state.boss = boss;
    },

    // Обновление босса
    updateBoss: function() {
        if (!this.boss) return;
        
        // Движение босса
        this.boss.position.z -= 0.05;
        
        // Проверка столкновения с игроком
        if (this.boss.position.z < 5) {
            const distance = Math.sqrt(
                Math.pow(this.boss.position.x, 2) +
                Math.pow(this.boss.position.z + 8, 2)
            );
            
            if (distance < 3) {
                const damage = 20 * this.state.difficulty;
                this.state.health -= damage;
                this.state.army = Math.max(1, this.state.army - Math.floor(this.state.army * 0.1));
                
                if (this.state.health <= 0) {
      
