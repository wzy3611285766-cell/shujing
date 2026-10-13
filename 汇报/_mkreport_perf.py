# -*- coding: utf-8 -*-
"""生成「数境169 · 帧率优化报告」单文件 HTML"""
import os,base64
BASE=os.path.dirname(os.path.abspath(__file__))
SHOT=os.path.join(BASE,"shots_perf")
OUT=os.path.join(BASE,"数境169_帧率优化报告_2026-10-13.html")

def img(key,cap,cls=""):
    p=os.path.join(SHOT,key+".jpg")
    if not os.path.exists(p): return f'<figure class="{cls}"><div style="padding:30px;background:#eee">缺图 {key}</div></figure>'
    b=base64.b64encode(open(p,"rb").read()).decode()
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
.shots figure{margin:0;flex:1 1 300px;min-width:260px;max-width:360px}
.shots figure.narrow{flex:0 0 240px;min-width:200px;max-width:250px}
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
<title>数境 169 · 帧率优化报告</title><style>{CSS}</style></head><body><div class="wrap">
<header>
<div class="ver">SHUJING · PERFORMANCE REPORT</div>
<h1>帧率优化报告</h1>
<p>2026-10-13 · 定位到帧率瓶颈是「每帧把 2400×1900 的地形位图重贴一遍」· 改了 3 处渲染· 答题/菜单界面帧率提升 5～8 倍，地图界面提升约 1.9 倍（弱机模拟实测）</p>
</header>

<h2>一、先说结论</h2>
<div class="card">
<div class="note good"><b>帧率的锅不在题库、不在 JS 逻辑，全在渲染。</b>实测：<code>update()</code> 每帧只要 <b>0.01ms</b>、<code>syncEnts()</code> 0.04ms、<code>save()</code> 0.00ms —— 逻辑侧几乎不花时间。而单单一次<code>ctx.drawImage(staticLayer,0,0)</code>（把整张 2400×1900 的地图铺到屏幕上）就要 <b>5.8ms</b>，占满 60fps 预算的 35%，是整帧画布开销的 <b>90% 以上</b>。</div>
<p>为什么这么贵：地形图是按「1 世界单位 = 1 像素」画的，贴到屏幕上要放大 <code>SCALE×DPR</code> 倍（手机竖屏 0.694×2 = <b>1.387 倍</b>）。非整数倍放大时，<b>每一个目标像素都要做一次双线性插值</b>。同一块面积：</p>
<table>
<tr><th>画什么</th><th>耗时</th><th>说明</th></tr>
<tr><td>纯色铺满整屏</td><td>0.38ms</td><td>对照基准</td></tr>
<tr><td>贴地形位图（现状）</td><td><b>5.81ms</b></td><td>放大 1.387 倍，逐像素插值</td></tr>
<tr><td>贴地形位图 + 关掉平滑</td><td><b>1.23ms</b></td><td>改成最近邻取整采样</td></tr>
<tr><td>什么都不画</td><td>0.20ms</td><td></td></tr>
</table>
<p style="font-size:13.5px;color:#5b6b7c">（同一批测量里还验证过：<b>平移取整没用</b>（6.06→6.02ms）、<b>只贴可视区也没用</b>（4.65→4.54ms）—— 成本只跟「要不要重采样」有关，跟贴多大面积无关。）</p>
</div>

<h2>二、改了三处</h2>
<div class="card">
<h3>① 面板打开时不再重画地图</h3>
<p>地图在答题/看菜单时被压在蒙层底下，玩家根本看不见，却还在每帧重画。</p>
<pre>function loop(now){{
  const dt=Math.min(50,now-last);last=now;t+=dt;
  update(dt);
  if(!panelOpen()&amp;&amp;!newsIsOpen())draw();   // ← 新增这一层判断
  requestAnimationFrame(loop);
}}</pre>
<p>更关键的是：<code>#modal</code> 上挂着 <code>backdrop-filter:blur(4px)</code>，底下那张 canvas 每帧都在变，<b>合成器就得每帧重算一次全屏高斯模糊</b> —— 答题时的卡顿主要来自这里。停画之后背景成了静止画面，模糊只算一次。</p>

<h3>② 地形不再每帧「贴」，改成整层平移</h3>
<p>新增一个 <code>&lt;canvas id="bg"&gt;</code> 专门放地形：世界画一次，之后整层靠 CSS transform 跟着镜头走。</p>
<pre>function syncBgTransform(){{
  bgCv.style.transform='translate3d('+(-cam.x*SCALE).toFixed(2)+'px,'
    +(-cam.y*SCALE).toFixed(2)+'px,0) scale('+SCALE+')';
}}</pre>
<p>合成器在 GPU 上挪一个图层几乎不要钱，主线程一分钱不花，而且是 GPU 双线性采样，比原来 canvas 那条路更平滑。<code>#game</code> 上只剩地面光晕、角色圈、小地图这些每帧都在变的东西。</p>
<div class="note">取不到 <code>#bg</code> 时会自动退回原来的一次性位图 blit，功能不受影响。</div>

<h3>③ 兜底路径关掉双线性插值</h3>
<p>退回老路径时，放大倍率 ≥1 就改用最近邻采样（5.8ms → 1.3ms）。倍率 &lt;1（桌面窄窗口这类缩采样）时最近邻会丢像素、走起来闪烁，所以那种情况保留平滑。</p>
</div>

<h2>三、优化前后帧率（弱机模拟实测）</h2>
<div class="card">
<p style="font-size:13.5px">测法：软件光栅（<code>--disable-gpu</code>）+ CPU 降频 6 倍，模拟一台弱手机；每个状态采 3 秒的 rAF 帧间隔。同一台机器、同一套操作，只换 HTML 文件。</p>
<table>
<tr><th style="width:24%">界面状态</th><th>优化前</th><th>优化后</th><th>提升</th><th>怎么看</th></tr>
<tr><td>☰ 菜单打开</td><td>12.1 fps</td><td><b>56.0 fps</b></td><td class="up">4.6×</td><td>基本满帧</td></tr>
<tr><td>答题面板打开</td><td>10.8 fps</td><td><b>54.3 fps</b></td><td class="up">5.0×</td><td>学生待得最久的界面</td></tr>
<tr><td>地图·站立</td><td>8.7 fps</td><td><b>16.9 fps</b></td><td class="up">1.9×</td><td>画布开销已去掉，剩的是软件合成的固定成本</td></tr>
<tr><td>地图·移动中</td><td>11.9 fps</td><td><b>17.3 fps</b></td><td class="up">1.5×</td><td>同上</td></tr>
</table>
<h3>横屏（932×430）同样测了一轮</h3>
<table>
<tr><th style="width:24%">界面状态</th><th>优化前</th><th>优化后</th><th>提升</th></tr>
<tr><td>☰ 菜单打开</td><td>10.1 fps</td><td><b>51～60 fps</b></td><td class="up">5～6×</td></tr>
<tr><td>答题面板打开</td><td>6.6 fps</td><td><b>35～57 fps</b></td><td class="up">5～8×</td></tr>
<tr><td>地图·站立</td><td>12.3 fps</td><td>10～13 fps</td><td class="down">基本持平</td></tr>
<tr><td>地图·移动中</td><td>8.8 fps</td><td>6～15 fps</td><td class="down">噪声内，看不出差别</td></tr>
</table>
<div class="note bad"><b>要诚实说清楚两件事：</b><br>
1. 这是<b>软件光栅模拟</b>，绝对帧数不代表你的手机；真机有 GPU，合成那步基本白送，所以实际会比表里好看。<br>
2. <b>横屏地图那一档我没测出改善</b>（噪声比差异还大）。原因是模拟环境里「软件合成多张全屏图层」成了新的天花板，把画布省下的那点掩盖了。真机上这一步走 GPU，理论上不该是瓶颈 —— 但这一条我<b>没有证据</b>，不敢替你保证。</div>
</div>

<h2>四、画质有没有变差</h2>
<div class="card">
<p>把优化前后停在<b>完全相同的镜头位置与缩放</b>（cam 890.00,228.09 · SCALE 0.6935）各截一张，逐像素比对：</p>
<table>
<tr><th>对比</th><th>结果</th></tr>
<tr><td>平均通道差</td><td>1.7 / 255（千分之七）</td></tr>
<tr><td>明显差异像素占比（差 &gt;24/255）</td><td>1.26%（集中在线条与文字边缘的抗锯齿差异）</td></tr>
<tr><td>系统性位移检测</td><td>把新图分别平移 ±1/±2 像素后误差都<b>变大</b> → <b>没有错位</b></td></tr>
<tr><td>白色标题包围盒</td><td>旧 236px 宽 @ x362,y579 · 新 236px 宽 @ x362,y579 → <b>完全一致，没有缩放</b></td></tr>
</table>
<div class="shots">{img("09_cmp_crop","同机位放大对比（1:1 原始像素）：上 = 优化前，下 = 优化后。岛名、纹理、石碑都没有变化")}</div>
</div>

<h2>五、功能回归</h2>
<div class="card">
<p>四个世界、小地图、战术地图、答题流程、横屏都跑了一遍。</p>
<div class="shots">{img("01_old_adv","优化前：闯关地图")}{img("02_new_adv","优化后：同一机位，渲染一致")}{img("08_new_backmap","答完题关掉面板后：地图正常重画")}</div>
<div class="shots">{img("03_new_epic","科学编年史")}{img("04_new_blaze","烽火地带·基地")}{img("05_new_drill","练枪场")}</div>
<div class="shots">{img("07_new_land","横屏 932×430：地形层按 0.55 缩放，对位正常")}{img("06_new_adv2","换到三角海湾：地形层重建正常")}</div>
</div>

<h2>六、文件与回退</h2>
<div class="card">
<div class="kv">
<div>改动文件<b>桌面 / 数境169.html</b></div>
<div>回退备份<b>backup/数境169_性能优化前_2026-10-13.html</b></div>
<div>改动处<b>新增 66 行 / 改 3 行</b></div>
</div>
<ul>
<li>diff 核对过：整份文件只有 <b>3 行被替换</b>（<code>loop()</code> 的函数体、<code>draw()</code> 里那行 <code>drawImage</code>、<code>buildStatic()</code> 的开头），其余全是新增的注释与兜底分支。</li>
<li><b>题库、答题逻辑、存档结构一行没动。</b></li>
<li>要回退：把备份文件复制回桌面、覆盖 <code>数境169.html</code> 即可。</li>
</ul>
<div class="note">下一步还能挖的（<b>没改，先留给你决定</b>）：实体层 <code>#ents</code> 里每只精灵/结晶都是一个独立合成层（<code>will-change:transform</code>），图标还挂着 <code>filter:drop-shadow()</code>。屏幕上同时 17 个带滤镜的层，在弱 GPU 手机上是要钱的。想再压一档的话，可以把 <code>drop-shadow</code> 换成 <code>text-shadow</code>（emoji 一样有影子，但不需要单独的滤镜通道），我可以在改完后同样做一轮前后对比。</div>
</div>

<footer>数境 169 · 帧率优化报告 · 2026-10-13 · 数据由 CDP 实机采集</footer>
</div></body></html>
"""
open(OUT,"w",encoding="utf-8").write(HTML)
print("WROTE",OUT,os.path.getsize(OUT)//1024,"KB")
