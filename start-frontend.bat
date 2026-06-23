@echo off
title MyDataInsight Frontend (5173)
cd /d "%~dp0frontend"

echo Starting frontend on http://127.0.0.1:5173 ...
npm run dev -- --host 127.0.0.1 --port 5173
pause
