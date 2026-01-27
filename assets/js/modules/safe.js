import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
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

export function inicializarSafe() {
    const form = document.getElementById('formNuevoSafe');
    if (form) {
        form.removeEventListener('submit', manejarSubmitSafe); // Evitar duplicados
        form.addEventListener('submit', manejarSubmitSafe);
        Utils.setVal('safe_fecha_inicio', Utils.getTodayISO());
    }

    // Configurar botones de vista
    document.getElementById('btnVistaTrabajoSafe')?.addEventListener('click', () => cambiarVistaSafe('trabajo'));
    document.getElementById('btnVistaRackSafe')?.addEventListener('click', () => cambiarVistaSafe('rack'));

    // Poblar datalist de habitaciones
    const datalist = document.getElementById('lista-habs-safe');
    if (datalist) {
        datalist.innerHTML = '';
        Utils.getHabitaciones().forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.num;
            datalist.appendChild(opt);
        });
    }

    mostrarSafeRentals();
}

function cambiarVistaSafe(vista) {
    const btnTrabajo = document.getElementById('btnVistaTrabajoSafe');
    const btnRack = document.getElementById('btnVistaRackSafe');
    const divTrabajo = document.getElementById('safe-trabajo');
    const divRack = document.getElementById('safe-rack');

    if (vista === 'trabajo') {
        btnTrabajo.classList.add('active');
        btnRack.classList.remove('active');
        divTrabajo.classList.remove('d-none');
        divRack.classList.add('d-none');
        mostrarSafeRentals();
    } else {
        btnTrabajo.classList.remove('active');
        btnRack.classList.add('active');
        divTrabajo.classList.add('d-none');
        divRack.classList.remove('d-none');
        renderVistaRackSafe();
    }
}

// ============================================================================
// HANDLERS
// ============================================================================

function manejarSubmitSafe(e) {
    e.preventDefault();

    // 1. Validar Usuario
    const autor = Utils.validateUser();
    if (!autor) return;

    // 2. Validar Inputs
    const habNum = document.getElementById('safe_hab').value.trim().padStart(3, '0');
    const nombre = document.getElementById('safe_nombre').value.trim();
    const fechaInicio = document.getElementById('safe_fecha_inicio').value;
    const comentario = document.getElementById('safe_comentario').value.trim();

    const validHabs = Utils.getHabitaciones().map(h => h.num);
    if (!validHabs.includes(habNum)) {
        alert(`Error: La habitación ${habNum} no existe.`);
        return;
    }

    // 3. Guardar
    safeService.saveRental({
        habitacion: habNum,
        nombre,
        fechaInicio,
        comentario,
        autor
    });

    // 4. Reset
    e.target.reset();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-save-fill me-2"></i>Guardar';
    Utils.setVal('safe_fecha_inicio', Utils.getTodayISO());
    mostrarSafeRentals();
}

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

function mostrarSafeRentals() {
    const tabla = document.getElementById('tablaSafeActivos');
    if (!tabla) return;

    const rentals = safeService.getRentals();
    rentals.sort((a, b) => a.habitacion.localeCompare(b.habitacion));

    tabla.innerHTML = '';

    rentals.forEach(data => {
        const dias = calcularDias(data.fechaInicio);
        const total = dias * (APP_CONFIG.SAFE?.PRECIO_DIARIO || 2.00);

        tabla.innerHTML += `
            <tr>
                <td class="fw-bold text-primary">${data.habitacion}</td>
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
                    <button onclick="prepararEdicionSafe('${data.habitacion}')" class="btn btn-sm btn-outline-primary border-0 me-1"><i class="bi bi-pencil"></i></button>
                    <button onclick="eliminarSafe('${data.habitacion}')" class="btn btn-sm btn-outline-danger border-0"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
    });
}

/**
 * VISTA RACK DE CAJAS FUERTES
 * Muestra el hotel planta por planta, marcando en azul las habitaciones que 
 * tienen el servicio de caja fuerte activo en el momento.
 */
function renderVistaRackSafe() {
    const rackCont = document.getElementById('rack-safe-habitaciones');
    const statsCont = document.getElementById('safe-stats');
    if (!rackCont || !statsCont) return;

    const rentals = safeService.getRentals();
    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;
    const totalHabs = rangos.reduce((acc, r) => acc + (r.max - r.min + 1), 0);
    const habsConSafe = rentals.length;
    const habsSinSafe = totalHabs - habsConSafe;
    let totalRecaudado = 0;

    let html = '';
    rangos.forEach(r => {
        html += `<div class="w-100 mt-3 mb-2 d-flex align-items-center"><span class="badge bg-secondary me-2">Planta ${r.planta}</span><hr class="flex-grow-1 my-0 opacity-25"></div>`;

        for (let i = r.min; i <= r.max; i++) {
            const num = i.toString().padStart(3, '0');
            const data = rentals.find(item => item.habitacion === num);
            const colorClass = data ? 'bg-info text-white' : 'bg-white text-muted border';

            if (data) totalRecaudado += calcularDias(data.fechaInicio) * (APP_CONFIG.SAFE?.PRECIO_DIARIO || 2.00);

            html += `
                <div class="d-flex align-items-center justify-content-center rounded rack-box ${colorClass}" 
                     data-bs-toggle="tooltip" data-bs-title="${data ? data.nombre + ' (Desde: ' + Utils.formatDate(data.fechaInicio) + ')' + (data.comentario ? ' | Obs: ' + data.comentario : '') : 'Libre'}">
                    ${num}
                </div>`;
        }
    });
    
    rackCont.innerHTML = html;

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
    Utils.printSection('print-date-safe', 'print-repc-nombre-safe', user);
}

window.prepararEdicionSafe = (hab) => {
    const data = safeService.getRentalByHab(hab);
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

window.eliminarSafe = async (hab) => {
    if (await window.showConfirm(`¿Finalizar alquiler de la habitación ${hab}?`)) {
        safeService.removeRental(hab);
        mostrarSafeRentals();
    }
};

window.imprimirSafe = imprimirSafe;