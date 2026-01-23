import { APP_CONFIG } from './Config.js';
import { LocalStorage } from './LocalStorage.js';
import { Api } from './Api.js';

class SyncManager {
    constructor() {
        this.queueKey = 'sync_queue';
        this.queue = LocalStorage.get(this.queueKey, []);
        this.isSyncing = false;
        this.intervalId = null;

        if (APP_CONFIG.SYSTEM.USE_SYNC_SERVER) {
            this.startAutoSync();
        }
    }

    /**
     * Attempts to push changes to the server
     * @param {string} key - Storage Key (e.g. 'riu_novedades')
     * @param {any} data - The full dataset to save
     */
    async push(key, data) {
        // 1. Add to Queue (or update existing entry for this key)
        const timestamp = new Date().toISOString();
        const existingIndex = this.queue.findIndex(item => item.key === key);
        
        const queueItem = {
            key,
            data,
            timestamp,
            status: 'pending'
        };

        if (existingIndex >= 0) {
            this.queue[existingIndex] = queueItem;
        } else {
            this.queue.push(queueItem);
        }

        this.saveQueue();
        
        // 2. Try to sync immediately
        this.processQueue();
    }

    /**
     * Pulls latest data from server and merges/updates local storage
     * @param {string} key - Storage Key
     * @returns {Promise<any>} The data (local or remote)
     */
    async pull(key) {
        if (!APP_CONFIG.SYSTEM.USE_SYNC_SERVER) return null;

        try {
            const remoteData = await Api.get(`storage/${key}`);
            if (!remoteData) return null;

            // Here we could implement smart merging. 
            // For now, we trust the caller (BaseService) to handle the "Use Remote or Local" decision 
            // or we just return it.
            return remoteData;
        } catch (error) {
            console.warn(`[Sync] Failed to pull ${key}:`, error);
            return null;
        }
    }

    saveQueue() {
        LocalStorage.set(this.queueKey, this.queue);
    }

    startAutoSync() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.processQueue(), APP_CONFIG.SYSTEM.SYNC_INTERVAL);
        
        // Also listen for online status
        window.addEventListener('online', () => this.processQueue());
    }

    async processQueue() {
        if (this.isSyncing || this.queue.length === 0) return;
        if (!navigator.onLine) return; // Browser check

        this.isSyncing = true;
        const queueCopy = [...this.queue]; // Work on a copy/snapshot

        console.log(`[Sync] Processing ${queueCopy.length} items...`);

        for (const item of queueCopy) {
            try {
                await Api.post(`storage/${item.key}`, item.data);
                
                // Success: Remove from queue
                this.queue = this.queue.filter(q => q.key !== item.key);
                this.saveQueue();
                console.log(`[Sync] Synced ${item.key}`);
            } catch (error) {
                console.error(`[Sync] Error syncing ${item.key}:`, error);
                // Keep in queue to retry later
            }
        }

        this.isSyncing = false;
        
        // If new items were added while we were syncing, run again
        if (this.queue.length > 0) {
            // Wait a bit before retrying to avoid hammering if it was a network error
            setTimeout(() => this.processQueue(), 2000); 
        }
    }
}

export const syncManager = new SyncManager();
