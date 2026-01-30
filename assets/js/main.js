// --- STARTUP ---
console.log("Recepcion Suite V2 - Starting...");

// --- IMPORTACI\u00D3N DE M\u00D3DULOS OPERATIVOS ---
// Cada módulo gestiona una funcionalidad específica (Agenda, Caja, etc.)
import { inicializarAgenda } from './modules/agenda.js';
import { inicializarCaja } from './modules/caja.js';
import { inicializarCobro } from './modules/cobro.js';
import { Ui } from './core/Ui.js'; // Import Ui FIRST

import { clock } from './modules/clock.js';
import { inicializarAtenciones } from './modules/atenciones.js';
import { inicializarSafe } from './modules/safe.js?v=V6_STABLE'; // Force Reload
import { inicializarDespertadores } from './modules/despertadores.js';
import { inicializarDesayuno } from './modules/desayuno.js';
import { inicializarEstancia } from './modules/estancia.js';
import { inicializarNovedades } from './modules/novedades.js';
import { inicializarCenaFria } from './modules/cena_fria.js';
import { inicializarRiu } from './modules/riu.js?v=V6_STABLE'; // Force Reload
import { inicializarAyuda } from './modules/ayuda.js';
import { inicializarTransfers } from './modules/transfers.js?v=V6_STABLE'; // Force Reload
import { inicializarNotasPermanentes } from './modules/notas_permanentes.js';
import { inicializarPrecios } from './modules/precios.js';
import { inicializarSystemAlarms } from './modules/alarms.js';
import { inicializarSystemAlarmsUI } from './modules/system_alarms_ui.js';
import { inicializarRack } from './modules/rack.js?v=V6_STABLE';
import { inicializarConfiguracion } from './modules/configuracion.js';
import { Gallery } from './modules/gallery.js';
import { IconSelector } from './core/IconSelector.js';

// --- SISTEMAS CORE (N\u00DACKLEO) ---
import { APP_CONFIG, Config } from './core/Config.js'; // Cargador de configuraci\u00F3n
import { Modal } from './core/Modal.js';              // Gestor de ventanas modales
import { Router } from './core/Router.js';            // Gestor de navegaci\u00F3n entre pesta\u00F1as
import { CompLoader } from './core/CompLoader.js';    // Cargador din\u00E1mico de plantillas HTML
import { Search } from './core/Search.js';            // Buscador global de m\u00F3dulos
import { sessionService } from './services/SessionService.js'; // Gestor de usuario logueado
import { Utils } from './core/Utils.js?v=V6_STABLE';              // Utilidades generales (formateo, etc.)
import { RoomDetailModal } from './core/RoomDetailModal.js?v=V6_STABLE'; // Modal Global de Habitaci\u00F3n

// Expose Utils globally for inline HTML events (like togglePassword)
window.Utils = Utils;

/**
 * PUNTO DE ENTRADA PRINCIPAL (DOMContentLoaded)
 * Se ejecuta cuando el navegador termina de cargar el HTML básico.
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
    // FIX: Desactivar autocompletado globalmente para prevenir "basura" en los inputs
    try {
        document.querySelectorAll('form, input').forEach(el => el.setAttribute('autocomplete', 'off'));
    } catch(e) { console.warn("No se pudo desactivar autocompletado", e); }

    // 0. CARGAR CONFIGURACIÓN (CRÍTICO)
    // El sistema no puede arrancar sin saber la URL de la API o la configuración del hotel.
    const configLoaded = await Config.loadConfig();
    if (!configLoaded) {
        document.body.innerHTML = '<div style="color:red; padding:20px; text-align:center;"><h1>Error Crítico</h1><p>No se ha podido cargar la configuración (config.json).</p></div>';
        return;
    }

    // Diagnóstico de Almacenamiento Local (Evita fallos silenciosos en navegadores bloqueados)
    try {
        const testKey = '__test_storage__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
    } catch (e) {
        console.error("Critical Storage Error:", e);
        alert("⚠️ ERROR CRÍTICO: El sistema no puede guardar datos locales.");
    }

    // 1. Inicializar Sistemas Base
    console.log("Initializing App...");

    // 1. Initialize UI Helpers (Toasts, etc.)
    Ui.init();



    // 3. Initialize Clock
    clock.init();
    Modal.init();  // Activa el soporte para ventanas modales personalizadas
    Router.init(); // Activa la detección de cambios en las pestañas
    Search.init(); // Activa el buscador de módulos

    // 2. Definir componentes a cargar
    const componentes = [
        { id: 'riu-content', path: 'assets/templates/riu.html' },
        { id: 'agenda-content', path: 'assets/templates/agenda.html' },
        { id: 'cobro-content', path: 'assets/templates/cobro.html' },
        { id: 'caja-content', path: 'assets/templates/caja.html' },
        { id: 'safe-content', path: 'assets/templates/safe.html' },
        { id: 'despertadores-content', path: 'assets/templates/despertadores.html' },
        { id: 'desayuno-content', path: 'assets/templates/desayuno.html' },
        { id: 'estancia-content', path: 'assets/templates/estancia.html' },
        { id: 'novedades-content', path: 'assets/templates/novedades.html' },
        { id: 'cena-fria-content', path: 'assets/templates/cena_fria.html' },
        { id: 'atenciones-content', path: 'assets/templates/atenciones.html' },
        { id: 'ayuda-content', path: 'assets/templates/ayuda.html' },
        { id: 'transfers-content', path: 'assets/templates/transfers.html' },
        { id: 'notas-content', path: 'assets/templates/notas_permanentes.html' },
        { id: 'precios-content', path: 'assets/templates/precios.html' },
        { id: 'system-alarms-content', path: 'assets/templates/system_alarms.html' },
        { id: 'rack-content', path: 'assets/templates/rack.html' },
        { id: 'configuracion-content', path: 'assets/templates/configuracion.html' }
    ];

    // 3. Cargar plantillas
    await CompLoader.loadAll(componentes);

    // 4. Configurar Fechas por defecto (Delegado a los módulos)
    // Se ha movido la lógica específica a los módulos correspondientes (Estancia, RIU, etc)
    // para mantener main.js limpio y agnóstico.

    // 5. Inicialización Escalonada para mayor velocidad percibida
    // Cargamos lo más urgente (Alarmas, Despertadores) primero.
    const modulosPrioritarios = [
        { nombre: 'Despertadores', init: inicializarDespertadores },
        { nombre: 'Novedades', init: inicializarNovedades },
        { nombre: 'Cena Fría', init: inicializarCenaFria },
        { nombre: 'Desayuno', init: inicializarDesayuno },
        { nombre: 'SystemAlarms', init: inicializarSystemAlarms },
        { nombre: 'SystemAlarmsUI', init: inicializarSystemAlarmsUI }
    ];

    const modulosSecundarios = [
        { nombre: 'Agenda', init: inicializarAgenda },
        { nombre: 'Caja', init: inicializarCaja },
        { nombre: 'Cobro', init: inicializarCobro },
        { nombre: 'Safe', init: inicializarSafe },
        { nombre: 'Estancia', init: inicializarEstancia },
        { nombre: 'Atenciones', init: inicializarAtenciones },
        { nombre: 'Transfers', init: inicializarTransfers },
        { nombre: 'Riu', init: inicializarRiu },
        { nombre: 'Ayuda', init: inicializarAyuda },
        { nombre: 'Notas Permanentes', init: inicializarNotasPermanentes },
        { nombre: 'Precios', init: inicializarPrecios },
        { nombre: 'Rack', init: inicializarRack },
        { nombre: 'Configuración', init: inicializarConfiguracion },
        { nombre: 'Galería', init: () => Gallery.inicializar() }
    ];

    // Cargar prioritarios inmediatamente
    modulosPrioritarios.forEach(m => {
        try { m.init(); } catch (e) { console.error(`Error en ${m.nombre}:`, e); }
    });

    // Cargar secundarios después de 100ms para no bloquear el navegador
    setTimeout(() => {
        modulosSecundarios.forEach(m => {
            try { m.init(); } catch (e) { console.error(`Error en ${m.nombre}:`, e); }
        });
        
        inicializarSesionGlobal(); // Inicia el selector de usuario (Recepción)
        
        // --- 6. Tooltips (After everything is rendered) ---
        initGlobalTooltips();
        
        // --- REACTIVIDAD AUTOMÁTICA ---
        // Si los datos llegan del servidor después de pintar la pantalla, repintamos.
        window.addEventListener('service-synced', (e) => {
            // console.log("Datos actualizados: ", e.detail.endpoint);
            const currentHash = window.location.hash;
            
            // Refrescar módulo activo según endpoint
            if (e.detail.endpoint === 'riu_transfers' && (!currentHash || currentHash === '#transfers-content')) {
                import('./modules/transfers.js').then(m => m.mostrarTransfers && m.mostrarTransfers());
            }
            if (e.detail.endpoint === 'riu_class_db' && currentHash === '#riu-content') {
                import('./modules/riu.js').then(m => m.mostrarClientes && m.mostrarClientes());
            }
            if (e.detail.endpoint === 'riu_safe_rentals' && currentHash === '#safe-content') {
                import('./modules/safe.js').then(m => m.mostrarSafeRentals && m.mostrarSafeRentals());
            }
        });

        console.log("Sistema completamente inicializado.");

        // --- HEARTBEAT PARA AUTO-CIERRE ROBUSTO ---
        // Mantiene vivo el servidor (24h timeout). Si falla, informa al usuario sin bloquear la consola.
        let heartbeatFailures = 0;
        const maxFailures = 5;

        setInterval(() => {
            fetch('/api/heartbeat').then(() => {
                heartbeatFailures = 0; // Reset si hay éxito
            }).catch(() => {
                heartbeatFailures++;
                if (heartbeatFailures < maxFailures) {
                    console.warn(`Server unreachable (Attempt ${heartbeatFailures}/${maxFailures})`);
                } else if (heartbeatFailures === maxFailures) {
                    console.error("Connection to server lost permanently. Stopping heartbeat.");
                    
                    // MOSTRAR PANTALLA DE RECUPERACIÓN (Overlay Bloqueante)
                    // No podemos reiniciar el exe desde aquí (seguridad del navegador),
                    // pero podemos guiar al usuario para que lo haga y recargue.
                    const overlay = document.createElement('div');
                    overlay.id = 'server-lost-overlay';
                    overlay.innerHTML = `
                        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                                    background: rgba(0,0,0,0.85); z-index: 10000; 
                                    display: flex; flex-direction: column; align-items: center; justify-content: center; 
                                    color: white; font-family: 'Segoe UI', system-ui, sans-serif; text-align: center;">
                            <div style="font-size: 4rem; color: #dc3545; margin-bottom: 20px;">
                                <i class="bi bi-wifi-off"></i>
                            </div>
                            <h1 style="font-size: 2rem; margin-bottom: 10px;">¡Conexión Perdida!</h1>
                            <p style="font-size: 1.2rem; max-width: 600px; margin-bottom: 30px; opacity: 0.9;">
                                El servidor de la aplicación se ha detenido o no responde.<br>
                                Esto puede ocurrir si el PC entró en suspensión profunda o se cerró el programa.
                            </p>
                            
                            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.2);">
                                <strong style="display: block; margin-bottom: 10px; color: #ffc107;">PASO 1:</strong>
                                Ejecuta de nuevo el icono <strong>"Recepcion Suite"</strong> en el escritorio.
                            </div>

                            <button onclick="location.reload()" 
                                    style="padding: 12px 30px; font-size: 1.1rem; background: #0d6efd; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background 0.2s;">
                                <i class="bi bi-arrow-clockwise me-2"></i>PASO 2: Reconectar
                            </button>
                        </div>`;
                    document.body.appendChild(overlay);
                }
            });
        }, 2000);

    }, 100);

    } catch (criticalError) {
        console.error("CRITICAL BOOT ERROR:", criticalError);
        const errorBox = document.getElementById('global-error-box');
        if (errorBox) {
            errorBox.classList.remove('d-none');
            const content = document.getElementById('error-list-content');
            if (content) content.innerHTML += `<div><strong>BOOT ERROR:</strong> ${criticalError.message}</div>`;
        }
        alert(`FALLO ARRANQUE: ${criticalError.message}\nVer consola para más detalles.`);
    }
});

// --- HELPER FUNCTIONS & GLOBAL EXPOSURE ---

/**
 * LANZADOR DE APLICACIONES (LaunchPad)
 */
window._currentLaunchPadFilter = 'all';

window.openLaunchPad = () => {
    const searchInput = document.getElementById('launchPadSearch');
    if (searchInput) searchInput.value = '';
    window._currentLaunchPadFilter = 'all';
    
    // Update filter buttons UI
    document.querySelectorAll('[id^="btnFilterLaunch"]').forEach(btn => btn.classList.remove('active', 'btn-primary'));
    document.getElementById('btnFilterLaunchAll')?.classList.add('active', 'btn-primary');

    window.renderLaunchPad('', 'all');

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('launchPadModal'));
    modal.show();
};

window.filterLaunchPad = (filter) => {
    window._currentLaunchPadFilter = filter;
    
    // UI Update
    const btnMap = { 'all': 'btnFilterLaunchAll', 'app': 'btnFilterLaunchApps', 'folder': 'btnFilterLaunchFolders' };
    Object.values(btnMap).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove('active', 'btn-primary');
            if (id === btnMap[filter]) btn.classList.add('active', 'btn-primary');
        }
    });

    const query = document.getElementById('launchPadSearch')?.value || '';
    window.renderLaunchPad(query, filter);
};

window.renderLaunchPad = (query = '', filter = 'all') => {
    const container = document.getElementById('launchPadGrid');
    if (!container) return;
    
    container.innerHTML = '';
    let apps = APP_CONFIG.SYSTEM?.LAUNCHERS || [];
    
    // 1. Filtrar por texto
    if (query) {
        const q = query.toLowerCase().trim();
        apps = apps.filter(a => a.label.toLowerCase().includes(q) || a.path.toLowerCase().includes(q));
    }

    // 2. Filtrar por tipo
    if (filter !== 'all') {
        apps = apps.filter(a => (a.type || 'app') === filter);
    }

    if (apps.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search fs-1 text-muted mb-2 d-block"></i>
                <div class="text-muted">No se encontraron resultados para "${query || 'esta categoría'}".</div>
            </div>`;
    } else {
        apps.forEach(app => {
            const isImage = app.icon && (app.icon.startsWith('data:') || app.icon.includes('.') || app.icon.includes('/'));
            const isFolder = app.type === 'folder';
            const iconColor = isFolder ? 'text-warning' : 'text-primary';
            const iconHtml = isImage 
                ? `<img src="${app.icon}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 12px;" class="mb-2 shadow-sm">`
                : `<div class="mb-2 ${iconColor} text-center"><i class="bi bi-${app.icon || (isFolder ? 'folder-fill' : 'app')} fs-1"></i></div>`;

            container.innerHTML += `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="card h-100 border-0 shadow-sm hover-scale text-center p-3" 
                     style="cursor:pointer;" onclick="window.launchExternalApp('${app.path.replace(/\\/g, '\\\\')}')">
                    <div class="position-absolute top-0 end-0 p-2 opacity-50">
                        <i class="bi bi-${isFolder ? 'folder-symlink' : 'cpu-fill'} small"></i>
                    </div>
                    <div class="d-flex justify-content-center">${iconHtml}</div>
                    <div class="fw-bold text-dark small text-truncate mt-1">${app.label}</div>
                    <div class="text-muted" style="font-size: 0.6rem;">${isFolder ? 'Carpeta' : 'App / Archivo'}</div>
                </div>
            </div>
            `;
        });
    }
};

/**
 * EJECUTAR APP EXTERNA
 */
window.launchExternalApp = async (command) => {
    try {
        const response = await fetch('/api/system/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        if (!response.ok) throw new Error('Server error');
    } catch (e) {
        console.error("Fallo al lanzar:", e);
        alert("Error al lanzar aplicación.");
    }
};

function inicializarSesionGlobal() {
    const userList = document.getElementById('globalUserList');
    const userBtnName = document.getElementById('globalUserName');
    const userBtn = document.getElementById('globalUserBtn');

    if (!userList || !userBtnName) return;

    // 1. Cargar usuarios del config
    const users = APP_CONFIG.HOTEL.RECEPCIONISTAS;
    const divider = userList.querySelector('hr.dropdown-divider').parentElement;

    users.forEach(u => {
        const li = document.createElement('li');
        li.innerHTML = `<button class="dropdown-item" onclick="window.setGlobalUser('${u}')">${u}</button>`;
        userList.insertBefore(li, divider);
    });

    // Añadir "Otro..."
    const liOtro = document.createElement('li');
    liOtro.innerHTML = `<button class="dropdown-item" onclick="window.promptGlobalUser()">Otro...</button>`;
    userList.insertBefore(liOtro, divider);

    // 2. Restaurar sesión
    const currentUser = sessionService.getUser();
    if (currentUser) {
        updateUserUI(currentUser);
    } else {
        userBtn.classList.add('btn-outline-danger', 'animation-pulse');
    }

    // 3. Exponer funciones
    window.setGlobalUser = (name) => {
        sessionService.setUser(name);
        updateUserUI(name);
        userBtn.classList.remove('btn-outline-danger', 'animation-pulse');
        userBtn.classList.add('btn-outline-secondary');
    };

    // Modal para 'Otro'
    if (!document.getElementById('modalGlobalUser')) {
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = `
            <div class="modal fade" id="modalGlobalUser" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header border-0 pb-0">
                            <h5 class="modal-title fw-bold text-primary"><i class="bi bi-person-badge me-2"></i>Identifícate</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <input type="text" id="inputGlobalUser" class="form-control form-control-lg text-center" placeholder="Nombre...">
                        </div>
                        <div class="modal-footer border-0 pt-0">
                            <button type="button" class="btn btn-primary w-100" onclick="window.confirmGlobalUser()">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalDiv);
        document.getElementById('inputGlobalUser').addEventListener('keypress', (e) => { if (e.key === 'Enter') window.confirmGlobalUser(); });
    }

    window.promptGlobalUser = () => {
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGlobalUser'));
        modal.show();
    };

    window.confirmGlobalUser = () => {
        const name = document.getElementById('inputGlobalUser').value;
        if (name?.trim()) {
            window.setGlobalUser(name.trim());
            bootstrap.Modal.getInstance(document.getElementById('modalGlobalUser')).hide();
        }
    };

    window.logoutGlobal = () => { sessionService.logout(); location.reload(); };

    window.cleanupUI = () => {
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        alert("UI Limpia");
    };

    // Utilidades de Respaldo y Agenda
    window.ejecutarRespaldoManual = async () => {
        if(!(await Modal.showConfirm("¿Forzar respaldo?"))) return;
        try {
            const { backupService } = await import('./services/BackupService.js');
            await backupService.performFullBackup();
            await Modal.showAlert("Respaldo completado", "success");
        } catch (e) { console.error(e); }
    };

    window.ejecutarRestauracionAgenda = async () => {
        if(!(await Modal.showConfirm("¿Restaurar contactos?"))) return;
        try {
            const { agendaService } = await import('./services/AgendaService.js');
            await agendaService.restaurarAgendaForzada();
        } catch (e) { console.error(e); }
    };
}

// --- TOOLTIP HELPERS ---

window.initTooltips = (container = document.body) => {
    const selector = '[data-bs-toggle="tooltip"], .custom-tooltip, [data-tooltip="true"]';
    if (container.matches && container.matches(selector)) initSingleTooltip(container);
    if (container.querySelectorAll) container.querySelectorAll(selector).forEach(el => initSingleTooltip(el));
};

function initSingleTooltip(el) {
    try {
        bootstrap.Tooltip.getOrCreateInstance(el, {
            trigger: 'hover',
            container: 'body', 
            delay: { show: 700, hide: 100 },
            html: true,
            placement: el.dataset.bsPlacement || 'top'
        });
    } catch(e) { console.warn("Tooltip error:", e); }
}

function initGlobalTooltips() {
    window.initTooltips(document.body);
    new MutationObserver((mutations) => {
        mutations.forEach((m) => {
            if (m.type === 'childList') m.addedNodes.forEach(node => { if (node.nodeType === 1) window.initTooltips(node); });
        });
    }).observe(document.body, { childList: true, subtree: true });
}

function updateUserUI(name) {
    const userBtnName = document.getElementById('globalUserName');
    const userBtn = document.getElementById('globalUserBtn');
    if (userBtnName) userBtnName.innerText = name;
    if (userBtn) {
        userBtn.classList.remove('btn-outline-secondary', 'btn-outline-danger');
        userBtn.classList.add('btn-success', 'text-white');
    }
}

window.checkDailySummaryVisibility = () => {
    const section = document.getElementById('dashboard-resumen-seccion');
    if (!section) return;
    const hasVisible = Array.from(section.querySelectorAll('[id^="dash-col-"]')).some(mod => !mod.classList.contains('d-none'));
    section.classList.toggle('d-none', !hasVisible);
};
