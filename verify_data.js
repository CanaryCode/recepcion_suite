
const fs = require('fs');
const path = require('path');

// MOCK LOCALSTORAGE
const mockLocalStorage = {
    store: {},
    getItem: function(key) { return this.store[key] || null; },
    setItem: function(key, value) { this.store[key] = value.toString(); },
    clear: function() { this.store = {}; }
};
global.localStorage = mockLocalStorage;

// MOCK APP_CONFIG
global.APP_CONFIG = {
    SYSTEM: { API_URL: '' },
    HOTEL: { STATS_CONFIG: { RANGOS: [{min: 101, max: 105}] } }
};

console.log("=== INICIANDO TEST DE INTEGRIDAD DE DATOS ===");

async function runTest() {
    try {
        // 1. LEER ARCHIVO JSON REAL
        const jsonPath = path.join(__dirname, 'storage', 'riu_transfers.json');
        if (!fs.existsSync(jsonPath)) {
            console.error("❌ ERROR: El archivo riu_transfers.json NO EXISTE.");
            return;
        }
        console.log("✅ Archivo JSON encontrado.");

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        let jsonData;
        try {
            jsonData = JSON.parse(rawData);
            console.log(`✅ JSON parseado correctamente. Contiene ${Array.isArray(jsonData) ? jsonData.length : 0} registros.`);
        } catch (e) {
            console.error("❌ ERROR: El JSON está corrupto.", e.message);
            return;
        }

        // 2. SIMULAR CARGA DE SERVICIO
        console.log("\n--- SIMULANDO LÓGICA DE SERVICIO ---");
        
        // Mock simple de BaseService logic
        const endpoint = 'riu_transfers';
        
        // Simular "SyncWithServer" (lectura del JSON)
        if (jsonData && Array.isArray(jsonData)) {
            console.log(`[Sync] Datos recibidos del servidor: ${jsonData.length} items.`);
            mockLocalStorage.setItem(endpoint, JSON.stringify(jsonData));
            console.log("✅ Datos guardados en LocalStorage simulado.");
        } else {
             console.warn("⚠️ JSON vacío o formato incorrecto.");
        }

        // Simular "getAll"
        const stored = mockLocalStorage.getItem(endpoint);
        const parsed = JSON.parse(stored);
        
        if (parsed.length > 0) {
            console.log(`✅ TEST EXITOSO: El servicio devolvería ${parsed.length} registros a la UI.`);
            console.log("Muestra:", JSON.stringify(parsed[0]));
        } else {
            console.error("❌ TEST FALLIDO: El servicio devolvería 0 registros.");
        }

    } catch (err) {
        console.error("❌ ERROR FATAL EN EL TEST:", err);
    }
}

runTest();
