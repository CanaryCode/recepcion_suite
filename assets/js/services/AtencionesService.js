import { BaseService } from './BaseService.js';

class AtencionesService extends BaseService {
    constructor() {
        super('riu_atenciones_v2', {});
    }

    async getAtenciones() {
        return await this.getAll();
    }

    async saveAtenciones(data) {
        return await this.save(data);
    }

    async addAtencion(habitacion, tipos, comentario, autor) {
        const data = await this.getAll();
        data[habitacion] = { tipos, comentario, autor };
        await this.save(data);
    }

    async removeAtencion(habitacion) {
        const data = await this.getAll();
        delete data[habitacion];
        await this.save(data);
    }

    async clearAll() {
        await this.save({});
    }
}

export const atencionesService = new AtencionesService();
