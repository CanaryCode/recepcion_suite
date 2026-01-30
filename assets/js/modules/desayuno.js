import { Utils } from '../core/Utils.js';
import { APP_CONFIG } from '../core/Config.js';
import { Ui } from '../core/Ui.js';
import { desayunoService } from '../services/DesayunoService.js';

/**
 * MÓDULO DE DESAYUNOS TEMPRANOS (desayuno.js)
 * ------------------------------------------
 * Gestiona las peticiones de desayuno antes de la apertura del comedor.
 */

export async function inicializarDesayuno() {
    await desayunoService.init();

    // 1. CONFIGURAR VISTAS (Conmutador)
    Ui.setupViewToggle({
        buttons: [
            { id: 'btnVistaTrabajoDesayuno', viewId: 'desayuno-trabajo', onShow: mostrarDesayunos },
            { id: 'btnVistaRackDesayuno', viewId: 'desayuno-rack', onShow: renderVistaRackDesayuno }
        ]
    });

    // 2. AUTOCOMPLETE DE HABITACIONES
    Ui.initRoomAutocomplete('lista-habs-desayuno');

    // 3. GESTIÓN DE FORMULARIO (Asistente)
    Ui.handleFormSubmission({
        formId: 'formNuevoDesayuno',
        service: desayunoService,
        idField: 'desayuno_hab',
        mapData: (data) => ({
            pax: parseInt(data.desayuno_pax),
            hora: data.desayuno_hora,
            obs: data.desayuno_obs
        }),
        onSuccess: () => {
            const btnSubmit = document.getElementById('btnSubmitDesayuno');
            if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-save-fill me-2"></i>Guardar';
            mostrarDesayunos();
        }
    });

    mostrarDesayunos();
}

/**
 * RENDERIZADO DE TABLA Y DASHBOARD
 */
function mostrarDesayunos() {
    const desayunos = desayunoService.getAll();
    const listaDesayunos = Object.keys(desayunos)
        .sort((a, b) => (desayunos[a].hora || "99:99").localeCompare(desayunos[b].hora || "99:99"))
        .map(hab => ({ hab, ...desayunos[hab] }));

    // A. Dashboard (API Ui)
    Ui.updateDashboardWidget('desayunos', listaDesayunos, (item) => `
        <tr onclick="setTimeout(() => irADesayuno('${item.hab}'), 10)" style="cursor: pointer;">
            <td class="fw-bold">${item.hab}</td>
            <td class="text-end"><span class="badge bg-danger">${item.hora || '--:--'}</span></td>
        </tr>`);

    if (window.checkDailySummaryVisibility) window.checkDailySummaryVisibility();

    // B. Tabla Principal (API Ui)
    Ui.renderTable('tablaDesayunoActivos', listaDesayunos, (item) => `
        <tr id="desayuno-row-${item.hab}">
            <td class="fw-bold text-primary">${item.hab}</td>
            <td><span class="badge bg-light text-dark border">${item.pax} pax</span></td>
            <td><span class="badge bg-info text-dark"><i class="bi bi-clock me-1"></i>${item.hora}</span></td>
            <td class="text-muted small">
                ${item.obs || '-'}
                <div class="text-info mt-1" style="font-size: 0.65rem;">
                    <i class="bi bi-person-fill me-1"></i>${item.autor || 'N/A'}
                </div>
            </td>
            <td class="text-end">
                <button onclick="eliminarDesayuno('${item.hab}')" class="btn btn-sm btn-outline-danger border-0"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`, 'No hay pedidos de desayuno registrados.');
}

/**
 * VISTA RACK DE DESAYUNOS
 */
function renderVistaRackDesayuno() {
    const rackCont = document.getElementById('rack-desayuno-habitaciones');
    const statsCont = document.getElementById('desayuno-stats');
    if (!rackCont || !statsCont) return;

    const desayunos = desayunoService.getAll();
    const habsList = Utils.getHabitaciones();
    let totalPax = 0;
    let lastPlanta = -1;

    let html = '';
    habsList.forEach(h => {
        if (h.planta !== lastPlanta) {
            html += `<div class="w-100 mt-3 mb-2 d-flex align-items-center"><span class="badge bg-secondary me-2">Planta ${h.planta}</span><hr class="flex-grow-1 my-0 opacity-25"></div>`;
            lastPlanta = h.planta;
        }

        const data = desayunos[h.num];
        const hasData = !!data;
        const colorClass = hasData ? 'bg-success text-white' : 'bg-white text-muted border';

        if (hasData) totalPax += parseInt(data.pax);

        html += `
            <div class="d-flex align-items-center justify-content-center rounded rack-box room-card ${colorClass}" 
                 data-room-num="${h.num}"
                 data-bs-toggle="tooltip" data-bs-title="${hasData ? 'Pax: ' + data.pax + ' | Hora: ' + data.hora + (data.obs ? ' | Obs: ' + data.obs : '') : 'Sin pedido'}">
                ${h.num}
            </div>`;
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

// === ACCIONES GLOBALES ===

window.eliminarDesayuno = async (hab) => {
    if (await Ui.showConfirm(`¿Eliminar el pedido de desayuno de la hab. ${hab}?`)) {
        desayunoService.removeByKey(hab);
        mostrarDesayunos();
    }
};

window.irADesayuno = (hab) => {
    navegarA('#desayuno-content');
    document.getElementById('btnVistaTrabajoDesayuno').click();
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
    if (await Ui.showConfirm("¿Deseas borrar TODOS los pedidos de desayuno?")) {
        desayunoService.clear();
        mostrarDesayunos();
    }
};

window.imprimirDesayunos = () => {
    const user = Utils.validateUser();
    if (!user) return;
    Utils.printSection('print-date-desayuno', 'print-repc-nombre-desayuno', user);
};