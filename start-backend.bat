@echo off
title MyDataInsight Backend (8000)
cd /d "%~dp0backend"

REM Conda 사용 시 아래 한 줄 주석 해제 후 환경명 수정
REM call C:\Users\jjogaeo\anaconda3\Scripts\activate.bat base

echo Starting backend on http://127.0.0.1:8000 ...
uvicorn main:app --reload --port 8000
pause
