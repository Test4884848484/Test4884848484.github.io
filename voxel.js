// Voxel.js - Создание воксельных моделей

const Voxel = {
    // Создание кубика (вокселя)
    createVoxel: function(color, size = 0.1) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            flatShading: true
        });
        return new THREE.Mesh(geometry, material);
    },

    // Создание сложной воксельной модели
    createVoxelModel: function(baseColor, voxelSize = 0.15) {
        const group = new THREE.Group();
        
        // Основа модели
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 4; y++) {
                for (let z = 0; z < 2; z++) {
                    const voxel = this.createVoxel(baseColor, voxelSize);
                    voxel.position.set(
                        (x - 1) * voxelSize * 1.2,
                        y * voxelSize * 1.2,
                        (z - 0.5) * voxelSize * 1.2
                    );
                    group.add(voxel);
                }
            }
        }
        
        return group;
    },

    // Создание солдата
    createSoldier: function(type) {
        const soldier = new THREE.Group();
        const colors = [0x4a6491, 0x8b4513, 0x708090];
        const color = colors[type];
        
        // Тело
        for (let y = 0; y < 3; y++) {
            for (let x = -1; x <= 1; x++) {
                const voxel = this.createVoxel(color, 0.15);
                voxel.position.set(x * 0.18, y * 0.18, 0);
                soldier.add(voxel);
            }
        }
        
        // Голова
        const head = this.createVoxel(0xffccaa, 0.2);
        head.position.y = 0.65;
        soldier.add(head);
        
        // Оружие
        const weapon = this.createVoxel(0xaaaaaa, 0.12);
        weapon.position.set(0.3, 0.3, 0);
        soldier.add(weapon);
        
        return soldier;
    },

    // Создание босса
    createBoss: function(type) {
        const bossGroup = new THREE.Group();
        let color, scale;
        
        switch(type) {
            case 'ДРАКОН':
                color = 0xff5500;
                scale = 3;
                break;
            case 'ГИГАНТСКИЙ ПАУК':
                color = 0x8b4513;
                scale = 2.5;
                break;
            case 'КОРОЛЬ ГОБЛИНОВ':
                color = 0x00aa00;
                scale = 2;
                break;
        }
        
        // Тело босса из вокселей
        for (let x = -2; x <= 2; x++) {
            for (let y = 0; y < 3; y++) {
                for (let z = -2; z <= 2; z++) {
                    if (Math.random() > 0.7) continue;
                    
                    const voxel = this.createVoxel(color, 0.3);
                    voxel.position.set(x * 0.35, y * 0.35 + 2, z * 0.35);
                    bossGroup.add(voxel);
                }
            }
        }
        
        // Особые детали
        const eyeGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.5, 3, 0.8);
        bossGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.5, 3, 0.8);
        bossGroup.add(rightEye);
        
        bossGroup.scale.setScalar(scale);
        
        bossGroup.userData = {
            type: type,
            health: 100,
            maxHealth: 100,
            attackTimer: 0,
            isAttacking: false
        };
        
        return bossGroup;
    }
};
