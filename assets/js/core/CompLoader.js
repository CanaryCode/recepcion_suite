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
            // Realizar la petición web para obtener el archivo
            const response = await fetch(path);
            if (!response.ok) throw new Error(`No se pudo cargar el archivo: ${path}`);
            
            // Convertir la respuesta a texto puro (HTML)
            const html = await response.text();
            
            // Buscar el contenedor en la página y meter el HTML dentro
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = html;
            } else {
                console.warn(`CompLoader: No se encontró el contenedor con ID '${id}'`);
            }
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
