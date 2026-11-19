@echo off
setlocal EnableExtensions
title iUEP Launcher
cd /d "%~dp0"

rem ===================================================================
rem  iUEP Connect - start script
rem  Launches the Spring Boot backend (which also serves the frontend)
rem  in its own window, waits until it is healthy, then opens the site.
rem
rem  Optional secrets live in a git-ignored ".env" file in this folder:
rem      APIFY_TOKEN=your_apify_token     (needed for the FB scraper)
rem      SMTP_USERNAME=you@gmail.com      (needed for OTP emails)
rem      SMTP_PASSWORD=app_password       (Gmail App Password, not your login)
rem      SMTP_HOST / SMTP_PORT / SMTP_FROM / SMTP_SSL / SMTP_STARTTLS (optional)
rem      JWT_SECRET=your_long_secret
rem      PORT=3000
rem ===================================================================

rem --- Load .env (KEY=VALUE per line, lines starting with # are ignored)
if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do set "%%A=%%B"
)
if not defined PORT set "PORT=3000"

rem --- Java check
where java >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java was not found on PATH. Install Java 21 or higher and try again.
    pause
    exit /b 1
)

rem --- Already running?
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
    echo [INFO] Something is already listening on port %PORT%.
    echo        If it is iUEP, it is already running: http://localhost:%PORT%
    echo        Run stop.bat first if you want to restart it.
    pause
    exit /b 1
)

echo ==============================================
echo   iUEP Connect
echo ==============================================
if defined APIFY_TOKEN (
    echo   Scraper : ON  ^(APIFY_TOKEN found^)
) else (
    echo   Scraper : switch is ON but APIFY_TOKEN is not set.
    echo             Add APIFY_TOKEN=... to a .env file next to start.bat
    echo             for live Facebook posts.
)
echo   Port    : %PORT%
echo ==============================================
echo.
echo Starting backend in a new window ^(first run downloads Maven + dependencies, so it may take a while^)...

start "iUEP Backend" /D "%~dp0backend" cmd /c ""%~dp0backend\mvnw.cmd" spring-boot:run || pause"

echo Waiting for the server to become ready...
powershell -NoProfile -Command "$u='http://localhost:%PORT%/api/health'; for($i=0;$i -lt 300;$i++){ try{ if((Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200){ exit 0 } }catch{}; Start-Sleep 1 }; exit 1"
if errorlevel 1 (
    echo.
    echo [WARN] Server did not respond within 5 minutes. Check the "iUEP Backend" window for errors.
    pause
    exit /b 1
)

echo.
echo iUEP is up at http://localhost:%PORT%
start "" "http://localhost:%PORT%"
echo Use stop.bat to shut it down.
timeout /t 3 >nul
endlocal
