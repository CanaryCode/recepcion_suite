/**
 * MÓDULO DE LOGÍSTICA DE TRANSFERS (transfers.js)
 * ----------------------------------------------
 * Gestiona las reservas de taxis, buses o transporte privado para clientes.
 * Permite emitir tickets impresos para el cliente y sincroniza las salidas 
 * del día con el panel de control (Dashboard).
 */

import { Utils } from '../core/Utils.js';
import { APP_CONFIG } from '../core/Config.js';
import { Ui } from '../core/Ui.js';
import { transfersService } from '../services/TransfersService.js';
import { PdfService } from '../core/PdfService.js';

let transferParaImprimir = null; // Objeto temporal para el ticket

// ============================================================================
// ============================================================================
// INICIALIZACIÓN
// ============================================================================

export async function inicializarTransfers() {
    await transfersService.init();

    // 0. POBLAR DESTINOS DESDE APP_CONFIG
    const destinoSelect = document.getElementById('transfer_destino_select');
    if (destinoSelect) {
        const destinos = APP_CONFIG.TRANSFERS?.DESTINOS || ["Aeropuerto Norte", "Aeropuerto Sur"];
        // Limpiar opciones previas (excepto el "OTRO" si existe o resetear todo)
        destinoSelect.innerHTML = '<option value="" selected disabled>Seleccionar destino...</option>';
        destinos.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            destinoSelect.appendChild(opt);
        });
        const optOtro = document.createElement('option');
        optOtro.value = 'OTRO';
        optOtro.textContent = 'OTRO (Especificar)';
        destinoSelect.appendChild(optOtro);
    }

    // 1. CONFIGURAR VISTAS (Conmutador)
    Ui.setupViewToggle({
        buttons: [
            { id: 'btnVistaListaTransfers', viewId: 'transfers-lista-view', onShow: mostrarTransfers },
            { id: 'btnVistaFormTransfers', viewId: 'transfers-form-view', onShow: () => {
                // Reset form if new
                if (!document.getElementById('transfer_id').value) {
                    const form = document.getElementById('formTransfer');
                    form?.reset();
                    document.getElementById('transfer_destino_custom').classList.add('d-none');
                }
            }}
        ]
    });

    // 2. CONFIGURAR FORMULARIO (Ui core)
    Ui.handleFormSubmission({
        formId: 'formTransfer',
        service: transfersService,
        idField: 'id',
        mapData: (rawData) => {
            const autor = Utils.validateUser();
            if (!autor) return null;

            const id = rawData.transfer_id;
            const selectDestino = document.getElementById('transfer_destino_select');
            const inputDestino = document.getElementById('transfer_destino_custom');
            
            let destino = selectDestino.value;
            if (destino === 'OTRO') {
                destino = inputDestino.value.trim();
            }

            if (!rawData.transfer_hab || !destino || !rawData.transfer_hora) {
                Ui.showToast("Rellene Habitación, Hora y Destino.", "warning");
                return null;
            }

            return {
                id: id ? parseInt(id) : Date.now(),
                fecha: rawData.transfer_fecha,
                hora: rawData.transfer_hora,
                hab: rawData.transfer_hab.trim(),
                tipo: rawData.transfer_tipo,
                pax: rawData.transfer_pax,
                destino: destino,
                notas: rawData.transfer_notas.trim(),
                autor: autor,
                creadoEn: new Date().toISOString()
            };
        },
        onSuccess: (data, isEdit) => {
            Ui.showToast(isEdit ? "Reserva actualizada." : "Reserva creada.", "success");
            const inputDestino = document.getElementById('transfer_destino_custom');
            if (inputDestino) inputDestino.classList.add('d-none');
            const btnSubmit = document.getElementById('btnSubmitTransfer');
            if (btnSubmit) btnSubmit.innerHTML = '<i class="bi bi-save-fill me-2"></i>Guardar Reserva';
            cambiarVistaTransfers('lista');
        }
    });

    // Selector de destino
    const destinoInput = document.getElementById('transfer_destino_custom');
    if (destinoSelect && destinoInput) {
        destinoSelect.addEventListener('change', (e) => {
            const isOtro = e.target.value === 'OTRO';
            destinoInput.classList.toggle('d-none', !isOtro);
            destinoInput.disabled = !isOtro;
            destinoInput.required = isOtro;
            if (isOtro) destinoInput.focus();
        });
    }

    // Default Date (Tomorrow)
    const dateInput = document.getElementById('transfer_fecha');
    if (dateInput && !dateInput.value) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    mostrarTransfers();
    setupIntersectionObserverTransfers();
}

/**
 * Función global para facilitar el cambio programático
 */
window.cambiarVistaTransfers = (vista) => {
    const btn = vista === 'lista' ? 'btnVistaListaTransfers' : 'btnVistaFormTransfers';
    document.getElementById(btn)?.click();
};

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * @deprecated Usando Ui.handleFormSubmission
 */
function manejarSubmitTransfer(e) { }

// ============================================================================
// RENDER
// ============================================================================

// ============================================================================
// PAGINACIÓN Y RENDERIZADO (LAZY LOAD)
// ============================================================================

// ============================================================================
// PAGINACIÓN Y RENDERIZADO (LAZY LOAD)
// ============================================================================

let currentFilteredTransfers = [];
let visibleCountTransfers = 50;
const PAGE_SIZE_TRANSFERS = 50;
let infiniteScrollControllerTransfers = null;

function setupIntersectionObserverTransfers() {
    infiniteScrollControllerTransfers = Ui.infiniteScroll({
        onLoadMore: window.cargarMasTransfers,
        sentinelId: 'sentinel-loader-transfers'
    });
}

/**
 * RENDER LÓGICO DE TRANSFERS (Controller)
 * Prepara los datos, limpia antiguos y actualiza dashboard.
 */
function mostrarTransfers() {
    // Clean old
    transfersService.cleanupOld(3); // Keep 3 days of history
    
    // Obtener todos
    let items = transfersService.getTransfers();
    const busqueda = document.getElementById('transfersSearch')?.value.toLowerCase() || '';

    // Filter
    if (busqueda) {
        items = items.filter(t => t.hab.toLowerCase().includes(busqueda) || t.destino.toLowerCase().includes(busqueda));
    }
    
    currentFilteredTransfers = [...items];
    
    // Actualizar Widget Dashboard
    actualizarDashboardTransfers();

    // Resetear paginación y renderizar lista
    visibleCountTransfers = PAGE_SIZE_TRANSFERS;
    renderListaTransfers(false);
}

/**
 * DIBUJAR TABLA DE TRANSFERS (View)
 * Soporta append para Infinite Scroll.
 */
function renderListaTransfers(append = false) {
    const total = currentFilteredTransfers.length;
    const start = append ? Math.max(0, visibleCountTransfers - PAGE_SIZE_TRANSFERS) : 0;
    const end = Math.min(visibleCountTransfers, total);
    const slice = currentFilteredTransfers.slice(start, end);

    Ui.renderTable('tablaTransfersCuerpo', slice, renderFilaTransfer, 'No se encontraron reservas.', append);

    if (visibleCountTransfers < total) {
        const sentinelRow = Ui.createSentinelRow('sentinel-loader-transfers', 'Cargando reservas...', 7);
        const contenedor = document.getElementById('tablaTransfersCuerpo');
        if (contenedor) contenedor.appendChild(sentinelRow);
        if (infiniteScrollControllerTransfers) infiniteScrollControllerTransfers.reconnect();
    }
}

/**
 * RENDERIZAR FILA DE TRANSFER (Helper para renderTable)
 */
function renderFilaTransfer(t) {
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = t.fecha === todayStr;
    const rowClass = isToday ? 'table-info bg-opacity-10' : '';
    
    return `
        <tr class="${rowClass}">
            <td class="ps-4">
                <div class="fw-bold text-dark">${Utils.formatDate(t.fecha)}</div>
                <div class="fs-5 text-primary fw-bold font-monospace">${t.hora}</div>
            </td>
            <td><span class="badge bg-secondary fs-6">${t.hab}</span></td>
            <td>
                ${getIconoTipo(t.tipo)} <span class="small fw-bold">${t.tipo}</span>
            </td>
            <td>${t.pax}</td>
            <td>
                <div class="fw-bold">${t.destino}</div>
                ${t.notas ? `<div class="small text-muted fst-italic"><i class="bi bi-info-circle me-1"></i>${t.notas}</div>` : ''}
            </td>
            <td><small class="text-muted">${t.autor}</small></td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-dark me-1" onclick="imprimirTransferTicket(${t.id})" data-bs-toggle="tooltip" title="Imprimir Ticket">
                    <i class="bi bi-printer-fill"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editarTransfer(${t.id})" data-bs-toggle="tooltip" title="Editar">
                    <i class="bi bi-pencil-fill"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarTransfer(${t.id})" data-bs-toggle="tooltip" title="Eliminar">
                    <i class="bi bi-trash-fill"></i>
                </button>
            </td>
        </tr>`;
}

window.cargarMasTransfers = function() {
    if (visibleCountTransfers >= currentFilteredTransfers.length) return;
    visibleCountTransfers += PAGE_SIZE_TRANSFERS;
    renderListaTransfers(true);
};

/**
 * Actualiza el widget de Transfers en el Dashboard principal ("Resumen del Día")
 */
function actualizarDashboardTransfers() {
    const todayStr = new Date().toISOString().split('T')[0];
    const all = transfersService.getTransfers();
    const todayTransfers = all.filter(t => t.fecha === todayStr)
        .sort((a, b) => a.hora.localeCompare(b.hora));

    Ui.updateDashboardWidget('transfers', todayTransfers, (t) => `
        <tr style="cursor: pointer;" onclick="navegarA('#transfers-content'); cambiarVistaTransfers('lista')">
            <td>
                <div class="fw-bold text-dark" style="font-size: 0.75rem;">${t.hora} <span class="badge bg-light text-dark border ms-1">${t.hab}</span></div>
                <div class="small text-muted text-truncate" style="max-width: 120px;">${getIconoTipo(t.tipo)} ${t.destino}</div>
            </td>
            <td class="text-end align-middle">
                <span class="badge bg-primary rounded-pill">${t.pax}</span>
            </td>
        </tr>`);

    if (window.checkDailySummaryVisibility) window.checkDailySummaryVisibility();
}

function getIconoTipo(tipo) {
    switch (tipo) {
        case 'TAXI': return '<i class="bi bi-taxi-front text-warning me-1"></i>';
        case 'BUS': return '<i class="bi bi-bus-front text-info me-1"></i>';
        default: return '<i class="bi bi-car-front-fill text-dark me-1"></i>';
    }
}

// ============================================================================
// GLOBAL ACTIONS
// ============================================================================

window.editarTransfer = (id) => {
    const item = transfersService.getByKey(id);
    if (item) {
        document.getElementById('transfer_id').value = item.id;
        document.getElementById('transfer_fecha').value = item.fecha;
        document.getElementById('transfer_hora').value = item.hora;
        document.getElementById('transfer_hab').value = item.hab;
        document.getElementById('transfer_tipo').value = item.tipo;
        document.getElementById('transfer_pax').value = item.pax;
        
        // LOGICA INTELIGENTE PARA POBLAR EL DESTINO EN EDICIÓN
        const selectDestino = document.getElementById('transfer_destino_select');
        const inputDestino = document.getElementById('transfer_destino_custom');
        
        const destinos = APP_CONFIG.TRANSFERS?.DESTINOS || ["Aeropuerto Norte", "Aeropuerto Sur"];
        
        if (destinos.includes(item.destino)) {
            selectDestino.value = item.destino;
            inputDestino.classList.add('d-none');
            inputDestino.disabled = true;
            inputDestino.value = '';
        } else {
            selectDestino.value = 'OTRO';
            inputDestino.classList.remove('d-none');
            inputDestino.disabled = false;
            inputDestino.value = item.destino;
        }

        document.getElementById('transfer_notas').value = item.notas || '';
        const btn = document.getElementById('btnSubmitTransfer');
        if (btn) btn.innerHTML = '<i class="bi bi-save-fill me-2"></i>Actualizar Reserva';
        
        cambiarVistaTransfers('form');
    }
};

window.eliminarTransfer = async (id) => {
    if (await Ui.showConfirm("¿Eliminar esta reserva?")) {
        transfersService.deleteTransfer(id);
        mostrarTransfers();
    }
};

/**
 * IMPRIMIR TICKET DE CLIENTE
 * Genera el documento que se entrega al huésped con los detalles de su reserva.
 */
window.imprimirTransferTicket = (id) => {
    const item = transfersService.getById(id);
    if (!item) return;

    // Fill print section
    document.getElementById('print_transfer_fecha').textContent = Utils.formatDate(item.fecha);
    document.getElementById('print_transfer_hora').textContent = item.hora;
    document.getElementById('print_transfer_hab').textContent = item.hab;
    document.getElementById('print_transfer_tipo').textContent = item.tipo;
    document.getElementById('print_transfer_destino').textContent = item.destino;
    document.getElementById('print_transfer_pax').textContent = item.pax;
    document.getElementById('print_transfer_notas').textContent = item.notas || 'Sin observaciones';

    // Print
    const user = Utils.validateUser(); // Just to check auth, nickname not used on ticket for guest
    if (user) {
        window.print();
    }
};

window.filtrarTransfers = mostrarTransfers;
window.cambiarVistaTransfers = cambiarVistaTransfers;

/**
 * IMPRIMIR LISTADO DE TRANSFERS (PdfService)
 * Genera un informe PDF profesional con el listado de todos los transfers filtrados.
 */
async function imprimirTransfers() {
    const user = Utils.validateUser();
    if (!user) return;
    
    // Preparar el reporte de impresión (Metadatos)
    Ui.preparePrintReport({
        dateId: 'print-date-transfers',
        memberId: 'print-repc-nombre-transfers',
        memberName: user
    });

    const sourceView = document.getElementById('transfers-lista-view'); // O el contenedor de impresión específico
    if (!sourceView) {
        Ui.showToast("No se encontró la vista para imprimir.", "danger");
        return;
    }

    // Notificar al usuario
    Ui.showToast("Generando listado de transfers en PDF...", "info");

    const exito = await PdfService.generateReport({
        title: "LISTADO OPERATIVO DE TRANSFERS",
        author: user,
        htmlContent: sourceView.innerHTML,
        filename: `TRANSFERS_${Utils.getTodayISO()}.pdf`,
        metadata: {
            "Total Registros": currentFilteredTransfers.length
        }
    });

    if (exito) {
        Ui.showToast("Reporte de transfers generado.", "success");
    } else {
        // Fallback a impresión nativa si falla el servicio
        window.print();
    }
}
window.imprimirTransfers = imprimirTransfers;
