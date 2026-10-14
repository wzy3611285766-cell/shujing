# -*- coding: utf-8 -*-
"""生成「数境169 · 四国并联」单文件 HTML 汇报"""
import os, base64

BASE = os.path.dirname(os.path.abspath(__file__))
SHOT = os.path.join(BASE, "shots_nation")
OUT = os.path.join(BASE, "数境169_四国并联_2026-10-14.html")


def img(key, cap, cls=""):
    p = os.path.join(SHOT, key + ".jpg")
    if not os.path.exists(p):
        return f'<figure class="{cls}"><div style="padding:30px;background:#eee">缺图 {key}</div></figure>'
    b = base64.b64encode(open(p, "rb").read()).decode()
    return f'<figure class="{cls}"><img src="data:image/jpeg;base64,{b}" alt="{cap}"><figcaption>{cap}</figcaption></figure>'


CSS = """
*{box-sizing:border-box}
body{margin:0;background:#f4f6f9;color:#1a2530;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;line-height:1.7}
.wrap{max-width:1080px;margin:0 auto;padding:28px 20px 60px}
header{background:#0f2233;color:#fff;border-radius:18px;padding:26px 26px 22px;margin-bottom:22px}
header .ver{font-size:12px;letter-spacing:2px;color:#7ee0ff;font-weight:700}
header h1{margin:6px 0 8px;font-size:26px}
header p{margin:0;color:#b8cfe4;font-size:13.5px}
h2{font-size:19px;margin:32px 0 12px;padding-left:11px;border-left:4px solid #2f6fd0}
h3{font-size:15.5px;margin:22px 0 8px;color:#0d5c8c}
.card{background:#fff;border:1px solid #e0e7ef;border-radius:14px;padding:18px;margin-bottom:16px}
ul,ol{margin:8px 0;padding-left:22px}li{margin:6px 0;font-size:14px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13.5px}
th,td{padding:8px 9px;border-bottom:1px solid #edf1f6;text-align:left;vertical-align:top}
th{background:#f7fafc;font-weight:700;font-size:12.5px;color:#5b6b7c}
td b{color:#0d5c8c}
code{background:#f0f4f8;border-radius:5px;padding:1px 5px;font-size:12.5px;font-family:ui-monospace,Consolas,monospace;color:#25405c}
pre{background:#0f2233;color:#cfe6ff;border-radius:11px;padding:12px 14px;overflow:auto;font-size:12.5px;line-height:1.55}
.shots{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}
.shots figure{margin:0;flex:1 1 300px;min-width:260px;max-width:340px}
.shots figure.wide{flex:1 1 420px;max-width:460px}
.shots img{width:100%;border:1px solid #dbe3ec;border-radius:11px;display:block}
.shots figcaption{font-size:12px;color:#7d94ab;margin-top:6px;text-align:center}
.note{background:#fff8f0;border-left:4px solid #d99607;padding:11px 14px;border-radius:0 10px 10px 0;font-size:13.5px;margin:12px 0}
.bad{background:#fff2f0;border-left-color:#d3452f}
.good{background:#f0faf3;border-left-color:#2c9c5a}
.step{background:#f7fafc;border:1px solid #e6edf4;border-radius:11px;padding:12px 14px;margin:10px 0;font-size:13.5px}
.step b{color:#0d5c8c}
footer{margin-top:34px;color:#7d94ab;font-size:12px;text-align:center}
"""

HTML = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>数境 169 · 四国并联</title><style>{CSS}</style></head><body><div class="wrap">
<header>
<div class="ver">SHUJING · FOUR NATIONS IN PARALLEL</div>
<h1>四国并联 · 传送网络改版</h1>
<p>2026-10-14 · 闯关模式的四个学科从「必须按顺序依次解锁」改成<b>四个互不依赖的并列国度</b> · 任意时间都能前往任意一国，落点就是该国的出生域 · 四国直达验收 34 项全过</p>
</header>

<h2>一、这次改的是什么</h2>
<div class="card">
<p>以前四个国度是<b>一条链</b>：数学国 → 力理亚 → 嬗变利亚 → 生衍利亚。
想进下一国，必须先把上一国的全部徽章（打赢每个域的守护者）集齐 —— 面板上直接写着
「去 力理亚 的航路还没打通 / 先通关 数理群岛：拿齐 5 枚徽章（现在 0 枚）」。
现在四国<b>并列</b>，没有一个国家需要"先通关谁"才能进。</p>
<table>
<tr><th></th><th>改之前</th><th>改之后</th></tr>
<tr><td>能去哪一国</td><td>只有出生国；下一国要靠上一国的徽章解锁</td><td><b>四国随时都能去</b></td></tr>
<tr><td>入口长什么样</td><td>未解锁的国度只显示一段锁+条件说明，<b>没有可点的按钮</b></td><td>每国都有一个常驻按钮：<b>🚀 开辟航路 / ↩️ 再次前往 / 🏠 回到出生域</b></td></tr>
<tr><td>落点</td><td>—</td><td>该国的<b>出生域</b>（数学→函数之境、物理→力学圣殿、化学→原子港、生物→细胞雨林）</td></tr>
<tr><td>跨国判定函数</td><td><code>nationUnlocked()</code>：必须拿满上一国全部徽章</td><td>已删除，改为 <code>goNationStart(id)</code> 直达</td></tr>
</table>
<div class="note good">只动了「国家之间的门」：<b>每个国家内部的域间桥与徽章进度没动</b>
（域与域之间仍然要靠打赢守护者拿徽章开桥）—— 那是"一国之内怎么探索"，不是"国家顺序"。</div>
</div>

<h2>二、传送网络面板：前后对比</h2>
<div class="card">
<div class="shots">
{img("portal_before", "改动前 · 全新存档：只有本国能进，其余三国全是锁 + 「先通关上一国」")}
{img("portal_after", "改动后 · 全新存档：四国并列，每国一个「🚀 开辟航路」，落点写在按钮上")}
</div>
<p style="font-size:13.5px;color:#5b6b7c">两张都是<b>全新存档</b>（0 徽章、0 座塔）拍的。改动后面板从"一条链"变成了"四个并列入口"，
而且整屏就能放下 —— 顺带把没点亮的塔从"一座一行"合并成一行「还有 N 座未点亮」，
否则四个国家铺开十几行，翻半天才看得到别国。</p>
</div>

<h2>三、去过之后长什么样</h2>
<div class="card">
<div class="shots">
{img("portal_visited", "去过力理亚与嬗变利亚之后：本国多出「🏠 回到出生域」，各国多出「↩️ 再次前往」与已点亮的塔")}
</div>
<ul>
<li><b>本国</b>：多一条「🏠 回到出生域」（在本国走远了、想回起点时用）。</li>
<li><b>去过的国家</b>：按钮变成「↩️ 再次前往」，下面列出该国<b>已点亮</b>的传送塔，可以直接点到具体某一域 ——
    这一层和以前一样，没丢。</li>
<li><b>没去过的国家</b>：只有一行「🚀 开辟航路」，点下去落在它的出生域。</li>
</ul>
</div>

<h2>四、入口在哪（游戏里怎么点到）</h2>
<div class="card">
<div class="shots">
{img("menu_entry", "☰ 菜单 → 🌀 传送阵（说明已改成「四国并列，随时可去任意一国」）", "wide")}
</div>
<p style="font-size:13.5px;color:#5b6b7c">三个入口都通同一个面板，随便点哪个都行：</p>
<ul>
<li>☰ 菜单 → <b>🌀 传送阵</b></li>
<li>顶栏 <b>🌍 国度</b> 按钮</li>
<li>顶栏左边那颗<b>区域名</b>（例如「📐 数理群岛 · 函数之境」）</li>
</ul>
</div>

<h2>五、为什么这样不会卡死</h2>
<div class="card">
<p>旧的顺序锁本来是为了防一个死局：<b>别国的传送塔必须"走过去"才会点亮，而传送网络又只认已点亮的塔</b> ——
不给个门槛的话，玩家永远回不了出生国。这次把死局从根上解掉了，所以门槛可以撤：</p>
<div class="step"><b>① 落地自动点亮</b>：切到任何一国，落地时自动点亮该国的<b>第一座传送塔</b>
（<code>switchNation</code> 末尾）。</div>
<div class="step"><b>② 本国也能回到出生域</b>：<code>goNationStart(id)</code> 在本国时只把人挪回第一域，
不走重建地图那条重流程。</div>
<div class="step"><b>③ 面板永远给出四个国家的入口</b>：不依赖任何徽章、任务或塔的状态。</div>
<div class="note">另外还保留了原来那条「离开某国前，若该国一座塔都没点亮，先给它留一盏灯」的逻辑 ——
老存档、从史诗模式切回来这些路径都不会退化成回不去。</div>
</div>

<h2>六、验收</h2>
<div class="card">
<h3>专项验收脚本（全新存档走一遍全流程）</h3>
<p><code>python .tmp_play/_test_nations.py</code> —— <b>34 项全过</b>，包含：</p>
<ul>
<li>全新存档下，面板里四国入口齐备、没有任何"先通关上一国"的锁；</li>
<li>从数学国依次直达物理 / 化学 / 生物（<b>徽章 0 枚也能进</b>），每次落点都在该国出生域、可走动、第一座塔自动点亮、地图尺寸跟着换；</li>
<li>从生物国<b>回到</b>数学国（回程同样直通）；</li>
<li>本国「回到出生域」：先走到几何尖塔，一键回到函数之境；</li>
<li>刷新后仍然并联（存档记住所在国度）。</li>
</ul>
<h3>冒烟回归新增一条永久检查</h3>
<pre>out.checks.四国直达 = safe('nations', function(){{
  /* 从别国绕一圈回数学国：每一站都验「切过去了 + 落在出生域 + 第一座塔亮着」 */
  NATIONS.slice(1).concat([NATIONS[0]]).forEach(function(n){{
    goNationStart(n.id);
    ...
  }});
  /* 面板里四国都要有常驻入口，且不许再出现「先通关上一国」那类锁 */
}});</pre>
<p>结果：<code>✅ 四国直达　四国都能直达出生域（⚡力理亚 → 🔥嬗变利亚 → 🌿生衍利亚 → 📐数理群岛）</code>，
三种打开方式（本地 / 线上部署 / 版本一致）全部通过，控制台无报错。</p>
</div>

<h2>七、边界与后续</h2>
<div class="card">
<ul>
<li><b>没动的</b>：一国之内的域间桥仍然要靠上一域的徽章开（数学 5 桥、理化生各 2 桥）。
    如果你想要的是"连域也随便进"，那是另一件事 —— 把桥的 <code>need</code> 去掉即可，说一声我改。</li>
<li><b>没动的</b>：各国的题库、精灵、石碑、守护者、结晶、练枪专题、学习报告统计全部照旧。</li>
<li><b>文案同步改了</b>：首次进入说明里那句「通关一国后就能开辟去往下一国的航路」已改成
    「四国并列互不依赖，任意时间都能前往任意一国」；菜单里 🌀 传送阵的说明也改了。</li>
<li><b>发公告</b>：要不要给老玩家弹一条更新公告？需要改 <code>src/js/55_boot_news.js</code> 的
    <code>NEWS_VER</code>（只改文字不升它，老玩家看不到）。你说要就一起发。</li>
</ul>
</div>

<footer>数境169 · 格物纪元 · 四国远征 ｜ 2026-10-14 ｜ 改动文件：src/js/57_multination.js（核心）· 55_boot_news.js · 49_drill.js · 70_blaze_overrides.js · tools/smoke.py（新增回归检查）</footer>
</div></body></html>
"""

open(OUT, "w", encoding="utf-8", newline="\n").write(HTML)
print("已生成 %s（%.0f KB）" % (os.path.basename(OUT), os.path.getsize(OUT) / 1024.0))
