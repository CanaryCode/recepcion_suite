import { BaseService } from './BaseService.js';

class NotasService extends BaseService {
    constructor() {
        super('riu_notas_permanentes');
    }

    /**
     * Obtiene todas las notas
     * @returns {Object[]} Array de notas
     */
    getNotas() {
        return this.getAll();
    }

    /**
     * Guarda la lista de notas
     * @param {Object[]} notas 
     */
    saveNotas(notas) {
        this.saveAll(notas);
    }

    /**
     * Añade una nueva nota
     * @param {Object} nota 
     */
    addNota(nota) {
        const current = this.getNotas();
        current.unshift(nota);
        this.saveNotas(current);
    }

    /**
     * Actualiza una nota existente
     * @param {Object} notaActualizada 
     */
    updateNota(notaActualizada) {
        const current = this.getNotas().map(n =>
            n.id === notaActualizada.id ? notaActualizada : n
        );
        this.saveNotas(current);
    }

    /**
     * Elimina una nota por ID
     * @param {number|string} id 
     */
    removeNota(id) {
        const current = this.getNotas().filter(n => n.id !== id);
        this.saveNotas(current);
    }

    /**
     * Obtiene una nota por ID
     * @param {number|string} id 
     * @returns {Object|undefined}
     */
    getNotaById(id) {
        return this.getNotas().find(n => n.id === id);
    }
}

export const notasService = new NotasService();
