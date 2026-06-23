@echo off
cd /d "%~dp0"

start "MyDataInsight Backend" cmd /k "%~dp0start-backend.bat"
timeout /t 2 /nobreak >nul
start "MyDataInsight Frontend" cmd /k "%~dp0start-frontend.bat"

echo.
echo MyDataInsight servers starting...
echo   Backend:   http://127.0.0.1:8000
echo   Frontend:  http://127.0.0.1:5173
echo   LM Studio: http://localhost:1234 (별도 실행 필요)
echo.
echo 브라우저에서 http://127.0.0.1:5173 을 열어주세요.
echo 종료하려면 백엔드/프론트 cmd 창에서 Ctrl+C 를 누르세요.
echo.
pause
