
import { Modal } from '../core/Modal.js';

export const IconSelector = {
    targetInputId: null,

    init() {
        // Create modal DOM if not exists
        if (!document.getElementById('iconSelectorModal')) {
            const modalHtml = `
            <div class="modal fade" id="iconSelectorModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-white border-bottom">
                            <h6 class="modal-title fw-bold">Seleccionar Icono</h6>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body bg-light">
                            <input type="text" id="iconSearchInput" class="form-control mb-3" placeholder="Buscar icono (ej: user, file, arrow)...">
                            <div id="iconGrid" class="d-flex flex-wrap gap-2 justify-content-center" style="max-height: 400px; overflow-y: auto;">
                                <!-- Icons injected here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Bind search
            document.getElementById('iconSearchInput').addEventListener('input', (e) => {
                this.filterIcons(e.target.value);
            });
        }
    },

    open(inputId) {
        this.targetInputId = inputId;
        this.init();
        this.renderIcons();
        
        const modal = new bootstrap.Modal(document.getElementById('iconSelectorModal'));
        modal.show();
    },

    close() {
        const el = document.getElementById('iconSelectorModal');
        const modal = bootstrap.Modal.getInstance(el);
        if(modal) modal.hide();
    },

    renderIcons() {
        const grid = document.getElementById('iconGrid');
        grid.innerHTML = this.commonIcons.map(icon => `
            <button class="btn btn-white border shadow-sm p-2 icon-btn" onclick="IconSelector.select('${icon}')" title="${icon}">
                <i class="bi bi-${icon} fs-4"></i>
            </button>
        `).join('');
    },

    filterIcons(query) {
        const lower = query.toLowerCase();
        const grid = document.getElementById('iconGrid');
        grid.innerHTML = this.commonIcons.filter(i => i.includes(lower)).map(icon => `
            <button class="btn btn-white border shadow-sm p-2 icon-btn" onclick="IconSelector.select('${icon}')" title="${icon}">
                <i class="bi bi-${icon} fs-4"></i>
            </button>
        `).join('');
    },

    select(icon) {
        if (this.targetInputId) {
            document.getElementById(this.targetInputId).value = icon;
        }
        this.close();
    },

    // Curated list of useful bootstrap icons
    commonIcons: [
        'calculator', 'calendar-check', 'camera', 'chat', 'chat-dots', 'chat-square-text', 
        'clipboard', 'clipboard-check', 'clipboard-data', 'clock', 'cloud', 'cloud-arrow-up', 
        'code-slash', 'coin', 'collection', 'columns', 'command', 'compass', 'cpu', 'credit-card', 
        'currency-dollar', 'currency-euro', 'cursor', 'dash-circle', 'database', 'display', 
        'door-open', 'download', 'envelope', 'exclamation-circle', 'exclamation-triangle', 
        'eye', 'file-earmark', 'file-earmark-excel', 'file-earmark-pdf', 'file-earmark-word', 
        'file-text', 'film', 'filter', 'flag', 'folder', 'folder2-open', 'gear', 'gear-wide', 
        'geo-alt', 'gift', 'globe', 'google', 'graph-up', 'grid', 'grid-3x3-gap', 'hdd', 
        'hdd-network', 'headset', 'heart', 'house', 'image', 'inbox', 'info-circle', 'journal', 
        'journal-text', 'key', 'keyboard', 'laptop', 'layers', 'layout-text-sidebar-reverse', 
        'lightbulb', 'lightning', 'link', 'list-check', 'list-task', 'lock', 'map', 'megaphone', 
        'menu-button-wide', 'mic', 'moon', 'music-note-beamed', 'newspaper', 'palette', 
        'paperclip', 'pen', 'pencil', 'people', 'person', 'person-badge', 'phone', 'pie-chart', 
        'pin', 'play-circle', 'plug', 'plus-circle', 'power', 'printer', 'puzzle', 'qr-code', 
        'question-circle', 'receipt', 'reply', 'save', 'scissors', 'search', 'server', 'share', 
        'shield-check', 'shop', 'signpost', 'sliders', 'sort-down', 'sort-up', 'speaker', 
        'speedometer2', 'star', 'stopwatch', 'sun', 'tablet', 'tag', 'tags', 'telephone', 
        'terminal', 'textarea-t', 'three-dots', 'toggle-on', 'tools', 'trash', 'trophy', 
        'truck', 'tv', 'ui-checks', 'upload', 'usb-drive', 'user', 'volume-up', 'wallet', 
        'whatsapp', 'wifi', 'window', 'wrench', 'youtube', 'zoom-in', 'zoom-out'
    ]
};

// Expose globally
window.IconSelector = IconSelector;
