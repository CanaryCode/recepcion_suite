/**
 * UI CORE API (Ui.js)
 * -------------------
 * Centraliza patrones de interfaz de usuario reutilizables para garantizar consistencia y rendimiento.
 * 
 * Funcionalidades principales:
 * - Infinite Scroll (Intersection Observer Wrapper)
 * - Generación de Sentinels (Spinners de carga)
 */

export const Ui = {

    /**
     * CONFIGURAR SCROLL INFINITO
     * Crea y gestiona un IntersectionObserver para cargar datos automáticamente al hacer scroll.
     * 
     * @param {Object} config Configuración del scroll
     * @param {Function} config.onLoadMore Función a ejecutar cuando se llega al final
     * @param {string} [config.sentinelId='sentinel-loader'] ID del elemento centinela
     * @param {string} [config.rootMargin='100px'] Margen de anticipación antes de cargar
     * @returns {Object} Controlador con métodos disconnect() y reconnect()
     */
    infiniteScroll: ({ onLoadMore, sentinelId = 'sentinel-loader', rootMargin = '100px' }) => {
        let observer = null;

        const connect = () => {
            const sentinel = document.getElementById(sentinelId);
            if (!sentinel) return; // Si no hay sentinel, no observamos nada (lista vacía o fin de datos)

            if (observer) observer.disconnect();

            observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        onLoadMore();
                    }
                });
            }, {
                root: null,
                rootMargin: rootMargin,
                threshold: 0.1
            });

            observer.observe(sentinel);
        };

        const disconnect = () => {
            if (observer) observer.disconnect();
            observer = null;
        };

        // Auto-conectar inicial si existe el sentinel
        setTimeout(connect, 100);

        return {
            disconnect,
            reconnect: connect
        };
    },

    /**
     * CREAR O OBTENER ELEMENTO SENTINEL (SPINNER ROW)
     * Genera la fila HTML con el spinner para indicar carga.
     * 
     * @param {string} id ID del elemento
     * @param {string} text Texto a mostrar junto al spinner
     * @param {number} colspan Número de columnas que ocupará en la tabla
     * @returns {HTMLElement} Elemento TR listo para insertar
     */
    createSentinelRow: (id, text = 'Cargando más registros...', colspan = 5) => {
        const tr = document.createElement('tr');
        tr.id = id;
        tr.innerHTML = `<td colspan="${colspan}" class="text-center py-2 text-muted small"><span class="spinner-border spinner-border-sm me-2"></span>${text}</td>`;
        return tr;
    }
};
