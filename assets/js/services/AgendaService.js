import { BaseService } from "./BaseService.js";
import { RAW_AGENDA_DATA } from "../data/AgendaData.js";
import { Modal } from "../core/Modal.js"; // Ensure we can use Modal for critical errors

/**
 * SERVICIO DE AGENDA (AgendaService)
 * ---------------------------------
 * Hereda de BaseService. Gestiona miles de contactos.
 * Incluye una lógica especial de importación "por trozos" para evitar 
 * que el navegador se congele al cargar el archivo maestro de contactos.
 */
class AgendaService extends BaseService {
  constructor() {
    super("riu_agenda_contactos", []);
    this.cache = null;
    // Clave de versión para saber si hay que forzar una actualización de datos maestros
    this.importKey = "riu_agenda_v_FINAL_v4_DEBUG"; 
  }

  async init() {
     await this.syncWithServer();
     // También verificamos integridad después de sincronizar
     await this.verificarDatosIniciales();
  }

  async getAll() {
    if (this.cache) return this.cache;
    const data = await super.getAll();
    // Safety check: force array
    if (!Array.isArray(data)) {
      console.warn(
        "[AgendaService] Detectado formato NO-Array. Reiniciando a []",
      );
      return [];
    }
    this.cache = data;
    return this.cache;
  }

  async save(data) {
    this.cache = data;
    return super.save(data);
  }

  /**
   * VERIFICACIÓN INICIAL
   * Comprueba si la agenda está vacía o dañada al arrancar.
   * Si es así, lanza la restauración automática desde los datos maestros (Base de datos RAW).
   */
  async verificarDatosIniciales() {
    const data = await this.getAll();

    // Si no es una lista o tiene muy pocos contactos, asumimos que algo ha fallado
    const esIncompleta = !Array.isArray(data) || data.length < 50;

    // Si la versión ya está marcada como OK y tenemos datos, ignoramos
    if (localStorage.getItem(this.importKey) === "true" && !esIncompleta) {
      console.log("Agenda verificada: OK (" + data.length + " contactos)");
      return;
    }

    if (esIncompleta) {
      console.warn("Agenda incompleta o corrupta. Iniciando auto-reparación...");
      await this.restaurarAgendaForzada(false); // Modo silencioso (sin avisos molestos)
    } else {
      localStorage.setItem(this.importKey, "true");
    }
  }

  async restaurarAgendaForzada(interactive = true) {
    console.log(`Iniciando recuperación (Interactivo: ${interactive})...`);

    if (!RAW_AGENDA_DATA || RAW_AGENDA_DATA.length === 0) {
      console.error("CRITICAL: RAW_AGENDA_DATA is empty!");
      if (interactive)
        await Modal.showAlert("Error Crítico: No hay datos maestros.", "error");
      return;
    }

    // Llamamos al importador
    await this.importarDesdeTexto(RAW_AGENDA_DATA, true, interactive);
    localStorage.setItem(this.importKey, "true");
    console.log("Recuperación completada.");
  }

  /**
   * IMPORTAR DESDE TEXTO (Proceso de Alto Rendimiento)
   * -------------------------------------------------
   * Este es el "cerebro" de la agenda. Convierte texto plano en contactos estructurados.
   * Utiliza 'Chunked Processing' para procesar de 20 en 20 y dejar "respirar" al navegador.
   */
  async importarDesdeTexto(
    textoOrArray,
    mergeMode = false, // True = Une con lo que ya existe / False = Reemplaza todo
    interactive = true,
  ) {
    console.log(`Importando agenda... (Fusión: ${mergeMode})`);

    let bloques = [];
    if (Array.isArray(textoOrArray)) {
      bloques = textoOrArray;
    } else if (typeof textoOrArray === "string") {
      // Separamos los contactos por el separador de 5 guiones "-----"
      bloques = textoOrArray
        .split("-----")
        .map((b) => b.trim())
        .filter((b) => b.length > 0);
    }

    let contactosActuales = await this.getAll();
    if (!Array.isArray(contactosActuales)) contactosActuales = [];

    const mapNombres = new Set(
      contactosActuales.map((c) => c.nombre.trim().toLowerCase()),
    );

    const nuevosContactos = [];
    let idCounter = Date.now();

    // CONFIGURACIÓN DE PROCESAMIENTO POR LOTES (Anti-Bloqueo)
    const CHUNK_SIZE = 20; // Procesamos 20 a la vez

    const processChunk = async (startIndex) => {
      return new Promise(async (resolve) => {
        const endIndex = Math.min(startIndex + CHUNK_SIZE, bloques.length);

        for (let i = startIndex; i < endIndex; i++) {
          const bloque = bloques[i];
          const lineas = bloque.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
          if (lineas.length === 0) continue;

          const nombre = lineas[0];
          if (mergeMode && mapNombres.has(nombre.toLowerCase())) continue;

          const telefonos = [];
          const extraLines = [];
          
          for (let j = 1; j < lineas.length; j++) {
            // Si el bloque es gigante, cedemos el control al navegador para que no se cuelgue
            if (j % 200 === 0) await new Promise((r) => setTimeout(r, 0));

            const linea = lineas[j];
            // Si la línea no tiene números, no puede ser un teléfono (optimización rápida)
            if (!/[0-9]/.test(linea)) {
                extraLines.push(linea);
                continue;
            }

            const posibleTel = linea.match(/[0-9\.\-\s\+]{6,}/);
            if (posibleTel) {
              let tipo = linea.toLowerCase().includes("ext") ? "Ext" : "Tel";
              telefonos.push({ tipo, prefijo: "", numero: linea, flag: "" });
            } else {
              extraLines.push(linea);
            }
          }

          nuevosContactos.push({
            id: idCounter++,
            nombre: nombre,
            telefonos,
             vinculo: "Otro",
            categoria: "Información",
            comentarios: extraLines.join(". "),
            favorito: false,
          });
        }

        // Dejamos 15ms de margen para que el navegador dibuje la pantalla (barra de carga, etc.)
        setTimeout(() => resolve(endIndex < bloques.length ? endIndex : null), 15);
      });
    };

    // Bucle de ejecución escalonada
    let currentIndex = 0;
    while (currentIndex !== null) {
      if (currentIndex % 200 === 0) console.log(`Agenda: Procesando ${currentIndex}...`);
      currentIndex = await processChunk(currentIndex);
    }

    console.log(
      `[AgendaService] Procesamiento finalizado. Nuevos a añadir: ${nuevosContactos.length}`,
    );

    if (nuevosContactos.length > 0) {
      console.log("[AgendaService] Guardando cambios...");
      const listaFinal = [...contactosActuales, ...nuevosContactos];
      await this.save(listaFinal);

      if (mergeMode) {
        if (interactive) {
          await Modal.showAlert(
            `✅ <strong>Recuperación Completada</strong><br>Se han restaurado ${nuevosContactos.length} contactos originales.<br>Datos existentes conservados.`,
            "success",
          );
          location.reload();
        } else {
          console.log(
            `[Auto-Repair] ${nuevosContactos.length} contactos restaurados silenciosamente.`,
          );
          // Optional: Show a non-blocking toast
          if (window.showToast)
            window.showToast(
              `Agenda reparada: +${nuevosContactos.length} contactos`,
              "success",
            );
        }
      }
    } else {
      console.warn("[AgendaService] No hay contactos nuevos.");
      if (mergeMode && interactive) {
        await Modal.showAlert(
          `ℹ️ <strong>Agenda al día</strong><br>No faltaba ningún contacto original.`,
          "info",
        );
      }
    }
  }
}

export const agendaService = new AgendaService();
