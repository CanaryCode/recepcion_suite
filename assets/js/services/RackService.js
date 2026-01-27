import { Utils } from '../core/Utils.js';
import { BaseService } from './BaseService.js';

/**
 * SERVICIO DE RACK (RackService)
 * -----------------------------
 * ... (No changes to comments) ...
 */

// ... (CONSTANTS DATA_VISTAS, DATA_TIPOS, etc. remain unchanged, omitted for brevity in tool but assumed present in file) ...

class RackService extends BaseService {
    constructor() {
        super('riu_rack', {}); // Persistence key
        this.cacheDetails = null; // Separate cache for heavy calculated details
    }

    /**
     * INICIALIZACIÓN ASÍNCRONA
     */
    async init() {
        await this.syncWithServer();
    }

    /**
     * ACTUALIZAR HABITACIÓN
     * Guarda cambios manuales (ej: una nota sobre una avería o un cambio de sofá).
     */
    saveRoomData(roomNum, updates) {
        const currentData = this.getAll() || {};
        
        // Unimos los cambios nuevos con lo que ya teníamos
        if (!currentData[roomNum]) currentData[roomNum] = {};
        currentData[roomNum] = { ...currentData[roomNum], ...updates };
        
        this.save(currentData);
        
        // Limpiamos la caché de detalles calculados
        this.cacheDetails = null;
    }

    /**
     * OBTENER TODAS LAS HABITACIONES CON DETALLES
     * Une la lista básica de números de habitación con toda la "inteligencia"
     * estática y manual para que el Rack pueda dibujarlas con colores e iconos.
     */
    getRoomsWithDetails() {
        if (this.cacheDetails) return this.cacheDetails;

        // Obtenemos la lista plana de habitaciones (ej: 001 a 416)
        const rawRooms = Utils.getHabitaciones();
        
        // Obtenemos datos guardados (manuales)
        const savedData = this.getAll();

        this.cacheDetails = rawRooms.map(r => {
            const details = this._getRoomDetails(r.num, savedData);
            return {
                ...r,
                ...details
            };
        });

        return this.cacheDetails;
    }

    /**
     * CALCULAR DETALLES DE UNA HABITACIÓN (Método Interno)
     * Determina vista, tipo, extras y estado actual cruzando todas las tablas.
     */
    _getRoomDetails(num, savedData) {
        // ... (Logic remains similar but uses passed savedData) ...
        // 1. Determinar Vista
        let vista = 'DESCONOCIDO';
        if (DATA_VISTAS.PISCINA.includes(num)) vista = 'PISCINA';
        else if (DATA_VISTAS.MAR.includes(num)) vista = 'MAR';
        else if (DATA_VISTAS.CALLE.includes(num)) vista = 'CALLE';
        
        if (vista === 'DESCONOCIDO') {
             if (parseInt(num) % 2 !== 0) vista = 'PISCINA'; 
             else vista = 'MAR';
        }

        // 2. Determinar Tipo
        let tipo = 'ESTANDAR';
        if (DATA_TIPOS.MASTER_SUITE.includes(num)) tipo = 'MASTER_SUITE';
        else if (DATA_TIPOS.SUITE_STANDARD.includes(num)) tipo = 'SUITE_STANDARD';
        else if (DATA_TIPOS.DOBLE_SUPERIOR.includes(num)) tipo = 'DOBLE_SUPERIOR';

        // 3. Lógica de Habitaciones Comunicadas
        let comunicadaCon = null;
        const pareja = DATA_PAREJAS_COMUNICADAS.find(pair => pair.includes(num));
        if (pareja) {
            comunicadaCon = pareja.find(h => h !== num);
        }

        // 4. Extras Estáticos (Mobiliario)
        const extras = {
            sofaCama: DATA_EXTRAS.SOFA_CAMA.includes(num),
            cheslong: DATA_EXTRAS.CHESLONG.includes(num),
            sofa: DATA_EXTRAS.SOFA_STD.includes(num),
            comunicada: !!comunicadaCon,
            comunicadaCon: comunicadaCon,
            adaptada: DATA_EXTRAS.ADAPTADA.includes(num),
            ruidosa: DATA_EXTRAS.RUIDOSA.includes(num),
            tranquila: DATA_EXTRAS.TRANQUILA.includes(num)
        };

        // 5. Aplicar Sobrescrituras Manuales (Guardadas por el usuario)
        const saved = savedData[num];
        if (saved && saved.extras) {
            if (typeof saved.extras.sofa !== 'undefined') extras.sofa = saved.extras.sofa;
            if (typeof saved.extras.sofaCama !== 'undefined') extras.sofaCama = saved.extras.sofaCama;
            if (typeof saved.extras.cheslong !== 'undefined') extras.cheslong = saved.extras.cheslong;
            if (typeof saved.extras.ruidosa !== 'undefined') extras.ruidosa = saved.extras.ruidosa;
            if (typeof saved.extras.tranquila !== 'undefined') extras.tranquila = saved.extras.tranquila;
        }

        return {
            tipo,
            vista,
            extras,
            // Estado operativo y comentarios manuales
            status: (saved && saved.status) ? saved.status : 'DISPONIBLE',
            comments: (saved && saved.comments) ? saved.comments : ''
        };
    }

    // ... (getAllFilters remains unchanged) ...

    /**
     * OBTENER OPCIONES DE FILTRO
     * Se usa para rellenar los desplegables del buscador del Rack.
     */
    getAllFilters() {
        return {
            tipos: [
                { id: 'MASTER_SUITE', label: 'Master Suite' },
                { id: 'SUITE_STANDARD', label: 'Suite Estándar' },
                { id: 'DOBLE_SUPERIOR', label: 'Doble Superior' },
                { id: 'ESTANDAR', label: 'Estándar' }
            ],
            vistas: [
                { id: 'PISCINA', label: 'Vista Piscina' },
                { id: 'MAR', label: 'Vista Mar' },
                { id: 'CALLE', label: 'Vista Calle' }
            ],
            estados: [
                { id: 'DISPONIBLE', label: 'Disponible' },
                { id: 'BLOQUEADA', label: 'Bloqueada' }
            ],
            extras: [
                { id: 'comunicada', label: 'Comunicada' },
                { id: 'adaptada', label: 'Adaptada' },
                { id: 'sofaCama', label: 'Sofá Cama' },
                { id: 'cheslong', label: 'Cheslong' },
                { id: 'sofa', label: 'Sofá Estándar' },
                { id: 'ruidosa', label: 'Ruidosa' },
                { id: 'tranquila', label: 'Tranquila' }
            ]
        };
    }
}

export const rackService = new RackService();
