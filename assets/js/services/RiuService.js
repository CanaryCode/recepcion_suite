import { BaseService } from './BaseService.js';

/**
 * SERVICIO RIU CLASS (RiuService)
 * ------------------------------
 * Gestiona el registro de clientes que son miembros del programa de fidelización.
 * Permite llevar un control de quién está en el hotel y cuándo sale.
 */
class RiuService extends BaseService {
    constructor() {
        super('riu_class_db');
    }

    /**
     * OBTENER LISTA DE MIEMBROS EN EL HOTEL
     */
    getClientes() {
        return this.getAll();
    }

    /**
     * GUARDAR LISTA COMPLETA
     */
    saveClientes(clientes) {
        this.saveAll(clientes);
    }

    /**
     * REGISTRAR NUEVO MIEMBRO
     */
    addCliente(cliente) {
        const clientes = this.getClientes();
        clientes.push(cliente);
        this.saveClientes(clientes);
        return clientes;
    }

    /**
     * LIMPIEZA AUTOMÁTICA DE SALIDAS
     * Elimina de la lista a los clientes cuya fecha de salida ya haya pasado.
     * @returns {Object[]} Lista actualizada con solo los clientes que siguen en el hotel.
     */
    limpiarSalidas() {
        const hoy = new Date().toISOString().split('T')[0];
        const clientes = this.getClientes();

        const clientesFiltrados = clientes.filter(c => c.fecha_salida >= hoy);

        // Solo guardamos si realmente hemos borrado a alguien (optimización)
        if (clientes.length !== clientesFiltrados.length) {
            this.saveClientes(clientesFiltrados);
        }

        return clientesFiltrados;
    }
}

export const riuService = new RiuService();
