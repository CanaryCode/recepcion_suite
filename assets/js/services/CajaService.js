import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE CAJA (CajaService)
 * ----------------------------
 * Gestiona la persistencia del arqueo de caja diario.
 */
class CajaService extends BaseService {
    constructor() {
        super('arqueo_caja', {
            vales: [],
            desembolsos: [],
            fecha: null,
            turno: null,
            comentarios: ""
        });

        // Definición del esquema para validación automática
        this.schema = {
            vales: 'object', // Los arrays son identificados como objetos por typeof
            desembolsos: 'object',
            comentarios: 'string'
        };
    }

    /**
     * OBTENER DATOS DE LA SESIÓN ACTUAL
     */
    getSessionData() {
        return this.getAll();
    }

    /**
     * GUARDAR VALES
     */
    async saveVales(vales) {
        const data = { ...this.getAll() };
        data.vales = vales;
        return this.save(data);
    }

    /**
     * GUARDAR DESEMBOLSOS
     */
    async saveDesembolsos(desembolsos) {
        const data = { ...this.getAll() };
        data.desembolsos = desembolsos;
        return this.save(data);
    }

    /**
     * GUARDAR COMENTARIOS Y METADATOS
     */
    async saveMetadata(metadata) {
        const data = { ...this.getAll() };
        Object.assign(data, metadata);
        return this.save(data);
    }

    /**
     * RESETEAR CAJA PARA NUEVO TURNO
     */
    reset() {
        return this.save(this.defaultValue);
    }
}

export const cajaService = new CajaService();
