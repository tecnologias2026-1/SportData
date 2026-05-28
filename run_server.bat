@echo off
REM SportData PHP Development Server
REM Launches PHP server with pdo_mysql extension enabled

cd /d "%~dp0"

echo.
echo =========================================
echo  SportData Development Server
echo =========================================
echo.
echo Server starting on http://127.0.0.1:8002
echo Press Ctrl+C to stop the server
echo.

php -d extension_dir="C:\Program Files\PHP\8.5.6\nts\x64\ext" -d extension=pdo_mysql -S 127.0.0.1:8002 -t .

pause
