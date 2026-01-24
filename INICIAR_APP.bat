@echo off
setlocal enabledelayedexpansion
set "VERSION=2.1"

:: Forzar que el script se ejecute siempre en su propia carpeta
cd /d "%~dp0"

:: Título de la ventana
title [ RECEPCION SUITE v%VERSION% ] - SERVIDOR ACTIVO

echo.
echo  =======================================================
echo   RECEPCION SUITE - Sistema de Gestion Hotelera
echo  =======================================================
echo.

:: ---------------------------------------------------------
:: 1. BUSQUEDA DE MOTOR NODE.JS
:: ---------------------------------------------------------

:: Opcion 1: Node.js Portable (Carpeta local 'bin')
set "NODE_EXEC=%~dp0bin\node.exe"
if exist "!NODE_EXEC!" (
    echo   [+] Modo: PORTABLE (Usando Node local)
    goto :StartServer
)

:: Opcion 2: Node.js Instalado (PATH del sistema)
where node >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE_EXEC=node"
    echo   [+] Modo: INSTALADO (Usando Node del PATH)
    goto :StartServer
)

:: Opcion 3: Node.js en Program Files (Estandar)
if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_EXEC=%ProgramFiles%\nodejs\node.exe"
    echo   [+] Modo: INSTALADO (Detectado en Program Files)
    goto :StartServer
)

:: Opcion 4: Node.js en Program Files x86 (Compatibilidad)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "NODE_EXEC=%ProgramFiles(x86)%\nodejs\node.exe"
    echo   [+] Modo: INSTALADO (Detectado en Program Files x86)
    goto :StartServer
)

:: ---------------------------------------------------------
:: SI LLEGAMOS AQUI, NO SE ENCONTRO NADA
:: ---------------------------------------------------------
echo.
echo   [!] ERROR: No se ha detectado Node.js en este ordenador.
echo.
echo   OPCION A: Instalar Node.js desde https://nodejs.org/
echo   OPCION B: Ejecuta "PACK_PORTABLE.bat" en un PC que si tenga Node
echo             para crear una version portable automaticamente.
echo.
pause
exit /b

:: ---------------------------------------------------------
:: 2. VERIFICACION DE INTEGRIDAD
:: ---------------------------------------------------------
:StartServer

:: Comprobar si faltan librerias
if not exist "server\node_modules\" (
    echo   [!] ADVERTENCIA: No se encuentra la carpeta 'node_modules'.
    echo       Intentando restaurar librerias automaticamente...
    
    where npm >nul 2>nul
    if !errorlevel! equ 0 (
        cd /d "%~dp0server"
        call npm install
        cd /d "%~dp0"
    ) else (
        echo.
        echo   [!] ERROR: Faltan las librerias del servidor y no se encontro NPM.
        echo       Si has copiado el proyecto a otro PC, asegúrate de haber
        echo       ejecutado "PACK_PORTABLE.bat" en el PC original antes de copiar,
        echo       o instala Node.js en este PC.
        echo.
        pause
        exit /b
    )
)

echo   [+] Estado: INICIANDO SERVIDOR...
echo   [+] Motor: !NODE_EXEC!
echo   [+] Web: http://localhost:3000
echo.
echo   AVISO: NO CIERRES ESTA VENTANA. 
echo   Minimizala para mantener la aplicacion activa.
echo.

:: Abrimos el navegador automáticamente
start http://localhost:3000

:: Arrancamos el servidor (Relative path)
if exist "server/app.js" (
    "!NODE_EXEC!" server/app.js
) else (
    echo [!] ERROR: No se encuentra el archivo 'server/app.js'
    echo Asegurate de que estas ejecutando este .bat desde la carpeta del proyecto.
    pause
)
