::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAjk
::fBw5plQjdCyDJGyX8VAjFBFRXxGRAE+1BaAR7ebv/NaxkW4SUOcDSqr4/4StCc89qnbRXKIIlmwIpNkJHxRNbBGufTM9qmFMuSqMNMj8
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSDk=
::cBs/ulQjdF+5
::ZR41oxFsdFKZSDk=
::eBoioBt6dFKZSDk=
::cRo6pxp7LAbNWATEpCI=
::egkzugNsPRvcWATEpCI=
::dAsiuh18IRvcCxnZtBJQ
::cRYluBh/LU+EWAnk
::YxY4rhs+aU+JeA==
::cxY6rQJ7JhzQF1fEqQJQ
::ZQ05rAF9IBncCkqN+0xwdVs0
::ZQ05rAF9IAHYFVzEqQJQ
::eg0/rx1wNQPfEVWB+kM9LVsJDGQ=
::fBEirQZwNQPfEVWB+kM9LVsJDGQ=
::cRolqwZ3JBvQF1fEqQJQ
::dhA7uBVwLU+EWDk=
::YQ03rBFzNR3SWATElA==
::dhAmsQZ3MwfNWATElA==
::ZQ0/vhVqMQ3MEVWAtB9wSA==
::Zg8zqx1/OA3MEVWAtB9wSA==
::dhA7pRFwIByZRRnk
::Zh4grVQjdCyDJGyX8VAjFBFRXxGRAE+1BaAR7ebv/NaxkW4SUOcDSqr4/4StCc89qnbRXKIIlmwIpPkpLz5oXTsInSF0mltrgkHFNd7ckkGhYE2aRZEjew==
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
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
    goto :StartServer
)

:: Opcion 2: Node.js Instalado (PATH del sistema)
where node >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE_EXEC=node"
    echo   [+] Modo: INSTALADO (Usando Node del Sistema)
    goto :StartServer
)

:: Opcion 3: Busqueda en Program Files
if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_EXEC=%ProgramFiles%\nodejs\node.exe"
    goto :StartServer
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "NODE_EXEC=%ProgramFiles(x86)%\nodejs\node.exe"
    goto :StartServer
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
echo         /bin/node.exe
echo         /server/...
echo         INICIAR_APP.bat
echo.
pause
exit /b

:: ---------------------------------------------------------
:: 2. VERIFICACION DE DEPENDENCIAS (AUTO-INSTALL)
:: ---------------------------------------------------------
:CheckDependencies

if not exist "%~dp0server\node_modules" (
    echo.
    echo   [!] PRIMERA EJECUCION DETECTADA
    echo   [i] Instalando librerias necesarias...
    echo.
    
    cd server
    call npm install
    cd ..
    
    echo.
    echo   [+] Instalacion completada.
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
