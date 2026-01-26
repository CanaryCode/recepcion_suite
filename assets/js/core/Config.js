export let APP_CONFIG = {
    // Default fallback config just in case
    SYSTEM: { 
        USE_API: false, 
        USE_SYNC_SERVER: true,
        API_URL: 'http://localhost:3000/api'
    },
    HOTEL: { RECEPCIONISTAS: [] }
};

export const Config = {
    loadConfig: async () => {
        try {
            // FIX: Load from API Storage to match the Write path
            const response = await fetch('/api/storage/config?v=' + Date.now()); 
            if (!response.ok) throw new Error("Config not found");
            const data = await response.json();
            
            // Merge defaults logic could go here, but for now we replace
            APP_CONFIG = data;
            
            // Check LocalStorage Overrides
            try {
                const localOverride = localStorage.getItem('app_config_override');
                if (localOverride) {
                    const localConfig = JSON.parse(localOverride);
                    APP_CONFIG = { ...APP_CONFIG, ...localConfig };
                    console.log("Config loaded with LocalStorage overrides");
                }
            } catch (e) {
                console.warn("Error loading local config override", e);
            }

            console.log("Config configuration loaded:", APP_CONFIG);
            return true;
        } catch (error) {
            console.error("Critical: Could not load config.json", error);
            alert("Error crítico: No se pudo cargar la configuración del sistema (config.json).");
            return false;
        }
    },
    
    updateMemory: (newConfig) => {
        APP_CONFIG = newConfig;
    }
};
