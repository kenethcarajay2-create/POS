@echo off
title StorePOS Launcher

cd /d "C:\Users\Kent\Documents\WEB_PROJECTS\17_POS"

echo ========================================
echo          STARTING STOREPOS
echo ========================================
echo.

REM Start backend + frontend
start "StorePOS Server" cmd /k "npm run dev"

echo Waiting for StorePOS frontend...

:WAIT_FOR_POS

powershell -NoProfile -Command ^
"try { $r = Invoke-WebRequest -Uri 'http://localhost:5371' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }"

if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto WAIT_FOR_POS
)

echo.
echo StorePOS is ready.
echo Opening Chrome...

REM Try normal 64-bit Chrome installation
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:5371"
    goto DONE
)

REM Try 32-bit Chrome installation
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "http://localhost:5371"
    goto DONE
)

REM Fall back to Windows default browser
start "" "http://localhost:5173"

:DONE

exit