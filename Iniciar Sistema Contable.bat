@echo off
title Sistema Contable
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js instalado en este computador.
  echo Instalalo desde https://nodejs.org y vuelve a intentar.
  echo.
  pause
  exit /b 1
)

echo ============================================
echo   Sistema Contable
echo ============================================
echo.
echo Buscando actualizaciones...

where git >nul 2>nul
if errorlevel 1 (
  echo Git no esta instalado -- se omite la busqueda de actualizaciones.
) else (
  git pull --ff-only
  if errorlevel 1 (
    echo.
    echo No se pudo actualizar automaticamente ^(sin conexion, o hay un cambio
    echo local pendiente^). Se abrira el sistema con la version ya instalada.
  )
)

echo.
echo Iniciando, espera unos segundos...
echo No cierres esta ventana mientras uses el sistema.
echo Para salir, simplemente cierra esta ventana.
echo.

cd /d "%~dp0server"

start /b "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000'"

node index.js

pause
