import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE CENAS FRÍAS (CenaFriaService)
 * ----------------------------------------
 * Gestiona las solicitudes de cenas frías (picnic o cena tardía) por habitación.
 */
class CenaFriaService extends BaseService {
    constructor() {
        super('riu_cenas_frias', {}); // Estructura: { "Hab": { pax: 2, obs: "..." } }
    }

    async init() {
        await this.syncWithServer();
    }

    /**
     * OBTENER TODAS LAS SOLICITUDES
     */
    getCenas() {
        return this.getAll();
    }

    /**
     * GUARDAR CAMBIOS
     */
    saveCenas(data) {
        this.saveAll(data);
    }

    /**
     * AÑADIR CENA A UNA HABITACIÓN
     */
    addCena(hab, data) {
        const current = this.getCenas();
        current[hab] = data;
        this.saveCenas(current);
    }

    /**
     * ELIMINAR CENA
     */
    removeCena(hab) {
        const current = this.getCenas();
        delete current[hab];
        this.saveCenas(current);
    }

    /**
     * VACIAR LISTA
     */
    clearCenas() {
        this.saveCenas({});
    }
}

export const cenaFriaService = new CenaFriaService();
