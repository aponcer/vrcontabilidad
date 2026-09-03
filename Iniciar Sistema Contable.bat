@echo off
title Sistema Contable
cd /d "%~dp0server"

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
echo Iniciando, espera unos segundos...
echo No cierres esta ventana mientras uses el sistema.
echo Para salir, simplemente cierra esta ventana.
echo.

start /b "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000'"

node index.js

pause
