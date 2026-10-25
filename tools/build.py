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
import shutil
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


def boot_last_check():
    """「boot 必须最后」断言。

    startGame() 是整个应用的启动执行点，它依赖后置模块（69/70/80…）里定义的
    函数 —— 现在能跑，靠的是顶层 function 声明的提升。谁把启动链上的函数
    改成 const 箭头函数、或把含 startGame() 调用的文件挪出末尾，页面就会
    在加载期白屏。这条断言把约定焊死：含顶层 startGame( 调用的 JS 模块
    必须是 manifest 里最后一个 JS 模块。 """
    js_pieces = [p for p, _s, _e, _n in PIECES if p.endswith(".js")]
    boot_piece = None
    for p in js_pieces:
        txt = open(os.path.join(ROOT, p), "rb").read().decode("utf-8")
        if re.search(r"(?m)^startGame\s*\(", txt):
            if boot_piece:
                raise SystemExit(
                    "启动执行点重复：startGame() 的顶层调用同时出现在 %s 和 %s —— 只允许一处" % (boot_piece, p))
            boot_piece = p
    if boot_piece is None:
        raise SystemExit("找不到启动执行点：没有任何 JS 模块包含顶层的 startGame() 调用")
    if boot_piece != js_pieces[-1]:
        raise SystemExit(
            "启动执行点 %s 必须是最后一个 JS 模块（现在最后是 %s）。\n"
            "  startGame() 依赖后置模块里定义的函数，靠函数提升才能提前跑；\n"
            "  把它挪出末尾等于赌一把没人改写法。要么调整 manifest 顺序，\n"
            "  要么把执行语句移进末尾的启动模块。" % (boot_piece, js_pieces[-1]))


def js_syntax_gate(data):
    """拼接产物的语法闸：语法错误在真机上等于整页白屏。

    有 node：node --check 做真解析，失败即构建失败（硬闸）。
    没有 node：退化为「字符串/模板串/注释/正则剥离后的括号配平」——
    拦得住"漏半个括号"这类最常见的事故；启发式识别正则字面量，
    理论上有误报可能，所以只告警不拦构建，真机级校验仍由 check.py 的
    无头浏览器冒烟兜底。加 --no-syntax-gate 可整体跳过。 """
    if "--no-syntax-gate" in sys.argv:
        return
    # 直接拼 manifest 里的 .js 模块当脚本全文 —— 别从产物里 rfind <script>：
    # 注释文本里可能出现 "<script>" 字样（00_utils.js 头注释就有），会切错位置
    js = b"\r\n".join(
        open(os.path.join(ROOT, p), "rb").read()
        for p, _s, _e, _n in PIECES if p.endswith(".js"))

    node = shutil.which("node")
    if node:
        import subprocess
        import tempfile
        fd, tmp = tempfile.mkstemp(suffix=".js")
        try:
            os.write(fd, js)
            os.close(fd)
            r = subprocess.run([node, "--check", tmp], capture_output=True)
            if r.returncode != 0:
                msg = r.stderr.decode("utf-8", "replace").strip()
                raise SystemExit("语法闸（node --check）不通过：\n%s" % (msg or r.stdout.decode("utf-8", "replace")))
        finally:
            try:
                os.remove(tmp)
            except OSError:
                pass
        return

    # ---- 无 node：括号配平（剥掉字符串 / 模板串 / 注释 / 正则后数括号）----
    js = js.decode("utf-8", "replace")
    PAIRS = {")": "(", "]": "[", "}": "{"}
    OPENERS = {"(", "[", "{"}
    CLOSERS = {")", "]", "}"}
    KEYWORD_BEFORE_REGEX = {"return", "typeof", "case", "in", "of", "new",
                            "delete", "void", "do", "else", "instanceof", "yield", "await"}
    depth = {"(": 0, "[": 0, "{": 0}
    tpl_stack = []                  # 模板串嵌套栈：'tpl' 在串内 / 'expr' 在 ${ } 里
    state = "code"                  # code / line / block / sq / dq / regex / cls / sq_skip / dq_skip
    prev = ""                       # 上一个"代码态"有效字符（判 正则 vs 除号）
    prev_word = ""                  # 上一个标识符（return typeof … 后面跟正则）
    line = 1
    i2 = 0
    n = len(js)
    _steps = 0
    while i2 < n:
        _steps += 1
        if _steps > 3000000:
            print("  ⚠️ 语法闸：扫描超限（i2=%d/%d state=%s line=%d ctx=%r），跳过本次配平"
                  % (i2, n, state, line, js[max(0, i2 - 60):i2 + 60]))
            return
        c = js[i2] if i2 < n else ""
        if c == "\n":
            line += 1
            if state == "line":
                state = "code"
            i2 += 1
            continue
        if state == "code":
            nc = js[i2 + 1] if i2 + 1 < n else ""
            if c == "/" and nc == "/":
                state = "line"
                i2 += 2
                continue
            if c == "/" and nc == "*":
                state = "block"
                i2 += 2
                continue
            if c == "'":
                state = "sq"
                i2 += 1
                continue
            if c == '"':
                state = "dq"
                i2 += 1
                continue
            if c == "`":
                state = "tpl"
                tpl_stack.append("tpl")
                i2 += 1
                continue
            if c == "/":
                # 上一字符是运算符/标点/开头，或上一词是关键字 → 正则；否则是除号
                if prev == "" or prev in "(,=:[!&|?{};+-*%<>~^" or prev_word in KEYWORD_BEFORE_REGEX:
                    state = "regex"
                    i2 += 1
                    continue
            if c in OPENERS:
                depth[c] += 1
            elif c in CLOSERS:
                depth[PAIRS[c]] -= 1
                if depth[PAIRS[c]] < 0:
                    print("  ⚠️ 语法闸（无 node，仅提示）：%d 行附近出现多余的 %r" % (line, c))
                    return
                # ${ } 的右括号：回到外层上下文（${ 记的是自增前的层级，
                # 降回该层级的就是 ${ 自己的 }；对象字面量的 } 到不了这个层级）
                if c == "}" and tpl_stack and tpl_stack[-1][0] == "expr" \
                        and depth["{"] == tpl_stack[-1][1]:
                    tpl_stack.pop()
                    # 内层 ${ } 闭合后仍在某个外层 ${ } 里 → 还是 code；否则回模板串
                    state = "code" if (tpl_stack and tpl_stack[-1][0] == "expr") else "tpl"
            if not c.isspace():
                prev = c
                if c.isalnum() or c in "_$":
                    prev_word = (prev_word + c) if (prev_word and (prev_word[-1].isalnum() or prev_word[-1] in "_$")) else c
                else:
                    prev_word = ""
            i2 += 1
            continue
        if state in ("sq", "dq"):
            if c == "\\":
                state = "sq_skip" if state == "sq" else "dq_skip"
            elif (state == "sq" and c == "'") or (state == "dq" and c == '"'):
                state = "code"
                prev = c
                prev_word = ""
            i2 += 1
            continue
        if state in ("sq_skip", "dq_skip"):
            state = "sq" if state == "sq_skip" else "dq"
            i2 += 1
            continue
        if state == "line":
            i2 += 1
            continue
        if state == "block":
            if c == "*" and i2 + 1 < n and js[i2 + 1] == "/":
                state = "code"
                i2 += 2
                continue
            i2 += 1
            continue
        if state == "tpl":
            if c == "\\":
                i2 += 2                  # 跳过转义对
                continue
            if c == "`":
                if tpl_stack:
                    tpl_stack.pop()      # 弹掉本层模板；栈顶若还是 expr，说明它嵌在 ${ } 里
                state = "code"
                i2 += 1
                continue
            if c == "$" and i2 + 1 < n and js[i2 + 1] == "{":
                tpl_stack.append(("expr", depth["{"]))   # 记 ${ 之前的 { 层级
                depth["{"] += 1
                state = "code"
                prev = "{"
                i2 += 2
                continue
            i2 += 1
            continue
        if state == "regex":
            if c == "\\":
                i2 += 2
                continue
            if c == "[":
                state = "cls"
                i2 += 1
                continue
            if c == "/":
                state = "code"
                prev = "/"
                prev_word = ""
                i2 += 1
                continue
            i2 += 1
            continue
        if state == "cls":
            if c == "\\":
                i2 += 2
                continue
            if c == "]":
                state = "regex"
            i2 += 1
            continue
    # 模板串里的 ${ 已按普通括号计数：出 ${ 时 +1，配对的 } 会在 code 态 -1
    if any(depth.values()):
        print("  ⚠️ 语法闸（无 node，仅提示）：括号不配平 ( %+d [ %+d { %+d —— 请人工核对；真机级校验由 check.py 冒烟兜底"
              % (depth["("], depth["["], depth["{"]))


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

    # 结构断言与语法闸：把"启动执行点必须在最后"焊死，把"括号没闭合"拦在构建期
    boot_last_check()
    js_syntax_gate(raw)

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
