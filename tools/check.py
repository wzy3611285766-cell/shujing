# -*- coding: utf-8 -*-
"""一条命令的回归检查：构建 → 与基线比对 → 无头浏览器冒烟。

用法：
  python tools/check.py            日常必跑（差异只报告，不拦截）
  python tools/check.py --strict   差异中出现"代码行"就失败（改动前后对拍用）
  python tools/check.py --nosmoke  只做构建 + 基线比对（快）

「代码行」= 去掉整行注释、空行、行首尾空白之后仍然存在的行。
注释与排版变动不算代码改动；反过来，任何真实逻辑改动都会被抓出来。
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from manifest import BASELINE, PIECES  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")


def norm(text):
    """骨架化：去掉空行、整行注释、注释块（<!-- --> 与 /* */）与行首尾空白。

    只用来做「逻辑有没有被动过」的粗比对：注释怎么写都不影响游戏行为，
    所以骨架一致就基本可以认定这次改动只是注释/排版。
    """
    out = []
    mode = None                      # None / 'html' / 'c'
    for raw in text.split("\n"):
        s = raw.strip()
        if mode == "html":
            if "-->" in s:
                s = s.split("-->", 1)[1].strip()
                mode = None
            else:
                continue
        elif mode == "c":
            if "*/" in s:
                s = s.split("*/", 1)[1].strip()
                mode = None
            else:
                continue
        if not s:
            continue
        if s.startswith("<!--"):
            if "-->" not in s:
                mode = "html"
            continue
        if s.startswith("/*"):
            if "*/" not in s:
                mode = "c"
            continue
        if s.startswith(("//", "*", "<style>", "</style>", "<script>", "</script>")):
            continue
        out.append(s)
    return out


def run(args, **kw):
    return subprocess.run([sys.executable] + args, cwd=ROOT, **kw)


def main():
    strict = "--strict" in sys.argv
    print("=" * 72)
    print("① 构建")
    print("=" * 72)
    r = run([os.path.join(TOOLS, "build.py")])
    if r.returncode != 0:
        return r.returncode

    print()
    print("=" * 72)
    print("② 与拆分前基线比对（%s）" % BASELINE)
    print("=" * 72)
    base_path = os.path.join(ROOT, BASELINE)
    pub_path = os.path.join(ROOT, "shujing-app/index.html")
    if not os.path.exists(base_path):
        print("基线不存在（跳过）：%s" % BASELINE)
        return 0
    ba, bb = open(base_path, "rb").read(), open(pub_path, "rb").read()
    a, b = ba.decode("utf-8"), bb.decode("utf-8")
    if ba == bb:
        print("产物与基线逐字节一致（本次改动为零）")
    else:
        la, lb = norm(a), norm(b)
        sa, sb = set(la), set(lb)
        only_a = [x for x in la if x not in sb]
        only_b = [x for x in lb if x not in sa]
        print("逐字节不同：基线 %d 字节 / 产物 %d 字节（%+d）" % (len(ba), len(bb), len(bb) - len(ba)))
        print("骨架比对：基线独有 %d 行 / 产物独有 %d 行" % (len(only_a), len(only_b)))
        for tag, rows in (("仅基线有", only_a[:8]), ("仅产物有", only_b[:8])):
            for x in rows:
                print("   [%s] %s" % (tag, x[:110]))
            if len(rows) == 8:
                print("   ...（只列前 8 行）")
        if only_a or only_b:
            print("→ 存在骨架差异：确认这些改动就是本次想做的，再追加 CHANGELOG 条目")
            if strict:
                return 1
        else:
            print("→ 骨架零差异：只有注释/排版变了，逻辑未动 ✅")

    if "--nosmoke" in sys.argv:
        return 0
    print()
    print("=" * 72)
    print("③ 无头浏览器冒烟（模块 %d 个）" % len(PIECES))
    print("=" * 72)
    rc = run([os.path.join(TOOLS, "smoke.py"), "--http"]).returncode
    if rc != 0:
        return rc

    # ④ 汇报页的自查（存在就跑，查的是汇报 HTML，不是游戏本体）
    imgcheck = os.path.join(ROOT, "汇报", "_imgcheck.py")
    if os.path.exists(imgcheck):
        print()
        print("=" * 72)
        print("④ 汇报页自查（文字/图片是否都内联，无外链）")
        print("=" * 72)
        run([imgcheck])
    return 0


if __name__ == "__main__":
    sys.exit(main())
