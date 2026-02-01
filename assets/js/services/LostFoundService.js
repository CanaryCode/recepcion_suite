import { BaseService } from "./BaseService.js";

/**
 * SERVICIO DE OBJETOS PERDIDOS (LostFoundService)
 * ----------------------------------------------
 * Gestiona el almacenamiento y persistencia de objetos encontrados en el hotel.
 */
class LostFoundService extends BaseService {
    constructor() {
        super('riu_lost_found', []);
        
        /**
         * Esquema de validación
         * id: timestamp
         * fecha: ISO string
         * objeto: nombre/descripción
         * lugar: donde se encontró
         * quien: recepcionista o camarera que lo encontró
         * estado: 'Almacenado', 'Entregado', 'Donado', 'Desechado'
         * imagen: base64 o ruta
         * comentarios: notas adicionales
         */
        this.schema = {
            id: 'string', // Cambiado a string para el nuevo algoritmo
            fecha: 'string',
            objeto: 'string',
            lugar: 'string',
            quien: 'string',
            estado: 'string'
        };
    }

    /**
     * ALGORITMO DE ID INVENTADO: LF-YYYYMMDD-XXXX
     */
    generateCustomId() {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `LF-${date}-${random}`;
    }

    /**
     * OBTENER TODOS LOS REGISTROS
     */
    getItems() {
        return this.getAll();
    }

    /**
     * GUARDAR/ACTUALIZAR REGISTRO
     */
    async saveItem(item) {
        if (!item.id || item.id === '') {
            item.id = this.generateCustomId();
        }
        
        // Asegurar que imagenes sea un array
        if (!Array.isArray(item.imagenes)) {
            item.imagenes = item.imagenes ? [item.imagenes] : [];
        }

        return this.update(item.id, item);
    }

    /**
     * ELIMINAR REGISTRO
     */
    async removeItem(id) {
        return this.delete(id);
    }

    /**
     * SOBRESCRITURA DE setByKey
     * Garantiza que siempre se use saveItem para procesar el ID custom
     */
    async setByKey(key, value, idField = 'id') {
        return this.saveItem(value);
    }
}

export const lostFoundService = new LostFoundService();
