import { BaseService } from './BaseService.js';

class DespertadorService extends BaseService {
    constructor() {
        super('riu_despertadores');
    }

    /**
     * Obtiene todos los despertadores
     * @returns {Object[]} Array de despertadores
     */
    getDespertadores() {
        const data = this.getAll();
        // Migración automática de Objeto a Array si detectamos el formato antiguo
        if (data && !Array.isArray(data) && typeof data === 'object') {
            const asArray = Object.keys(data).map(hab => ({
                habitacion: hab,
                ...data[hab]
            }));
            this.saveAll(asArray);
            return asArray;
        }
        return data || [];
    }

    /**
     * Guarda la lista de despertadores
     * @param {Object[]} list Array de despertadores
     */
    saveDespertadores(list) {
        this.saveAll(list);
    }

    /**
     * Añade o actualiza un despertador
     * @param {Object} item Objeto despertador
     */
    saveDespertador(item) {
        let list = this.getDespertadores();
        const existingIndex = list.findIndex(d => d.habitacion === item.habitacion);

        if (existingIndex >= 0) {
            list[existingIndex] = item;
        } else {
            list.push(item);
        }

        this.saveDespertadores(list);
    }

    /**
     * Elimina un despertador
     * @param {string} habNum 
     */
    removeDespertador(habNum) {
        const list = this.getDespertadores().filter(d => d.habitacion !== habNum);
        this.saveDespertadores(list);
    }

    /**
     * Obtiene despertador por habitación
     * @param {string} habNum 
     * @returns {Object|undefined}
     */
    getDespertadorByHab(habNum) {
        return this.getDespertadores().find(d => d.habitacion === habNum);
    }

    /**
     * Limpia todos los despertadores
     */
    clearAll() {
        this.clear();
    }
}

export const despertadorService = new DespertadorService();
