# -*- coding: utf-8 -*-
"""生成「数境169 · 平板帧率修复报告」单文件 HTML（图片 base64 内嵌）"""
import os, base64

BASE = os.path.dirname(os.path.abspath(__file__))
SHOT = os.path.join(BASE, "shots_tab")
OUT = os.path.join(BASE, "数境169_平板帧率修复_2026-10-14.html")


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
.num{font-family:ui-monospace,Consolas,monospace;background:#f0f4f8;border-radius:5px;padding:1px 5px;font-size:12.5px;color:#25405c}
.up{color:#c2401f;font-weight:700}.down{color:#2c9c5a;font-weight:700}
.shots{display:flex;gap:14px;flex-wrap:wrap}
.shots figure{margin:0;flex:1 1 320px;min-width:280px}
.shots img{width:100%;border:1px solid #dbe3ec;border-radius:11px;display:block}
.shots figcaption{font-size:12px;color:#7d94ab;margin-top:6px;text-align:center}
.note{background:#fff8f0;border-left:4px solid #d99607;padding:11px 14px;border-radius:0 10px 10px 0;font-size:13.5px;margin:12px 0}
.bad{background:#fff2f0;border-left-color:#d3452f}
.good{background:#f0faf3;border-left-color:#2c9c5a}
code{background:#f0f4f8;border-radius:5px;padding:1px 5px;font-size:12.5px;font-family:ui-monospace,Consolas,monospace;color:#25405c}
pre{background:#0f2233;color:#cfe6ff;border-radius:11px;padding:12px 14px;overflow:auto;font-size:12.5px;line-height:1.55}
.kv{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
.kv div{background:#f7fafc;border:1px solid #e6edf4;border-radius:10px;padding:8px 13px;font-size:13px}
.kv b{font-size:16px;color:#0d5c8c;display:block}
footer{margin-top:34px;color:#7d94ab;font-size:12px;text-align:center}
"""

HTML = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>数境 169 · 平板帧率修复报告</title><style>{CSS}</style></head><body><div class="wrap">
<header>
<div class="ver">SHUJING · TABLET PERFORMANCE</div>
<h1>平板帧率修复报告</h1>
<p>2026-10-14 · 定位到「vivo Pad 2 拖摇杆掉帧」的根因是<b>画布分辨率 4 倍 + 每帧预算只有 6.9ms</b> · 改了 3 处渲染 + 加了一个 <code>?dbg=1</code> 诊断角标 · 弱机模拟：平板地图 1.6～1.7 倍，手机零回归</p>
</header>

<h2>一、先把账算清楚：为什么只有平板卡</h2>
<div class="card">
<p>三台设备的 SoC 其实是<b>同一档</b>（天玑9000 / 天玑9200，GPU 是 Mali-G710 与 Immortalis-G715，差距 20% 上下）。真正的差距在三个地方：</p>
<table>
<tr><th>设备</th><th>屏幕</th><th>刷新率</th><th>游戏后备画布</th><th>每帧预算</th></tr>
<tr><td>vivo X90 Pro</td><td>6.78" 2800×1260 = 353 万像素</td><td>120Hz</td><td><b>786×1750 = 138 万</b></td><td>8.33ms</td></tr>
<tr><td>vivo Pad 2</td><td>12.1" 2800×1968 = <b>551 万像素</b></td><td><b>144Hz</b></td><td><b>2800×1968 = 551 万</b></td><td><b>6.94ms</b></td></tr>
<tr><td>电脑</td><td>—</td><td>60/144Hz</td><td>dpr 一般 ≤1.5，且 GPU 余量大</td><td>16.7ms</td></tr>
</table>
<h3>关键在于这条上限只保护了手机</h3>
<pre>DPR = Math.min(window.devicePixelRatio || 1, 2);   // 改之前</pre>
<ul>
<li>手机要维持 <b>393dp 左右</b>的显示宽度，<code>devicePixelRatio</code> 必然是 3.2 上下 → 被压到 2，
等于<b>只用 62% 分辨率渲染</b>。这才是手机一直很流畅的隐藏原因。</li>
<li>而 12.1 寸平板（2800px 宽 / 系统默认密度正好 = 2）<b>压不动</b>：后备画布 2800×1968，
是手机的 <b>4.0 倍</b>；再乘刷新率 144/120 = <b>每秒 4.8 倍</b>的主线程光栅化工作量，
每帧预算反而少 17%。</li>
</ul>
<div class="note bad"><b>所以卡顿的根源不是平板弱，而是它在「原生分辨率 + 144Hz」下跑同一份代码。</b>
硬件只差一档，工作量差 4～5 倍 —— 拖动摇杆时每帧都在重画整张画布，就直接崩了。</div>
</div>

<h2>二、改了三处</h2>
<div class="card">
<h3>① 画布分辨率改成「按像素预算」</h3>
<p>不再问 devicePixelRatio 是多少，而是问<b>我这台机器一帧画得起多少像素</b>：预算内一分不降，超了就按面积开方降 dpr。</p>
<pre>const PIX_BUDGET = 1800000;   // CSS 像素 × DPR²，约等于「手机竖屏现状」那一档
DPR = clamp(Math.sqrt(PIX_BUDGET / Math.max(1, VW*VH)), 1, Math.min(devicePixelRatio||1, 2));</pre>
<table>
<tr><th>设备</th><th>CSS 视口</th><th>算出来的 dpr</th><th>后备画布</th><th>相对改动前</th></tr>
<tr><td>vivo Pad 2 横屏</td><td>1400×984</td><td>1.14</td><td>1600×1124（181 万）</td><td class="down">光栅化工作量 −66%</td></tr>
<tr><td>手机竖屏</td><td>430×932</td><td>2.00</td><td>860×1864（160 万）</td><td>不变</td></tr>
</table>
<p>画质代价很小：<code>#game</code> 上只有地面光晕、影子、角色圈、小地图这些<b>没有细节</b>的东西；
文字和 emoji 全在 DOM 实体层，不经过这张画布（地形是另一层，分辨率完全没动）。</p>

<h3>② 渲染节拍器：不再「每次 rAF 都画」</h3>
<p>144Hz 每帧只有 6.9ms 预算。画不完时浏览器会跳过若干 vsync 再交下一帧，间隔变成
「等 2 个 vsync、等 3 个 vsync」交替 —— 眼睛看到的就是一顿一顿。
与其贴着刷新率忽快忽慢，不如稳稳地每 2 个 vsync 出一帧。</p>
<pre>const k = Math.round((now - PERF.last) / PERF.vs);   // 隔了几个 vsync（不是比毫秒）
if (k &lt; PERF.multi) return;                          // 没到点：这一帧不画
...
if (PERF.n &gt;= 30 &amp;&amp; PERF.hz &gt; 0) {{                  // 每 30 帧评一次档
  const budget = PERF.vs * PERF.multi;
  if (PERF.work &gt; budget*0.8 || 迟到帧 &gt; 25%) PERF.multi++;   // 降一档
  else if (连续 6 批都只用 &lt;40% 预算)          PERF.multi--;   // 升一档
}}</pre>
<ul>
<li>档位只取 vsync 的<b>整数倍</b>：144Hz → 144/72/48/36/24，120Hz → 120/60/40/30/24，60Hz → 60/30/20/15。
任何屏幕上帧间隔都完全均匀 —— 顺带解决一个老问题：144 除以 60 除不尽，硬塞 60fps 会 2 帧/3 帧交替。</li>
<li>量不出节拍（<code>hz=0</code>）时<b>不升降档</b>，游戏照「每帧都画」跑，跟改之前一样；
开机先按 144Hz 假设，所以不会出现「还没量准就先掉帧」。</li>
</ul>
<div class="note"><b>踩到并修掉的坑：</b>第一版用「窗口内最小 rAF 间隔」当 vsync，结果一次偶发的 3～4ms 抖动把节拍记成
<b>250Hz</b>，档位表整张崩掉（实测渲染从 19fps 掉到 15fps）。现在两条防呆：间隔 &lt;5ms 不算数、
同一个最小值必须在一窗口里<b>出现两次以上</b>才采纳。</div>

<h3>③ 地形层的位移吸附到整数设备像素</h3>
<pre>const rd = window.devicePixelRatio || 1;
const tx = (Math.round(-cam.x*SCALE*rd)/rd).toFixed(3);
bgCv.style.transform = 'translate3d('+tx+'px,'+ty+'px,0) scale('+SCALE+')';   // 原来是 toFixed(2)</pre>
<p>地形层每帧都要被合成器重采样一遍：位移带小数时采样点永远落在纹素之间，纹理在像素网格上逐帧「游走」，
拖动时地形会持续发糊、闪。吸附之后采样点正好落在纹素中心。误差 ≤0.5 设备像素 = 0.25 CSS 像素，肉眼不可见。</p>
</div>

<h2>三、实测（弱机模拟：软件光栅 + CPU 降频 6 倍）</h2>
<div class="card">
<p>这台模拟机<b>复现不出 GPU 合成</b>，所以绝对帧率偏低、只能比<b>前后比例</b>。每个状态测 2～3 轮取最好（这台机器背景负载飘，单轮顺序测会得出假结论）。</p>
<h3>vivo Pad 2 档位（1400×984 @dpr2，横屏）</h3>
<table>
<tr><th>状态</th><th>改动前</th><th>改动后</th><th>倍数</th><th>说明</th></tr>
<tr><td>地图静止</td><td class="num">9.1 fps</td><td class="num"><b>15.2 fps</b></td><td class="down">1.67×</td><td rowspan="2">拖摇杆跑图就是这个状态</td></tr>
<tr><td><b>地图移动中</b></td><td class="num">9.4 fps</td><td class="num"><b>16.3 fps</b></td><td class="down">1.73×</td></tr>
<tr><td>☰ 菜单打开</td><td class="num">59.3 fps</td><td class="num">59.6 fps</td><td>持平</td><td>面板打开时本来就不画地图</td></tr>
<tr><td>答题面板</td><td class="num">19.2 fps</td><td class="num">18.2 fps</td><td>噪声内</td><td>走的是另一条路径（backdrop 模糊）</td></tr>
</table>
<h3>隔离实验：同一份代码、同一个页面，只把 DPR 改回 2</h3>
<p>为了证明「涨的那部分确实来自分辨率」，在<b>改动后</b>的页面里把画布强行改回 2800×1968 再测同一个状态：</p>
<table>
<tr><th>画布</th><th>dpr</th><th>地图移动中</th></tr>
<tr><td>1600×1124（181 万像素）</td><td>1.14</td><td class="num"><b>14.9 fps</b></td></tr>
<tr><td>2800×1968（551 万像素）</td><td>2.00</td><td class="num">9.6 fps</td></tr>
</table>
<div class="note good">同一份代码、同一个页面、只改分辨率：<b>9.6 → 14.9 fps（1.55×）</b>。
而改动前的产物在 dpr=2 下是 <b>9.4 fps</b> —— 与「改回来」的 9.6 几乎一致，
说明节拍器与位移吸附<b>没有带来任何额外开销</b>，涨的部分全部来自分辨率。</div>

<h3>手机竖屏回归（430×932 @dpr2）</h3>
<table>
<tr><th>状态</th><th>改动前</th><th>改动后</th></tr>
<tr><td>地图静止</td><td class="num">16.4 fps</td><td class="num">17.1 fps</td></tr>
<tr><td>地图移动中</td><td class="num">17.1 fps</td><td class="num">16.5 fps</td></tr>
<tr><td>☰ 菜单</td><td class="num">59.4 fps</td><td class="num">59.5 fps</td></tr>
<tr><td>答题面板</td><td class="num">51.6 fps</td><td class="num">50.5 fps</td></tr>
<tr><td>后备画布</td><td>860×1864 · dpr2.00</td><td>860×1864 · dpr2.00（<b>没降</b>）</td></tr>
</table>
<div class="note good">手机上四项全在噪声范围内，分辨率一分没降 —— 现状那台「本来就流畅」的设备不会因为这次改动变样。</div>
</div>

<h2>四、新增：?dbg=1 诊断角标</h2>
<div class="card">
<p>平板上没有 devtools，看不到 <code>devicePixelRatio</code>、后备画布多大、一帧到底花了几毫秒。
在网址后面加 <code>?dbg=1</code> 就会在屏幕左侧出现一个角标：</p>
<div class="shots">{img("dbg_badge", "角标实拍（平板档位）")}</div>
<div class="kv">
<div><b>画布 1600×1124</b>后备画布像素 = 每帧要光栅化的量</div>
<div><b>节拍 30Hz? 抽1</b>实测 rAF 节拍 / 每几帧画一帧</div>
<div><b>每帧 4.6ms/33.3ms</b>主线程耗时 / 这一档的预算</div>
<div><b>迟到 10/12</b>本批评里迟到的帧数</div>
</div>
<h3>三条读数规则</h3>
<ul>
<li><b>「每帧」长期贴着「预算」</b> → 是每帧画不完，该继续降分辨率（<code>PIX_BUDGET</code> 还能往下调）。</li>
<li><b>「节拍」带问号</b>（比如 <code>30Hz?</code>）→ 那不是屏幕变慢了，而是<b>这台机器跑不満屏幕</b>；
常见值 60/90/120/144/165 才不会打问号。</li>
<li><b>「渲染」明显低于「节拍÷抽帧数」</b> → 主线程被别的东西拖住了（这个角标自己半秒才刷一次，不会反过来影响读数）。</li>
</ul>
<div class="note">角标只在带 <code>?dbg=1</code> 时创建，元素和样式都在 JS 里注入，正常玩家看不到、也不占 HTML/CSS 模块。</div>
</div>

<h2>五、截图对比</h2>
<div class="card">
<div class="shots">
{img("tab_before", "改动前（平板横屏 1400×984）：画布 2800×1968，dpr 2.00")}
{img("tab_after", "改动后（同机位）：画布 1600×1124，dpr 1.14，左侧多了 ?dbg=1 角标")}
</div>
<p style="font-size:13.5px;color:#5b6b7c">地形层（预渲染的 2400×1900 那张）分辨率完全没动，所以地图纹理、岛形、水系、emoji 实体位置逐像素一致；
降分辨率的只有 <code>#game</code> 上那层光晕/影子/圈 —— 单看截图分不出差别。</p>
</div>

<h2>六、还没做的 &amp; 玩家侧能做的</h2>
<div class="card">
<h3>代码侧（下一轮，收益递减）</h3>
<ul>
<li><b>实体层降载</b>：<code>entDraw()</code> 每帧给每个实体无条件写 <code>style.transform</code>（144Hz 下每秒约 9 千次样式写入 + 字符串拼接）。
改成「位移变化 &lt;0.5px 就不写」，能省一截主线程时间。</li>
<li><b>输入合并</b>：<code>pointermove</code> 只记最后一个点、在 rAF 里消费；拖摇杆时避免任何布局读取。</li>
<li><b>画质档位</b>：给玩家一个「流畅优先」开关（= 手动把 <code>PIX_BUDGET</code> 降到 120 万），
比让他去改系统设置友好得多 —— 顺带说明：页面里 <code>viewport</code> 写了 <code>user-scalable=no</code>，
玩家<b>没有任何办法自己降分辨率</b>，这个杠杆只能在代码里给。</li>
</ul>
<h3>玩家侧（不改代码就能试的）</h3>
<ul>
<li>把系统刷新率切到 <b>60Hz</b> 再拖摇杆：如果明显好转，就印证了「每帧预算不够」这条 —— 这是最省事的判断针（144Hz 只有 6.9ms，60Hz 有 16.7ms）。</li>
<li>关掉省电模式 / 自适应刷新率（系统在负载波动时来回切档，会变成忽快忽慢）；
确认浏览器在「高刷应用名单」里；换 Chrome 内核对比一下自带浏览器。</li>
<li>关分屏 / 小窗 / 后台应用；别边充边玩（温控降频）。</li>
<li><b>同一台平板竖屏比横屏更重</b>：竖屏 SCALE 1.59 &gt; 横屏 1.14，每世界单位占更多设备像素，地形层放大倍率更高。</li>
</ul>
</div>

<footer>数境169 · 格物纪元 · 四国远征 ｜ 2026-10-14 ｜ 源码：src/js/36_loop.js（①②）· src/js/34_engine_core.js（③）· src/js/74_dbg.js（角标）</footer>
</div></body></html>
"""

open(OUT, "w", encoding="utf-8", newline="\n").write(HTML)
print("已生成 %s（%.0f KB）" % (os.path.basename(OUT), os.path.getsize(OUT) / 1024.0))
