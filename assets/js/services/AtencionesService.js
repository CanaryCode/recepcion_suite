import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE ATENCIONES (AtencionesService)
 * -----------------------------------------
 * Gestiona los detalles especiales que requieren las habitaciones 
 * (ej: Flores, Fruta, Cuna, etc.). Los datos se guardan por número de habitación.
 */
class AtencionesService extends BaseService {
    constructor() {
        super('riu_atenciones_v2', {}); // Usamos un objeto { "101": {...}, "102": {...} }
    }

    async getAtenciones() {
        return await this.getAll();
    }

    async saveAtenciones(data) {
        return await this.save(data);
    }

    /**
     * AÑADIR O ACTUALIZAR ATENCIÓN
     * @param {string} habitacion - Número de la habitación
     * @param {Array} tipos - Lista de tipos (Flores, Vino, etc.)
     * @param {string} comentario - Notas adicionales
     * @param {string} autor - Quién anotó la atención
     */
    async addAtencion(habitacion, tipos, comentario, autor) {
        const data = await this.getAll();
        data[habitacion] = { tipos, comentario, autor };
        await this.save(data);
    }

    /**
     * ELIMINAR ATENCIÓN
     * Se llama cuando la atención ya ha sido entregada o cancelada.
     */
    async removeAtencion(habitacion) {
        const data = await this.getAll();
        delete data[habitacion];
        await this.save(data);
    }

    /**
     * LIMPIAR TODO
     * Borra todas las atenciones actuales.
     */
    async clearAll() {
        await this.save({});
    }
}

export const atencionesService = new AtencionesService();
