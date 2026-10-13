# 在「桌面」和「开始菜单」放两个快捷方式（都带自绘图标）：
#   ① ★ 同步到GitHub       —— 提交 + 推送到 GitHub
#   ② ★ 一键发布上线（数境） —— 重建 + 回归 + 推 GitHub + 检查线上 + 把 IDE 切到最前
# 想重建 / 改名，直接再运行一次：
#   powershell -ExecutionPolicy Bypass -File tools\make_shortcut.ps1
#
# 名字用 ★ 开头：桌面按名称排序时排在前面，不容易被别的文件盖住。

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$items = @(
    @{ name = '★ 同步到GitHub';        cmd = '同步到GitHub.cmd';   icon = 'tools\assets\sync.ico';
       desc = '把数境169的最新改动提交并推送到 GitHub' },
    @{ name = '★ 一键发布上线（数境）'; cmd = '一键发布上线.cmd';   icon = 'tools\assets\publish.ico';
       desc = '重建 + 回归 + 推 GitHub + 检查线上，最后提示在 IDE 里点发布' }
)

$targets = @(
    [Environment]::GetFolderPath('Desktop'),
    [Environment]::GetFolderPath('Programs')
)

$shell = New-Object -ComObject WScript.Shell
foreach ($it in $items) {
    $cmd  = Join-Path $root $it.cmd
    $icon = Join-Path $root $it.icon
    if (-not (Test-Path $cmd))  { throw "找不到 $cmd" }
    if (-not (Test-Path $icon)) { throw "找不到图标 $icon（先运行 python tools/make_icon.py）" }
    foreach ($dir in $targets) {
        if (-not (Test-Path $dir)) { continue }
        $lnk = Join-Path $dir ($it.name + '.lnk')
        $sc = $shell.CreateShortcut($lnk)
        $sc.TargetPath       = "$env:SystemRoot\System32\cmd.exe"
        $sc.Arguments        = '/c ""' + $cmd + '""'
        $sc.WorkingDirectory = $root
        $sc.IconLocation     = $icon + ',0'
        $sc.Description      = $it.desc
        $sc.Save()
        Write-Host "已创建：$lnk"
    }
}

# 开始菜单再留一份"命令行原文件"版本（怕快捷方式被误删时还能跑）
foreach ($it in $items) {
    $lnkv = Join-Path ([Environment]::GetFolderPath('Programs')) ($it.name + '（原文件）.lnk')
    $sc = $shell.CreateShortcut($lnkv)
    $sc.TargetPath       = Join-Path $root $it.cmd
    $sc.WorkingDirectory = $root
    $sc.IconLocation     = (Join-Path $root $it.icon) + ',0'
    $sc.Description      = $it.desc + '（直接运行 cmd 文件）'
    $sc.Save()
    Write-Host "已创建：$lnkv"
}

Write-Host ''
Write-Host '完成。桌面 / 开始菜单里搜「同步」或「发布」都能找到。'
