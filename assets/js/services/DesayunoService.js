import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE DESAYUNOS (DesayunoService)
 * --------------------------------------
 * Gestiona las peticiones de desayunos tempranos (Early Breakfast) 
 * solicitados por clientes que salen antes de que abra el buffet.
 */
class DesayunoService extends BaseService {
    constructor() {
        super('riu_desayunos', {}); // Estructura: { "Hab": { pax: 1, hora: "06:30" } }
    }

    async init() {
        await this.syncWithServer();
    }

    /**
     * OBTENER TODOS LOS DESAYUNOS
     */
    getDesayunos() {
        return this.getAll();
    }

    /**
     * GUARDAR CAMBIOS
     */
    saveDesayunos(data) {
        this.saveAll(data);
    }

    /**
     * AÑADIR PEDIDO
     */
    addDesayuno(hab, data) {
        const current = this.getDesayunos();
        current[hab] = data;
        this.saveDesayunos(current);
    }

    /**
     * ELIMINAR PEDIDO
     */
    removeDesayuno(hab) {
        const current = this.getDesayunos();
        delete current[hab];
        this.saveDesayunos(current);
    }

    /**
     * VACIAR LISTA (Reset diario)
     */
    clearDesayunos() {
        this.saveDesayunos({});
    }
}

export const desayunoService = new DesayunoService();
