@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
cd /d "%ROOT%"

start "MyDataInsight Backend" cmd /k call "%ROOT%start-backend.bat"
timeout /t 3 /nobreak >nul
start "MyDataInsight Frontend" cmd /k call "%ROOT%start-frontend.bat"
timeout /t 6 /nobreak >nul
start "" "http://127.0.0.1:5173"

echo.
echo Two server windows should be open (Backend / Frontend).
echo Browser opened: http://127.0.0.1:5173
echo If the page fails, read error messages in those server windows.
echo This launcher window closes when you press a key.
echo.
pause >nul
