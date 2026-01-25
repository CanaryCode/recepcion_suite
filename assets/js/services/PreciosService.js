import { BaseService } from './BaseService.js';
import { RAW_PRECIOS_DATA } from '../data/PreciosData.js';

class PreciosService extends BaseService {
    constructor() {
        super('riu_precios', RAW_PRECIOS_DATA);
        this.checkAndSeedDefaults();
    }

    checkAndSeedDefaults() {
        // Force merge if defaults are missing in current data
        const current = this.getPrecios();
        let changed = false;

        RAW_PRECIOS_DATA.forEach(defItem => {
            const exists = current.some(p => p.id === defItem.id);
            if (!exists) {
                current.push(defItem);
                changed = true;
            }
        });

        if (changed) {
            console.log("Seeding missing default products...");
            this.savePrecios(current);
        }
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
