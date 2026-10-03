# Интерактивный WebAR в Unity: XR Interaction Toolkit и webxr-xrit-bridge (Задание 7)

## 1. Зависимости в Unity Packages (Packages/manifest.json)
В файл `Packages/manifest.json` проекта Unity добавьте официальные пакеты XR Interaction Toolkit и мост De-Panther:
```json
{
  "dependencies": {
    "com.unity.xr.interaction.toolkit": "2.5.4",
    "com.de-panther.webxr": "https://github.com/De-Panther/unity-webxr-export.git?path=/Packages/webxr",
    "com.de-panther.webxr-xrit-bridge": "https://github.com/De-Panther/unity-webxr-export.git?path=/Packages/webxr-xrit-bridge"
  }
}
```

## 2. Архитектура сцены
1. **XR Interaction Manager**: Добавьте пустой объект на сцену с компонентом `XRInteractionManager` (управляет жизненным циклом интеракций).
2. **WebXRITBridge**: Добавьте префаб или компонент `WebXRITBridge` из пакета De-Panther на объект `WebXRCameraSet`. Мост автоматически связывает позиции и события контроллеров WebXR с `XRController` и `XRRayInteractor`.
3. **3D-Объект (куб-пьедестал / столик ресторана)**:
   - Добавьте `BoxCollider` или `MeshCollider (Convex)`.
   - Добавьте компонент `WebXRDragScaleInteractable.cs` (наследует `XRGrabInteractable`).
   - Настройте цвета обратной связи:
     - Normal: `#1E293B`
     - Hover: `#EA580C` (оранжевая подсветка при наведении)
     - Select: `#F59E0B` (золотая подсветка при захвате/касании)
     - Bounce Scale: `1.08` (легкий упругий отклик при касании)
4. **Сенсорные экраны смартфонов**:
   - На камеру добавьте `WebXRTouchScreenRayInteractor.cs` для эмуляции луча и перетаскивания (drag) касанием пальца, а также поддержки pinch-to-scale.

## 3. Настройки сборки WebGL (Player Settings)
- **WebGL Template**: `WebXR2020` или `WebXRTemplate`.
- **Color Space**: `Linear`.
- **Multithreading**: Отключить (Unchecked).
- **Decompression Fallback**: Отключить (Unchecked).
- **Compression**: `Disabled` или `Gzip`.
