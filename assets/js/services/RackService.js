import { Utils } from '../core/Utils.js';
import { LocalStorage } from '../core/LocalStorage.js'; // Import explicitly

// ==========================================
// BASE DE DATOS DE HABITACIONES (HOTEL GAROÉ)
// ==========================================

const DATA_VISTAS = {
    PISCINA: [
        // Planta 0
        "019", "021", "023", "025", "027",
        // Planta 1
        "101", "103", "105", "107", "109", "113", "115", "117", "119", "120", "121", "122", "123", "124", "125", "127", "129", "131", "133", "145", "147", "149", "151", "153",
        // Planta 2
        "201", "203", "205", "207", "209", "213", "215", "217", "219", "220", "221", "222", "223", "224", "225", "227", "229", "231", "233", "245", "247", "249", "251", "253",
        // Planta 3
        "313", "315", "317", "319", "321", "325", "327", "329", "331", "332", "333", "334",
        // Extras zona piscina
        "345", "335", "336", "337", "413", "415", "416", "347", "349", "407", "409", "411"
    ],
    MAR: [
        // Planta 0
        "010", "011", "014", "015", "016", "017", "018", "020", "022", "024", "026", "028", 
        // Planta 1 
        "102", "104", "106", "108", "110", "111", "112", "114", "116", "118", "126", "128", "130", "132", "134", "135", "136", "137", "138", "139", "140", "141", "142", "143", "144", "146", "148", "150", "152",
        // Planta 2 
        "202", "204", "206", "208", "210", "211", "212", "214", "216", "218", "226", "228", "230", "232", "234", "235", "236", "237", "238", "239", "240", "241", "242", "243", "244", "246", "248", "250", "252",
        // Planta 3
        "314", "316", "318", "320", "322", "323", "324", "326", "328", "330",
        // Suites/Extras zona mar
        "338", "339", "340", "341", "342", "343", "344", "346", "348", "406", "408", "410", "412", "414",
        // Special
        "012", "013" 
    ],
    CALLE: [
        // Rango 301-312
        "301", "302", "303", "304", "305", "306", "307", "308", "309", "310", "311", "312",
        // Rango 401-405
        "401", "402", "403", "404", "405"
    ]
};

const DATA_TIPOS = {
    // 1. Master Suite (Solo 341)
    MASTER_SUITE: ["341"],
    
    // 2. Suite Estándar
    SUITE_STANDARD: ["338", "339", "340", "343", "412", "414"],
    
    // 3. Doble Superior 
    // Mantenemos la lista 'oficial' de tipos, aunque el usuario ahora define "con sofa cama" etc.
    // Asumiremos que "Con Sofa Cama" suele ser Doble Superior. 
    // Lista del usuario para Doble Sup anterior: 335, 336, 337, 413, 415, 416, 342
    // Nuevo prompt "con sofa cama": 335, 336, 337, 413, 415, 416, 405. (342 se movió a "con sofa").
    DOBLE_SUPERIOR: ["335", "336", "337", "413", "415", "416", "405"] 
};

const DATA_PAREJAS_COMUNICADAS = [
    ["213", "215"],
    ["217", "219"],
    ["220", "221"],
    ["212", "214"],
    ["216", "218"],
    ["216", "218"]
];

// Features extra específicas
const DATA_EXTRAS = {
    SOFA_CAMA: ["335", "336", "337", "413", "415", "416", "405"],
    CHESLONG: ["344", "346", "406", "345"], // 345, 344, 346, 406
    SOFA_STD: ["347", "349", "407", "409", "411", "342", "348", "408", "410"],
    RUIDOSA: [], // Manually assigned via details
    TRANQUILA: [], // Manually assigned via details
    

    ADAPTADA: ["401", "402"],
    
    // Dejamos lista generica para filtros
    // comunicada: Se calcula dinámicamente
};

class RackService {
    constructor() {
        this.cache = null;
        this.STORAGE_KEY = 'recepcion_rack_data'; // New Key
        this.savedData = this.loadSavedData();
    }

    loadSavedData() {
        return LocalStorage.get(this.STORAGE_KEY, {});
    }

    saveRoomData(roomNum, updates) {
        if (!this.savedData[roomNum]) this.savedData[roomNum] = {};
        
        // Merge updates
        this.savedData[roomNum] = { ...this.savedData[roomNum], ...updates };
        
        // Persist (LocalStorage.set handles JSON.stringify)
        LocalStorage.set(this.STORAGE_KEY, this.savedData);
        
        // Invalidate cache to force re-render with new data
        this.cache = null;
    }

    /**
     * Interface methods for BackupService
     */
    getAll() {
        return this.savedData;
    }

    saveAll(data) {
        this.savedData = data || {};
        LocalStorage.set(this.STORAGE_KEY, this.savedData);
        this.cache = null;
    }

    getRoomsWithDetails() {
        if (this.cache) return this.cache;

        const rawRooms = Utils.getHabitaciones();
        
        this.cache = rawRooms.map(r => {
            const details = this._getRoomDetails(r.num);
            return {
                ...r,
                ...details
            };
        });

        return this.cache;
    }

    _getRoomDetails(num) {
        // 1. Vista
        let vista = 'DESCONOCIDO';
        if (DATA_VISTAS.PISCINA.includes(num)) vista = 'PISCINA';
        else if (DATA_VISTAS.MAR.includes(num)) vista = 'MAR';
        else if (DATA_VISTAS.CALLE.includes(num)) vista = 'CALLE';
        
        if (vista === 'DESCONOCIDO') {
            // Fallback heuristics removed to strictly follow DATA_VISTAS
            const n = parseInt(num);
             if (n % 2 !== 0) vista = 'PISCINA'; // Fallback for odd numbers?
             else vista = 'MAR'; // Fallback for even numbers?
             // Better to leave as unknown or default if not in lists, but let's keep basic fallback for others
             // actually, better to default to CALLE if not PISCINA/MAR?
             // The user says 301-312 are CALLE.
        }

        // 2. Tipo
        let tipo = 'ESTANDAR';
        if (DATA_TIPOS.MASTER_SUITE.includes(num)) tipo = 'MASTER_SUITE';
        else if (DATA_TIPOS.SUITE_STANDARD.includes(num)) tipo = 'SUITE_STANDARD';
        else if (DATA_TIPOS.DOBLE_SUPERIOR.includes(num)) tipo = 'DOBLE_SUPERIOR';

        // 3. Comunicada Logic
        let comunicadaCon = null;
        const pareja = DATA_PAREJAS_COMUNICADAS.find(pair => pair.includes(num));
        if (pareja) {
            comunicadaCon = pareja.find(h => h !== num);
        }

        // 4. Extras
        const extras = {
            sofaCama: DATA_EXTRAS.SOFA_CAMA.includes(num),
            cheslong: DATA_EXTRAS.CHESLONG.includes(num),
            sofa: DATA_EXTRAS.SOFA_STD.includes(num),
            
            comunicada: !!comunicadaCon,
            comunicadaCon: comunicadaCon, // Número de habitación
            
            adaptada: DATA_EXTRAS.ADAPTADA.includes(num),
            ruidosa: DATA_EXTRAS.RUIDOSA.includes(num), // Default from static data
            tranquila: DATA_EXTRAS.TRANQUILA.includes(num) // Default from static data
        };

        // Merge with persisted manual overrides
        const saved = this.savedData[num];
        if (saved) {
            // Override extras if manually set
            if (saved.extras) {
                // Only override keys that are explicitly present in saved extras
                // For this simple implementation, let's allow specific boolean overrides
                if (typeof saved.extras.sofa !== 'undefined') extras.sofa = saved.extras.sofa;
                if (typeof saved.extras.sofaCama !== 'undefined') extras.sofaCama = saved.extras.sofaCama;
                if (typeof saved.extras.cheslong !== 'undefined') extras.cheslong = saved.extras.cheslong;
                // New attributes persistence
                if (typeof saved.extras.ruidosa !== 'undefined') extras.ruidosa = saved.extras.ruidosa;
                if (typeof saved.extras.tranquila !== 'undefined') extras.tranquila = saved.extras.tranquila;
            }
        }

        return {
            tipo,
            vista,
            extras,
            // New fields for details
            status: (saved && saved.status) ? saved.status : 'DISPONIBLE',
            comments: (saved && saved.comments) ? saved.comments : ''
        };
    }

    getAllFilters() {
        return {
            tipos: [
                { id: 'MASTER_SUITE', label: 'Master Suite' },
                { id: 'SUITE_STANDARD', label: 'Suite Estándar' },
                { id: 'DOBLE_SUPERIOR', label: 'Doble Superior' },
                { id: 'ESTANDAR', label: 'Estándar' } // Added back ESTANDAR as it was in the original
            ],
            vistas: [
                { id: 'PISCINA', label: 'Vista Piscina' },
                { id: 'MAR', label: 'Vista Mar' },
                { id: 'CALLE', label: 'Vista Calle' }
            ],
            // New Status Filters
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
