import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE DESPERTADORES (DespertadorService)
 * --------------------------------------------
 * Gestiona el listado de llamadas de despertador solicitadas por los clientes.
 * Permite anotar la habitación, la hora y observaciones especiales.
 */
class DespertadorService extends BaseService {
    constructor() {
        super('riu_despertadores');
    }

    /**
     * OBTENER TODOS LOS DESPERTADORES
     * Incluye una lógica de migración para convertir el antiguo formato de objeto 
     * al nuevo formato de lista (Array), que es más flexible para filtros.
     */
    getDespertadores() {
        const data = this.getAll();
        
        // MIGRACIÓN: Si los datos vienen como objeto { "101": {...} }, los pasamos a lista.
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
     * GUARDAR LISTA COMPLETA
     */
    saveDespertadores(list) {
        this.saveAll(list);
    }

    /**
     * GUARDAR O ACTUALIZAR DESPERTADOR
     * Si la habitación ya tiene una hora anotada, la sobrecribe.
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
     * ELIMINAR DESPERTADOR
     */
    removeDespertador(habNum) {
        const list = this.getDespertadores().filter(d => d.habitacion !== habNum);
        this.saveDespertadores(list);
    }

    /**
     * BUSCAR POR HABITACIÓN
     */
    getDespertadorByHab(habNum) {
        return this.getDespertadores().find(d => d.habitacion === habNum);
    }

    /**
     * LIMPIAR TODA LA LISTA (Reset diario)
     */
    clearAll() {
        this.clear();
    }
}

export const despertadorService = new DespertadorService();
