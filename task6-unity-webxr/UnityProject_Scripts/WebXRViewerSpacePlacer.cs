using UnityEngine;
using WebXR;

/// <summary>
/// WebXRViewerSpacePlacer: Скрипт для размещения 3D-объекта в центре поля зрения (viewer-space)
/// в WebAR-приложении на базе De-Panther unity-webxr-export.
/// </summary>
public class WebXRViewerSpacePlacer : MonoBehaviour
{
    [Header("Настройки 3D-объекта")]
    [Tooltip("Объект ресторана или куб, размещаемый в центре поля зрения")]
    [SerializeField] private GameObject targetObject;

    [Tooltip("Дистанция от камеры до объекта при спавне (в метрах)")]
    [SerializeField] private float distanceFromCamera = 1.0f;

    [Tooltip("Смещение по высоте относительно уровня глаз")]
    [SerializeField] private float heightOffset = -0.15f;

    [Header("WebXR Ссылки")]
    [SerializeField] private Transform viewerCameraTransform;
    [SerializeField] private bool autoRotate = true;
    [SerializeField] private float rotationSpeed = 25f;

    private bool isPlaced = false;

    void Start()
    {
        // При старте приложения инициализируем позицию объекта в центре экрана
        PlaceInViewerSpace();
    }

    void OnEnable()
    {
        // Подписка на событие смены состояния WebXR (вход в AR/VR)
        WebXRManager.OnXRChange += HandleXRChange;
    }

    void OnDisable()
    {
        WebXRManager.OnXRChange -= HandleXRChange;
    }

    private void HandleXRChange(WebXRState state, int viewsCount, Rect leftRect, Rect rightRect)
    {
        if (state == WebXRState.AR)
        {
            // При входе в режим AR центрируем объект прямо перед глазами пользователя
            PlaceInViewerSpace();
        }
    }

    /// <summary>
    /// Размещение объекта строго в центре поля зрения (viewer-space)
    /// </summary>
    public void PlaceInViewerSpace()
    {
        if (viewerCameraTransform == null)
        {
            Camera mainCam = Camera.main;
            if (mainCam != null)
            {
                viewerCameraTransform = mainCam.transform;
            }
        }

        if (viewerCameraTransform != null && targetObject != null)
        {
            Vector3 forward = viewerCameraTransform.forward;
            forward.y = 0; // Сохраняем горизонт
            if (forward.sqrMagnitude < 0.001f)
            {
                forward = Vector3.forward;
            }
            forward.Normalize();

            Vector3 spawnPosition = viewerCameraTransform.position + forward * distanceFromCamera;
            spawnPosition.y += heightOffset;

            targetObject.transform.position = spawnPosition;
            targetObject.transform.rotation = Quaternion.LookRotation(forward, Vector3.up);
            isPlaced = true;
            Debug.Log($"[WebXR] Объект размещен в viewer-space на координатах: {spawnPosition}");
        }
    }

    void Update()
    {
        // Демонстрационное вращение объекта для презентации в AR
        if (autoRotate && targetObject != null && isPlaced)
        {
            targetObject.transform.Rotate(0, rotationSpeed * Time.deltaTime, 0, Space.World);
        }
    }

    /// <summary>
    /// Публичный метод для ручного вызова репозиционирования (например, по клику в UI)
    /// </summary>
    public void ResetPosition()
    {
        PlaceInViewerSpace();
    }
}
