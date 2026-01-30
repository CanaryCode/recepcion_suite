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
 * POST /api/system/list-images
 * Lists image files in a specific directory.
 */
router.post('/list-images', async (req, res) => {
    console.log('[System Routes] POST /list-images called');
    try {
        let { folderPath } = req.body;
        
        // Default to assets/gallery in the project root if no path provided
        // or if the path is relative
        if (!folderPath) {
            folderPath = path.join(__dirname, '../../assets/gallery');
        } else if (!path.isAbsolute(folderPath)) {
             folderPath = path.join(__dirname, '../../', folderPath);
        }

        // Ensure directory exists
        try {
            await fs.access(folderPath);
        } catch {
            await fs.mkdir(folderPath, { recursive: true });
        }

        const dirents = await fs.readdir(folderPath, { withFileTypes: true });
        
        const images = dirents
            .filter(dirent => {
                if (!dirent.isFile()) return false;
                const ext = path.extname(dirent.name).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
            })
            .map(dirent => ({
                name: dirent.name,
                path: path.join(folderPath, dirent.name),
                // Create a relative URL for frontend if it's inside assets
                url: folderPath.includes('assets') 
                    ? `assets/gallery/${dirent.name}` // Simplification: assuming standard structure
                    : `file://${path.join(folderPath, dirent.name)}` // Fallback for external
            }));
            
        // Fix URL generation logic to be more robust for subfolders or external folders
        // If the path contains 'assets', we try to make it relative to the web root
        // This is a bit hacky but works for the default use case
        images.forEach(img => {
            const assetsIndex = img.path.indexOf('assets');
            const resourcesIndex = img.path.indexOf('resources');
            
            if (assetsIndex !== -1) {
                // Convert backslashes to forward slashes for URLs
                img.url = img.path.substring(assetsIndex).replace(/\\/g, '/');
            } else if (resourcesIndex !== -1) {
                // Also serve resources directory statically if configured
                img.url = img.path.substring(resourcesIndex).replace(/\\/g, '/');
            }
        });

        res.json({ 
            path: folderPath,
            images: images
        });

    } catch (err) {
        console.error('Image list error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
