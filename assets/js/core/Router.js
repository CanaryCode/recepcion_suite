/**
 * SISTEMA DE ENRUTAMIENTO Y NAVEGACIÓN
 * -----------------------------------
 * Este módulo se encarga de cambiar entre las diferentes pestañas de la aplicación
 * (Inicio, Operaciones, Administración, etc.) sin recargar la página.
 */

export const Router = {
    /**
     * inicialización.
     * Registra la función navegarA globalmente para que pueda ser llamada
     * desde cualquier botón del HTML con onclick="navegarA(...)".
     */
    init: () => {
        window.navegarA = Router.navegarA;
        
        // GLOBAL EVENT LISTENER: Ensure only ONE tab pane is visible at a time
        // This fixes the issue where dropdown tabs might not effectively hide the Dashboard or other views.
        const tabElsp = document.querySelectorAll('button[data-bs-toggle="tab"]');
        tabElsp.forEach(tabBtn => {
            // Trigger reload on CLICK (even if tab is already active)
            tabBtn.addEventListener('click', (event) => {
                const targetId = tabBtn.getAttribute('data-bs-target');
                console.log(`[Router] Tab button clicked: ${targetId}`);
                Router.handleModuleReload(targetId);
            });

            tabBtn.addEventListener('show.bs.tab', (event) => {
                const targetId = event.target.getAttribute('data-bs-target');
                console.log(`[Router] show.bs.tab event: ${targetId}`);
                if(!targetId) return;

                // Force hide ALL other tab-panes
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    if ('#' + pane.id !== targetId) {
                        pane.classList.remove('show', 'active');
                        pane.style.display = 'none'; // Force hide
                    }
                });
                
                // Ensure target is prepared to be shown
                const targetPane = document.querySelector(targetId);
                if(targetPane) {
                    targetPane.style.display = ''; 
                    // Manual trigger for first-show if click didn't happen (mobile etc)
                    Router.handleModuleReload(targetId);
                }
            });
        });
    },

    /**
     * GESTIÓN DE RECARGAS DE MÓDULOS
     * Se llama cuando una pestaña se activa para asegurar que los datos estén frescos.
     */
    handleModuleReload: (selector) => {
        if (selector === '#gallery-content') {
            if (window.Gallery) window.Gallery.loadImages(true);
        }
        // Aquí se pueden añadir otros módulos que necesiten refresco al abrir
    },

    /**
     * MÉTODO PRINCIPAL DE NAVEGACIÓN
     * @param {string} targetId - El ID del panel al que queremos ir (ej: '#riu-content')
     * 
     * Este método hace un cambio "limpio" de pestaña asegurándose de que:
     * 1. Se oculte todo lo anterior.
     * 2. Se desmarque el menú activo antiguo.
     * 3. Se active el nuevo panel visualmente.
     */
    navegarA: (targetId) => {
        const selector = targetId.startsWith('#') ? targetId : '#' + targetId;
        const targetPane = document.querySelector(selector);
        
        if (!targetPane) {
            console.error(`Router: Panel no encontrado ${selector}`);
            return;
        }

        // 1. CLEANUP UI (Dropdowns, Tooltips, Backdrops)
        document.querySelectorAll('.dropdown-menu.show').forEach(el => {
            el.classList.remove('show');
            const toggle = el.parentElement.querySelector('.dropdown-toggle');
            if (toggle) {
                toggle.classList.remove('show');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
        document.querySelectorAll('.tooltip').forEach(el => el.remove());

        // 2. DEACTIVATE EVERYTHING
        // Remove active state from all nav-links and dropdown-items
        document.querySelectorAll('#mainTabs .nav-link, #mainTabs .dropdown-item').forEach(btn => {
            btn.classList.remove('active');
        });

        // Hide all tab-panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
            pane.style.display = ''; 
        });

        // 3. ACTIVATE TARGET CONTENT
        targetPane.classList.add('show', 'active');

        // 4. HIGHLIGHT NAVBAR BUTTON (SILENTLY)
        const triggerEl = document.querySelector(`button[data-bs-target="${selector}"]`);
        if (triggerEl) {
            triggerEl.classList.add('active');
            
            // If the button is inside a dropdown, highlight the parent dropdown-toggle too
            const parentDropdown = triggerEl.closest('.dropdown');
            if (parentDropdown) {
                const toggle = parentDropdown.querySelector('.dropdown-toggle');
                if (toggle) toggle.classList.add('active');
            }
        }

        // 5. UPDATE URL (Optional, but good for back button)
        if (history.pushState) {
            history.pushState(null, null, selector);
        } else {
            location.hash = selector;
        }

        // 6. MODULE-SPECIFIC AUTO-RELOADS
        Router.handleModuleReload(selector);
    }
};
