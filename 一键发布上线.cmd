@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo   数境169 · 一键发布上线（除最后一下点击，全部自动）
echo ============================================================
echo.
echo [1/4] 从源码重新构建...
python tools\build.py
echo.
echo [2/4] 跑回归（构建 + 与基线比对 + 真浏览器冒烟）...
python tools\check.py
echo.
echo [3/4] 同步到 GitHub...
python tools\git_sync.py
echo.
echo [4/4] 检查线上应用是不是最新版...
python tools\verify_live.py
echo.
echo ============================================================
echo   如果上面第 4 步显示 ❌（线上还不是最新版），就还差最后一下：
echo.
echo   1. 我现在帮你把 IDE 窗口切到最前
echo   2. 在对话框里找那张带按钮的卡片（写着 部署 / 连接 / 发布）
echo      找不到就按 Ctrl+Shift+P，输入：发布
echo   3. 点完之后，再双击一次本按钮 —— 第 4 步变绿就成功了
echo ============================================================
echo.
echo 正在把 IDE 窗口切到最前...
start "" "%LOCALAPPDATA%\Programs\CodeBuddy CN\bin\buddycn.cmd" -r "%~dp0."
echo.
pause
