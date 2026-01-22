import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { despertadorService } from '../services/DespertadorService.js';
import { sessionService } from '../services/SessionService.js';

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
                    </div>
                    <div class="modal-body text-center p-4">
                        <div class="display-1 text-danger mb-3"><i class="bi bi-bell-fill"></i></div>
                        <h2 class="fw-bold mb-3" id="alarma-hora-display">--:--</h2>
                        <div class="text-start bg-light p-3 rounded border" id="alarma-lista-display" style="max-height: 300px; overflow-y: auto;"></div>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button type="button" class="btn btn-danger btn-lg fw-bold px-5" data-bs-dismiss="modal"><i class="bi bi-check-lg me-2"></i>ENTENDIDO, APAGAR</button>
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
                <button onclick="prepararEdicionDespertador('${data.habitacion}')" class="btn btn-sm btn-outline-primary border-0 me-1" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button onclick="eliminarDespertador('${data.habitacion}')" class="btn btn-sm btn-outline-success border-0" title="Marcar como hecho">
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
                 title="${data ? 'Despertador: ' + data.hora + (data.comentario ? ' - ' + data.comentario : '') : 'Sin programar'}">
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

// ============================================================================
// VERIFICADOR DE ALARMAS
// ============================================================================

function verificarAlarmas() {
    try {
        const ahora = new Date();
        const horaActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;

        if (horaActual === ultimoMinutoProcesado) return;

        const despertadores = despertadorService.getDespertadores();
        const habitacionesAlerta = [];

        despertadores.forEach(d => {
            if (d.hora === horaActual) {
                habitacionesAlerta.push(`• Habitación ${d.habitacion}${d.comentario ? ' (' + d.comentario + ')' : ''}`);
            }
        });

        if (APP_CONFIG.HOTEL?.ALARMAS_SISTEMA) {
            APP_CONFIG.HOTEL.ALARMAS_SISTEMA.forEach(alarma => {
                if (alarma.hora === horaActual) {
                    habitacionesAlerta.push(`⚠️ TAREA DE SISTEMA: ${alarma.mensaje}`);
                }
            });
        }

        if (habitacionesAlerta.length > 0) {
            ultimoMinutoProcesado = horaActual;
            lanzarAlarma(habitacionesAlerta, horaActual);
        }
    } catch (error) {
        console.error("Error silencioso en el verificador de alarmas:", error);
    }
}

function lanzarAlarma(lista, hora) {
    alarmaAudio.currentTime = 0;
    alarmaAudio.play().catch(err => console.error("Error audio:", err));

    const modalEl = document.getElementById('modalAlarmaDespertador');
    if (modalEl && typeof bootstrap !== 'undefined') {
        document.getElementById('alarma-hora-display').innerText = hora;
        document.getElementById('alarma-lista-display').innerHTML = lista.map(t => `<div class="mb-2 pb-2 border-bottom border-secondary border-opacity-25 fw-bold">${t}</div>`).join('');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    } else {
        setTimeout(() => {
            alert("⏰ ¡ATENCIÓN: DESPERTADORES!\n\nHora: " + hora + "\n\nLlamar a:\n" + lista.join('\n'));
            alarmaAudio.pause();
        }, 100);
    }
}

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
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