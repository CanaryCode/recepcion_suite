const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '../../storage');

// Utility: Ensure storage directory exists
const ensureStorageDir = async () => {
    try {
        await fs.access(STORAGE_DIR);
    } catch {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
    }
};

/**
 * GET /api/storage/:key
 * Retrieves data from a JSON file in the storage directory.
 */
router.get('/:key', async (req, res) => {
    const { key } = req.params;
    const filePath = path.join(STORAGE_DIR, `${key}.json`);

    try {
        const data = await fs.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        if (err.code === 'ENOENT') {
            // FIX CRITICO: Mantener compatibilidad con el fallback de config.json
            if (key === 'config') {
                return res.json({
                    SYSTEM: { API_URL: '/api', USE_SYNC_SERVER: true },
                    HOTEL: { RECEPCIONISTAS: [] }
                });
            }
            return res.json(null);
        }
        console.error(`Error reading storage key [${key}]:`, err);
        res.status(500).json({ error: 'Read error', details: err.message });
    }
});

/**
 * POST /api/storage/:key
 * Saves data to a JSON file in the storage directory.
 */
router.post('/:key', async (req, res) => {
    const { key } = req.params;
    const filePath = path.join(STORAGE_DIR, `${key}.json`);

    try {
        await ensureStorageDir();
        // Express.json() middleware already parsed the body
        const data = req.body;
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (err) {
        console.error(`Error writing storage key [${key}]:`, err);
        res.status(500).json({ error: 'Write error', details: err.message });
    }
});

module.exports = router;
