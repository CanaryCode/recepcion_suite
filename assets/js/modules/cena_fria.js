import { Utils } from '../core/Utils.js';
import { APP_CONFIG } from '../core/Config.js';
import { Ui } from '../core/Ui.js';
import { cenaFriaService } from '../services/CenaFriaService.js';

/**
 * MÓDULO DE CENAS FRÍAS (cena_fria.js)
 * -----------------------------------
 * Gestiona los pedidos de picnic o cena embolsada para clientes.
 */

export async function inicializarCenaFria() {
    await cenaFriaService.init();

    // 1. CONFIGURAR VISTAS (Conmutador)
    Ui.setupViewToggle({
        buttons: [
            { id: 'btnVistaTrabajoCena', viewId: 'cena-fria-trabajo', onShow: mostrarCenasFrias },
            { id: 'btnVistaRackCena', viewId: 'cena-fria-rack', onShow: renderVistaRackCenaFria }
        ]
    });

    // 2. AUTOCOMPLETE DE HABITACIONES
    Ui.initRoomAutocomplete('lista-habs-cena');

    // 3. GESTIÓN DE FORMULARIO (Asistente)
    Ui.handleFormSubmission({
        formId: 'formNuevaCena',
        service: cenaFriaService,
        idField: 'cena_hab',
        mapData: (data) => ({
            pax: data.cena_pax,
            obs: data.cena_obs
        }),
        onSuccess: () => {
            const btnSubmit = document.getElementById('btnSubmitCena');
            if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-save-fill me-2"></i>Guardar';
            mostrarCenasFrias();
        }
    });

    // Ocultar selectores antiguos del DOM (Ya usa global)
    document.getElementById('cena_autor')?.parentElement?.classList.add('d-none');
    
    // Paneles con estilo estándar
    document.getElementById('cena-fria-trabajo')?.classList.add('content-panel');
    document.getElementById('cena-fria-rack')?.classList.add('content-panel');

    mostrarCenasFrias();
}

/**
 * RENDERIZADO DE TABLA Y DASHBOARD
 */
function mostrarCenasFrias() {
    const cenas = cenaFriaService.getCenas();
    const listaCenas = Object.keys(cenas).sort().map(hab => ({ hab, ...cenas[hab] }));

    // A. Actualizar Dashboard (API Ui)
    Ui.updateDashboardWidget('cenas', listaCenas, (item) => `
        <tr onclick="irACenaFria('${item.hab}')" style="cursor: pointer;">
            <td class="fw-bold">${item.hab}</td>
            <td class="text-end"><span class="badge bg-light text-dark border">${item.pax} pax</span></td>
        </tr>`);

    if (window.checkDailySummaryVisibility) window.checkDailySummaryVisibility();

    // B. Actualizar Tabla Principal (API Ui)
    Ui.renderTable('tablaCenaActivos', listaCenas, (item) => `
        <tr id="cena-row-${item.hab}">
            <td class="fw-bold text-primary">${item.hab}</td>
            <td><span class="badge bg-light text-dark border">${item.pax} pax</span></td>
            <td class="text-muted small">
                ${item.obs || '-'}
                <div class="text-info mt-1" style="font-size: 0.65rem;">
                    <i class="bi bi-person-fill me-1"></i>${item.autor || 'N/A'}
                </div>
            </td>
            <td class="text-end">
                <button onclick="prepararEdicionCenaFria('${item.hab}')" class="btn btn-sm btn-outline-primary border-0 me-1"><i class="bi bi-pencil"></i></button>
                <button onclick="eliminarCenaFria('${item.hab}')" class="btn btn-sm btn-outline-danger border-0"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`, 'No hay pedidos de cena fría para hoy.');
}

/**
 * VISTA RACK DE CENAS FRÍAS
 */
function renderVistaRackCenaFria() {
    const rackCont = document.getElementById('rack-cena-habitaciones');
    const statsCont = document.getElementById('cena-stats');
    if (!rackCont || !statsCont) return;

    const cenas = cenaFriaService.getCenas();
    const habsList = Utils.getHabitaciones();
    let totalPax = 0;
    let lastPlanta = -1;

    let html = '';
    habsList.forEach(h => {
        if (h.planta !== lastPlanta) {
            html += `<div class="w-100 mt-3 mb-2 d-flex align-items-center"><span class="badge bg-secondary me-2">Planta ${h.planta}</span><hr class="flex-grow-1 my-0 opacity-25"></div>`;
            lastPlanta = h.planta;
        }

        const data = cenas[h.num];
        const hasData = !!data;
        const colorClass = hasData ? 'text-white' : 'bg-white text-muted border';
        const style = hasData ? 'background-color: #6610f2 !important;' : '';

        if (hasData) totalPax += parseInt(data.pax);

        html += `
            <div class="d-flex align-items-center justify-content-center rounded rack-box ${colorClass}" 
                 style="${style}" 
                 data-bs-toggle="tooltip" data-bs-title="${hasData ? 'Pax: ' + data.pax + (data.obs ? ' | Obs: ' + data.obs : '') : 'Sin pedido'}">
                ${h.num}
            </div>`;
    });
    
    rackCont.innerHTML = html;

    statsCont.innerHTML = `
        <div class="col-md-4">
            <div class="p-3 border rounded bg-primary text-white text-center">
                <div class="small fw-bold opacity-75">TOTAL COMENSALES</div>
                <div class="h3 mb-0 fw-bold">${totalPax}</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="p-3 border rounded bg-white text-center">
                <div class="small text-muted fw-bold">HABITACIONES</div>
                <div class="h3 mb-0 fw-bold text-dark">${Object.keys(cenas).length}</div>
            </div>
        </div>`;
}

// === ACCIONES GLOBALES ===

window.prepararEdicionCenaFria = (hab) => {
    const data = cenaFriaService.getByKey(hab);
    if (!data) return;

    document.getElementById('cena_hab').value = hab;
    document.getElementById('cena_pax').value = data.pax;
    document.getElementById('cena_obs').value = data.obs || '';

    const btnSubmit = document.getElementById('btnSubmitCena');
    if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Actualizar Cena';
    
    document.getElementById('btnVistaTrabajoCena').click();
};

window.eliminarCenaFria = async (hab) => {
    if (await Ui.showConfirm(`¿Eliminar el pedido de la habitación ${hab}?`)) {
        cenaFriaService.removeByKey(hab);
        mostrarCenasFrias();
    }
};

window.irACenaFria = (hab) => {
    navegarA('#cena-fria-content');
    document.getElementById('btnVistaTrabajoCena').click();
    setTimeout(() => {
        const row = document.getElementById(`cena-row-${hab}`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('table-warning');
            setTimeout(() => row.classList.remove('table-warning'), 2000);
        }
    }, 100);
};

window.limpiarCenasFrias = async () => {
    if (await Ui.showConfirm("¿Deseas borrar TODOS los pedidos de cena fría?")) {
        cenaFriaService.clear(); // BaseService clear resets everything
        mostrarCenasFrias();
    }
};

window.imprimirCenasFrias = () => {
    const user = Utils.validateUser();
    if (!user) return;

    Ui.preparePrintReport({
        dateId: 'print-date-cena',
        memberId: 'print-repc-nombre-cena',
        memberName: user,
        extraMappings: {
            'print-repc-nombre-cena-firma': user
        }
    });

    window.print();
};