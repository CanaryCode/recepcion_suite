const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

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
        let { folderPath } = req.body;
        
        if (!folderPath) {
            folderPath = path.join(__dirname, '../../assets/gallery');
        } else if (!path.isAbsolute(folderPath)) {
            folderPath = path.join(__dirname, '../../', folderPath);
        }

        // Sanitize folderPath for internal use but preserve absolute nature
        // path.resolve normaliza \ y / según el OS.
        folderPath = path.resolve(folderPath).replace(/\\/g, '/');
        console.log(`[System Routes] Target folderPath: ${folderPath}`);

        try {
            await fs.access(folderPath);
        } catch (accessErr) {
            console.warn(`[System Routes] Path NOT accessible or missing: ${folderPath}`, accessErr.message);
            // Si no existe, intentamos ver si el problema es que falta algún nivel de carpeta
            return res.json({ 
                path: folderPath, 
                images: [], 
                error: 'Carpeta no encontrada o inaccesible' 
            });
        }

        const dirents = await fs.readdir(folderPath, { withFileTypes: true });
        
        const images = dirents
            .filter(dirent => {
                if (!dirent.isFile()) return false;
                const ext = path.extname(dirent.name).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
            })
            .map(dirent => {
                const fullPath = path.join(folderPath, dirent.name);
                // SANITIZACIÓN CRÍTICA: Convertir todas las \ a / para evitar SyntaxError en el cliente
                const sanitizedPath = fullPath.replace(/\\/g, '/');
                
                let url = '';
                const assetsIndex = sanitizedPath.indexOf('assets');
                const resourcesIndex = sanitizedPath.indexOf('resources');
                const storageIndex = sanitizedPath.indexOf('storage');

                if (assetsIndex !== -1) {
                    url = sanitizedPath.substring(assetsIndex);
                } else if (resourcesIndex !== -1) {
                    url = sanitizedPath.substring(resourcesIndex);
                } else if (storageIndex !== -1) {
                    url = sanitizedPath.substring(storageIndex);
                } else {
                    // Si es externo, usar el proxy
                    url = `/api/system/image-proxy?path=${encodeURIComponent(sanitizedPath)}`;
                }

                return {
                    name: dirent.name,
                    path: sanitizedPath,
                    url: url
                };
            });

        console.log(`[System Routes] Found ${images.length} images in ${folderPath}`);
        res.json({ 
            path: folderPath.replace(/\\/g, '/'),
            images: images
        });

    } catch (err) {
        console.error('Image list error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
