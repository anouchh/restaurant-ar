using System;
using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;
using WebXR;

/// <summary>
/// WebXRDragScaleInteractable: Интерактивный компонент для WebAR на базе XR Interaction Toolkit и webxr-xrit-bridge.
/// Реализует функции перемещения (drag), масштабирования жестами (pinch-to-scale) и визуальной обратной связи.
/// </summary>
[RequireComponent(typeof(Collider))]
public class WebXRDragScaleInteractable : XRGrabInteractable
{
    [Header("Настройки визуального отклика (Visual Feedback)")]
    [SerializeField] private Renderer targetRenderer;
    [SerializeField] private Color normalColor = new Color(0.12f, 0.16f, 0.23f);
    [SerializeField] private Color hoverColor = new Color(0.92f, 0.40f, 0.13f);
    [SerializeField] private Color selectColor = new Color(0.98f, 0.75f, 0.18f);
    [SerializeField] private float bounceScaleMultiplier = 1.08f;

    [Header("Настройки масштабирования (Scale)")]
    [SerializeField] private float minScale = 0.4f;
    [SerializeField] private float maxScale = 2.5f;
    [SerializeField] private float pinchSensitivity = 0.005f;

    private Material objectMaterial;
    private Vector3 originalScale;
    private float currentScaleFactor = 1.0f;
    private bool isSelected = false;

    // Переменные для обработки мультитач жестов (pinch-to-scale на мобильных экранах)
    private float previousTouchDistance = 0f;

    protected override void Awake()
    {
        base.Awake();
        originalScale = transform.localScale;

        if (targetRenderer == null)
            targetRenderer = GetComponentInChildren<Renderer>();

        if (targetRenderer != null)
        {
            objectMaterial = targetRenderer.material;
            SetFeedbackColor(normalColor);
        }
    }

    protected override void OnEnable()
    {
        base.OnEnable();
        // Подписка на события взаимодействия XR Interaction Toolkit
        selectEntered.AddListener(OnSelectEnteredCustom);
        selectExited.AddListener(OnSelectExitedCustom);
        hoverEntered.AddListener(OnHoverEnteredCustom);
        hoverExited.AddListener(OnHoverExitedCustom);
    }

    protected override void OnDisable()
    {
        base.OnDisable();
        selectEntered.RemoveListener(OnSelectEnteredCustom);
        selectExited.RemoveListener(OnSelectExitedCustom);
        hoverEntered.RemoveListener(OnHoverEnteredCustom);
        hoverExited.RemoveListener(OnHoverExitedCustom);
    }

    private void Update()
    {
        // Обработка двухпальцевого жеста Pinch-to-Scale для мобильного WebGL
        HandleMobilePinchScale();
    }

    private void HandleMobilePinchScale()
    {
        if (Input.touchCount == 2)
        {
            Touch touchZero = Input.GetTouch(0);
            Touch touchOne = Input.GetTouch(1);

            float currentTouchDistance = Vector2.Distance(touchZero.position, touchOne.position);

            if (touchZero.phase == TouchPhase.Began || touchOne.phase == TouchPhase.Began)
            {
                previousTouchDistance = currentTouchDistance;
                return;
            }

            float deltaDistance = currentTouchDistance - previousTouchDistance;
            previousTouchDistance = currentTouchDistance;

            // Вычисляем новый масштаб
            float scaleChange = deltaDistance * pinchSensitivity;
            currentScaleFactor = Mathf.Clamp(currentScaleFactor + scaleChange, minScale, maxScale);

            transform.localScale = originalScale * currentScaleFactor;
        }
    }

    #region Визуальный отклик (XR Interaction Toolkit Events)

    private void OnHoverEnteredCustom(HoverEnterEventArgs args)
    {
        if (!isSelected)
        {
            SetFeedbackColor(hoverColor);
        }
    }

    private void OnHoverExitedCustom(HoverExitEventArgs args)
    {
        if (!isSelected)
        {
            SetFeedbackColor(normalColor);
        }
    }

    private void OnSelectEnteredCustom(SelectEnterEventArgs args)
    {
        isSelected = true;
        SetFeedbackColor(selectColor);
        // Визуальный импульс (легкое увеличение при касании/захвате)
        transform.localScale = originalScale * (currentScaleFactor * bounceScaleMultiplier);
    }

    private void OnSelectExitedCustom(SelectExitEventArgs args)
    {
        isSelected = false;
        SetFeedbackColor(normalColor);
        // Возврат к текущему установленному масштабу
        transform.localScale = originalScale * currentScaleFactor;
    }

    private void SetFeedbackColor(Color color)
    {
        if (objectMaterial != null)
        {
            // Подсветка цвета и эмиссии
            if (objectMaterial.HasProperty("_Color"))
                objectMaterial.color = color;
            if (objectMaterial.HasProperty("_EmissionColor"))
            {
                objectMaterial.EnableKeyword("_EMISSION");
                objectMaterial.SetColor("_EmissionColor", color * 0.4f);
            }
        }
    }

    #endregion
}
