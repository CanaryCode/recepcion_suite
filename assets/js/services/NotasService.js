import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE NOTAS PERMANENTES (NotasService)
 * -------------------------------------------
 * Gestiona el tablón de anuncios o notas que no caducan cada día 
 * (ej: "Código de la puerta cambiado", "Recordar pedir llaves al 104").
 */
class NotasService extends BaseService {
    constructor() {
        super('riu_notas_permanentes');
    }

    /**
     * OBTENER TODAS LAS NOTAS
     * @returns {Object[]} Lista de notas guardadas.
     */
    getNotas() {
        return this.getAll();
    }

    /**
     * GUARDAR CAMBIOS
     */
    saveNotas(notas) {
        this.saveAll(notas);
    }

    /**
     * AÑADIR NOTA
     * Coloca la nota al principio de la lista (lo más nuevo arriba).
     */
    addNota(nota) {
        const current = this.getNotas();
        current.unshift(nota);
        this.saveNotas(current);
    }

    /**
     * ACTUALIZAR NOTA
     */
    updateNota(notaActualizada) {
        const current = this.getNotas().map(n =>
            n.id === notaActualizada.id ? notaActualizada : n
        );
        this.saveNotas(current);
    }

    /**
     * ELIMINAR NOTA
     */
    removeNota(id) {
        const current = this.getNotas().filter(n => n.id !== id);
        this.saveNotas(current);
    }

    /**
     * BUSCAR POR ID
     */
    getNotaById(id) {
        return this.getNotas().find(n => n.id === id);
    }
}

export const notasService = new NotasService();
