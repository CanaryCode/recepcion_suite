import { APP_CONFIG, Config } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { Modal } from '../core/Modal.js';
import { IconSelector } from '../core/IconSelector.js';

let moduloInicializado = false;
let tempConfig = null; // Copia de trabajo de la configuración para no alterar la real hasta guardar

/**
 * INICIALIZACIÓN DEL MÓDULO
 * Renderiza la interfaz con los valores actuales y prepara los eventos.
 */
export function inicializarConfiguracion() {
    console.log("Inicializando módulo Configuración...");
    renderizarInterfaz();
    
    if (moduloInicializado) return;
    configurarEventos();
    moduloInicializado = true;
}

function renderizarInterfaz() {
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
    if (!tempConfig.SYSTEM) tempConfig.SYSTEM = {}; // Ensure System exists

    // Defaults for Filters if empty
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS || tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS.length === 0) {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS = [
            { label: "Estándar", icon: "🛏️" }, { label: "Doble Superior", icon: "🌟" }, 
            { label: "Suite Estándar", icon: "🛋️" }, { label: "Master Suite", icon: "👑" }
        ];
    }
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS || tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS.length === 0) {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS = [
            { label: "Vista Mar", icon: "🌊" }, { label: "Vista Piscina", icon: "🏊" }, { label: "Vista Calle", icon: "🏙️" }
        ];
    }
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS || tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS.length === 0) {
        tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS = [
            { label: "Sofá Cama", icon: "🛋️" }, { label: "Cheslong", icon: "🛋️" }, 
            { label: "Sofá Estándar", icon: "🛋️" }, { label: "Adaptada", icon: "♿" }, 
            { label: "Comunicada", icon: "↔️" }, { label: "Ruidosa", icon: "🔊" }, { label: "Tranquila", icon: "🔇" }
        ];
    }

    // Helper migration for string->object
    const migrate = (list, defaultIcon) => {
        if (!list) return [];
        return list.map(item => (typeof item === 'string' ? { label: item, icon: defaultIcon } : item));
    };
    tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS = migrate(tempConfig.HOTEL.STATS_CONFIG.FILTROS.TIPOS, "🛏️");
    tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS = migrate(tempConfig.HOTEL.STATS_CONFIG.FILTROS.VISTAS, "👁️");
    tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS = migrate(tempConfig.HOTEL.STATS_CONFIG.FILTROS.CARACTERISTICAS, "✨");


    // Render steps
    renderRecepcionistas();
    
    Utils.setVal('conf_hotel_nombre', tempConfig.HOTEL?.NOMBRE || '');
    Utils.setVal('conf_api_url', tempConfig.SYSTEM?.API_URL || '');
    Utils.setVal('conf_admin_pass', tempConfig.SYSTEM?.ADMIN_PASSWORD || '');
    Utils.setVal('conf_safe_precio', tempConfig.SAFE?.PRECIO_DIARIO || 2.00);
    Utils.setVal('conf_caja_fondo', tempConfig.CAJA?.FONDO !== undefined ? tempConfig.CAJA.FONDO : -2000.00);

    renderRangos();
    renderFiltros('TIPOS', 'list-filtros-tipos');
    renderFiltros('VISTAS', 'list-filtros-vistas');
    renderFiltros('CARACTERISTICAS', 'list-filtros-carac');
    renderDestinosTransfers();
    renderAppLaunchers();
}

function renderAppLaunchers() {
    const container = document.getElementById('list-app-launchers');
    if (!container) return;
    if (!tempConfig.SYSTEM.LAUNCHERS) tempConfig.SYSTEM.LAUNCHERS = [];

    container.innerHTML = tempConfig.SYSTEM.LAUNCHERS.map((l, index) => `
        <div class="col-md-6">
            <div class="border rounded p-2 d-flex align-items-center justify-content-between bg-white">
                <div class="d-flex align-items-center text-truncate">
                    <i class="bi bi-${l.icon} fs-4 me-2 text-primary"></i>
                    <div class="text-truncate">
                        <div class="fw-bold small">${l.label}</div>
                        <div class="text-muted" style="font-size: 0.65rem;">${l.path}</div>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger border-0" 
                    onclick="removeAppLauncher(${index})"><i class="bi bi-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function renderDestinosTransfers() {
    const container = document.getElementById('list-destinos-transfers');
    if (!container) return;
    if (!tempConfig.TRANSFERS) tempConfig.TRANSFERS = { DESTINOS: [] };
    if (!tempConfig.TRANSFERS.DESTINOS) tempConfig.TRANSFERS.DESTINOS = [];

    container.innerHTML = tempConfig.TRANSFERS.DESTINOS.map(d => `
        <div class="badge bg-light text-dark border p-2 d-flex align-items-center">
            <span class="fs-6 me-2">${d}</span>
            <button type="button" class="btn-close" style="width: 0.5em; height: 0.5em;" 
                onclick="removeDestinoTransfer('${d}')"></button>
        </div>
    `).join('');
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

function renderRangos() {
    const tbody = document.getElementById('config-rangos-table');
    if (!tbody) return;
    const rangos = tempConfig.HOTEL?.STATS_CONFIG?.RANGOS || [];
    let totalRooms = 0;

    tbody.innerHTML = rangos.map((r, index) => {
        totalRooms += (r.max - r.min) + 1;
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
        </tr>`;
    }).join('');

    const totalDisplay = document.getElementById('total-rooms-count');
    if(totalDisplay) totalDisplay.textContent = totalRooms;
}

function renderFiltros(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS) tempConfig.HOTEL.STATS_CONFIG.FILTROS = {};
    const list = tempConfig.HOTEL.STATS_CONFIG.FILTROS[type] || [];

    container.innerHTML = list.map(item => {
        const label = item.label || item;
        const icon = item.icon || '';
        return `
        <div class="badge bg-white text-secondary border d-flex align-items-center fw-normal">
            <span class="me-1 fs-6">${icon}</span>
            <span class="me-2">${label}</span>
            <button type="button" class="btn-close" style="width: 0.4em; height: 0.4em;" 
                onclick="removeFilter('${type}', '${label}')"></button>
        </div>`;
    }).join('');
}

function updateTempFromInputs() {
    if(!tempConfig.HOTEL) tempConfig.HOTEL = {};
    tempConfig.HOTEL.NOMBRE = document.getElementById('conf_hotel_nombre').value;
    
    if(!tempConfig.SYSTEM) tempConfig.SYSTEM = {};
    tempConfig.SYSTEM.API_URL = document.getElementById('conf_api_url').value;
    tempConfig.SYSTEM.ADMIN_PASSWORD = document.getElementById('conf_admin_pass').value;
    
    if(!tempConfig.SAFE) tempConfig.SAFE = {};
    tempConfig.SAFE.PRECIO_DIARIO = parseFloat(document.getElementById('conf_safe_precio').value) || 0;

    if(!tempConfig.CAJA) tempConfig.CAJA = {};
    const fondoElement = document.getElementById('conf_caja_fondo');
    if (fondoElement) tempConfig.CAJA.FONDO = parseFloat(fondoElement.value) || 0;
}

function configurarEventos() {
    // === RECEPCIONISTAS ===
    window.addRecepcionista = () => {
        const input = document.getElementById('newRecepcionista');
        const nombre = input.value.trim();
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

    // === TRANSFERS ===
    window.addDestinoTransfer = () => {
        const input = document.getElementById('newDestinoTransfer');
        const val = input.value.trim();
        if (val && !tempConfig.TRANSFERS.DESTINOS.includes(val)) {
            tempConfig.TRANSFERS.DESTINOS.push(val);
            renderDestinosTransfers();
            input.value = '';
            input.focus();
        }
    };
    window.removeDestinoTransfer = (val) => {
        tempConfig.TRANSFERS.DESTINOS = tempConfig.TRANSFERS.DESTINOS.filter(d => d !== val);
        renderDestinosTransfers();
    };

    // === APP LAUNCHERS ===
    window.openIconSelector = (targetId) => {
        IconSelector.open(targetId);
    };

    // === LÓGICA DEL EXPLORADOR DE ARCHIVOS WEB (v4.0) ===
    /**
     * Objeto FileBrowser: Gestiona la navegación por carpetas del PC
     * sin necesidad de diálogos nativos de Windows (que fallaban).
     */
    const FileBrowser = {
        currentPath: "C:\\", // Ruta inicial por defecto
        
        async open() {
            const modalEl = document.getElementById('modalFileBrowser');
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
            await this.loadPath("C:\\"); // Cargar raíz al abrir
        },

        /**
         * Cargar una ruta específica
         * Pide al servidor Node.js que le diga qué hay en esa carpeta.
         */
        async loadPath(targetPath) {
            this.currentPath = targetPath;
            document.getElementById('fb-current-path').value = this.currentPath;
            const container = document.getElementById('fb-list');
            container.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div></div>';

            try {
                const res = await fetch('/api/system/list-files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPath: this.currentPath })
                });

                if (!res.ok) throw new Error("Error leyendo carpeta");

                const data = await res.json();
                this.renderItems(data.items); // Mostrar archivos y carpetas

            } catch (e) {
                container.innerHTML = `<div class="text-danger p-3"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${e.message}</div>`;
            }
        },

        renderItems(items) {
            const container = document.getElementById('fb-list');
            container.innerHTML = '';

            items.forEach(item => {
                const icon = item.isDirectory ? 'folder-fill text-warning' : (item.name.toLowerCase().endsWith('.lnk') ? 'box-arrow-up-right text-info' : 'file-earmark-text text-secondary');
                
                // MEJORA: Permitimos seleccionar CUALQUIER archivo (exe, lnk, bat, pdf...)
                // El backend usa "start" así que Windows sabrá qué hacer con él.
                const isSelectable = true; 
                const opacity = '1';
                const cursor = 'pointer';

                const div = document.createElement('div');
                div.className = "list-group-item list-group-item-action d-flex align-items-center";
                div.style.cursor = cursor;
                div.style.opacity = opacity;
                
                div.innerHTML = `
                    <i class="bi bi-${icon} me-3 fs-5"></i>
                    <span class="text-truncate">${item.name}</span>
                `;

                if (item.isDirectory) {
                    div.onclick = () => this.loadPath(item.path);
                } else {
                    div.onclick = () => this.selectFile(item.path);
                }

                container.appendChild(div);
            });
            
            if (items.length === 0) {
               container.innerHTML = `<div class="text-muted p-3 text-center">Carpeta vacía</div>`; 
            }
        },

        up() {
            // Simple parent logic for Windows paths
            const parts = this.currentPath.split('\\');
            if (parts.length <= 1 || (parts.length === 2 && parts[1] === '')) return; // Root
            parts.pop();
            // If resulted in "C:", append backslash
            let newPath = parts.join('\\');
            if (!newPath.includes('\\') && newPath.endsWith(':')) newPath += '\\';
            // Simple handling for C:\ vs C:
            if (newPath.length === 2 && newPath[1] === ':') newPath += '\\';
            
            this.loadPath(newPath);
        },

        selectFile(fullPath) {
            document.getElementById('newLauncherPath').value = fullPath;
            const modalEl = document.getElementById('modalFileBrowser');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        }
    };

    // Expose FileBrowser globally for HTML onclicks
    window.FileBrowser = FileBrowser;

    window.pickLauncherFile = () => {
        FileBrowser.open();
    };

    window.addAppLauncher = () => {
        const label = document.getElementById('newLauncherLabel').value.trim();
        const path = document.getElementById('newLauncherPath').value.trim();
        const icon = document.getElementById('newLauncherIcon').value.trim() || 'box-arrow-up-right';

        if (!label || !path) {
            alert("Nombre y Ruta son obligatorios.");
            return;
        }
        if (!tempConfig.SYSTEM.LAUNCHERS) tempConfig.SYSTEM.LAUNCHERS = [];
        tempConfig.SYSTEM.LAUNCHERS.push({ label, path, icon });
        renderAppLaunchers();
        
        document.getElementById('newLauncherLabel').value = '';
        document.getElementById('newLauncherPath').value = '';
        document.getElementById('newLauncherIcon').value = '';
    };

    window.removeAppLauncher = (index) => {
        tempConfig.SYSTEM.LAUNCHERS.splice(index, 1);
        renderAppLaunchers();
    };

    // === HABITACIONES ===
    window.addRango = () => {
        const planta = parseInt(document.getElementById('newRangePlanta').value);
        const min = parseInt(document.getElementById('newRangeMin').value);
        const max = parseInt(document.getElementById('newRangeMax').value);
        if (isNaN(planta) || isNaN(min) || isNaN(max)) return;
        tempConfig.HOTEL.STATS_CONFIG.RANGOS.push({ planta, min, max });
        tempConfig.HOTEL.STATS_CONFIG.RANGOS.sort((a,b) => a.min - b.min);
        renderRangos();
        document.getElementById('newRangePlanta').value = '';
        document.getElementById('newRangeMin').value = '';
        document.getElementById('newRangeMax').value = '';
    };
    window.removeRango = (index) => {
        tempConfig.HOTEL.STATS_CONFIG.RANGOS.splice(index, 1);
        renderRangos();
    };

    window.addFilter = (type) => {
        let inputId = (type === 'TIPOS') ? 'newFiltroTipo' : (type === 'VISTAS' ? 'newFiltroVista' : 'newFiltroCarac');
        let emojiId = inputId + 'Emoji';
        const input = document.getElementById(inputId);
        const emoji = document.getElementById(emojiId);
        const val = input.value.trim();
        
        if (!val) return;
        if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS[type].some(x => (x.label || x) === val)) {
            tempConfig.HOTEL.STATS_CONFIG.FILTROS[type].push({ label: val, icon: emoji.value.trim() });
            renderFiltros(type, (type === 'TIPOS' ? 'list-filtros-tipos' : (type === 'VISTAS' ? 'list-filtros-vistas' : 'list-filtros-carac')));
            input.value = '';
            emoji.value = '';
        }
    };
    window.removeFilter = (type, val) => {
        const list = tempConfig.HOTEL.STATS_CONFIG.FILTROS[type];
        // Filter out by label
        tempConfig.HOTEL.STATS_CONFIG.FILTROS[type] = list.filter(item => (item.label || item) !== val);
        renderFiltros(type, (type === 'TIPOS' ? 'list-filtros-tipos' : (type === 'VISTAS' ? 'list-filtros-vistas' : 'list-filtros-carac')));
    };

    // === GUARDADO DE CONFIGURACIÓN ===
    /**
     * saveConfigLocal: Envía la configuración temporal al servidor.
     * Incluye una mejora de UX para añadir lanzadores olvidados.
     */
    window.saveConfigLocal = async () => {
        try {
            // MEJORA DE UX: Si el usuario rellenó los campos de Nombre/Ruta de una app 
            // pero olvidó darle al botón "+ AÑADIR", lo hacemos automáticamente.
            const pendingLabel = document.getElementById('newLauncherLabel')?.value.trim();
            const pendingPath = document.getElementById('newLauncherPath')?.value.trim();
            
            if (pendingLabel && pendingPath) {
                console.log("Auto-añadiendo lanzador pendiente antes de guardar...");
                window.addAppLauncher(true); // Modo silencioso (sin alertas)
            }

            // Actualizar el objeto temporal con los valores del formulario
            updateTempFromInputs();

            // Guardar físicamente en el servidor (storage/config.json)
            const response = await fetch('/api/storage/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tempConfig) 
            });

            if (!response.ok) throw new Error('Error al guardar en el servidor');

            // Actualizar la configuración activa en memoria
            Config.updateMemory(tempConfig);
            localStorage.removeItem('app_config_override'); // Limpiar caché local

            await Modal.showAlert("✅ Configuración guardada correctamente.", "success");
            
            // Recargar para aplicar todos los cambios de iconos y menús
            setTimeout(() => location.reload(), 1500);

        } catch (e) {
            console.error(e);
            Modal.showAlert("❌ Error al guardar en servidor (asegúrate de que está corriendo).", "warning");
        }
    };

    window.addAppLauncher = (silent = false) => {
        const labelFn = document.getElementById('newLauncherLabel');
        const pathFn = document.getElementById('newLauncherPath');
        const iconFn = document.getElementById('newLauncherIcon');
        
        const label = labelFn.value.trim();
        const path = pathFn.value.trim();
        const icon = iconFn.value.trim() || 'box-arrow-up-right';

        if (!label || !path) {
            if (!silent) alert("Nombre y Ruta son obligatorios.");
            return;
        }
        
        if (!tempConfig.SYSTEM) tempConfig.SYSTEM = {}; // Safety
        if (!tempConfig.SYSTEM.LAUNCHERS) tempConfig.SYSTEM.LAUNCHERS = [];
        
        tempConfig.SYSTEM.LAUNCHERS.push({ label, path, icon });
        renderAppLaunchers();
        
        // Clear inputs
        labelFn.value = '';
        pathFn.value = '';
        iconFn.value = '';
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
        Modal.showAlert("📂 Archivo descargado.", "info");
    };

    window.resetConfigToDefault = async () => {
        if (await Modal.showConfirm("¿Estás seguro?")) {
            localStorage.removeItem('app_config_override');
            location.reload();
        }
    };
}
