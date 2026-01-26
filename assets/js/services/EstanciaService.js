import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE CONTROL DE ESTANCIA (EstanciaService)
 * ------------------------------------------------
 * Registra diariamente cuántas habitaciones están ocupadas y cuántas vacías.
 * Estos datos se usan para generar las estadísticas mensuales de ocupación.
 */
class EstanciaService extends BaseService {
    constructor() {
        super('riu_estancia_diaria');
    }

    /**
     * OBTENER TODOS LOS REGISTROS
     * Incluye una lógica de migración muy importante para pasar de un formato 
     * de "árbol" (Año > Mes > Día) a una lista plana mucho más fácil de manejar.
     */
    getRegistros() {
        const data = this.getAll();

        // MIGRACIÓN: Antiguamente los datos se guardaban anidados. 
        // Si detectamos ese formato, lo "aplanamos" a una lista YYYY-MM-DD.
        if (data && !Array.isArray(data) && typeof data === 'object') {
            const flatList = [];
            Object.keys(data).forEach(year => {
                Object.keys(data[year]).forEach(month => {
                    Object.keys(data[year][month]).forEach(day => {
                        const record = data[year][month][day];
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
            this.saveAll(flatList); // Guardamos la nueva versión aplanada
            return flatList;
        }
        return data || [];
    }

    /**
     * GUARDAR O ACTUALIZAR DÍA
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
     * ELIMINAR REGISTRO
     */
    removeRegistro(fecha) {
        const list = this.getRegistros().filter(r => r.fecha !== fecha);
        this.saveAll(list);
    }

    /**
     * FILTRAR POR MES
     * Ideal para el módulo de estadísticas.
     * @param {string} year - Año (ej: "2024")
     * @param {string} month - Mes (0-11)
     */
    getByMonth(year, month) {
        const m = (parseInt(month) + 1).toString().padStart(2, '0');
        const prefix = `${year}-${m}`; // Ejemplo: "2024-05"
        return this.getRegistros().filter(r => r.fecha.startsWith(prefix));
    }
}

export const estanciaService = new EstanciaService();
