# 在「桌面」和「开始菜单」各放一个「同步到 GitHub」的快捷方式（带自绘图标）。
# 想重建 / 改名，直接再运行一次：powershell -ExecutionPolicy Bypass -File tools\make_shortcut.ps1
#
# 名字故意用一个排序靠前的符号开头，桌面上会排在前面好找；
# 开始菜单里也有了，按 Win 键搜「同步」就能直接回车打开。

$ErrorActionPreference = 'Stop'
$root   = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$cmd    = Join-Path $root '同步到GitHub.cmd'
$icon   = Join-Path $root 'tools\assets\sync.ico'
$name   = '★ 同步到GitHub'

if (-not (Test-Path $cmd))  { throw "找不到 $cmd" }
if (-not (Test-Path $icon)) { throw "找不到图标 $icon（先运行 python tools/make_icon.py）" }

$targets = @(
    [Environment]::GetFolderPath('Desktop'),
    [Environment]::GetFolderPath('Programs')
)

$shell = New-Object -ComObject WScript.Shell
foreach ($dir in $targets) {
    if (-not (Test-Path $dir)) { continue }
    $lnk = Join-Path $dir ($name + '.lnk')
    $sc = $shell.CreateShortcut($lnk)
    $sc.TargetPath       = "$env:SystemRoot\System32\cmd.exe"
    $sc.Arguments        = '/c ""' + $cmd + '""'
    $sc.WorkingDirectory = $root
    $sc.IconLocation     = $icon + ',0'
    $sc.Description      = '把数境169的最新改动提交并推送到 GitHub'
    $sc.Save()
    Write-Host "已创建：$lnk"
}

# 顺便把手边的 cmd 文件也在开始菜单留一份（怕快捷方式被误删）
$lnkBak = Join-Path ([Environment]::GetFolderPath('Programs')) '同步到GitHub（命令行原文件）.lnk'
$sc = $shell.CreateShortcut($lnkBak)
$sc.TargetPath       = $cmd
$sc.WorkingDirectory = $root
$sc.IconLocation     = $icon + ',0'
$sc.Description      = '直接运行同步脚本（和上个快捷方式等价）'
$sc.Save()
Write-Host "已创建：$lnkBak"
Write-Host ''
Write-Host '完成。桌面上找「★ 同步到GitHub」；开始菜单按 Win 键搜「同步」同样能找到。'
