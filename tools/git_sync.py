# -*- coding: utf-8 -*-
"""一键同步到 GitHub：把本地改动提交并推上去。

给不熟悉命令行的用法（Windows 直接双击根目录的「同步到GitHub.cmd」）：
  1. 第一次运行会让你填「名字」和「邮箱」—— 只写进这个仓库（git config --local），
     不会动你电脑上的全局设置。名字随便起，邮箱建议用注册 GitHub 的那个。
  2. 之后每次运行：自动提交所有改动并推送。
  3. 网络说明：国内直连 github.com 经常被重置。脚本会自动检测你系统里开着的代理
     （Windows 的「Internet 选项 → 连接 → 局域网设置」），开着就走它，不需要你手动配。

命令行用法：
  python tools/git_sync.py                      用自动生成的说明提交
  python tools/git_sync.py --msg "改了练枪入口"
  python tools/git_sync.py --remote <仓库地址>    接上 / 更换远程仓库
  python tools/git_sync.py --name 张三 --email a@b.com   非交互地设置身份（只写本仓库）
"""
import datetime
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def system_proxy():
    """返回系统代理地址（没有就返回空）。"""
    for k in ("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"):
        if os.environ.get(k):
            return os.environ[k]
    if os.name != "nt":
        return ""
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                             r"Software\Microsoft\Windows\CurrentVersion\Internet Settings")
        enabled = winreg.QueryValueEx(key, "ProxyEnable")[0]
        server = winreg.QueryValueEx(key, "ProxyServer")[0]
        if enabled and server:
            return server if server.startswith("http") else "http://" + server
    except Exception:
        pass
    return ""


def git(*args, net=False, **kw):
    """跑一条 git 命令，返回 (退出码, 输出)。net=True 时带上代理设置。"""
    cmd = ["git"]
    if net:
        px = system_proxy()
        if px:
            cmd += ["-c", "http.proxy=" + px, "-c", "https.proxy=" + px]
    p = subprocess.run(cmd + list(args), cwd=ROOT, capture_output=True, **kw)
    out = (p.stdout or b"").decode("utf-8", "replace") + (p.stderr or b"").decode("utf-8", "replace")
    return p.returncode, out.strip()


def ask(prompt, default=""):
    try:
        v = input(prompt).strip()
    except EOFError:
        v = ""
    return v or default


def git_net(*args):
    """联网操作：先按系统代理试，不通就改用直连再试一次。

    国内这两种情况都会遇到：代理软件没开（系统里却还留着代理设置）、
    或者直连被重置。谁通走谁，别让玩家去猜。
    """
    code, out = git(*args, net=True)
    if code == 0:
        return code, out
    if system_proxy():
        print("（按代理没连上，改用直连再试一次…）")
    code2, out2 = git(*args, net=False)
    return (code2, out2) if code2 == 0 else (code, out)


def ensure_identity(argv):
    _, name = git("config", "--local", "user.name")
    _, mail = git("config", "--local", "user.email")
    name, mail = name.strip(), mail.strip()
    if name and mail:
        return name, mail
    if "--name" in argv and "--email" in argv:
        name = argv[argv.index("--name") + 1]
        mail = argv[argv.index("--email") + 1]
    else:
        print("第一次同步，需要告诉 git「你是谁」（只写进这个仓库，不影响你电脑的其它设置）。")
        print("名字随便起；邮箱建议用你注册 GitHub 的那个。")
        name = name or ask("  名字：", "wzy3611285766-cell")
        mail = mail or ask("  邮箱：", "")
    if not name or not mail:
        print("没填全，先不提交。想好了再运行一次即可。")
        sys.exit(1)
    git("config", "--local", "user.name", name)
    git("config", "--local", "user.email", mail)
    print("记下了：%s <%s>" % (name, mail))
    return name, mail


def default_msg():
    """默认提交说明：版本号 + CHANGELOG 最新那条 + 当前时间。"""
    ver = ""
    try:
        ver = "v" + json.load(open(os.path.join(ROOT, "version.json"), encoding="utf-8"))["version"] + " "
    except Exception:
        pass
    title = ""
    try:
        txt = open(os.path.join(ROOT, "CHANGELOG.md"), encoding="utf-8").read()
        m = re.search(r"^## (\d+\.\d+\.\d+)[^\n]*\n\n- (.+)$", txt, re.M)
        if m:
            title = m.group(2).strip()[:60]
    except Exception:
        pass
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    return (ver + (title or "同步") + " (" + stamp + ")").strip()


def main():
    argv = sys.argv[1:]
    if git("rev-parse", "--is-inside-work-tree")[0] != 0:
        print("这里还不是 git 仓库。在工作区根目录跑：git init -b main")
        sys.exit(1)

    ensure_identity(argv)

    code, remotes = git("remote")
    if "--remote" in argv:
        url = argv[argv.index("--remote") + 1]
        if "origin" in remotes.split():
            git("remote", "set-url", "origin", url)
        else:
            git("remote", "add", "origin", url)
        print("远程仓库已设为：%s" % url)
        code, remotes = git("remote")

    px = system_proxy()
    if px:
        print("（检测到系统代理 %s，联网走它）" % px)

    print("=" * 60)
    print("① 收集改动")
    print("=" * 60)
    git("add", "-A")
    _, status = git("status", "--short")
    if not status:
        print("本地没有任何改动，无需提交。")
    else:
        files = [l for l in status.split("\n") if l.strip()]
        print("  有 %d 处改动（新增 / 修改 / 删除）" % len(files))
        for l in files[:12]:
            print("   ", l)
        if len(files) > 12:
            print("    ...（还有 %d 处）" % (len(files) - 12))

        msg = argv[argv.index("--msg") + 1] if "--msg" in argv else default_msg()
        print()
        print("=" * 60)
        print("② 提交")
        print("=" * 60)
        code, out = git("commit", "-m", msg)
        print(out.split("\n")[0] if out else "")
        if code != 0:
            print("提交失败，把上面这几行发给我看看。")
            sys.exit(code)

    if "origin" not in remotes.split():
        print()
        print("=" * 60)
        print("③ 还没连远程仓库 —— 去 GitHub 点三下就好")
        print("=" * 60)
        print("  1. 打开 github.com，右上角 + → New repository")
        print("  2. 名字填 shujing，选 Private，点 Create repository")
        print("  3. 建好后页面上会显示一串地址（https://github.com/你的用户名/shujing.git）")
        print("     把它复制下来，然后运行：")
        print()
        print("     python tools/git_sync.py --remote 刚才复制的地址")
        return

    print()
    print("=" * 60)
    print("③ 推送到 GitHub")
    print("=" * 60)
    _, branch = git("rev-parse", "--abbrev-ref", "HEAD")
    code, out = git_net("push", "-u", "origin", branch)
    print(out if out else "（没有输出）")
    if code == 0:
        print()
        print("✅ 同步完成。以后改完东西，双击「同步到GitHub.cmd」就行。")
    else:
        low = out.lower()
        if "timed out" in low or "connection was reset" in low or "could not resolve" in low \
                or "could not connect" in low or "failed to connect" in low:
            print()
            print("❌ 现在直连和代理都连不上 GitHub。")
            print("   常见情况：代理软件关着（或者刚换了端口）。")
            print("   ⚠️ 本地已经提交好了，改动不会丢 —— 把代理软件打开，再双击一次即可。")
        elif "authentication" in low or "403" in low or "could not read username" in low:
            print()
            print("❌ 需要先登录 GitHub：会弹一个登录窗口，在浏览器里点同意即可（只需要一次）。")
        else:
            print()
            print("❌ 推送没成功，把上面几行发给我看看。")


if __name__ == "__main__":
    main()
