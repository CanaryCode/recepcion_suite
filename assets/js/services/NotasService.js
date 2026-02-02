import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE NOTAS PERMANENTES (NotasService)
 * -------------------------------------------
 * Gestiona el tablón de anuncios o notas que no caducan cada día.
 */
class NotasService extends BaseService {
    constructor() {
        super('riu_notas_permanentes');
        
        // Esquema de validación para notas
        this.schema = {
            id: 'number',
            titulo: 'string',
            contenido: 'string',
            color: 'string',
            fecha: 'string'
        };
    }

    async init() {
        await this.syncWithServer();
        return this.getAll();
    }

    /**
     * OBTENER TODAS LAS NOTAS
     */
    getNotas() {
        return this.getAll();
    }

    /**
     * GUARDAR O ACTUALIZAR NOTA
     */
    async saveNota(nota) {
        if (!nota.id) nota.id = Date.now();
        return this.update(nota.id, nota);
    }

    /**
     * ELIMINAR NOTA
     */
    async deleteNota(id) {
        return this.delete(id);
    }

    /**
     * BUSCAR POR ID
     */
    getNotaById(id) {
        return this.getByKey(id);
    }

    /**
     * GUARDAR TODAS (Reordenar)
     */
    async saveNotas(notas) {
        return this.save(notas);
    }
}

export const notasService = new NotasService();
