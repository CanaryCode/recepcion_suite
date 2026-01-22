import { BaseService } from './BaseService.js';

class AyudaService extends BaseService {
    constructor() {
        super('riu_ayuda', { mañana: [], tarde: [], noche: [] });
    }

    /**
     * Obtiene la guía de pasos para un turno específico
     * @param {string} turno 'mañana', 'tarde' o 'noche'
     * @param {Array} defaultData Datos por defecto si no existe
     * @returns {Array} Lista de pasos
     */
    getGuia(turno, defaultData = []) {
        const allData = this.getAll();

        // Verificamos si tenemos datos en la nueva estructura unificada
        if (allData && allData[turno] && allData[turno].length > 0) {
            return allData[turno];
        }

        // Si no, intentamos migrar de la antigua estructura (claves separadas)
        const oldKey = `riu_guia_${turno}`;
        const oldData = localStorage.getItem(oldKey);
        if (oldData) {
            try {
                const parsed = JSON.parse(oldData);
                // Guardamos en la nueva estructura
                this.saveGuia(turno, parsed);
                // Opcional: localStorage.removeItem(oldKey); // Limpiar datos viejos
                return parsed;
            } catch (e) {
                console.error("Error migrando guía antigua", e);
            }
        }

        return defaultData;
    }

    /**
     * Guarda la guía del turno
     * @param {string} turno 
     * @param {Array} listaPasos 
     */
    saveGuia(turno, listaPasos) {
        const allData = this.getAll() || { mañana: [], tarde: [], noche: [] };
        allData[turno] = listaPasos;
        this.saveAll(allData);
    }

    // Sobrescribimos getAll/saveAll para manejar el objeto completo si es necesario,
    // pero BaseService.getAll() ya hace lo básico.
    // Simplemente agregamos métodos específicos de dominio.
}

export const ayudaService = new AyudaService();
