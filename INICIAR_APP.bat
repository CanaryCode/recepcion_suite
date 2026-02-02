@echo off
setlocal enabledelayedexpansion
set "VERSION=4.0 [WEB EDITION]"

:: Forzar que el script se ejecute siempre en su propia carpeta
cd /d "%~dp0"

:: Título de la ventana
title [ RECEPCION SUITE v%VERSION% ] - SERVIDOR ACTIVO

echo.
echo  =======================================================
echo   RECEPCION SUITE - Sistema de Gestion Hotelera
echo   Versión: %VERSION%
echo  =======================================================
echo.

:: ---------------------------------------------------------
:: 1. BUSQUEDA DE MOTOR NODE.JS
:: ---------------------------------------------------------

:: Opcion 1: Node.js Portable (Carpeta local 'bin')
set "NODE_EXEC=%~dp0bin\node.exe"
if exist "!NODE_EXEC!" (
    echo   [+] Modo: PORTABLE (Usando Node local en /bin)
    goto :CheckDependencies
)

:: Opcion 2: Node.js Instalado (PATH del sistema)
where node >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE_EXEC=node"
    echo   [+] Modo: INSTALADO (Usando Node del Sistema)
    goto :CheckDependencies
)

:: Opcion 3: Busqueda en Program Files
if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_EXEC=%ProgramFiles%\nodejs\node.exe"
    goto :CheckDependencies
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "NODE_EXEC=%ProgramFiles(x86)%\nodejs\node.exe"
    goto :CheckDependencies
)

:: ---------------------------------------------------------
:: SI LLEGAMOS AQUI, NO SE ENCONTRO NADA
:: ---------------------------------------------------------
echo.
echo   [!] ERROR CRITICO: No se encuentra Node.js.
echo.
echo   Para que esta aplicacion sea PORTABLE, debes copiar el archivo
echo   "node.exe" dentro de una carpeta llamada "bin" aqui mismo.
echo.
echo   Estructura requerida:
echo      /RECEPCION SUITE/
91:         /bin/node.exe
92:         /server/...
93:         INICIAR_APP.bat
echo.
pause
exit /b

:: ---------------------------------------------------------
:: 2. VERIFICACION DE DEPENDENCIAS (AUTO-INSTALL)
:: ---------------------------------------------------------
:CheckDependencies

if not exist "%~dp0server\node_modules" (
    echo.
    echo   [!] PRIMERA EJECUCION O LIBRERIAS FALTANTES
    echo   [i] Intentando instalar librerias necesarias...
    echo.
    
    :: Verificar si tenemos NPM
    where npm >nul 2>nul
    if !errorlevel! equ 0 (
        cd server
        call npm install
        cd ..
        echo.
        echo   [+] Instalacion completada de forma automatica.
    ) else (
        echo   [!] ERROR: No se encontro 'node_modules' y tampoco tenemos 'npm' 
        echo       instalado en este equipo para descargarlos.
        echo.
        echo       SOLUCION: 
        echo       1. Instala Node.js en este PC (https://nodejs.org/)
        echo       2. O copia el programa desde el PC original INCLUYENDO la carpeta 'server/node_modules'.
        echo.
        pause
        exit /b
    )
    echo.
)

:: ---------------------------------------------------------
:: 3. ARRANQUE
:: ---------------------------------------------------------
:StartServer

echo   [+] Motor: !NODE_EXEC!
echo   [+] Web: http://localhost:3000
echo.
echo   AVISO: NO CIERRES ESTA VENTANA. 
echo   Minimizala para mantener la aplicacion activa.
echo.

:: Abrimos el navegador automáticamente
start http://localhost:3000

:: Arrancamos usando el script estándar
:: Si hay package.json en raiz, usamos la logica directa
if exist "server/app.js" (
    "!NODE_EXEC!" server/app.js
) else (
    echo [!] ERROR: No se encuentra 'server/app.js'
    pause
)
