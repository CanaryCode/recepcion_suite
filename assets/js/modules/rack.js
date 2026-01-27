import { rackService } from '../services/RackService.js';
import { APP_CONFIG } from '../core/Config.js';

/**
 * MÓDULO DE RACK INTERACTIVO (rack.js)
 * -----------------------------------
 * Representa visualmente el estado del hotel habitación por habitación.
 * Permite filtrar por tipo, estado (Limpia/Sucia/Bloqueada), vistas y extras.
 * Incluye un sistema de seguridad por PIN para modificar estados críticos.
 */

let currentFilters = {
    tipos: new Set(),
    states: new Set(),
    vistas: new Set(),
    extras: new Set(),
    searchTerm: '' // Término de búsqueda por número de habitación
};

/**
 * INICIALIZACIÓN
 * Configura los buscadores, botones de reset y la delegación de eventos 
 * para el desbloqueo de seguridad y cambios de extras.
 */
export function inicializarRack() {
    renderFilters();
    renderRack();

    // Event Listeners
    // Search Listener
    document.getElementById('room-search-input')?.addEventListener('input', (e) => {
        currentFilters.searchTerm = e.target.value.trim().toLowerCase();
        renderRack();
    });

    document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
        currentFilters.tipos.clear();
        currentFilters.states.clear();
        currentFilters.vistas.clear();
        currentFilters.extras.clear();
        currentFilters.searchTerm = '';
        
        // Reset Search Input
        const searchInput = document.getElementById('room-search-input');
        if (searchInput) searchInput.value = '';

        // Uncheck all checkboxes
        document.querySelectorAll('#filter-tipos-container input, #filter-estados-container input, #filter-vistas-container input, #filter-extras-container input')
            .forEach(cb => cb.checked = false);
            
        renderRack();
    });

    // ROBUST DELEGATION FOR UNLOCK
    document.body.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'btn-unlock-details' || e.target.closest('#btn-unlock-details'))) {
            console.log("Unlock button detected");
            unlockRoomDetails();
        }
    });

    document.body.addEventListener('keypress', (e) => {
        if (e.target && e.target.id === 'security-pin-input' && e.key === 'Enter') {
             unlockRoomDetails();
        }
    });

    // CONFIRMATION FOR EXTRAS CHANGES
    const extrasIds = ['check-sofa', 'check-sofaCama', 'check-cheslong', 'check-ruidosa', 'check-tranquila'];
    document.body.addEventListener('click', async (e) => {
        if (e.target && extrasIds.includes(e.target.id)) {
            // Check if fields are actually enabled (fieldset logic)
            const fieldset = document.getElementById('room-details-fieldset');
            if (fieldset && fieldset.disabled) {
                e.preventDefault(); // Ensure it doesn't toggle if disabled (extra safety)
                return;
            }

            // Logic: Allow the toggle to happen visually, then ask confirmation.
            // If Cancelled -> Revert.
            
            const featureName = e.target.nextElementSibling.innerText.trim();
            const isNowChecked = e.target.checked;
            
            // Allow UI to update before Alert (Alert blocks thread)
            // setTimeout ensures the render cycle finishes (checkbox becomes checked/unchecked)
            setTimeout(async () => {
                const confirmed = await window.showConfirm(
                    `¿Estás seguro de modificar "${featureName}"?`
                );

                if (confirmed) {
                    if (window.showAlert) window.showAlert("Modificación realizada", "success");
                } else {
                    // Revert
                    e.target.checked = !isNowChecked; 
                }
            }, 10);
        }
    });
}

// Global modal instance variable
let roomDetailsModal = null;
let currentEditingRoom = null;

/**
 * DETALLES DE HABITACIÓN (Modal)
 * Abre la ficha técnica de la habitación. Por seguridad, los campos de edición
 * aparecen bloqueados hasta que se introduce el PIN correcto.
 */
function openRoomDetails(roomNum) {
    currentEditingRoom = roomNum;
    const room = rackService.getRoomsWithDetails().find(r => r.num === roomNum);
    if (!room) return;

    if (!roomDetailsModal) {
        roomDetailsModal = new bootstrap.Modal(document.getElementById('roomDetailsModal'));
    }

    // Rellenar campos del modal
    document.getElementById('modal-room-number').innerText = room.num;
    document.getElementById('modal-room-type').value = room.tipo;
    document.getElementById('modal-room-view').value = room.vista;
    document.getElementById('modal-room-status').value = room.status || 'DISPONIBLE';
    document.getElementById('modal-room-comments').value = room.comments || '';

    // Rellenar extras (Sofa, Sofa Cama, etc)
    document.getElementById('check-sofa').checked = !!room.extras.sofa;
    document.getElementById('check-sofaCama').checked = !!room.extras.sofaCama;
    document.getElementById('check-cheslong').checked = !!room.extras.cheslong;
    document.getElementById('check-ruidosa').checked = !!room.extras.ruidosa;
    document.getElementById('check-tranquila').checked = !!room.extras.tranquila;

    // Resetear estado de seguridad al abrir
    document.getElementById('room-details-fieldset').disabled = true;
    document.getElementById('security-check-container').classList.remove('d-none');
    document.getElementById('btn-save-room-details').disabled = true;
    document.getElementById('security-pin-input').value = '';
    
    roomDetailsModal.show();
    
    // Enfocar PIN automáticamente
    setTimeout(() => document.getElementById('security-pin-input').focus(), 500);
}

function unlockRoomDetails() {
    console.log("Attempting unlock...");
    const pinInput = document.getElementById('security-pin-input');
    const pin = pinInput.value.trim();
    
    if (pin === '1234') {
        // Correct Code
        document.getElementById('room-details-fieldset').disabled = false;
        document.getElementById('security-check-container').classList.add('d-none');
        document.getElementById('btn-save-room-details').disabled = false;
        
        // Focus first field
        document.getElementById('modal-room-status').focus();
    } else {
        // Wrong Code
        alert('❌ Código incorrecto');
        pinInput.value = '';
        pinInput.focus();
    }
}

window.unlockRoomDetails = unlockRoomDetails;
// Also expose save for safety if needed, though ID is used
window.saveRoomDetails = saveRoomDetails;

async function saveRoomDetails() {
    if (!currentEditingRoom) return;

    // Confirmation Dialog
    const confirmed = await window.showConfirm(
        "¿Estás seguro de modificar el estado de la habitación?\n\nEsta acción registrará cambios en el sistema."
    );

    if (!confirmed) return;

    const status = document.getElementById('modal-room-status').value;
    const comments = document.getElementById('modal-room-comments').value;
    
    // Feature Overrides
    const extras = {
        sofa: document.getElementById('check-sofa').checked,
        sofaCama: document.getElementById('check-sofaCama').checked,
        cheslong: document.getElementById('check-cheslong').checked,
        ruidosa: document.getElementById('check-ruidosa').checked,
        tranquila: document.getElementById('check-tranquila').checked
    };

    rackService.saveRoomData(currentEditingRoom, {
        status,
        comments,
        extras
    });

    if (roomDetailsModal) roomDetailsModal.hide();
    renderRack(); // Re-render to show changes
    
    // Success Message
    await window.showAlert("✅ El estado ha sido modificado correctamente.", "success");
}

function renderFilters() {
    const filters = rackService.getAllFilters();
    
    // Render Tipos
    renderCheckboxGroup('filter-tipos-container', filters.tipos, 'tipos');
    renderCheckboxGroup('filter-estados-container', filters.estados, 'states');
    renderCheckboxGroup('filter-vistas-container', filters.vistas, 'vistas');
    renderCheckboxGroup('filter-extras-container', filters.extras, 'extras');
}

function renderCheckboxGroup(containerId, items, filterCategory) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = items.map(item => `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${item.id}" id="filter-${filterCategory}-${item.id}"
                onchange="toggleFilter('${filterCategory}', '${item.id}')">
            <label class="form-check-label small" for="filter-${filterCategory}-${item.id}">
                ${item.label}
            </label>
        </div>
    `).join('');
}

window.toggleFilter = (category, value) => {
    if (currentFilters[category].has(value)) {
        currentFilters[category].delete(value);
    } else {
        currentFilters[category].add(value);
    }
    renderRack();
};

// Add Tooltip initialization for dynamically added elements
function initTooltips() {
    if (window.initTooltips) {
        window.initTooltips(document.getElementById('rack-grid-container'));
    }
}

function renderRack() {
    const container = document.getElementById('rack-grid-container');
    const countDisplay = document.getElementById('rack-count-display');
    const printDate = document.getElementById('print-date-rack'); // For Print Header
    
    if (!container) return;

    // Set Print Date (Today)
    if (printDate) {
        const now = new Date();
        printDate.innerText = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    const allRooms = rackService.getRoomsWithDetails();
    
    // FILTER LOGIC
    const filteredRooms = allRooms.filter(r => {
        // 0. Search Term
        if (currentFilters.searchTerm && !r.num.includes(currentFilters.searchTerm)) return false;

        // 1. Tipo Filter
        if (currentFilters.tipos.size > 0 && !currentFilters.tipos.has(r.tipo)) return false;
        
        // 2. Status Filter
        if (currentFilters.states.size > 0) {
            // Default status is DISPONIBLE if missing
            const status = r.status || 'DISPONIBLE';
            if (!currentFilters.states.has(status)) return false;
        }

        // 3. Vista Filter
        if (currentFilters.vistas.size > 0 && !currentFilters.vistas.has(r.vista)) return false;
        
        // 4. Extras Filter (Must have ALL selected extras)
        if (currentFilters.extras.size > 0) {
            for (const extra of currentFilters.extras) {
                if (!r.extras[extra]) return false;
            }
        }
        
        return true;
    });

    // Update Counter
    if (countDisplay) countDisplay.innerText = filteredRooms.length;

    container.innerHTML = '';

    if (filteredRooms.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-search display-1 opacity-25"></i>
                <p class="mt-3 fs-5">No se encontraron habitaciones con estos filtros.</p>
            </div>`;
        return;
    }

    // Group by Floor
    const floors = {};
    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;
    
    rangos.forEach(r => {
        floors[r.planta] = [];
    });

    filteredRooms.forEach(room => {
        if (floors[room.planta]) {
            floors[room.planta].push(room);
        }
    });

    // Render Groups
    Object.keys(floors).forEach(planta => {
        const rooms = floors[planta];
        if (rooms.length === 0) return;

        const floorContainer = document.createElement('div');
        floorContainer.className = 'mb-5';
        floorContainer.innerHTML = `
            <h5 class="border-bottom pb-2 mb-3 text-secondary">
                <i class="bi bi-layers-fill me-2"></i>Planta ${planta}
            </h5>
            <div class="d-flex flex-wrap gap-3">
                ${rooms.map(r => generateRoomCard(r)).join('')}
            </div>
        `;
        container.appendChild(floorContainer);
    });
    
    // Init tooltips for new elements
    if (window.initTooltips) {
        window.initTooltips(container);
    } else {
        // Fallback (Should be covered by observer anyway, but rack is complex)
    }
    
    // Add Click Listeners to cards (Delegation or direct?)
    // Using onclick attribute in HTML string is easier here, but module scope is strict.
    // We attach listener to container for delegation.
    container.addEventListener('click', (e) => {
        const card = e.target.closest('.room-card');
        if (card && card.dataset.roomNum) {
            openRoomDetails(card.dataset.roomNum);
        }
    });
}

function generateRoomCard(room) {
    // Determine Card Border/Bg Color Class
    let cardClass = 'border-secondary-subtle'; // Default standard
    let badgeText = '';
    let badgeClass = 'd-none';

    // Priority Order (Types)
    if (room.tipo === 'MASTER_SUITE') {
        cardClass = 'border-danger border-2 shadow-sm bg-danger-subtle'; // Lila
        badgeText = 'MASTER SUITE';
        badgeClass = 'bg-danger text-white'; 
    } else if (room.tipo === 'SUITE_STANDARD') {
        cardClass = 'border-primary border-2 shadow-sm bg-primary-subtle'; // Azul
        badgeText = 'SUITE STD';
        badgeClass = 'bg-primary text-white';
    } else if (room.tipo === 'DOBLE_SUPERIOR') {
        cardClass = 'border-warning border-2 bg-warning-subtle'; // Amarillo
        badgeText = 'DBL SUPERIOR';
        badgeClass = 'bg-warning text-dark';
    } 
    
    // Priority Order (Extras affecting border if not Suite)
    else if (room.extras.comunicada) {
        cardClass = 'border-danger border-2'; 
        // We handle badge text below dynamically for Communicated
    } else if (room.extras.sofaCama || room.extras.sofa) { 
        // Amarillo visual cue for Sofa rooms if not already colored
        if (!cardClass.includes('border-primary') && !cardClass.includes('border-danger')) {
             cardClass = 'border-warning border-2'; 
        }
    }

    // Visual Status Logic (Opacity/Overlay)
    let statusStyle = '';
    let statusIcon = '';
    if (room.status === 'BLOQUEADA') {
        statusStyle = 'opacity: 0.5; background-color: #ffe6e6 !important;'; // Red-ish tint
        statusIcon = '<i class="bi bi-slash-circle-fill text-danger position-absolute top-0 end-0 m-1" title="Bloqueada"></i>';
    }

    // Communicated Visuals (Badge Override)
    let communicatedBadge = '';
    if (room.extras.comunicada && room.extras.comunicadaCon) {
        // Show "↔ 215" - MOVED TO BOTTOM to avoid covering number
        communicatedBadge = `<span class="badge bg-danger text-white position-absolute bottom-0 start-50 translate-middle-x mb-1 shadow-sm" style="font-size: 0.6rem; z-index: 5;"><i class="bi bi-arrow-left-right me-1"></i>${room.extras.comunicadaCon}</span>`;
    }

    // Vistas Icons
    let vistaIcon = 'bi-building';
    let vistaColor = 'text-secondary';
    if (room.vista === 'MAR') { vistaIcon = 'bi-water'; vistaColor = 'text-info'; }
    if (room.vista === 'PISCINA') { vistaIcon = 'bi-tsunami'; vistaColor = 'text-primary'; }

    // Extras Icons (Mini)
    let extrasIcons = [];
    if (room.extras.adaptada) extrasIcons.push('<i class="bi bi-person-wheelchair text-success fw-bold" title="Adaptada" style="font-size: 1.1em;"></i>');
    
    if (room.extras.sofaCama) extrasIcons.push('<i class="bi bi-archive-fill text-warning" title="Sofá Cama" style="font-size: 0.8em;"></i>');
    else if (room.extras.sofa) extrasIcons.push('<i class="bi bi-journal-bookmark-fill text-warning" title="Sofá" style="font-size: 0.8em;"></i>');
    
    if (room.extras.cheslong) extrasIcons.push('<i class="bi bi-layout-sidebar text-primary" title="Cheslong" style="font-size: 0.8em;"></i>');
    if (room.extras.comunicada) extrasIcons.push('<i class="bi bi-arrows-angle-expand text-danger" title="Comunicada" data-bs-toggle="tooltip"></i>');
    
    if (room.extras.ruidosa) extrasIcons.push('<i class="bi bi-speaker-fill text-muted" title="Ruidosa" data-bs-toggle="tooltip" style="font-size: 0.8em;"></i>');
    if (room.extras.tranquila) extrasIcons.push('<i class="bi bi-soundwave text-success" title="Tranquila" data-bs-toggle="tooltip" style="font-size: 0.8em;"></i>');
    if (room.comments) extrasIcons.push('<i class="bi bi-chat-dots-fill text-secondary" title="Tiene Observaciones"></i>');

    // Custom Styles
    let customStyle = '';
    // if (room.tipo === 'MASTER_SUITE') customStyle = 'background-color: #f3e5f5;'; 

    // Render Badge Check
    let mainBadgeHtml = '';
    if (badgeText) {
        mainBadgeHtml = `<span class="badge ${badgeClass} position-absolute top-0 start-50 translate-middle-x mt-1" style="font-size: 0.55rem; width: 90%;">${badgeText}</span>`;
    }

    // Card with data-room-num for click delegation
    return `
        <div class="card room-card ${cardClass}" style="width: 140px; cursor: pointer; ${customStyle} ${statusStyle}" title="${room.tipo}" data-room-num="${room.num}">
            <div class="card-body p-2 text-center position-relative">
                ${statusIcon}
                ${mainBadgeHtml}
                
                <h4 class="card-title fw-bold mb-1 text-dark mt-3">${room.num}</h4>
                
                <div class="d-flex justify-content-center align-items-center gap-2 fs-5 mb-3 text-secondary">
                    <i class="bi ${vistaIcon} ${vistaColor}" title="Vista: ${room.vista}"></i>
                    ${extrasIcons.length > 0 ? `<div class="d-flex gap-1 text-muted border-start ps-2 align-items-center">${extrasIcons.join('')}</div>` : ''}
                </div>
                ${communicatedBadge}
            </div>
        </div>
    `;
}
