// --- IMPORTACIÓN DE MÓDULOS OPERATIVOS ---
// Cada módulo gestiona una funcionalidad específica (Agenda, Caja, etc.)
import { inicializarAgenda } from './modules/agenda.js';
import { inicializarCaja } from './modules/caja.js';
import { inicializarCobro } from './modules/cobro.js';
import { Ui } from './core/Ui.js'; // Import Ui FIRST

import { clock } from './modules/clock.js';
import { inicializarAtenciones } from './modules/atenciones.js';
import { inicializarSafe } from './modules/safe.js';
import { inicializarDespertadores } from './modules/despertadores.js';
import { inicializarDesayuno } from './modules/desayuno.js';
import { inicializarEstancia } from './modules/estancia.js';
import { inicializarNovedades } from './modules/novedades.js';
import { inicializarCenaFria } from './modules/cena_fria.js';
import { inicializarRiu } from './modules/riu.js';
import { inicializarAyuda } from './modules/ayuda.js';
import { inicializarTransfers } from './modules/transfers.js';
import { inicializarNotasPermanentes } from './modules/notas_permanentes.js';
import { inicializarPrecios } from './modules/precios.js';
import { inicializarSystemAlarms } from './modules/alarms.js';
import { inicializarSystemAlarmsUI } from './modules/system_alarms_ui.js';
import { inicializarRack } from './modules/rack.js';
import { inicializarConfiguracion } from './modules/configuracion.js';

// --- SISTEMAS CORE (NÚCLEO) ---
import { APP_CONFIG, Config } from './core/Config.js'; // Cargador de configuración
import { Modal } from './core/Modal.js';              // Gestor de ventanas modales
import { Router } from './core/Router.js';            // Gestor de navegación entre pestañas
import { CompLoader } from './core/CompLoader.js';    // Cargador dinámico de plantillas HTML
import { Search } from './core/Search.js';            // Buscador global de módulos
import { sessionService } from './services/SessionService.js'; // Gestor de usuario logueado
import { Utils } from './core/Utils.js';              // Utilidades generales (formateo, etc.)

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
        { nombre: 'Configuración', init: inicializarConfiguracion }
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
        initGlobalTooltips();      // Activa las ayudas flotantes (Tooltips)
        
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
        alert(`FALLO ARRANQUE: ${criticalError.message}\nVer consola para más detalles.`);
    }
});

// MODAL LAUNCHER FUNCTION
/**
 * LANZADOR DE APLICACIONES (LaunchPad)
 * Genera dinámicamente el modal con los iconos de las herramientas externas (Word, Excel, etc.)
 */
window.openLaunchPad = () => {
    const container = document.getElementById('launchPadGrid');
    if (!container) return;
    
    container.innerHTML = '';
    const apps = APP_CONFIG.SYSTEM?.LAUNCHERS || [];
    
    if (apps.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted">No hay aplicaciones configuradas.</div>';
    } else {
        apps.forEach(app => {
            container.innerHTML += `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="card h-100 border-0 shadow-sm hover-scale text-center p-3" 
                     style="cursor:pointer;" onclick="window.launchExternalApp('${app.path.replace(/\\/g, '\\\\')}')">
                    <div class="mb-2 text-primary"><i class="bi bi-${app.icon || 'app'} fs-1"></i></div>
                    <div class="fw-bold text-dark small text-truncate">${app.label}</div>
                </div>
            </div>
            `;
        });
    }

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('launchPadModal'));
    modal.show();
};

// Global Launcher Function
/**
 * EJECUTAR APP EXTERNA
 * Se comunica con el servidor local para pedirle que abra un programa en Windows.
 */
window.launchExternalApp = async (command) => {
    try {
        const response = await fetch('/api/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        
        if (!response.ok) throw new Error('Server error');
        console.log("Programa iniciado:", command);
        
    } catch (e) {
        console.error("Fallo al lanzar:", e);
        alert("Error al lanzar aplicación. El servidor Node.js no responde.");
    }
};

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
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGlobalUser'));
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
        const desiredDelay = { show: 700, hide: 100 };
        
        // Use getOrCreateInstance to prevent "instance already exists" errors
        bootstrap.Tooltip.getOrCreateInstance(el, {
            trigger: 'hover',
            container: 'body', 
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



/**
 * CONTROL DE VISIBILIDAD DEL DASHBOARD
 * Verifica si alguno de los módulos del "Resumen del Día" tiene registros activos.
 * Si todos están vacíos (u ocultos), esconde la sección completa para limpiar la UI.
 */
window.checkDailySummaryVisibility = () => {
    const section = document.getElementById('dashboard-resumen-seccion');
    if (!section) return;

    // Buscamos todas las columnas de resumen (dash-col-*)
    const modules = section.querySelectorAll('[id^="dash-col-"]');
    let hasVisibleData = false;

    modules.forEach(mod => {
        if (!mod.classList.contains('d-none')) {
            hasVisibleData = true;
        }
    });

    // Mostramos u ocultamos la sección principal
    if (hasVisibleData) {
        section.classList.remove('d-none');
    } else {
        section.classList.add('d-none');
    }
};