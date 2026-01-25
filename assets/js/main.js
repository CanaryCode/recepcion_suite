import { inicializarAgenda } from './modules/agenda.js';
import { inicializarCaja } from './modules/caja.js';
import { inicializarCobro } from './modules/cobro.js';
import { inicializarAtenciones } from './modules/atenciones.js';
import { inicializarSafe } from './modules/safe.js';
import { inicializarDespertadores } from './modules/despertadores.js';
import { inicializarDesayuno } from './modules/desayuno.js';
import { inicializarEstancia } from './modules/estancia.js';
import { inicializarNovedades } from './modules/novedades.js';
import { inicializarCenaFria } from './modules/cena_fria.js';
import { inicializarRiu } from './modules/riu.js';
import { inicializarAyuda } from './modules/ayuda.js';
import { inicializarNotasPermanentes } from './modules/notas_permanentes.js';
import { inicializarPrecios } from './modules/precios.js';
import { inicializarSystemAlarms } from './modules/alarms.js';
import { inicializarSystemAlarmsUI } from './modules/system_alarms_ui.js';
import { inicializarRack } from './modules/rack.js';

// Core Systems
import { APP_CONFIG } from './core/Config.js'; // Importar APP_CONFIG
import { Modal } from './core/Modal.js';
import { Router } from './core/Router.js';
import { CompLoader } from './core/CompLoader.js';
import { Search } from './core/Search.js';
import { sessionService } from './services/SessionService.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 0. DIAGNÓSTICO DE STORAGE (CRÍTICO)
    try {
        const testKey = '__test_storage__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
    } catch (e) {
        console.error("Critical Storage Error:", e);
        alert("\u26A0\uFE0F ERROR CR\u00CDTICO: El sistema no puede guardar datos.\n\nEsto ocurre si:\n1. Est\u00E1s abriendo el archivo directamente (doble clic) en un navegador seguro como Chrome.\n2. Est\u00E1s en modo 'Inc\u00F3gnito' estricto.\n3. El almacenamiento est\u00E1 lleno.\n\nSOLUCI\u00D3N: Usa Microsoft Edge, Firefox, o instala la extensi\u00F3n 'Live Server' en VSCode.");
    }

    // 1. Inicializar Sistemas Core
    Modal.init();
    Router.init();
    Search.init();

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
        { id: 'notas-content', path: 'assets/templates/notas_permanentes.html' },
        { id: 'precios-content', path: 'assets/templates/precios.html' },
        { id: 'system-alarms-content', path: 'assets/templates/system_alarms.html' },
        { id: 'rack-content', path: 'assets/templates/rack.html' }
    ];

    // 3. Cargar plantillas
    await CompLoader.loadAll(componentes);

    // 4. Configurar Fechas por defecto (Delegado a los módulos)
    // Se ha movido la lógica específica a los módulos correspondientes (Estancia, RIU, etc)
    // para mantener main.js limpio y agnóstico.

    // 5. Inicialización Escalonada para mayor rapidez inicial
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
        { nombre: 'Riu', init: inicializarRiu },
        { nombre: 'Ayuda', init: inicializarAyuda },
        { nombre: 'Notas Permanentes', init: inicializarNotasPermanentes },
        { nombre: 'Precios', init: inicializarPrecios },
        { nombre: 'Rack', init: inicializarRack }
    ];

    // Cargar prioritarios inmediatamente
    modulosPrioritarios.forEach(m => {
        try { m.init(); } catch (e) { console.error(`Error en ${m.nombre}:`, e); }
    });

    // Cargar secundarios en el siguiente tick
    setTimeout(() => {
        modulosSecundarios.forEach(m => {
            try { m.init(); } catch (e) { console.error(`Error en ${m.nombre}:`, e); }
        });
        
        // 6. Inicializar Gestión de Sesión Global
        inicializarSesionGlobal();
        
        // 7. Inicializar Tooltips
        initGlobalTooltips();
        
        // 8. NUCLEAR FIX: Limpieza forzada del buscador
        // Asegura que no quede rastros de "-2000" por caché o scripts rogue
        const cleanSearch = () => {
            const s = document.getElementById('appGlobalSearchInput'); 
            if(s) { s.value = ''; }
        };
        setTimeout(cleanSearch, 200);
        setTimeout(cleanSearch, 800);
        setTimeout(cleanSearch, 2000);

        console.log("Sistema completamente inicializado.");
    }, 100);
});

function inicializarSesionGlobal() {
    const userList = document.getElementById('globalUserList');
    const userBtnName = document.getElementById('globalUserName');
    const userBtn = document.getElementById('globalUserBtn');

    if (!userList || !userBtnName) return;

    // 1. Cargar usuarios del config
    const users = APP_CONFIG.HOTEL.RECEPCIONISTAS;
    // Insertar antes del divisor
    const divider = userList.querySelector('hr.dropdown-divider').parentElement;

    users.forEach(u => {
        const li = document.createElement('li');
        li.innerHTML = `<button class="dropdown-item" onclick="window.setGlobalUser('${u}')">${u}</button>`;
        userList.insertBefore(li, divider);
    });

    // Añadir opción "Otro"
    const liOtro = document.createElement('li');
    liOtro.innerHTML = `<button class="dropdown-item" onclick="window.promptGlobalUser()">Otro...</button>`;
    userList.insertBefore(liOtro, divider);

    // 2. Restaurar sesión
    const currentUser = sessionService.getUser();
    if (currentUser) {
        updateUserUI(currentUser);
    } else {
        // Si no hay usuario, forzar selección o mostrar alerta visual
        userBtn.classList.remove('btn-outline-secondary');
        userBtn.classList.add('btn-outline-danger', 'animation-pulse');
    }

    // 3. Exponer funciones globales
    window.setGlobalUser = (name) => {
        sessionService.setUser(name);
        updateUserUI(name);
        userBtn.classList.remove('btn-outline-danger', 'animation-pulse');
        userBtn.classList.add('btn-outline-secondary');
    };

    // Injectar Modal de Usuario 'Otro'
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
                            <label class="form-label small fw-bold text-muted">Escribe tu nombre</label>
                            <input type="text" id="inputGlobalUser" class="form-control form-control-lg fw-bold text-center" placeholder="Ej: Jesús, Ana...">
                        </div>
                        <div class="modal-footer border-0 pt-0">
                            <button type="button" class="btn btn-primary w-100 fw-bold" onclick="window.confirmGlobalUser()">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalDiv);

        // Enter key support
        document.getElementById('inputGlobalUser').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.confirmGlobalUser();
        });
    }

    window.promptGlobalUser = () => {
        const input = document.getElementById('inputGlobalUser');
        if (input) input.value = '';
        const modal = new bootstrap.Modal(document.getElementById('modalGlobalUser'));
        modal.show();
        setTimeout(() => input?.focus(), 500);
    };

    window.confirmGlobalUser = () => {
        const name = document.getElementById('inputGlobalUser').value;
        if (name && name.trim()) {
            window.setGlobalUser(name.trim());
            const modalEl = document.getElementById('modalGlobalUser');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        }
    };

    window.logoutGlobal = () => {
        sessionService.logout();
        userBtnName.innerText = "Seleccionar Usuario";
        userBtn.classList.remove('btn-outline-primary', 'btn-success');
        userBtn.classList.add('btn-outline-danger');
        location.reload(); // Recargar para limpiar estados de módulos si es necesario
    };
    // 5. Exponer Restauración de Agenda
    // 5. Exponer Utilidad de Respaldo Forzoso
    window.ejecutarRespaldoManual = async () => {
        const confirmed = await Modal.showConfirm("¿Quieres forzar el envío de TODOS los datos al servidor de respaldo?<br><br><small class='text-muted'>Esto actualizará la copia de seguridad con lo que tienes en pantalla ahora mismo.</small>");
        if (!confirmed) return;
        
        // Visual feedback
        const userBtn = document.getElementById('globalUserBtn');
        const userNameSpan = document.getElementById('globalUserName');
        const originalText = userNameSpan.innerHTML;
        const originalIcon = userBtn.querySelector('i').className;
        
        // Change Icon to Spinner
        userBtn.querySelector('i').className = "spinner-border spinner-border-sm me-1";
        userNameSpan.innerText = "Respaldando...";
        userBtn.classList.add('disabled');

        try {
            // Dynamic import
            const { backupService } = await import('./services/BackupService.js');
            const result = await backupService.performFullBackup();
            
            let msg = `✅ <strong>Respaldo Completado</strong><br><br>Se han procesado ${result.success.length} módulos correctamente.`;
            let type = 'success';
            
            if (result.error.length > 0) {
                msg += `<br><br>⚠️ <strong>Atención:</strong> ${result.error.length} módulos fallaron (Mira la consola).`;
                type = 'warning';
            }
            
            await Modal.showAlert(msg, type);
            
        } catch (e) {
            console.error("Backup error:", e);
            await Modal.showAlert(`❌ <strong>Error Crítico</strong><br>${e.message}`, 'error');
        } finally {
            // Restore UI
            userBtn.querySelector('i').className = originalIcon;
            userNameSpan.innerHTML = originalText;
            userBtn.classList.remove('disabled');
        }
    };

    // 6. Exponer Restauración de Agenda (Corrección)
    window.ejecutarRestauracionAgenda = async () => {
        const confirmed = await Modal.showConfirm("¿Quieres buscar y recuperar contactos originales perdidos?<br><br>🛡️ <strong>Modo Seguro:</strong> Esto NO borrará los contactos que tú hayas añadido. Solo rellenará los huecos si falta alguno de la lista original.");
        if (!confirmed) return;

        const userBtn = document.getElementById('globalUserBtn');
        // Simple spinner feedback (reuse logic if possible, simplified here)
        userBtn.querySelector('i').className = "spinner-border spinner-border-sm me-1";
        
        try {
            const { agendaService } = await import('./services/AgendaService.js');
            const { RAW_AGENDA_DATA } = await import('./data/AgendaData.js'); 
            
            // Llamamos al método de recuperación inteligente
            await agendaService.restaurarAgendaForzada();
            // El propio servicio importador maneja el reload si hay exito, 
            // pero si no hace reload (ej: lista vacia), necesitamos quitar el spinner
            
        } catch (e) {
            console.error(e);
            await Modal.showAlert(`❌ Error al recuperar: ${e.message}`, "error");
            // location.reload(); // Quitamos reload forzoso en error para ver el mensaje
        } finally {
             // Restore UI (Important if no reload happens)
             userBtn.querySelector('i').className = "bi bi-person-circle me-1";
        }
    };

    // 6. Configuración Centralizada de Tooltips
    window.initTooltips = (container = document.body) => {
        const selector = '[data-bs-toggle="tooltip"], .custom-tooltip, [data-tooltip="true"]';
        // Handle trigger itself
        if (container.matches && container.matches(selector)) {
             initSingleTooltip(container);
        }
        // Handle children
        if (container.querySelectorAll) {
            container.querySelectorAll(selector).forEach(el => initSingleTooltip(el));
        }
    };

    function initSingleTooltip(el) {
        const instance = bootstrap.Tooltip.getInstance(el);
        const desiredDelay = { show: 700, hide: 100 };
        
        if (instance) {
            // Check if delay is correct. Accessing private config is risky, 
            // but we can just dispose and recreate to be safe if we want to enforce it strict.
            // Or only if we suspect it's wrong. 
            // Let's go aggressive: Dispose ensuring our config wins.
            // But checking instance._config.delay might be possible if we needed optimization.
            instance.dispose();
        }
        
        new bootstrap.Tooltip(el, {
            trigger: 'hover',
            container: 'body', // Force body to avoid clipping in navbars/modals
            delay: desiredDelay,
            html: true,
            placement: el.dataset.bsPlacement || 'top'
        });
    }
}

// Inicializar Tooltips Globalmente (Observer para contenido dinámico)
function initGlobalTooltips() {
    // Initial load
    window.initTooltips(document.body);

    // Observer
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                         window.initTooltips(node);
                    }
                });
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
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

// Global Navigation Helper
window.navegarA = (tabSelector) => {
    // 1. Activate Tab
    const triggerEl = document.querySelector(`button[data-bs-target="${tabSelector}"]`);
    if (triggerEl) {
        const tab = new bootstrap.Tab(triggerEl);
        tab.show();
    } else {
        console.warn(`navegarA: No tab trigger found for selector ${tabSelector}`);
        // Fallback: try to find the tab pane directly and add class
        const tabPane = document.querySelector(tabSelector);
        if (tabPane) {
            // This is a rough fallback, better to use the trigger
            tabPane.classList.add('show', 'active');
        }
    }
};