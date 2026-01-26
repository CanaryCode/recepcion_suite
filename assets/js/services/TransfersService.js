import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { syncManager } from '../core/SyncManager.js';

class TransfersService {
    constructor() {
        this.STORAGE_KEY = 'app_transfers_data';
        this.items = [];
        this.load();
    }

    load() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                this.items = JSON.parse(stored);
            } catch (e) {
                console.error("Error parsing transfers data", e);
                this.items = [];
            }
        }
    }

    save(data) {
        if (data) this.items = data;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
        // Integrate with SyncManager for backup
        if (window.syncManager) {
            window.syncManager.updateModule('transfers', this.items);
        }
    }

    getAll() {
        // Return sorted by date/time ascending
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
    
    // Cleanup old transfers (optional helper)
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
