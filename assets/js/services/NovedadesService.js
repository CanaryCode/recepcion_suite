import { BaseService } from './BaseService.js';

class NovedadesService extends BaseService {
    constructor() {
        super('riu_novedades');
    }

    /**
     * Obtiene todas las novedades
     * @returns {Object[]} Array de novedades
     */
    getNovedades() {
        return this.getAll();
    }

    /**
     * Guarda la lista de novedades
     * @param {Object[]} novedades 
     */
    saveNovedades(novedades) {
        this.saveAll(novedades);
    }

    /**
     * Añade una nueva novedad
     * @param {Object} novedad 
     */
    addNovedad(novedad) {
        // Usar unshift para que sea cronológico inverso (como en el original)
        const current = this.getNovedades();
        current.unshift(novedad);
        this.saveNovedades(current);
    }

    /**
     * Actualiza una novedad existente
     * @param {Object} novedadActualizada 
     */
    updateNovedad(novedadActualizada) {
        const current = this.getNovedades().map(n =>
            n.id === novedadActualizada.id ? novedadActualizada : n
        );
        this.saveNovedades(current);
    }

    /**
     * Elimina una novedad por ID
     * @param {number|string} id 
     */
    removeNovedad(id) {
        const current = this.getNovedades().filter(n => n.id !== id);
        this.saveNovedades(current);
    }

    /**
     * Obtiene una novedad por ID
     * @param {number|string} id 
     * @returns {Object|undefined}
     */
    getNovedadById(id) {
        return this.getNovedades().find(n => n.id === id);
    }
}

export const novedadesService = new NovedadesService();
