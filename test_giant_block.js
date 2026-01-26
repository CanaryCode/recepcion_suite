
const console = {
  log: (msg) => process.stdout.write(msg + "\n"),
  warn: (msg) => process.stdout.write("WARN: " + msg + "\n"),
  error: (msg) => process.stderr.write("ERROR: " + msg + "\n"),
};

async function testGiantBlock() {
  console.log("Generating giant block...");
  
  // Generate a block with 50,000 lines
  const lines = [];
  lines.push("Nombre Contacto Grande");
  for (let i = 0; i < 50000; i++) {
    lines.push(`Line ${i}: Some text that might trigger regex 123456...`);
  }
  
  // One giant string (mimics the block split logic)
  const hugeBlock = lines.join("\n");
  const bloques = [hugeBlock]; 

  console.log(`Block generated. Size: ${hugeBlock.length} chars. Starting processing...`);
  
  const CHUNK_SIZE = 20;

  const processChunk = async (startIndex) => {
    return new Promise((resolve) => {
      const endIndex = Math.min(startIndex + CHUNK_SIZE, bloques.length);
      const startTick = Date.now();

      for (let i = startIndex; i < endIndex; i++) {
        const bloque = bloques[i];
        const lineas = bloque
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        
        if (lineas.length === 0) continue;

        const lineaNombre = lineas[0];
        let nombre = lineaNombre.trim();

        // Simulate inner loop
        const telefonos = [];
        const extraLines = [];
        for (let j = 1; j < lineas.length; j++) {
          const linea = lineas[j];
          // THE SUSPECT REGEX
          const posibleTel = linea.match(/[0-9\.\-\s\+]{6,}/);

          if (posibleTel && /[0-9]/.test(linea)) {
              telefonos.push(linea);
          } else {
            extraLines.push(linea);
          }
        }
      }
      
      const duration = Date.now() - startTick;
      console.log(`Processed chunk ${startIndex}. Duration: ${duration}ms`);

      resolve(endIndex < bloques.length ? endIndex : null);
    });
  };

  let currentIndex = 0;
  let start = Date.now();
  while (currentIndex !== null) {
    currentIndex = await processChunk(currentIndex);
  }
  console.log(`Total Time: ${Date.now() - start}ms`);
}

testGiantBlock();
