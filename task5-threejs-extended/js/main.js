import { SceneManager } from './SceneManager.js';
import { ModelLoader } from './ModelLoader.js';
import { UIManager } from './UIManager.js';

// Инициализация при загрузке документа
window.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('ar-video');
    const info = document.getElementById('info');

    // 1. Создание менеджеров
    const sceneManager = new SceneManager(video, info);
    const modelLoader = new ModelLoader();

    // 2. Создание начального столика в сцене (доступен для предпросмотра сразу)
    const table = modelLoader.createRestaurantTable();
    table.position.set(0, -0.45, -1.1);
    sceneManager.scene.add(table);
    sceneManager.activeTable = table;

    // 3. Коллбэк старта AR (скрываем столик, пока пользователь не коснется нужной точки пола)
    sceneManager.onStartARCallback = () => {
        table.visible = false;
    };

    // 4. Коллбэк размещения столика в AR
    sceneManager.onPlaceCallback = (pos, rotY) => {
        table.position.copy(pos);
        table.rotation.set(0, rotY, 0);
        table.visible = true;
    };

    // 4. Коллбэк каждого кадра (анимация и авто-вращение)
    sceneManager.onFrameCallback = () => {
        modelLoader.update();
    };

    // 5. Инициализация UI контроллера
    const uiManager = new UIManager(sceneManager, modelLoader);
});
