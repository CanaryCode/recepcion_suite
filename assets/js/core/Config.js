/**
 * OBJETO GLOBAL DE CONFIGURACIÓN
 * Contiene todos los ajustes del sistema. Se exporta para que cualquier módulo pueda leer los ajustes.
 */
export let APP_CONFIG = {
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
            // FIX: Cargamos desde la API de Almacenamiento para que coincida con la ruta de guardado
            const response = await fetch('/api/storage/config?v=' + Date.now()); 
            if (!response.ok) throw new Error("Config not found");
            const data = await response.json();
            
            // Actualizamos la variable global con los datos del servidor
            APP_CONFIG = data;
            
            // Verificamos si hay "sobrescrituras" en el navegador (para pruebas o modo offline local)
            try {
                const localOverride = localStorage.getItem('app_config_override');
                if (localOverride) {
                    const localConfig = JSON.parse(localOverride);
                    APP_CONFIG = { ...APP_CONFIG, ...localConfig };
                    console.log("Config cargada con sobrescrituras de LocalStorage");
                }
            } catch (e) {
                console.warn("Error cargando sobrescritura de configuración local", e);
            }

            console.log("Configuración del sistema cargada:", APP_CONFIG);
            return true;
        } catch (error) {
            console.error("Crítico: No se pudo cargar config.json", error);
            alert("Error crítico: No se pudo cargar la configuración del sistema (config.json).");
            return false;
        }
    },
    
    /**
     * ACTUALIZAR EN MEMORIA
     * Permite cambiar la configuración actual sin recargar la página (uso interno).
     */
    updateMemory: (newConfig) => {
        APP_CONFIG = newConfig;
    }
};
