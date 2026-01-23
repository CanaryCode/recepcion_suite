import { BaseService } from './BaseService.js';
import { RAW_AGENDA_DATA } from '../data/AgendaData.js';

class AgendaService extends BaseService {
    constructor() {
        super('riu_agenda_contactos', []);
        this.cache = null;
        this.importKey = 'riu_agenda_v_FINAL_v3';
    }

    async getAll() {
        if (this.cache) return this.cache;
        this.cache = await super.getAll();
        return this.cache;
    }

    async save(data) {
        this.cache = data;
        return super.save(data);
    }

    async verificarDatosIniciales() {
        // Use a versioned key to force re-import when data changes
        if (localStorage.getItem(this.importKey) === 'true') {
            return;
        }

        const data = await this.getAll();
        // Force re-import if count is low (we have ~640 contacts now)
        const needsImport = !data || data.length < 1000;

        if (needsImport) {
            console.log("Agenda incompleta o desactualizada. Iniciando importación maestra...");
            this.clear(); // Clear storage and cache
            await this.importarDesdeTexto(RAW_AGENDA_DATA);
            localStorage.setItem(this.importKey, 'true');
            console.log("Importación de agenda completada con éxito.");
        } else {
            localStorage.setItem(this.importKey, 'true');
        }
    }

    async importarDesdeTexto(textoOrArray) {
        let bloques = [];
        if (Array.isArray(textoOrArray)) {
            bloques = textoOrArray;
        } else if (typeof textoOrArray === 'string') {
            bloques = textoOrArray.split('-----').map(b => b.trim()).filter(b => b.length > 0);
        }
        
        const contactos = [];
        let idCounter = Date.now();

        bloques.forEach(bloque => {
            const lineas = bloque.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lineas.length === 0) return;

            // Primera línea: Nombre y posible contexto
            // Ejemplo: "SPA RAQUEL ( HOTEL NIVARIA LA LAGUNA)"
            const lineaNombre = lineas[0];
            let nombre = lineaNombre;
            let comentarios = "";

            // Intento separar nombre de comentarios entre paréntesis si es muy largo
            if (lineaNombre.includes('(')) {
                // No hacemos split estricto porque a veces es parte del nombre, pero podemos ponerlo en comentario
                // Dejamos el nombre completo por ahora para no perder info
            }

            // Buscar teléfonos en las siguientes líneas
            const telefonos = [];
            const extraLines = [];

            for (let i = 1; i < lineas.length; i++) {
                const linea = lineas[i];
                // Regex para detectar teléfonos: busca grupos de dígitos, permitiendo espacios, puntos, guiones
                // Debe tener al menos 6 dígitos para ser considerado teléfono
                const posibleTel = linea.match(/[0-9\.\-\s\+]{6,}/);
                
                if (posibleTel && /[0-9]/.test(linea)) { 
                    // Limpieza básica
                    let numero = linea; // Guardamos la línea entera porque a veces tiene contexto como "(MOVIL)"
                    
                    // Detectar si es móvil o fijo para el tipo
                    let tipo = "Tel";
                    if (linea.toLowerCase().includes('movil') || linea.toLowerCase().includes('móvil') || linea.startsWith('6') || linea.startsWith('+346')) {
                        // Si empieza por 6 o pone movil
                        // Ojo, algunos fijos empiezan por 9
                    }
                    
                    // Limpiar el número para el valor, pero dejar texto original para tipo/comentario?
                    // La UI espera { tipo, prefijo, numero, flag }
                    
                    // Simple parser: extraer dígitos para validación
                    const digits = numero.replace(/[^0-9]/g, '');
                    if (digits.length < 3) {
                        extraLines.push(linea); // No parece teléfono real
                        continue;
                    }

                    telefonos.push({
                        tipo: "Tel",
                        prefijo: "", // Dejamos que el usuario lo arregle o asumimos vacío (local)
                        numero: numero,
                        flag: ""
                    });
                } else {
                    extraLines.push(linea);
                }
            }

            if (extraLines.length > 0) {
                comentarios = extraLines.join('. ');
            }

            if (nombre) {
                contactos.push({
                    id: idCounter++,
                    nombre: nombre,
                    telefonos: telefonos,
                    email: "",
                    web: "",
                    direccion: { pais: "", ciudad: "", calle: "", numero: "", cp: "" },
                    vinculo: "Otro", // Por defecto
                    categoria: "Información", // Por defecto
                    comentarios: comentarios,
                    favorito: false
                });
            }
        });

        console.log(`Procesados ${contactos.length} contactos para guardado.`);
        await this.save(contactos);
    }
}

export const agendaService = new AgendaService();
