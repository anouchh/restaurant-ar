using UnityEngine;
using WebXR;

/// <summary>
/// WebXRManagerSetup: Скрипт инициализации параметров сессии WebXR AR в Unity.
/// Настраивает доступные режимы дополненной реальности и подписку на контроллеры.
/// </summary>
public class WebXRManagerSetup : MonoBehaviour
{
    [Header("WebXR Настройки")]
    [SerializeField] private WebXRManager webXRManager;
    [SerializeField] private WebXRController leftController;
    [SerializeField] private WebXRController rightController;

    void Awake()
    {
        if (webXRManager == null)
        {
            webXRManager = FindObjectOfType<WebXRManager>();
        }

        if (webXRManager != null)
        {
            // Разрешаем только AR режим или AR + VR
            webXRManager.arSupported = true;
            Debug.Log("[WebXR] WebXRManager успешно сконфигурирован для AR-сессии.");
        }
    }
}
