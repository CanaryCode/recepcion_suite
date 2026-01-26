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
        const cleanId = selector.replace('#', '');

        // El sistema usa botones ocultos (ID 'tab-...') para activar pestañas de Bootstrap
        // sin que el menú principal tenga que estar abierto.
        const triggerEl = document.getElementById('tab-' + cleanId);

        if (triggerEl) {
            // Pasos de limpieza visual:
            // -------------------------
            // 1. Ocultar todos los paneles (tab-pane) activos
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });

            // 2. Quitar el color azul (active) de los botones del menú superior
            document.querySelectorAll('#mainTabs .nav-link, #mainTabs .dropdown-item').forEach(btn => {
                btn.classList.remove('active');
            });

            // 3. Activar la nueva pestaña a través de Bootstrap
            const tab = bootstrap.Tab.getOrCreateInstance(triggerEl);
            tab.show();

            // 4. Refuerzo manual: Asegurar que el panel se ve (Bootstrap a veces falla en cascada)
            const targetPane = document.querySelector(selector);
            if (targetPane) targetPane.classList.add('show', 'active');
        }
    }
};
