/**
 * Sistema de Enrutamiento y Navegación
 * Gestiona la navegación por pestañas y "Deep Linking" simple.
 */

export const Router = {
    init: () => {
        // Exponer globalmente para compatibilidad con onclick HTML
        window.navegarA = Router.navegarA;
        Router.setupGlobalSearch(); // Vincula eventos de búsqueda si existen
    },

    navegarA: (targetId) => {
        // 1. Normalizar el ID
        const selector = targetId.startsWith('#') ? targetId : '#' + targetId;
        const cleanId = selector.replace('#', '');

        // 2. Buscar el disparador oculto (tab-...) para evitar que el menú se abra
        const triggerEl = document.getElementById('tab-' + cleanId);

        if (triggerEl) {
            // 1. FUERZA BRUTA: Ocultar todos los paneles activos manualmente
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });

            // 2. Desactivar botones del menú principal
            document.querySelectorAll('#mainTabs .nav-link, #mainTabs .dropdown-item').forEach(btn => {
                btn.classList.remove('active');
            });

            // 3. Activar la pestaña deseada usando Bootstrap
            const tab = bootstrap.Tab.getOrCreateInstance(triggerEl);
            tab.show();

            // 4. Refuerzo: Asegurar que el panel destino tenga las clases (por si Bootstrap falla)
            const targetPane = document.querySelector(selector);
            if (targetPane) targetPane.classList.add('show', 'active');
        }
    },

    setupGlobalSearch: () => {
        // Lógica de búsqueda movida a Search.js pero referenciada si es necesario,
        // o mantenida aquí si es simple. Por ahora la moveremos a Search.js según el plan.
    }
};
