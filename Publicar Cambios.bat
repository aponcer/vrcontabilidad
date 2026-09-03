@echo off
title Publicar Cambios
cd /d "%~dp0"

echo ============================================
echo   Publicar Cambios
echo ============================================
echo.
echo Compilando el cliente (dist)...
cd client
call npm run build
cd ..

if errorlevel 1 (
  echo.
  echo La compilacion fallo. Revisa el error de arriba antes de subir nada.
  echo.
  pause
  exit /b 1
)

echo.
echo Cliente compilado. Ahora se van a subir los cambios a git.
echo.

git add -A
git status
echo.

set /p MENSAJE="Describe brevemente el cambio (para el commit): "
if "%MENSAJE%"=="" set MENSAJE=Actualizacion

git commit -m "%MENSAJE%"
git push

echo.
echo Listo.
pause
