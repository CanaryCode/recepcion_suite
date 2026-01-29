/**
 * UNIFIED ICON & IMAGE SELECTOR (IconSelector.js)
 * ---------------------------------------------
 * A high-quality, standardized component to select Bootstrap icons, 
 * Emojis, or upload local images from PC.
 */

export const IconSelector = {
    targetId: null,      // Entry target (input ID)
    onSelect: null,     // Optional callback
    currentModal: null,

    /**
     * OPEN SELECTOR
     * @param {string|null} targetId - ID of input to fill
     * @param {Function|null} onSelect - Optional custom callback
     */
    open(targetId = null, onSelect = null) {
        this.targetId = targetId;
        this.onSelect = onSelect;
        
        this._ensureModal();
        this._renderIcons();
        this._renderEmojis();
        
        const modalEl = document.getElementById('iconSelectorModal');
        this.currentModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        this.currentModal.show();
        
        // Default to Icons tab and focus search
        const tabBtn = document.getElementById('is-tab-icons');
        if (tabBtn) bootstrap.Tab.getOrCreateInstance(tabBtn).show();
        
        setTimeout(() => document.getElementById('is-search-input')?.focus(), 500);
    },

    /**
     * SELECT VALUE
     */
    select(value) {
        if (this.targetId) {
            const el = document.getElementById(this.targetId);
            if (el) {
                el.value = value;
                // Trigger events
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // Auto-update preview element if it exists
            const preview = document.getElementById('preview-' + this.targetId);
            if (preview) {
                const isImage = value && (value.startsWith('data:') || value.includes('.') || value.includes('/'));
                if (isImage) {
                    preview.innerHTML = `<img src="${value}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px;">`;
                } else {
                    // Check if it's an emoji (length < 5) or icon
                    if (value.length < 5) {
                        preview.innerHTML = `<span style="font-size: 1.8rem; vertical-align: middle;">${value}</span>`;
                    } else {
                        preview.innerHTML = `<i class="bi bi-${value}" style="font-size: 2rem; color: #0d6efd; vertical-align: middle;"></i>`;
                    }
                }
            }
            
            // Update display input if it exists (for text representation)
            const display = document.getElementById(this.targetId + '_display');
            if (display) display.value = value;
        }
        
        if (typeof this.onSelect === 'function') {
            this.onSelect(value);
        }
        
        this.currentModal?.hide();
    },

    /**
     * PROCESS LOCAL UPLOAD
     */
    handleFileUpload(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (file.size > 2 * 1024 * 1024) {
                alert("La imagen es demasiado grande (Máx 2MB)");
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => this.select(e.target.result);
            reader.readAsDataURL(file);
        }
    },

    /**
     * FILTER VECTOR ICONS
     */
    filter(query) {
        const q = query.toLowerCase();
        const grid = document.getElementById('is-icon-grid');
        if (!grid) return;
        
        const filtered = this.commonIcons.filter(i => i.includes(q));
        grid.innerHTML = filtered.map(icon => this._getIconButton(icon, true)).join('');
    },

    // --- PRIVATE METHODS ---

    _ensureModal() {
        if (document.getElementById('iconSelectorModal')) return;

        const html = `
        <div class="modal fade" id="iconSelectorModal" tabindex="-1" aria-hidden="true" style="z-index: 10070;">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 20px; overflow: hidden;">
                    <div class="modal-header border-0 bg-dark text-white p-4">
                        <h5 class="modal-title fw-bold text-uppercase ls-1"><i class="bi bi-palette-fill me-2"></i>Selector de Iconos</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    
                    <div class="modal-body p-0 bg-white">
                        <!-- Navigation Tabs -->
                        <ul class="nav nav-pills nav-fill p-3 bg-light border-bottom" id="iconPickerTabs" role="tablist">
                            <li class="nav-item">
                                <button class="nav-link active py-2 fw-bold" id="is-tab-icons" data-bs-toggle="tab" data-bs-target="#is-pane-icons">
                                    <i class="bi bi-app-indicator me-1"></i>Iconos
                                </button>
                            </li>
                            <li class="nav-item">
                                <button class="nav-link py-2 fw-bold" id="is-tab-emojis" data-bs-toggle="tab" data-bs-target="#is-pane-emojis">
                                    <i class="bi bi-emoji-smile-fill me-1"></i>Emojis
                                </button>
                            </li>
                            <li class="nav-item">
                                <button class="nav-link py-2 fw-bold" id="is-tab-pc" data-bs-toggle="tab" data-bs-target="#is-pane-pc">
                                    <i class="bi bi-pc-display-horizontal me-1"></i>Desde Mi PC
                                </button>
                            </li>
                        </ul>

                        <div class="tab-content" style="height: 550px; overflow-y: auto;">
                            <!-- Panel: Icons -->
                            <div class="tab-pane fade show active p-4" id="is-pane-icons">
                                <div class="input-group mb-4 shadow-sm border rounded-pill overflow-hidden">
                                    <span class="input-group-text bg-white border-0 ps-3"><i class="bi bi-search text-muted"></i></span>
                                    <input type="text" id="is-search-input" class="form-control border-0 py-2" placeholder="Buscar icono (ej: star, home, wifi, water)..." oninput="IconSelector.filter(this.value)">
                                </div>
                                <div id="is-icon-grid" class="d-flex flex-wrap gap-3 justify-content-center pb-4"></div>
                            </div>

                            <!-- Panel: Emojis -->
                            <div class="tab-pane fade p-4 px-5" id="is-pane-emojis">
                                <div id="is-emoji-grid" class="d-flex flex-wrap gap-3 justify-content-center pb-4"></div>
                            </div>

                            <!-- Panel: PC -->
                            <div class="tab-pane fade p-4 h-100" id="is-pane-pc">
                                <div class="h-100 d-flex flex-column align-items-center justify-content-center text-center p-5">
                                    <div class="mb-4 bg-light p-5 rounded-circle shadow-sm border border-2 border-dashed">
                                        <i class="bi bi-cloud-arrow-up-fill text-primary" style="font-size: 5rem;"></i>
                                    </div>
                                    <h4 class="fw-bold mb-2">Personaliza con tu Imagen</h4>
                                    <p class="text-muted mb-4 px-5">Sube un logo o icono personalizado desde tus archivos locales (.jpg, .png, .webp).</p>
                                    <label for="is-file-input" class="btn btn-primary btn-lg px-5 py-3 rounded-pill shadow fw-bold">
                                        <i class="bi bi-folder2-open me-2"></i>Explorar mi ordenador
                                    </label>
                                    <input type="file" id="is-file-input" class="d-none" accept="image/*" onchange="IconSelector.handleFileUpload(this)">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    _renderIcons() {
        const grid = document.getElementById('is-icon-grid');
        if (grid) grid.innerHTML = this.commonIcons.map(icon => this._getIconButton(icon, true)).join('');
    },

    _renderEmojis() {
        const grid = document.getElementById('is-emoji-grid');
        if (!grid) return;
        
        const categories = {
            "Sugeridos": ['⭐', '🏠', '👤', '🔔', '📅', '⚙️', '🔍', '💾', '🗑️', '✏️', '📍', '💡', '🔥', '✨'],
            "Habitaciones": ['🛌', '🚪', '🔑', '🚽', '🚿', '🛋️', '🪟', '🧹', '🧺', '💡', '📶', '🧼', '🪒', '🧴', '🧻', '🛁', '🌡️'],
            "Filtros": ['🔹', '🔸', '💠', '👁️', '🌊', '🌳', '🏨', '🧱', '🏗️', '📐', '🔨', '🛠️', '🧰', '🔧', '🪛'],
            "Comida & Bebida": ['🥐', '🥓', '🍳', '☕', '🥯', '🥞', '🥨', '🥛', '🥤', '🍵', '🥩', '🥘', '🍲', '🍜', '🍣', '🍱', '🍔', '🍕', '🥗', '🍷', '🍺', '🍸', '🍹', '🍾', '🥂'],
            "Ocio & Viajes": ['🏊', '🏖️', '🌴', '🍹', '🎮', '🎾', '🏃', '🚲', '🚗', '✈️', '🚢', '🚂', '🚁', '🏟️', '🎠', '🎡', '🎢'],
            "Objetos": ['📦', '🎁', '🎈', '🧸', '🖼️', '🧵', '🧶', '👕', '👖', '👗', '👜', '🎒', '👞', '👠', '👑', '👒', '💄', '💍', '💎'],
            "Símbolos": ['❤️', '✨', '⚡', '🔥', '💎', '💰', '💳', '✅', '❌', '⚠️', 'ℹ️', '🆗', '🆒', '🆕', '🆓', '🎦', '📶', '📳', '📴', '♻️']
        };

        let html = '';
        for (const [cat, items] of Object.entries(categories)) {
            html += `<div class="w-100 fw-bold text-primary mt-4 mb-3 border-bottom pb-2 text-uppercase ls-1" style="font-size: 0.8rem;">${cat}</div>`;
            html += items.map(e => `
                <button class="btn btn-white border shadow-sm p-0 d-flex align-items-center justify-content-center" 
                        style="width: 85px; height: 85px; font-size: 3.2rem;" 
                        onclick="IconSelector.select('${e}')">${e}</button>
            `).join('');
        }
        grid.innerHTML = html;
    },

    /**
     * RENDER ICON BUTTON
     * ENLARGED: font-size 3rem, button 90x90
     */
    _getIconButton(icon, isBootstrap) {
        return `
            <button class="btn btn-white border shadow-sm d-flex align-items-center justify-content-center p-0" 
                    style="width: 90px; height: 90px; transition: transform 0.2s;"
                    title="${icon}"
                    onmouseover="this.style.transform='scale(1.1)'"
                    onmouseout="this.style.transform='scale(1.0)'"
                    onclick="IconSelector.select('${icon}')">
                <i class="bi bi-${icon}" style="font-size: 3rem; color: #333;"></i>
            </button>`;
    },

    commonIcons: [
        'house', 'house-door', 'person', 'people', 'calendar', 'calendar-event', 'calendar-check',
        'star', 'star-fill', 'heart', 'heart-fill', 'bell', 'bell-fill', 'gear', 'gear-fill',
        'search', 'zoom-in', 'zoom-out', 'trash', 'trash-fill', 'pencil', 'pencil-square',
        'save', 'check', 'check-circle', 'x', 'x-circle', 'plus', 'plus-circle', 'dash',
        'info-circle', 'exclamation-triangle', 'question-circle', 'shield-lock', 'lock', 'unlock',
        'key', 'door-open', 'door-closed', 'eye', 'eye-slash', 'camera', 'image', 'images',
        'film', 'music-note', 'mic', 'volume-up', 'wifi', 'bluetooth', 'pin-angle', 'geo-alt',
        'flag', 'bookmark', 'tag', 'clock', 'stopwatch', 'alarm', 'calculator',
        'cart', 'bag', 'shop', 'credit-card', 'wallet2', 'bank', 'cash', 'coin',
        'envelope', 'chat', 'chat-dots', 'telephone', 'phone', 'laptop', 'display', 'pc-display',
        'printer', 'cloud', 'cloud-arrow-up', 'cloud-download', 'link', 'share', 'box-arrow-in-right',
        'box-arrow-right', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down', 'chevron-left',
        'chevron-right', 'list', 'grid', 'grid-3x3-gap', 'columns', 'sliders', 'filter',
        'droplet', 'water', 'sun', 'moon', 'thermometer-half', 'snow', 'wind', 'umbrella',
        'cup-hot', 'egg-fried', 'potted-plant', 'tree', 'flower1', 'briefcase', 'archive',
        'inbox', 'clipboard', 'journal-text', 'book', 'newspaper', 'tools', 'wrench', 'hammer',
        'puzzle', 'gift', 'award', 'trophy', 'gem', 'activity', 'graph-up', 'pie-chart',
        'bicycle', 'car-front', 'truck', 'airplane', 'train-front', 'ship-front',
        'battery-full', 'lightning', 'plug', 'cpu', 'memory', 'database', 'reception-4'
    ]
};

// Global Exposure
window.IconSelector = IconSelector;
// Legacy Support (precios.js alias)
window.abrirSelectorIconos = (inputId) => IconSelector.open(inputId);
