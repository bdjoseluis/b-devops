@echo off
title B-DEVOPS — Instalacion
color 0C

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║          B-DEVOPS — Instalacion          ║
echo  ║     Sistema de Ciberinteligencia OSINT   ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no encontrado. Instala Python 3.10+ desde python.org
    pause
    exit /b 1
)
echo [OK] Python encontrado

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado. Instala Node.js desde nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js encontrado

echo.
echo [1/3] Instalando dependencias Python...
cd /d "%~dp0backend"
python -m venv venv >nul 2>&1
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ERROR] Fallo al instalar dependencias Python
    pause
    exit /b 1
)
echo [OK] Backend Python listo

echo.
echo [2/3] Instalando dependencias Node.js...
cd /d "%~dp0frontend"
call npm install --silent
if errorlevel 1 (
    echo [ERROR] Fallo al instalar dependencias Node.js
    pause
    exit /b 1
)
echo [OK] Frontend React listo

echo.
echo [3/3] Creando carpetas necesarias...
if not exist "%~dp0backend\reports" mkdir "%~dp0backend\reports"
echo [OK] Carpeta de reportes creada

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     B-DEVOPS — Instalacion completada!  ║
echo  ║                                         ║
echo  ║  Ejecuta: start.bat para arrancar       ║
echo  ╚══════════════════════════════════════════╝
echo.
pause
