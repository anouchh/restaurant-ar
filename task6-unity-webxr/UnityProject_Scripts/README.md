# Настройка проекта Unity с De-Panther WebXR Exporter (Задание 6)

## 1. Подключение пакетов в Unity (Packages/manifest.json)
В файл `Packages/manifest.json` проекта Unity добавьте официальные зависимости:
```json
{
  "dependencies": {
    "com.de-panther.webxr": "https://github.com/De-Panther/unity-webxr-export.git?path=/Packages/webxr",
    "com.de-panther.webxr-interactions": "https://github.com/De-Panther/unity-webxr-export.git?path=/Packages/webxr-interactions"
  }
}
```

## 2. Настройки Player Settings (WebGL)
1. **Player Settings > WebGL > Resolution and Presentation**:
   - Выбрать шаблон: **WebXR2020** или **WebXRTemplate**.
2. **Player Settings > Other Settings**:
   - **Color Space**: Linear
   - **Auto Graphics API**: Включено (WebGL 2.0)
   - **Multithreading**: Отключить (Uncheck) — требование браузерного WebGL
3. **Player Settings > Publishing Settings**:
   - **Compression Format**: Disabled или Gzip
   - **Data Caching**: Включено
   - **Decompression Fallback**: Отключить (Uncheck)

## 3. Настройка сцены
1. Удалите стандартную Main Camera.
2. Добавьте префаб `WebXRCameraSet` из пакета De-Panther (`Packages/WebXR/Runtime/Prefabs/WebXRCameraSet.prefab`).
3. Добавьте префаб `WebXRManager` на сцену.
4. Создайте 3D-объект (куб или ресторанное блюдо) и прикрепите к нему скрипт `WebXRViewerSpacePlacer.cs`.
5. Запустите сборку: **File > Build Settings > WebGL > Build**.
