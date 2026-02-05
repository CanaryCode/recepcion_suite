const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

module.exports = router;
