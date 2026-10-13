@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo  把这次改动同步到 GitHub（双击就能用）
echo ============================================================
echo.
python tools\git_sync.py %*
echo.
pause
