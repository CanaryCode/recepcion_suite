/**
 * OBJETO GLOBAL DE CONFIGURACIÓN
 * Contiene todos los ajustes del sistema. Se exporta para que cualquier módulo pueda leer los ajustes.
 */
export const APP_CONFIG = {
    // Configuración por defecto en caso de que falle la carga inicial
    SYSTEM: { 
        USE_API: false, 
        USE_SYNC_SERVER: true,
        API_URL: '/api'
    },
    HOTEL: { RECEPCIONISTAS: [] }
};

export const Config = {
    /**
     * CARGA DE CONFIGURACIÓN
     * Intenta obtener el archivo config.json desde la API del servidor.
     * También gestiona las "sobrescrituras" locales (LocalStorage) si existen.
     */
    loadConfig: async () => {
        try {
            // FIX: Cargamos desde la API de Almacenamiento
            console.log("Cargando Config.js v4.2 (Fixed Syntax)..."); 
            const response = await fetch('/api/storage/config?v=' + Date.now()); 
            if (!response.ok) throw new Error("Config not found");
            const data = await response.json();
            
            // Actualizamos la variable global SIN SOBRESCRIBIR LA REFERENCIA (evita nulos)
            Object.assign(APP_CONFIG, data || {});

            // FIX CRITICO: Forzamos ruta relativa para asegurar que funciona en cualquier PC/IP
            if (APP_CONFIG.SYSTEM) {
                APP_CONFIG.SYSTEM.API_URL = '/api';
            } else {
                // Si la config no tiene bloque SYSTEM, algo anda mal, usamos defaults
                APP_CONFIG.SYSTEM = { API_URL: '/api' };
                console.warn("Configuración cargada incompleta o corrupta, usando defaults.");
            }
            
            // Verificamos si hay "sobrescrituras" en el navegador (para pruebas o modo offline local)
            try {
                const localOverride = localStorage.getItem('app_config_override');
                if (localOverride) {
                    const localConfig = JSON.parse(localOverride);
                    Object.assign(APP_CONFIG, localConfig);
                    console.log("Config cargada con sobrescrituras de LocalStorage");
                }
            } catch (e) {
                console.warn("Error cargando sobrescritura de configuración local", e);
            }
            
            console.log("Configuración del sistema cargada:", APP_CONFIG);
            return true;
        } catch (error) {
            console.error("Crítico: No se pudo cargar config.json", error);
            // Mostrar mensaje real del error para depuración
            alert(`Error cargando config.json: ${error.message}`);
            return false;
        }
    },
    
    /**
     * ACTUALIZAR EN MEMORIA
     * Permite cambiar la configuración actual sin recargar la página (uso interno).
     */
    updateMemory: (newConfig) => {
        // Al ser APP_CONFIG una constante, no podemos reasignarla.
        // Usamos Object.assign para actualizar sus propiedades.
        Object.assign(APP_CONFIG, newConfig);
    }
};
