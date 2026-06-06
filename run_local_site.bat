@echo off
title Local Server - Studio Lore
echo ===================================================
echo   Starting local web server for Studio Lore...
echo   The site will open automatically in your browser.
echo   Press Ctrl+C or close this window to stop.
echo ===================================================
start "" "http://localhost:8000"
cd /d "D:\studio\local_site"
python -m http.server 8000
