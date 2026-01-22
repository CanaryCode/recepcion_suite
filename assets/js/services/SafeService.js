import { BaseService } from './BaseService.js';

class SafeService extends BaseService {
    constructor() {
        super('riu_safe_rentals');
    }

    /**
     * Obtiene todos los alquileres activos
     * @returns {Object[]} Array de alquileres
     */
    getRentals() {
        const data = this.getAll();
        // Migración automática de Objeto a Array si detectamos el formato antiguo
        if (data && !Array.isArray(data) && typeof data === 'object') {
            const asArray = Object.keys(data).map(hab => ({
                habitacion: hab,
                ...data[hab]
            }));
            this.saveAll(asArray);
            return asArray;
        }
        return data || [];
    }

    /**
     * Guarda la lista de alquileres
     * @param {Object[]} rentals Array de alquileres
     */
    saveRentals(rentals) {
        this.saveAll(rentals);
    }

    /**
     * Busca un alquiler por número de habitación
     * @param {string} habNum Número de habitación
     * @returns {Object|undefined}
     */
    getRentalByHab(habNum) {
        return this.getRentals().find(r => r.habitacion === habNum);
    }

    /**
     * Añade o actualiza un alquiler
     * @param {Object} rental Objeto alquiler
     */
    saveRental(rental) {
        let rentals = this.getRentals();
        const existingIndex = rentals.findIndex(r => r.habitacion === rental.habitacion);

        if (existingIndex >= 0) {
            rentals[existingIndex] = rental;
        } else {
            rentals.push(rental);
        }

        this.saveRentals(rentals);
    }

    /**
     * Elimina un alquiler
     * @param {string} habNum 
     */
    removeRental(habNum) {
        const rentals = this.getRentals().filter(r => r.habitacion !== habNum);
        this.saveRentals(rentals);
    }
}

export const safeService = new SafeService();
