# -*- coding: utf-8 -*-
"""构建：按 manifest 顺序把 src/ 下的模块拼成单文件网页应用。

产物：
  shujing-app/index.html     —— 依旧「一个文件就是 App」，双击/上传即可用
  shujing-app/version.json   —— 给「更新推送」用：部署后玩家那边能对出自己是不是旧版

构建时会做三件注入：
  · <!-- BUILD_STAMP --> → 真实构建戳（版本 / 时间 / 源码摘要）
  · __BUILD_VER__        → 真实版本号（供 src/js/73_version.js 做版本自检）
  · 公告标记区 + __NEWS_VER__ → 由 news.json 渲染的公告卡与"已读位"（tools/news.py）

公告那一条是 2026-10-15 加的：公告内容与 NEWS_VER 现在同源，
改了内容一定重弹，不会再出现"公告改了、老玩家看不到"的老坑。

用法：
  python tools/build.py            构建并写入产物
  python tools/build.py --dry      只校验，不写文件
  python tools/build.py --quiet    少说两句（给 release.py 调用）
"""
import datetime
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import news  # noqa: E402
from manifest import PIECES, PUBLISH  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION_FILE = os.path.join(ROOT, "version.json")
STAMP_TOKEN = b"<!-- BUILD_STAMP -->"
VER_TOKEN = b"__BUILD_VER__"
NEWS_TOKEN = b"__NEWS_VER__"


def read_version():
    j = json.load(open(VERSION_FILE, encoding="utf-8"))
    return j


def concat():
    """返回 (模块字节, 源码摘要)。"""
    out = bytearray()
    for path, _s, _e, _n in PIECES:
        full = os.path.join(ROOT, path)
        if not os.path.exists(full):
            raise SystemExit("缺少模块文件：%s" % path)
        data = open(full, "rb").read()
        if not data.endswith(b"\r\n"):
            raise SystemExit("模块文件必须以 CRLF 结尾：%s" % path)
        out += data
    return bytes(out), hashlib.sha256(bytes(out)).hexdigest()


def news_meta(data):
    """公告区块的摘要 + NEWS_VER。

    用途：发版时判断"公告内容改没改"。改了内容却没升 NEWS_VER，
    老玩家那边就永远看不到这条公告（历史上踩过一次「v173 一直没升」）。
    摘要只取 #news 那一段，改别的地方不会误报。
    """
    i = data.find(b'<div id="news"')
    j = data.find(b'id="newsOk"')
    block = data[i:j + 60] if (i >= 0 and j > i) else b""
    m = re.search(rb"NEWS_VER\s*=\s*'([^']+)'", data)
    return hashlib.sha256(block).hexdigest(), (m.group(1).decode("utf-8") if m else "")


def main():
    quiet = "--quiet" in sys.argv
    meta = read_version()
    ver = meta["version"]
    raw, src_sha = concat()

    built_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    stamp = ("<!-- build: v%s · %s · 源码摘要 %s · %d 个模块 -->"
             % (ver, built_at, src_sha[:8], len(PIECES))).encode("utf-8")

    if STAMP_TOKEN not in raw:
        raise SystemExit("源码里找不到 %s，无法注入构建戳" % STAMP_TOKEN.decode())
    if VER_TOKEN not in raw:
        raise SystemExit("源码里找不到 %s，无法注入版本号" % VER_TOKEN.decode())

    # 公告：news.json 里最新一条 → 卡片 HTML + NEWS_VER（内容摘要），一起注入
    raw, card = news.inject(raw)
    news_ver = news.ver_token(news.latest(), card)
    if NEWS_TOKEN not in raw:
        raise SystemExit("源码里找不到 %s，无法注入公告已读位" % NEWS_TOKEN.decode())

    data = (raw.replace(STAMP_TOKEN, stamp)
               .replace(VER_TOKEN, ver.encode("utf-8"))
               .replace(NEWS_TOKEN, news_ver.encode("utf-8")))
    digest = hashlib.sha256(data).hexdigest()

    if "--dry" in sys.argv:
        print("dry-run: %d 字节 / %d 个模块 / v%s / sha256 %s"
              % (len(data), len(PIECES), ver, digest[:16]))
        return

    dst = os.path.join(ROOT, PUBLISH)
    old = open(dst, "rb").read() if os.path.exists(dst) else b""
    open(dst, "wb").write(data)

    news_hash, news_ver = news_meta(data)
    # 「本次更新要点」也写进 version.json：旧版客户端顶部那条通知栏直接读它，
    # 不用等下完新文件就知道新版改了什么（tools/news.py summary()）。
    vj = {
        "name": meta.get("name", ""),
        "version": ver,
        "released": meta.get("released", ""),
        "file": "index.html",
        "src_sha256": src_sha,
        "bytes": len(data),
        "sha256": digest,
        "built_at": built_at,
        "news_ver": news_ver,
        "news_hash": news_hash,
    }
    vj.update(news.summary(news.latest()))
    open(os.path.join(os.path.dirname(dst), "version.json"), "w", encoding="utf-8", newline="\n").write(
        json.dumps(vj, ensure_ascii=False, indent=2) + "\n")

    # 根目录那份也把公告两项同步上：它记的是"上一次构建时的公告"，
    # 发版脚本据此判断这次公告到底变没变（内容 hash 一变，玩家那边就会重弹）。
    meta["news_ver"], meta["news_hash"] = news_ver, news_hash
    open(VERSION_FILE, "w", encoding="utf-8", newline="\n").write(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n")

    if not quiet:
        print("已构建 %s" % PUBLISH)
        print("  版本 v%s · 模块 %d 个 · %d 字节 (%.2f MB) · sha256 %s"
              % (ver, len(PIECES), len(data), len(data) / 1048576.0, digest[:16]))
        print("  公告 v%s · NEWS_VER %s（内容摘要，改公告就会变）"
              % (news.latest().get("version"), news_ver))
        print("  同时写出 shujing-app/version.json（含 news_title / news_items）")
        if old == data:
            print("  与构建前内容一致（本次没有任何改动）")
        else:
            print("  与构建前不同：%+d 字节" % (len(data) - len(old)))


if __name__ == "__main__":
    main()
