// --- MÓDULOS DEL NÚCLEO DE NODE.JS ---
const http = require('http'); // Para crear el servidor web
const fs = require('fs');     // Para interactuar con el sistema de archivos
const path = require('path'); // Para manejar rutas de archivos
const url = require('url');   // Para analizar las URLs de las peticiones

const PORT = 3000; // Puerto donde escuchará el servidor
const STORAGE_DIR = path.join(__dirname, '../storage'); // Carpeta para guardar los datos JSON

// Utilidad: Asegura que la carpeta de almacenamiento existe; si no, la crea.
const ensureStorageDir = () => {
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
};

// Utilidad: Configura las cabeceras CORS para permitir peticiones desde el navegador.
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Perteniente a cualquier origen
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// --- CREACIÓN DEL SERVIDOR PRINCIPAL ---
const server = http.createServer((req, res) => {
    setCorsHeaders(res); // Aplicar permisos CORS

    // Manejar peticiones de "pre-vuelo" (necesario para navegadores modernos)
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // API de salud: Comprobar rápidamente si el servidor responde
    if (pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Vanilla Node Server Running' }));
        return;
    }

    // API de Almacenamiento: /api/storage/:key
    // Permite guardar y leer archivos JSON en la carpeta storage.
    const storageMatch = pathname.match(/^\/api\/storage\/([\w-]+)$/);
    if (storageMatch) {
        const key = storageMatch[1];
        const filePath = path.join(STORAGE_DIR, `${key}.json`);

        // Leer datos (GET)
        if (req.method === 'GET') {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end('null'); // Si no existe, devolvemos null en vez de error
                    } else {
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: 'Read error' }));
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(data);
                }
            });
            return;
        }

        // Guardar datos (POST)
        if (req.method === 'POST') {
            ensureStorageDir();
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                try {
                    // Validar que los datos recibidos sean JSON válido
                    const json = JSON.parse(body); 
                    
                    // Escribir el archivo en disco (formateado con 2 espacios)
                    fs.writeFile(filePath, JSON.stringify(json, null, 2), (err) => {
                        if (err) {
                            res.writeHead(500);
                            res.end(JSON.stringify({ error: 'Write error' }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, timestamp: new Date() }));
                        }
                    });
                } catch (e) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        }
    }

    // API de Lanzamiento (Launcher): /api/launch
    // Permite abrir ejecutables de Windows desde la App web.
    if (pathname === '/api/launch' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { command } = JSON.parse(body);
                if (!command) throw new Error('No command provided');

                // Ejecuta un comando en el sistema operativo
                // Nota: Usamos 'start' para que la app lanzada sea independiente del servidor.
                require('child_process').exec(`start "" "${command}"`, (err) => {
                    if (err) {
                        console.error('Launch error:', err);
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: err.message }));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    }
                });
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // API de Explorador de Archivos (v4.0): /api/system/list-files
    // Permite listar el contenido de cualquier carpeta del PC.
    if (pathname === '/api/system/list-files' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { currentPath } = JSON.parse(body || '{}');
                const targetPath = currentPath || 'C:\\';
                
                // Lee el directorio físicamente
                fs.readdir(targetPath, { withFileTypes: true }, (err, dirents) => {
                    if (err) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: err.message }));
                        return;
                    }

                    // Transforma los datos en un formato fácil de usar por el frontend
                    const items = dirents.map(dirent => {
                        return {
                            name: dirent.name,
                            isDirectory: dirent.isDirectory(),
                            path: path.join(targetPath, dirent.name)
                        };
                    });

                    // Orden: Carpetas primero, luego archivos
                    items.sort((a, b) => {
                        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
                        return a.isDirectory ? -1 : 1;
                    });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        path: targetPath,
                        items: items
                    }));
                });
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // --- SERVIDOR DE ARCHIVOS ESTÁTICOS (HTML, JS, CSS, IMÁGENES) ---
    // Limpia la ruta para evitar ataques de seguridad (Directory Traversal)
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') safePath = '/index.html';
    
    safePath = safePath.replace(/^[\/\\]/, '');
    const fileLoc = path.join(__dirname, '../', safePath);
    
    // Debug: Muestra en la terminal qué archivo se está pidiendo
    console.log(`Request: ${pathname} -> Serving: ${fileLoc}`);

    // Verifica si el archivo existe
    fs.stat(fileLoc, (err, stats) => {
        if (!err && stats.isFile()) {
            const ext = path.extname(fileLoc);
            // Diccionario de tipos de contenido
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpg',
                '.gif': 'image/gif',
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';

            // Lee y envía el archivo al navegador
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(fileLoc).pipe(res);
        } else {
            // Si el archivo no existe, error 404
            res.writeHead(404);
            res.end('Not Found');
        }
    });
});

// --- INICIO DEL SERVIDOR ---
server.listen(PORT, () => {
    console.log(`ZERO-DEPENDENCY Server running at http://localhost:${PORT}`);
    console.log('SERVER VERSION 4.0 [WEB EDITION]'); // Identificador visual de versión
    console.log(`Storage endpoint: http://localhost:${PORT}/api/storage/KEY`);
});
