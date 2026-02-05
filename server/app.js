const express = require('express'); // Force restart 2
const path = require('path');
const cors = require('cors');
const fsSync = require('fs');

const STORAGE_DIR = path.resolve(__dirname, '../storage');
const LOG_FILE = path.join(STORAGE_DIR, 'server_debug.log');

const logToFile = (msg) => {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [SERVER] ${msg}\n`;
    try {
        if (!fsSync.existsSync(STORAGE_DIR)) {
            fsSync.mkdirSync(STORAGE_DIR, { recursive: true });
        }
        fsSync.appendFileSync(LOG_FILE, entry);
    } catch (e) {
        console.error('CRITICAL: Could not write to log file from app.js', e);
    }
};

logToFile('Starting Server Lifecycle');

// Import modular routes
const storageRoutes = require('./routes/storage');
const systemRoutes = require('./routes/system');
const heartbeatRoutes = require('./routes/heartbeat');

const app = express();
const PORT = 3000;

// --- MIDDLEWARE ---
app.use(cors()); // Permite peticiones desde cualquier origen
app.use(express.json({ limit: '50mb' })); // Middleware para parsear JSON (con límite aumentado para backups)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware (opcional, para depuración)
app.use((req, res, next) => {
    logToFile(`${req.method} ${req.url}`);
    next();
});

// --- API ROUTES ---
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Modular Express Server Running',
        version: '5.0 [EXPRESS REFIT]'
    });
});

logToFile('Mounting Storage Routes...');
app.use('/api/storage', storageRoutes);
logToFile('Mounting System Routes...');
try {
    app.use('/api/system', systemRoutes);
    logToFile('SUCCESS: System Routes mounted at /api/system');
} catch (e) {
    logToFile(`CRITICAL FAIL: Could not mount System Routes: ${e.message}`);
}
logToFile('Mounting Heartbeat Routes...');
app.use('/api/heartbeat', heartbeatRoutes);

// --- STATIC FILES ---
// Servidor de archivos estáticos para el frontend
// __dirname es /server, por lo que .. sube a la raíz
const frontendPath = path.resolve(__dirname, '..');
app.use(express.static(frontendPath));

// FIX: Servir explícitamente la carpeta storage para que las imágenes sean accesibles
const storagePath = path.resolve(__dirname, '../storage');
app.use('/storage', express.static(storagePath));

// Fallback para SPA (aunque el index.html está en la raíz, express.static ya lo sirve si safePath era '/')
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- ERROR HANDLING ---
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error', 
        message: err.message 
    });
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  HOTEL MANAGER SERVER v5.0 [EXPRESS]`);
    console.log(`  Running at http://localhost:${PORT}`);
    console.log(`========================================`);
});
