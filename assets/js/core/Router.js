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
            tabBtn.addEventListener('show.bs.tab', (event) => {
                const targetId = event.target.getAttribute('data-bs-target');
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
                if(targetPane) targetPane.style.display = ''; 
            });
        });
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
        // Normalizar entrada: Asegurar que el ID empieza por '#'
        const selector = targetId.startsWith('#') ? targetId : '#' + targetId;
        
        // 1. Ocultar todos los paneles (tab-pane) activos
        // 1. Ocultar todos los paneles (tab-pane) activos
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
            // Force reset style in case of inline styles or stuck states
            pane.style.display = ''; 
        });

        // 2. Quitar el color azul (active) de los botones del menú superior
        document.querySelectorAll('#mainTabs .nav-link, #mainTabs .dropdown-item').forEach(btn => {
            btn.classList.remove('active');
        });

        // 3. Buscar el disparador legítimo (el botón del menú principal)
        // Preferimos el botón que ya existe en el DOM (en el dropdown) en lugar de uno oculto.
        const triggerEl = document.querySelector(`button[data-bs-target="${selector}"]`);

        if (triggerEl) {
            try {
                // Intentar usar Bootstrap API
                const tab = bootstrap.Tab.getOrCreateInstance(triggerEl);
                tab.show();
            } catch (e) {
                console.warn("Bootstrap Tab error:", e);
                // Fallback manual si Bootstrap falla (Illegal Invocation, etc.)
                triggerEl.classList.add('active');
            }
        } 
        
        // 4. Refuerzo manual: Asegurar que el panel se ve
        const targetPane = document.querySelector(selector);
        if (targetPane) {
            targetPane.classList.add('show', 'active');
        } else {
            console.error(`Router: Panel no encontrado ${selector}`);
        }
    }
};
