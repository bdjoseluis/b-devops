@echo off
title AURA OPS — Iniciando...
color 0C

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║            AURA OPS v1.0                 ║
echo  ║     Sistema de Ciberinteligencia OSINT   ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  Backend: http://localhost:8000
echo  Frontend: http://localhost:5173
echo.
echo  Cerrando esta ventana se detendra todo.
echo  ─────────────────────────────────────────
echo.

:: Start backend in new window
start "AURA OPS — Backend" /min cmd /c "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && python main.py"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
start "AURA OPS — Frontend" /min cmd /c "cd /d "%~dp0frontend" && npm run dev"

:: Wait for frontend
timeout /t 3 /nobreak >nul

:: Open browser
echo  Abriendo navegador...
start "" http://localhost:5173

echo.
echo  [OK] AURA OPS arrancado!
echo  Presiona cualquier tecla para detener todos los procesos...
pause >nul

:: Kill processes on exit
taskkill /f /fi "WINDOWTITLE eq AURA OPS*" >nul 2>&1
echo  [OK] Procesos detenidos.
