@echo off
echo ==================================================
echo   RESET COMPLETO DEL SERVIDOR (FULL RESTART)
echo ==================================================
echo.
echo 1. Cerrando procesos Node.js antiguos...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 >nul

echo.
echo 2. Iniciando Servidor Limpio...
echo.

if exist "bin\node.exe" (
    "bin\node.exe" server/app.js
) else (
    node server/app.js
)

echo.
echo ==================================================
echo   SERVIDOR INICIADO - NO CERRAR ESTA VENTANA
echo ==================================================
pause
