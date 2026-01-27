import { APP_CONFIG } from './Config.js';

/**
 * SERVICIO DE COMUNICACIÓN (Api)
 * -----------------------------
 * Este módulo centraliza todas las llamadas al servidor Node.js.
 * Actúa como un "mensajero" que envía y recibe datos del backend.
 */
export const Api = {
    /**
     * URL BASE
     * Obtiene la dirección del servidor (ej: http://localhost:3000/api) de la configuración global.
     */
    get baseUrl() {
        return APP_CONFIG.SYSTEM.API_URL || '/api';
    },

    /**
     * PETICIÓN GET (Lectura)
     * Se usa para pedir datos al servidor (ej: leer una nota o un archivo).
     */
    async get(endpoint) {
        try {
            // FIX: Añadimos timestamp para evitar caché del navegador
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${this.baseUrl}/${endpoint}${separator}_t=${Date.now()}`;
            
            const response = await fetch(url, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Error en GET ${endpoint}:`, error);
            throw error;
        }
    },

    /**
     * PETICIÓN POST (Creación/Acción)
     * Se usa para enviar datos nuevos o ejecutar acciones (ej: guardar cambios o lanzar una app).
     */
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
            console.error(`Error en POST ${endpoint}:`, error);
            throw error;
        }
    },

    /**
     * PETICIÓN PUT (Actualización)
     * Se usa para modificar datos que ya existen.
     */
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
            console.error(`Error en PUT ${endpoint}:`, error);
            throw error;
        }
    },

    /**
     * PETICIÓN DELETE (Borrado)
     * Se usa para eliminar información del servidor.
     */
    async delete(endpoint) {
        try {
            const url = `${this.baseUrl}/${endpoint}`;
            const response = await fetch(url, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Error en DELETE ${endpoint}:`, error);
            throw error;
        }
    }
};
