/**
 * SISTEMA DE CARGA DE COMPONENTES (CompLoader)
 * ------------------------------------------
 * Para mantener el archivo index.html limpio, cada módulo (Agenda, Riu, etc.)
 * tiene su propio archivo HTML en la carpeta 'assets/templates'.
 * Este módulo se encarga de leer esos archivos e inyectarlos en la página.
 */

export const CompLoader = {
    /**
     * Carga un único archivo HTML dentro de un contenedor (div).
     * @param {string} id - El ID del div donde se meterá el HTML.
     * @param {string} path - La ruta del archivo .html a cargar.
     */
    loadComponent: async (id, path) => {
        try {
            // Buscar el contenedor
            const container = document.getElementById(id);
            if (!container) {
                console.warn(`CompLoader: No se encontró el contenedor con ID '${id}'`);
                return;
            }

            // OPTIMIZACIÓN: Si ya tiene contenido (inyectado manualmente en index.html), no recargar.
            // Esto mejora drásticamente la velocidad de arranque (Zero-Layout-Shift).
            // REVERTIDO: Usuario reporta bucle/issues. Volvemos a carga forzada.
            /* 
            if (container.innerHTML.trim().length > 10) {
                // console.log(`CompLoader: Saltando carga de [${id}], ya tiene contenido pre-inyectado.`);
                return;
            }
            */

            // Realizar la petición web para obtener el archivo con cache-busting
            const response = await fetch(`${path}?v=FIX_FINAL_V2_1`);
            if (!response.ok) throw new Error(`No se pudo cargar el archivo: ${path}`);
            
            // Convertir la respuesta a texto puro (HTML)
            const html = await response.text();
            container.innerHTML = html;

        } catch (error) {
            console.error(`Error crítico cargando el componente [${id}]:`, error);
        }
    },

    /**
     * CARGADOR MASIVO
     * Carga una lista completa de componentes en paralelo.
     * @param {Array<{id: string, path: string}>} components - Lista de objetos id/ruta.
     */
    loadAll: async (components) => {
        // Ejecutamos todas las cargas al mismo tiempo para que la app arranque más rápido
        const promises = components.map(comp => CompLoader.loadComponent(comp.id, comp.path));
        await Promise.all(promises);
        console.log("CompLoader: Todos los componentes han sido inyectados.");
    }
};
