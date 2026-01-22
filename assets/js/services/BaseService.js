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
    }

    useApi() {
        return APP_CONFIG.SYSTEM.USE_API;
    }

    getAll() {
        if (this.useApi()) {
            return Api.get(this.endpoint);
        } else {
            return LocalStorage.get(this.endpoint, this.defaultValue);
        }
    }

    save(data) {
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
        if (this.useApi()) {
            // Api.delete(this.endpoint)?
        } else {
            LocalStorage.remove(this.endpoint);
        }
    }
}
