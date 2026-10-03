using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;

/// <summary>
/// WebXRTouchScreenRayInteractor: Эмуляция взаимодействия XR Ray Interactor через экранные касания
/// для мобильных WebGL-сборок в WebXR без контроллеров.
/// </summary>
public class WebXRTouchScreenRayInteractor : XRBaseControllerInteractor
{
    [Header("Настройки луча")]
    [SerializeField] private Camera eventCamera;
    [SerializeField] private LayerMask interactionLayers = ~0;
    [SerializeField] private float maxRayDistance = 10f;

    private XRInteractionManager interactionManager;
    private IXRInteractable currentTarget;

    protected override void Awake()
    {
        base.Awake();
        if (eventCamera == null)
            eventCamera = Camera.main;

        interactionManager = FindObjectOfType<XRInteractionManager>();
    }

    private void Update()
    {
        // Проверяем касания экрана (один палец для перемещения)
        if (Input.touchCount == 1)
        {
            Touch touch = Input.GetTouch(0);
            Ray ray = eventCamera.ScreenPointToRay(touch.position);

            if (touch.phase == TouchPhase.Began)
            {
                if (Physics.Raycast(ray, out RaycastHit hit, maxRayDistance, interactionLayers))
                {
                    IXRInteractable interactable = hit.collider.GetComponentInParent<IXRInteractable>();
                    if (interactable != null)
                    {
                        currentTarget = interactable;
                    }
                }
            }
            else if (touch.phase == TouchPhase.Moved && currentTarget != null)
            {
                // Перетаскивание объекта вдоль луча в пространстве
                Transform targetTransform = ((Component)currentTarget).transform;
                float distance = Vector3.Distance(eventCamera.transform.position, targetTransform.position);
                Vector3 newWorldPos = ray.GetPoint(distance);
                targetTransform.position = Vector3.Lerp(targetTransform.position, newWorldPos, Time.deltaTime * 20f);
            }
            else if (touch.phase == TouchPhase.Ended || touch.phase == TouchPhase.Canceled)
            {
                currentTarget = null;
            }
        }
    }
}
