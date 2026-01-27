import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE TRASLADOS (TransfersService)
 * ---------------------------------------
 * Gestiona la agenda de llegadas y salidas de clientes que requieren transfer.
 * Extiende BaseService para garantizar consistencia y persistencia en JSON.
 */
class TransfersService extends BaseService {
    constructor() {
        super('app_transfers_data', []); // Key matches old one for compatibility
    }

    async init() {
        await this.syncWithServer();
    }

    /**
     * OBTENER TODOS LOS TRASLADOS
     * Los devuelve ordenados por fecha y hora para que los más cercanos aparezcan primero.
     */
    getAll() {
        const items = super.getAll() || [];
        return items.sort((a, b) => {
            const dateA = new Date(`${a.fecha}T${a.hora}`);
            const dateB = new Date(`${b.fecha}T${b.hora}`);
            return dateA - dateB;
        });
    }

    getById(id) {
        return this.getAll().find(i => i.id === id);
    }

    addTransfer(item) {
        const current = this.getAll();
        current.push(item);
        this.saveAll(current);
    }

    updateTransfer(updatedItem) {
        const current = this.getAll();
        const index = current.findIndex(i => i.id === updatedItem.id);
        if (index !== -1) {
            current[index] = updatedItem;
            this.saveAll(current);
            return true;
        }
        return false;
    }

    deleteTransfer(id) {
        const current = this.getAll().filter(i => i.id !== id);
        this.saveAll(current);
    }
    
    /**
     * LIMPIEZA DE HISTORIAL
     * Borra automáticamente los transfers de hace más de una semana.
     */
    cleanupOld(daysToKeep = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysToKeep);
        
        const current = this.getAll();
        const initialLen = current.length;
        
        const filtered = current.filter(i => {
            const itemDate = new Date(`${i.fecha}T${i.hora}`);
            return itemDate >= cutoff;
        });
        
        if (filtered.length !== initialLen) {
            this.saveAll(filtered);
        }
    }
}

export const transfersService = new TransfersService();
