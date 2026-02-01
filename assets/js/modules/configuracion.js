import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { Ui } from '../core/Ui.js';

import { IconSelector } from '../core/IconSelector.js';
import { MediaPicker } from '../core/MediaPicker.js';
import { Api } from '../core/Api.js';
import { configService } from '../services/ConfigService.js';

let moduloInicializado = false;
let tempConfig = null; 

/**
 * MÓDULO DE CONFIGURACIÓN DEL SISTEMA (configuracion.js)
 */
export const Configurator = {
    /**
     * INICIALIZACIÓN
     */
    async inicializar() {
        this.renderInterfaz();
        if (moduloInicializado) return;
        this.configurarEventos();
        moduloInicializado = true;
    },

    /**
     * RENDERIZADO DE LA INTERFAZ
     */
    renderInterfaz() {
        try {
            tempConfig = JSON.parse(JSON.stringify(APP_CONFIG));
        } catch (e) {
            tempConfig = {}; 
        }

        this.verificarEstructuras();

        // Campos básicos
        Utils.setVal('conf_hotel_nombre', tempConfig.HOTEL?.NOMBRE || '');
        Utils.setVal('conf_api_url', tempConfig.SYSTEM?.API_URL || '');
        Utils.setVal('conf_admin_pass', tempConfig.SYSTEM?.ADMIN_PASSWORD || '');
        Utils.setVal('conf_safe_precio', tempConfig.SAFE?.PRECIO_DIARIO || 2.00);
        Utils.setVal('conf_caja_fondo', tempConfig.CAJA?.FONDO !== undefined ? tempConfig.CAJA.FONDO : -2000.00);
        Utils.setVal('conf_gallery_path', tempConfig.SYSTEM?.GALLERY_PATH || 'resources/informacion');

        // Listas dinámicas
        this.renderRecepcionistas();
        this.renderDestinosTransfers();
        this.renderAppLaunchers();
        this.renderRangos();
        this.renderFiltros('TIPOS', 'list-filtros-tipos');
        this.renderFiltros('VISTAS', 'list-filtros-vistas');
        this.renderFiltros('CARACTERISTICAS', 'list-filtros-carac');
        this.renderExcursionesCatalogo();
        this.renderInstalaciones();
    },

    verificarEstructuras() {
        if (!tempConfig.HOTEL) tempConfig.HOTEL = { RECEPCIONISTAS: [] };
        if (!tempConfig.HOTEL.RECEPCIONISTAS) tempConfig.HOTEL.RECEPCIONISTAS = [];
        if (!tempConfig.CAJA) tempConfig.CAJA = { FONDO: -2000 };
        if (!tempConfig.TRANSFERS) tempConfig.TRANSFERS = { DESTINOS: [] };
        if (!tempConfig.SYSTEM) tempConfig.SYSTEM = { LAUNCHERS: [] };
        if (!tempConfig.HOTEL.STATS_CONFIG) tempConfig.HOTEL.STATS_CONFIG = { RANGOS: [], FILTROS: {} };
        if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS) tempConfig.HOTEL.STATS_CONFIG.FILTROS = { TIPOS: [], VISTAS: [], CARACTERISTICAS: [] };
        if (!tempConfig.EXCURSIONES_CATALOGO) tempConfig.EXCURSIONES_CATALOGO = [];
        if (!tempConfig.HOTEL.INSTALACIONES) tempConfig.HOTEL.INSTALACIONES = [];
    },

    // --- RENDERERS ---

    renderRecepcionistas() {
        Ui.renderTable('config-recepcionistas-list', tempConfig.HOTEL.RECEPCIONISTAS, (nombre) => `
            <div class="badge bg-light text-dark border p-2 d-flex align-items-center">
                <span class="fs-6 text-truncate" style="max-width: 150px;">${nombre}</span>
                <button type="button" class="btn-close ms-2" style="width: 0.5em; height: 0.5em;" 
                    onclick="Configurator.removeRecepcionista('${nombre}')"></button>
            </div>
        `);
    },

    renderDestinosTransfers() {
        Ui.renderTable('list-destinos-transfers', tempConfig.TRANSFERS.DESTINOS, (d) => `
            <div class="badge bg-light text-dark border p-2 d-flex align-items-center">
                <span class="fs-6 me-2 text-truncate" style="max-width: 150px;">${d}</span>
                <button type="button" class="btn-close" style="width: 0.5em; height: 0.5em;" 
                    onclick="Configurator.removeDestinoTransfer('${d}')"></button>
            </div>
        `);
    },

    renderAppLaunchers() {
        Ui.renderTable('list-app-launchers', tempConfig.SYSTEM.LAUNCHERS, (l, index) => {
            const isImage = l.icon && (l.icon.startsWith('data:') || l.icon.includes('.') || l.icon.includes('/'));
            const iconHtml = isImage 
                ? `<img src="${l.icon}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 12px;" class="me-3 shadow-sm">`
                : `<i class="bi bi-${l.icon || 'box-arrow-up-right'}" style="font-size: 2.2rem; color: #444;" class="me-3"></i>`;

            return `
            <div class="col-md-6 mb-2">
                <div class="border rounded p-2 d-flex align-items-center justify-content-between bg-white shadow-sm">
                    <div class="d-flex align-items-center text-truncate">
                        ${iconHtml}
                        <div class="text-truncate">
                            <div class="fw-bold small text-truncate">
                                ${l.type === 'folder' 
                                    ? '<span class="badge bg-warning-subtle text-warning border-warning border-opacity-25 me-1" style="font-size: 0.5rem;">CARPETA</span>' 
                                    : '<span class="badge bg-info-subtle text-info border-info border-opacity-25 me-1" style="font-size: 0.5rem;">APP / ARCHIVO</span>'}
                                ${l.label}
                            </div>
                            <div class="text-muted text-truncate" style="font-size: 0.6rem;">${l.path}</div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger border-0" 
                        onclick="Configurator.removeAppLauncher(${index})"><i class="bi bi-trash"></i></button>
                </div>
            </div>`;
        });
    },

    renderRangos() {
        const tbody = document.getElementById('config-rangos-table');
        if (!tbody) return;
        const rangos = tempConfig.HOTEL.STATS_CONFIG.RANGOS || [];
        let totalRooms = 0;

        tbody.innerHTML = rangos.map((r, index) => {
            totalRooms += (r.max - r.min) + 1;
            return `
            <tr>
                <td>PB ${r.planta}</td>
                <td>${r.min}</td>
                <td>${r.max}</td>
                <td class="text-end">
                    <button type="button" class="btn btn-outline-danger btn-sm border-0" onclick="Configurator.removeRango(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        const totalDisplay = document.getElementById('total-rooms-count');
        if(totalDisplay) totalDisplay.textContent = totalRooms;
    },

    renderFiltros(type, containerId) {
        const list = tempConfig.HOTEL.STATS_CONFIG.FILTROS[type] || [];
        Ui.renderTable(containerId, list, (item) => {
            const label = item.label || item;
            const icon = item.icon || '';
            const isImage = icon && (icon.startsWith('data:') || icon.includes('.') || icon.includes('/'));
            const iconHtml = isImage 
                ? `<img src="${icon}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 8px;" class="me-2 shadow-sm">`
                : (icon.length < 5 
                    ? `<span class="me-2" style="font-size: 2.22rem; vertical-align: middle;">${icon}</span>`
                    : `<i class="bi bi-${icon} me-2" style="font-size: 2rem; color: #333; vertical-align: middle;"></i>`);

            return `
            <div class="badge bg-white text-secondary border d-flex align-items-center fw-normal shadow-sm p-1 ps-2 pe-2">
                ${iconHtml}
                <span class="me-2 text-truncate" style="max-width: 120px;">${label}</span>
                <button type="button" class="btn-close" style="width: 0.4em; height: 0.4em;" 
                    onclick="Configurator.removeFilter('${type}', '${label}')"></button>
            </div>`;
        });
    },

    renderExcursionesCatalogo() {
        Ui.renderTable('config-excursiones-list', tempConfig.EXCURSIONES_CATALOGO, (item, index) => `
            <tr>
                <td>
                    <div class="fw-bold">${item.nombre}</div>
                    <div class="small text-muted">${item.operador || 'Sin operador'}</div>
                </td>
                <td>
                    <span class="badge ${item.esTicket ? 'bg-info' : 'bg-primary'} opacity-75">
                        ${item.esTicket ? 'Ticket' : 'Excursión'}
                    </span>
                </td>
                <td class="text-center">
                    <div class="small text-muted">A: ${item.precioAdulto}€</div>
                    <div class="small text-muted">N: ${item.precioNiño || 0}€</div>
                    <div class="small text-muted text-primary">G: ${item.precioGrupo || 0}€</div>
                </td>
                <td class="text-end">
                    <button type="button" class="btn btn-outline-danger btn-sm border-0" 
                        onclick="Configurator.removeExcursionAlCatalogo(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    },

    renderInstalaciones() {
        Ui.renderTable('config-instalaciones-list', tempConfig.HOTEL.INSTALACIONES, (inst, index) => `
            <div class="badge bg-white text-dark border p-2 d-flex align-items-center shadow-sm">
                <i class="bi bi-${inst.icono || 'geo-fill'} me-2 text-primary"></i>
                <div class="text-start me-3">
                    <div class="fw-bold small">${inst.nombre}</div>
                    <div class="text-muted" style="font-size: 0.65rem;">${inst.apertura} - ${inst.cierre}</div>
                </div>
                <button type="button" class="btn-close" style="width: 0.5em; height: 0.5em;" 
                    onclick="Configurator.removeInstalacion(${index})"></button>
            </div>
        `);
    },

    // --- EVENTOS ---

    configurarEventos() {
        // Enlazar métodos a window para que los onclicks funcionen (temporalmente)
        window.Configurator = this;

        window.addRecepcionista = () => this.addRecepcionista();
        window.saveConfigLocal = () => this.saveConfigLocal();
        window.exportConfig = () => this.exportConfig();
        window.resetConfigToDefault = () => this.resetConfigToDefault();
        window.pickLauncherFile = () => this.pickLauncherFile();
        window.addAppLauncher = () => this.addAppLauncher();
        window.addDestinoTransfer = () => this.addDestinoTransfer();
        window.addRango = () => this.addRango();
        window.addFilter = (type) => this.addFilter(type);
        window.addInstalacion = () => this.addInstalacion();
    },

    addRecepcionista() {
        const input = document.getElementById('newRecepcionista');
        const nombre = input.value.trim();
        if (nombre && !tempConfig.HOTEL.RECEPCIONISTAS.includes(nombre)) {
            tempConfig.HOTEL.RECEPCIONISTAS.push(nombre);
            this.renderRecepcionistas();
            input.value = '';
            input.focus();
        }
    },

    async removeRecepcionista(nombre) {
        if (await Ui.showConfirm(`¿Eliminar a ${nombre} de la lista?`)) {
            tempConfig.HOTEL.RECEPCIONISTAS = tempConfig.HOTEL.RECEPCIONISTAS.filter(r => r !== nombre);
            this.renderRecepcionistas();
        }
    },

    addDestinoTransfer() {
        const input = document.getElementById('newDestinoTransfer');
        const val = input.value.trim();
        if (val && !tempConfig.TRANSFERS.DESTINOS.includes(val)) {
            tempConfig.TRANSFERS.DESTINOS.push(val);
            this.renderDestinosTransfers();
            input.value = '';
            input.focus();
        }
    },

    async removeDestinoTransfer(val) {
        if (await Ui.showConfirm(`¿Eliminar el destino "${val}"?`)) {
            tempConfig.TRANSFERS.DESTINOS = tempConfig.TRANSFERS.DESTINOS.filter(d => d !== val);
            this.renderDestinosTransfers();
        }
    },

    addAppLauncher(silent = false) {
        const labelFn = document.getElementById('newLauncherLabel');
        const pathFn = document.getElementById('newLauncherPath');
        const iconFn = document.getElementById('newLauncherIcon');
        const typeFn = document.getElementById('newLauncherType');
        
        const label = labelFn.value.trim();
        const path = pathFn.value.trim();
        const type = typeFn ? typeFn.value : 'app';
        const icon = iconFn.value.trim() || (type === 'folder' ? 'folder2-open' : 'box-arrow-up-right');

        if (!label || !path) {
            if (!silent) Ui.showToast("Nombre y Ruta son obligatorios.", "warning");
            return;
        }
        
        tempConfig.SYSTEM.LAUNCHERS.push({ label, path, icon, type });
        this.renderAppLaunchers();
        
        labelFn.value = '';
        pathFn.value = '';
        iconFn.value = '';
        if (typeFn) typeFn.value = 'app';
        this.onLauncherTypeChange('app');
    },

    onLauncherTypeChange(type) {
        const label = document.getElementById('labelLauncherPath');
        const pathInput = document.getElementById('newLauncherPath');
        if (type === 'folder') {
            if (label) label.textContent = 'Ruta de Carpeta';
            if (pathInput) pathInput.placeholder = 'Ej: C:\\Mis Documentos';
        } else {
            if (label) label.textContent = 'Ruta de App o Archivo';
            if (pathInput) pathInput.placeholder = 'Ej: C:\\Docs\\Informe.docx o .exe';
        }
    },

    async removeAppLauncher(index) {
        if (await Ui.showConfirm("¿Eliminar este lanzador de aplicación?")) {
            tempConfig.SYSTEM.LAUNCHERS.splice(index, 1);
            this.renderAppLaunchers();
        }
    },

    async pickLauncherFile() {
        const type = document.getElementById('newLauncherType')?.value || 'app';
        MediaPicker.pickFile({
            fileType: type === 'folder' ? 'folder' : 'executable',
            startPath: 'C:\\',
            onSelect: (path) => {
                document.getElementById('newLauncherPath').value = path;
            }
        });
    },

    addRango() {
        const planta = parseInt(document.getElementById('newRangePlanta').value);
        const min = parseInt(document.getElementById('newRangeMin').value);
        const max = parseInt(document.getElementById('newRangeMax').value);
        if (isNaN(planta) || isNaN(min) || isNaN(max)) return;
        tempConfig.HOTEL.STATS_CONFIG.RANGOS.push({ planta, min, max });
        tempConfig.HOTEL.STATS_CONFIG.RANGOS.sort((a,b) => a.min - b.min);
        this.renderRangos();
        document.getElementById('newRangePlanta').value = '';
        document.getElementById('newRangeMin').value = '';
        document.getElementById('newRangeMax').value = '';
    },

    async removeRango(index) {
        if (await Ui.showConfirm("¿Eliminar este rango de habitaciones?")) {
            tempConfig.HOTEL.STATS_CONFIG.RANGOS.splice(index, 1);
            this.renderRangos();
        }
    },

    addFilter(type) {
        let inputId = (type === 'TIPOS') ? 'newFiltroTipo' : (type === 'VISTAS' ? 'newFiltroVista' : 'newFiltroCarac');
        const input = document.getElementById(inputId);
        const emoji = document.getElementById(inputId + 'Emoji');
        const val = input.value.trim();
        if (!val) return;
        if (!tempConfig.HOTEL.STATS_CONFIG.FILTROS[type].some(x => (x.label || x) === val)) {
            tempConfig.HOTEL.STATS_CONFIG.FILTROS[type].push({ label: val, icon: emoji.value.trim() });
            this.renderFiltros(type, (type === 'TIPOS' ? 'list-filtros-tipos' : (type === 'VISTAS' ? 'list-filtros-vistas' : 'list-filtros-carac')));
            input.value = '';
            emoji.value = '';
        }
    },

    addExcursionAlCatalogo() {
        const nombre = Utils.getVal('newExc_nombre');
        const operador = Utils.getVal('newExc_operador');
        const pAdulto = parseFloat(Utils.getVal('newExc_pAdulto')) || 0;
        const pNiño = parseFloat(Utils.getVal('newExc_pNiño'));
        const pGrupo = parseFloat(Utils.getVal('newExc_pGrupo'));
        const esTicket = document.getElementById('newExc_esTicket').value;

        if (!nombre || pAdulto <= 0) {
            Ui.showToast("Nombre y precio de adulto son obligatorios.", "warning");
            return;
        }

        const id = `CAT-${Date.now()}`;
        tempConfig.EXCURSIONES_CATALOGO.push({
            id,
            nombre,
            operador,
            precioAdulto: pAdulto,
            precioNiño: isNaN(pNiño) ? 0 : pNiño,
            precioGrupo: isNaN(pGrupo) ? 0 : pGrupo,
            esTicket: esTicket === 'true'
        });

        this.renderExcursionesCatalogo();
        
        // Limpiar
        Utils.setVal('newExc_nombre', '');
        Utils.setVal('newExc_operador', '');
        Utils.setVal('newExc_pAdulto', '');
        Utils.setVal('newExc_pNiño', '');
        Utils.setVal('newExc_pGrupo', '');
    },

    async removeExcursionAlCatalogo(index) {
        if (await Ui.showConfirm("¿Eliminar este producto del catálogo?")) {
            tempConfig.EXCURSIONES_CATALOGO.splice(index, 1);
            this.renderExcursionesCatalogo();
        }
    },

    addInstalacion() {
        const nombre = Utils.getVal('newInst_nombre');
        const apertura = Utils.getVal('newInst_apertura');
        const cierre = Utils.getVal('newInst_cierre');
        const icono = Utils.getVal('newInst_icono') || 'geo-fill';

        if (!nombre || !apertura || !cierre) {
            Ui.showToast("El nombre y el horario son obligatorios.", "warning");
            return;
        }

        tempConfig.HOTEL.INSTALACIONES.push({ nombre, apertura, cierre, icono });
        this.renderInstalaciones();

        // Limpiar
        Utils.setVal('newInst_nombre', '');
        Utils.setVal('newInst_icono', '');
    },

    async removeInstalacion(index) {
        if (await Ui.showConfirm("¿Eliminar esta instalación del hotel?")) {
            tempConfig.HOTEL.INSTALACIONES.splice(index, 1);
            this.renderInstalaciones();
        }
    },

    async removeFilter(type, val) {
        if (await Ui.showConfirm(`¿Eliminar el filtro "${val}"?`)) {
            tempConfig.HOTEL.STATS_CONFIG.FILTROS[type] = tempConfig.HOTEL.STATS_CONFIG.FILTROS[type].filter(item => (item.label || item) !== val);
            this.renderFiltros(type, (type === 'TIPOS' ? 'list-filtros-tipos' : (type === 'VISTAS' ? 'list-filtros-vistas' : 'list-filtros-carac')));
        }
    },

    async saveConfigLocal() {
        const btn = document.querySelector('button[onclick="saveConfigLocal()"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...'; }

        try {
            // Sync values from form
            tempConfig.HOTEL.NOMBRE = document.getElementById('conf_hotel_nombre').value;
            tempConfig.SYSTEM.API_URL = document.getElementById('conf_api_url').value;
            tempConfig.SYSTEM.ADMIN_PASSWORD = document.getElementById('conf_admin_pass').value;
            tempConfig.SAFE.PRECIO_DIARIO = parseFloat(document.getElementById('conf_safe_precio').value) || 2.0;
            tempConfig.CAJA.FONDO = parseFloat(document.getElementById('conf_caja_fondo').value) || -2000.0;
            tempConfig.SYSTEM.GALLERY_PATH = document.getElementById('conf_gallery_path').value || 'resources/informacion';

            await configService.saveConfig(tempConfig);
            Ui.showToast("Configuración guardada correctamente.", "success");
            setTimeout(() => location.reload(), 1500);
        } catch (e) {
            Ui.showToast("Error al guardar la configuración.", "error");
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-save me-2"></i>Guardar Ajustes'; }
        }
    },

    exportConfig() {
        const jsonString = JSON.stringify(tempConfig, null, 4);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = "config.json";
        a.click(); URL.revokeObjectURL(url);
    },

    async resetConfigToDefault() {
        if (await Ui.showConfirm("¿Restablecer configuración? Se perderán los ajustes no guardados.")) {
            location.reload();
        }
    }
};

/**
 * Función legacy para punto de entrada
 */
export function inicializarConfiguracion() {
    Configurator.inicializar();
}


/* EXPORTED GLOBAL */
window.pickGalleryFolder = () => {
    const current = document.getElementById('conf_gallery_path').value;
    MediaPicker.pickFile({
        startPath: current && current.includes(':') ? current : 'C:\\',
        fileType: 'folder',
        onSelect: (path) => {
            document.getElementById('conf_gallery_path').value = path;
        }
    });
};

