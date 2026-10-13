# -*- coding: utf-8 -*-
"""生成「数境169 学生试玩与功能使用率分析」单文件 HTML 报告"""
import os,base64

BASE=os.path.dirname(os.path.abspath(__file__))
SHOT=os.path.join(BASE,"report_shots")
OUT=os.path.join(BASE,"数境169_学生试玩分析_2026-10-12.html")

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
h2{font-size:19px;margin:30px 0 12px;padding-left:11px;border-left:4px solid #2f6fd0}
h3{font-size:15.5px;margin:20px 0 8px;color:#0d5c8c}
.card{background:#fff;border:1px solid #e0e7ef;border-radius:14px;padding:18px;margin-bottom:16px}
ul{margin:8px 0;padding-left:22px}li{margin:5px 0;font-size:14px}
.path{display:inline-block;background:#eaf3fb;color:#0d5c8c;border:1px solid #cfe0f0;border-radius:8px;padding:4px 10px;font-size:12.5px;font-weight:700;margin:3px 6px 6px 0}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13.5px}
th,td{padding:8px 9px;border-bottom:1px solid #edf1f6;text-align:left;vertical-align:top}
th{background:#f7fafc;font-weight:700;font-size:12.5px;color:#5b6b7c}
td b{color:#0d5c8c}
tr.rk1 td{background:#fff7f7}.rkb{display:inline-block;background:#eef2f7;border-radius:6px;padding:1px 7px;font-size:12px;color:#5b6b7c;font-weight:700;white-space:nowrap}
.rkb.hot{background:#ffe9e3;color:#c2401f}.rkb.ok{background:#e6f6ec;color:#2c9c5a}.rkb.warn{background:#fff4e0;color:#a8730a}
.shots{display:flex;gap:14px;flex-wrap:wrap}
.shots figure{margin:0;flex:1 1 280px;min-width:240px;max-width:340px}
.shots img{width:100%;border:1px solid #dbe3ec;border-radius:11px;display:block}
.shots figcaption{font-size:12px;color:#7d94ab;margin-top:6px;text-align:center}
.note{background:#fff8f0;border-left:4px solid #d99607;padding:11px 14px;border-radius:0 10px 10px 0;font-size:13.5px;margin:12px 0}
.bad{background:#fff2f0;border-left-color:#d3452f}
.good{background:#f0faf3;border-left-color:#2c9c5a}
.kv{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
.kv div{background:#f7fafc;border:1px solid #e6edf4;border-radius:10px;padding:8px 13px;font-size:13px}
.kv b{font-size:16px;color:#0d5c8c;display:block}
footer{margin-top:34px;color:#7d94ab;font-size:12px;text-align:center}
"""

HTML = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>数境 169 · 学生试玩与功能使用率分析</title><style>{CSS}</style></head><body><div class="wrap">
<header>
<div class="ver">SHUJING · PLAYTEST REPORT</div>
<h1>学生试玩与功能使用率分析</h1>
<p>2026-10-12 晚 · 以高三学生身份从零开档完整试玩 · 逐项走查全部功能入口 · 结论：使用率最低的是「引路标」，其次是「AI 详解 / 拍题」，第三是「时空交易所」</p>
</header>

<h2>一、试玩档案</h2>
<div class="card">
<div class="kv">
<div>试玩者<b>高三学生视角</b></div>
<div>主设备<b>手机竖屏 430×932</b></div>
<div>对照环境<b>电脑模式(键鼠)</b></div>
<div>试玩版本<b>169 · 1.90 MB</b></div>
<div>覆盖功能点<b>38 项</b></div>
<div>过程截图<b>88 张</b></div>
</div>
<div class="note">⚠️ 版本说明：本次试玩用的是<b>桌面上的最新版</b>（数境169.html，2026-10-12 13:01）。资料库线上托管的那份是<b>旧版</b>（1.64 MB）—— 缺「母题阶梯」「自习室」「13 张实验图」等 30 个新函数对应的功能。本报告结论对新版成立，线上页建议重新发布。</div>
</div>

<h2>二、试玩路线（从零开始的真实路径）</h2>
<div class="card">
<h3>开场三步：公告 → 说明 → 地图</h3>
<div class="shots">{img("30_fresh_news","① 首屏：更新公告（点击「知道了开玩」进入）")}{img("31_intro","② 欢迎说明：玩法逐条介绍（点「开始探索」进地图）")}{img("81_mobile_map","③ 手机端地图：「按住拖动即可移动」")}</div>
<h3>核心循环：答题 → 反馈 → 错题</h3>
<div class="shots">{img("39_hint1","答题中：点「给点思路」分层提示（2 次免费）")}{img("41_answer","答对反馈：用时+迅捷奖励+结晶",)}</div>
<div class="note good">试玩体感：从打开到答完第一道题，共 <b>5 步操作</b>（关公告→关说明→传送到石碑→点互动→选答案）。对"想马上刷题"的学生来说，开场两个弹层的信息量偏大，但每一步都有明确出口。</div>
</div>

<h2>三、各功能使用情况总表</h2>
<div class="card">
<table>
<tr><th style="width:17%">功能</th><th style="width:30%">入口路径（试玩真实点击）</th><th style="width:11%">触达成本</th><th>试玩结果与观察</th></tr>
<tr><td colspan="4" style="background:#f2f6fb"><b>▶ 主循环（学生自然路径）</b></td></tr>
<tr><td>🔭 地图移动</td><td>直接按住屏幕拖动（摇杆）</td><td class="rkb ok">0 步</td><td>✅ 摇杆出现在手指下、实时跟随；手机/电脑提示语自动切换（"按住拖动"vs"WASD"）</td></tr>
<tr><td>🗿 石碑答题</td><td>走近石碑 → 点右下角「解谜」</td><td class="rkb ok">1-2 步</td><td>✅ 3 题一轮，逐题结算结晶；答完弹出「石碑亮起」结算页</td></tr>
<tr><td>✨ 精灵收服</td><td>走近精灵 → 点「收服」</td><td class="rkb ok">1-2 步</td><td>✅ 3 题需对 2；失败文案有温度："它跑掉了…别灰心，再试试"</td></tr>
<tr><td>🧙 引路人锦囊</td><td>走近引路人 → 点互动</td><td class="rkb ok">1-2 步</td><td>✅ 免费给一条知识点口诀（如"复合函数求导一层一层剥"）</td></tr>
<tr><td>🛡️ 守护者挑战</td><td>点亮 4 座石碑后走近互动</td><td class="rkb ok">1-2 步</td><td>⬜ 任务条引导明确（"0/4 石碑→守护者"），本次未打满</td></tr>
<tr><td>💎 结晶拾取</td><td>走过即自动拾取</td><td class="rkb ok">0 步</td><td>✅ 地图上散落，自动捡</td></tr>
<tr><td colspan="4" style="background:#f2f6fb"><b>▶ 菜单功能（闯关世界共 19 项）</b></td></tr>
<tr><td>📕 错题中心</td><td>菜单 → 错题中心（有错题时置顶带红点）</td><td class="rkb ok">2 步</td><td>✅ 答错 3 题后菜单顶部立刻出现「🔥 今日待复习 3 题」；空态也有拍题/文字导入入口</td></tr>
<tr><td>⚔️ 四世界切换</td><td>菜单 → 四个模式入口</td><td class="rkb ok">2 步</td><td>✅ 四世界全部走通，进度分库存</td></tr>
<tr><td>📖 图鉴与徽章</td><td>菜单 → 图鉴与徽章</td><td class="rkb ok">2 步</td><td>✅ 42 精灵 / 14 徽章 / 8 个「思路灵」收集槽</td></tr>
<tr><td>🏪 结晶商行</td><td>菜单 → 商行</td><td class="rkb ok">2 步</td><td>✅ 3 种商品：启示灯 15🪙 / 错题重练 12🪙 / 专项训练 10🪙</td></tr>
<tr><td>⏳ 时空交易所</td><td>菜单 → 交易所</td><td class="rkb warn">2 步+前置</td><td>⚠️ 需先玩编年史攒星尘才能兑换；0 星尘时只能看商品</td></tr>
<tr><td>🎯 每日一练</td><td>菜单 → 每日一练 → 开始</td><td class="rkb ok">3 步</td><td>✅ 5 道跨域混合题，完成奖 20🪙，中断则重新计数</td></tr>
<tr><td>📚 自习室</td><td>菜单 → 自习室 → 点薄弱块</td><td class="rkb ok">3 步</td><td>✅ 73 块知识点按薄弱度排序（"函数性质·还没练过"），点开直接开练</td></tr>
<tr><td>🧗 母题阶梯</td><td>菜单 → 母题阶梯 → 选模型</td><td class="rkb ok">3 步</td><td>✅ 11 个课本模型 × 三级（母题→变式→出其不意），进入后是"思路→答案"两步答题</td></tr>
<tr><td>🎯 练枪场</td><td>菜单 → 练枪场 → 选科 → 选专题 → 开始</td><td class="rkb warn">4-5 步</td><td>✅ 四科 73 专题无限题 + 攻坚档 37 题；两步答题（先选思路再选答案）</td></tr>
<tr><td>📊 学习报告</td><td>菜单 → 学习报告</td><td class="rkb ok">2 步</td><td>✅ 空档时引导"先去点亮一块石碑"，有数据后出正确率诊断</td></tr>
<tr><td>📐 公式速查</td><td>菜单 → 公式速查 → 选域</td><td class="rkb ok">3 步</td><td>✅ 14 个域核心公式，考前扫一眼</td></tr>
<tr><td>🌀 传送阵</td><td>菜单 → 传送阵</td><td class="rkb warn">3 步+条件</td><td>✅ 塔需先走近点亮才能传送；未点亮显示"走到XX·塔跟前解锁"</td></tr>
<tr><td>🎯 当前目标</td><td>菜单 → 当前目标</td><td class="rkb ok">2 步</td><td>✅ 把任务条（如"点亮石碑 0/4"）重新叫出来</td></tr>
<tr><td>💾 存档管理</td><td>菜单 → 存档管理</td><td class="rkb ok">2 步</td><td>✅ 导出/导入存档码、存成文件、清空重来</td></tr>
<tr><td>📣 更新公告</td><td>菜单 → 更新公告（首屏也自动弹）</td><td class="rkb ok">2 步</td><td>✅ 新版内容一次说清，含一键全屏引导</td></tr>
<tr><td>🔊 音效开关</td><td>菜单 → 音效</td><td class="rkb ok">2 步</td><td>✅ 一键开关</td></tr>
<tr><td>⌨️ 电脑端键位</td><td>菜单 → 键位（仅电脑可见）</td><td class="rkb ok">2 步</td><td>✅ 手机端完全不显示（设计如此，双端适配正确）</td></tr>
<tr><td colspan="4" style="background:#f2f6fb"><b>▶ 答题交互</b></td></tr>
<tr><td>🧭 思路→答案两步</td><td>练枪场/自习室/母题阶梯内自动进入</td><td class="rkb ok">—</td><td>✅ 第一步选"从哪入手"（不计对错），选偏了给正确切入点；第二步选答案</td></tr>
<tr><td>💡 分层提示</td><td>答题界面「给点思路」按钮</td><td class="rkb ok">1 步</td><td>✅ 每点一层给一条思路，2 次免费</td></tr>
<tr><td>🤖 AI 详解</td><td>答题后出现按钮（仅练枪场/错题重练）</td><td class="rkb hot">按钮在，用不了</td><td>❌ 点开提示"还没填智谱 API Key —— 点下面 AI 设置"，但当前界面没有该按钮（引导断链）</td></tr>
<tr><td>🎬 逐题结算</td><td>答完自动</td><td class="rkb ok">—</td><td>✅ "✅答对！用时7.1秒（迅捷+2）·获得6🪙"</td></tr>
<tr><td colspan="4" style="background:#f2f6fb"><b>▶ 错题系统</b></td></tr>
<tr><td>📕 自动收录</td><td>答错自动进错题本（容量 200）</td><td class="rkb ok">0 步</td><td>✅ 实测答错 3 题→错题中心立即可练</td></tr>
<tr><td>📥 文字导入</td><td>错题中心 → 文字导入</td><td class="rkb ok">3 步</td><td>✅ 支持"题干|答案|解析|知识点|科目"格式，最少只写前两段</td></tr>
<tr><td>📷 拍题（AI 解析）</td><td>错题中心 → 拍一道题</td><td class="rkb hot">3 步+配置</td><td>⚠️ 拍照/粘贴图片 → AI 出题干答案讲解；AI 识别需 Key，另有"本地免费识别"（公式/手写认不出）</td></tr>
<tr><td colspan="4" style="background:#f2f6fb"><b>▶ 四个世界专属</b></td></tr>
<tr><td>📜 科学编年史</td><td>菜单 → 世界切换 → 编年史 → 走近卷宗阅读</td><td class="rkb warn">4-5 步</td><td>✅ 15 纪元 86 卷宗；阅读界面排版精良（伊尚戈骨等）；星尘=交易所货币</td></tr>
<tr><td>🔥 烽火地带</td><td>菜单 → 世界切换 → 行动大厅</td><td class="rkb warn">4+ 步</td><td>✅ 部署/采购/交易/特勤处/收藏/战绩六大板块；4 地点 3 难度</td></tr>
<tr><td>🗺️ 战术地图</td><td>烽火内 → 菜单 → 战术地图</td><td class="rkb hot">4 步+条件</td><td>⚠️ 未部署过的学生打开只看到"先部署一次，才有战场地图"</td></tr>
<tr><td>🎛️ 战场底纹</td><td>烽火内 → 菜单 → 战场底纹</td><td class="rkb hot">4 步+条件</td><td>⚠️ 纯视觉开关（扫描线/密网格），普通学生大概率不会去点</td></tr>
<tr><td colspan="4" style="background:#f2f6fb"><b>▶ 设置类（深层）</b></td></tr>
<tr><td>⚙️ AI 设置</td><td>练枪场主面板 → 滚到底部 → AI 设置</td><td class="rkb hot">4 步+注册门槛</td><td>❌ 需自行去智谱开放平台注册领 Key 再粘贴；入口极深</td></tr>
<tr><td>⚙️ 识别设置</td><td>拍题界面 → 识别设置</td><td class="rkb warn">4 步</td><td>✅ 三选一：AI 识别（要 Key）/ 本地免费识别 / 自定义接口</td></tr>
</table>
</div>

<h2>四、使用率最低的功能 · 结论与依据</h2>
<div class="card">
<div class="note">判断方法：单机游戏没有埋点，所以用「<b>入口可达性 × 前置条件 × 试玩观察</b>」三层证据推断使用率。一个功能要有人用，先得能被<b>打开</b>，再得能被<b>发现</b>，最后不能有太高的<b>前置门槛</b>。</div>

<h3>🥇 第一：🔭 引路标 —— 手机端零入口，使用率最接近 0</h3>
<div class="shots">{img("95_guide_lead","按 M 键才调出的「引路标」面板：指向最近目标+12 秒指路")}{img("48_menu_bottom","菜单底部——逐项翻完，没有「引路标」这一项")}</div>
<ul>
<li><b>依据 1（入口归零）</b>：手机端无法打开。菜单三套文案（闯关/史诗/烽火）里的入口已被移除，战术地图底部的入口也移除了 —— 整个游戏只剩 <span class="path">PC 键盘 M 键</span> 一条路。</li>
<li><b>依据 2（设备错配）</b>：学生主力设备是手机，<b>手机没有键盘</b> → 这个功能对手机学生而言等于不存在。</li>
<li><b>依据 3（试玩现象）</b>：菜单 19 项逐一试过一遍（截图 46/47/48），全程找不到它；只在主动按 M 后弹出。电脑玩家也要先翻"键位说明"才知道有 M 键。</li>
<li><b>补充</b>：功能本身有用（东南方向、约 5 步、还剩 65 个目标，还能"指路 12 秒"），属于「好用但够不着」的典型。</li>
</ul>

<h3>🥈 第二：🤖 AI 详解 / 📷 拍题 —— 配置门槛 + 引导断链</h3>
<div class="shots">{img("89_drill_answer","练枪场答完后出现「🤖 AI 详解（智谱 GLM）」按钮")}{img("90_ai_noKey","点击后提示「点下面 AI 设置」——但下方没有这个按钮")}</div>
<ul>
<li><b>依据 1（使用前提苛刻）</b>：要学生自己去智谱开放平台注册账号、领 API Key、再回到游戏粘贴。对高三学生，这层技术门槛劝退了绝大多数人。</li>
<li><b>依据 2（引导断链·实测）</b>：未配 Key 时点"AI 详解"，提示"点下面「⚙️ AI 设置」填一个就能用"—— 但该按钮<b>不在当前界面</b>。真实入口藏在：退出答题 → 练枪场主面板 → 滚到最底部。</li>
<li><b>依据 3（入口窄）</b>：AI 详解按钮只出现在练枪场/错题重练的答题后，<b>闯关主世界的石碑/精灵答题完全没有</b>；拍题入口则藏在错题中心里。</li>
</ul>

<h3>🥉 第三：⏳ 时空交易所 —— 跨世界前置，绝大多数人打不开交易</h3>
<div class="shots">{img("57_aid","时空交易所：星尘 0 时只能看商品不能兑换")}</div>
<ul>
<li><b>依据</b>：兑换货币"时间星尘"<b>只能通过玩科学编年史获得</b>（读卷宗 +5、考题 +8）。只玩闯关/练枪的学生打开它时永远是"0 星尘"，看不到任何可执行动作。</li>
<li><b>试玩现象</b>：面板上写了完整的解释文案（"你现在不在编年史里——券照样能兑换"），但没有任何"去哪赚星尘"的直达入口。</li>
</ul>

<h3>附：条件性低频（属设计限定，不算缺陷）</h3>
<ul>
<li><b>🗺️ 战术地图</b>：只对"已部署过"的烽火玩家有意义，新手打开是空态提示（截图 68）。</li>
<li><b>🎛️ 战场底纹</b>：烽火专属视觉开关，实际使用取决于玩家是否在意画面简洁度。</li>
<li><b>⌨️ 电脑端键位</b>：手机端不显示（正确适配），使用率低是设计本意。</li>
</ul>
</div>

<h2>五、试玩中观察到的其他现象</h2>
<div class="card">
<div class="shots">{img("46_menu_top","菜单顶部：错题红点自动置顶")}{img("50_studyroom","自习室：73 块知识按薄弱排序")}{img("51_ladder","母题阶梯：11 个模型三级")}{img("52_drill","练枪场：四科 73 专题 + 攻坚 37 题")}</div>
<ul>
<li><b>错题闭环顺畅</b>：答错 → 自动收录 → 菜单顶部红点"🔥 今日待复习 3 题" → 点开直接练。全程不用手动记。</li>
<li><b>三个学习模块同源</b>：自习室、母题阶梯、练枪场共用"🧭 先选思路 → 再选答案"两步答题引擎，进入后界面统一（顶栏都写"🎯练枪·📐数学"），学习成本只花一次。</li>
<li><b>双端适配到位</b>：手机提示"在屏幕上按住拖动即可移动"、电脑提示"WASD/点地图走过去"，键位说明也只对电脑显示——两套文案随设备自动切换，试玩验证无误。</li>
<li><b>失败文案有温度</b>：精灵没收服时写"它跑掉了…别灰心，石碑那边再练几题就会了"，给台阶下。</li>
<li><b>编年史内容质量高</b>：卷宗是正经科学史短文（伊尚戈骨、"五不会消失"），对高三学生有额外的作文素材价值。</li>
<li><b>开场信息量偏大</b>：首次打开会连弹「更新公告」+「玩法说明」两层，合计要滑 3 屏以上才能进地图。内容都有用，但"急着刷题"的学生可能直接点×。</li>
</ul>
</div>

<h2>六、改进建议（对齐使用率最低的三名）</h2>
<div class="card">
<ul>
<li><b>1. 给「引路标」补一个手机入口</b> —— 最省事的做法：菜单里加回一项（放"当前目标"旁边）；或者小地图旁边放一个小按钮。现在手机端等于删了这个功能。</li>
<li><b>2. 修「AI 详解」的引导断链</b> —— 提示文案旁边直接放可点的「⚙️ AI 设置」按钮，让"想用 → 去配置"一步到位；设置里既然有免费模型（GLM-4-Flash），也可以把"免费额度"写得更醒目。</li>
<li><b>3. 给「时空交易所」加一个星尘来源直达</b> —— 0 星尘时显示"去编年史读一篇 +5 ✨"按钮，一键跳过去。</li>
<li><b>小项</b>：开场两层弹窗可合并为"公告里加一行'玩法速览'折叠"，减少进图前的滑动量。</li>
</ul>
</div>

<footer>试玩时间：2026-10-12 晚 · 版本：数境169.html（本地最新版 1.90 MB）· 过程截图 88 张，本报告内嵌 16 张 · 由 AI 以学生身份实机操作记录</footer>
</div></body></html>
"""

open(OUT,"w",encoding="utf-8").write(HTML)
print("OK",OUT,os.path.getsize(OUT)//1024,"KB")
