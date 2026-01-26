import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE CAJAS FUERTES (SafeService)
 * --------------------------------------
 * Gestiona el alquiler de las cajas de seguridad de las habitaciones.
 * Controla la fecha de activación, los días contratados y el autor.
 */
class SafeService extends BaseService {
    constructor() {
        super('riu_safe_rentals');
    }

    /**
     * OBTENER ALQUILERES ACTIVOS
     * Incluye una lógica de migración por si el usuario viene de versiones muy antiguas.
     */
    getRentals() {
        const data = this.getAll();
        
        // MIGRACIÓN: Antiguamente se guardaba como un objeto { "Hab": {...} }.
        // Ahora usamos una lista de objetos [{ habitacion: "Hab", ... }].
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
     * GUARDAR LISTA COMPLETA
     */
    saveRentals(rentals) {
        this.saveAll(rentals);
    }

    /**
     * BUSCAR POR HABITACIÓN
     */
    getRentalByHab(habNum) {
        return this.getRentals().find(r => r.habitacion === habNum);
    }

    /**
     * GUARDAR O ACTUALIZAR ALQUILER
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
     * FINALIZAR ALQUILER
     */
    removeRental(habNum) {
        const rentals = this.getRentals().filter(r => r.habitacion !== habNum);
        this.saveRentals(rentals);
    }
}

export const safeService = new SafeService();
