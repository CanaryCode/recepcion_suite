import { BaseService } from './BaseService.js';

class PreciosService extends BaseService {
    constructor() {
        super('riu_precios');
    }

    /**
     * Obtiene todos los precios
     * @returns {Object[]} Array de precios
     */
    getPrecios() {
        return this.getAll();
    }

    /**
     * Guarda la lista de precios
     * @param {Object[]} precios 
     */
    savePrecios(precios) {
        this.saveAll(precios);
    }

    /**
     * Añade un nuevo precio
     * @param {Object} precio 
     */
    addPrecio(precio) {
        const current = this.getPrecios();
        current.push(precio);
        this.savePrecios(current);
    }

    /**
     * Actualiza un precio existente
     * @param {Object} precioActualizado 
     */
    updatePrecio(precioActualizado) {
        const current = this.getPrecios().map(p =>
            p.id === precioActualizado.id ? precioActualizado : p
        );
        this.savePrecios(current);
    }

    /**
     * Elimina un precio por ID
     * @param {number|string} id 
     */
    removePrecio(id) {
        const current = this.getPrecios().filter(p => p.id !== id);
        this.savePrecios(current);
    }

    /**
     * Obtiene un precio por ID
     * @param {number|string} id 
     * @returns {Object|undefined}
     */
    getPrecioById(id) {
        return this.getPrecios().find(p => p.id === id);
    }

    /**
     * Alterna el estado de favorito de un precio
     * @param {number|string} id 
     */
    toggleFavorito(id) {
        const current = this.getPrecios().map(p =>
            p.id === id ? { ...p, favorito: !p.favorito } : p
        );
        this.savePrecios(current);
    }
}

export const preciosService = new PreciosService();
