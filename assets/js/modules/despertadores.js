import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { despertadorService } from '../services/DespertadorService.js';
import { sessionService } from '../services/SessionService.js';
import { systemAlarmsService } from '../services/SystemAlarmsService.js';

let checkInterval = null;
let ultimoMinutoProcesado = "";
// Pre-cargamos el audio una sola vez al inicio
const alarmaAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
alarmaAudio.loop = true;

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

export function inicializarDespertadores() {
    const form = document.getElementById('formNuevoDespertador');
    if (form) {
        form.removeEventListener('submit', manejarSubmitDespertador);
        form.addEventListener('submit', manejarSubmitDespertador);
    }

    // Inyectar modal de alarma
    if (!document.getElementById('modalAlarmaDespertador')) {
        crearModalAlarma();
    }

    // Configurar vistas
    document.getElementById('despertadores-trabajo')?.classList.add('content-panel');
    document.getElementById('despertadores-rack')?.classList.add('content-panel');

    document.getElementById('btnVistaTrabajoDesp')?.addEventListener('click', () => cambiarVistaDespertadores('trabajo'));
    document.getElementById('btnVistaRackDesp')?.addEventListener('click', () => cambiarVistaDespertadores('rack'));

    // Navegar a despertadores al pulsar la campana (MODIFICADO: Abrir visor manual)
    // Evento de Campana ELIMINADO de aquí. Ahora lo gestiona alarms.js

    // Poblar datalist de habitaciones
    const datalist = document.getElementById('lista-habs-desp');
    if (datalist) {
        datalist.innerHTML = '';
        Utils.getHabitaciones().forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.num;
            datalist.appendChild(opt);
        });
    }

    mostrarDespertadores();

    // "Desbloquear" el audio
    document.addEventListener('click', () => {
        alarmaAudio.play().then(() => {
            alarmaAudio.pause();
            alarmaAudio.currentTime = 0;
        }).catch(e => { /* Ignorar error de reproducción automática */ });
    }, { once: true });

    // Iniciar verificador
    if (!checkInterval) {
        checkInterval = setInterval(verificarAlarmas, 15000);
    }
}

function crearModalAlarma() {
    const div = document.createElement('div');
    div.innerHTML = `
        <div class="modal fade" id="modalAlarmaDespertador" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" style="z-index: 10000;">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-danger shadow-lg">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title fw-bold"><i class="bi bi-alarm-fill me-2"></i>¡ALARMA DE DESPERTADOR!</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center p-4">
                        <div class="display-1 text-danger mb-3"><i class="bi bi-bell-fill"></i></div>
                        <h2 class="fw-bold mb-3" id="alarma-hora-display">--:--</h2>
                        <div class="text-start bg-light p-3 rounded border" id="alarma-lista-display" style="max-height: 300px; overflow-y: auto;"></div>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button type="button" class="btn btn-secondary btn-lg fw-bold px-5" data-bs-dismiss="modal">CERRAR</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.appendChild(div);
    document.getElementById('modalAlarmaDespertador').addEventListener('hidden.bs.modal', () => {
        alarmaAudio.pause();
        alarmaAudio.currentTime = 0;
    });
}

function cambiarVistaDespertadores(vista) {
    const btnTrabajo = document.getElementById('btnVistaTrabajoDesp');
    const btnRack = document.getElementById('btnVistaRackDesp');
    const divTrabajo = document.getElementById('despertadores-trabajo');
    const divRack = document.getElementById('despertadores-rack');

    if (vista === 'trabajo') {
        btnTrabajo.classList.add('active');
        btnRack.classList.remove('active');
        divTrabajo.classList.remove('d-none');
        divRack.classList.add('d-none');
        mostrarDespertadores();
    } else {
        btnTrabajo.classList.remove('active');
        btnRack.classList.add('active');
        divTrabajo.classList.add('d-none');
        divRack.classList.remove('d-none');
        renderVistaRackDespertadores();
    }
}

// ============================================================================
// HANDLERS
// ============================================================================

function manejarSubmitDespertador(e) {
    e.preventDefault();

    // 1. Validar Usuario
    const autor = Utils.validateUser();
    if (!autor) return;

    // 2. Validar Inputs
    const habNum = document.getElementById('desp_hab').value.trim().padStart(3, '0');
    const hora = document.getElementById('desp_hora').value;
    const comentario = document.getElementById('desp_comentario').value.trim();

    const validHabs = Utils.getHabitaciones().map(h => h.num);
    if (!validHabs.includes(habNum)) {
        alert(`Error: La habitación ${habNum} no existe.`);
        return;
    }

    // 3. Guardar
    despertadorService.saveDespertador({
        habitacion: habNum,
        hora,
        comentario,
        autor
    });

    // 4. Reset
    e.target.reset();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-alarm-fill me-2"></i>Programar';
    mostrarDespertadores();
}

// ============================================================================
// RENDERIZADO
// ============================================================================

function mostrarDespertadores() {
    actualizarEstadoCampana(new Date());
    const despertadores = despertadorService.getDespertadores();

    // Actualizar Dashboard (si existe)
    const dashCol = document.getElementById('dash-col-despertadores');
    const dashTabla = document.getElementById('dash-tabla-despertadores');
    const dashCount = document.getElementById('dash-count-despertadores');

    if (dashCol) dashCol.classList.toggle('d-none', despertadores.length === 0);
    if (dashCount) dashCount.innerText = despertadores.length;

    if (dashTabla) {
        dashTabla.innerHTML = '';
        const sorted = [...despertadores].sort((a, b) => a.hora.localeCompare(b.hora));
        sorted.forEach(d => {
            dashTabla.innerHTML += `
            <tr onclick="irADespertador('${d.habitacion}')" style="cursor: pointer;">
                <td class="fw-bold">${d.habitacion}</td>
                <td class="text-end"><span class="badge bg-warning text-dark">${d.hora}</span></td>
            </tr>`;
        });
    }

    // Tabla Principal
    const tabla = document.getElementById('tablaDespertadoresActivos');
    if (!tabla) return;
    tabla.innerHTML = '';

    const sorted = [...despertadores].sort((a, b) => a.hora.localeCompare(b.hora));
    sorted.forEach(data => {
        tabla.innerHTML += `
        <tr id="desp-row-${data.habitacion}">
            <td class="fw-bold text-primary">${data.habitacion}</td>
            <td><span class="badge bg-warning text-dark fs-6"><i class="bi bi-clock me-1"></i>${data.hora}</span></td>
            <td class="text-muted small">
                ${data.comentario || '-'}
                <div class="text-info mt-1" style="font-size: 0.65rem;">
                    <i class="bi bi-person-fill me-1"></i>${data.autor || 'N/A'}
                </div>
            </td>
            <td class="text-end">
                <button onclick="prepararEdicionDespertador('${data.habitacion}')" class="btn btn-sm btn-outline-primary border-0 me-1"
                        data-bs-toggle="tooltip" data-bs-title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button onclick="eliminarDespertador('${data.habitacion}')" class="btn btn-sm btn-outline-success border-0"
                        data-bs-toggle="tooltip" data-bs-title="Marcar como hecho">
                    <i class="bi bi-check-circle-fill"></i>
                </button>
            </td>
        </tr>`;
    });
}

function renderVistaRackDespertadores() {
    const rackCont = document.getElementById('rack-desp-habitaciones');
    const statsCont = document.getElementById('desp-stats');
    if (!rackCont || !statsCont) return;

    const despertadores = despertadorService.getDespertadores();
    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;

    rackCont.innerHTML = '';
    rangos.forEach(r => {
        const header = document.createElement('div');
        header.className = 'w-100 mt-3 mb-2 d-flex align-items-center';
        header.innerHTML = `<span class="badge bg-secondary me-2">Planta ${r.planta}</span><hr class="flex-grow-1 my-0 opacity-25">`;
        rackCont.appendChild(header);

        for (let i = r.min; i <= r.max; i++) {
            const num = i.toString().padStart(3, '0');
            const data = despertadores.find(d => d.habitacion === num);
            const colorClass = data ? 'bg-warning text-dark' : 'bg-white text-muted border';

            rackCont.innerHTML += `
            <div class="d-flex align-items-center justify-content-center rounded rack-box ${colorClass}" 
                 data-bs-toggle="tooltip" data-bs-title="${data ? 'Despertador: ' + data.hora + (data.comentario ? ' - ' + data.comentario : '') : 'Sin programar'}">
                ${num}
            </div>`;
        }
    });

    statsCont.innerHTML = `
    <div class="col-md-4">
        <div class="p-3 border rounded bg-warning text-dark text-center">
            <div class="small fw-bold opacity-75">LLAMADAS PENDIENTES</div>
            <div class="h3 mb-0 fw-bold">${despertadores.length}</div>
        </div>
    </div>`;
}

function verificarAlarmas() {
    try {
        const ahora = new Date();
        const horaActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;

        if (horaActual === ultimoMinutoProcesado) {
             actualizarEstadoCampana(ahora); 
             return;
        }
        
        actualizarEstadoCampana(ahora); 

        const despertadores = despertadorService.getDespertadores();
        const alertas = [];

        despertadores.forEach(d => {
            if (d.hora === horaActual) {
                alertas.push({
                    type: 'room',
                    id: d.habitacion,
                    text: `Habitación ${d.habitacion}`,
                    subtext: d.comentario || ''
                });
            }
        });

        // SYSTEM ALARMS REMOVED FROM HERE

        if (alertas.length > 0) {
            ultimoMinutoProcesado = horaActual;
            lanzarAlarma(alertas, horaActual, true); // Play sound = true
        }
    } catch (error) {
        console.error("Error silencioso en el verificador de alarmas:", error);
    }
}

function lanzarAlarma(lista, hora, playSound = false) {
    alarmaAudio.currentTime = 0;
    if (playSound) {
        alarmaAudio.play().catch(err => console.error("Error audio:", err));
    }

    const modalEl = document.getElementById('modalAlarmaDespertador');
    if (modalEl && typeof bootstrap !== 'undefined') {
        document.getElementById('alarma-hora-display').innerText = hora;
        
        const container = document.getElementById('alarma-lista-display');
        container.innerHTML = lista.map(item => `
            <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-secondary border-opacity-25" id="alarm-item-${item.id}">
                <div class="text-start">
                    <div class="fw-bold fs-5">${item.text}</div>
                    ${item.subtext ? `<div class="small text-muted">${item.subtext}</div>` : ''}
                    <div class="small fw-bold text-primary">${item.horaStr || ''}</div> 
                </div>
                <div>
                    ${item.type === 'room' ? `
                    <button class="btn btn-sm btn-outline-danger me-1" onclick="borrarAlarmaDesdeModal('${item.id}')" title="Borrar Definitivamente">
                        <i class="bi bi-trash"></i>
                    </button>
                    ` : ''}
                    <button class="btn btn-success" onclick="atenderAlarma('${item.id}')" title="Marcar como atendida (Solo hoy)">
                        <i class="bi bi-check-lg"></i>
                    </button>
                </div>
            </div>
        `).join('');

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    } else {
        setTimeout(() => {
            const textos = lista.map(i => i.text + (i.subtext ? ` (${i.subtext})` : ''));
            alert("⏰ Alarmas Pendientes:\n\n" + textos.join('\n'));
        }, 100);
    }
}

function abrirVisorAlarmasManual() {
    const ahora = new Date();
    const ahoraMins = (ahora.getHours() * 60) + ahora.getMinutes();
    const despertadores = despertadorService.getDespertadores();
    
    // Buscar PENDIENTES (Futuras hoy)
    const pendientes = [];
    
    despertadores.forEach(d => {
        const parts = d.hora.split(':');
        const dMins = (parseInt(parts[0]) * 60) + parseInt(parts[1]);
        if (dMins > ahoraMins) {
            pendientes.push({
               type: 'room',
               id: d.habitacion,
               text: `Habitación ${d.habitacion}`,
               subtext: d.comentario || '',
               horaStr: d.hora
            });
        }
    });

    pendientes.sort((a, b) => a.horaStr.localeCompare(b.horaStr));

    // SYSTEM ALARMS REMOVED (Separation of concerns)

    if (pendientes.length > 0) {
        lanzarAlarma(pendientes, "PENDIENTES HOY", false); // No sound
    } else {
        // Si no hay pendientes, ir al módulo completo para ver todo o crear nuevas
        if (window.navegarA) window.navegarA('#despertadores-content');
        cambiarVistaDespertadores('trabajo');
        mostrarDespertadores();
    }
}

window.atenderAlarma = (id) => {
    const el = document.getElementById(`alarm-item-${id}`);
    if (el) {
        el.classList.add('opacity-25', 'text-decoration-line-through');
        const btns = el.querySelectorAll('button');
        btns.forEach(b => b.disabled = true);
        
        // Comprobar si quedan pendientes visualmente
        const container = document.getElementById('alarma-lista-display');
        const pendientes = container.querySelectorAll('div[id^="alarm-item-"]:not(.opacity-25)');
        if (pendientes.length === 0) {
            // Opcional: Cerrar modal automáticamente o dejar que el usuario lo cierre con el botón grande
            // setTimeout(() => {
            //     const modalEl = document.getElementById('modalAlarmaDespertador');
            //     const modal = bootstrap.Modal.getInstance(modalEl);
            //     modal.hide();
            // }, 1000);
        }
    }
};

window.borrarAlarmaDesdeModal = async (hab) => {
    if (await window.showConfirm("¿Eliminar esta alarma permanentemente? Ya no sonará mañana.")) {
        despertadorService.removeDespertador(hab);
        atenderAlarma(hab); // Visualmente marcar como hecho
        mostrarDespertadores(); // Actualizar tabla de fondo
    }
};

// ============================================================================
// ACCIONES GLOBALES
// ============================================================================

function imprimirDespertadores() {
    const user = Utils.validateUser();
    if (!user) return;
    Utils.printSection('print-date-desp', 'print-repc-nombre-desp', user);
}

window.irADespertador = (hab) => {
    navegarA('#despertadores-content');
    cambiarVistaDespertadores('trabajo');
    setTimeout(() => {
        const row = document.getElementById(`desp-row-${hab}`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('table-warning');
            setTimeout(() => row.classList.remove('table-warning'), 2000);
        }
    }, 100);
};

window.prepararEdicionDespertador = (hab) => {
    const data = despertadorService.getDespertadorByHab(hab);
    if (data) {
        Utils.setVal('desp_hab', hab);
        Utils.setVal('desp_hora', data.hora);
        Utils.setVal('desp_comentario', data.comentario || '');

        const btnSubmit = document.querySelector('#formNuevoDespertador button[type="submit"]');
        if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Actualizar Despertador';

        cambiarVistaDespertadores('trabajo');
        
        // Scroll y Focus mejorado con Highlight
        const formCard = document.querySelector('#despertadores-trabajo .card');
        if (formCard) {
            formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            formCard.classList.add('border-primary', 'border-2');
            setTimeout(() => formCard.classList.remove('border-primary', 'border-2'), 2000);
        }
        document.getElementById('desp_hora')?.focus();
    }
};

window.eliminarDespertador = (hab) => {
    despertadorService.removeDespertador(hab);
    mostrarDespertadores();
};

window.limpiarDespertadoresPasados = async () => {
    if (await window.showConfirm("¿Deseas limpiar todos los despertadores programados?")) {
        despertadorService.clearAll();
        mostrarDespertadores();
    }
};

window.cambiarVistaDespertadores = cambiarVistaDespertadores;
window.imprimirDespertadores = imprimirDespertadores;
window.limpiarDespertadoresPasados = limpiarDespertadoresPasados;

function actualizarEstadoCampana(nowDate) {
    // FUNCIÓN DESHABILITADA: La campana ahora es exclusiva para Alarmas de Sistema.
}