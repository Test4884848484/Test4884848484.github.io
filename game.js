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
        difficulty: 1.0
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
        document.getElementById('high-score').textContent = this.state.highScore;
        
        // Показать инструкции
        document.getElementById('instructions').style.display = 'block';
        
        // Запуск игрового цикла
        this.gameLoop();
        
        console.log('Игра инициализирована!');
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
        
        // Частицы вокруг оружия
        this.createWeaponParticles(weaponGroup, currentWeapon.color);
        
        return weaponGroup;
    },

    // Частицы для оружия
    createWeaponParticles: function(parent, color) {
        const particleCount = 20;
        const particleGeometry = new THREE.SphereGeometry(0.03, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.6
        });
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 0.3 + Math.random() * 0.2;
            
            particle.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle * 2) * radius,
                0
            );
            
            parent.add(particle);
            
            // Анимация частиц
            particle.userData = {
                speed: 0.01 + Math.random() * 0.02,
                angle: angle,
                radius: radius,
                heightOffset: Math.random() * Math.PI * 2
            };
            
            this.particles.push(particle);
        }
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

    // Создание начальных врат
    createInitialGates: function() {
        const gateValues = ['x2', '-10', '⚔️+', 'x3', '÷2', '+20', '🔥+', 'БОСС'];
        
        gateValues.forEach((value, index) => {
            setTimeout(() => {
                this.createGate(index % 3, 'gate', value);
            }, index * 500);
        });
    },

    // Игровой цикл
    gameLoop: function() {
        if (this.state.gameStarted && !this.state.gameOver) {
            this.updateGates();
            this.updateBoss();
            this.updateArmy();
            this.updateParticles();
        }
        
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.gameLoop());
    }
};
