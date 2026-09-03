@echo off
title Crear Acceso Directo
set "BASE=%~dp0"
if "%BASE:~-1%"=="\" set "BASE=%BASE:~0,-1%"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%BASE%\Sistema Contable.lnk'); $s.TargetPath = '%BASE%\Iniciar Sistema Contable.bat'; $s.WorkingDirectory = '%BASE%'; $s.IconLocation = '%BASE%\client\public\favicon.ico'; $s.Description = 'Sistema Contable'; $s.WindowStyle = 1; $s.Save()"

echo.
echo Listo. Se creo "Sistema Contable.lnk" en esta carpeta, con el icono del sistema.
echo Puedes copiar ese acceso directo al Escritorio (arrastrandolo, o clic derecho -^> Enviar a -^> Escritorio).
echo.
pause
