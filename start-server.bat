@echo off
chcp 65001
cls
echo Starting DaysMatter local server...
echo.
echo Open in browser: http://localhost:8080/simple_web_ui_2/operit-daysmatter-shell/
echo.
python -m http.server 8080 --bind 127.0.0.1
