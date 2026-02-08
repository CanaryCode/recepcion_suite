const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const zlib = require('zlib');

const STORAGE_DIR = path.resolve(__dirname, '../../storage');
const LOG_FILE = path.join(STORAGE_DIR, 'server_debug.log');

const logToFile = (msg) => {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [SYSTEM] ${msg}\n`;
    try {
        if (!fsSync.existsSync(STORAGE_DIR)) {
            fsSync.mkdirSync(STORAGE_DIR, { recursive: true });
        }
        fsSync.appendFileSync(LOG_FILE, entry);
    } catch (e) {
        console.error('CRITICAL: Could not write to log file from system.js', e);
    }
};

/**
 * POST /api/system/launch
 * Opens an executable or path on the Windows system.
 */
router.post('/launch', (req, res) => {
    const { command } = req.body;
    if (!command) {
        return res.status(400).json({ error: 'No command provided' });
    }

    // Usamos 'start "" "path"' para abrir aplicaciones de forma independiente
    exec(`start "" "${command}"`, (err) => {
        if (err) {
            console.error('Launch error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

/**
 * POST /api/system/list-files
 * Explorer-like functionality to browse the PC files.
 */
router.post('/list-files', async (req, res) => {
    try {
        const { currentPath } = req.body;
        const targetPath = currentPath || 'C:\\';

        const dirents = await fs.readdir(targetPath, { withFileTypes: true });
        
        const items = dirents.map(dirent => ({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
            path: path.join(targetPath, dirent.name)
        }));

        // Sort: Folders first, then alphabetically
        items.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
        });

        res.json({ 
            path: targetPath,
            items: items
        });
    } catch (err) {
        console.error('File browser error:', err);
        res.status(500).json({ error: err.message });
    }
});

console.log('[System Routes] Module Loaded');

/**
 * GET /api/system/image-proxy
 * Serves an image file from the local system safely.
 */
router.get('/image-proxy', async (req, res) => {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).send('No path provided');

    try {
        // En Windows, path.resolve manejará tanto \ como /
        const absolutePath = path.resolve(filePath);
        
        // Verificación básica de seguridad (opcional, podrías restringir a ciertas carpetas)
        await fs.access(absolutePath);
        res.sendFile(absolutePath);
    } catch (err) {
        console.error('Image proxy error:', err);
        res.status(404).send('Image not found');
    }
});

/**
 * POST /api/system/list-images
 * Lists image files in a specific directory.
 */
router.post('/list-images', async (req, res) => {
    console.log('[System Routes] POST /list-images called');
    try {
        let { folderPath, folderPaths } = req.body;
        
        let foldersToProcess = folderPaths || [];
        if (folderPath && !foldersToProcess.includes(folderPath)) {
            foldersToProcess.unshift(folderPath);
        }
        
        // Default if empty
        if (foldersToProcess.length === 0) {
            foldersToProcess = [path.join(__dirname, '../../assets/gallery')];
        }

        const allMedia = [];
        const debugInfo = [];

        for (let targetPath of foldersToProcess) {
            logToFile(`Processing folder: "${targetPath}"`);
            try {
                let absolutePath = targetPath;
                
                // Si la ruta empieza con una letra de unidad (C:\, D:/, etc) o es absoluta según el sistema
                const isWindowsAbsolute = /^[a-zA-Z]:[\\/]/.test(targetPath);
                
                if (isWindowsAbsolute) {
                    absolutePath = path.resolve(targetPath);
                } else if (path.isAbsolute(targetPath)) {
                    absolutePath = path.resolve(targetPath);
                } else {
                    absolutePath = path.resolve(path.join(__dirname, '../../', targetPath));
                }

                // Normalización final
                const fsPath = path.normalize(absolutePath);
                logToFile(`Resolved path: "${targetPath}" -> "${fsPath}"`);
                
                debugInfo.push({ target: targetPath, resolved: fsPath });

                await fs.access(fsPath);
                const dirents = await fs.readdir(fsPath, { withFileTypes: true });
                
                logToFile(`found ${dirents.length} entries in "${fsPath}"`);

                // For debugging: Capture first 100 items to see what's there
                const firstItems = dirents.slice(0, 100).map(d => ({
                    name: d.name,
                    isFile: d.isFile(),
                    isDir: d.isDirectory(),
                    isSymlink: d.isSymbolicLink(),
                    ext: path.extname(d.name).toLowerCase()
                }));

                const mediaPromises = dirents
                    .filter(dirent => {
                        const isFile = dirent.isFile() || dirent.isSymbolicLink();
                        const ext = path.extname(dirent.name).toLowerCase();
                        const isMedia = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.pdf'].includes(ext);
                        return isFile && isMedia;
                    })
                    .map(async (dirent) => {
                        const fullPath = path.join(fsPath, dirent.name);
                        const sanitizedPath = fullPath.replace(/\\/g, '/');
                        const ext = path.extname(dirent.name).toLowerCase();
                        
                        // Obtener fecha de modificación (Async)
                        let mtime = new Date();
                        try {
                            const stats = await fs.stat(fullPath);
                            mtime = stats.mtime;
                        } catch (e) {
                            console.warn(`Could not get stats for ${fullPath}:`, e.message);
                        }

                        let url = '';
                        const sanitizedPathLower = sanitizedPath.toLowerCase();
                        if (sanitizedPathLower.indexOf('assets') !== -1) {
                            url = sanitizedPath.substring(sanitizedPathLower.indexOf('assets'));
                        } else if (sanitizedPathLower.indexOf('resources') !== -1) {
                            url = sanitizedPath.substring(sanitizedPathLower.indexOf('resources'));
                        } else if (sanitizedPathLower.indexOf('storage') !== -1) {
                            url = sanitizedPath.substring(sanitizedPathLower.indexOf('storage'));
                        } else {
                            url = `/api/system/image-proxy?path=${encodeURIComponent(sanitizedPath)}`;
                        }

                        return {
                            name: dirent.name,
                            path: sanitizedPath,
                            url: url,
                            type: ext === '.pdf' ? 'pdf' : 'image',
                            folder: targetPath,
                            mtime: mtime.toISOString() // Formato robusto
                        };
                    });
                
                const mediaItems = await Promise.all(mediaPromises);
                logToFile(`Successfully processed ${mediaItems.length} media files from "${fsPath}"`);
                
                debugInfo.push({ 
                    target: targetPath, 
                    resolved: fsPath, 
                    totalFound: dirents.length,
                    mediaFound: mediaItems.length,
                    sampleItems: firstItems 
                });
                
                allMedia.push(...mediaItems);
            } catch (err) {
                console.warn(`[System Routes] Skip folder: ${targetPath} - ${err.message}`);
                debugInfo.push({ target: targetPath, error: err.message, stack: err.stack });
            }
        }

        res.json({ 
            images: allMedia,
            debug: debugInfo
        });

    } catch (err) {
        console.error('Media list error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/system/copy-to-clipboard
 * Copies one or more files to the Windows clipboard using PowerShell.
 */
router.post('/copy-to-clipboard', async (req, res) => {
    try {
        const { paths: filePaths } = req.body;
        if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
            return res.status(400).json({ error: 'No paths provided' });
        }

        // Normalizamos y escapamos las rutas para PowerShell
        const normalizedPaths = filePaths.map(p => {
            // Aseguramos que sea una ruta de Windows absoluta y escapamos comillas
            let winPath = path.normalize(p).replace(/\//g, '\\');
            return `"${winPath}"`;
        }).join(',');

        // Comando PowerShell para copiar archivos al portapapeles
        // Set-Clipboard -Path requiere un array de strings en PS
        const command = `powershell -Command "Set-Clipboard -Path ${normalizedPaths}"`;
        
        console.log(`[System Routes] Executing clipboard copy: ${command}`);

        exec(command, (err) => {
            if (err) {
                console.error('[System Routes] Clipboard copy error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
    } catch (err) {
        console.error('Clipboard copy route error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Helper: Escanea una carpeta recursivamente buscando documentos.
 */
async function scanDirectoryRecursive(dirPath, extensions, maxDepth = 5, currentDepth = 0) {
    if (currentDepth > maxDepth) return [];
    
    let results = [];
    try {
        const dirents = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const dirent of dirents) {
            const fullPath = path.join(dirPath, dirent.name);
            
            if (dirent.isDirectory()) {
                // Recursión
                const subResults = await scanDirectoryRecursive(fullPath, extensions, maxDepth, currentDepth + 1);
                results = results.concat(subResults);
            } else if (dirent.isFile() || dirent.isSymbolicLink()) {
                const ext = path.extname(dirent.name).toLowerCase();
                if (extensions.includes(ext)) {
                    let mtime = new Date(0);
                    try {
                        const stats = await fs.stat(fullPath);
                        mtime = stats.mtime;
                    } catch (e) {}

                    results.push({
                        label: dirent.name,
                        path: fullPath,
                        type: 'documentos',
                        icon: 'file-earmark-text',
                        mtime: mtime.toISOString()
                    });
                }
            }
        }
    } catch (err) {
        // Ignorar errores de acceso a carpetas específicas
        logToFile(`[System Routes] Skip recursive folder ${dirPath}: ${err.message}`);
    }
    return results;
}

/**
 * POST /api/system/list-docs
 * Lists document files in specific directories (Recursively).
 */
router.post('/list-docs', async (req, res) => {
    try {
        const { folderPaths } = req.body;
        logToFile(`[System Routes] list-docs (recursive) received for: ${JSON.stringify(folderPaths)}`);

        if (!folderPaths || !Array.isArray(folderPaths)) {
            return res.status(400).json({ error: 'No folderPaths provided' });
        }

        const allDocs = [];
        const extensions = [
            '.pdf', 
            '.doc', '.docx', '.odt', '.rtf', 
            '.xls', '.xlsx', '.ods', '.csv',
            '.ppt', '.pptx', '.pps', '.odp',
            '.zip', '.rar', '.7z', '.txt'
        ];

        for (let targetPath of folderPaths) {
            try {
                let absolutePath = targetPath;
                const isWindowsAbsolute = /^[a-zA-Z]:[\\/]/.test(targetPath);
                
                if (isWindowsAbsolute) {
                    absolutePath = path.resolve(targetPath);
                } else if (path.isAbsolute(targetPath)) {
                    // Ya es absoluta
                } else {
                    absolutePath = path.join(__dirname, '../../', targetPath);
                }

                const fsPath = path.normalize(absolutePath);
                logToFile(`[System Routes] Scanning recursive folder: ${fsPath}`);

                await fs.access(fsPath);
                const docItems = await scanDirectoryRecursive(fsPath, extensions);
                
                logToFile(`[System Routes] Found ${docItems.length} documents recursively in ${fsPath}`);
                allDocs.push(...docItems);
            } catch (err) {
                logToFile(`[System Routes] ERROR scanning folder ${targetPath}: ${err.message}`);
            }
        }

        res.json({ documents: allDocs });
    } catch (error) {
        logToFile(`[System Routes] CRITICAL ERROR in list-docs: ${error.message}`);
        res.status(500).json({ error: 'Error listing documents', details: error.message });
    }
});

/**
 * GET /api/system/web-proxy
 * Fetches an external webpage and strips CSP/X-Frame headers to allow embedding.
 */
router.get('/web-proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('No URL provided');

    logToFile(`Web Proxy (AGGRESSIVE) Request: ${targetUrl}`);

    try {
        const urlObj = new URL(targetUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3'
            }
        };

        const proxyReq = protocol.get(targetUrl, options, (proxyRes) => {
            // Check for redirects
            if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                let redirUrl = proxyRes.headers.location;
                if (!redirUrl.startsWith('http')) {
                    redirUrl = new URL(redirUrl, targetUrl).href;
                }
                logToFile(`Redirecting proxy to: ${redirUrl}`);
                return res.redirect(`/api/system/web-proxy?url=${encodeURIComponent(redirUrl)}`);
            }

            // Manejo de Descompresión
            let stream = proxyRes;
            const contentEncoding = proxyRes.headers['content-encoding'];
            
            if (contentEncoding === 'gzip') {
                stream = proxyRes.pipe(zlib.createGunzip());
            } else if (contentEncoding === 'deflate') {
                stream = proxyRes.pipe(zlib.createInflate());
            } else if (contentEncoding === 'br') {
                stream = proxyRes.pipe(zlib.createBrotliDecompress());
            }

            // Copiar código de estado
            res.status(proxyRes.statusCode);

            // Copiar cabeceras quitando las de seguridad y las de tamaño/compresión
            Object.keys(proxyRes.headers).forEach(key => {
                const lowerKey = key.toLowerCase();
                const restricted = ['content-security-policy', 'x-frame-options', 'frame-options', 'content-length', 'content-encoding'];
                if (!restricted.includes(lowerKey)) {
                    res.setHeader(key, proxyRes.headers[key]);
                }
            });

            // Si es HTML, reescribimos
            const isHtml = (proxyRes.headers['content-type'] || '').includes('text/html');

            if (isHtml) {
                let bodyChunks = [];
                stream.on('data', chunk => bodyChunks.push(chunk));
                stream.on('end', () => {
                    let body = Buffer.concat(bodyChunks).toString();
                    const origin = urlObj.origin;
                    
                    // 1. Inyectar <base> tag
                    const baseTag = `<base href="${origin}${urlObj.pathname}">`;
                    if (body.includes('<head>')) {
                        body = body.replace('<head>', `<head>\n    ${baseTag}`);
                    } else if (body.includes('<html>')) {
                        body = body.replace('<html>', `<html>\n<head>${baseTag}</head>`);
                    }

                    // 2. REESCRITURA AGRESIVA (Regex mejorada)
                    // Maneja: attr="path", attr='path', attr=path, attr  =  "path"
                    const attrs = ['src', 'href', 'action', 'srcset', 'data-src', 'data-href', 'module-preload'];
                    attrs.forEach(attr => {
                        // Regex que busca el atributo, opcionalmente espacios, signo igual, opcionalmente espacios, 
                        // y luego captura el valor (con o sin comillas)
                        const regex = new RegExp(`(${attr})\\s*=\\s*(?:"|')?(?!http|https|data:|#|\\/\\/)([^"'>\\s]+)(?:"|'|\\s|>)`, 'ig');
                        body = body.replace(regex, (match, p1, path) => {
                            try {
                                const resolved = new URL(path, targetUrl).href;
                                return `${p1}="${resolved}"`;
                            } catch (e) {
                                return match;
                            }
                        });
                    });

                    // 3. REESCRITURA CSS url()
                    body = body.replace(/url\(['"]?(\/[^'"]+)['"]?\)/g, (match, path) => {
                        try {
                            const resolved = new URL(path, targetUrl).href;
                            return `url("${resolved}")`;
                        } catch (e) {
                            return match;
                        }
                    });

                    res.send(body);
                });
            } else {
                // Para binarios (imágenes, etc.), pipear el stream descompreso (o el original si no estaba compreso)
                stream.pipe(res);
            }
        });

        proxyReq.on('error', (err) => {
            logToFile(`Web Proxy Error: ${err.message}`);
            res.status(500).send(`Proxy Error: ${err.message}`);
        });

    } catch (err) {
        logToFile(`Web Proxy Fatal Error: ${err.message}`);
        res.status(500).send(`Invalid URL: ${err.message}`);
    }
});

module.exports = router;
