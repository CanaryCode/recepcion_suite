const express = require('express');
const router = express.Router();

let shutdownTimer = null;

// Utility to reset the timer
const resetShutdownTimer = () => {
    if (shutdownTimer) clearTimeout(shutdownTimer);
    
    // Configurar nuevo timer de 24 HORAS (Persistencia total durante el turno)
    shutdownTimer = setTimeout(() => {
        console.log('No heartbeat received for 24 hours. Shutting down...');
        process.exit(0);
    }, 86400000); 
};

/**
 * GET /api/heartbeat
 * Resets the 24h idle shutdown timer.
 */
router.get('/', (req, res) => {
    resetShutdownTimer();
    res.send('OK');
});

// Initial startup timeout (60s until first client connects)
// This mirrors the behavior of the original native server
shutdownTimer = setTimeout(() => {
    console.log('Initial startup timeout. No client connected within 60s. Shutting down...');
    process.exit(0);
}, 60000);

module.exports = router;
