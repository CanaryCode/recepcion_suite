const express = require('express');
const path = require('path');
const cors = require('cors');

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
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
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

app.use('/api/storage', storageRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/heartbeat', heartbeatRoutes);

// --- STATIC FILES ---
// Servidor de archivos estáticos para el frontend
const frontendPath = path.join(__dirname, '../');
app.use(express.static(frontendPath));

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
