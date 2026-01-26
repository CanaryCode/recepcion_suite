import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { transfersService } from '../services/TransfersService.js';
import { Modal } from '../core/Modal.js'; // Assuming Modal helper exists or using standard alerts

let transferParaImprimir = null;

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

export function inicializarTransfers() {
    // Configurar Event Listeners
    const form = document.getElementById('formTransfer');
    if (form) {
        form.removeEventListener('submit', manejarSubmitTransfer);
        form.addEventListener('submit', manejarSubmitTransfer);
    }

    // Set default date to tomorrow for convenience
    const dateInput = document.getElementById('transfer_fecha');
    if (dateInput && !dateInput.value) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    // Populate Destinations Datalist
    if (APP_CONFIG.TRANSFERS && APP_CONFIG.TRANSFERS.DESTINOS) {
        const dl = document.getElementById('transfer_destinos_list');
        if (dl) {
            dl.innerHTML = APP_CONFIG.TRANSFERS.DESTINOS.map(d => `<option value="${d}">`).join('');
        }
    }

    // Initial Render
    mostrarTransfers();
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
             document.getElementById('formTransfer').reset();
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
    const destino = document.getElementById('transfer_destino').value.trim();
    const notas = document.getElementById('transfer_notas').value.trim();

    if (!hab || !destino || !hora) {
        alert("Por favor rellene los campos obligatorios.");
        return;
    }

    const transferData = {
        id: id ? parseInt(id) : Date.now(),
        fecha,
        hora,
        hab,
        tipo,
        pax,
        destino,
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
    cambiarVistaTransfers('lista');
}

// ============================================================================
// RENDER
// ============================================================================

function mostrarTransfers() {
    const contenedor = document.getElementById('tablaTransfersCuerpo');
    const emptyState = document.getElementById('transfers-empty-state');
    const busqueda = document.getElementById('transfersSearch')?.value.toLowerCase() || '';

    if (!contenedor) return;

    // Clean old
    transfersService.cleanupOld(3); // Keep 3 days of history

    let items = transfersService.getAll();
    
    // Filter
    if (busqueda) {
        items = items.filter(t => t.hab.toLowerCase().includes(busqueda) || t.destino.toLowerCase().includes(busqueda));
    }

    contenedor.innerHTML = '';

    if (items.length === 0) {
        emptyState?.classList.remove('d-none');
    } else {
        emptyState?.classList.add('d-none');
        
        items.forEach(t => {
            const isToday = t.fecha === new Date().toISOString().split('T')[0];
            const rowClass = isToday ? 'table-info bg-opacity-10' : '';
            
            contenedor.innerHTML += `
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
                </tr>
            `;
        });
    }

    // Actualizar Widget Dashboard
    actualizarDashboardTransfers();
}

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
        document.getElementById('transfer_destino').value = item.destino;
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
