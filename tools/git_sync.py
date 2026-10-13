# -*- coding: utf-8 -*-
"""一键同步到 GitHub：把本地改动提交并推上去。

给不熟悉命令行的用法（Windows 直接双击根目录的「同步到GitHub.cmd」）：
  1. 第一次运行会让你填「名字」和「邮箱」—— 只写进这个仓库（git config --local），
     不会动你电脑上的全局设置。名字随便起，邮箱建议用注册 GitHub 的那个。
  2. 之后每次运行：自动提交所有改动并推送。
  3. 还没建远程仓库时，它会告诉你接下来在 GitHub 上点哪几下、复制哪条命令。

命令行用法：
  python tools/git_sync.py                    用自动生成的说明提交
  python tools/git_sync.py --msg "改了练枪入口"
  python tools/git_sync.py --remote https://github.com/你的用户名/shujing169.git
"""
import datetime
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def git(*args, **kw):
    """跑一条 git 命令，返回 (退出码, 输出)。"""
    p = subprocess.run(["git"] + list(args), cwd=ROOT, capture_output=True, **kw)
    out = (p.stdout or b"").decode("utf-8", "replace") + (p.stderr or b"").decode("utf-8", "replace")
    return p.returncode, out.strip()


def ask(prompt, default=""):
    try:
        v = input(prompt).strip()
    except EOFError:
        v = ""
    return v or default


def local_identity():
    _, name = git("config", "--local", "user.name")
    _, mail = git("config", "--local", "user.email")
    return name.strip(), mail.strip()


def ensure_identity():
    name, mail = local_identity()
    if name and mail:
        return name, mail
    print("第一次同步，需要告诉 git「你是谁」（只写进这个仓库，不影响你电脑的其它设置）。")
    print("名字随便起；邮箱建议用你注册 GitHub 的那个。")
    name = ask("  名字：", "数境169")
    mail = ask("  邮箱：", "")
    if not mail:
        print("没填邮箱，先不提交。想好了再运行一次即可。")
        sys.exit(1)
    git("config", "--local", "user.name", name)
    git("config", "--local", "user.email", mail)
    print("记下了：%s <%s>" % (name, mail))
    return name, mail


def default_msg():
    """默认提交说明：用 CHANGELOG 最新那条 + 当前时间。"""
    ver = ""
    try:
        ver = json.load(open(os.path.join(ROOT, "version.json"), encoding="utf-8"))["version"]
        ver = "v" + ver + " "
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

    ensure_identity()

    # 远程仓库：给了就配，没配就提示怎么配
    code, remotes = git("remote")
    if "--remote" in argv:
        url = argv[argv.index("--remote") + 1]
        if remotes:
            git("remote", "set-url", "origin", url)
        else:
            git("remote", "add", "origin", url)
        print("远程仓库已设为：%s" % url)
        code, remotes = git("remote")

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

        msg = default_msg()
        if "--msg" in argv:
            msg = argv[argv.index("--msg") + 1]
        print()
        print("=" * 60)
        print("② 提交")
        print("=" * 60)
        code, out = git("commit", "-m", msg)
        print(out.split("\n")[0] if out else "")
        if code != 0:
            print("提交失败，把上面这几行发给我看看。")
            sys.exit(code)

    if not remotes:
        print()
        print("=" * 60)
        print("③ 还没连远程仓库 —— 去 GitHub 点三下就好")
        print("=" * 60)
        print("  1. 打开 github.com，右上角 + → New repository")
        print("  2. 名字填 shujing169，选 Private，点 Create repository")
        print("  3. 建好后页面上会显示一串地址（https://github.com/你的用户名/shujing169.git）")
        print("     把它复制下来，然后运行：")
        print()
        print("     python tools/git_sync.py --remote 刚才复制的地址")
        print()
        print("  （第一次推送会弹一个登录窗口，按提示在浏览器里点同意即可。）")
        return

    print()
    print("=" * 60)
    print("③ 推送到 GitHub")
    print("=" * 60)
    _, branch = git("rev-parse", "--abbrev-ref", "HEAD")
    code, out = git("push", "-u", "origin", branch)
    print(out if out else "（没有输出）")
    if code == 0:
        print()
        print("✅ 同步完成。以后改完东西，双击「同步到GitHub.cmd」就行。")
    else:
        print()
        print("❌ 推送没成功。常见原因：还没登录 GitHub（在浏览器里完成一次登录再试）、"
              "或者这个仓库地址不对。")


if __name__ == "__main__":
    main()
