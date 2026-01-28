import { Utils } from '../core/Utils.js';
import { APP_CONFIG } from '../core/Config.js';
import { desayunoService } from '../services/DesayunoService.js';

/**
 * MÓDULO DE DESAYUNOS TEMPRANOS (desayuno.js)
 * ------------------------------------------
 * Gestiona las peticiones de desayuno antes de la apertura del comedor.
 * Permite registrar la hora específica y el número de comensales, 
 * sincronizando esta información con el dashboard y el rack visual.
 */

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

export async function inicializarDesayuno() {
    // Garantizar datos de disco
    await desayunoService.init();

    const form = document.getElementById('formNuevoDesayuno');
    if (form) {
        form.removeEventListener('submit', manejarSubmitDesayuno);
        form.addEventListener('submit', manejarSubmitDesayuno);
    }

    document.getElementById('btnVistaTrabajoDesayuno')?.addEventListener('click', () => cambiarVistaDesayuno('trabajo'));
    document.getElementById('btnVistaRackDesayuno')?.addEventListener('click', () => cambiarVistaDesayuno('rack'));

    const datalist = document.getElementById('lista-habs-desayuno');
    if (datalist) {
        datalist.innerHTML = '';
        Utils.getHabitaciones().forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.num;
            datalist.appendChild(opt);
        });
    }

    mostrarDesayunos();
}

function cambiarVistaDesayuno(vista) {
    const btnTrabajo = document.getElementById('btnVistaTrabajoDesayuno');
    const btnRack = document.getElementById('btnVistaRackDesayuno');
    const divTrabajo = document.getElementById('desayuno-trabajo');
    const divRack = document.getElementById('desayuno-rack');

    if (vista === 'trabajo') {
        btnTrabajo.classList.add('active'); btnRack.classList.remove('active');
        divTrabajo.classList.remove('d-none'); divRack.classList.add('d-none');
        mostrarDesayunos();
    } else {
        btnTrabajo.classList.remove('active'); btnRack.classList.add('active');
        divTrabajo.classList.add('d-none'); divRack.classList.remove('d-none');
        renderVistaRackDesayuno();
    }
}

// ============================================================================
// HANDLERS
// ============================================================================

function manejarSubmitDesayuno(e) {
    e.preventDefault();

    // 1. Validar Usuario
    const autor = Utils.validateUser();
    if (!autor) return;

    // 2. Validar Inputs
    const habNum = document.getElementById('desayuno_hab').value.trim().padStart(3, '0');
    const pax = document.getElementById('desayuno_pax').value;
    const hora = document.getElementById('desayuno_hora').value;
    const obs = document.getElementById('desayuno_obs').value.trim();

    const validHabs = Utils.getHabitaciones().map(h => h.num);
    if (!validHabs.includes(habNum)) {
        alert(`Error: La habitación ${habNum} no existe.`);
        return;
    }

    // 3. Guardar
    desayunoService.addDesayuno(habNum, { pax, hora, obs, autor });

    // 4. Reset
    e.target.reset();
    const btnSubmit = document.getElementById('btnSubmitDesayuno');
    if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-save-fill me-2"></i>Guardar';
    mostrarDesayunos();
}

// ============================================================================
// RENDERIZADO
// ============================================================================

/**
 * RENDER TABLA PRINCIPAL
 * Muestra el listado de desayunos ordenados por hora, facilitando el control
 * operativo para el turno de noche/mañana.
 */
function mostrarDesayunos() {
    const desayunos = desayunoService.getDesayunos();

    // Dashboard
    const dashCol = document.getElementById('dash-col-desayunos');
    const dashTabla = document.getElementById('dash-tabla-desayunos');
    const dashCount = document.getElementById('dash-count-desayunos');

    if (dashCol) dashCol.classList.toggle('d-none', Object.keys(desayunos).length === 0);
    if (dashCount) dashCount.innerText = Object.keys(desayunos).length;

    if (dashTabla) {
        dashTabla.innerHTML = '';
        const sortedHabs = Object.keys(desayunos).sort((a, b) => (desayunos[a].hora || "99:99").localeCompare(desayunos[b].hora || "99:99"));

        if (sortedHabs.length === 0) {
            dashTabla.innerHTML = '<tr><td colspan="2" class="text-center text-muted small py-2">No hay pedidos</td></tr>';
        }

        sortedHabs.forEach(hab => {
            dashTabla.innerHTML += `
                <tr onclick="irADesayuno('${hab}')" style="cursor: pointer;">
                    <td class="fw-bold">${hab}</td>
                    <td class="text-end"><span class="badge bg-danger">${desayunos[hab].hora || '--:--'}</span></td>
                </tr>`;
        });
    }

    if (window.checkDailySummaryVisibility) window.checkDailySummaryVisibility();

    // Tabla Principal
    const tabla = document.getElementById('tablaDesayunoActivos');
    if (!tabla) return;
    tabla.innerHTML = '';

    Object.keys(desayunos).sort((a, b) => (desayunos[a].hora || "99:99").localeCompare(desayunos[b].hora || "99:99")).forEach(hab => {
        const data = desayunos[hab];
        tabla.innerHTML += `
            <tr id="desayuno-row-${hab}">
                <td class="fw-bold text-primary">${hab}</td>
                <td><span class="badge bg-light text-dark border">${data.pax} pax</span></td>
                <td><span class="badge bg-info text-dark"><i class="bi bi-clock me-1"></i>${data.hora}</span></td>
                <td class="text-muted small">
                    ${data.obs || '-'}
                    <div class="text-info mt-1" style="font-size: 0.65rem;">
                        <i class="bi bi-person-fill me-1"></i>${data.autor || 'N/A'}
                    </div>
                </td>
                <td class="text-end">
                    <button onclick="eliminarDesayuno('${hab}')" class="btn btn-sm btn-outline-danger border-0"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
    });
}

/**
 * VISTA RACK DE DESAYUNOS
 * Muestra el hotel con las habitaciones coloreadas en verde si tienen 
 * un desayuno programado para la mañana siguiente.
 */
function renderVistaRackDesayuno() {
    const rackCont = document.getElementById('rack-desayuno-habitaciones');
    const statsCont = document.getElementById('desayuno-stats');
    if (!rackCont || !statsCont) return;

    const desayunos = desayunoService.getDesayunos();
    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;
    let totalPax = 0;

    let html = '';
    rangos.forEach(r => {
        html += `<div class="w-100 mt-3 mb-2 d-flex align-items-center"><span class="badge bg-secondary me-2">Planta ${r.planta}</span><hr class="flex-grow-1 my-0 opacity-25"></div>`;

        for (let i = r.min; i <= r.max; i++) {
            const num = i.toString().padStart(3, '0');
            const data = desayunos[num];
            const colorClass = data ? 'bg-success text-white' : 'bg-white text-muted border';

            if (data) totalPax += parseInt(data.pax);

            html += `
                <div class="d-flex align-items-center justify-content-center rounded rack-box ${colorClass}" 
                     data-bs-toggle="tooltip" data-bs-title="${data ? 'Pax: ' + data.pax + ' | Hora: ' + data.hora + (data.obs ? ' | Obs: ' + data.obs : '') : 'Sin pedido'}">
                    ${num}
                </div>`;
        }
    });
    
    rackCont.innerHTML = html;

    statsCont.innerHTML = `
        <div class="col-md-4">
            <div class="p-3 border rounded bg-success text-white text-center">
                <div class="small fw-bold opacity-75">TOTAL COMENSALES</div>
                <div class="h3 mb-0 fw-bold">${totalPax}</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="p-3 border rounded bg-white text-center">
                <div class="small text-muted fw-bold">HABITACIONES</div>
                <div class="h3 mb-0 fw-bold text-dark">${Object.keys(desayunos).length}</div>
            </div>
        </div>`;
}

// ============================================================================
// ACCIONES GLOBALES
// ============================================================================

function imprimirDesayunos() {
    const user = Utils.validateUser();
    if (!user) return;
    Utils.printSection('print-date-desayuno', 'print-repc-nombre-desayuno', user);
    // Nota: print-time-desayuno se puede manejar dentro de printSection o separado. 
    // Utils.printSection maneja date y user. Hora actual la pone en dateElementId si se pasa, pero aquí hay dos elementos fecha y hora.
    // printSection pone fecha Y hora en dateElementId.
    // Si queremos separarlo, lo hacemos manual o actualizamos Utils.
    // Por simplicidad, Utils.printSection pone "Fecha Hora". Si el layout de impresión espera dos elementos separados, tal vez esto sobrescriba.
    // Revisando Utils: `const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString(...)` -> `el.innerText = dateStr`
    // Si el HTML tiene elementos separados, Utils.printSection unifica.
    // El código original hacía: `dateEl` -> Fecha, `timeEl` -> Hora.
    // Utils pone todo junto.
    // Dejarlo con Utils está bien para estandarizar, o si es crítico el layout, ajustamos manualmente aquí.
    // Vamos a usar Utils para simplificar, el resultado "Fecha Hora" en un solo sitio suele ser aceptable.
    // Si print-time-desayuno queda vacío no pasa nada.
}

window.eliminarDesayuno = (hab) => {
    desayunoService.removeDesayuno(hab);
    mostrarDesayunos();
};

window.irADesayuno = (hab) => {
    navegarA('#desayuno-content');
    setTimeout(() => {
        const row = document.getElementById(`desayuno-row-${hab}`);
        if (row) {
            row.scrollIntoView({ behavior: "smooth", block: "center" });
            row.classList.add('table-warning');
            setTimeout(() => row.classList.remove('table-warning'), 2000);
        }
    }, 100);
};

window.limpiarDesayunos = async () => {
    if (await window.showConfirm("¿Deseas borrar todos los pedidos de desayuno?")) {
        desayunoService.clearDesayunos();
        mostrarDesayunos();
    }
};

window.cambiarVistaDesayuno = cambiarVistaDesayuno;
window.imprimirDesayunos = imprimirDesayunos;