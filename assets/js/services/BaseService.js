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
        if (this.cache) return this.cache;
        
        if (this.useApi()) {
            // For now, API is handled via async which might break sync callers
            // but the current app uses LocalStorage.
            return Api.get(this.endpoint).then(data => {
                this.cache = data;
                return data;
            });
        } else {
            this.cache = LocalStorage.get(this.endpoint, this.defaultValue);
            return this.cache;
        }
    }

    save(data) {
        this.cache = data;
        if (this.useApi()) {
            return Api.post(this.endpoint, data);
        } else {
            LocalStorage.set(this.endpoint, data);
            return data;
        }
    }

    // Alias para mantener compatibilidad con el código generado que usa saveAll
    saveAll(data) {
        return this.save(data);
    }

    clear() {
        this.cache = null;
        if (this.useApi()) {
            // Api.delete(this.endpoint)?
        } else {
            LocalStorage.remove(this.endpoint);
        }
    }
}
