import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { sessionService } from '../services/SessionService.js';

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

export function inicializarCenaFria() {
    const form = document.getElementById('formNuevaCena');
    if (form) {
        form.addEventListener('submit', manejarSubmitCenaFria);
    }

    // Ocultar selectores del DOM (Ya usa global)
    document.getElementById('cena_autor')?.parentElement?.classList.add('d-none');
    document.getElementById('cena_autor_otro_container')?.classList.add('d-none');

    // --- BARRA DE HERRAMIENTAS UNIFICADA ---
    document.getElementById('cena-fria-trabajo')?.classList.add('content-panel');
    document.getElementById('cena-fria-rack')?.classList.add('content-panel');

    document.getElementById('btnVistaTrabajoCena')?.addEventListener('click', () => cambiarVistaCenaFria('trabajo'));
    document.getElementById('btnVistaRackCena')?.addEventListener('click', () => cambiarVistaCenaFria('rack'));

    const datalist = document.getElementById('lista-habs-cena');
    if (datalist) {
        datalist.innerHTML = '';
        Utils.getHabitaciones().forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.num;
            datalist.appendChild(opt);
        });
    }
    mostrarCenasFrias();
}

function cambiarVistaCenaFria(vista) {
    const btnTrabajo = document.getElementById('btnVistaTrabajoCena');
    const btnRack = document.getElementById('btnVistaRackCena');
    const divTrabajo = document.getElementById('cena-fria-trabajo');
    const divRack = document.getElementById('cena-fria-rack');

    if (vista === 'trabajo') {
        btnTrabajo.classList.add('active'); btnRack.classList.remove('active');
        divTrabajo.classList.remove('d-none'); divRack.classList.add('d-none');
        mostrarCenasFrias();
    } else {
        btnTrabajo.classList.remove('active'); btnRack.classList.add('active');
        divTrabajo.classList.add('d-none'); divRack.classList.remove('d-none');
        renderVistaRackCenaFria();
    }
}

// ============================================================================
// HANDLERS
// ============================================================================

function manejarSubmitCenaFria(e) {
    e.preventDefault();
    const habNum = document.getElementById('cena_hab').value.trim().padStart(3, '0');
    const pax = document.getElementById('cena_pax').value;
    const obs = document.getElementById('cena_obs').value.trim();

    // 1. Validar Usuario
    const autor = Utils.validateUser();
    if (!autor) return;

    // 2. Validar Habitación
    const validHabs = Utils.getHabitaciones().map(h => h.num);
    if (!validHabs.includes(habNum)) { alert(`Error: La habitación ${habNum} no existe.`); return; }

    // 3. Guardar (LocalStorage directo por ahora, idealmente Service)
    const cenas = JSON.parse(localStorage.getItem('riu_cenas_frias')) || {};
    cenas[habNum] = { pax, obs, autor };
    localStorage.setItem('riu_cenas_frias', JSON.stringify(cenas));

    e.target.reset();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-save-fill me-2"></i>Registrar Cena';

    mostrarCenasFrias();
}

// ============================================================================
// RENDERIZADO
// ============================================================================

function mostrarCenasFrias() {
    const cenas = JSON.parse(localStorage.getItem('riu_cenas_frias')) || {};

    // Actualizar Dashboard
    const dashCol = document.getElementById('dash-col-cenas');
    const dashTabla = document.getElementById('dash-tabla-cenas');
    const dashCount = document.getElementById('dash-count-cenas');

    if (dashCol) {
        const tieneDatos = Object.keys(cenas).length > 0;
        dashCol.classList.toggle('d-none', !tieneDatos);
    }

    if (dashCount) dashCount.innerText = Object.keys(cenas).length;

    if (dashTabla) {
        dashTabla.innerHTML = '';
        Object.keys(cenas).sort().forEach(hab => {
            const data = cenas[hab];
            dashTabla.innerHTML += `
                <tr onclick="irACenaFria('${hab}')" style="cursor: pointer;">
                    <td class="fw-bold">${hab}</td>
                    <td class="text-end"><span class="badge bg-light text-dark border">${data.pax} pax</span></td>
                </tr>`;
        });
    }

    const tabla = document.getElementById('tablaCenaActivos');
    if (!tabla) return;
    tabla.innerHTML = '';

    Object.keys(cenas).sort().forEach(hab => {
        const data = cenas[hab];
        tabla.innerHTML += `
            <tr id="cena-row-${hab}">
                <td class="fw-bold text-primary">${hab}</td>
                <td><span class="badge bg-light text-dark border">${data.pax} pax</span></td>
                <td class="text-muted small">
                    ${data.obs || '-'}
                    <div class="text-info mt-1" style="font-size: 0.65rem;">
                        <i class="bi bi-person-fill me-1"></i>${data.autor || 'N/A'}
                    </div>
                </td>
                <td class="text-end">
                    <button onclick="prepararEdicionCenaFria('${hab}')" class="btn btn-sm btn-outline-primary border-0 me-1"><i class="bi bi-pencil"></i></button>
                    <button onclick="eliminarCenaFria('${hab}')" class="btn btn-sm btn-outline-danger border-0"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
    });
}

function renderVistaRackCenaFria() {
    const rackCont = document.getElementById('rack-cena-habitaciones');
    const statsCont = document.getElementById('cena-stats');
    if (!rackCont || !statsCont) return;

    const cenas = JSON.parse(localStorage.getItem('riu_cenas_frias')) || {};
    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;
    let totalPax = 0;

    rackCont.innerHTML = '';
    rangos.forEach(r => {
        const header = document.createElement('div');
        header.className = 'w-100 mt-3 mb-2 d-flex align-items-center';
        header.innerHTML = `<span class="badge bg-secondary me-2">Planta ${r.planta}</span><hr class="flex-grow-1 my-0 opacity-25">`;
        rackCont.appendChild(header);

        for (let i = r.min; i <= r.max; i++) {
            const num = i.toString().padStart(3, '0');
            const data = cenas[num];
            const colorClass = data ? 'bg-indigo text-white' : 'bg-white text-muted border'; // bg-indigo custom class or style needed?
            // Using style as in original for now or assuming custom css exists. Original had inline style.
            const style = data ? 'background-color: #6610f2 !important;' : '';

            if (data) totalPax += parseInt(data.pax);

            rackCont.innerHTML += `
                <div class="d-flex align-items-center justify-content-center rounded rack-box ${colorClass}" 
                     style="${style}" 
                     title="${data ? 'Pax: ' + data.pax + (data.obs ? ' | Obs: ' + data.obs : '') : 'Sin pedido'}">
                    ${num}
                </div>`;
        }
    });

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

// ============================================================================
// ACCIONES GLOBALES
// ============================================================================

function imprimirCenasFrias() {
    const user = Utils.validateUser();
    if (!user) return;
    Utils.printSection('print-date-cena', 'print-repc-nombre-cena', user);
}

window.prepararEdicionCenaFria = (hab) => {
    const cenas = JSON.parse(localStorage.getItem('riu_cenas_frias')) || {};
    const data = cenas[hab];
    if (data) {
        document.getElementById('cena_hab').value = hab;
        document.getElementById('cena_pax').value = data.pax;
        document.getElementById('cena_obs').value = data.obs || '';

        const btnSubmit = document.querySelector('#formNuevaCena button[type="submit"]');
        if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Actualizar Cena';
        cambiarVistaCenaFria('trabajo');
    }
};

window.eliminarCenaFria = (hab) => {
    const cenas = JSON.parse(localStorage.getItem('riu_cenas_frias')) || {};
    delete cenas[hab];
    localStorage.setItem('riu_cenas_frias', JSON.stringify(cenas));
    mostrarCenasFrias();
};

window.irACenaFria = (hab) => {
    navegarA('#cena-fria-content');
    cambiarVistaCenaFria('trabajo');
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
    if (await window.showConfirm("¿Deseas borrar todos los pedidos de cena fría?")) {
        localStorage.removeItem('riu_cenas_frias');
        mostrarCenasFrias();
    }
};

window.cambiarVistaCenaFria = cambiarVistaCenaFria;
window.imprimirCenasFrias = imprimirCenasFrias;