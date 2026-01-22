import { BaseService } from './BaseService.js';

class RiuService extends BaseService {
    constructor() {
        super('riu_class_db');
    }

    /**
     * Obtiene todos los clientes registrados
     * @returns {Object[]} Array de clientes
     */
    getClientes() {
        return this.getAll();
    }

    /**
     * Guarda la lista completa de clientes
     * @param {Object[]} clientes Array de clientes
     */
    saveClientes(clientes) {
        this.saveAll(clientes);
    }

    /**
     * Añade un nuevo cliente
     * @param {Object} cliente Objeto cliente
     * @returns {Object[]} Lista actualizada de clientes
     */
    addCliente(cliente) {
        const clientes = this.getClientes();
        clientes.push(cliente);
        this.saveClientes(clientes);
        return clientes;
    }

    /**
     * Elimina clientes que tienen fecha de salida hoy o anterior
     * @returns {Object[]} Lista actualizada de clientes
     */
    limpiarSalidas() {
        const hoy = new Date().toISOString().split('T')[0];
        const clientes = this.getClientes();

        const clientesFiltrados = clientes.filter(c => c.fecha_salida >= hoy);

        if (clientes.length !== clientesFiltrados.length) {
            this.saveClientes(clientesFiltrados);
        }

        return clientesFiltrados;
    }
}

export const riuService = new RiuService();
