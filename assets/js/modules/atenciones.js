import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { atencionesService } from '../services/AtencionesService.js';
import { sessionService } from '../services/SessionService.js';

const ICONOS_ATENCION = {
    "Fruta": "bi-apple", "Fruta Especial": "bi-basket2", "Cava": "bi-cup-straw",
    "Flores": "bi-flower1", "Agua": "bi-droplet", "Mojo": "bi-bowl",
    "Tetera": "bi-cup-hot", "Carta": "bi-envelope", "SPA": "bi-water",
    "Minibar Bienvenida": "bi-snow", "Regalo": "bi-gift", "1/2 Vino": "bi-glass-pink",
    "Tarta": "bi-cake2", "Tarjeta": "bi-card-text", "Regalo Niños": "bi-robot"
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

export async function inicializarAtenciones() {
    const form = document.getElementById('formNuevaAtencion');
    if (form) form.addEventListener('submit', manejarSubmitAtencion);

    document.getElementById('btnResetAtenciones')?.addEventListener('click', resetearAtenciones);

    document.getElementById('atenciones-trabajo')?.classList.add('content-panel');
    document.getElementById('atenciones-rack')?.classList.add('content-panel');

    document.getElementById('btnVistaTrabajo')?.addEventListener('click', () => cambiarVistaAtenciones('trabajo'));
    document.getElementById('btnVistaRack')?.addEventListener('click', () => cambiarVistaAtenciones('rack'));

    const datalist = document.getElementById('lista-habs-atenciones');
    if (datalist) {
        datalist.innerHTML = '';
        Utils.getHabitaciones().forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.num;
            datalist.appendChild(opt);
        });
    }
    await mostrarAtenciones();
}

function cambiarVistaAtenciones(vista) {
    const btnTrabajo = document.getElementById('btnVistaTrabajo');
    const btnRack = document.getElementById('btnVistaRack');
    const divTrabajo = document.getElementById('atenciones-trabajo');
    const divRack = document.getElementById('atenciones-rack');

    if (vista === 'trabajo') {
        btnTrabajo.classList.add('active'); btnRack.classList.remove('active');
        divTrabajo.classList.remove('d-none'); divRack.classList.add('d-none');
        mostrarAtenciones();
    } else {
        btnTrabajo.classList.remove('active'); btnRack.classList.add('active');
        divTrabajo.classList.add('d-none'); divRack.classList.remove('d-none');
        renderVistaRack();
    }
}

// ============================================================================
// HANDLERS
// ============================================================================

async function manejarSubmitAtencion(e) {
    e.preventDefault();
    const habNum = document.getElementById('atencion_hab').value.trim().padStart(3, '0');
    // Ensure properly formatted value stays in input
    Utils.setVal('atencion_hab', habNum);

    // 1. Validar Usuario
    const autor = Utils.validateUser();
    if (!autor) return;

    // 2. Validar Habitación
    const validHabs = Utils.getHabitaciones().map(h => h.num);
    if (!validHabs.includes(habNum)) {
        alert("Error: La habitación " + habNum + " no existe.");
        return;
    }

    const seleccionadas = Array.from(document.querySelectorAll('.check-atencion:checked')).map(cb => cb.value);
    const comentario = document.getElementById('atencion_comentario').value.trim();

    if (seleccionadas.length > 0 || comentario !== "") {
        await atencionesService.addAtencion(habNum, seleccionadas, comentario, autor);
    } else {
        await atencionesService.removeAtencion(habNum);
    }

    e.target.reset();
    await mostrarAtenciones();
}

// ============================================================================
// RENDERIZADO
// ============================================================================

async function mostrarAtenciones() {
    const tabla = document.getElementById('tablaAtencionesActivas');
    if (!tabla) return;
    const atenciones = await atencionesService.getAtenciones();

    const dashCol = document.getElementById('dash-col-atenciones');
    if (dashCol) {
        const tieneDatos = Object.keys(atenciones).length > 0;
        dashCol.classList.toggle('d-none', !tieneDatos);
    }

    let html = '';
    Object.keys(atenciones).sort().forEach(hab => {
        const data = atenciones[hab];
        const lista = Array.isArray(data) ? data : (data.tipos || []);
        const comentario = Array.isArray(data) ? "" : (data.comentario || "");
        html += `<tr><td class="fw-bold text-primary">${hab}</td><td>${lista.map(a => `<span class="badge bg-info text-dark me-1"><i class="bi ${ICONOS_ATENCION[a] || 'bi-tag'} me-1"></i>${a}</span>`).join('')}</td><td class="small text-muted">${comentario}</td><td class="text-end"><button onclick="prepararEdicionAtencion('${hab}')" class="btn btn-sm btn-outline-primary border-0 me-1"><i class="bi bi-pencil"></i></button><button onclick="eliminarAtencionHab('${hab}')" class="btn btn-sm btn-outline-danger border-0"><i class="bi bi-trash"></i></button></td></tr>`;
    });
    tabla.innerHTML = html;
}

async function renderVistaRack() {
    const rackCont = document.getElementById('rack-habitaciones');
    const statsCont = document.getElementById('atenciones-stats');
    if (!rackCont || !statsCont) return;

    const atenciones = await atencionesService.getAtenciones();
    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;
    const totalHabs = rangos.reduce((acc, r) => acc + (r.max - r.min + 1), 0);

    let rackHtml = '';
    rangos.forEach(r => {
        rackHtml += `<div class="w-100 mt-3 mb-2 d-flex align-items-center"><span class="badge bg-secondary me-2">Planta ${r.planta}</span><hr class="flex-grow-1 my-0 opacity-25"></div>`;
        for (let i = r.min; i <= r.max; i++) {
            const num = i.toString().padStart(3, '0');
            const data = atenciones[num];
            const lista = data ? (Array.isArray(data) ? data : data.tipos) : null;
            const colorClass = lista ? 'bg-primary text-white' : 'bg-white text-muted border';

            let tooltip = 'Libre';
            if (lista) {
                tooltip = lista.join(', ');
                if (data && data.comentario) tooltip += ` (${data.comentario})`;
            }

            rackHtml += `<div class="d-flex align-items-center justify-content-center rounded rack-box ${colorClass}" title="${tooltip}">${num}</div>`;
        }
    });
    rackCont.innerHTML = rackHtml;

    const habsConAtencion = Object.keys(atenciones).length;
    statsCont.innerHTML = `<div class="col-md-3"><div class="p-2 border rounded bg-light text-center h-100"><div class="small text-muted fw-bold">HAB. CON ATENCIÓN</div><div class="h5 mb-0 fw-bold">${habsConAtencion} / ${totalHabs}</div></div></div>`;
}

// ============================================================================
// ACCIONES GLOBALES
// ============================================================================

export async function prepararEdicionAtencion(hab) {
    const atenciones = await atencionesService.getAtenciones();
    const data = atenciones[hab];
    if (data) {
        const lista = Array.isArray(data) ? data : (data.tipos || []);
        Utils.setVal('atencion_hab', hab);
        Utils.setVal('atencion_comentario', data.comentario || "");

        document.querySelectorAll('.check-atencion').forEach(cb => cb.checked = lista.includes(cb.value));
        document.getElementById('atencion_hab').focus();
    }
}

export async function eliminarAtencionHab(hab) {
    if (confirm(`¿Eliminar atenciones de la habitación ${hab}?`)) {
        await atencionesService.removeAtencion(hab);
        mostrarAtenciones();
    }
}

async function resetearAtenciones() {
    if (await window.showConfirm("¿Estás seguro de borrar TODAS las atenciones?")) {
        await atencionesService.clearAll();
        mostrarAtenciones();
    }
}

function imprimirAtenciones() {
    const user = Utils.validateUser();
    if (!user) return;
    Utils.printSection('print-date-atenciones', 'print-repc-nombre-atenciones', user);
}

// Expose globals
window.prepararEdicionAtencion = prepararEdicionAtencion;
window.eliminarAtencionHab = eliminarAtencionHab;
window.resetearAtenciones = resetearAtenciones;
window.imprimirAtenciones = imprimirAtenciones;