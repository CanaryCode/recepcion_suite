import { BaseService } from './BaseService.js';

class CenaFriaService extends BaseService {
    constructor() {
        super('riu_cenas_frias', {});
    }

    /**
     * Obtiene todas las cenas (Objeto hash)
     */
    getCenas() {
        return this.getAll();
    }

    /**
     * Guarda el objeto completo de cenas
     */
    saveCenas(data) {
        this.saveAll(data);
    }

    addCena(hab, data) {
        const current = this.getCenas();
        current[hab] = data;
        this.saveCenas(current);
    }

    removeCena(hab) {
        const current = this.getCenas();
        delete current[hab];
        this.saveCenas(current);
    }

    clearCenas() {
        this.saveCenas({});
    }
}

export const cenaFriaService = new CenaFriaService();
