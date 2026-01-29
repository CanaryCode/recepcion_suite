import { BaseService } from './BaseService.js';
import { RAW_PRECIOS_DATA } from '../data/PreciosData.js';

/**
 * SERVICIO DE TARIFAS Y PRECIOS (PreciosService)
 * ---------------------------------------------
 * Gestiona el listado de cargos extra que se pueden aplicar.
 */
class PreciosService extends BaseService {
    constructor() {
        super('riu_precios', RAW_PRECIOS_DATA);
        
        // Esquema de validación para tarifas
        this.schema = {
            id: 'number',
            concepto: 'string',
            precio: 'number',
            categoria: 'string'
        };
    }

    async init() {
        await this.syncWithServer();
        this.checkAndSeedDefaults();
    }

    /**
     * VERIFICACIÓN DE DATOS MAESTROS
     */
    checkAndSeedDefaults() {
        const current = this.getAll();
        let changed = false;

        RAW_PRECIOS_DATA.forEach(defItem => {
            const exists = current.some(p => p.id === defItem.id);
            if (!exists) {
                current.push(defItem);
                changed = true;
            }
        });

        if (changed) {
            this.save(current);
        }
    }

    /**
     * OBTENER TODOS LOS PRECIOS
     */
    getPrecios() {
        return this.getAll();
    }

    /**
     * GUARDAR O ACTUALIZAR PRECIO
     */
    async savePrecio(precio) {
        if (!precio.id) precio.id = Date.now();
        return this.update(precio.id, precio);
    }

    /**
     * ELIMINAR PRECIO
     */
    async deletePrecio(id) {
        return this.delete(id);
    }

    /**
     * BUSCAR POR ID
     */
    getPrecioById(id) {
        return this.getByKey(id);
    }

    /**
     * MARCAR/DESMARCAR FAVORITO
     */
    async toggleFavorito(id) {
        const item = this.getByKey(id);
        if (item) {
            item.favorito = !item.favorito;
            return this.update(id, item);
        }
    }
}

export const preciosService = new PreciosService();
