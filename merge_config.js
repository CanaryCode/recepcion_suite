const fs = require('fs');
const path = require('path');

const legacyConfig = {
    "SYSTEM": {
        "USE_API": false,
        "USE_SYNC_SERVER": true,
        "API_URL": "/api",
        "SYNC_INTERVAL": 10000,
        "LAUNCHERS": [
            { "label": "SIHOT", "path": "", "icon": "display" },
            { "label": "ALTA RIU", "path": "", "icon": "house" },
            { "label": "GESTATUR", "path": "", "icon": "receipt" },
            { "label": "SUPREMO", "path": "", "icon": "tablet" },
            { "label": "ATLANTICO EXCURSIONES", "path": "", "icon": "camera" },
            { "label": "EXTRANET RIU", "path": "", "icon": "globe" }
        ],
        "GALLERY_PATH": "C:/Users/usuario/Desktop/ANTONIO/RECURSOS/INFORMACIÓN",
        "ADMIN_PASSWORD": "1234",
        "GALLERY_FOLDERS": [
            { "label": "ESCANER", "path": "Z:\\\\ESCANER" }
        ]
    },
    "HOTEL": {
        "NOMBRE": "Hotel Garoé",
        "ALARMAS_SISTEMA": [
            { "hora": "23:30", "mensaje": "Realizar lecturas de las VISAS", "dias": "todos" }
        ],
        "STATS_CONFIG": {
            "RANGOS": [
                { "planta": 0, "min": 10, "max": 28 },
                { "planta": 1, "min": 101, "max": 153 },
                { "planta": 2, "min": 201, "max": 253 },
                { "planta": 3, "min": 301, "max": 349 },
                { "planta": 4, "min": 401, "max": 416 }
            ],
            "FILTROS": {
                "TIPOS": [
                    { "label": "Estándar", "icon": "🛏️" },
                    { "label": "Doble Superior", "icon": "🌟" },
                    { "label": "Suite Estándar", "icon": "🛋️" },
                    { "label": "Master Suite", "icon": "👑" }
                ],
                "VISTAS": [
                    { "label": "Vista Mar", "icon": "🌊" },
                    { "label": "Vista Piscina", "icon": "🏊" },
                    { "label": "Vista Calle", "icon": "🏙️" }
                ],
                "CARACTERISTICAS": [
                    { "label": "Sofá Cama", "icon": "🛋️" },
                    { "label": "Cheslong", "icon": "🛋️" },
                    { "label": "Sofá Estándar", "icon": "🛋️" },
                    { "label": "Adaptada", "icon": "♿" },
                    { "label": "Comunicada", "icon": "↔️" },
                    { "label": "Ruidosa", "icon": "🔊" },
                    { "label": "Tranquila", "icon": "🔇" }
                ]
            }
        },
        "RECEPCIONISTAS": [
            "Pavel", "Javi", "Anadelia", "Marta", "Carmen", "Alberto", "Nerea", "Emiliano", "Domingo", "Antonio"
        ],
        "INSTALACIONES": [
            { "nombre": "Cancha de tennis", "apertura": "08:00", "cierre": "18:00", "icono": "🏠" },
            { "nombre": "Cancha de squash", "apertura": "08:00", "cierre": "18:00", "icono": "calendar" }
        ]
    },
    "AGENDA": {
        "PAISES": [
            { "c": "+34", "n": "España", "f": "🇪🇸" },
            { "c": "+49", "n": "Alemania", "f": "🇩🇪" },
            { "c": "+44", "n": "Reino Unido", "f": "🇬🇧" },
            { "c": "+33", "n": "Francia", "f": "🇫🇷" },
            { "c": "+39", "n": "Italia", "f": "🇮🇹" },
            { "c": "+351", "n": "Portugal", "f": "🇵🇹" },
            { "c": "+1", "n": "EE.UU.", "f": "🇺🇸" },
            { "c": "+52", "n": "México", "f": "🇲🇽" }
        ]
    },
    "NOVEDADES": {
        "DEPARTAMENTOS": [
            "Servicio Técnico", "Recepción", "Cocina", "Administración", "Dirección", "Economato", "Vigilancia", "Bar Hall", "Bar Piscina", "Alimentación y Bebidas", "Restaurante", "Pisos", "Jardinería", "Propiedad", "Externo"
        ]
    },
    "CAJA": {
        "BILLETES": [ 500, 200, 100, 50, 20, 10, 5 ],
        "MONEDAS": [ 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01 ],
        "FONDO": -2000
    },
    "COBRO": {
        "VALORES": [ 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01 ]
    },
    "SAFE": { "PRECIO_DIARIO": 2 },
    "TRANSFERS": { "DESTINOS": [ "Aeropuerto Norte", "Aeropuerto Sur" ] },
    "EXCURSIONES_CATALOGO": [
        {
            "id": "CAT-1769894964475",
            "nombre": "loro parque",
            "operador": "atlantico",
            "precioAdulto": 23,
            "precioNiño": 12,
            "precioGrupo": 0,
            "esTicket": false
        }
    ]
};

function deepMerge(current, legacy, keyContext = '') {
    if (typeof current !== 'object' || current === null || typeof legacy !== 'object' || legacy === null) {
        return legacy;
    }

    if (Array.isArray(current) && Array.isArray(legacy)) {
        if (keyContext === 'LAUNCHERS') {
            const merged = [...legacy];
            const legacyLabels = legacy.map(item => item.label);
            current.forEach(item => {
                if (!legacyLabels.includes(item.label)) {
                    merged.push(item);
                }
            });
            return merged;
        }
        if (keyContext === 'GALLERY_FOLDERS') {
            const merged = [...legacy];
            const legacyPaths = legacy.map(item => item.path);
            current.forEach(item => {
                if (!legacyPaths.includes(item.path)) {
                    merged.push(item);
                }
            });
            return merged;
        }
        if (keyContext === 'INSTALACIONES') {
            const merged = [...legacy];
            const legacyNames = legacy.map(item => item.nombre);
            current.forEach(item => {
                if (!legacyNames.includes(item.nombre)) {
                    merged.push(item);
                }
            });
            return merged;
        }
        if (keyContext === 'PAISES') {
            const merged = [...legacy];
            const legacyNames = legacy.map(item => item.n);
            current.forEach(item => {
                if (!legacyNames.includes(item.n)) {
                    merged.push(item);
                }
            });
            return merged;
        }
        // DEFAULT ARRAY BEHAVIOR: Legacy replaces Current
        return legacy;
    }

    const result = { ...current };
    for (const key in legacy) {
        if (key in result) {
            result[key] = deepMerge(result[key], legacy[key], key);
        } else {
            result[key] = legacy[key];
        }
    }
    return result;
}

const configPath = 'c:/Users/jesus/Documents/VSCode/RECEPCION SUITE v2/storage/config.json';
const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const mergedConfig = deepMerge(currentConfig, legacyConfig);

fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 4), 'utf8');
console.log("Merge completed successfully via Node.js.");
