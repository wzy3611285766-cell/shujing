# -*- coding: utf-8 -*-
"""每日巡检：一条命令把「今天这游戏还健康吗」跑一遍，出一份 HTML 报告。

四步体检
--------
  ① 构建           —— 按 src/ 重新拼产物；顺带核对公告与 news.json 是否同源
  ② 骨架比对       —— 与拆分前基线对拍，数出「真实代码改动」有几行
  ③ 无头浏览器冒烟 —— 真跑一遍游戏（题目生成器 / 存档往返 / 四国直达 / 公告 / 全屏入口 …）
  ④ 静态体检       —— 换行符约定、版本号三处一致、归档齐全、DOM 引用不悬空、汇报页无外链

产出
----
  汇报/巡检/数境169_巡检_<日期>.html    给人看的报告（含 bug 清单 + 带编号的改进建议）
  汇报/巡检/latest.json                 给下一次会话/AI 读的机器可读结果

用法
----
  python tools/daily.py            全量（约 40 秒，含无头浏览器）
  python tools/daily.py --fast     跳过无头浏览器（几秒）
  python tools/daily.py --no-report  只跑体检并把结果打到控制台
"""
import datetime
import glob
import io
import json
import os
import re
import subprocess
import sys
import time

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS)
sys.path.insert(0, TOOLS)
from manifest import PIECES, PUBLISH, BASELINE  # noqa: E402
import news as newsmod  # noqa: E402
import check as checkmod  # noqa: E402

OUTDIR = os.path.join(ROOT, "汇报", "巡检")
LATEST = os.path.join(OUTDIR, "latest.json")
SUGG = os.path.join(OUTDIR, "suggestions.json")
PRODUCT = os.path.join(ROOT, PUBLISH)


# --------------------------------------------------------------------------- #
# 小工具
# --------------------------------------------------------------------------- #
def run(args, timeout=600):
    p = subprocess.run([sys.executable] + args, cwd=ROOT, capture_output=True,
                       timeout=timeout, encoding="utf-8", errors="replace")
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def ver_of(path):
    try:
        return json.load(open(path, encoding="utf-8"))
    except Exception as e:
        return {"__err": str(e)}


# --------------------------------------------------------------------------- #
# ① 构建
# --------------------------------------------------------------------------- #
def step_build():
    import contextlib
    rc, out = run([os.path.join(TOOLS, "build.py")])
    ok = rc == 0
    detail = ""
    for line in out.splitlines():
        if "版本 v" in line or "公告 v" in line:
            detail += line.strip() + " · "
    # 公告同源核对：把它的输出收走，别和巡检自己的输出混在一起
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        nrc = newsmod.check()
    nout = buf.getvalue().strip()
    ok = ok and nrc == 0
    if nrc != 0:
        detail += " ⚠️ " + nout.splitlines()[-1] if nout else ""
    return {"name": "① 构建 + 公告同源", "ok": ok,
            "detail": (detail.strip(" ·") or "已完成"), "log": out + "\n" + nout}


# --------------------------------------------------------------------------- #
# ② 骨架比对
# --------------------------------------------------------------------------- #
def step_diff():
    if not os.path.exists(os.path.join(ROOT, BASELINE)):
        return {"name": "② 骨架比对", "ok": True, "detail": "基线不存在（跳过）", "log": ""}
    a = open(os.path.join(ROOT, BASELINE), "rb").read().decode("utf-8")
    b = open(PRODUCT, "rb").read().decode("utf-8")
    la, lb = checkmod.norm(a), checkmod.norm(b)
    sa, sb = set(la), set(lb)
    only_a = [x for x in la if x not in sb]
    only_b = [x for x in lb if x not in sa]
    return {"name": "② 骨架比对（对比拆分前基线）", "ok": True,
            "detail": "产物 %+d 字节 · 基线独有 %d 行 / 产物独有 %d 行（相对基线累计改动）"
                      % (len(b.encode()) - len(a.encode()), len(only_a), len(only_b)),
            "log": "\n".join(["仅基线有："] + only_a[:12] + ["", "仅产物有："] + only_b[:12])}


# --------------------------------------------------------------------------- #
# ③ 无头浏览器冒烟
# --------------------------------------------------------------------------- #
def step_smoke(fast=False):
    if fast:
        return {"name": "③ 无头浏览器冒烟", "ok": True, "detail": "已跳过（--fast）", "log": "", "skip": True}
    t0 = time.time()
    rc, out = run([os.path.join(TOOLS, "smoke.py"), "--http"], timeout=900)
    good = len(re.findall(r"^\s+✅", out, re.M))
    bad = len(re.findall(r"^\s+❌", out, re.M))
    errs = [ln.strip() for ln in out.splitlines() if ln.strip().startswith("❌")]
    return {"name": "③ 无头浏览器冒烟（file:// + http:// 各一遍）", "ok": rc == 0 and bad == 0,
            "detail": "%d 项通过 / %d 项失败 · 耗时 %.0fs" % (good, bad, time.time() - t0),
            "log": out, "failures": errs}


# --------------------------------------------------------------------------- #
# ④ 静态体检
# --------------------------------------------------------------------------- #
def _crlf_check():
    bad = []
    for path, _s, _e, _n in PIECES:
        full = os.path.join(ROOT, path)
        if not os.path.exists(full):
            bad.append("%s 不存在" % path)
            continue
        data = open(full, "rb").read()
        lf = data.count(b"\n") - data.count(b"\r\n")
        if lf:
            bad.append("%s 有 %d 处裸 LF（工程约定 CRLF）" % (path, lf))
    return bad


def _version_check():
    bad = []
    vroot = ver_of(os.path.join(ROOT, "version.json"))
    vpub = ver_of(os.path.join(ROOT, "shujing-app", "version.json"))
    if vroot.get("version") != vpub.get("version"):
        bad.append("version.json 与产物 version.json 版本号不一致：%s / %s"
                   % (vroot.get("version"), vpub.get("version")))
    if vroot.get("news_ver") and vroot.get("news_ver") != vpub.get("news_ver"):
        bad.append("公告已读位不一致：%s / %s（一般是改了 news.json 没重新构建）"
                   % (vroot.get("news_ver"), vpub.get("news_ver")))
    return bad, vroot


def _archive_check(ver):
    got = glob.glob(os.path.join(ROOT, "releases", "数境169_v%s_*.html" % ver))
    if not got:
        return ["releases/ 里没有 v%s 的归档（出问题就没有可回退的旧版）" % ver]
    return []


def _changelog_check(ver):
    """CHANGELOG 顶上那条必须就是当前版本。

    版本号散在四个地方（version.json / 产物 / 公告 / 更新日志），
    改一处漏一处是这类项目最常见的自相矛盾 —— 以前只有"忘了写更新日志"靠人记着。
    """
    p = os.path.join(ROOT, "CHANGELOG.md")
    if not os.path.exists(p):
        return ["CHANGELOG.md 不见了"]
    for ln in open(p, encoding="utf-8"):
        m = re.match(r"^##\s+(\d+\.\d+\.\d+)\b", ln)
        if not m:
            continue
        if m.group(1) != ver:
            return ["CHANGELOG 顶上那条是 v%s，version.json 却说 v%s（发完版没写更新日志，"
                    "或者写了两处不等）" % (m.group(1), ver)]
        return []
    return ["CHANGELOG.md 里找不到任何 '## x.y.z' 条目"]


def _dom_ref_check():
    """`$('x')` 里的 id 必须在产物某处出现过（含 JS 模板里生成的 id）。

    这是这个工程历史上真出过的一类 bug：删了 DOM，忘了删引用。
    """
    text = open(PRODUCT, "rb").read().decode("utf-8", "replace")
    ids = set(re.findall(r'id="([A-Za-z][\w-]*)"', text))
    # 元素也可能是运行时造的：ov.id='lingFx' / setAttribute('id','x') 都算数
    ids |= set(re.findall(r"""\.id\s*=\s*['"]([\w-]+)['"]""", text))
    ids |= set(re.findall(r"""setAttribute\(\s*['"]id['"]\s*,\s*['"]([\w-]+)['"]""", text))
    used = set(re.findall(r"""\$\(\s*['"]([\w-]+)['"]\s*\)""", text))
    used |= set(re.findall(r"""getElementById\(\s*['"]([\w-]+)['"]\s*\)""", text))
    miss = sorted(x for x in used if x not in ids)
    return miss, len(used)


def _todo_check():
    n = 0
    hits = []
    for path, _s, _e, _n in PIECES:
        if not path.endswith((".js", ".css")):
            continue
        p = os.path.join(ROOT, path)
        if not os.path.exists(p):
            continue
        for i, ln in enumerate(open(p, encoding="utf-8", errors="replace"), 1):
            m = re.search(r"(TODO|FIXME|XXX|HACK)\b", ln)
            if m:
                n += 1
                if len(hits) < 6:
                    hits.append("%s:%d %s" % (os.path.basename(path), i, ln.strip()[:90]))
    return n, hits


def _imgcheck():
    p = os.path.join(ROOT, "汇报", "_imgcheck.py")
    if not os.path.exists(p):
        return True, "（没有 _imgcheck.py，跳过）"
    rc, out = run([p])
    return rc == 0, out.strip().splitlines()[-1] if out.strip() else ""


def step_health():
    rows = []

    bad = _crlf_check()
    rows.append({"item": "模块换行符（CRLF 约定 · %d 个模块）" % len(PIECES), "ok": not bad,
                 "detail": "；".join(bad[:4]) if bad else "全部合规"})

    bad, vroot = _version_check()
    rows.append({"item": "版本号三处一致（version.json / 产物 / 公告）", "ok": not bad,
                 "detail": "；".join(bad) if bad else "v%s · NEWS_VER %s"
                           % (vroot.get("version"), vroot.get("news_ver"))})

    bad = _changelog_check(vroot.get("version", ""))
    rows.append({"item": "更新日志首条 = 当前版本", "ok": not bad,
                 "detail": "；".join(bad) if bad else
                           "CHANGELOG 顶上就是 v%s（版本谱系与涨号规则也写在开头）"
                           % vroot.get("version")})

    bad = _archive_check(vroot.get("version", ""))
    rows.append({"item": "releases/ 里有当前版本的归档", "ok": not bad,
                 "detail": "；".join(bad) if bad else "已归档，可随时回退"})

    miss, nused = _dom_ref_check()
    rows.append({"item": "DOM 引用不悬空（%d 处 $('id')）" % nused, "ok": not miss,
                 "detail": ("产物里找不到这些 id：" + "、".join(miss[:8])) if miss else "全部有着落"})

    ntodo, hits = _todo_check()
    rows.append({"item": "待办标记（TODO / FIXME）", "ok": True,
                 "detail": ("%d 处" % ntodo) + ("：" + "；".join(hits[:3]) if hits else "（无）")})

    ok, line = _imgcheck()
    rows.append({"item": "汇报页无外链（图片全内联）", "ok": ok, "detail": line})

    return {"name": "④ 静态体检", "ok": all(r["ok"] for r in rows), "rows": rows}


# --------------------------------------------------------------------------- #
# 观察项：把"体检看出来的小毛病"整理成可执行的一条条
# --------------------------------------------------------------------------- #
def observations(health, smoke, ver):
    out = []
    miss = None
    for r in health["rows"]:
        if "DOM 引用不悬空" in r["item"] and not r["ok"]:
            miss = r["detail"]
    if miss:
        out.append({"title": "有 DOM 引用找不到对应的 id",
                    "why": miss + " —— 这类引用点下去就是 TypeError，属于必修。",
                    "cost": "小", "where": "src/js/（按 id 名全局搜）"})
    for r in health["rows"]:
        if "归档" in r["item"] and not r["ok"]:
            out.append({"title": "当前版本还没有归档",
                        "why": r["detail"], "cost": "小",
                        "where": "python tools/release.py --no-bump"})
    # 重复定义：同名函数在多个模块里各一份（历史上 ☰ 菜单就出过两份）
    dup = {}
    for path, _s, _e, _n in PIECES:
        if not path.endswith(".js"):
            continue
        p = os.path.join(ROOT, path)
        if not os.path.exists(p):
            continue
        for m in re.finditer(r"^function\s+(\w+)\s*\(", open(p, encoding="utf-8", errors="replace").read(), re.M):
            dup.setdefault(m.group(1), []).append(os.path.basename(path))
    multi = {k: v for k, v in dup.items() if len(v) > 1}
    if multi:
        out.append({"title": "有 %d 个同名函数被定义了不止一次" % len(multi),
                    "why": "；".join("%s（%s）" % (k, "、".join(v)) for k, v in list(multi.items())[:4])
                           + " —— 后一份生效、前一份是死代码，改错文件等于没改。",
                    "cost": "小", "where": "src/js/（删掉不生效的那一份，或加注释说明为何覆盖）"})
    if smoke.get("failures"):
        out.append({"title": "冒烟有 %d 项没过" % len(smoke["failures"]),
                    "why": "；".join(smoke["failures"][:4]), "cost": "小", "where": "见报告「冒烟」一节"})
    if not out:
        out.append({"title": "本次体检没有发现新问题",
                    "why": "四步体检全过。可以把精力放在下面的改进建议上。",
                    "cost": "—", "where": "—"})
    return out


def load_suggestions():
    try:
        j = json.load(open(SUGG, encoding="utf-8"))
        return j.get("open", []), j.get("done", [])
    except Exception:
        return [], []


# --------------------------------------------------------------------------- #
# 报告
# --------------------------------------------------------------------------- #
CSS = """
*{box-sizing:border-box}
body{margin:0;background:#f4f6f9;color:#1a2530;
  font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;line-height:1.7}
.wrap{max-width:1000px;margin:0 auto;padding:26px 20px 60px}
header{background:#0f2233;color:#fff;border-radius:18px;padding:24px 24px 20px;margin-bottom:20px}
header .k{font-size:12px;letter-spacing:2px;color:#7ee0ff;font-weight:700}
header h1{margin:6px 0 8px;font-size:25px}
header p{margin:0;color:#b8cfe4;font-size:13.5px}
.pill{display:inline-block;margin:10px 6px 0 0;padding:3px 11px;border-radius:999px;
  background:rgba(126,224,255,.14);border:1px solid rgba(126,224,255,.35);
  color:#9ee6ff;font-size:12px;font-weight:700}
.pill.bad{background:rgba(255,120,110,.16);border-color:rgba(255,120,110,.45);color:#ffb3ac}
h2{font-size:18px;margin:28px 0 12px;padding-left:11px;border-left:4px solid #2f6fd0}
.card{background:#fff;border:1px solid #e0e7ef;border-radius:14px;padding:16px 18px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th,td{padding:8px 9px;border-bottom:1px solid #edf1f6;text-align:left;vertical-align:top}
th{background:#f7fafc;font-weight:700;font-size:12.5px;color:#5b6b7c}
.ok{color:#2c9c5a;font-weight:700}
.no{color:#d3452f;font-weight:700}
code{background:#f0f4f8;border-radius:5px;padding:1px 5px;font-size:12.5px;
  font-family:ui-monospace,Consolas,monospace;color:#25405c}
pre{background:#0f2233;color:#cfe6ff;border-radius:11px;padding:12px 14px;overflow:auto;
  font-size:12px;line-height:1.5;max-height:340px}
.sug{border:1px solid #e6edf4;border-radius:12px;padding:13px 15px;margin:10px 0;background:#fbfdff}
.sug .n{display:inline-block;min-width:2.6em;padding:1px 8px;border-radius:999px;margin-right:8px;
  background:#2f6fd0;color:#fff;font-size:12px;font-weight:700}
.sug.auto .n{background:#d99607}
.sug.auto{background:#fffaf0;border-color:#f2e2c4}
.sug b{color:#0d5c8c}
.sug .why{margin:6px 0 4px;font-size:13.5px;color:#33475c}
.sug .meta{font-size:12px;color:#7d94ab}
.note{background:#f0faf3;border-left:4px solid #2c9c5a;padding:11px 14px;border-radius:0 10px 10px 0;
  font-size:13.5px;margin:12px 0}
.note.bad{background:#fff2f0;border-left-color:#d3452f}
footer{margin-top:30px;color:#7d94ab;font-size:12px;text-align:center}
"""


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_report(steps, health, obs, sugg_open, sugg_done, ver, date, secs):
    bad_steps = [s for s in steps if not s["ok"]]
    bad_rows = [r for r in health["rows"] if not r["ok"]]

    p = []
    p.append('<header><div class="k">SHUJING · DAILY HEALTH CHECK</div>')
    p.append("<h1>每日巡检 · %s</h1>" % date)
    p.append("<p>一条命令跑完四步体检：构建 → 骨架比对 → 无头浏览器真跑一遍 → 静态体检。"
             "下面是今天的结果，以及一份可以挑着做的改进建议清单。</p>")
    p.append('<span class="pill">版本 v%s</span>' % esc(ver))
    p.append('<span class="pill">耗时 %.0fs</span>' % secs)
    p.append('<span class="pill%s">%s</span>' % (" bad" if bad_steps or bad_rows else "",
                                                 "体检 %d 步全过" % len(steps) if not (bad_steps or bad_rows)
                                                 else "%d 项要处理" % (len(bad_steps) + len(bad_rows))))
    p.append('<span class="pill">建议 %d 条待选</span>' % (len(sugg_open) + len(obs)))
    p.append("</header>")

    # 结论
    if not bad_steps and not bad_rows:
        p.append('<div class="note">✅ <b>体检全过</b>：构建、公告同源、骨架比对、'
                 '无头浏览器冒烟、静态体检 —— 没有需要马上动手的问题。下面那 %d 条建议，'
                 '挑一条回「做 #编号」我就开工。</div>' % (len(sugg_open) + len(obs)))
    else:
        p.append('<div class="note bad">⚠️ <b>有 %d 项没过</b>：%s'
                 '</div>' % (len(bad_steps) + len(bad_rows),
                             "、".join([s["name"] for s in bad_steps] + [r["item"] for r in bad_rows])))

    # 四步结果
    p.append("<h2>一、四步体检</h2><div class=\"card\"><table>"
             "<tr><th>步骤</th><th>结果</th><th>详情</th></tr>")
    for s in steps:
        p.append("<tr><td>%s</td><td class=\"%s\">%s</td><td>%s</td></tr>"
                 % (esc(s["name"]), "ok" if s["ok"] else "no",
                    "✅" if s["ok"] else "❌", esc(s.get("detail", ""))))
    p.append("</table></div>")

    # 静态体检明细
    p.append("<h2>二、静态体检明细</h2><div class=\"card\"><table>"
             "<tr><th>检查项</th><th></th><th>结果</th></tr>")
    for r in health["rows"]:
        p.append("<tr><td>%s</td><td class=\"%s\">%s</td><td>%s</td></tr>"
                 % (esc(r["item"]), "ok" if r["ok"] else "no", "✅" if r["ok"] else "❌",
                    esc(r["detail"])))
    p.append("</table></div>")

    # 冒烟明细
    for s in steps:
        if s["name"].startswith("③") and s.get("log"):
            lines = [ln.rstrip() for ln in s["log"].splitlines()
                     if re.match(r"^\s+[✅❌]", ln) or ln.startswith("冒烟")]
            p.append("<h2>三、冒烟明细（游戏里真跑一遍）</h2><div class=\"card\">"
                     "<pre>%s</pre></div>" % esc("\n".join(lines)))

    # 建议清单
    p.append("<h2>四、改进建议（挑一条告诉我编号就行）</h2>")
    p.append('<div class="card"><p style="font-size:13.5px;color:#5b6b7c;margin:0">'
             '黄色编号是<b>今天体检顺手看出来的观察项</b>（多半是这一天新冒出来的），'
             '蓝色编号是<b>积累的功能建议</b>。你回一句「做 #3」，我就按第 3 条往下做：'
             '改代码 → 跑回归 → 发版 → 出汇报页 → 公告自动同步给玩家。</p></div>')
    for i, s in enumerate(sugg_open, 1):
        p.append('<div class="sug"><span class="n">#%d</span><b>%s</b>'
                 '<div class="why">%s</div>'
                 '<div class="meta">改动量：%s · 落点：<code>%s</code></div></div>'
                 % (i, s.get("title", ""), s.get("why", ""), s.get("cost", "—"), esc(s.get("where", ""))))
    for i, s in enumerate(obs, 1):
        p.append('<div class="sug auto"><span class="n">#A%d</span><b>%s</b>'
                 '<div class="why">%s</div>'
                 '<div class="meta">改动量：%s · 落点：<code>%s</code></div></div>'
                 % (i, s.get("title", ""), s.get("why", ""), s.get("cost", "—"), esc(s.get("where", ""))))
    if sugg_done:
        p.append('<div class="card"><b>已经做完的（进 changelog 了）</b><ul style="margin:8px 0 0;padding-left:20px">'
                 + "".join("<li>%s <span style=\"color:#7d94ab\">· v%s</span></li>"
                           % (esc(d.get("title", "")), esc(d.get("ver", ""))) for d in sugg_done)
                 + "</ul></div>")

    p.append('<footer>由 tools/daily.py 生成 · %s · 机器可读结果在 汇报/巡检/latest.json</footer>'
             % datetime.datetime.now().strftime("%Y-%m-%d %H:%M"))
    return ("<!DOCTYPE html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            "<title>数境169 · 每日巡检 %s</title><style>%s</style></head><body>"
            "<div class=\"wrap\">%s</div></body></html>" % (date, CSS, "\n".join(p)))


# --------------------------------------------------------------------------- #
def main():
    fast = "--fast" in sys.argv
    no_report = "--no-report" in sys.argv
    t0 = time.time()
    date = datetime.date.today().strftime("%Y-%m-%d")

    print("=" * 68)
    print("数境169 · 每日巡检 %s" % date)
    print("=" * 68)

    steps = []
    for fn, label in ((step_build, "构建"), (step_diff, "骨架比对")):
        print("· %s …" % label, end="", flush=True)
        s = fn()
        steps.append(s)
        print(" %s  %s" % ("OK " if s["ok"] else "!! ", s["detail"][:90]))

    print("· 无头浏览器冒烟 …", end="", flush=True)
    smoke = step_smoke(fast)
    steps.append(smoke)
    print(" %s  %s" % ("OK " if smoke["ok"] else "!! ", smoke["detail"]))

    print("· 静态体检 …", end="", flush=True)
    health = step_health()
    steps.append({"name": "④ 静态体检", "ok": health["ok"],
                  "detail": "%d 项检查 · %d 项未过"
                            % (len(health["rows"]), len([r for r in health["rows"] if not r["ok"]]))})
    print(" %s  %s" % ("OK " if health["ok"] else "!! ", steps[-1]["detail"]))
    for r in health["rows"]:
        print("    %s %-34s %s" % ("✅" if r["ok"] else "❌", r["item"], r["detail"][:78]))

    ver = ver_of(os.path.join(ROOT, "version.json")).get("version", "?")
    obs = observations(health, smoke, ver)
    sugg_open, sugg_done = load_suggestions()
    secs = time.time() - t0

    os.makedirs(OUTDIR, exist_ok=True)
    data = {
        "date": date, "version": ver, "seconds": round(secs, 1),
        "ok": all(s["ok"] for s in steps) and health["ok"],
        "steps": [{"name": s["name"], "ok": s["ok"], "detail": s.get("detail", "")} for s in steps],
        "health": health["rows"],
        "failures": [s["name"] for s in steps if not s["ok"]] + \
                    [r["item"] for r in health["rows"] if not r["ok"]] + \
                    (smoke.get("failures") or []),
        "observations": [{"id": "A%d" % i, **o} for i, o in enumerate(obs, 1)],
        "suggestions": [{"id": "#%d" % i, **s} for i, s in enumerate(sugg_open, 1)],
    }
    open(LATEST, "w", encoding="utf-8", newline="\n").write(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n")

    if not no_report:
        html = build_report(steps, health, obs, sugg_open, sugg_done, ver, date, secs)
        out = os.path.join(OUTDIR, "数境169_巡检_%s.html" % date)
        open(out, "w", encoding="utf-8", newline="\n").write(html)
        print()
        print("报告：汇报/巡检/%s（%.0f KB）" % (os.path.basename(out), os.path.getsize(out) / 1024.0))
    print("结果：汇报/巡检/latest.json")
    print()
    print("今天：%s" % ("体检全过 ✅" if data["ok"] else "有 %d 项要处理 ❌" % len(data["failures"])))
    print("待选建议 %d 条（#1~#%d）+ 观察项 %d 条（#A1~#A%d）—— 回一句「做 #2」即可开工。"
          % (len(sugg_open), len(sugg_open), len(obs), len(obs)))
    return 0 if data["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
