import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * SceneManager: Управление Three.js сценой, камерой, рендерером, HDRI-освещением и WebXR/AR сессиями.
 */
export class SceneManager {
    constructor(videoElement, infoElement) {
        this.video = videoElement;
        this.info = infoElement;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.pmremGenerator = null;

        this.reticle = null;
        this.controller = null;
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;

        this.isCameraAR = false;
        this.activeTable = null;

        this.onPlaceCallback = null;
        this.onFrameCallback = null;

        this.init();
    }

    init() {
        // 1. Создание сцены
        this.scene = new THREE.Scene();

        // 2. Перспективная камера с комфортным углом обзора
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        this.camera.position.set(0, 0, 0);
        this.camera.rotation.set(-0.35, 0, 0); // Естественный наклон взгляда на пол

        // 3. WebGLRenderer с поддержкой WebXR и прозрачного фона для AR
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // 4. Настройка HDRI / Environment Map (PBR окружение)
        this.setupHDRIEnvironment();

        // 5. Освещение сцены
        this.setupLighting();

        // 6. Оранжевое кольцо-прицел (reticle) для поиска пола
        this.setupReticle();

        // 7. WebXR контроллер для тапа в WebXR
        this.controller = this.renderer.xr.getController(0);
        this.controller.addEventListener('select', () => this.handleScreenTap());
        this.scene.add(this.controller);

        // 8. Обработчик тапа и клика по экрану для установки столика на пол
        window.addEventListener('touchstart', (e) => {
            if (this.isCameraAR || this.renderer.xr.isPresenting) {
                if (e.target.closest('#bottom-bar') || e.target.closest('#top-bar')) return;
                if (e.touches.length > 0) {
                    this.handleScreenTap(e.touches[0].clientX, e.touches[0].clientY);
                }
            }
        });

        window.addEventListener('click', (e) => {
            if (this.isCameraAR || this.renderer.xr.isPresenting) {
                if (e.target.closest('#bottom-bar') || e.target.closest('#top-bar')) return;
                this.handleScreenTap(e.clientX, e.clientY);
            }
        });

        // 9. Resize
        window.addEventListener('resize', () => this.onWindowResize());

        // 10. Запуск анимационного цикла
        this.renderer.setAnimationLoop((timestamp, frame) => this.render(timestamp, frame));
    }

    /**
     * Создание фотореалистичного PBR-окружения через PMREMGenerator и RoomEnvironment (HDRI эквивалент).
     */
    setupHDRIEnvironment() {
        this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();

        const roomEnv = new RoomEnvironment();
        const envTexture = this.pmremGenerator.fromScene(roomEnv, 0.04).texture;

        this.scene.environment = envTexture; // Назначает PBR-отражения на все материалы
    }

    setupLighting() {
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd4d4d8, 1.8);
        hemiLight.position.set(0, 5, 0);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
        dirLight.position.set(1.5, 3.5, 1.5);
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.8);
        fillLight.position.set(-1.5, 2, -1);
        this.scene.add(fillLight);
    }

    setupReticle() {
        this.reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.14, 0.19, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0xea580c })
        );
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);
    }

    /**
     * Запуск WebAR (WebXR или fallback на камеру iOS Safari).
     */
    async startAR() {
        // Попытка запуска WebXR (Android)
        if ('xr' in navigator) {
            try {
                const supported = await navigator.xr.isSessionSupported('immersive-ar');
                if (supported) {
                    const session = await navigator.xr.requestSession('immersive-ar', {
                        requiredFeatures: ['hit-test']
                    });
                    this.renderer.xr.setSession(session);
                    this.info.innerHTML = '✨ Направьте камеру на пол и коснитесь экрана';

                    session.addEventListener('end', () => {
                        this.hitTestSourceRequested = false;
                        this.hitTestSource = null;
                        this.info.innerHTML = 'Нажмите START AR для просмотра в дополненной реальности';
                    });
                    if (this.onStartARCallback) this.onStartARCallback();
                    return;
                }
            } catch (e) {
                console.log('WebXR не поддерживается, переключение на камеру:', e);
            }
        }

        // Универсальный запуск камеры для iOS (iPhone Safari / универсальный)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } }
            });
            this.video.srcObject = stream;
            this.video.style.display = 'block';
            try {
                const p = this.video.play();
                if (p !== undefined) {
                    p.catch(() => {});
                }
            } catch (e) {}

            document.body.style.backgroundColor = 'transparent';
            this.renderer.setClearColor(0x000000, 0);

            this.isCameraAR = true;
            this.reticle.visible = true;

            // Запрос доступа к гироскопу для привязки столика к реальному пространству комнаты
            if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const response = await DeviceOrientationEvent.requestPermission();
                    if (response === 'granted') {
                        window.addEventListener('deviceorientation', (e) => this.onDeviceOrientation(e));
                    }
                } catch (e) {
                    console.warn('Ошибка гироскопа:', e);
                }
            } else if (window.DeviceOrientationEvent) {
                window.addEventListener('deviceorientation', (e) => this.onDeviceOrientation(e));
            }

            if (this.onStartARCallback) this.onStartARCallback();
            this.info.innerHTML = '✨ Камера активна. Коснитесь пола, чтобы поставить столик!';
        } catch (err) {
            console.error('Ошибка доступа к камере:', err);
            this.info.innerHTML = '⚠️ Камера недоступна. Вы можете управлять столиком в 3D';
        }
    }

    onDeviceOrientation(event) {
        if (!this.isCameraAR) return;
        if (event.alpha === null || event.beta === null || event.gamma === null) return;

        if (this.baseHeading === undefined || this.baseHeading === null) {
            this.baseHeading = event.alpha;
        }

        const zee = new THREE.Vector3(0, 0, 1);
        const q0 = new THREE.Quaternion();
        const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90 deg X axis

        const alpha = THREE.MathUtils.degToRad(event.alpha - this.baseHeading);
        const beta = THREE.MathUtils.degToRad(event.beta);
        const gamma = THREE.MathUtils.degToRad(event.gamma);
        const orient = THREE.MathUtils.degToRad(window.orientation || 0);

        const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
        this.camera.quaternion.multiply(q1); // Камера направлена через заднюю панель телефона
        this.camera.quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
    }

    handleScreenTap(screenX, screenY) {
        if (!this.onPlaceCallback) return;

        let spawnPos = new THREE.Vector3(0, -0.6, -1.2);
        let spawnRotY = 0;

        if (this.renderer.xr && this.renderer.xr.isPresenting && this.reticle.visible) {
            const pos = new THREE.Vector3();
            const quat = new THREE.Quaternion();
            const sca = new THREE.Vector3();
            this.reticle.matrix.decompose(pos, quat, sca);
            spawnPos.copy(pos);

            const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
            spawnRotY = euler.y;
        } else if (screenX !== undefined && screenY !== undefined) {
            // Пересечение луча тапа с плоскостью пола (y = -0.6)
            const mouse = new THREE.Vector2(
                (screenX / window.innerWidth) * 2 - 1,
                -(screenY / window.innerHeight) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);
            const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.6); // плоскость y = -0.6
            const intersectPoint = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(floorPlane, intersectPoint)) {
                spawnPos.copy(intersectPoint);
            } else {
                const dir = new THREE.Vector3();
                this.camera.getWorldDirection(dir);
                dir.y = 0;
                dir.normalize();
                spawnPos.copy(this.camera.position).addScaledVector(dir, 1.2);
                spawnPos.y = -0.6;
            }
        }

        // Фиксируем кольцо в мировой точке установки
        this.placedPos = spawnPos.clone();
        this.reticle.matrix.makeRotationX(-Math.PI / 2);
        this.reticle.matrix.setPosition(spawnPos.x, spawnPos.y, spawnPos.z);

        this.onPlaceCallback(spawnPos, spawnRotY);
        this.info.innerHTML = '✅ Столик привязан к полу! Поверните телефон, чтобы осмотреть со всех сторон';
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render(timestamp, frame) {
        if (frame) {
            // Обработка WebXR hit-test
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const session = this.renderer.xr.getSession();

            if (!this.hitTestSourceRequested) {
                session.requestReferenceSpace('viewer').then((ref) => {
                    session.requestHitTestSource({ space: ref }).then((source) => {
                        this.hitTestSource = source;
                    });
                });
                this.hitTestSourceRequested = true;
            }

            if (this.hitTestSource && referenceSpace) {
                const hitTestResults = frame.getHitTestResults(this.hitTestSource);
                if (hitTestResults.length > 0) {
                    this.reticle.visible = true;
                    this.reticle.matrix.fromArray(hitTestResults[0].getPose(referenceSpace).transform.matrix);
                } else {
                    this.reticle.visible = false;
                }
            }
        } else if (this.isCameraAR) {
            this.reticle.visible = true;
            if (!this.placedPos) {
                // До установки столика: прицел проецируется на пол перед взглядом камеры
                const dir = new THREE.Vector3();
                this.camera.getWorldDirection(dir);
                dir.y = 0;
                dir.normalize();
                const floorPos = this.camera.position.clone().addScaledVector(dir, 1.2);
                floorPos.y = -0.6;
                this.reticle.matrix.makeRotationX(-Math.PI / 2);
                this.reticle.matrix.setPosition(floorPos.x, floorPos.y, floorPos.z);
            } else {
                // После установки: прицел зафиксирован под столиком
                this.reticle.matrix.makeRotationX(-Math.PI / 2);
                this.reticle.matrix.setPosition(this.placedPos.x, this.placedPos.y, this.placedPos.z);
            }
        }

        if (this.onFrameCallback) {
            this.onFrameCallback();
        }

        this.renderer.render(this.scene, this.camera);
    }
}
