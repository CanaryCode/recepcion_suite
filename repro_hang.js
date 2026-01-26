import { RAW_AGENDA_DATA } from "./assets/js/data/AgendaData.js";

// Mocks
const console = {
  log: (msg) => process.stdout.write(msg + "\n"),
  warn: (msg) => process.stdout.write("WARN: " + msg + "\n"),
  error: (msg) => process.stderr.write("ERROR: " + msg + "\n"),
};

async function testImport() {
  console.log("Starting test...");
  const bloques = RAW_AGENDA_DATA;
  const mergeMode = true;
  const mapNombres = new Set();
  const nuevosContactos = [];
  let idCounter = 1;
  const CHUNK_SIZE = 50;

  const processChunk = async (startIndex) => {
    return new Promise((resolve) => {
      const endIndex = Math.min(startIndex + CHUNK_SIZE, bloques.length);

      for (let i = startIndex; i < endIndex; i++) {
        const bloque = bloques[i];
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

        const telefonos = [];
        const extraLines = [];
        for (let j = 1; j < lineas.length; j++) {
          const linea = lineas[j];
          // THE SUSPECT REGEX
          const posibleTel = linea.match(/[0-9\.\-\s\+]{6,}/);

          if (posibleTel && /[0-9]/.test(linea)) {
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
          extra: extraLines.join(". "),
        });
      }

      // Resolve immediately to speed up test (simulating non-blocking)
      resolve(endIndex < bloques.length ? endIndex : null);
    });
  };

  let currentIndex = 0;
  let start = Date.now();
  while (currentIndex !== null) {
    if (currentIndex % 500 === 0)
      console.log(`Processing index ${currentIndex}...`);
    currentIndex = await processChunk(currentIndex);
  }
  console.log(
    `Done. Processed ${bloques.length} items. Time: ${Date.now() - start}ms`,
  );
}

testImport();
