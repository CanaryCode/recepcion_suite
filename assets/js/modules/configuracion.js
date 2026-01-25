import { APP_CONFIG, Config } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { Modal } from '../core/Modal.js';

let moduloInicializado = false;
let tempConfig = null; // Copia local para editar

export function inicializarConfiguracion() {
    console.log("Inicializando módulo Configuración...");
    // Siempre recargar al abrir para asegurar frescura
    renderizarInterfaz();
    
    if (moduloInicializado) {
        console.log("Módulo ya inicializado (eventos ok).");
        return;
    }
    configurarEventos();
    moduloInicializado = true;
}

function renderizarInterfaz() {
    console.log("Renderizando interfaz config...");
    // Clonar config actual para no modificar APP_CONFIG directamente hasta guardar
    try {
        tempConfig = JSON.parse(JSON.stringify(APP_CONFIG));
    } catch (e) {
        console.error("Error clonando APP_CONFIG", e);
        tempConfig = {}; 
    }

    // Ensure structures exist
    if (!tempConfig.HOTEL) tempConfig.HOTEL = { RECEPCIONISTAS: [] };
    if (!tempConfig.HOTEL.RECEPCIONISTAS) tempConfig.HOTEL.RECEPCIONISTAS = [];
    if (!tempConfig.CAJA) tempConfig.CAJA = {};
    if (!tempConfig.HOTEL.STATS_CONFIG) tempConfig.HOTEL.STATS_CONFIG = { RANGOS: [], FILTROS: {} };
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS) tempConfig.HOTEL.STATS_CONFIG.FILTROS = {};

    console.log("Config loaded for edit:", tempConfig);

    // ==========================================
    // MIGRATION / BOOTSTRAP LOGIC
    // ==========================================
    const migrate = (list, defaultIcon) => {
        if (!list) return [];
        return list.map(item => (typeof item === 'string' ? { label: item, icon: defaultIcon } : item));
    };

    // 1. Tipos
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS || tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS.length === 0) {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS = [
            { label: "Estándar", icon: "🛏️" }, 
            { label: "Doble Superior", icon: "🌟" }, 
            { label: "Suite Estándar", icon: "🛋️" }, 
            { label: "Master Suite", icon: "👑" }
        ];
    } else {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS = migrate(tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS, "🛏️");
    }

    // 2. Vistas
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS || tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS.length === 0) {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS = [
            { label: "Vista Mar", icon: "🌊" }, 
            { label: "Vista Piscina", icon: "🏊" }, 
            { label: "Vista Calle", icon: "🏙️" }
        ];
    } else {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS = migrate(tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS, "👁️");
    }

    // 3. Características
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS || tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS.length === 0) {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS = [
            { label: "Sofá Cama", icon: "🛋️" }, 
            { label: "Cheslong", icon: "🛋️" }, 
            { label: "Sofá Estándar", icon: "🛋️" }, 
            { label: "Adaptada", icon: "♿" }, 
            { label: "Comunicada", icon: "↔️" }, 
            { label: "Ruidosa", icon: "🔊" }, 
            { label: "Tranquila", icon: "🔇" }
        ];
    } else {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS = migrate(tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS, "✨");
    }

    // 1. Recepcionistas (Render)
    renderRecepcionistas();

    // 2. Hotel
    Utils.setVal('conf_hotel_nombre', tempConfig.HOTEL?.NOMBRE || '');
    Utils.setVal('conf_api_url', tempConfig.SYSTEM?.API_URL || '');
    Utils.setVal('conf_admin_pass', tempConfig.SYSTEM?.ADMIN_PASSWORD || ''); // Password
    Utils.setVal('conf_safe_precio', tempConfig.SAFE?.PRECIO_DIARIO || 2.00);

    // 3. Caja
    Utils.setVal('conf_caja_fondo', tempConfig.CAJA?.FONDO !== undefined ? tempConfig.CAJA.FONDO : -2000.00); // Fondo Caja

    // 4. Habitaciones
    if (!tempConfig.HOTEL.STATS_CONFIG) tempConfig.HOTEL.STATS_CONFIG = { RANGOS: [], FILTROS: {} };
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS) tempConfig.HOTEL.STATS_CONFIG.FILTROS = {};

    // Defaults if empty (Bootstraping from RackService logic)
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS || tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS.length === 0) {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS = ["Estándar", "Doble Superior", "Suite Estándar", "Master Suite"];
    }
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS || tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS.length === 0) {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS = ["Vista Mar", "Vista Piscina", "Vista Calle"];
    }
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS || tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS.length === 0) {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS = ["Sofá Cama", "Cheslong", "Sofá Estándar", "Adaptada", "Comunicada", "Ruidosa", "Tranquila"];
    }

    renderRangos();
    renderFiltros('TIPOS', 'list-filtros-tipos');
    renderFiltros('VISTAS', 'list-filtros-vistas');
    renderFiltros('CARACTERISTICAS', 'list-filtros-carac');
}

function renderRecepcionistas() {
    const list = document.getElementById('config-recepcionistas-list');
    if (!list) return;

    list.innerHTML = (tempConfig.HOTEL.RECEPCIONISTAS || []).map(nombre => `
        <div class="badge bg-light text-dark border p-2 d-flex align-items-center">
            <span class="fs-6">${nombre}</span>
            <button type="button" class="btn-close ms-2" style="width: 0.5em; height: 0.5em;" 
                onclick="removeRecepcionista('${nombre}')"></button>
        </div>
    `).join('');
}

function configurarEventos() {
    // Exponer funciones globales para el HTML
    window.addRecepcionista = () => {
        const input = document.getElementById('newRecepcionista');
        const nombre = input.value.trim();
        if (!tempConfig.HOTEL) tempConfig.HOTEL = { RECEPCIONISTAS: [] };
        if (!tempConfig.HOTEL.RECEPCIONISTAS) tempConfig.HOTEL.RECEPCIONISTAS = [];

        if (nombre && !tempConfig.HOTEL.RECEPCIONISTAS.includes(nombre)) {
            tempConfig.HOTEL.RECEPCIONISTAS.push(nombre);
            renderRecepcionistas();
            input.value = '';
            input.focus();
        }
    };

    window.removeRecepcionista = (nombre) => {
        tempConfig.HOTEL.RECEPCIONISTAS = tempConfig.HOTEL.RECEPCIONISTAS.filter(n => n !== nombre);
        renderRecepcionistas();
    };

    window.saveConfigLocal = async () => {
        try {
            updateTempFromInputs();
            
            // Guardar en LocalStorage (Persistencia navegador)
            localStorage.setItem('app_config_override', JSON.stringify(tempConfig));
            
            // Actualizar memoria viva
            Config.updateMemory(tempConfig);
            
            await Modal.showAlert("✅ Configuración guardada en este navegador.<br>Para que sea permanente en todos los equipos, descarga el archivo JSON.", "success");
            
            // Recargar para aplicar cambios globales (ej: menús)
            setTimeout(() => location.reload(), 1500);
            
        } catch (e) {
            console.error(e);
            Modal.showAlert("Error al guardar configuración", "error");
        }
    };

    window.exportConfig = () => {
        updateTempFromInputs();
        const jsonString = JSON.stringify(tempConfig, null, 4);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = "config.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Modal.showAlert("📂 Archivo <b>config.json</b> descargado.<br><br>Copia este archivo a la carpeta raíz de la aplicación para hacer los cambios permanentes.", "info");
    };

    window.resetConfigToDefault = async () => {
        if (await Modal.showConfirm("¿Estás seguro? Se borrarán tus personalizaciones locales.")) {
            localStorage.removeItem('app_config_override');
            location.reload();
        }
    };
}

function updateTempFromInputs() {
    // Hotel & System
    if(!tempConfig.HOTEL) tempConfig.HOTEL = {};
    tempConfig.HOTEL.NOMBRE = document.getElementById('conf_hotel_nombre').value;
    
    if(!tempConfig.SYSTEM) tempConfig.SYSTEM = {};
    tempConfig.SYSTEM.API_URL = document.getElementById('conf_api_url').value;
    tempConfig.SYSTEM.ADMIN_PASSWORD = document.getElementById('conf_admin_pass').value; // Nueva Clave
    
    if(!tempConfig.SAFE) tempConfig.SAFE = {};
    tempConfig.SAFE.PRECIO_DIARIO = parseFloat(document.getElementById('conf_safe_precio').value) || 0;

    // Caja
    if(!tempConfig.CAJA) tempConfig.CAJA = {};
    const fondoElement = document.getElementById('conf_caja_fondo');
    if (fondoElement) {
        tempConfig.CAJA.FONDO = parseFloat(fondoElement.value) || 0;
    }

    renderRangos();
    renderFiltros('TIPOS', 'list-filtros-tipos');
    renderFiltros('VISTAS', 'list-filtros-vistas');
    renderFiltros('CARACTERISTICAS', 'list-filtros-carac');
}

// ==========================================
// LOGICA DE HABITACIONES (RANGOS & FILTROS)
// ==========================================

function renderRangos() {
    const tbody = document.getElementById('config-rangos-table');
    if (!tbody) return;

    const rangos = tempConfig.HOTEL?.STATS_CONFIG?.RANGOS || [];
    let totalRooms = 0;

    tbody.innerHTML = rangos.map((r, index) => {
        const count = (r.max - r.min) + 1;
        totalRooms += count;
        return `
        <tr>
            <td>PB ${r.planta}</td>
            <td>${r.min}</td>
            <td>${r.max}</td>
            <td>
                <button type="button" class="btn btn-outline-danger btn-sm border-0" onclick="removeRango(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
        `;
    }).join('');

    // Update total count display
    const totalDisplay = document.getElementById('total-rooms-count');
    if(totalDisplay) totalDisplay.textContent = totalRooms;
}

function renderFiltros(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS) tempConfig.HOTEL.STATS_CONFIG.FILTROS = {};
    const list = tempConfig.HOTEL.STATS_CONFIG.FILTROS[type] || [];

    container.innerHTML = list.map(item => {
        // Handle migration gracefully if item is string
        const label = item.label || item;
        const icon = item.icon || '';
        return `
        <div class="badge bg-white text-secondary border d-flex align-items-center fw-normal">
            <span class="me-1 fs-6">${icon}</span>
            <span class="me-2">${label}</span>
            <button type="button" class="btn-close" style="width: 0.4em; height: 0.4em;" 
                onclick="removeFilter('${type}', '${label}')"></button>
        </div>
        `;
    }).join('');
}

// Event hooks for Rooms
window.addRango = () => {
    const planta = parseInt(document.getElementById('newRangePlanta').value);
    const min = parseInt(document.getElementById('newRangeMin').value);
    const max = parseInt(document.getElementById('newRangeMax').value);

    if (isNaN(planta) || isNaN(min) || isNaN(max)) return;

    if (!tempConfig.HOTEL.STATS_CONFIG) tempConfig.HOTEL.STATS_CONFIG = { RANGOS: [] };
    if (!tempConfig.HOTEL.STATS_CONFIG.RANGOS) tempConfig.HOTEL.STATS_CONFIG.RANGOS = [];

    tempConfig.HOTEL.STATS_CONFIG.RANGOS.push({ planta, min, max });
    
    // Sort logic optional but good
    tempConfig.HOTEL.STATS_CONFIG.RANGOS.sort((a,b) => a.min - b.min);

    renderRangos();
    
    // Convert to blank strings to clear inputs
    document.getElementById('newRangePlanta').value = '';
    document.getElementById('newRangeMin').value = '';
    document.getElementById('newRangeMax').value = '';
};

window.removeRango = (index) => {
    if (tempConfig.HOTEL?.STATS_CONFIG?.RANGOS) {
        tempConfig.HOTEL.STATS_CONFIG.RANGOS.splice(index, 1);
        renderRangos();
    }
};

window.addFilter = (type) => {
    let inputId = '';
    let emojiId = '';
    
    if (type === 'TIPOS') { inputId = 'newFiltroTipo'; emojiId = 'newFiltroTipoEmoji'; }
    if (type === 'VISTAS') { inputId = 'newFiltroVista'; emojiId = 'newFiltroVistaEmoji'; }
    if (type === 'CARACTERISTICAS') { inputId = 'newFiltroCarac'; emojiId = 'newFiltroCaracEmoji'; }

    const input = document.getElementById(inputId);
    const emojiInput = document.getElementById(emojiId);
    
    const val = input.value.trim();
    const icon = emojiInput.value.trim(); // Allow empty icon
    
    if (!val) return;

    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS) tempConfig.HOTEL.STATS_CONFIG.FILTROS = {};
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS[type]) tempConfig.HOTEL.STATS_CONFIG.FILTROS[type] = [];

    const exists = tempConfig.HOTEL.STATS_CONFIG.FILTROS[type].some(x => (x.label || x) === val);

    if (!exists) {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS[type].push({ label: val, icon: icon });
        
        let containerId = '';
        if (type === 'TIPOS') containerId = 'list-filtros-tipos';
        if (type === 'VISTAS') containerId = 'list-filtros-vistas';
        if (type === 'CARACTERISTICAS') containerId = 'list-filtros-carac';
        
        renderFiltros(type, containerId);
        input.value = '';
        emojiInput.value = ''; // Clean emoji too
    }
};

window.removeFilter = (type, val) => {
    if (tempConfig.HOTEL?.STATS_CONFIG?.FILTROS?.[type]) {
        renderFiltros(type, containerId);
    }
};
