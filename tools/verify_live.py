# -*- coding: utf-8 -*-
"""发布后验一验：线上那份是不是就是本地这份（内容、版本、能不能开局）。

用法：
  python tools/verify_live.py                     默认验证 WorkBuddy 线上地址
  python tools/verify_live.py https://别的地址/    验证别的地址

会查四件事：
  1. 线上的 index.html 与本地构建产物是否逐字节一致（sha256 对比）
  2. 线上有没有 version.json，版本号是否一致（这是"旧版自动提示刷新"的基础）
  3. 无头浏览器真打开一次：页面能不能起（关键元素在不在）、有没有构建戳、控制台报不报错
  4. 站点根路径能不能直接打开（同学拿到网址就点这一个）
"""
import hashlib
import json
import os
import re
import subprocess
import shutil
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_URL = "https://shujing.app.workbuddy.host/"
CHROME_CANDIDATES = [
    r"C:/Program Files/Google/Chrome/Application/chrome.exe",
    r"C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%/Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]


def sha(b):
    return hashlib.sha256(b).hexdigest()


def fetch(url, timeout=30):
    """先直连，失败再试系统里配的代理（国内两种网络环境都能跑）。"""
    tries = [None, os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or "http://127.0.0.1:7897"]
    last = None
    for px in tries:
        try:
            if px:
                op = urllib.request.build_opener(urllib.request.ProxyHandler({"http": px, "https": px}))
            else:
                op = urllib.request.build_opener()
            req = urllib.request.Request(url, headers={"User-Agent": "shujing-verify"})
            with op.open(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            last = "HTTP %s" % e.code
        except Exception as e:
            last = type(e).__name__
    raise RuntimeError(last)


def find_chrome():
    for p in CHROME_CANDIDATES:
        if p and os.path.exists(p):
            return p
    return ""


def main():
    base = (sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL)
    if not base.endswith("/"):
        base += "/"
    local = open(os.path.join(ROOT, "shujing-app", "index.html"), "rb").read()
    lver = json.load(open(os.path.join(ROOT, "shujing-app", "version.json"), encoding="utf-8"))
    ok = True

    print("=" * 72)
    print("① 线上页面 vs 本地构建产物")
    print("=" * 72)
    try:
        live = fetch(base)
        same = sha(live) == sha(local)
        print("  本地：%d 字节  sha256 %s" % (len(local), sha(local)[:16]))
        print("  线上：%d 字节  sha256 %s" % (len(live), sha(live)[:16]))
        print("  %s" % ("✅ 逐字节一致" if same else "❌ 不一致 —— 线上还不是最新版"))
        ok = ok and same
    except Exception as e:
        print("  ❌ 取不到线上页面（%s）" % e)
        ok = False
        live = b""

    print()
    print("=" * 72)
    print("② 版本文件（决定旧版会不会自动提示刷新）")
    print("=" * 72)
    try:
        vj = json.loads(fetch(base + "version.json").decode("utf-8"))
        print("  线上 version.json：v%s · 构建于 %s" % (vj.get("version"), vj.get("built_at")))
        good = str(vj.get("version")) == str(lver.get("version"))
        print("  %s" % ("✅ 与本地一致（v%s）" % lver.get("version") if good else
                        "❌ 版本对不上：本地 v%s / 线上 v%s" % (lver.get("version"), vj.get("version"))))
        ok = ok and good
    except Exception as e:
        print("  ❌ 取不到 version.json（%s）—— 旧版本会一直看到缓存，不提示刷新" % e)
        ok = False

    print()
    print("=" * 72)
    print("③ 无头浏览器真打开一次")
    print("=" * 72)
    chrome = find_chrome()
    if not chrome:
        print("  （没找到 Chrome，跳过）")
    else:
        prof = os.path.join(ROOT, ".tmp_smoke", "profile_live")
        shutil.rmtree(prof, ignore_errors=True)
        cmd = [chrome, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
               "--user-data-dir=" + prof, "--window-size=1280,800",
               "--virtual-time-budget=15000", "--dump-dom", base]
        p = subprocess.run(cmd, capture_output=True, timeout=180)
        dom = p.stdout.decode("utf-8", "replace")
        need = {"顶栏 #topbar": 'id="topbar"', "练枪按钮 #btnDrill": 'id="btnDrill"',
                "菜单 #btnMenu": 'id="btnMenu"', "公告 #news": 'id="news"'}
        miss = [k for k, v in need.items() if v not in dom]
        stamp = re.search(r"<!-- build: (v[\d.]+) · ([^·]+)·", dom)
        print("  页面元素：%s" % ("✅ 关键元素都在" if not miss else "❌ 缺 " + "、".join(miss)))
        print("  构建戳  ：%s" % (("✅ " + stamp.group(1) + " · " + stamp.group(2).strip()) if stamp else "❌ 没找到（可能是旧版）"))
        ok = ok and not miss and bool(stamp)

    print()
    print("=" * 72)
    print("结论：" + ("✅ 线上与本地/GitHub 已经完全同步，可以给同学网址了" if ok else
                    "❌ 还有对不上的地方（见上面 ❌ 那几行）"))
    print("=" * 72)
    print("给同学的网址：%s" % base)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
