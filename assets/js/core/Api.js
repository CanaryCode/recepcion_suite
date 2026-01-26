import { APP_CONFIG } from './Config.js';

/**
 * Wrapper para comunicaciones HTTP (Fetch)
 */
export const Api = {
    // Helper to get fresh URL
    get baseUrl() {
        return APP_CONFIG.SYSTEM.API_URL || 'http://localhost:3000/api';
    },

    async get(endpoint) {
        try {
            const url = `${this.baseUrl}/${endpoint}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`GET ${endpoint} failed:`, error);
            throw error;
        }
    },

    async post(endpoint, data) {
        try {
            const url = `${this.baseUrl}/${endpoint}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`POST ${endpoint} failed:`, error);
            throw error;
        }
    },

    async put(endpoint, data) {
        try {
            const url = `${this.baseUrl}/${endpoint}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`PUT ${endpoint} failed:`, error);
            throw error;
        }
    },

    async delete(endpoint) {
        try {
            const url = `${this.baseUrl}/${endpoint}`;
            const response = await fetch(url, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`DELETE ${endpoint} failed:`, error);
            throw error;
        }
    }
};
