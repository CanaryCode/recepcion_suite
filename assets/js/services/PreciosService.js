import { BaseService } from './BaseService.js';
import { RAW_PRECIOS_DATA } from '../data/PreciosData.js';

/**
 * SERVICIO DE TARIFAS Y PRECIOS (PreciosService)
 * ---------------------------------------------
 * Gestiona el listado de cargos extra que se pueden aplicar 
 * (ej: Parking, Perros, Suplementos, etc.).
 */
class PreciosService extends BaseService {
    constructor() {
        // Al arrancar, si no hay datos, carga los "maestros" desde RAW_PRECIOS_DATA
        super('riu_precios', RAW_PRECIOS_DATA);
        this.checkAndSeedDefaults();
    }

    /**
     * VERIFICACIÓN DE DATOS MAESTROS
     * Comprueba que todos los productos obligatorios del hotel estén en la lista.
     * Si falta alguno nuevo que se haya añadido al código, lo inyecta automáticamente.
     */
    checkAndSeedDefaults() {
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
            console.log("Actualizando lista de precios con nuevos servicios maestros...");
            this.savePrecios(current);
        }
    }

    /**
     * OBTENER TODOS LOS PRECIOS
     */
    getPrecios() {
        return this.getAll();
    }

    /**
     * GUARDAR LISTA
     */
    savePrecios(precios) {
        this.saveAll(precios);
    }

    /**
     * AÑADIR NUEVO CARGO
     */
    addPrecio(precio) {
        const current = this.getPrecios();
        current.push(precio);
        this.savePrecios(current);
    }

    /**
     * ACTUALIZAR CARGO
     */
    updatePrecio(precioActualizado) {
        const current = this.getPrecios().map(p =>
            p.id === precioActualizado.id ? precioActualizado : p
        );
        this.savePrecios(current);
    }

    /**
     * ELIMINAR CARGO
     */
    removePrecio(id) {
        const current = this.getPrecios().filter(p => p.id !== id);
        this.savePrecios(current);
    }

    /**
     * BUSCAR POR ID
     */
    getPrecioById(id) {
        return this.getPrecios().find(p => p.id === id);
    }

    /**
     * MARCAR/DESMARCAR FAVORITO
     * Los favoritos aparecen destacados en el teclado de facturación rápida.
     */
    toggleFavorito(id) {
        const current = this.getPrecios().map(p =>
            p.id === id ? { ...p, favorito: !p.favorito } : p
        );
        this.savePrecios(current);
    }
}

export const preciosService = new PreciosService();
