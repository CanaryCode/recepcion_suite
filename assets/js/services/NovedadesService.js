import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE NOVEDADES (NovedadesService)
 * ---------------------------------------
 * Gestiona el libro de relevos o bitácora diaria donde los recepcionistas 
 * anotan lo ocurrido durante su turno.
 */
class NovedadesService extends BaseService {
    constructor() {
        super('riu_novedades');
    }

    /**
     * OBTENER NOVEDADES
     */
    getNovedades() {
        return this.getAll();
    }

    /**
     * GUARDAR LISTA
     */
    saveNovedades(novedades) {
        this.saveAll(novedades);
    }

    /**
     * REGISTRAR NUEVA NOVEDAD
     * Se añade al principio de la lista para mostrar lo más reciente primero.
     */
    addNovedad(novedad) {
        const current = this.getNovedades();
        current.unshift(novedad);
        this.saveNovedades(current);
    }

    /**
     * EDITAR NOVEDAD
     */
    updateNovedad(novedadActualizada) {
        const current = this.getNovedades().map(n =>
            n.id === novedadActualizada.id ? novedadActualizada : n
        );
        this.saveNovedades(current);
    }

    /**
     * ELIMINAR REGISTRO
     */
    removeNovedad(id) {
        const current = this.getNovedades().filter(n => n.id !== id);
        this.saveNovedades(current);
    }

    /**
     * BUSCAR POR ID
     */
    getNovedadById(id) {
        return this.getNovedades().find(n => n.id === id);
    }
}

export const novedadesService = new NovedadesService();
