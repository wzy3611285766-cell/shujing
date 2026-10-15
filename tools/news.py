# -*- coding: utf-8 -*-
"""更新公告：news.json 是唯一数据源，构建时自动同步进游戏。

为什么要有这个模块
------------------
公告原来写死在 src/10_body.html 里，而"已读位" NEWS_VER 要手工改。
历史上踩过一次：公告文字改了、NEWS_VER 忘了升，结果老玩家永远看不到
这条公告（发版脚本只能事后告警，救不回来）。

现在把两件事绑在一起：
  · 公告内容  = news.json 里最新一条（entries[0]）
  · NEWS_VER = 'v<版本>-<内容摘要 8 位>' —— 内容一改，值必变，必重弹
发版时只要在 news.json 顶上加一条，公告、已读位、旧版通知栏（
version.json 里的 news_title / news_items）三处一起跟上。

对外接口
--------
  load()            读 news.json
  latest(j)         最新一条
  render_card(en)   渲染 #news 卡片 HTML（注入 src/10_body.html 的标记区）
  ver_token(en)     NEWS_VER 的值
  summary(en)       纯文本摘要（给 version.json，旧版客户端顶部通知栏用）

命令行
------
  python tools/news.py            看最新一条（标题 / 要点 / NEWS_VER / 摘要）
  python tools/news.py --check    体检：news.json 与已构建产物里的公告是否一致
"""
import hashlib
import json
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEWS_FILE = os.path.join(ROOT, "news.json")
PRODUCT = os.path.join(ROOT, "shujing-app", "index.html")
START_MARK = "<!-- NEWS-CARD-START"
END_MARK = "<!-- NEWS-CARD-END -->"


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def plain(html):
    """把一段内联 HTML 压成一句纯文本（放进 version.json 给旧版客户端看）。"""
    s = re.sub(r"<[^>]+>", "", str(html))
    s = (s.replace("&nbsp;", " ").replace("&amp;", "&")
          .replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"'))
    return re.sub(r"\s+", " ", s).strip()


def load(path=None):
    with open(path or NEWS_FILE, encoding="utf-8") as f:
        j = json.load(f)
    if not j.get("entries"):
        raise SystemExit("news.json 里没有任何公告条目（entries 为空）")
    return j


def latest(j=None):
    j = j or load()
    return j["entries"][0]


# --------------------------------------------------------------------------- #
# 渲染
# --------------------------------------------------------------------------- #
def render_sec(sec):
    out = ['        <div class="news-sec">',
           '          <div class="news-sec-h">%s</div>' % esc(sec.get("h", ""))]
    for it in sec.get("items", []):
        out.append('          <div class="news-li"><span class="e">%s</span><span>%s</span></div>'
                   % (esc(it.get("e", "·")), it.get("html", "")))
    tips = sec.get("tips", [])
    if tips:
        out.append('          <div class="fs-tips">')
        for t in tips:
            out.append('            <div class="fs-tip"><span class="k">%s</span><span>%s</span></div>'
                       % (esc(t.get("k", "")), t.get("html", "")))
        out.append('          </div>')
    out.append('        </div>')
    return "\n".join(out)


def fs_block():
    """公告卡尾巴上那块「⛶ 全屏」：按钮 + 各平台怎么开。

    固定在卡片渲染里生成，**不靠写公告的人记得加** —— 全屏对不少人是很新的东西，
    只藏在 ☰ 菜单里很可能一辈子发现不了（4.0.10 的起因）。
    所以每次发版的公告都带上它：一次更新就是一次提醒 + 一次教学。
    """
    tips = [
        ("⛶ 游戏里", "<b>右上角 ☰ 菜单 → ⛶ 全屏</b>，一键进 / 一键退；菜单里永远留着它"),
        ("💻 电脑", "按 <b>F11</b>（Mac 是 <b>⌃⌘F</b>），再按一次退出"),
        ("📱 iPhone", "Safari 底部「分享」→「<b>添加到主屏幕</b>」，从桌面图标打开即全屏、没有地址栏"),
        ("🤖 安卓", "Chrome 右上角 <b>⋮</b> →「<b>添加到主屏幕</b>」，同样从图标进"),
        ("💬 微信", "右上角 <b>⋯</b> →「<b>在浏览器打开</b>」，再照上面的做"),
    ]
    out = ['        <div class="news-sec">',
           '          <div class="news-sec-h">⛶ 全屏 · 一键开，怎么用</div>',
           '          <button class="fs-btn" id="newsFs">⛶ 一键全屏</button>',
           '          <div class="fs-tips">']
    for k, v in tips:
        out.append('            <div class="fs-tip"><span class="k">%s</span>%s</div>' % (esc(k), v))
    out.append('          </div>')
    out.append('        </div>')
    return "\n".join(out)


def render_card(en):
    """渲染 #news 里的整张卡片。id 是 55_boot_news.js / build.py 的锚点，别改。"""
    secs = "\n".join(render_sec(s) for s in en.get("sections", []))
    secs = (secs + "\n\n" + fs_block()) if secs else fs_block()
    return (
        '<div class="news-card">\n'
        '      <button class="news-x" id="newsX" aria-label="关闭公告">✕</button>\n'
        '\n'
        '      <div class="news-hero">\n'
        '        <span class="news-badge">📣 版本更新 · v%s</span>\n'
        '        <div class="news-title">%s</div>\n'
        '        <div class="news-sub">%s</div>\n'
        '      </div>\n'
        '\n'
        '      <div class="news-body">\n'
        '%s\n'
        '      </div>\n'
        '\n'
        '      <div class="news-foot">\n'
        '        <button class="btn primary" id="newsOk">知道了，开玩 →</button>\n'
        '      </div>\n'
        '    </div>'
        % (esc(en.get("version", "")), esc(en.get("title", "")), esc(en.get("sub", "")), secs)
    )


def ver_token(en, card=None):
    """NEWS_VER：版本号 + 公告内容摘要。内容不变值不变，内容一改值必变。"""
    card = card if card is not None else render_card(en)
    return "v%s-%s" % (en.get("version", "0"), hashlib.md5(card.encode("utf-8")).hexdigest()[:8])


def summary(en):
    """给 version.json 的「本次更新要点」：旧版客户端顶部通知栏直接读它。"""
    items = []
    for s in en.get("sections", []):
        for it in s.get("items", []):
            t = plain(it.get("html", ""))
            if t:
                items.append((it.get("e", "·") + " " + t) if it.get("e") else t)
    return {
        "news_version": en.get("version", ""),
        "news_title": plain(en.get("title", "")),
        "news_sub": plain(en.get("sub", "")),
        "news_items": items[:6],
        "news_date": en.get("date", ""),
    }


# --------------------------------------------------------------------------- #
# 注入 / 体检
# --------------------------------------------------------------------------- #
def inject(raw):
    """把公告卡注进产物：返回 (新字节, 卡片 HTML)。标记区缺失就抛错 —— 静默不注入太危险。"""
    i = raw.find(START_MARK.encode("utf-8"))
    k = raw.find(END_MARK.encode("utf-8"))
    if i < 0 or k < 0 or k < i:
        raise SystemExit("src/10_body.html 里找不到公告标记区 %s ... %s" % (START_MARK, END_MARK))
    en = latest()
    card = render_card(en)
    head_end = raw.find(b"\n", i) + 1
    data = raw[:head_end] + card.encode("utf-8") + b"\r\n" + raw[k:]
    return data, card


def check():
    """体检：news.json 渲染出来的公告，和产物里那份是否一致（防止改了没构建）。"""
    if not os.path.exists(PRODUCT):
        print("!! 产物不存在：%s" % os.path.relpath(PRODUCT, ROOT))
        return 1
    data = open(PRODUCT, "rb").read().decode("utf-8", "replace")
    i, k = data.find(START_MARK), data.find(END_MARK)
    if i < 0 or k < 0:
        print("!! 产物里没有公告标记区（构建被改坏了？）")
        return 1
    got = data[data.find("\n", i) + 1:k].strip()
    en = latest()
    want = render_card(en).strip()
    m = re.search(r"NEWS_VER\s*=\s*'([^']+)'", data)
    want_ver = ver_token(en, want)
    ok = (got == want) and (m and m.group(1) == want_ver)
    print("%s 公告与 news.json 一致：v%s · %s"
          % ("OK " if ok else "!! ", en.get("version"), en.get("title")))
    print("   NEWS_VER 产物 %s / 应为 %s" % (m.group(1) if m else "（没找到）", want_ver))
    if not ok:
        print("   → 跑一次 python tools/build.py 就能同步")
    return 0 if ok else 1


def main():
    argv = sys.argv[1:]
    if "--check" in argv:
        return check()
    en = latest()
    s = summary(en)
    print("最新公告：v%s · %s（%s）" % (en.get("version"), en.get("title"), en.get("date")))
    print("副标题  ：%s" % en.get("sub", ""))
    print("NEWS_VER：%s" % ver_token(en))
    print("本次更新：")
    for x in s["news_items"]:
        print("  · %s" % x)
    print("共 %d 条历史公告（news.json）" % len(load()["entries"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
