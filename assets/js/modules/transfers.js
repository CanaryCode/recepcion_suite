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

let transferParaImprimir = null; // Objeto temporal para el ticket

// ============================================================================
// ============================================================================
// INICIALIZACIÓN
// ============================================================================

export async function inicializarTransfers() {
    // Garantizar carga autoritativa
    await transfersService.init();

    // Configurar Event Listeners
    const form = document.getElementById('formTransfer');
    if (form) {
        form.removeEventListener('submit', manejarSubmitTransfer);
        form.addEventListener('submit', manejarSubmitTransfer);
    }

    // LISTENER PARA EL SELECTOR DE DESTINO
    const destinoSelect = document.getElementById('transfer_destino_select');
    const destinoInput = document.getElementById('transfer_destino_custom');
    
    if (destinoSelect && destinoInput) {
        destinoSelect.addEventListener('change', (e) => {
            if (e.target.value === 'OTRO') {
                destinoInput.classList.remove('d-none');
                destinoInput.disabled = false;
                destinoInput.required = true;
                destinoInput.focus();
            } else {
                destinoInput.classList.add('d-none');
                destinoInput.disabled = true;
                destinoInput.required = false;
                destinoInput.value = '';
            }
        });
    }

    // Set default date to tomorrow for convenience
    const dateInput = document.getElementById('transfer_fecha');
    if (dateInput && !dateInput.value) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    // Initial Render
    // Initial Render
    mostrarTransfers();
    setupIntersectionObserverTransfers();
}

function cambiarVistaTransfers(vista) {
    const vistaLista = document.getElementById('transfers-lista-view');
    const vistaForm = document.getElementById('transfers-form-view');
    const btnLista = document.getElementById('btnVistaListaTransfers');
    const btnForm = document.getElementById('btnVistaFormTransfers');

    if (!vistaLista || !vistaForm) return;

    if (vista === 'lista') {
        vistaLista.classList.remove('d-none');
        vistaForm.classList.add('d-none');
        btnLista.classList.add('active');
        btnForm.classList.remove('active');
        mostrarTransfers(); // Refresh logic
    } else {
        vistaLista.classList.add('d-none');
        vistaForm.classList.remove('d-none');
        btnLista.classList.remove('active');
        btnForm.classList.add('active');
        
        // Reset form for new entry if switching manually
        if (!document.getElementById('transfer_id').value) {
             const form = document.getElementById('formTransfer');
             form.reset();
             
             // Reset UI del select manual
             document.getElementById('transfer_destino_custom').classList.add('d-none');
             document.getElementById('transfer_destino_select').value = "";

             // Restore default date
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('transfer_fecha').value = tomorrow.toISOString().split('T')[0];
        }
    }
}

// ============================================================================
// HANDLERS
// ============================================================================

function manejarSubmitTransfer(e) {
    e.preventDefault();
    
    // Validate User
    const autor = Utils.validateUser();
    if (!autor) return;

    const id = document.getElementById('transfer_id').value;
    const fecha = document.getElementById('transfer_fecha').value;
    const hora = document.getElementById('transfer_hora').value;
    const hab = document.getElementById('transfer_hab').value.trim();
    const tipo = document.getElementById('transfer_tipo').value;
    const pax = document.getElementById('transfer_pax').value;
    const notas = document.getElementById('transfer_notas').value.trim();

    // LÓGICA DE DESTINO MEJORADA
    const selectDestino = document.getElementById('transfer_destino_select');
    const inputDestino = document.getElementById('transfer_destino_custom');
    
    let destino = selectDestino.value;
    if (destino === 'OTRO') {
        destino = inputDestino.value.trim();
    }

    if (!hab || !destino || !hora) {
        alert("Por favor rellene los campos obligatorios (Habitación, Hora y Destino).");
        return;
    }

    const transferData = {
        id: id ? parseInt(id) : Date.now(),
        fecha,
        hora,
        hab,
        tipo,
        pax,
        destino, // Guardamos el string final
        notas,
        autor,
        creadoEn: new Date().toISOString()
    };

    if (id) {
        transfersService.updateTransfer(transferData);
        window.showAlert("Reserva actualizada correctamente.", "success");
    } else {
        transfersService.addTransfer(transferData);
        window.showAlert("Reserva creada correctamente.", "success");
    }

    // Reset and return
    e.target.reset();
    document.getElementById('transfer_id').value = '';
    // Reset visual del input custom
    inputDestino.classList.add('d-none');
    
    cambiarVistaTransfers('lista');
}

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
    let items = transfersService.getAll();
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
    const contenedor = document.getElementById('tablaTransfersCuerpo');
    const emptyState = document.getElementById('transfers-empty-state');
    
    if (!contenedor) return;

    if (!append) {
        contenedor.innerHTML = '';
        visibleCountTransfers = Math.min(PAGE_SIZE_TRANSFERS, currentFilteredTransfers.length > 0 ? currentFilteredTransfers.length : PAGE_SIZE_TRANSFERS);
        
        // Manejo de estado vacío
        if (currentFilteredTransfers.length === 0) {
            emptyState?.classList.remove('d-none');
            return; 
        } else {
            emptyState?.classList.add('d-none');
        }
    }

    const total = currentFilteredTransfers.length;
    const start = append ? Math.max(0, visibleCountTransfers - PAGE_SIZE_TRANSFERS) : 0;
    const end = Math.min(visibleCountTransfers, total);

    if (append && start >= end) return;

    const slice = currentFilteredTransfers.slice(start, end);
    const fragment = document.createDocumentFragment();
    const todayStr = new Date().toISOString().split('T')[0];

    slice.forEach(t => {
        const isToday = t.fecha === todayStr;
        const rowClass = isToday ? 'table-info bg-opacity-10' : '';
        
        const tr = document.createElement('tr');
        if(rowClass) tr.className = rowClass;

        tr.innerHTML = `
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
        `;
        fragment.appendChild(tr);
    });

    // Gestión del Sentinel con Ui.js
    const existingSentinel = document.getElementById('sentinel-loader-transfers');
    if (existingSentinel) existingSentinel.remove();

    contenedor.appendChild(fragment);

    if (visibleCountTransfers < total) {
        // Usar helper de Ui
        const sentinelRow = Ui.createSentinelRow('sentinel-loader-transfers', 'Cargando reservas...', 7);
        contenedor.appendChild(sentinelRow);
        
        // Reconectar si es necesario
        if (infiniteScrollControllerTransfers) infiniteScrollControllerTransfers.reconnect();
    }
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
    const contenedor = document.getElementById('dash-tabla-transfers');
    const badge = document.getElementById('dash-count-transfers');
    const col = document.getElementById('dash-col-transfers');

    if (!contenedor) return;

    // Obtener transfers de HOY en adelante
    const todayStr = new Date().toISOString().split('T')[0];
    const all = transfersService.getAll();
    
    // Filtramos solo los de HOY para el contador urgente/rojo, o los futuros próximos?
    // Usualmente "Resumen del día" es HOY.
    const todayTransfers = all.filter(t => t.fecha === todayStr);
    
    // Sort por hora
    todayTransfers.sort((a, b) => a.hora.localeCompare(b.hora));

    if (badge) badge.innerText = todayTransfers.length;
    
    // Mostrar u ocultar columna si se desea (o dejar siempre visible con 0)
    if (col) col.classList.toggle('d-none', todayTransfers.length === 0);

    contenedor.innerHTML = '';
    
    if (todayTransfers.length === 0) {
        contenedor.innerHTML = '<tr><td colspan="2" class="text-center text-muted small py-2">Sin salidas hoy</td></tr>';
        return;
    }

    todayTransfers.slice(0, 5).forEach(t => {
        contenedor.innerHTML += `
            <tr style="cursor: pointer;" onclick="navegarA('#transfers-content'); cambiarVistaTransfers('lista')">
                <td>
                    <div class="fw-bold text-dark" style="font-size: 0.75rem;">${t.hora} <span class="badge bg-light text-dark border ms-1">${t.hab}</span></div>
                    <div class="small text-muted text-truncate" style="max-width: 120px;">${getIconoTipo(t.tipo)} ${t.destino}</div>
                </td>
                <td class="text-end align-middle">
                    <span class="badge bg-primary rounded-pill">${t.pax}</span>
                </td>
            </tr>
        `;
    });

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
    const item = transfersService.getById(id);
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
        
        const estandar = ["Aeropuerto Norte", "Aeropuerto Sur"];
        
        if (estandar.includes(item.destino)) {
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
        
        cambiarVistaTransfers('form');
    }
};

window.eliminarTransfer = async (id) => {
    if (await window.showConfirm("¿Eliminar esta reserva?")) {
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

function imprimirTransfers() {
    const user = Utils.validateUser();
    if (!user) return;
    Utils.printSection('print-date-transfers', 'print-repc-nombre-transfers', user);
}
window.imprimirTransfers = imprimirTransfers;
