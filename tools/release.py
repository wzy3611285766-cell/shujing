# -*- coding: utf-8 -*-
"""发版：一条命令走完「升版本 → 构建 → 回归 → 归档 → 写日志」。

用法：
  python tools/release.py patch --note "修了烽火撤离后 HUD 不刷新的问题"
  python tools/release.py minor
  python tools/release.py major
  python tools/release.py --no-bump        # 版本号不动，只重新出包

做完之后你会拿到：
  shujing-app/index.html        上线文件
  shujing-app/version.json      上线文件（和 index.html 放在同一目录）
  releases/数境169_v<版本>_<日期>.html   归档，出问题直接拿它覆盖回去
  CHANGELOG.md                  自动追加本次条目

回归不通过时：版本号会回滚，产物不归档，退出码非零 —— 不会把坏版本推出去。
"""
import datetime
import json
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from manifest import PUBLISH  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION_FILE = os.path.join(ROOT, "version.json")
CHANGELOG = os.path.join(ROOT, "CHANGELOG.md")
MARKER = "<!-- NEW-ENTRY-HERE -->"


def bump(ver, kind):
    major, minor, patch = (int(x) for x in ver.split("."))
    if kind == "major":
        major, minor, patch = major + 1, 0, 0
    elif kind == "minor":
        minor, patch = minor + 1, 0
    else:
        patch += 1
    return "%d.%d.%d" % (major, minor, patch)


def note_of(argv):
    if "--note" in argv:
        return argv[argv.index("--note") + 1]
    return "（未写说明：发版时用 --note 补一句改了什么）"


def main():
    argv = sys.argv[1:]
    kind = next((a for a in argv if a in ("patch", "minor", "major")), None)
    meta = json.load(open(VERSION_FILE, encoding="utf-8"))
    prev_news = (meta.get("news_hash"), meta.get("news_ver"))
    old_ver = meta["version"]
    new_ver = old_ver if ("--no-bump" in argv or not kind) else bump(old_ver, kind)
    today = datetime.date.today().strftime("%Y-%m-%d")

    print("=" * 72)
    print("① 版本：%s → %s（%s）" % (old_ver, new_ver, today))
    print("=" * 72)
    meta["version"] = new_ver
    meta["released"] = today
    open(VERSION_FILE, "w", encoding="utf-8", newline="\n").write(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n")

    print()
    print("=" * 72)
    print("② 回归：构建 → 与基线比对 → 无头浏览器冒烟")
    print("=" * 72)
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "check.py")], cwd=ROOT)
    if r.returncode != 0:
        meta["version"] = old_ver
        open(VERSION_FILE, "w", encoding="utf-8", newline="\n").write(
            json.dumps(meta, ensure_ascii=False, indent=2) + "\n")
        # 产物也要退回旧版本号：否则磁盘上会留一个"没发过的 vX.Y.Z"，和你上传的文件对不上
        subprocess.run([sys.executable, os.path.join(ROOT, "tools", "build.py"), "--quiet"], cwd=ROOT)
        print("\n❌ 回归没通过，版本号已回滚到 v%s，产物也重新按 v%s 构建；没有归档、没有写日志。"
              % (old_ver, old_ver))
        return 1

    print()
    print("=" * 72)
    print("③ 归档 + 写日志")
    print("=" * 72)

    # 公告：已读位现在由构建期按公告内容自动生成（tools/news.py），
    # "改了公告忘升 NEWS_VER、老玩家看不到"那个老坑从机制上没了，
    # 所以这里不再告警，只把这次公告到底变没变说清楚。
    new_meta = json.load(open(os.path.join(ROOT, "shujing-app", "version.json"), encoding="utf-8"))
    nv, nh = new_meta.get("news_ver", ""), new_meta.get("news_hash", "")
    if nh != prev_news[0]:
        print("公告已更新：%s → %s（玩家下次打开会重新看到这条）" % (prev_news[1] or "（无）", nv))
    else:
        print("公告未变：%s（玩家不会重复看到同一条）" % nv)
    meta["news_ver"], meta["news_hash"] = nv, nh
    open(VERSION_FILE, "w", encoding="utf-8", newline="\n").write(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n")

    rel_dir = os.path.join(ROOT, "releases")
    os.makedirs(rel_dir, exist_ok=True)
    arch = os.path.join(rel_dir, "数境169_v%s_%s.html" % (new_ver, today))
    shutil.copy2(os.path.join(ROOT, PUBLISH), arch)
    print("归档 -> releases/%s" % os.path.basename(arch))

    entry = "\n## %s · %s\n\n- %s\n" % (new_ver, today, note_of(argv))
    txt = open(CHANGELOG, encoding="utf-8").read()
    if MARKER in txt:
        txt = txt.replace(MARKER, MARKER + entry, 1)
    else:
        txt = txt.replace("\n## ", "\n" + entry + "\n## ", 1)
    open(CHANGELOG, "w", encoding="utf-8", newline="\n").write(txt)
    print("CHANGELOG.md 已追加 v%s 条目" % new_ver)

    data = open(os.path.join(ROOT, PUBLISH), "rb").read()
    print()
    print("=" * 72)
    print("④ 上线（把这两个文件放到同一个目录，覆盖旧的即可）")
    print("=" * 72)
    print("  shujing-app/index.html      %.2f MB" % (len(data) / 1048576.0))
    print("  shujing-app/version.json    版本 %s" % new_ver)
    print("  玩家那边：下次打开会自动发现新版并提示刷新（顶部还会列出本次更新要点）；")
    print("            旧存档（本机存档 / 存档码）不受影响。")
    print("  要发公告：在 news.json 的 entries 最上面加一条（版本 / 标题 / 要点），")
    print("            再跑一次本命令即可 —— 公告内容和 NEWS_VER 都是构建期自动生成的，")
    print("            不用（也不该）再去改 55_boot_news.js 里的常量。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
