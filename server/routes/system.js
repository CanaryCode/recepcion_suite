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

module.exports = router;
