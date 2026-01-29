import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { Ui } from '../core/Ui.js';
import { safeService } from '../services/SafeService.js';
import { sessionService } from '../services/SessionService.js';

/**
 * MÓDULO DE ALQUILER DE CAJAS FUERTES (safe.js)
 * --------------------------------------------
 * Gestiona los contratos de alquiler de cajas fuertes de las habitaciones.
 * Calcula automáticamente la recaudación estimada basada en los días transcurridos
 * y el precio diario configurado.
 */

let safeChartInstance = null; // Instancia de la gráfica de ocupación de cajas

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

export async function inicializarSafe() {
    await safeService.init ? await safeService.init() : null; // Ensure sync if available

    // 1. CONFIGURAR VISTAS (Conmutador)
    Ui.setupViewToggle({
        buttons: [
            { id: 'btnVistaTrabajoSafe', viewId: 'safe-trabajo', onShow: mostrarSafeRentals },
            { id: 'btnVistaRackSafe', viewId: 'safe-rack', onShow: renderVistaRackSafe }
        ]
    });

    // 2. AUTOCOMPLETE DE HABITACIONES
    Ui.initRoomAutocomplete('lista-habs-safe');

    // 3. GESTIÓN DE FORMULARIO (Asistente)
    Ui.handleFormSubmission({
        formId: 'formNuevoSafe',
        service: safeService,
        idField: 'safe_hab',
        mapData: (rawData) => ({
            habitacion: rawData.safe_hab.toString().padStart(3, '0'),
            nombre: rawData.safe_nombre.trim(),
            fechaInicio: rawData.safe_fecha_inicio,
            comentario: rawData.safe_comentario.trim()
        }),
        onSuccess: () => {
            const btnSubmit = document.querySelector('#formNuevoSafe button[type="submit"]');
            if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-save-fill me-2"></i>Guardar';
            Utils.setVal('safe_fecha_inicio', Utils.getTodayISO());
            mostrarSafeRentals();
        }
    });

    Utils.setVal('safe_fecha_inicio', Utils.getTodayISO());
    mostrarSafeRentals();
}

/**
 * Función global para facilitar el cambio programático
 */
window.cambiarVistaSafe = (vista) => {
    const btn = vista === 'trabajo' ? 'btnVistaTrabajoSafe' : 'btnVistaRackSafe';
    document.getElementById(btn)?.click();
};

// ============================================================================
// RENDERIZADO
// ============================================================================

/**
 * CÁLCULO DE DÍAS Y COSTES
 * Calcula la diferencia en días desde la fecha de inicio hasta hoy.
 */
function calcularDias(fechaInicio) {
    const inicio = new Date(fechaInicio);
    const hoy = new Date();
    const diffTime = Math.abs(hoy - inicio);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Muestra la lista de alquileres de cajas fuertes en el rack y tabla.
 */
function mostrarSafeRentals() {
    const rentals = safeService.getRentals();
    
    // 1. Mostrar en Tabla (Lista)
    Ui.renderTable('safe-tbody', rentals, renderFilaSafe, 'No hay alquileres registrados.');
    
    // 2. Renderizar Rack
    renderSafeRack();
    
    // 3. Totales
    actualizarTotalesSafe(rentals);
}

/**
 * RENDERIZAR FILA SAFE (Helper para renderTable)
 */
function renderFilaSafe(data) {
    const h = data.habitacion;
    const dias = calcularDias(data.fechaInicio);
    const precio = APP_CONFIG.SAFE?.PRECIO_DIARIO || 2.00;
    const total = dias * precio;

    return `
        <tr>
            <td class="fw-bold text-primary">${h}</td>
            <td>${data.nombre}</td>
            <td>${Utils.formatDate(data.fechaInicio)}</td>
            <td><span class="badge bg-light text-dark border">${dias} días</span></td>
            <td class="fw-bold text-success">${Utils.formatCurrency(total)}</td>
            <td class="small text-muted">
                ${data.comentario || ''}
                <div class="text-info mt-1" style="font-size: 0.65rem;">
                    <i class="bi bi-person-fill me-1"></i>${data.autor || 'N/A'}
                </div>
            </td>
            <td class="text-end">
                <button onclick="prepararEdicionSafe('${h}')" class="btn btn-sm btn-outline-primary border-0 me-1"><i class="bi bi-pencil"></i></button>
                <button onclick="finalizarAlquiler('${h}')" class="btn btn-sm btn-outline-danger border-0"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
}

/**
 * VISTA RACK DE CAJAS FUERTES
 * Muestra el hotel planta por planta, marcando en azul las habitaciones que 
 * tienen el servicio de caja fuerte activo en el momento.
 */
function renderSafeRack() {
    const rackCont = document.getElementById('rack-safe-habitaciones');
    if (!rackCont) return;

    const rentals = safeService.getRentals();
    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;
    
    let html = '';
    rangos.forEach(r => {
        html += `<div class="w-100 mt-3 mb-2 d-flex align-items-center"><span class="badge bg-secondary me-2">Planta ${r.planta}</span><hr class="flex-grow-1 my-0 opacity-25"></div>`;

        for (let i = r.min; i <= r.max; i++) {
            const num = i.toString().padStart(3, '0');
            const data = rentals.find(item => item.habitacion === num);
            const colorClass = data ? 'bg-info text-white' : 'bg-white text-muted border';

            html += `
                <div class="d-flex align-items-center justify-content-center rounded rack-box ${colorClass}" 
                     data-bs-toggle="tooltip" data-bs-title="${data ? data.nombre + ' (Desde: ' + Utils.formatDate(data.fechaInicio) + ')' + (data.comentario ? ' | Obs: ' + data.comentario : '') : 'Libre'}">
                    ${num}
                </div>`;
        }
    });
    
    rackCont.innerHTML = html;
}

/**
 * Actualiza los totales y la gráfica de estadísticas de cajas fuertes.
 * @param {Array} rentals - La lista actual de alquileres de cajas fuertes.
 */
function actualizarTotalesSafe(rentals) {
    const statsCont = document.getElementById('safe-stats');
    if (!statsCont) return;

    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;
    const totalHabs = rangos.reduce((acc, r) => acc + (r.max - r.min + 1), 0);
    const habsConSafe = rentals.length;
    const habsSinSafe = totalHabs - habsConSafe;
    let totalRecaudado = 0;

    rentals.forEach(data => {
        totalRecaudado += calcularDias(data.fechaInicio) * (APP_CONFIG.SAFE?.PRECIO_DIARIO || 2.00);
    });

    statsCont.innerHTML = `
        <div class="col-md-3">
            <div class="p-2 border rounded bg-white text-center h-100 d-flex flex-column align-items-center justify-content-center">
                <div style="height: 80px; width: 100%;"><canvas id="safeChart"></canvas></div>
                <small class="text-muted fw-bold" style="font-size: 0.6rem;">DISTRIBUCIÓN</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="p-2 border rounded bg-primary text-white text-center h-100 d-flex flex-column justify-content-center">
                <div class="small fw-bold opacity-75" style="font-size: 0.6rem;">RECAUDACIÓN ESTIMADA</div>
                <div class="h4 mb-0 fw-bold">${Utils.formatCurrency(totalRecaudado)}</div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="p-2 border rounded bg-white text-center h-100 d-flex flex-column justify-content-center">
                <div class="small text-muted fw-bold" style="font-size: 0.6rem;">SAFES ALQUILADOS</div>
                <div class="h4 mb-0 fw-bold text-dark">${habsConSafe}</div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="p-2 border rounded bg-white text-center h-100 d-flex flex-column justify-content-center">
                <div class="small text-muted fw-bold" style="font-size: 0.6rem;">HAB. SIN SAFE</div>
                <div class="h4 mb-0 fw-bold text-muted">${habsSinSafe}</div>
            </div>
        </div>`;

    const ctx = document.getElementById('safeChart')?.getContext('2d');
    if (ctx) {
        if (safeChartInstance) safeChartInstance.destroy();
        safeChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Con Safe', 'Sin Safe'],
                datasets: [{
                    data: [habsConSafe, habsSinSafe],
                    backgroundColor: ['#0d6efd', '#dee2e6'],
                    borderWidth: 1
                }]
            },
            options: { cutout: '70%', plugins: { legend: { display: false } }, maintainAspectRatio: false }
        });
    }
}

// ============================================================================
// ACCIONES GLOBALES
// ============================================================================

function imprimirSafe() {
    const user = Utils.validateUser();
    if (!user) return;

    Ui.preparePrintReport({
        dateId: 'print-date-safe',
        memberId: 'print-repc-nombre-safe',
        memberName: user
    });
    window.print();
}

window.prepararEdicionSafe = (hab) => {
    const data = safeService.getByHab(hab);
    if (data) {
        Utils.setVal('safe_hab', hab);
        Utils.setVal('safe_nombre', data.nombre);
        Utils.setVal('safe_fecha_inicio', data.fechaInicio);
        Utils.setVal('safe_comentario', data.comentario || '');

        const btnSubmit = document.querySelector('#formNuevoSafe button[type="submit"]');
        if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Actualizar Alquiler';
        cambiarVistaSafe('trabajo');
    }
};

window.finalizarAlquiler = async (hab) => {
    if (await Ui.showConfirm(`¿Finalizar alquiler de la habitación ${hab}?`)) {
        await safeService.removeRental(hab);
        Ui.showToast("Alquiler finalizado.");
        mostrarSafeRentals();
    }
};

window.imprimirSafe = imprimirSafe;
window.renderVistaRackSafe = renderSafeRack; // Fix ReferenceError