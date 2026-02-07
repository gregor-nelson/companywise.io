@echo off
title CompanyWise Dev Server
echo ============================================
echo  CompanyWise Dev Server
echo  API:      http://localhost:8000/api/health
echo  Frontend: http://localhost:3000
echo ============================================
echo.
echo Starting backend API on :8000 ...
start "CompanyWise API" cmd /c "cd /d %~dp0 && python -m backend.api.app"

echo Starting frontend on :3000 ...
start "CompanyWise Frontend" cmd /c "cd /d %~dp0 && python frontend\dev_server.py"

echo.
echo Both servers running. Close the spawned windows to stop them.
pause
