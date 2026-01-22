import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';

let intervalId = null;
const ALARM_CHECK_INTERVAL = 30000; // Check every 30 seconds

export function inicializarSystemAlarms() {
    // 1. Iniciar monitor
    iniciarMonitorAlarmas();

    // 2. Configurar botón de visor (si existe en el DOM)
    const btnVisor = document.getElementById('btnSystemAlarms');
    if (btnVisor) {
        btnVisor.addEventListener('click', mostrarVisorAlarmas);
    }

    // 3. Crear modal de visor si no existe
    crearModalVisor();
}

function iniciarMonitorAlarmas() {
    if (intervalId) clearInterval(intervalId);
    
    // Check inicial
    checkAlarmas();

    intervalId = setInterval(() => {
        checkAlarmas();
    }, ALARM_CHECK_INTERVAL);
}

function checkAlarmas() {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const weekDay = now.getDay(); // 0 = Domingo, 1 = Lunes...

    const alarms = APP_CONFIG.HOTEL.ALARMAS_SISTEMA || [];

    alarms.forEach(alarm => {
        // Verificar días (si no especifica, es todos)
        let activeToday = true;
        if (alarm.dias && Array.isArray(alarm.dias)) {
            activeToday = alarm.dias.includes(weekDay);
        } else if (alarm.dias && alarm.dias !== 'todos') {
            // Soporte futuro para otras opciones
        }

        if (activeToday && alarm.hora === currentTime) {
            triggerAlarm(alarm);
        }
    });
}

function triggerAlarm(alarm) {
    // Evitar disparar múltiples veces en el mismo minuto si ya se mostró
    const lastTrigger = sessionStorage.getItem(`alarm_trigger_${alarm.hora}`);
    const nowStr = new Date().toDateString(); // Validar por día también
    
    // Identificador único por día y hora
    const triggerId = `${nowStr}_${alarm.hora}`;
    
    if (lastTrigger === triggerId) return;

    // Disparar
    sessionStorage.setItem(`alarm_trigger_${alarm.hora}`, triggerId);
    
    // 1. Audio (opcional, necesita interacción previa del usuario)
    try {
        const audio = new Audio('assets/sounds/alarm.mp3'); // Asumimos que existe o fallará silenciosamente
        audio.play().catch(e => console.log("Audio play prevented by browser policy")); 
    } catch (e) {}

    // 2. Visual Alert
    window.showAlert(`⏰ ALARMA: ${alarm.mensaje}`, "warning", 10000); // 10s de duración

    // 3. Actualizar badge del botón
    actualizarBadge(true);
}

function actualizarBadge(active) {
    const badge = document.getElementById('badgeSystemAlarms');
    if (badge) {
        if (active) {
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
    }
}

function mostrarVisorAlarmas() {
    const modalEl = document.getElementById('modalSystemAlarms');
    const modalBody = document.getElementById('modalSystemAlarmsBody');
    if (!modalEl || !modalBody) return;

    // Renderizar alarmas
    const alarmas = APP_CONFIG.HOTEL.ALARMAS_SISTEMA || [];
    if (alarmas.length === 0) {
        modalBody.innerHTML = '<p class="text-muted text-center">No hay alarmas configuradas en el sistema.</p>';
    } else {
        modalBody.innerHTML = '<div class="list-group list-group-flush">';
        alarmas.forEach(a => {
            modalBody.innerHTML += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-primary rounded-pill me-2">${a.hora}</span>
                        <span class="fw-bold text-dark">${a.mensaje}</span>
                    </div>
                    <small class="text-muted">${a.dias === 'todos' || !a.dias ? 'Todos los días' : 'Días específicos'}</small>
                </div>`;
        });
        modalBody.innerHTML += '</div>';
    }
    
    // Limpiar badge al ver
    actualizarBadge(false);

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function crearModalVisor() {
    if (document.getElementById('modalSystemAlarms')) return;

    const div = document.createElement('div');
    div.innerHTML = `
        <div class="modal fade" id="modalSystemAlarms" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-light">
                        <h5 class="modal-title fw-bold text-primary"><i class="bi bi-alarm me-2"></i>Alarmas del Sistema</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-0" id="modalSystemAlarmsBody">
                        <!-- Content -->
                    </div>
                    <div class="modal-footer border-0">
                        <small class="text-muted me-auto">Las alarmas suenan automáticamente a la hora configurada.</small>
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.appendChild(div);
}
