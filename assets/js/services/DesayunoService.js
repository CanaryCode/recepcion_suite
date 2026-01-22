import { BaseService } from './BaseService.js';

class DesayunoService extends BaseService {
    constructor() {
        super('riu_desayunos', {}); // Default value is empty object {} for Desayunos
    }

    /**
     * Obtiene todos los desayunos (Objeto hash)
     */
    getDesayunos() {
        return this.getAll();
    }

    /**
     * Guarda el objeto completo de desayunos
     */
    saveDesayunos(data) {
        this.saveAll(data);
    }

    addDesayuno(hab, data) {
        const current = this.getDesayunos();
        current[hab] = data;
        this.saveDesayunos(current);
    }

    removeDesayuno(hab) {
        const current = this.getDesayunos();
        delete current[hab];
        this.saveDesayunos(current);
    }

    clearDesayunos() {
        this.saveDesayunos({});
    }
}

export const desayunoService = new DesayunoService();
