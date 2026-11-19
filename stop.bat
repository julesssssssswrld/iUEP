@echo off
setlocal EnableExtensions
title iUEP Stop
cd /d "%~dp0"

rem ===================================================================
rem  iUEP Connect - stop script
rem  Stops whatever is listening on the iUEP port (default 3000), plus
rem  the "iUEP Backend" window that start.bat opened.
rem ===================================================================

rem --- Honour a custom PORT from .env, same as start.bat
if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do if /i "%%A"=="PORT" set "PORT=%%B"
)
if not defined PORT set "PORT=3000"

set "FOUND="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
    set "FOUND=1"
    echo Stopping process %%P on port %PORT% ...
    taskkill /PID %%P /T /F >nul 2>&1
)

rem --- Close the launcher's backend window (Maven parent process) if still open
taskkill /FI "WINDOWTITLE eq iUEP Backend*" /T /F >nul 2>&1

if defined FOUND (
    echo iUEP stopped.
) else (
    echo Nothing was listening on port %PORT% - iUEP was not running.
)
timeout /t 2 >nul
endlocal
