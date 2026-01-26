import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { syncManager } from '../core/SyncManager.js';

/**
 * SERVICIO DE TRASLADOS (TransfersService)
 * ---------------------------------------
 * Gestiona la agenda de llegadas y salidas de clientes que requieren transfer.
 * Nota: Este servicio NO hereda de BaseService (es independiente), pero usa SyncManager.
 */
class TransfersService {
    constructor() {
        this.STORAGE_KEY = 'app_transfers_data';
        this.items = [];
        this.load();
    }

    /**
     * CARGAR DATOS
     */
    load() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                this.items = JSON.parse(stored);
            } catch (e) {
                console.error("Error al leer datos de transfers:", e);
                this.items = [];
            }
        }
    }

    /**
     * GUARDAR Y SINCRONIZAR
     */
    save(data) {
        if (data) this.items = data;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
        
        // Sincronizar con el servidor para que el resto de recepcionistas vean el transfer
        if (window.syncManager) {
            window.syncManager.updateModule('transfers', this.items);
        }
    }

    /**
     * OBTENER TODOS LOS TRASLADOS
     * Los devuelve ordenados por fecha y hora para que los más cercanos aparezcan primero.
     */
    getAll() {
        return [...this.items].sort((a, b) => {
            const dateA = new Date(`${a.fecha}T${a.hora}`);
            const dateB = new Date(`${b.fecha}T${b.hora}`);
            return dateA - dateB;
        });
    }

    getById(id) {
        return this.items.find(i => i.id === id);
    }

    addTransfer(item) {
        this.items.push(item);
        this.save();
    }

    updateTransfer(updatedItem) {
        const index = this.items.findIndex(i => i.id === updatedItem.id);
        if (index !== -1) {
            this.items[index] = updatedItem;
            this.save();
            return true;
        }
        return false;
    }

    deleteTransfer(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.save();
    }
    
    /**
     * LIMPIEZA DE HISTORIAL
     * Borra automáticamente los transfers de hace más de una semana para no saturar la memoria.
     */
    cleanupOld(daysToKeep = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysToKeep);
        
        const initialLen = this.items.length;
        this.items = this.items.filter(i => {
            const itemDate = new Date(`${i.fecha}T${i.hora}`);
            return itemDate >= cutoff;
        });
        
        if (this.items.length !== initialLen) {
            this.save();
        }
    }
}

export const transfersService = new TransfersService();
