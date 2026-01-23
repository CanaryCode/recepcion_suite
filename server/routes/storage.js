const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Helper to get storage path
const getStoragePath = (key) => path.join(__dirname, '../../storage', `${key}.json`);

// Ensure storage directory exists
const ensureStorageDir = async () => {
    const storageDir = path.join(__dirname, '../../storage');
    try {
        await fs.access(storageDir);
    } catch {
        await fs.mkdir(storageDir, { recursive: true });
    }
};

// GET /:key - Retrieve data
router.get('/:key', async (req, res) => {
    try {
        const filePath = getStoragePath(req.params.key);
        try {
            const data = await fs.readFile(filePath, 'utf8');
            res.json(JSON.parse(data));
        } catch (err) {
            if (err.code === 'ENOENT') {
                // File doesn't exist yet, return null or empty array depending on convention
                // For now returning null to indicate "no server data"
                res.json(null);
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('Storage Read Error:', error);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// POST /:key - Save data
router.post('/:key', async (req, res) => {
    try {
        await ensureStorageDir();
        const filePath = getStoragePath(req.params.key);
        
        // Write data to file (pretty printed for readability)
        await fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf8');
        
        res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('Storage Write Error:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

module.exports = router;
