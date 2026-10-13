# -*- coding: utf-8 -*-
"""生成「数境169 · 横屏试玩报告」单文件 HTML"""
import os,base64

BASE=os.path.dirname(os.path.abspath(__file__))
SHOT=os.path.join(BASE,"report_shots_land")
OUT=os.path.join(BASE,"数境169_横屏试玩报告_2026-10-12.html")

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
ul{margin:8px 0;padding-left:22px}li{margin:6px 0;font-size:14px}
.path{display:inline-block;background:#eaf3fb;color:#0d5c8c;border:1px solid #cfe0f0;border-radius:8px;padding:4px 10px;font-size:12.5px;font-weight:700;margin:3px 6px 6px 0}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13.5px}
th,td{padding:8px 9px;border-bottom:1px solid #edf1f6;text-align:left;vertical-align:top}
th{background:#f7fafc;font-weight:700;font-size:12.5px;color:#5b6b7c}
td b{color:#0d5c8c}
.rkb{display:inline-block;background:#eef2f7;border-radius:6px;padding:1px 7px;font-size:12px;color:#5b6b7c;font-weight:700;white-space:nowrap}
.rkb.hot{background:#ffe9e3;color:#c2401f}.rkb.ok{background:#e6f6ec;color:#2c9c5a}.rkb.warn{background:#fff4e0;color:#a8730a}
.shots{display:flex;gap:14px;flex-wrap:wrap}
.shots figure{margin:0;flex:1 1 300px;min-width:260px;max-width:360px}
.shots.wide figure{flex:1 1 100%;max-width:640px}
.shots img{width:100%;border:1px solid #dbe3ec;border-radius:11px;display:block}
.shots figcaption{font-size:12px;color:#7d94ab;margin-top:6px;text-align:center}
.note{background:#fff8f0;border-left:4px solid #d99607;padding:11px 14px;border-radius:0 10px 10px 0;font-size:13.5px;margin:12px 0}
.bad{background:#fff2f0;border-left-color:#d3452f}
.good{background:#f0faf3;border-left-color:#2c9c5a}
.kv{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
.kv div{background:#f7fafc;border:1px solid #e6edf4;border-radius:10px;padding:8px 13px;font-size:13px}
.kv b{font-size:16px;color:#0d5c8c;display:block}
.num{font-family:ui-monospace,Consolas,monospace;background:#f0f4f8;border-radius:5px;padding:1px 5px;font-size:12.5px;color:#25405c}
footer{margin-top:34px;color:#7d94ab;font-size:12px;text-align:center}
"""

HTML = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>数境 169 · 横屏试玩报告</title><style>{CSS}</style></head><body><div class="wrap">
<header>
<div class="ver">SHUJING · LANDSCAPE PLAYTEST</div>
<h1>横屏试玩报告</h1>
<p>2026-10-12 晚 · 手机横屏 932×430 从零开档走完整路线 · 另在 844×390 / 667×375 复测小屏横屏 · 逐屏量了面板高度 · 结论：横屏适配整体到位（答题自动切两栏、菜单两列、顶栏多出 6 个入口），但有 3 处横屏专属问题需要修</p>
</header>

<h2>一、这次怎么试的</h2>
<div class="card">
<div class="kv">
<div>主视口<b>932 × 430 横屏</b></div>
<div>复测机型<b>844×390 / 667×375</b></div>
<div>输入方式<b>真实触摸事件</b></div>
<div>存档<b>每次全新开档</b></div>
<div>走查界面<b>34 处</b></div>
<div>过程截图<b>77 张</b></div>
</div>
<div class="note">关键前提：<b>必须开着触摸模拟</b>，否则游戏走电脑分支（显示 WASD 提示条、菜单多一项「电脑端键位」）。本次全程 <span class="num">maxTouchPoints=5</span>、<span class="num">IS_PC=false</span>，是手机学生看到的界面。横屏布局的触发条件写在代码里是 <span class="num">@media (orientation:landscape) and (max-height:560px)</span> —— 所以平板横屏（高 768/1024）不会走这套两栏布局，只有手机横屏会。</div>
</div>

<h2>二、先说结论</h2>
<div class="card">
<h3>✅ 横屏做对的三件事</h3>
<ul>
<li><b>答题面板自动拆成两栏</b>：题目在左、选项在右，面板高度从竖屏的 803px 压到 <b>197～410px</b>，一屏基本能看全。</li>
<li><b>顶栏快捷入口反而变多</b>：横屏 7 个（史诗/图鉴/商行/练枪/错题/目标/菜单）全部可见；竖屏窄，只留得下 ☰ 一个。</li>
<li><b>列表类面板改两列</b>：图鉴、自习室、母题阶梯、烽火大厅、菜单都变双列 —— 图鉴需要滚动的量从竖屏 1718px 降到 <b>1077px</b>，练枪场主面板从 524px 降到 <b>212px</b>。</li>
</ul>
<h3>⚠️ 横屏专属的三个问题</h3>
<ul>
<li><b>「↓ 上下滑动看更多」提示条会压住面板底部的内容和按钮</b> —— 横屏面板几乎占满屏高（底部到 420/430），而提示条固定在距底 12px，正好落在面板里。实测烽火「部署行动」按钮（T360–B405）被提示条（T392–B418）盖住下半部分。</li>
<li><b>底部操作栏容易被切掉一半</b> —— 练枪场第一步/第二步的面板分别比可视区高 18px / 32px，底部两个按钮只露出上半截。</li>
<li><b>开场说明「开始探索」按钮不在首屏</b> —— 横屏需下滑 174px 才看得到（竖屏同样要滑 185px，这条两个朝向都存在，横屏更矮所以更明显）。</li>
</ul>
</div>

<h2>三、横屏下的完整路线（实机截图）</h2>
<div class="card">
<h3>1｜开场：公告 → 说明 → 地图</h3>
<div class="shots">{img("L10_news","首屏更新公告：横屏自动变左右两栏，「知道了，开玩」按钮完整可见")}{img("L13_intro_top","开场说明首屏：能读到「移动/石碑/精灵/守护者/结晶/错题中心」")}{img("L14_intro_bottom","下滑到底才看到「开始探索」—— 横屏比竖屏更容易错过")}</div>
<div class="shots">{img("L15_map_after_intro","进地图：整屏横向铺开，任务条「点亮函数之境的石碑 0/4」在顶部")}{img("L16_joy_mid","按住屏幕拖动：摇杆圆环出现在手指下，角色即时响应")}{img("L04_menu_top","☰ 菜单：横屏两列，一屏看到 10 项")}</div>
</div>

<div class="card">
<h3>2｜答题：石碑一步 / 练枪两步</h3>
<div class="shots">{img("L21_question","石碑答题：题目左、选项右（A–D 两列），面板只占 245px 高")}{img("L31_q2_result","答错的反馈：正确答案 + 完整解析 + 继续按钮，这一题刚好装下")}{img("L34_ans_withhints","先看了两层提示再作答：解析被挤到底部之外，只剩选项变色")}</div>
<div class="shots">{img("L62_drill_step1","练枪场第一步「选思路」：四个切入点 A–D 在右栏")}{img("L64_drill_step2","第二步「选答案」：底部按钮只露出上半截（差 32px）")}{img("L65_drill_answer","长解析的大题：面板 1209px 内容装进 408px 视口，要滚约两屏")}</div>
<div class="note bad">横屏下「一屏」= 面板可用高度 <b>408px</b>（屏高 430 减掉上下各 6px 和面板边距）；竖屏是 <b>801px</b> —— 横屏一屏只有竖屏的 51%。所以「能不能一屏看全」在横屏是更严格的要求。</div>
</div>

<div class="card">
<h3>3｜各面板横屏实机</h3>
<div class="shots">{img("L41_shop","结晶商行：376px 高，刚好装下，无滚动")}{img("L43_study","自习室：两组薄弱块变两列")}{img("L44_ladder","母题阶梯：11 个模型按科目分两列")}{img("L45_drillpanel_tip","练枪场主面板：内容 + 底部说明，提示条压住最后一行")}{img("L90_dex","图鉴与徽章：思路灵/徽章槽变多列")}{img("L73_teleport","传送阵：四国塔位状态")}</div>
</div>

<div class="card">
<h3>4｜另外三个世界横屏</h3>
<div class="shots">{img("L51_epic_map","科学编年史：河道横向展开，一次能看见多个纪元")}{img("L80_epic_read_top","读卷宗：横屏行更宽，长文更舒服（需滚 315px）")}{img("L91_blaze_base","烽火地带·基地：中央方形营地，两侧留黑")}{img("L92_blaze_lobby","行动大厅：地点两列 + 顶部六个板块")}{img("L99_ai_noKey","AI 详解：仍然提示「点下面 AI 设置」，而该按钮不在本面板")}{img("V00_map","667×375 小屏横屏：布局不塌，世界切换面板占比偏大")}</div>
</div>

<h2>四、横屏专属问题（附实测数据）</h2>
<div class="card">
<h3>问题 1｜「↓ 上下滑动看更多」提示条压住面板底部</h3>
<p><span class="path">复现：横屏 → ☰ → 烽火地带 → 走到指挥部 → 点「指挥部」→ 行动大厅</span></p>
<div class="shots wide">{img("L97_lobby_tip","提示条正好盖在「部署行动」按钮上，按钮下半部分被遮挡")}</div>
<table>
<tr><th>元素</th><th>竖屏 430×932</th><th>横屏 932×430</th></tr>
<tr><td>面板底边</td><td>868</td><td>420（屏高只剩 10px）</td></tr>
<tr><td>提示条位置</td><td>T896–B920（在面板之外）</td><td><b>T392–B418（落在面板内）</b></td></tr>
<tr><td>与「部署行动」按钮</td><td>不重叠</td><td><b>重叠</b>（按钮 T360–B405 × 提示条 T392–B418）</td></tr>
</table>
<div class="note bad">本质原因：提示条定位是 <span class="num">bottom: max(12px, --safeB)</span>，是相对<b>屏幕</b>而不是相对<b>面板</b>的；竖屏面板下方本来就有 60px 空档，所以从没撞上，横屏面板吃满高度后就必然重叠。</div>
<div class="shots">{img("L96_step1_tip","练枪场第一步：提示条同样压在面板内容区")}</div>
</div>

<div class="card">
<h3>问题 2｜底部操作栏被切掉一半</h3>
<p><span class="path">复现：横屏 → 练枪场 → 选数学 → 开始练枪</span></p>
<table>
<tr><th>状态</th><th>内容高 / 可视高</th><th>溢出</th><th>底部按钮</th></tr>
<tr><td>第一步·选思路</td><td>426 / 408</td><td>18px</td><td>「跳过 / 收工」露一半</td></tr>
<tr><td>第一步·答完思路</td><td>625 / 408</td><td>217px</td><td>完全在屏外</td></tr>
<tr><td>第二步·选答案</td><td>440 / 408</td><td>32px</td><td>「第 1 步(免费) / 收工」露一半</td></tr>
<tr><td>答完看解析</td><td>1209 / 408</td><td>801px</td><td>要滚约两屏</td></tr>
</table>
<div class="note">诚实对比：同样的练枪大题，竖屏是 1807 / 801 → 溢出 <b>1006px</b>。所以横屏其实<b>比竖屏少滚 20%</b>，并没有更差。<br>真正的问题是「差一口气」的那两档 —— 只差 18～32px 就一屏放下，却刚好切在按钮中间，学生会以为按钮坏了。</div>
</div>

<div class="card">
<h3>问题 3｜开场说明的「开始探索」不在首屏</h3>
<div class="shots">{img("L13_intro_top","首屏看不到按钮，只有底部提示条")}{img("L14_intro_bottom","下滑 174px 后出现「开始探索」")}</div>
<table>
<tr><th></th><th>竖屏 430×932</th><th>横屏 932×430</th></tr>
<tr><td>需要滚动</td><td>185px</td><td>174px</td></tr>
<tr><td>按钮位置</td><td>T992（屏高 932，露不出来）</td><td>T372（屏高 430，滑一下就到）</td></tr>
</table>
<div class="note">两个朝向都要滚，因此<b>不算横屏独有</b>；但横屏里这条说明占了 7 屏里的大半，学生更容易以为卡住。</div>
</div>

<h2>五、横屏比竖屏更强的地方（实测对照）</h2>
<div class="card">
<table>
<tr><th style="width:30%">对比项</th><th>竖屏 430×932</th><th>横屏 932×430</th><th>谁更好</th></tr>
<tr><td>顶栏快捷入口</td><td>1 个（只剩 ☰）</td><td><b>7 个全部可见</b></td><td class="rkb ok">横屏</td></tr>
<tr><td>答题面板高度（石碑）</td><td>803（上限）</td><td><b>245</b></td><td class="rkb ok">横屏</td></tr>
<tr><td>练枪场主面板需滚动</td><td>524px</td><td><b>212px</b></td><td class="rkb ok">横屏</td></tr>
<tr><td>图鉴需滚动</td><td>1718px</td><td><b>1077px</b></td><td class="rkb ok">横屏</td></tr>
<tr><td>练枪答题需滚动</td><td>1006px</td><td><b>801px</b></td><td class="rkb ok">横屏</td></tr>
<tr><td>结晶商行</td><td>0（444px 居中）</td><td>0（376px 居中）</td><td class="rkb">平手</td></tr>
<tr><td>母题阶梯需滚动</td><td>365px</td><td>503px</td><td class="rkb warn">竖屏</td></tr>
<tr><td>烽火行动大厅需滚动</td><td>800px</td><td>934px</td><td class="rkb warn">竖屏</td></tr>
<tr><td>自习室需滚动</td><td>1302px</td><td>1487px</td><td class="rkb warn">竖屏</td></tr>
<tr><td>编年史卷宗可读性</td><td>行较短，需滚 185+</td><td>行宽舒适</td><td class="rkb ok">横屏</td></tr>
</table>
<div class="note good">结论：横屏不是「凑合能用」，而是<b>在答题和列表这两类核心界面上明显更强</b>（因为两栏把纵向内容对折）；只有纯长列表（自习室、行动大厅）因为一屏高度变矮而多滚一点。</div>
</div>

<h2>六、横屏下依然找不到 / 用不了的功能（复核第一轮结论）</h2>
<div class="card">
<table>
<tr><th style="width:20%">功能</th><th style="width:30%">横屏复核结果</th><th>横屏新增观察</th></tr>
<tr><td>🔭 引路标</td><td class="rkb hot">依旧零入口</td><td>横屏同样没按钮；手机横屏也没有键盘，PC 的 M 键调不出来。菜单里从头翻到尾没有这一项。</td></tr>
<tr><td>🤖 AI 详解</td><td class="rkb hot">依旧断链</td><td>横屏实测点击后提示「还没填智谱 API Key —— 点下面『⚙️ AI 设置』」，但当前答题面板里的按钮只有 <span class="num">AI详解 / 第1步 / 收工 / 下一题 / A−</span>，没有 AI 设置。<br>真正的 <span class="num">#drAi</span> 在练枪场主面板底部 —— 横屏它在 <b>T584</b>，<b>首屏看不到，要先把面板滑到底</b>才出现，比竖屏更难找。</td></tr>
<tr><td>⏳ 时空交易所</td><td class="rkb hot">依旧无动作</td><td>横屏面板 785px 内容 / 408px 视口，要滚一屏才能看完说明；0 星尘时仍然一个可点的动作都没有。</td></tr>
<tr><td>🎛️ 战场底纹</td><td class="rkb warn">依旧纯视觉开关</td><td>横屏下菜单条目名称会随开关变化（完整/简洁），但学生没有理由去点它。</td></tr>
</table>
</div>

<h2>七、建议怎么改（按性价比排序）</h2>
<div class="card">
<ol style="font-size:14px;padding-left:22px">
<li><b>把提示条挂到面板里，而不是挂在屏幕上。</b>现在 <span class="num">#scrollTip</span> 是 <span class="num">position:absolute + bottom:12px</span>。改成「面板可滚时，把提示条贴在面板底边内侧（或直接放进面板的最后一个元素之后）」，横屏的重叠自然消失，竖屏表现不变。这一条改一处、收益最大。</li>
<li><b>给矮屏面板再挤 30～40px。</b>练枪第一步差 18px、第二步差 32px —— 压缩 <span class="num">.qmeta</span> 下边距、<span class="num">.opt</span> 最小高度（矮屏下已经是 2.2em，可再降到 2em）、或把 <span class="num">.row</span> 的 margin-top 从 11px 收到 8px，就够把两个按钮完整露出来。</li>
<li><b>答完题后自动把面板滚到解析。</b>答错时 <span class="num">panel.scrollTop</span> 仍是 0，学生只看到选项变色。参考「点提示后 <span class="num">panel.scrollTop=panel.scrollHeight</span>」那段既有写法，答题后滚到 <span class="num">#feedback</span> 即可，横竖屏都受益。</li>
<li><b>修 AI 详解的引导断链。</b>提示语里说的「下面 AI 设置」在答题面板里并不存在。要么把 <span class="num">#drAi</span> 一并放进答题面板底部，要么把文案改成「退出到练枪场主面板底部 → ⚙️ AI 设置」。</li>
<li><b>开场说明把「开始探索」提到首屏。</b>横竖屏都超屏，说明这段信息量偏大。可以在矮屏下把「传送塔 / 移动 / 石碑 / 精灵」四条折成两列，或把落款短句删掉，让按钮进入首屏。</li>
<li><b>给引路标在手机上补一个入口。</b>横竖屏都没有，是本次两轮试玩里唯一「完全摸不到」的功能。既然 169 版已经把入口从菜单拿掉，建议至少放回菜单一项（哪怕排在最后）。</li>
</ol>
</div>

<footer>数境 169 · 横屏试玩报告 · 2026-10-12 · 数据均由实机触摸操作采集</footer>
</div></body></html>
"""
open(OUT,"w",encoding="utf-8").write(HTML)
print("WROTE",OUT,os.path.getsize(OUT)//1024,"KB")
