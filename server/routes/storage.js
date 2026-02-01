const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const STORAGE_DIR = path.resolve(__dirname, '../../storage');
const LOG_FILE = path.join(STORAGE_DIR, 'server_debug.log');

// Helper to log to file (USANDO RUTAS ABSOLUTAS)
const logToFile = (msg) => {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${msg}\n`;
    try {
        if (!fsSync.existsSync(STORAGE_DIR)) {
            fsSync.mkdirSync(STORAGE_DIR, { recursive: true });
        }
        fsSync.appendFileSync(LOG_FILE, entry);
    } catch (e) {
        console.error('CRITICAL: Could not write to log file', e);
    }
};

// Log de inicio
logToFile('--- STORAGE SERVICE INITIALIZED ---');

/**
 * GET /api/storage/debug/log
 * Devuelve el contenido del log de depuración.
 */
router.get('/debug/log', async (req, res) => {
    try {
        const logs = await fs.readFile(LOG_FILE, 'utf8');
        res.type('text/plain').send(logs);
    } catch (err) {
        res.status(404).send('No hay logs todavía.');
    }
});

// Utility: Ensure storage directory exists
const ensureStorageDir = async () => {
    try {
        await fs.access(STORAGE_DIR);
    } catch {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
    }
};

/**
 * POST /api/storage/upload
 * Saves a media file (Base64) to storage/media/:folder/
 */
router.post('/upload', async (req, res) => {
    logToFile('>>> POST /upload received');
    logToFile(`Headers: ${req.headers['content-type']}`);
    logToFile(`Body keys: ${Object.keys(req.body || {}).join(', ')}`);
    
    try {
        const { fileName, fileData, folder = 'misc' } = req.body;
        
        logToFile(`Upload request: ${fileName || 'NO_NAME'} to folder ${folder}`);
        if (!fileName || !fileData) {
            console.error('[Storage] Error: Missing fileName or fileData');
            return res.status(400).json({ error: 'Missing fileName or fileData' });
        }

        const mediaDir = path.join(STORAGE_DIR, 'media', folder);
        console.log(`[Storage] Target directory: ${mediaDir}`);
        
        // Ensure folder exists
        try {
            await fs.mkdir(mediaDir, { recursive: true });
        } catch (dirErr) {
            console.warn('[Storage] Error creating directory (might exist):', dirErr.message);
        }

        const filePath = path.join(mediaDir, fileName);
        
        // Remove Base64 prefix if present
        const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        await fs.writeFile(filePath, buffer);
        console.log(`[Storage] File saved: ${filePath}`);
        
        // Return relative path for frontend
        const relativePath = `storage/media/${folder}/${fileName}`;
        console.log(`[Storage] Returning path: ${relativePath}`);
        res.json({ success: true, path: relativePath });
    } catch (err) {
        console.error(`[Storage] Error uploading file:`, err);
        res.status(500).json({ error: 'Upload error', details: err.message });
    }
});

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
        await fs.writeFile(filePath, JSON.stringify(req.body, null, 4), 'utf8');
        logToFile(`[Storage] Saved key: ${key}`);
        res.json({ success: true });
    } catch (err) {
        console.error(`Error writing storage key [${key}]:`, err);
        res.status(500).json({ error: 'Write error', details: err.message });
    }
});

module.exports = router;
