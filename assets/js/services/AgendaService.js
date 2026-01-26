import { BaseService } from "./BaseService.js";
import { RAW_AGENDA_DATA } from "../data/AgendaData.js";
import { Modal } from "../core/Modal.js"; // Ensure we can use Modal for critical errors

class AgendaService extends BaseService {
  constructor() {
    super("riu_agenda_contactos", []);
    this.cache = null;
    this.importKey = "riu_agenda_v_FINAL_v4_DEBUG"; // Bump version to force re-check
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

  async verificarDatosIniciales() {
    // Obtenemos los datos actuales
    const data = await this.getAll();

    // Criterio de "Agenda Vacía o Corrupta":
    // Si NO es array, o length < 50
    const esIncompleta = !Array.isArray(data) || data.length < 50;

    // Si ya se importó antes Y tenemos datos, no hacemos nada.
    if (localStorage.getItem(this.importKey) === "true" && !esIncompleta) {
      console.log("Agenda verificada: OK (" + data.length + " contactos)");
      return;
    }

    if (esIncompleta) {
      console.warn("Agenda incompleta o corrupta detectada. Restaurando...");
      await this.restaurarAgendaForzada(false); // False = Silent/Auto Mode
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

  async importarDesdeTexto(
    textoOrArray,
    mergeMode = false,
    interactive = true,
  ) {
    console.log(
      `Importando/Fusionando agenda (Merge: ${mergeMode}, Interactive: ${interactive})...`,
    );

    let bloques = [];
    if (Array.isArray(textoOrArray)) {
      bloques = textoOrArray;
    } else if (typeof textoOrArray === "string") {
      bloques = textoOrArray
        .split("-----")
        .map((b) => b.trim())
        .filter((b) => b.length > 0);
    }

    // Obtenemos contactos actuales para no duplicar (y saneamos si es null/obj)
    let contactosActuales = await this.getAll();
    if (!Array.isArray(contactosActuales)) contactosActuales = [];

    const mapNombres = new Set(
      contactosActuales.map((c) => c.nombre.trim().toLowerCase()),
    );

    const nuevosContactos = [];
    let idCounter = Date.now();

    // CHUNKED PROCESSING CONFIG
    const CHUNK_SIZE = 20; // Reduced from 50 to prevent hang

    // Helper function to process a single chunk
    const processChunk = async (startIndex) => {
      return new Promise(async (resolve) => {
        const endIndex = Math.min(startIndex + CHUNK_SIZE, bloques.length);

        for (let i = startIndex; i < endIndex; i++) {
          const bloque = bloques[i];
          // Robust split
          const lineas = bloque
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
          if (lineas.length === 0) continue;

          const lineaNombre = lineas[0];
          let nombre = lineaNombre.trim();

          if (mergeMode && mapNombres.has(nombre.toLowerCase())) {
            continue;
          }

          // Extract phones
          const telefonos = [];
          const extraLines = [];
          
          // CRITICAL: Inner loop time-slicing protection
          for (let j = 1; j < lineas.length; j++) {
            // Safety Yield: Every 500 lines or if blocking too long (optional)
            // We force a yield every 200 lines to guarantee UI responsiveness
            if (j % 200 === 0) {
                await new Promise((r) => setTimeout(r, 0));
            }

            const linea = lineas[j];

            // OPTIMIZATION 1: Check for digit BEFORE running expensive regex
            // If no digit, it cannot be a phone number.
            if (!/[0-9]/.test(linea)) {
                extraLines.push(linea);
                continue;
            }

            const posibleTel = linea.match(/[0-9\.\-\s\+]{6,}/);
            // OPTIMIZATION 2: Ensure it has meaningful digits (redundant but safe)
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
            email: "",
            web: "",
            direccion: {},
            vinculo: "Otro",
            categoria: "Información",
            comentarios: extraLines.join(". "),
            favorito: false,
          });
        }

        // Allow UI to breathe (increased to 15ms)
        setTimeout(
          () => resolve(endIndex < bloques.length ? endIndex : null),
          15,
        );
      });
    };

    // Execution Loop
    let currentIndex = 0;
    console.log(
      `[AgendaService] Iniciando procesamiento de ${bloques.length} bloques...`,
    );

    while (currentIndex !== null) {
      // Log progress every 10 chunks (200 items) to avoid spam
      if (currentIndex % 200 === 0)
        console.log(`[AgendaService] Procesando índice ${currentIndex}...`);
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
