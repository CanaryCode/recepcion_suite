@echo off
setlocal

:: Título de la ventana
title SERVIDOR HOTEL - NO CERRAR

:: 1. Detectar Node.js
:: Primero intentamos usar "node" normal (para cuando lo instales en otro PC)
set "NODE_EXEC=node"
where node >nul 2>nul

:: Si no encuentra "node", usamos la ruta de emergencia de tu PC actual
if %errorlevel% neq 0 (
    set "NODE_EXEC=C:\Users\jesus\AppData\Local\ms-playwright-go\1.50.1\node.exe"
)

echo.
echo  =======================================================
echo   INICIANDO HOTEL MANAGEMENT SYSTEM
echo  =======================================================
echo.
echo   [1/2] Cargando sistema de datos...
echo   [2/2] Abriendo aplicacion...
echo.
echo   IMPORTANTE: 
echo   NO CIERRES ESTA VENTANA MIENTRAS USES LA APLICACION.
echo   (Minimizala para que no moleste)
echo.

:: Esperamos 2 segundos para dar tiempo al usuario a leer
timeout /t 2 >nul

:: Abrimos el navegador automáticamente apuntando a nuestro servidor
start http://localhost:3000

:: Arrancamos el servidor (Esto se quedará ejecutando aquí)
"%NODE_EXEC%" server/app.js
