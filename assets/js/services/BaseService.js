import { APP_CONFIG } from '../core/Config.js';
import { Api } from '../core/Api.js';
import { LocalStorage } from '../core/LocalStorage.js';

/**
 * CLASE BASE DE SERVICIOS (BaseService)
 * ------------------------------------
 * Esta clase es la "plantilla" de la que heredan casi todos los servicios.
 * Proporciona una forma estándar de guardar y leer datos, gestionando
 * automáticamente la caché, el almacenamiento local y la copia en el servidor.
 */
export class BaseService {
    /**
     * @param {string} endpoint - Nombre del archivo/clave (ej: 'agenda_contactos')
     * @param {any} defaultValue - Valor por defecto (normalmente una lista vacía [])
     */
    constructor(endpoint, defaultValue = []) {
        this.endpoint = endpoint;
        this.defaultValue = defaultValue;
        this.cache = null; // Memoria temporal para que la app sea más rápida
    }

    /**
     * OBTENER TODOS LOS DATOS
     * Primero mira en la memoria (caché), luego en el navegador (local) 
     * y finalmente intenta actualizar desde el servidor.
     */
    getAll() {
        if (!this.cache) {
            // Si no está en memoria, leer del disco local (navegador)
            this.cache = LocalStorage.get(this.endpoint, this.defaultValue);
            
            // Intentar restaurar desde el servidor en segundo plano
            this.syncWithServer(); 
        }
        return this.cache;
    }

    /**
     * GUARDAR DATOS (Persistencia Híbrida)
     * Guarda la información al instante en el PC y la manda a la cola de subida al servidor.
     */
    save(data) {
        this.cache = data; // Actualizar memoria
        
        // 1. Persistencia Local (Instantánea, para que el usuario no espere)
        LocalStorage.set(this.endpoint, data);
        
        // 2. Cola para el Respaldo en Servidor (Se hace en segundo plano)
        import('../core/SyncManager.js').then(({ syncManager }) => {
            syncManager.push(this.endpoint, data);
        });

        return data;
    }

    // Alias para guardar lista completa
    saveAll(data) {
        return this.save(data);
    }

    /**
     * BORRAR TODO
     * Limpia la memoria y el almacenamiento local.
     */
    clear() {
        this.cache = null;
        LocalStorage.remove(this.endpoint);
    }

    /**
     * RESTAURACIÓN INTELIGENTE
     * Si detecta que no tenemos datos locales pero sí hay una copia de seguridad 
     * en el servidor, los recupera automáticamente.
     */
    async syncWithServer() {
        if (!APP_CONFIG.SYSTEM.USE_SYNC_SERVER) return;

        try {
            const { syncManager } = await import('../core/SyncManager.js');
            const remoteData = await syncManager.pull(this.endpoint);
            
            if (remoteData) {
                // Comprobamos si lo que tenemos localmente es diferente a lo remoto
                const isLocalEmpty = !this.cache || (Array.isArray(this.cache) && this.cache.length === 0);
                
                // Si aquí no tenemos nada pero el servidor tiene una copia -> RESTAURAR
                if (isLocalEmpty && remoteData.length > 0) {
                    console.log(`[BaseService] Restaurando copia de seguridad de '${this.endpoint}'...`);
                    this.cache = remoteData;
                    LocalStorage.set(this.endpoint, remoteData);
                } 
            }
        } catch (err) {
            console.warn(`[BaseService] Error al comprobar copia de seguridad para ${this.endpoint}`, err);
        }
    }
}
