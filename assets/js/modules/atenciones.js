import { Utils } from '../core/Utils.js';
import { APP_CONFIG } from '../core/Config.js';
import { Ui } from '../core/Ui.js';
import { RackView } from '../core/RackView.js';
import { atencionesService } from '../services/AtencionesService.js';

/**
 * MÓDULO DE GESTIÓN DE ATENCIONES VIP (atenciones.js)
 * --------------------------------------------------
 * Controla el registro y visualización de servicios especiales para habitaciones.
 */

const ICONOS_ATENCION = {
    "Fruta": "bi-apple", "Fruta Especial": "bi-basket2", "Cava": "bi-cup-straw",
    "Flores": "bi-flower1", "Agua": "bi-droplet", "Mojo": "bi-bowl",
    "Tetera": "bi-cup-hot", "Carta": "bi-envelope", "SPA": "bi-water",
    "Minibar Bienvenida": "bi-snow", "Regalo": "bi-gift", "1/2 Vino": "bi-glass-pink",
    "Tarta": "bi-cake2", "Tarjeta": "bi-card-text", "Regalo Niños": "bi-robot"
};

export async function inicializarAtenciones() {
    await atencionesService.init();

    // 1. CONFIGURAR VISTAS
    Ui.setupViewToggle({
        buttons: [
            { id: 'btnVistaTrabajo', viewId: 'atenciones-trabajo', onShow: mostrarAtenciones },
            { id: 'btnVistaRack', viewId: 'atenciones-rack', onShow: renderVistaRack }
        ]
    });

    // 2. AUTOCOMPLETE
    Ui.initRoomAutocomplete('lista-habs-atenciones');

    // 3. GESTIÓN DE FORMULARIO (Ui.handleFormSubmission)
    Ui.handleFormSubmission({
        formId: 'formNuevaAtencion',
        service: atencionesService,
        idField: 'atencion_hab', // Usamos la hab como ID para atenciones
        mapData: (rawData) => {
            const autor = Utils.validateUser();
            if (!autor) return null;

            const hab = rawData.atencion_hab.trim().padStart(3, '0');
            const seleccionadas = Array.from(document.querySelectorAll('.check-atencion:checked')).map(cb => cb.value);
            const comentario = rawData.atencion_comentario.trim();

            if (seleccionadas.length === 0 && comentario === "") {
                Ui.showToast("Seleccione al menos una atención o escriba un comentario.", "warning");
                return null;
            }

            return {
                hab,
                tipos: seleccionadas,
                comentario,
                autor,
                timestamp: Date.now()
            };
        },
        onSuccess: () => {
            const btnSubmit = document.getElementById('btnSubmitAtenciones');
            if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-save-fill me-2"></i>Registrar Atención';
            mostrarAtenciones();
        }
    });

    document.getElementById('atenciones-trabajo')?.classList.add('content-panel');
    document.getElementById('atenciones-rack')?.classList.add('content-panel');

    mostrarAtenciones();
}

async function mostrarAtenciones() {
    const atenciones = await atencionesService.getAtenciones();
    const listaDatos = Object.keys(atenciones).sort().map(hab => {
        const data = atenciones[hab];
        return {
            hab,
            tipos: Array.isArray(data) ? data : (data.tipos || []),
            comentario: Array.isArray(data) ? "" : (data.comentario || ""),
            autor: data.autor || 'N/A'
        };
    });

    // Dashboard Widget Removed by User Request
    // Ui.updateDashboardWidget('atenciones', listaDatos, ...);

    if (window.checkDailySummaryVisibility) window.checkDailySummaryVisibility();

    // Tabla Principal
    Ui.renderTable('tablaAtencionesActivas', listaDatos, (item) => {
        const badges = item.tipos.map(a => 
            `<span class="badge bg-info text-dark me-1"><i class="bi ${ICONOS_ATENCION[a] || 'bi-tag'} me-1"></i>${a}</span>`
        ).join('');
        
        return `
            <tr>
                <td class="fw-bold text-primary">${item.hab}</td>
                <td>${badges}</td>
                <td class="small text-muted">${item.comentario}</td>
                <td class="text-end">
                    <button onclick="prepararEdicionAtencion('${item.hab}')" class="btn btn-sm btn-outline-primary border-0 me-1" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button onclick="eliminarAtencionHab('${item.hab}')" class="btn btn-sm btn-outline-danger border-0" title="Borrar"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
    }, 'No hay habitaciones con atenciones pendientes.');
}

async function renderVistaRack() {
    const atenciones = await atencionesService.getAtenciones();
    const statsCont = document.getElementById('atenciones-stats');
    
    RackView.render('rack-habitaciones', (numHab) => {
        const data = atenciones[numHab];
        const lista = data ? (Array.isArray(data) ? data : data.tipos) : null;
        const colorClass = lista ? 'bg-primary text-white' : 'bg-white text-muted border';
        
        let tooltip = 'Libre';
        if (lista) {
            tooltip = lista.join(', ');
            if (data && data.comentario) tooltip += ` (${data.comentario})`;
        }

        return `<div class="d-flex align-items-center justify-content-center rounded rack-box room-card ${colorClass}" data-room-num="${numHab}" data-bs-toggle="tooltip" data-bs-title="${tooltip}">${numHab}</div>`;
    });

    if (statsCont) {
        const habsConAtencion = Object.keys(atenciones).length;
        const totalHabs = Utils.getHabitaciones().length;
        statsCont.innerHTML = `<div class="col-md-3"><div class="p-2 border rounded bg-light text-center h-100"><div class="small text-muted fw-bold">HAB. CON ATENCIÓN</div><div class="h5 mb-0 fw-bold">${habsConAtencion} / ${totalHabs}</div></div></div>`;
    }
}

// === ACCIONES GLOBALES ===

window.prepararEdicionAtencion = async (hab) => {
    const data = await atencionesService.getByKey(hab);
    if (!data) return;

    Utils.setVal('atencion_hab', hab);
    Utils.setVal('atencion_comentario', data.comentario || "");

    // Marcar checkboxes
    const tipos = Array.isArray(data) ? data : (data.tipos || []);
    document.querySelectorAll('.check-atencion').forEach(cb => {
        cb.checked = tipos.includes(cb.value);
    });

    const btn = document.getElementById('btnSubmitAtenciones');
    if (btn) btn.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Actualizar Atención';
    
    document.getElementById('btnVistaTrabajo').click();
    document.getElementById('atencion_hab').focus();
};

window.eliminarAtencionHab = async (hab) => {
    if (await Ui.showConfirm(`¿Eliminar atenciones de la habitación ${hab}?`)) {
        await atencionesService.removeAtencion(hab);
        mostrarAtenciones();
    }
};

window.resetearAtenciones = async () => {
    if (await Ui.showConfirm("¿Estás seguro de borrar TODAS las atenciones?")) {
        await atencionesService.clear();
        mostrarAtenciones();
    }
};

window.imprimirAtenciones = () => {
    const user = Utils.validateUser();
    if (!user) return;

    // Lógica de Impresión Atómica - ESTABILIZACIÓN NUCLEAR V2
    const appLayout = document.getElementById('app-layout');
    const navbar = document.getElementById('navbar-container');
    const reportHeader = document.querySelector('.report-header-print');
    const workView = document.getElementById('atenciones-trabajo');
    const rackView = document.getElementById('atenciones-rack');
    const signatureArea = document.querySelector('.d-print-block.mt-5');
    
    // 1. Ocultar el layout principal y preparar cabecera
    if (appLayout) appLayout.classList.add('d-none', 'd-print-none');
    if (navbar) navbar.classList.add('d-none', 'd-print-none');
    
    const now = new Date();
    const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const pDate = document.getElementById('print-date-atenciones');
    const pName = document.getElementById('print-repc-nombre-atenciones');
    if (pDate) pDate.textContent = dateStr;
    if (pName) pName.textContent = user;

    // 2. Forzar que el reporte sea lo ÚNICO en la página
    if (reportHeader) {
        reportHeader.classList.remove('d-none');
        reportHeader.classList.add('d-print-block');
    }
    
    if (signatureArea) {
        signatureArea.classList.remove('d-none');
        signatureArea.classList.add('d-print-block');
    }
    
    // Forzar visibilidad de la tabla
    if (workView) workView.classList.remove('d-none');
    if (rackView) rackView.classList.add('d-none', 'd-print-none');

    window.print();

    // Restaurar para visualización en pantalla
    if (appLayout) appLayout.classList.remove('d-none', 'd-print-none');
    if (navbar) navbar.classList.remove('d-none', 'd-print-none');
    if (reportHeader) {
        reportHeader.classList.add('d-none');
        reportHeader.classList.remove('d-print-block');
    }
    if (signatureArea) {
        signatureArea.classList.add('d-none');
        signatureArea.classList.remove('d-print-block');
    }
    
    // Restaurar vista previa
    const isRackActive = document.getElementById('btnVistaRack')?.classList.contains('active');
    if (isRackActive) {
        if (workView) workView.classList.add('d-none');
        if (rackView) rackView.classList.remove('d-none');
    }
};