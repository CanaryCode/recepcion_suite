import { BaseService } from './BaseService.js';

class EstanciaService extends BaseService {
    constructor() {
        super('riu_estancia_diaria');
    }

    /**
     * Obtiene todos los registros de estancia
     * @returns {Object[]} Array de registros
     */
    getRegistros() {
        const data = this.getAll();

        // Migración automática de Objeto Anidado a Array Plano
        if (data && !Array.isArray(data) && typeof data === 'object') {
            const flatList = [];
            Object.keys(data).forEach(year => {
                Object.keys(data[year]).forEach(month => {
                    Object.keys(data[year][month]).forEach(day => {
                        const record = data[year][month][day];
                        // Construir fecha ISO YYYY-MM-DD
                        // Nota: month es index 0-11
                        const m = (parseInt(month) + 1).toString().padStart(2, '0');
                        const d = day.toString().padStart(2, '0');
                        const fecha = `${year}-${m}-${d}`;

                        flatList.push({
                            fecha: fecha,
                            ocupadas: record.ocupadas,
                            vacias: record.vacias,
                            totalHab: record.totalHab
                        });
                    });
                });
            });
            this.saveAll(flatList);
            return flatList;
        }
        return data || [];
    }

    /**
     * Guarda un registro diario
     * @param {Object} registro Objeto con fecha, ocupadas, vacias, totalHab
     */
    saveRegistro(registro) {
        let list = this.getRegistros();
        const existingIndex = list.findIndex(r => r.fecha === registro.fecha);

        if (existingIndex >= 0) {
            list[existingIndex] = registro;
        } else {
            list.push(registro);
        }

        this.saveAll(list);
    }

    /**
     * Elimina un registro por fecha
     * @param {string} fecha YYYY-MM-DD
     */
    removeRegistro(fecha) {
        const list = this.getRegistros().filter(r => r.fecha !== fecha);
        this.saveAll(list);
    }

    /**
     * Obtiene registros filtrados por año y mes
     * @param {number|string} year 
     * @param {number|string} month (0-11)
     * @returns {Object[]} Registros del mes
     */
    getByMonth(year, month) {
        const m = (parseInt(month) + 1).toString().padStart(2, '0');
        const prefix = `${year}-${m}`; // YYYY-MM
        return this.getRegistros().filter(r => r.fecha.startsWith(prefix));
    }
}

export const estanciaService = new EstanciaService();
