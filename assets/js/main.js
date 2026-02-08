// --- STARTUP ---

// --- IMPORTACIÓN DE MÓDULOS OPERATIVOS ---
// Cada módulo gestiona una funcionalidad específica (Agenda, Caja, etc.)
import { inicializarAgenda } from './modules/agenda.js';
import { inicializarCaja } from './modules/caja.js';
import { inicializarCobro } from './modules/cobro.js';
import { Ui } from './core/Ui.js'; // Import Ui FIRST

import { clock } from './modules/clock.js';
import { inicializarAtenciones } from './modules/atenciones.js';
import { inicializarSafe } from './modules/safe.js'; // Force Reload
import { inicializarDespertadores } from './modules/despertadores.js';
import { inicializarDesayuno } from './modules/desayuno.js';
import { inicializarEstancia } from './modules/estancia.js';
import { inicializarNovedades } from './modules/novedades.js';
import { inicializarCenaFria } from './modules/cena_fria.js';
import { inicializarRiu } from './modules/riu.js'; // Force Reload
import { inicializarAyuda } from './modules/ayuda.js';
import { inicializarTransfers } from './modules/transfers.js'; // Force Reload
import { inicializarNotasPermanentes } from './modules/notas_permanentes.js';
import { inicializarPrecios } from './modules/precios.js';
import { inicializarSystemAlarms } from './modules/alarms.js';
import { inicializarSystemAlarmsUI } from './modules/system_alarms_ui.js';
import { inicializarLostFound } from './modules/lost_found.js';
import { inicializarRack } from './modules/rack.js';
import { inicializarConfiguracion } from './modules/configuracion.js';
import { Excursiones } from './modules/excursiones.js';
import { ReservasInstalaciones } from './modules/reservas_instalaciones.js';
import { Gallery } from './modules/gallery.js';
import { IconSelector } from './core/IconSelector.js';

// --- SISTEMAS CORE (NÚCLEO) ---
import { APP_CONFIG, Config } from './core/Config.js'; // Cargador de configuración
import { Api } from './core/Api.js';
import { Modal } from './core/Modal.js';              // Gestor de ventanas modales
import { Router } from './core/Router.js';            // Gestor de navegación entre pestañas
import { CompLoader } from './core/CompLoader.js';    // Cargador dinámico de plantillas HTML
import { Search } from './core/Search.js';            // Buscador global de módulos
import { sessionService } from './services/SessionService.js'; // Gestor de usuario logueado
import { Utils } from './core/Utils.js';              // Utilidades generales (formateo, etc.)
import { migrateLostFoundImages } from '../../migrate_images.js';
import { RoomDetailModal } from './core/RoomDetailModal.js'; // Modal Global de Habitación

// Expose Utils globally for inline HTML events (like togglePassword)
window.Utils = Utils;

/**
 * SPOTIFY FOOTER PLAYER LOGIC
 */
window.initFooterSpotify = () => {
    let url = APP_CONFIG.HOTEL?.SPOTIFY_URL;
    const container = document.getElementById('spotify-footer-player');
    const iframe = document.getElementById('spotify-footer-iframe');
    const playerBody = container ? container.querySelector('.spotify-player-body') : null;
    
    // 1. Limpiar y validar
    if (!url || typeof url !== 'string') {
        url = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM3M"; // Fallback: Relaxing Music
    }
    url = url.trim();

    // 2. Extraer ID y Tipo de forma robusta
    let embedUrl = url;
    // Regex mejorada para capturar IDs con guiones o más complejos
    const match = url.match(/(playlist|album|track)\/([a-zA-Z0-9\-_]{15,})/);
    
    if (match) {
        const type = match[1];
        const id = match[2];
        embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`;
    } else if (!url.includes('/embed/')) {
        // Si no detectamos el patrón pero no es embed, intentamos un parche básico
        embedUrl = url.replace('spotify.com/', 'spotify.com/embed/');
    }

    if (iframe) {
        // Atributos críticos ANTES del src para evitar bloqueos de DRM
        iframe.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
        iframe.setAttribute('loading', 'lazy');
        iframe.style.borderRadius = '12px';
        
        // Construcción limpia
        iframe.src = embedUrl;

    }

};

window.toggleSpotifyFooter = () => {
    const container = document.getElementById('spotify-footer-player');
    const icon = document.getElementById('spotify-toggle-icon');
    
    if (container) {
        container.classList.toggle('minimized');
        if (icon) {
            icon.classList.toggle('bi-chevron-up');
            icon.classList.toggle('bi-chevron-down');
        }
    }
};

/**
 * PUNTO DE ENTRADA PRINCIPAL (DOMContentLoaded)
 * Se ejecuta cuando el navegador termina de cargar el HTML básico.
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 0. Limpieza UI Base
        try {
            document.querySelectorAll('form, input').forEach(el => el.setAttribute('autocomplete', 'off'));
        } catch(e) { console.warn("No se pudo desactivar autocompletado", e); }

        // 1. CARGAR CONFIGURACIÓN (CRÍTICO)
        const configLoaded = await Config.loadConfig();
        if (!configLoaded) {
            document.body.innerHTML = '<div style="color:red; padding:20px; text-align:center;"><h1>Error Crítico</h1><p>No se ha podido cargar la configuración (config.json).</p></div>';
            return;
        }

        // --- 2. MULTIMEDIA INIT (Spotify) ---
        window.initFooterSpotify();

        // Diagnóstico de Almacenamiento Local
        try {
            const testKey = '__test_storage__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
        } catch (e) {
            console.error("Critical Storage Error:", e);
            alert("⚠️ ERROR CRÍTICO: El sistema no puede guardar datos locales.");
        }

        // 3. Inicializar Sistemas Base

        Ui.init();
        clock.init();
        Modal.init();  
        Router.init(); 
        Search.init(); 

        // 4. Cargar Plantillas
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
            { id: 'lost-found-content', path: 'assets/templates/lost_found.html' },
            { id: 'notas-content', path: 'assets/templates/notas_permanentes.html' },
            { id: 'precios-content', path: 'assets/templates/precios.html' },
            { id: 'system-alarms-content', path: 'assets/templates/system_alarms.html' },
            { id: 'rack-content', path: 'assets/templates/rack.html' },
            { id: 'excursiones-content', path: 'assets/templates/excursiones.html' },
            { id: 'reservas-instalaciones-content', path: 'assets/templates/reservas_instalaciones.html' },
            { id: 'configuracion-content', path: 'assets/templates/configuracion.html' }
        ];

        await CompLoader.loadAll(componentes);

        // 5. Inicialización de Módulos (Escalonada)
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
            { nombre: 'Lost & Found', init: inicializarLostFound },
            { nombre: 'Excursiones', init: () => Excursiones.init() },
            { nombre: 'Reservas Instalaciones', init: () => ReservasInstalaciones.init() },
            { nombre: 'Configuración', init: inicializarConfiguracion },
            { nombre: 'Galería', init: () => Gallery.inicializar() }
        ];

        modulosPrioritarios.forEach(m => {
            try { m.init(); } catch (e) { console.error(`Error en ${m.nombre}:`, e); }
        });

        setTimeout(() => {
            modulosSecundarios.forEach(m => {
                try { m.init(); } catch (e) { console.error(`Error en ${m.nombre}:`, e); }
            });
            
            inicializarSesionGlobal(); 
            initGlobalTooltips();
            window.renderLaunchPad('', 'app', 'tab');
            
            const ytModal = document.getElementById('youtubePlayerModal');
            if (ytModal) ytModal.addEventListener('hidden.bs.modal', window.stopYouTubeVideo);
            const webModal = document.getElementById('webViewerModal');
            if (webModal) webModal.addEventListener('hidden.bs.modal', window.stopWebViewer);


        }, 100);

        // 6. Reactividad
        window.addEventListener('service-synced', (e) => {
            const currentHash = window.location.hash;
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

        // 7. Heartbeat
        let heartbeatFailures = 0;
        const maxFailures = 5;
        setInterval(() => {
            fetch('/api/heartbeat').then(response => {
                if (response.ok) {
                    heartbeatFailures = 0;
                    const overlay = document.getElementById('server-lost-overlay');
                    if (overlay) overlay.remove();
                }
            }).catch(() => {
                heartbeatFailures++;
                if (heartbeatFailures >= maxFailures) {
                    if (!document.getElementById('server-lost-overlay')) {
                        const overlay = document.createElement('div');
                        overlay.id = 'server-lost-overlay';
                        overlay.innerHTML = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                                    background: rgba(0,0,0,0.85); z-index: 30000; 
                                    display: flex; flex-direction: column; align-items: center; justify-content: center; 
                                    color: white; font-family: sans-serif; text-align: center;">
                                <div style="font-size: 4rem; color: #dc3545; margin-bottom: 20px;"><i class="bi bi-wifi-off"></i></div>
                                <h1 style="font-size: 2rem; margin-bottom: 10px;">¡Conexión Perdida!</h1>
                                <p style="font-size: 1.1rem; max-width: 500px; margin-bottom: 30px; opacity: 0.9;">El servidor se ha detenido. Reinicia la aplicación Reception Suite para continuar.</p>
                                <button onclick="location.reload()" style="padding: 12px 30px; background: #0d6efd; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">RECONECTAR</button>
                            </div>`;
                        document.body.appendChild(overlay);
                    }
                }
            });
        }, 10000);

    } catch (criticalError) {
        console.error("CRITICAL BOOT ERROR:", criticalError);
        const errorBox = document.getElementById('global-error-box');
        if (errorBox) {
            errorBox.classList.remove('d-none');
            const list = document.getElementById('error-list-content');
            if (list) list.innerHTML += `<div><strong>ERROR DE ARRANQUE:</strong> ${criticalError.message}</div>`;
        }
    }
});

// --- HELPER FUNCTIONS & GLOBAL EXPOSURE ---

/**
 * LANZADOR DE APLICACIONES (LaunchPad)
 */
window._currentLaunchPadFilter = 'app';

window.openLaunchPad = () => {
    const searchInput = document.getElementById('launchPadSearch');
    if (searchInput) searchInput.value = '';
    window._currentLaunchPadFilter = 'app';
    
    // Update filter buttons UI
    document.querySelectorAll('[id^="btnFilterLaunch"]').forEach(btn => btn.classList.remove('active', 'btn-primary'));
    document.getElementById('btnFilterLaunchApps')?.classList.add('active', 'btn-primary');

    window.renderLaunchPad('', 'app', 'modal');

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('launchPadModal'));
    modal.show();
};

window.filterLaunchPad = (filter, target = 'modal') => {
    window._launchPadOffset = 0; // Reset offset on filter change
    window._currentLaunchPadFilter = filter; // Update global filter state
    
    // UI Update
    const prefix = target === 'tab' ? '_Tab' : '';
    const btnMap = { 
        'all': 'btnFilterLaunchAll' + prefix, 
        'app': 'btnFilterLaunchApps' + prefix, 
        'folder': 'btnFilterLaunchFolders' + prefix,
        'url': 'btnFilterLaunchUrls' + prefix,
        'maps': 'btnFilterLaunchMaps' + prefix,
        'documentos': 'btnFilterLaunchDocs' + prefix
    };

    Object.values(btnMap).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove('active', 'btn-primary');
            if (id === btnMap[filter]) btn.classList.add('active', 'btn-primary');
        }
    });

    const searchId = target === 'tab' ? 'launchPadSearch_Tab' : 'launchPadSearch';
    const query = document.getElementById(searchId)?.value || '';
    window.renderLaunchPad(query, filter, target);
};

window.renderLaunchPad = async (query = '', filter = 'app', target = 'modal') => {
    const gridId = target === 'tab' ? 'launchPadGrid_Tab' : 'launchPadGrid';
    const container = document.getElementById(gridId);
    if (!container) return;
    
    window._currentLaunchPadFilter = filter;
    window._launchPadOffset = 0; // Reiniciar paginación

    let baseApps = APP_CONFIG.SYSTEM?.LAUNCHERS || [];
    
    // 1. Filtrar Lanzadores Base por Categoría
    let filteredLaunchers = baseApps;
    if (filter !== 'all') {
        filteredLaunchers = baseApps.filter(a => {
            // Inferencia robusta de tipo (Override para corregir configs legacy)
            let type = a.type;
            
            // 1. Detección de URL (robusta)
            const isHttp = (a.url && a.url.startsWith('http')) || (a.path && a.path.startsWith('http'));
            
            if (isHttp && type !== 'maps' && type !== 'spotify' && type !== 'video') {
                type = 'url';
            } 
            // 2. Detección de Carpeta (solo si no es URL ni ejecutable)
            else if (a.path && !isHttp && !a.path.match(/\.(exe|lnk|bat|cmd|msi)$/i) && type !== 'documentos' && type !== 'maps' && type !== 'video') {
                type = 'folder';
            }
            
            // Si no tiene nada definido y no es carpeta/url, es app por descarte
            if (!type) type = 'app';

            if (filter === 'documentos') return type === 'documentos';
            if (filter === 'video') return type === 'video';
            if (filter === 'spotify') return type === 'spotify';
            if (filter === 'maps') return type === 'maps';
            
            // Mapas NO deben incluirse en URL si queremos que tengan su propia pestaña
            if (filter === 'url' && type === 'maps') return false; 
            
            return type === filter;
        });
    }

    // 2. LÓGICA ESPECIAL PARA AGREGAR DOCUMENTOS
    let aggregatedItems = [];
    if (filter === 'documentos') {
        const folderLaunchers = filteredLaunchers.filter(a => {
            const p = (a.path || '').toLowerCase();
            const docExts = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls', '.odt', '.rtf'];
            return !docExts.some(ext => p.endsWith(ext)); 
        });

        const directFiles = filteredLaunchers.filter(a => !folderLaunchers.includes(a));
        aggregatedItems = [...directFiles];

        if (folderLaunchers.length > 0) {
            const loaderId = 'docs-loading-indicator-' + target;
            container.innerHTML = `<div id="${loaderId}" class="col-12 text-center py-5"><div class="spinner-border text-info"></div><div class="mt-2 text-muted">Explorando documentos...</div></div>`;
            
            try {
                const data = await Api.post('/system/list-docs', {
                    folderPaths: folderLaunchers.map(f => f.path)
                });
                
                if (data && data.documents) {
                    aggregatedItems = [...aggregatedItems, ...data.documents];
                    
                    // Ordenar documentos por fecha de modificación (más recientes primero)
                    aggregatedItems.sort((a, b) => {
                        const dateA = new Date(a.mtime || 0);
                        const dateB = new Date(b.mtime || 0);
                        return dateB - dateA;
                    });
                }
            } catch (err) { 
                console.error("Error scan:", err); 
                Ui.showToast("Error al explorar documentos", "danger");
            }
        }
    } else {
        aggregatedItems = filteredLaunchers;
    }

    // 3. Filtrar por Búsqueda
    if (query) {
        const q = query.toLowerCase().trim();
        aggregatedItems = aggregatedItems.filter(a => 
            (a.label || '').toLowerCase().includes(q) || 
            (a.path && a.path.toLowerCase().includes(q))
        );
    }

    window._launchPadCurrentItems = aggregatedItems;
    window._launchPadOffset = window._launchPadLimit;
    
    container.innerHTML = '';
    renderGridItems(container, aggregatedItems.slice(0, window._launchPadLimit), query);

    // Añadir botón "Cargar más" si hay más items
    if (aggregatedItems.length > window._launchPadLimit) {
        container.insertAdjacentHTML('afterend', `<div id="load-more-btn-container" class="col-12 text-center py-3"><button class="btn btn-sm btn-outline-secondary" onclick="loadMoreLaunchPad('${gridId}')">Cargar más resultados...</button></div>`);
    } else {
        document.getElementById('load-more-btn-container')?.remove();
    }
};

window.loadMoreLaunchPad = (gridId) => {
    const container = document.getElementById(gridId);
    const nextItems = window._launchPadCurrentItems.slice(window._launchPadOffset, window._launchPadOffset + window._launchPadLimit);
    if (nextItems.length > 0) {
        renderGridItems(container, nextItems, '', true);
        window._launchPadOffset += window._launchPadLimit;
    }
    if (window._launchPadOffset >= window._launchPadCurrentItems.length) {
        document.getElementById('load-more-btn-container')?.remove();
    }
};

// Helper interno para renderizar los items en el grid
function renderGridItems(container, items, query = '', append = false) {
    if (!append) {
        container.innerHTML = '';
        document.getElementById('load-more-btn-container')?.remove();
    }

    if (items.length === 0 && !append) {
        container.innerHTML = `<div class="col-12 text-center py-5"><i class="bi bi-search fs-1 text-muted mb-2 d-block"></i><div class="text-muted">No hay resultados.</div></div>`;
        return;
    }

    items.forEach(app => {
        const isImage = app.icon && (app.icon.startsWith('data:') || app.icon.includes('.') || app.icon.includes('/'));
        const isFolder = app.type === 'folder';
        const isUrl = app.type === 'url' || app.type === 'maps';
        const isDoc = app.type === 'documentos';
        const isVideo = app.type === 'video';
        const isSpotify = app.type === 'spotify';
        const isEmbedded = app.embedded === true || app.embedded === 'true'; // Handle potential string from config
        const pathStr = (app.path || '').replace(/\\/g, '\\\\');
        
        let iconColor = 'text-primary';
        if (isFolder) iconColor = 'text-warning';
        if (app.type === 'maps') iconColor = 'text-danger';
        if (isUrl && app.type !== 'maps') iconColor = 'text-success';
        if (isVideo) iconColor = 'text-danger';
        if (isSpotify) iconColor = 'text-success';

        const defaultIcon = isFolder ? 'folder-fill' : (app.type === 'maps' ? 'geo-alt-fill' : (isUrl ? 'globe-americas' : (isDoc ? 'file-earmark-text' : (isSpotify ? 'spotify' : 'app'))));
        let specificIcon = app.icon || defaultIcon;

        // LÓGICA DE ICONOS Y COLORES PARA DOCUMENTOS
        if (isDoc) {
            const pathForExt = (app.path || '').toLowerCase();
            if (pathForExt.endsWith('.pdf')) {
                iconColor = 'text-danger'; // Rojo para PDF
                specificIcon = 'file-earmark-pdf';
            } else if (pathForExt.match(/\.(doc|docx|odt|rtf)$/)) {
                iconColor = 'text-primary'; // Azul para Word
                specificIcon = 'file-earmark-word';
            } else if (pathForExt.match(/\.(xls|xlsx)$/)) {
                iconColor = 'text-success'; // Verde para Excel
                specificIcon = 'file-earmark-excel';
            } else if (pathForExt.endsWith('.txt')) {
                iconColor = 'text-secondary'; // Gris para Notas
                specificIcon = 'file-earmark-font';
            } else {
                iconColor = 'text-info'; // Color por defecto para otros docs
            }
        }

        let thumbnailHtml = '';
        if (isVideo) {
            const ytId = window.getYouTubeId(app.path);
            if (ytId) {
                thumbnailHtml = `<img src="https://img.youtube.com/vi/${ytId}/mqdefault.jpg" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px;" class="mb-2 shadow-sm">`;
            }
        }

        const iconHtml = thumbnailHtml || (isImage 
            ? `<img src="${app.icon}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 12px;" class="mb-2 shadow-sm">`
            : `<div class="mb-2 ${iconColor} text-center"><i class="bi bi-${specificIcon} fs-1"></i></div>`);

        let clickHandler = `window.launchExternalApp('${pathStr}', '${app.type || 'app'}', '${app.label.replace(/'/g, "\\'")}', ${isEmbedded})`;
        if (isVideo && isEmbedded) clickHandler = `window.playVideo('${pathStr}', '${app.label.replace(/'/g, "\\'")}')`;

        container.insertAdjacentHTML('beforeend', `
        <div class="col-6 col-md-4 col-lg-2 animate__animated animate__fadeIn">
            <div class="card h-100 border-0 shadow-sm hover-scale text-center p-3" 
                 style="cursor:pointer;" onclick="${clickHandler}">
                <div class="position-absolute top-0 end-0 p-2 opacity-50">
                    <i class="bi bi-${isFolder ? 'folder-symlink' : (isUrl ? 'globe' : (isDoc ? 'file-earmark' : (isVideo ? 'play-circle' : (isSpotify ? 'spotify' : 'cpu-fill'))))} small"></i>
                </div>
                <div class="d-flex justify-content-center w-100">${iconHtml}</div>
                <div class="fw-bold text-dark small text-truncate mt-1">${app.label}</div>
                <div class="text-muted" style="font-size: 0.6rem;">${isFolder ? 'Carpeta' : (app.type === 'maps' ? 'Mapas' : (isUrl ? 'URL Web' : (isDoc ? 'Archivo' : (isVideo ? 'Video YouTube' : (isSpotify ? 'Spotify' : 'App')))))}</div>
            </div>
        </div>`);
    });
}

/**
 * EJECUTAR APP EXTERNA O ABRIR URL
 */
window.launchExternalApp = async (command, type = 'app', label = '', embedded = false) => {
    // Si es una URL o el comando parece una URL
    if (type === 'url' || type === 'maps' || type === 'video' || type === 'spotify' || command.startsWith('http')) {
        if (embedded) {
            // Usamos el proxy por defecto si es embebido para evitar bloqueos
            window.openWebViewer(command, label || 'Acceso Externo', true);
        } else {
            window.open(command, '_blank');
        }
        return;
    }

    // Validación para evitar errores 400 por comandos vacíos
    if (!command || command.trim() === "") {
        console.warn(`[Launcher] Intento de lanzar comando vacío para: "${label}"`);
        Ui.showToast(`El lanzador "${label}" no tiene una ruta configurada.`, "warning");
        return;
    }

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
    
    // FIX: El usuario quiere que el título "Resumen del Día" esté SIEMPRE visible.
    // Eliminamos la lógica que oculta la sección completa si no hay items.
    section.classList.remove('d-none');
    
    // Opcional: Podríamos mostrar un mensaje de "Todo al día" aquí si quisiéramos,
    // pero por ahora solo aseguramos que la sección y su título permanezcan visibles.
    section.classList.remove('d-none');
};

/**
 * YOUTUBE HELPERS
 */
window.getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

window.playVideo = (url, title) => {
    const videoId = window.getYouTubeId(url);
    if (!videoId) {
        Ui.showToast("No se pudo identificar el ID del video de YouTube", "warning");
        return;
    }

    const iframe = document.getElementById('youtubeIframe');
    const titleEl = document.getElementById('youtubePlayerTitle');
    
    if (iframe) iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    if (titleEl) titleEl.textContent = title;

    const modal = new bootstrap.Modal(document.getElementById('youtubePlayerModal'));
    modal.show();
};

window.stopYouTubeVideo = () => {
    const iframe = document.getElementById('youtubeIframe');
    if (iframe) iframe.src = '';
};

/**
 * WEB VIEWER HELPERS
 */
window._currentWebUrl = '';

window.openWebViewer = (url, title, useProxy = true) => {
    const iframe = document.getElementById('webViewerIframe');
    const titleEl = document.getElementById('webViewerTitle');
    
    window._currentWebUrl = url;
    
    // Si useProxy es true, pasamos la URL por nuestro proxy para evitar bloqueos CSP/X-Frame
    const finalUrl = useProxy ? `/api/system/web-proxy?url=${encodeURIComponent(url)}` : url;
    
    if (iframe) iframe.src = finalUrl;
    if (titleEl) titleEl.textContent = title;

    const modal = new bootstrap.Modal(document.getElementById('webViewerModal'));
    modal.show();
};

window.openExternalWeb = () => {
    if (window._currentWebUrl) {
        window.open(window._currentWebUrl, '_blank');
    }
};
