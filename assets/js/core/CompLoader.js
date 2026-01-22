/**
 * Sistema de Carga de Componentes
 * Gestiona la inyección asíncrona de plantillas HTML.
 */

export const CompLoader = {
    /**
     * Carga un componente HTML en un contenedor específico
     * @param {string} id - ID del contenedor destino
     * @param {string} path - Ruta al archivo HTML
     */
    loadComponent: async (id, path) => {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
            const html = await response.text();
            const container = document.getElementById(id);
            if (container) container.innerHTML = html;
        } catch (error) {
            console.error(`Error cargando componente [${id}]:`, error);
        }
    },

    /**
     * Carga una lista de componentes en serie
     * @param {Array<{id: string, path: string}>} components 
     */
    loadAll: async (components) => {
        for (const comp of components) {
            await CompLoader.loadComponent(comp.id, comp.path);
        }
    }
};
