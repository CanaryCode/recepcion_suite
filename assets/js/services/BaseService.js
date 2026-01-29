import { APP_CONFIG } from '../core/Config.js';
import { Api } from '../core/Api.js';
import { LocalStorage } from '../core/LocalStorage.js';

/**
 * CLASE BASE DE SERVICIOS (BaseService)
 * ------------------------------------
 * CLASE BASE DE SERVICIO (BaseService)
 * -----------------------------------
 * Proporciona métodos estandarizados para la persistencia de datos (LocalStorage + Servidor),
 * operaciones CRUD y validación de esquemas.
 */
export class BaseService {
    /**
     * @param {string} endpoint - Nombre de la clave/archivo de almacenamiento
     * @param {any} defaultValue - Valor por defecto si no existen datos
     */
    constructor(endpoint, defaultValue = []) {
        this.endpoint = endpoint;
        this.defaultValue = defaultValue;
        /** @type {any | null} */
        this.cache = null;
        /** @type {boolean} */
        this._initialized = false;
        /** @type {Object<string, string> | null} */
        this.schema = null; // Opcional: Definido en clases hijas
    }

    /**
     * VALIDACIÓN DE DATOS
     * Valida los datos contra el esquema definido en `this.schema`.
     * @param {any} data - Los datos a validar. Puede ser un objeto o un array de objetos.
     * @returns {boolean} - `true` si los datos son válidos.
     * @throws {Error} - Lanza un error descriptivo si la validación falla.
     */
    validate(data) {
        if (!this.schema) return true;

        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
            for (const [key, type] of Object.entries(this.schema)) {
                if (!(key in item)) {
                    throw new Error(`Campo requerido faltante: ${key}`);
                }
                const actualType = typeof item[key];
                if (type === 'number' && isNaN(item[key])) {
                     throw new Error(`El campo '${key}' debe ser un número válido.`);
                }
                if (actualType !== type && type !== 'any') {
                    throw new Error(`Tipo de dato inválido para '${key}': esperado ${type}, recibido ${actualType}`);
                }
            }
        }
        return true;
    }

    /**
     * INICIALIZAR SERVICIO
     * Carga los datos desde LocalStorage y activa la sincronización con el servidor.
     * @returns {Promise<boolean>} - Resuelve a `true` una vez inicializado.
     */
    async init() {
        if (this._initialized) return this.getAll();

        // Cargar desde LocalStorage (Caché Rápida)
        // LocalStorage.get ya devuelve el objeto/array parseado, no el string.
        const localData = LocalStorage.get(this.endpoint);
        if (localData) {
            this.cache = localData;
        } else {
            this.cache = this.defaultValue;
        }

        // Intentar sincronizar con el servidor en segundo plano
        this.syncWithServer();

        this._initialized = true;
        return this.getAll();
    }

    /**
     * OBTENER TODOS LOS DATOS
     * Retorna los datos actualmente en caché. Si la caché está vacía, los carga desde
     * LocalStorage y activa una sincronización con el servidor.
     * @returns {any} - Los datos almacenados.
     */
    getAll() {
        if (!this.cache) {
            this.cache = LocalStorage.get(this.endpoint, this.defaultValue);
            this.syncWithServer();
        }
        return this.cache;
    }

    /**
     * GUARDAR LISTA COMPLETA
     */
    save(data) {
        // Validar antes de guardar
        try {
            this.validate(data);
        } catch (err) {
            console.error(`[BaseService] Error de validación en '${this.endpoint}':`, err.message);
            if (window.showAlert) window.showAlert(`Error de datos: ${err.message}`, "error");
            throw err;
        }

        this.cache = data;
        LocalStorage.set(this.endpoint, data);
        
        // Push a la cola de sincronización (SyncManager)
        import('../core/SyncManager.js').then(({ syncManager }) => {
            syncManager.push(this.endpoint, data);
        });

        return data;
    }

    /**
     * OPERACIONES CRUD SEMÁNTICAS (Para Arrays)
     */

    /**
     * Añadir un nuevo elemento (asumiendo que es un Array)
     */
    async add(item) {
        const all = await this.init();
        if (!Array.isArray(all)) return this.save([item]);
        return this.save([...all, item]);
    }

    /**
     * Actualiza un elemento existente
     */
    async update(id, data, idField = 'id') {
        const all = await this.init();
        if (!Array.isArray(all)) return this.save(data);


        const index = all.findIndex(x => x[idField] == id);
        if (index === -1) return this.add(data);
        
        const newAll = [...all];
        newAll[index] = { ...newAll[index], ...data };
        return this.save(newAll);
    }

    /**
     * Elimina un elemento
     */
    async delete(id, idField = 'id') {
        const all = await this.init();
        if (!Array.isArray(all)) return this.save(this.defaultValue);
        const newAll = all.filter(x => x[idField] != id);
        return this.save(newAll);
    }

    /**
     * OPERACIONES POR CLAVE (Para Diccionarios/Objetos)
     */

    getByKey(key, idField = 'id') {
        const all = this.getAll();
        if (Array.isArray(all)) {
            return all.find(x => x[idField] == key);
        }
        return (all && typeof all === 'object') ? all[key] : null;
    }

    /**
     * Guarda o actualiza un elemento por su clave/ID.
     * Soporta tanto estructuras de objeto { key: value } como arrays [ { id: key, ... } ]
     */
    async setByKey(key, value, idField = 'id') {
        const all = this.getAll();
        if (Array.isArray(all)) {
            return this.update(key, value, idField);
        } else {
            const newAll = (all && typeof all === 'object') ? { ...all } : {};
            newAll[key] = value;
            return this.save(newAll);
        }
    }

    /**
     * Elimina un elemento por su clave/ID.
     * Soporta tanto estructuras de objeto { key: value } como arrays [ { id: key, ... } ]
     */
    async removeByKey(key, idField = 'id') {
        const all = this.getAll();
        if (Array.isArray(all)) {
            return this.delete(key, idField);
        } else if (all && typeof all === 'object') {
            const newAll = { ...all };
            delete newAll[key];
            return this.save(newAll);
        }
        return all;
    }

    /**
     * UTILIDADES
     */

    clear() {
        this.cache = Array.isArray(this.defaultValue) ? [] : {};
        LocalStorage.remove(this.endpoint);
        return this.save(this.cache); // Sincroniza el borrado al servidor
    }

    async syncWithServer() {
        if (!APP_CONFIG.SYSTEM.USE_SYNC_SERVER) return;
        try {
            const { syncManager } = await import('../core/SyncManager.js');
            
            // CRITICO: No descargar si tenemos cambios locales pendientes de subir
            // para evitar sobrescribir con datos antiguos del servidor (Race Condition)
            if (syncManager.hasPending(this.endpoint)) {
                // console.debug(`[BaseService] Saltando pull para '${this.endpoint}' (Cambios pendientes)`);
                return;
            }

            const remoteData = await syncManager.pull(this.endpoint);
            
            if (remoteData) {
                const localStr = JSON.stringify(this.cache);
                const remoteStr = JSON.stringify(remoteData);

                if (localStr !== remoteStr) {
                    console.log(`[BaseService] Actualizado '${this.endpoint}' desde Servidor.`);
                    this.cache = remoteData;
                    LocalStorage.set(this.endpoint, remoteData);
                    // Emitir evento global por si el UI necesita refrescarse
                    window.dispatchEvent(new CustomEvent('service-synced', { detail: { endpoint: this.endpoint } }));
                }
            }
        } catch (err) {
            console.warn(`[BaseService] No se pudo sincronizar '${this.endpoint}'`, err);
        }
    }
}
