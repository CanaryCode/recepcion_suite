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
     * RESTAURACIÓN INTELIGENTE (MODO JSON AUTHORITY)
     * Da prioridad absoluta a los datos del servidor (archivos JSON).
     * Si el servidor tiene datos, sobrescriben lo que haya en el navegador.
     */
    async syncWithServer() {
        if (!APP_CONFIG.SYSTEM.USE_SYNC_SERVER) return;

        try {
            const { syncManager } = await import('../core/SyncManager.js');
            // Leemos del disco (JSON)
            const remoteData = await syncManager.pull(this.endpoint);
            
            if (remoteData) {
                // FIX: El usuario quiere que SIEMPRE mande el JSON (disco), no el LocalStorage (navegador).
                // Eliminamos la comprobación de "si está vacío". 
                // Si hay datos en el servidor, esos son la VERDAD.
                
                // Comprobamos si hay cambios reales para no machacar por gusto
                const localStr = JSON.stringify(this.cache);
                const remoteStr = JSON.stringify(remoteData);

                if (localStr !== remoteStr) {
                    console.log(`[BaseService] Sincronizando '${this.endpoint}' desde JSON (Autoridad)...`);
                    this.cache = remoteData;
                    LocalStorage.set(this.endpoint, remoteData);
                    
                    // Opcional: Si quisiéramos refrescar la UI aquí, necesitaríamos eventos.
                    // Por ahora, confiamos en que esto corre al inicio o recarga.
                }
            }
        } catch (err) {
            console.warn(`[BaseService] Error al leer JSON para ${this.endpoint}`, err);
        }
    }
}
