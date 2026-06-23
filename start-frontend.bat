@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "NPM=C:\Program Files\nodejs\npm.cmd"

if not exist "%NPM%" (
  for /f "delims=" %%i in ('where npm.cmd 2^>nul') do set "NPM=%%i" & goto npm_ok
  echo ERROR: npm.cmd not found.
  pause
  exit /b 1
)
:npm_ok

cd /d "%ROOT%frontend"
echo [Frontend] http://127.0.0.1:5173
"%NPM%" run dev -- --host 127.0.0.1 --port 5173
pause
