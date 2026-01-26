import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { estanciaService } from '../services/EstanciaService.js';
import { sessionService } from '../services/SessionService.js';

/**
 * MÓDULO DE CONTROL DE ESTANCIA (OCUPACIÓN)
 * ----------------------------------------
 * Registra diariamente cuántas habitaciones están ocupadas para generar estadísticas.
 * Permite visualizar la evolución mediante gráficas de Chart.js y exportar datos a Excel.
 */

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
let chartEstancia = null; // Instancia de la gráfica actual

export function inicializarEstancia() {
    const form = document.getElementById('formEstancia');
    if (form) {
        form.addEventListener('submit', manejarSubmitEstancia);
        const now = new Date();
        document.getElementById('estancia_fecha').value = now.toISOString().split('T')[0];
    }

    // Configurar el botón de bloqueo de fecha
    document.getElementById('btnToggleLockFecha')?.addEventListener('click', toggleLockFecha);

    // --- BARRA DE HERRAMIENTAS UNIFICADA ---
    document.getElementById('estancia-trabajo')?.classList.add('content-panel');
    document.getElementById('estancia-graficas')?.classList.add('content-panel');

    document.getElementById('btnVistaTrabajoEstancia')?.addEventListener('click', () => cambiarVistaEstancia('trabajo'));
    document.getElementById('btnVistaGraficasEstancia')?.addEventListener('click', () => cambiarVistaEstancia('graficas'));

    // Poblar filtro de años
    const yearSelect = document.getElementById('filtroYearEstancia');
    if (yearSelect) {
        yearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= currentYear - 5; i--) {
            const opt = document.createElement('option');
            opt.value = i; opt.innerText = i;
            yearSelect.appendChild(opt);
        }
    }

    const monthSelect = document.getElementById('filtroMonthEstancia');
    if (monthSelect) monthSelect.value = new Date().getMonth();

    // Agregar listeners a filtros
    yearSelect?.addEventListener('change', mostrarEstancia);
    monthSelect?.addEventListener('change', mostrarEstancia);

    mostrarEstancia();
}

/**
 * BLOQUEO DE FECHA
 * Por seguridad, la fecha siempre es la de hoy. Este botón permite "desbloquearla" 
 * para introducir datos de días pasados que se olvidaron registrar.
 */
function toggleLockFecha() {
    const input = document.getElementById('estancia_fecha');
    const icon = document.getElementById('iconLockFecha');
    if (input && icon) {
        const isReadonly = input.hasAttribute('readonly');
        if (isReadonly) {
            input.removeAttribute('readonly');
            icon.className = 'bi bi-unlock-fill text-warning';
        } else {
            input.setAttribute('readonly', true);
            icon.className = 'bi bi-lock-fill';
        }
    }
}

function cambiarVistaEstancia(vista) {
    const btnTrabajo = document.getElementById('btnVistaTrabajoEstancia');
    const btnGraficas = document.getElementById('btnVistaGraficasEstancia');
    const divTrabajo = document.getElementById('estancia-trabajo');
    const divGraficas = document.getElementById('estancia-graficas');

    if (vista === 'trabajo') {
        btnTrabajo.classList.add('active'); btnGraficas.classList.remove('active');
        divTrabajo.classList.remove('d-none'); divGraficas.classList.add('d-none');
    } else {
        btnTrabajo.classList.remove('active'); btnGraficas.classList.add('active');
        divTrabajo.classList.add('d-none'); divGraficas.classList.remove('d-none');
        renderGraficaEstancia();
    }
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GUARDAR REGISTRO
 * Calcula habitaciones vacías restando del total y guarda en el servicio.
 */
function manejarSubmitEstancia(e) {
    e.preventDefault();
    const fecha = document.getElementById('estancia_fecha').value;
    const ocupadas = parseInt(document.getElementById('estancia_ocupadas').value) || 0;

    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;
    const totalHab = rangos.reduce((acc, r) => acc + (r.max - r.min + 1), 0);
    const vacias = totalHab - ocupadas;

    estanciaService.saveRegistro({ fecha, ocupadas, vacias, totalHab });

    window.showAlert("Registro guardado correctamente.", "success");

    mostrarEstancia();
    e.target.reset();

    // Resetear bloqueo y fecha a hoy por seguridad
    document.getElementById('estancia_fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('estancia_fecha').setAttribute('readonly', true);
    const icon = document.getElementById('iconLockFecha');
    if (icon) icon.className = 'bi bi-lock-fill';
}

// ============================================================================
// RENDERIZADO
// ============================================================================

/**
 * RENDERIZAR TABLA MENSUAL
 * Muestra el listado de todos los días del mes y sus porcentajes de ocupación.
 */
function mostrarEstancia() {
    const tabla = document.getElementById('tablaEstanciaCuerpo');
    const pie = document.getElementById('tablaEstanciaPie');
    const yearSelect = document.getElementById('filtroYearEstancia');
    const monthSelect = document.getElementById('filtroMonthEstancia');

    if (!tabla || !yearSelect || !monthSelect) return;
    const year = yearSelect.value;
    const month = monthSelect.value; // 0-11

    // Obtener registros y mapear
    const monthRegistros = estanciaService.getByMonth(year, month);
    const dataByDay = {};
    monthRegistros.forEach(r => {
        const d = parseInt(r.fecha.split('-')[2]);
        dataByDay[d] = r;
    });

    tabla.innerHTML = '';
    let sumaOcupadas = 0, sumaVacias = 0, sumaTotal = 0, diasContados = 0;
    const diasEnMes = new Date(year, parseInt(month) + 1, 0).getDate();

    for (let d = 1; d <= diasEnMes; d++) {
        const data = dataByDay[d];
        if (data) {
            const libres = data.totalHab - data.ocupadas - data.vacias;
            const porcentaje = ((data.ocupadas / data.totalHab) * 100).toFixed(1);

            sumaOcupadas += data.ocupadas;
            sumaVacias += data.vacias;
            sumaTotal += data.totalHab;
            diasContados++;

            tabla.innerHTML += `
                <tr>
                    <td class="fw-bold text-start ps-4">Día ${d}</td>
                    <td>${data.ocupadas}</td>
                    <td>${data.vacias}</td>
                    <td>${libres}</td>
                    <td><span class="badge bg-primary">${porcentaje}%</span></td>
                    <td class="text-end pe-4">
                        <button onclick="eliminarDiaEstancia('${data.fecha}')" class="btn btn-sm btn-link text-danger p-0" data-bs-toggle="tooltip" data-bs-title="Eliminar Registro"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
        } else {
            tabla.innerHTML += `<tr class="text-muted opacity-50"><td class="text-start ps-4">Día ${d}</td><td colspan="5">Sin registro</td></tr>`;
        }
    }

    if (diasContados > 0) {
        const promOcupacion = ((sumaOcupadas / sumaTotal) * 100).toFixed(1);
        pie.innerHTML = `
            <tr>
                <td class="text-start ps-4">PROMEDIO MENSUAL</td>
                <td>${sumaOcupadas}</td>
                <td>${sumaVacias}</td>
                <td>${sumaTotal - sumaOcupadas - sumaVacias}</td>
                <td>${promOcupacion}%</td>
                <td></td>
            </tr>`;
        renderStatsAnual(year, promOcupacion, sumaOcupadas, diasContados);
    } else {
        pie.innerHTML = '';
        renderStatsAnual(year, 0, 0, 0); // Limpiar stats
    }
}

/**
 * WIDGETS DE ESTADÍSTICAS
 * Renderiza el resumen visual con ocupación media y pernoctaciones totales.
 */
function renderStatsAnual(year, promMes, totalPernoctaciones, dias) {
    const statsCont = document.getElementById('estancia_anual_stats');
    if (!statsCont) return;
    statsCont.innerHTML = `
        <div class="card-body p-4 text-center">
            <div class="mb-4">
                <div class="small text-uppercase fw-bold opacity-75">Ocupación Media Mes</div>
                <div class="display-5 fw-bold">${promMes}%</div>
            </div>
            <div class="mb-4">
                <div class="small text-uppercase fw-bold opacity-75">Total Pernoctaciones</div>
                <div class="display-6 fw-bold">${totalPernoctaciones}</div>
            </div>
            <div>
                <div class="small text-uppercase fw-bold opacity-75">Días Registrados</div>
                <div class="h4 mb-0 fw-bold">${dias} días</div>
            </div>
        </div>`;
}

/**
 * DIBUJAR GRÁFICA EVOLUTIVA
 * Usa Chart.js para mostrar una línea con la ocupación del mes seleccionado.
 */
function renderGraficaEstancia() {
    const ctx = document.getElementById('chartEstanciaEvolucion')?.getContext('2d');
    if (!ctx) return;

    const year = document.getElementById('filtroYearEstancia').value;
    const month = document.getElementById('filtroMonthEstancia').value;

    const monthRegistros = estanciaService.getByMonth(year, month);
    const dataByDay = {};
    monthRegistros.forEach(r => {
        const d = parseInt(r.fecha.split('-')[2]);
        dataByDay[d] = r;
    });

    const labels = [];
    const dataPoints = [];
    const diasEnMes = new Date(year, parseInt(month) + 1, 0).getDate();

    for (let d = 1; d <= diasEnMes; d++) {
        labels.push(d);
        const dData = dataByDay[d];
        dataPoints.push(dData ? ((dData.ocupadas / dData.totalHab) * 100).toFixed(1) : null);
    }

    if (chartEstancia) chartEstancia.destroy();
    chartEstancia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ocupación %',
                data: dataPoints,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                fill: true,
                tension: 0.3,
                spanGaps: true
            }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// ============================================================================
// ACCIONES GLOBALES
// ============================================================================

export function exportarEstanciaExcel() {
    const yearSelect = document.getElementById('filtroYearEstancia');
    const monthSelect = document.getElementById('filtroMonthEstancia');
    if (!yearSelect || !monthSelect) return;

    const year = yearSelect.value;
    const month = monthSelect.value;

    const monthRegistros = estanciaService.getByMonth(year, month);
    const dataByDay = {};
    monthRegistros.forEach(r => {
        const d = parseInt(r.fecha.split('-')[2]);
        dataByDay[d] = r;
    });

    let csv = "\ufeffDia;Ocupadas;Vacias;Libres;Porcentaje\n";
    const diasEnMes = new Date(year, parseInt(month) + 1, 0).getDate();

    for (let d = 1; d <= diasEnMes; d++) {
        const data = dataByDay[d];
        if (data) {
            const libres = data.totalHab - data.ocupadas - data.vacias;
            const porcentaje = ((data.ocupadas / data.totalHab) * 100).toFixed(1);
            csv += `${d};${data.ocupadas};${data.vacias};${libres};${porcentaje}%\n`;
        }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Estancia_${MESES[month]}_${year}.csv`;
    link.click();
}

function imprimirEstancia() {
    const user = Utils.validateUser();
    if (!user) return;
    Utils.printSection('print-date-estancia', 'print-repc-nombre-estancia', user);
}

window.eliminarDiaEstancia = async (fecha) => {
    if (await window.showConfirm(`¿Eliminar el registro de fecha ${fecha}?`)) {
        estanciaService.removeRegistro(fecha);
        mostrarEstancia();
    }
};

window.mostrarEstancia = mostrarEstancia;
window.exportarEstanciaExcel = exportarEstanciaExcel;
window.cambiarVistaEstancia = cambiarVistaEstancia;
window.imprimirEstancia = imprimirEstancia;