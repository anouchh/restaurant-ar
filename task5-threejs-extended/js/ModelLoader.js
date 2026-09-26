import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * ModelLoader: Класс загрузки и настройки 3D-моделей ресторана с PBR-материалами.
 */
export class ModelLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.currentTableGroup = null;
        this.decorGroup = null;
        this.topMesh = null;
        this.gltfDish = null;
        this.currentDecorType = 'vase'; // 'vase', 'dish', 'candles'
        this.isAutoRotating = false;
        this.autoRotateSpeed = 0.015;

        // Предустановленные PBR-пресеты столешницы
        this.materialPresets = {
            oak: { color: 0x8B5A2B, roughness: 0.35, metalness: 0.05, name: 'Дуб' },
            wenge: { color: 0x362819, roughness: 0.25, metalness: 0.08, name: 'Венге' },
            marble: { color: 0xF3F4F6, roughness: 0.12, metalness: 0.10, name: 'Мрамор' },
            granite: { color: 0x1E293B, roughness: 0.20, metalness: 0.25, name: 'Гранит' },
            gold: { color: 0xD4AF37, roughness: 0.30, metalness: 0.85, name: 'Золото' }
        };
    }

    /**
     * Создает базовый ресторанный столик с PBR-материалами.
     */
    createRestaurantTable() {
        const table = new THREE.Group();
        this.currentTableGroup = table;

        // 1. Металлическое основание снизу (PBR)
        const baseGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.02, 32);
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.85,
            roughness: 0.25
        });
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = 0.01;
        base.castShadow = true;
        base.receiveShadow = true;
        table.add(base);

        // 2. Металлическая ножка-стойка (PBR)
        const legGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.46, 24);
        const leg = new THREE.Mesh(legGeo, metalMat);
        leg.position.y = 0.24;
        leg.castShadow = true;
        table.add(leg);

        // 3. Круглая столешница (PBR)
        const topGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.025, 48);
        const topMat = new THREE.MeshStandardMaterial({
            color: this.materialPresets.oak.color,
            roughness: this.materialPresets.oak.roughness,
            metalness: this.materialPresets.oak.metalness
        });
        this.topMesh = new THREE.Mesh(topGeo, topMat);
        this.topMesh.position.y = 0.48;
        this.topMesh.castShadow = true;
        this.topMesh.receiveShadow = true;
        table.add(this.topMesh);

        // 4. Группа для декора поверх столика
        this.decorGroup = new THREE.Group();
        this.decorGroup.position.y = 0.495; // Точно на поверхности столешницы
        table.add(this.decorGroup);

        // По умолчанию ставим вазочку
        this.setDecor('vase');

        // Предварительная загрузка ресторанного блюда из glTF
        this.preloadDishModel('./dish.glb');

        return table;
    }

    /**
     * Смена цвета и PBR-свойств столешницы.
     */
    setTableMaterial(presetKey) {
        if (!this.topMesh) return;
        const preset = this.materialPresets[presetKey];
        if (preset) {
            this.topMesh.material.color.setHex(preset.color);
            this.topMesh.material.roughness = preset.roughness;
            this.topMesh.material.metalness = preset.metalness;
            this.topMesh.material.needsUpdate = true;
        }
    }

    /**
     * Загрузка glTF-модели ресторанного блюда.
     */
    preloadDishModel(url) {
        this.gltfLoader.load(
            url,
            (gltf) => {
                const model = gltf.scene;
                // Нормализация габаритов блюда под размер стола (диаметр ~22 см)
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const targetScale = 0.22 / (maxDim || 1);
                model.scale.setScalar(targetScale);

                // Выравнивание низа блюда
                box.setFromObject(model);
                model.position.y = -box.min.y;

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material) {
                            child.material.envMapIntensity = 1.2;
                        }
                    }
                });

                this.gltfDish = model;
            },
            undefined,
            (error) => {
                console.warn('Не удалось загрузить glTF модель блюда:', error);
            }
        );
    }

    /**
     * Переключение декора на столешнице.
     */
    setDecor(decorType) {
        this.currentDecorType = decorType;
        if (!this.decorGroup) return;

        // Очищаем текущий декор
        while (this.decorGroup.children.length > 0) {
            this.decorGroup.remove(this.decorGroup.children[0]);
        }

        if (decorType === 'vase') {
            // Элегантная белая керамическая вазочка с розой
            const vaseGroup = new THREE.Group();
            const ceramicMat = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                roughness: 0.15,
                metalness: 0.05
            });
            const vase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.018, 0.08, 24),
                ceramicMat
            );
            vase.position.y = 0.04;
            vaseGroup.add(vase);

            // Роза в вазе
            const flower = new THREE.Mesh(
                new THREE.SphereGeometry(0.02, 16, 16),
                new THREE.MeshStandardMaterial({ color: 0xDC2626, roughness: 0.6 })
            );
            flower.position.y = 0.09;
            flower.scale.set(1, 0.7, 1);
            vaseGroup.add(flower);

            this.decorGroup.add(vaseGroup);
        } else if (decorType === 'dish') {
            if (this.gltfDish) {
                this.decorGroup.add(this.gltfDish);
            } else {
                // Если glTF еще скачивается, показываем стильную тарелку
                const plateMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.2 });
                const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.015, 32), plateMat);
                plate.position.y = 0.01;
                this.decorGroup.add(plate);
            }
        } else if (decorType === 'candles') {
            // Ресторанный золотой канделябр со свечами
            const candleGroup = new THREE.Group();
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.8, roughness: 0.2 });
            const waxMat = new THREE.MeshStandardMaterial({ color: 0xFEF3C7, roughness: 0.3 });

            const candleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.01, 24), goldMat);
            candleGroup.add(candleBase);

            for (let i = -1; i <= 1; i++) {
                const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 16), waxMat);
                candle.position.set(i * 0.025, 0.038, 0);
                candleGroup.add(candle);

                const flame = new THREE.Mesh(
                    new THREE.ConeGeometry(0.004, 0.012, 8),
                    new THREE.MeshBasicMaterial({ color: 0xF59E0B })
                );
                flame.position.set(i * 0.025, 0.08, 0);
                candleGroup.add(flame);
            }
            this.decorGroup.add(candleGroup);
        }
    }

    /**
     * Поворот столика вокруг вертикальной оси.
     */
    rotateTable(deltaY) {
        if (this.currentTableGroup) {
            this.currentTableGroup.rotation.y += deltaY;
        }
    }

    /**
     * Масштабирование столика.
     */
    scaleTable(factor) {
        if (this.currentTableGroup) {
            this.currentTableGroup.scale.setScalar(factor);
        }
    }

    /**
     * Авто-вращение в цикле анимации.
     */
    update() {
        if (this.isAutoRotating && this.currentTableGroup) {
            this.currentTableGroup.rotation.y += this.autoRotateSpeed;
        }
    }
}
