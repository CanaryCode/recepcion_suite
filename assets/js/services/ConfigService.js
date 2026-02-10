import { BaseService } from './BaseService.js?v=V144_FIX_FINAL';
import { Api } from '../core/Api.js?v=V144_FIX_FINAL';
import { APP_CONFIG } from '../core/Config.js?v=V144_FIX_FINAL';

/**
 * SERVICIO DE CONFIGURACIÓN (ConfigService)
 * ---------------------------------------
 * Maneja el guardado y actualización de la configuración global del sistema.
 */
class ConfigService extends BaseService {
    constructor() {
        super('config');
    }

    /**
     * GUARDAR CONFIGURACIÓN EN EL SERVIDOR
     */
    async saveConfig(newConfig) {
        try {
            await Api.post('storage/config', newConfig);
            // Actualizar el objeto global en memoria
            Object.assign(APP_CONFIG, newConfig);
            return true;
        } catch (error) {
            console.error('[ConfigService] Error al guardar configuración:', error);
            throw error;
        }
    }
}

export const configService = new ConfigService();
