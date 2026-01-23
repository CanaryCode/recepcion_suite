import { APP_CONFIG } from '../core/Config.js';
import { Api } from '../core/Api.js';
import { LocalStorage } from '../core/LocalStorage.js';

export class BaseService {
    /**
     * @param {string} endpoint - API Endpoint or LocalStorage Key
     * @param {any} defaultValue - Default value if empty
     */
    constructor(endpoint, defaultValue = []) {
        this.endpoint = endpoint;
        this.defaultValue = defaultValue;
        this.cache = null;
    }

    useApi() {
        return APP_CONFIG.SYSTEM.USE_API;
    }

    getAll() {
        if (!this.cache) {
            this.cache = LocalStorage.get(this.endpoint, this.defaultValue);
            
            // Background Sync / Restore attempt
            // If cache is empty or just periodically, we check the server
            this.syncWithServer(); 
        }
        return this.cache;
    }

    save(data) {
        this.cache = data;
        
        // 1. Local Persistence (Instant)
        LocalStorage.set(this.endpoint, data);
        
        // 2. Queue for Server Backup (Async/Background)
        import('../core/SyncManager.js').then(({ syncManager }) => {
            syncManager.push(this.endpoint, data);
        });

        return data;
    }

    // Alias for compatibility
    saveAll(data) {
        return this.save(data);
    }

    clear() {
        this.cache = null;
        LocalStorage.remove(this.endpoint);
        // We probably don't want to clear the server backup automatically 
        // to prevent accidental data loss, unless explicitly requested.
    }

    /**
     * Tries to fetch from server to restore/update data
     */
    async syncWithServer() {
        if (!APP_CONFIG.SYSTEM.USE_SYNC_SERVER) return;

        try {
            const { syncManager } = await import('../core/SyncManager.js');
            const remoteData = await syncManager.pull(this.endpoint);
            
            if (remoteData) {
                const localStr = JSON.stringify(this.cache);
                const remoteStr = JSON.stringify(remoteData);

                // Simple restoration strategy:
                // If local is "empty" (or default) and remote has content -> RESTORE
                // If both have content but different -> LOG CONFLICT (Future: Handle it) for now keep local master
                
                const isLocalEmpty = !this.cache || (Array.isArray(this.cache) && this.cache.length === 0);
                
                if (isLocalEmpty && remoteData.length > 0) {
                    console.log(`[BaseService] Restoring ${this.endpoint} from server backup...`);
                    this.cache = remoteData;
                    LocalStorage.set(this.endpoint, remoteData);
                    // Reload page to reflect restored data if we are in the middle of usage?
                    // For now checking on startup is enough.
                } 
            }
        } catch (err) {
            console.warn(`[BaseService] Sync check failed for ${this.endpoint}`, err);
        }
    }
}
