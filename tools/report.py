# -*- coding: utf-8 -*-
"""改动汇报：把「这次改了什么」生成一份单文件 HTML，点开就能看。

约定（沿用 汇报/ 目录里已有的几份）：
  · 单文件、图片全部 base64 内联 —— 离线可看、能直接发给人；
  · 落到 汇报/数境169_<name>_<日期>.html；
  · 汇报页自查（汇报/_imgcheck.py）会扫 数境169_*.html，不许出现外链。

用法
----
  python tools/report.py 汇报/spec_4.0.6.json
  python tools/report.py 汇报/spec_4.0.6.json --open    生成后顺手打开

写 spec 的字段（都可省，省了就整块不渲染）
----------------------------------------
  name/version/date/kicker/title/tagline   抬头
  sections[].h/.paras/.items/.steps/.table/.code/.note/.shots
  files[{path,delta,note}]                 改了哪些文件
  checks[{name,ok,detail}]                 验收结果
  rollback / next[] / footer               回滚方式 / 下一步 / 页脚
"""
import base64
import datetime
import json
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = os.path.join(ROOT, "汇报")


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def img(path, cap, wide=False):
    """内联一张图。找不到就画一个占位框 —— 汇报缺图不该让整份生成失败。"""
    full = path if os.path.isabs(path) else os.path.join(ROOT, path)
    if not os.path.exists(full):
        return '<figure%s><div class="miss">缺图：%s</div><figcaption>%s</figcaption></figure>' % (
            ' class="wide"' if wide else "", esc(path), esc(cap))
    mime = "image/png" if full.lower().endswith(".png") else "image/jpeg"
    b = base64.b64encode(open(full, "rb").read()).decode()
    return ('<figure%s><img src="data:%s;base64,%s" alt="%s">'
            '<figcaption>%s</figcaption></figure>'
            % (' class="wide"' if wide else "", mime, b, esc(cap), esc(cap)))


CSS = """
*{box-sizing:border-box}
body{margin:0;background:#f4f6f9;color:#1a2530;
  font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;line-height:1.7}
.wrap{max-width:1080px;margin:0 auto;padding:28px 20px 60px}
header{background:#0f2233;color:#fff;border-radius:18px;padding:26px 26px 22px;margin-bottom:22px}
header .ver{font-size:12px;letter-spacing:2px;color:#7ee0ff;font-weight:700}
header h1{margin:6px 0 8px;font-size:26px;line-height:1.35}
header p{margin:0;color:#b8cfe4;font-size:13.5px}
.pill{display:inline-block;margin:10px 6px 0 0;padding:3px 11px;border-radius:999px;
  background:rgba(126,224,255,.14);border:1px solid rgba(126,224,255,.35);
  color:#9ee6ff;font-size:12px;font-weight:700}
h2{font-size:19px;margin:32px 0 12px;padding-left:11px;border-left:4px solid #2f6fd0}
h3{font-size:15.5px;margin:22px 0 8px;color:#0d5c8c}
.card{background:#fff;border:1px solid #e0e7ef;border-radius:14px;padding:18px;margin-bottom:16px}
ul,ol{margin:8px 0;padding-left:22px}li{margin:6px 0;font-size:14px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13.5px}
th,td{padding:8px 9px;border-bottom:1px solid #edf1f6;text-align:left;vertical-align:top}
th{background:#f7fafc;font-weight:700;font-size:12.5px;color:#5b6b7c}
td b{color:#0d5c8c}
code{background:#f0f4f8;border-radius:5px;padding:1px 5px;font-size:12.5px;
  font-family:ui-monospace,Consolas,monospace;color:#25405c}
pre{background:#0f2233;color:#cfe6ff;border-radius:11px;padding:12px 14px;overflow:auto;
  font-size:12.5px;line-height:1.55}
pre code{background:none;color:inherit;padding:0}
.shots{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;margin:6px 0 2px}
.shots figure{margin:0;flex:1 1 240px;min-width:200px;max-width:300px}
.shots figure.wide{flex:1 1 420px;max-width:520px}
.shots img{width:100%;border:1px solid #dbe3ec;border-radius:11px;display:block}
.shots figcaption{font-size:12px;color:#7d94ab;margin-top:6px;text-align:center}
.shots .miss{padding:26px;background:#eee;border-radius:11px;color:#888;font-size:12px}
.note{background:#fff8f0;border-left:4px solid #d99607;padding:11px 14px;border-radius:0 10px 10px 0;
  font-size:13.5px;margin:12px 0}
.note.bad{background:#fff2f0;border-left-color:#d3452f}
.note.good{background:#f0faf3;border-left-color:#2c9c5a}
.step{background:#f7fafc;border:1px solid #e6edf4;border-radius:11px;padding:12px 14px;
  margin:10px 0;font-size:13.5px}
.step b{color:#0d5c8c}
.ok{color:#2c9c5a;font-weight:700}
.no{color:#d3452f;font-weight:700}
footer{margin-top:34px;color:#7d94ab;font-size:12px;text-align:center}
"""


def render_section(s):
    out = ['<h2>%s</h2>' % esc(s.get("h", ""))]
    has_card = any(s.get(k) for k in ("paras", "items", "steps", "table", "code", "note", "shots"))
    if has_card:
        out.append('<div class="card">')
    for p in s.get("paras", []):
        out.append("<p>%s</p>" % p)
    if s.get("shots"):
        out.append('<div class="shots">')
        for sh in s["shots"]:
            out.append(img(sh["file"], sh.get("cap", ""), sh.get("wide")))
        out.append("</div>")
    if s.get("items"):
        out.append("<ul>" + "".join("<li>%s</li>" % x for x in s["items"]) + "</ul>")
    for st in s.get("steps", []):
        out.append('<div class="step"><b>%s</b> %s</div>' % (esc(st.get("b", "")), st.get("html", "")))
    t = s.get("table")
    if t:
        out.append("<table>")
        if t.get("head"):
            out.append("<tr>" + "".join("<th>%s</th>" % x for x in t["head"]) + "</tr>")
        for row in t.get("rows", []):
            out.append("<tr>" + "".join("<td>%s</td>" % x for x in row) + "</tr>")
        out.append("</table>")
    if s.get("code"):
        out.append("<pre><code>%s</code></pre>" % esc(s["code"]))
    n = s.get("note")
    if n:
        out.append('<div class="note %s">%s</div>' % (n.get("kind", ""), n.get("html", "")))
    if has_card:
        out.append("</div>")
    return "\n".join(out)


def build(spec):
    v = spec.get("version", "")
    date = spec.get("date") or datetime.date.today().strftime("%Y-%m-%d")
    name = spec.get("name") or ("更新汇报" + ("_v" + v if v else ""))
    title = spec.get("title", "改动汇报")

    parts = []
    parts.append('<header>')
    if spec.get("kicker"):
        parts.append('<div class="ver">%s</div>' % esc(spec["kicker"]))
    parts.append("<h1>%s</h1>" % esc(title))
    if spec.get("tagline"):
        parts.append("<p>%s</p>" % spec["tagline"])
    pills = []
    if v:
        pills.append("v" + str(v))
    pills.append(date)
    for x in spec.get("pills", []):
        pills.append(x)
    parts.append("".join('<span class="pill">%s</span>' % esc(p) for p in pills))
    parts.append("</header>")

    for s in spec.get("sections", []):
        parts.append(render_section(s))

    if spec.get("files"):
        parts.append("<h2>涉及的文件</h2><div class=\"card\"><table>"
                     "<tr><th>文件</th><th>行数变化</th><th>说明</th></tr>")
        for f in spec["files"]:
            parts.append("<tr><td><code>%s</code></td><td>%s</td><td>%s</td></tr>"
                         % (esc(f["path"]), esc(f.get("delta", "—")), f.get("note", "")))
        parts.append("</table></div>")

    if spec.get("checks"):
        okn = sum(1 for c in spec["checks"] if c.get("ok"))
        parts.append('<h2>验收（%d/%d 通过）</h2><div class="card"><table>'
                     "<tr><th>检查项</th><th>结果</th><th>证据</th></tr>" % (okn, len(spec["checks"])))
        for c in spec["checks"]:
            parts.append("<tr><td>%s</td><td class=\"%s\">%s</td><td>%s</td></tr>"
                         % (esc(c["name"]), "ok" if c.get("ok") else "no",
                            "✅ 通过" if c.get("ok") else "❌ 未通过", c.get("detail", "")))
        parts.append("</table></div>")

    if spec.get("rollback"):
        parts.append("<h2>出问题怎么退回去</h2><div class=\"card\"><p>%s</p></div>" % spec["rollback"])

    if spec.get("next"):
        parts.append("<h2>下一步可做</h2><div class=\"card\"><ul>"
                     + "".join("<li>%s</li>" % x for x in spec["next"]) + "</ul></div>")

    parts.append("<footer>%s</footer>" % (spec.get("footer")
                 or ("由 tools/report.py 生成 · %s" % datetime.datetime.now().strftime("%Y-%m-%d %H:%M"))))

    html = ("<!DOCTYPE html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            "<title>%s</title><style>%s</style></head><body><div class=\"wrap\">%s</div></body></html>"
            % (esc(title), CSS, "\n".join(parts)))
    return name, date, html


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith("-")]
    if not argv:
        raise SystemExit("用法：python tools/report.py 汇报/spec_xxx.json [--open]")
    spec_path = argv[0] if os.path.isabs(argv[0]) else os.path.join(ROOT, argv[0])
    spec = json.load(open(spec_path, encoding="utf-8"))
    name, date, html = build(spec)
    out = os.path.join(OUTDIR, "数境169_%s_%s.html" % (name, date))
    open(out, "w", encoding="utf-8", newline="\n").write(html)
    print("已生成 汇报/%s（%.0f KB）" % (os.path.basename(out), os.path.getsize(out) / 1024.0))
    if "--open" in sys.argv:
        os.startfile(out)          # noqa: 只在 Windows 上用；打不开就算了
    return 0


if __name__ == "__main__":
    sys.exit(main())
