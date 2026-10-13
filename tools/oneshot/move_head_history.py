# -*- coding: utf-8 -*-
"""一次性：把 index.html 头部那 260 行版本注释搬到 CHANGELOG.md，头部只留一句指针 + 构建戳。

背景：src/00_head.html 的第 11–272 行全是历史版本注释（v3.3.0 一路倒回 v1.5.14），
      占 30KB 且每次都跟着产物走。搬到 CHANGELOG.md 之后：
        · 产物更干净，头部一眼能看到当前版本（构建戳）
        · 历史和代码分开演进，改日志不用重新发版
只跑一次，保留在此以便追溯本次搬迁。

用法：python tools/oneshot/move_head_history.py
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HEAD = os.path.join(ROOT, "src/00_head.html")
CHANGELOG = os.path.join(ROOT, "CHANGELOG.md")

VER_HEAD = re.compile(r"^<!-- 版本\s+([0-9.]+)（(.+?)）\s*$")
VER_OLD = re.compile(r"^（([0-9.]+)\s*的变更：\s*$")
VER_OLD2 = re.compile(r"^（([0-9.]+)[：:]\s*(.*)$")


def main():
    raw = open(HEAD, "rb").read().decode("utf-8")
    rows = raw.split("\r\n")
    if rows[-1] == "":
        rows = rows[:-1]
    start = next(i for i, r in enumerate(rows) if r.startswith("<!-- 版本 "))
    end = next(i for i, r in enumerate(rows) if i >= start and r.rstrip().endswith("-->"))
    hist = rows[start:end + 1]
    hist[-1] = hist[-1].rstrip()[:-3]          # 去掉收尾的 -->
    print("搬移头部注释：第 %d–%d 行，共 %d 行" % (start + 1, end + 1, len(hist)))

    out = []
    for r in hist:
        t = r.rstrip()
        if t.strip() == "-->":
            continue
        m = VER_HEAD.match(t)
        if m:
            out.append("")
            out.append("## %s · %s" % (m.group(1), m.group(2)))
            continue
        m = VER_OLD.match(t)
        if m:
            out.append("")
            out.append("## %s" % m.group(1))
            continue
        m = VER_OLD2.match(t)
        if m:
            out.append("")
            out.append("## %s · %s" % (m.group(1), m.group(2)))
            continue
        if t.startswith("变更："):
            out.append("- " + t[len("变更："):].lstrip())
            continue
        out.append(t)
    body = "\n".join(out).strip() + "\n"

    new_head = rows[:start] + [
        "<!-- 版本历史已外置：完整记录见根目录 CHANGELOG.md -->",
        "<!-- BUILD_STAMP -->",
    ] + rows[end + 1:]
    open(HEAD, "wb").write(("\r\n".join(new_head) + "\r\n").encode("utf-8"))
    open(CHANGELOG + ".history.part", "w", encoding="utf-8", newline="\n").write(body)
    print("头部注释已搬出 -> CHANGELOG.md.history.part（待合并进 CHANGELOG.md）")


if __name__ == "__main__":
    main()
