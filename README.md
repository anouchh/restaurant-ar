# Лабораторная работа: Разработка WebAR-приложений

Проект содержит реализацию двух практических заданий по разработке приложений дополненной реальности (WebAR) в браузере:
1. **Задание 1:** Базовый WebAR-сценарий с использованием компонента Google `<model-viewer>` (поддержка Quick Look на iOS и Scene Viewer на Android, HDRI-освещение, PBR).
2. **Задание 2:** AR с трекингом изображений-маркеров на базе библиотек **MindAR** и **A-Frame** (распознавание маркера через камеру и появление 3D-модели).

---

## Структура проекта

```text
РКПДР/
├── index.html                    # Главное навигационное меню лабораторной работы
├── compiler.html                 # Встроенный компилятор изображений в targets.mind
├── server.py                     # Локальный dev-сервер (HTTPS + правильные MIME-типы)
├── cert.pem, key.pem             # Автоматически сгенерированные SSL-сертификаты
├── README.md                     # Документация и отчет по заданиям
│
├── task1-model-viewer/           # ЗАДАНИЕ 1 (<model-viewer>)
│   ├── index.html                # Страница WebAR с <model-viewer>
│   ├── style.css                 # Стилизация интерфейса и панели управления
│   └── assets/
│       ├── Astronaut.glb         # 3D-модель в формате glTF/GLB (для Android и ПК)
│       ├── Astronaut.usdz        # 3D-модель в формате USDZ (для iOS Quick Look)
│       └── aircraft_workshop_01_1k.hdr # HDRI-карта окружения для PBR-освещения
│
└── task2-mindar/                 # ЗАДАНИЕ 2 (MindAR + A-Frame)
    ├── index.html                # Страница AR-трекинга маркера с A-Frame
    ├── style.css                 # Стили интерфейса, сканера и модальных окон
    └── assets/
        ├── card.png              # Исходное изображение-маркер
        ├── targets.mind          # Скомпилированный бинарный файл дескрипторов маркера
        └── model.glb             # 3D-модель glTF, отображаемая на маркере
```

---

## Задание 1. Базовый WebAR-сценарий с использованием `<model-viewer>`

### 1. Архитектура и используемые технологии
`<model-viewer>` — специализированный веб-компонент от Google, абстрагирующий низкоуровневые API WebXR, Three.js и платформозависимые системные модули дополненной реальности.

Компонент реализует гибридный пайплайн:
- **На десктопе:** интерактивный 3D-просмотрщик на базе Three.js с поддержкой вращения, масштабирования (pinch-to-zoom) и реалистичного PBR-рендеринга.
- **На Android:** передача модели в системное приложение **Scene Viewer** через Intent или запуск сессии **WebXR Device API** с трекингом плоскостей реального мира (ARCore).
- **На iOS (Safari):** бесшовная передача 3D-модели в формате **USDZ** в системную среду **Apple ARKit Quick Look**.

### 2. Ключевые параметры и реализация в коде

```html
<model-viewer
  id="ar-viewer"
  src="assets/Astronaut.glb"
  ios-src="assets/Astronaut.usdz"
  environment-image="assets/aircraft_workshop_01_1k.hdr"
  ar
  ar-modes="webxr scene-viewer quick-look"
  ar-scale="auto"
  ar-placement="floor"
  camera-controls
  auto-rotate
  shadow-intensity="1.2"
  shadow-softness="0.6"
  exposure="1.0">

  <!-- Кастомная кнопка запуска AR -->
  <button slot="ar-button" id="ar-button">Смотреть в AR</button>

  <!-- Подсказка для пользователя при поиске плоскости -->
  <div slot="ar-prompt" id="ar-prompt">Наведите камеру на плоскую поверхность пола</div>
</model-viewer>
```

- `ar`: активирует возможность переключения в режим дополненной реальности.
- `ar-modes="webxr scene-viewer quick-look"`: задает приоритетный порядок запуска AR:
  1. `webxr` — прямой запуск внутри браузера через WebXR Device API;
  2. `scene-viewer` — открытие через Google Play Services for AR на Android;
  3. `quick-look` — открытие системного средства Quick Look на Apple iOS.
- `src="assets/Astronaut.glb"`: 3D-модель в формате glTF 2.0 Binary (GLB) со встроенной геометрией, материалами и PBR-текстурами.
- `ios-src="assets/Astronaut.usdz"`: модель в формате Universal Scene Description Zipped (USDZ), требуемая операционной системой iOS.
- `environment-image="assets/aircraft_workshop_01_1k.hdr"`: карта освещения High Dynamic Range Image (HDRI), используемая для Image-Based Lighting (IBL), корректных зеркальных отражений и затенения металлов и диэлектриков.
- `shadow-intensity` и `shadow-softness`: создание реалистичной тени под объектом на найденной плоскости.

---

## Задание 2. Трекинг изображений с помощью MindAR (A-Frame)

### 1. Архитектура решения
MindAR — библиотека компьютерного зрения на основе нейросетевых моделей (TensorFlow.js / WebGL), способная выполнять трекинг плоских изображений (Image Tracking) с частотой до 60 кадров/сек прямо в браузере мобильного устройства без сторонних приложений. В связке с декларативным фреймворком **A-Frame** на базе Three.js она формирует готовую AR-сцену.

### 2. Подготовка и компиляция маркера (`targets.mind`)
Для отслеживания изображения библиотека предварительно извлекает ключевые точки (feature points) на разных масштабах (scale levels):
1. **Встроенный компилятор проекта:** в проекте реализован файл [compiler.html](file:///d:/anouch/STUDYING/РКПДР/compiler.html), позволяющий перетащить любую картинку и экспортировать `targets.mind`.
2. **Официальный онлайн-компилятор:** [https://hiukim.github.io/mind-ar-js-doc/tools/compile](https://hiukim.github.io/mind-ar-js-doc/tools/compile).
3. Готовый маркер `assets/card.png` скомпилирован в бинарный файл `assets/targets.mind` (размером ~256 КБ).

### 3. Интеграция и настройка сцены (A-Frame + MindAR)

```html
<a-scene
  mindar-image="imageTargetSrc: ./assets/targets.mind; maxTrack: 1; filterMinCF: 0.0001; filterBeta: 0.001;"
  color-space="sRGB"
  renderer="colorManagement: true, physicallyCorrectLights: true"
  vr-mode-ui="enabled: false"
  device-orientation-permission-ui="enabled: false">

  <!-- Предзагрузка glTF ассета -->
  <a-assets>
    <a-asset-item id="avatarModel" src="./assets/model.glb"></a-asset-item>
  </a-assets>

  <!-- Камера устройства -->
  <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

  <!-- Базовые параметры освещения сцены -->
  <a-light type="ambient" color="#ffffff" intensity="0.85"></a-light>
  <a-light type="directional" color="#ffffff" intensity="1.4" position="1 3 2"></a-light>
  <a-light type="directional" color="#38bdf8" intensity="0.5" position="-2 -1 1"></a-light>

  <!-- Привязка к маркеру с индексом 0 -->
  <a-entity mindar-image-target="targetIndex: 0" id="marker-target">
    <a-gltf-model
      position="0 -0.4 0.1"
      scale="0.18 0.18 0.18"
      src="#avatarModel"
      animation="property: rotation; to: 0 360 0; loop: true; dur: 10000; easing: linear;">
    </a-gltf-model>
  </a-entity>
</a-scene>
```

- `mindar-image`: главный компонент трекера. Параметры `filterMinCF` и `filterBeta` сглаживают фильтр OneEuro, устраняя микро-дрожание (jitter) 3D-модели в пространстве.
- `a-light`:
  - `ambient` (рассеянный свет) устраняет полностью черные тени в неосвещенных областях;
  - основной `directional` (направленный свет) создает рельеф, блики и объем;
  - заполняющий синеватый `directional` с противоположной стороны симулирует вторичные отражения окружающей среды.
- События `targetFound` и `targetLost`: отслеживаются в JavaScript для смены статуса интерфейса (индикатор меняется с желтого «Поиск маркера» на зеленый «Маркер зафиксирован!»).

---

## Инструкция по запуску и тестированию

### 1. Требование безопасности (HTTPS / Localhost)
Браузерные API захвата камеры (`navigator.mediaDevices.getUserMedia`) и WebXR работают **исключительно** в безопасных контекстах:
- `http://localhost:<порт>` (на локальной машине);
- `https://...` (при доступе по сети).

### 2. Запуск локального сервера
В проект включен скрипт [server.py](file:///d:/anouch/STUDYING/РКПДР/server.py), который:
1. Автоматически генерирует локальный SSL-сертификат (`cert.pem` и `key.pem`) с правильными SAN (Subject Alternative Names).
2. Настраивает корректные MIME-типы (включая критически важные для iOS `model/vnd.usdz+zip` и для MindAR `application/octet-stream`).
3. Предоставляет CORS-заголовки.

Запустите команду в терминале:
```bash
python server.py
```

В выводе терминала появятся адреса:
- **На компьютере:** `https://localhost:8000`
- **На телефоне в той же Wi-Fi сети:** `https://<ВАШ_IP>:8000` (например, `https://192.168.1.50:8000`).

> **Важно при открытии на смартфоне по HTTPS:**  
> Так как сертификат локальный (self-signed), браузер смартфона покажет стандартное предупреждение («Подключение не защищено»). Нажмите **«Дополнительно» &rarr; «Перейти на сайт (небезопасно)»**. Доступ к камере и WebAR будет полностью активен.

---

## Проверка на мобильных устройствах

### 1. Android
- **Браузер:** Google Chrome (актуальная версия).
- **Компоненты:** должны быть установлены службы [Сервисы Google Play для AR (ARCore)](https://play.google.com/store/apps/details?id=com.google.ar.core).
- **Задание 1:** При нажатии кнопки «Смотреть в AR» Chrome предложит откалибровать плоскость пола, после чего космонавт отобразится в натуральную величину.
- **Задание 2:** Разрешите доступ к камере, наведите видоискатель на маркер `task2-mindar/assets/card.png` (открытый на мониторе или распечатанный). Модель появится поверх маркера.
- **Отладка:** Подключите телефон по USB к ПК и откройте в Chrome на компьютере `chrome://inspect/#devices` для просмотра консоли и ошибок в реальном времени.

### 2. iOS (iPhone / iPad)
- **Браузер:** Safari (на движке WebKit с поддержкой ARKit).
- **Задание 1:** При нажатии на кнопку AR Safari автоматически активирует нативный просмотрщик **Quick Look**, загрузив `Astronaut.usdz`.
- **Задание 2:** В Safari откройте страницу задания 2, дайте разрешение на использование камеры и наведите на изображение `card.png`.
- **Отладка:** В настройках iPhone включите: `Настройки -> Safari -> Дополнительно -> Веб-инспектор`. Подключите к Mac и используйте Safari Developer Tools.
