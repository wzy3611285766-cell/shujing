# -*- coding: utf-8 -*-
"""静态分析：把"屎山"里那几样能**量出来**的东西数清楚。

为什么要有它
------------
这个工程的模块是按顺序拼成一个 `<script>` 的，于是有一个很隐蔽的坑：
**同名函数后声明的会静默覆盖前面的**。写代码的人改了 `37_hud.js` 里的
`updateHUD`，跑起来一点变化都没有 —— 真正生效的是 `57_multination.js` 里那份。
这不是风格问题，是"改了没反应"的事故源头。

它查四样：
  ① 同名函数多处声明 —— 谁胜出、谁其实是死的、哪几处是逐字相同（纯冗余）
  ② 顶层函数从未被引用 —— 候选死代码（排除 HTML 内联 / 字符串引用）
  ③ CSS 里定义了却从没被用过的类 —— 孤儿样式
  ④ 同一个选择器被重复定义且属性打架 —— 后一条静默盖掉前一条

用法
----
  python tools/deadcode.py            人看的清单
  python tools/deadcode.py --json     机器可读
  python tools/deadcode.py --check    给巡检用：出现"没登记过"的问题就退出码 1

登记机制（tools/deadcode_baseline.json）
----------------------------------------
工程里确实有一批**有意为之**的覆盖（`57_multination.js` / `69_blaze_toggle.js` /
`70_blaze_overrides.js` 就是专门干这个的）。把它们记进基线，之后**新冒出来的**
才算问题 —— 和骨架比对是同一个思路：不是禁止，是不能悄悄变多。
"""
import json
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS)
sys.path.insert(0, TOOLS)
from manifest import PIECES, PUBLISH  # noqa: E402

BASELINE = os.path.join(TOOLS, "deadcode_baseline.json")

# 顶层 `function 名字(` —— 只认行首（本工程顶层声明不缩进）
RE_FUNC = re.compile(r"^function\s+([A-Za-z_$][\w$]*)\s*\(", re.M)
# CSS 类选择器
RE_CLASS = re.compile(r"\.(-?[A-Za-z_][\w-]*)")
# 一条 CSS 规则（选择器 { 属性 }）
RE_RULE = re.compile(r"([^{}]+)\{([^{}]*)\}")


def modules():
    """按构建顺序返回 [(相对路径, 文本)]，顺序即"谁覆盖谁"。"""
    out = []
    for path, _s, _e, _n in PIECES:
        full = os.path.join(ROOT, path)
        if not os.path.exists(full):
            continue
        out.append((path.replace("\\", "/"),
                    open(full, encoding="utf-8").read()))
    return out


def strip_comments(text):
    """把注释**用空格盖掉**（不删）。

    关键：不能直接删 —— 删了行号就全错位（第一版报出的 `40_lings.css:4`
    其实是第 60 行的规则，对着行号去看代码会一脸茫然）。
    盖成空格既不影响解析，又保住偏移，行号/列号都对得上。
    """
    def blank(m):
        return re.sub(r"[^\n]", " ", m.group(0))
    text = re.sub(r"/\*.*?\*/", blank, text, flags=re.S)
    text = re.sub(r"(?m)//[^\n]*$", blank, text)
    return text


def strip_keyframes(css):
    """把 @keyframes 整块盖掉 —— 里面的 `0%` / `50%` / `to` 不是选择器。

    （不盖掉的话，"同名选择器重复定义"会报出一堆 `0%`、`from`、`to`：
     那是每个动画各自的关键帧，彼此毫无关系。）
    """
    def blank(m):
        return re.sub(r"[^\n]", " ", m.group(0))
    return re.sub(r"@(?:-webkit-)?keyframes[^{]*\{(?:[^{}]|\{[^{}]*\})*\}",
                  blank, css)


# --------------------------------------------------------------------------- #
# ① 同名函数
# --------------------------------------------------------------------------- #
def scan_funcs(mods):
    """返回 {名字: [{mod,line,body,end}]}，按构建顺序。

    为什么"后声明的胜出"是**整个脚本**范围的（不是从它那一行才生效）：
    产物是**一个** `<script>`，函数声明在脚本实例化阶段全部提升，
    同名重复声明时**最后一次声明**覆盖前面的 —— 从第一行代码起就是这个绑定。
    所以前面那份不只是"被覆盖"，它连加载期调用都走不到：纯死代码。
    """
    found = {}
    for path, text in mods:
        if not path.endswith(".js"):
            continue
        lines = text.split("\n")
        for m in RE_FUNC.finditer(text):
            name = m.group(1)
            line = text[:m.start()].count("\n")
            body, end = body_of(lines, line)
            found.setdefault(name, []).append(
                {"mod": path, "line": line + 1, "body": body,
                 "end": line + 1 + (end - line - 1)})
    return found


def body_of(lines, start):
    """从 `function x(` 那一行起，按大括号配平取函数体。返回 (文本, 结束行下标)。"""
    depth = 0
    out = []
    for i in range(start, min(len(lines), start + 800)):
        ln = lines[i]
        out.append(ln)
        depth += ln.count("{") - ln.count("}")
        if i > start and depth <= 0:
            break
    return "\n".join(out), i


def norm(body):
    """规范化：去注释、压空白 —— 用来判"逐字相同"。"""
    b = strip_comments(body)
    return re.sub(r"\s+", "", b)


def collide(funcs):
    """跨模块同名（同模块内重名单独标注：那是纯事故）。"""
    out = []
    for name, defs in sorted(funcs.items()):
        mods = {d["mod"] for d in defs}
        if len(defs) < 2:
            continue
        winner = defs[-1]
        dead = defs[:-1]
        same = [d for d in dead if norm(d["body"]) == norm(winner["body"])]
        out.append({
            "name": name,
            "cross": len(mods) > 1,
            "winner": "%s:%d" % (winner["mod"], winner["line"]),
            "dead": ["%s:%d" % (d["mod"], d["line"]) for d in dead],
            "verbatim": ["%s:%d" % (d["mod"], d["line"]) for d in same],
            "dead_lines": sum(d["end"] - d["line"] + 2 for d in dead),
        })
    return out


# --------------------------------------------------------------------------- #
# ② 从未被引用的顶层函数
# --------------------------------------------------------------------------- #
def usage_pool(mods):
    """数"有没有人用"的语料：src 全文 + **构建期注入进去的东西**。

    为什么不能只看 src：公告卡是 tools/news.py 在构建时渲染进去的，
    `.news-title` / `.fs-tip` 这些类名在 src 里一次都不出现 ——
    只看 src 会把整张公告卡的样式全判成"孤儿"（第一版就误报了 13 个）。
    所以把产物里 <style> 之外的部分也当语料：那才是玩家真正看到的标记。
    """
    pool = [(p, t) for p, t in mods]
    prod = os.path.join(ROOT, os.path.join(*PUBLISH.split("/")))
    if os.path.exists(prod):
        html = open(prod, encoding="utf-8").read()
        html = re.sub(r"<style.*?</style>", " ", html, flags=re.S)
        pool.append((PUBLISH + "（构建产物·除去 CSS）", html))
    return pool


def scan_unused(mods, funcs):
    """函数名在"声明之外"还有没有出现（JS 调用 / HTML 内联 / 字符串引用都算）。

    一律用**原文**匹配（含注释）：注释里提过一次也当有人用 —— 宁可漏报，不可误删。
    "声明本身"要从每个语料里扣掉：产物是同一个模块的复制品，
    不扣就会得出"全都被用到了"（第一版就栽在这儿，把 9 个死函数报成活的）。
    """
    pool = usage_pool(mods)
    out = []
    for name, defs in sorted(funcs.items()):
        if len(defs) > 1:
            continue                      # 同名的那批交给 ① 处理
        pat = re.compile(r"\b" + re.escape(name) + r"\b")
        decl = re.compile(r"function\s+" + re.escape(name) + r"\s*\(")
        hits = 0
        for _path, text in pool:
            hits += len(pat.findall(text)) - len(decl.findall(text))
        if hits <= 0:
            out.append({"name": name, "at": "%s:%d" % (defs[0]["mod"], defs[0]["line"]),
                        "lines": defs[0]["end"] - defs[0]["line"] + 2})
    return out


# --------------------------------------------------------------------------- #
# ③ / ④ CSS
# --------------------------------------------------------------------------- #
def iter_css_rules(text):
    """产出 (偏移, 上下文, 选择器, 声明区文本)。

    上下文 = 包着它的那串 at-rule（`@media (orientation:landscape)…`）。
    为什么非要它：`.opt{...}` 在 `@media(横屏)` 里再写一遍是**响应式设计**，
    不是"同一选择器打架" —— 第一版把它们报成 18 组问题里的一半，纯噪音。
    只有"上下文相同 + 选择器相同 + 属性值不同"才算真打架。
    """
    out = []
    # 先切出 @media / @supports 块（本工程没有嵌套的媒体查询）
    blocks = []          # (prelude, inner_start, inner_end)
    for m in re.finditer(r"@(?:media|supports)[^{]*\{", text):
        prelude = " ".join(m.group(0)[:-1].split())
        depth, i = 1, m.end()
        while i < len(text) and depth > 0:
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
            i += 1
        blocks.append((prelude, m.end(), i - 1))

    def collect(region, base, context):
        for m in RE_RULE.finditer(region):
            raw = m.group(1)
            # 正则会把选择器前面的换行/空白一起吃进组里，行号会差一位 —— 对齐到实字
            lead = len(raw) - len(raw.lstrip())
            sel = " ".join(raw.split())
            if not sel or sel.startswith("@"):
                continue
            out.append((base + m.start(1) + lead, context, sel, m.group(2) or ""))

    # 顶层：把媒体块的位置挖空再扫
    mask = list(text)
    for _p, s, e in blocks:
        for k in range(s, e):
            if mask[k] != "\n":
                mask[k] = " "
    collect("".join(mask), 0, ())
    for prelude, s, e in blocks:
        inner = text[s:e]
        collect(inner, s, (prelude,))
    return out


def scan_css(mods):
    css = [(p, t) for p, t in mods if p.endswith(".css")]
    js_html = "\n".join(t for p, t in usage_pool(mods) if not p.endswith(".css"))
    defined = {}
    for path, text in css:
        clean = strip_comments(text)
        for m in RE_CLASS.finditer(clean):
            cls = m.group(1)
            defined.setdefault(cls, []).append(
                "%s:%d" % (path, clean[:m.start()].count("\n") + 1))
    orphan = []
    for cls, where in sorted(defined.items()):
        # 只要能"作为整词"出现在 JS/HTML/产物里就算有人用
        if re.search(r"[^A-Za-z0-9_-]" + re.escape(cls) + r"[^A-Za-z0-9_-]", js_html) \
           or js_html.startswith(cls):
            continue
        # 模板插值（class="qt-${qt}" 这种）会漏出来，单独放行带前缀的写法
        if re.search(r"[`\"'][^`\"']*" + re.escape(cls.split("-")[0]) + r"-\$\{", js_html):
            continue
        orphan.append({"cls": cls, "at": where[0], "n": len(where)})

    # 同一选择器重复定义：**只比同一嵌套层**
    # （媒体查询里的覆盖是响应式设计，不是"打架"；第一版把它们全报成了问题）
    rules = {}
    for path, text in css:
        clean = strip_keyframes(strip_comments(text))
        for off, ctx, sel, body in iter_css_rules(clean):
            props = {}
            for decl in body.split(";"):
                if ":" not in decl:
                    continue
                k, v = decl.split(":", 1)
                k, v = k.strip(), v.strip()
                if k and v and not k.startswith("--"):
                    props[k] = v
            if not props:
                continue
            key = (ctx, sel)
            at = "%s:%d" % (path, clean[:off].count("\n") + 1)
            prev = rules.get(key)
            if prev is None:
                rules[key] = {"sel": sel, "at": at, "ctx": " ".join(ctx),
                              "props": props, "at2": None, "diff": []}
            else:
                diff = [k for k, v in props.items()
                        if k in prev["props"] and prev["props"][k] != v]
                if diff and not prev["at2"]:
                    prev["at2"] = at
                    prev["diff"] = sorted(diff)
    dup = [v for _k, v in sorted(rules.items()) if v["at2"]]
    return orphan, dup


def scan_shadowed(mods):
    """整条规则被后面同名规则**全量覆盖** —— 可以整条删掉的那种。

    判据：上下文相同、选择器相同（含"分组选择器里的成员"），
    且它写的每一条属性，都在**后面**的同名规则里又被写了一次。
    层叠只看同特异度里的先后顺序，所以这类规则对最终样式**零贡献**。
    （10_quiz.css 里就是这种情况：文件前半段是旧版样式，
      后半段"1. / 2. / 3. / 5."那几个编号章节是新版，把旧的整段压住了。）
    """
    js_html = ""   # 只为签名一致，这里不用
    css = [(p, t) for p, t in mods if p.endswith(".css")]
    seq = []       # [(上下文, 选择器, 属性dict, 位置, 是否分组, 原始选择器文本)]
    for path, text in css:
        clean = strip_keyframes(strip_comments(text))
        for off, ctx, sel, body in iter_css_rules(clean):
            props = {}
            for decl in body.split(";"):
                if ":" not in decl:
                    continue
                k, v = decl.split(":", 1)
                k, v = k.strip(), v.strip()
                if k and v:
                    props[k] = v
            if not props:
                continue
            group = "," in sel
            for one in [s.strip() for s in sel.split(",") if s.strip()]:
                seq.append((ctx, one, props, "%s:%d" % (path, clean[:off].count("\n") + 1),
                            group, sel))
    seq.sort(key=lambda r: _pos_key(r[3]))
    shadowed = []
    for i, (ctx, sel, props, at, group, raw) in enumerate(seq):
        if group:
            continue               # 分组规则里可能还有别的成员在用，不整条删
        later = [r for r in seq[i + 1:] if r[0] == ctx and r[1] == sel]
        if not later:
            continue
        overwritten = 0
        for k in props:
            for r in later:
                if k in r[2]:
                    overwritten += 1
                    break
        if overwritten >= len(props):
            shadowed.append({"sel": sel, "at": at, "props": len(props)})
    return shadowed


def _pos_key(at):
    m = re.match(r"(.+):(\d+)$", at)
    return (m.group(1), int(m.group(2)))


# --------------------------------------------------------------------------- #
def analyse():
    mods = modules()
    funcs = scan_funcs(mods)
    orphan, dup = scan_css(mods)
    return {
        "modules": len(mods),
        "funcs": len(funcs),
        "collisions": collide(funcs),
        "unused": scan_unused(mods, funcs),
        "orphan_css": orphan,
        "dup_css": dup,
        "shadowed_css": scan_shadowed(mods),
    }


def load_baseline():
    if not os.path.exists(BASELINE):
        return {"collisions": [], "unused": [], "orphan_css": []}
    try:
        return json.load(open(BASELINE, encoding="utf-8"))
    except Exception:
        return {"collisions": [], "unused": [], "orphan_css": []}


def check(data, base):
    """只报"基线里没登记过"的 —— 数量不能悄悄变多。"""
    bad = []
    known_c = set(base.get("collisions", []))
    for c in data["collisions"]:
        if c["name"] not in known_c:
            bad.append("新增同名函数：%s（%s 被 %s 覆盖）"
                       % (c["name"], "、".join(c["dead"]), c["winner"]))
    known_u = set(base.get("unused", []))
    for u in data["unused"]:
        if u["name"] not in known_u:
            bad.append("新增没被引用的函数：%s（%s）" % (u["name"], u["at"]))
    known_o = set(base.get("orphan_css", []))
    for o in data["orphan_css"]:
        if o["cls"] not in known_o:
            bad.append("CSS 里新出现没人用的类：.%s（%s）" % (o["cls"], o["at"]))
    known_s = set(base.get("shadowed_css", []))
    for s in data["shadowed_css"]:
        if s["at"] not in known_s:
            bad.append("CSS 里出现整条被覆盖的规则（零贡献，可删）：%s（%s）"
                       % (s["sel"], s["at"]))
    return bad


def main():
    data = analyse()
    if "--json" in sys.argv:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0
    if "--check" in sys.argv:
        bad = check(data, load_baseline())
        if bad:
            print("静态分析发现 %d 项（基线里没登记）：" % len(bad))
            for b in bad:
                print("  · " + b)
            print("  如果是有意为之，跑 python tools/deadcode.py --save 记进基线")
            return 1
        print("同名函数 %d 组 / 未引用函数 %d 个 / 孤儿类 %d 个 / 零贡献规则 %d 条，全部在基线内"
              % (len(data["collisions"]), len(data["unused"]),
                 len(data["orphan_css"]), len(data["shadowed_css"])))
        return 0
    if "--save" in sys.argv:
        json.dump({"collisions": [c["name"] for c in data["collisions"]],
                   "unused": [u["name"] for u in data["unused"]],
                   "orphan_css": [o["cls"] for o in data["orphan_css"]],
                   "shadowed_css": [s["at"] for s in data["shadowed_css"]]},
                  open(BASELINE, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=2)
        print("已写入基线 %s" % os.path.relpath(BASELINE, ROOT))
        return 0

    print("静态分析 · %d 个模块 · 顶层函数 %d 个" % (data["modules"], data["funcs"]))
    print()
    dead_lines = sum(c["dead_lines"] for c in data["collisions"]) + \
        sum(u["lines"] for u in data["unused"])
    verb = [c for c in data["collisions"] if c["verbatim"]]
    print("① 同名函数多处声明：%d 组 · 其中被覆盖的那些共约 %d 行（纯死代码）"
          % (len(data["collisions"]),
             sum(c["dead_lines"] for c in data["collisions"])))
    for c in data["collisions"]:
        flag = "（与胜出者逐字相同）" if len(c["verbatim"]) >= len(c["dead"]) else (
            "（部分逐字相同）" if c["verbatim"] else "")
        print("   %-22s 死：%s  →  胜：%s %s"
              % (c["name"], "、".join(c["dead"]), c["winner"], flag))
    print()
    print("② 从未被引用的顶层函数：%d 个 · 约 %d 行"
          % (len(data["unused"]), sum(u["lines"] for u in data["unused"])))
    for u in data["unused"]:
        print("   %-24s %s（%d 行）" % (u["name"], u["at"], u["lines"]))
    print()
    print("   合计可安全删除约 %d 行" % dead_lines)
    print()
    print("③ CSS 里没人用的类：%d 个" % len(data["orphan_css"]))
    print("   " + "、".join(".%s" % o["cls"] for o in data["orphan_css"]))
    print()
    print("④ 同一选择器重复定义且打架（同一上下文内）：%d 组" % len(data["dup_css"]))
    for d in data["dup_css"]:
        print("   %-34s %s  ↔  %s  打架属性：%s"
              % (d["sel"][:34], d["at"], d["at2"], ",".join(d["diff"])))
    print()
    print("⑤ 整条被后面同名规则全量覆盖（零贡献，可直接删）：%d 条"
          % len(data["shadowed_css"]))
    for s in data["shadowed_css"]:
        print("   %-34s %s（%d 条属性全被覆盖）" % (s["sel"][:34], s["at"], s["props"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
