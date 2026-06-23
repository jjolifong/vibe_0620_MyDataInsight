@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "PY=C:\Users\jjogaeo\anaconda3\python.exe"

if not exist "%PY%" (
  for /f "delims=" %%i in ('where python 2^>nul') do set "PY=%%i" & goto py_ok
  echo ERROR: Python not found.
  pause
  exit /b 1
)
:py_ok

cd /d "%ROOT%backend"
echo [Backend] http://127.0.0.1:8000
"%PY%" -m uvicorn main:app --reload --port 8000
pause
