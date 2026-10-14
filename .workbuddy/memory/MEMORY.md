# 数境项目 · 长期约定

## 产品
单文件 HTML 答题闯关游戏：`C:\Users\Lenovo\Desktop\数境\数境169.html`（约 1.8 MB，2.5 万行）。
用户是高三学生（内蒙包头八十一中，总分 550 上下），拿它当**碎片化补知识点 + 刷母题**的工具。
四个世界：闯关 / 科学编年史 / 烽火地带 / 练枪场。

## 四国与传送（2026-10-14 起 ＝ 四国并联）
- 闯关（ADV）里是四个国度：`math` 数理群岛 / `phys` 力理亚 / `chem` 嬗变利亚 / `bio` 生衍利亚，
  一科一国、一国一张独立地图（`NATIONS` 定义在 `11_world.js`；理化生三国由 `23_nations_3.js` 批量建）。共 14 个域。
- **四国完全并列，没有任何先后依赖**（2026-10-14 改的，删掉了 `nationUnlocked()`）。
  **不要再引入「先通关上一国」这类顺序锁。**
- 入口三个（都是同一个面板 `showNationPortal()`）：☰ 菜单 🌀 传送阵 · 顶栏 🌍 国度 · 点顶栏那颗区域名。
- 核心函数全在 `57_multination.js`：`goNationStart(id)`（前往某国出生域，本国也能用＝回到出生域）、
  `switchNation(id, atStart)`（完整切换：存盘→换图→buildStatic→落镜头；atStart=true 落出生域）、
  `useNation(id)`（只换图 + 取该国坐标）、`goTotem(nid,tid)`（跳到已点亮的塔）、`totemOn(tid)`。
- 不卡死的三条保证：① 切过去落地自动点亮该国第一座塔；② 离开前该国一座塔都没亮就先给它留一盏；
  ③ 面板永远列出四国入口。**动这三条之前先想清楚"回不去"的死局。**
- 域之间仍按徽章开桥（`BRIDGES[].need`）——那是"一国之内怎么走"，与国家顺序无关，别混为一谈。

## 改之前必须先摸清的（同名覆盖极多）
- 两个 `showMenu` 模板（搜 `id="mStudy"` 会命中两处），加菜单项要**两处都加**，
  绑定也两处都加 → 用 `Edit` 的 `replace_all`。
- 题库三类容器：`BANK[rid][tier]`（闯关，元素是 thunk `()=>Q(...)`）、
  `BIG`（多步大题，`QB({...})`）、`HARD`（攻坚，`QH({...})`）。
  `QB`/`QH` 会自动进 `BIG`；`QL` = `QB` + 阶梯标签。
- 绘图原语：`svgWrap/fL/fR/fC/fE/fT/fPath` + `mkAx`。颜色用 `FC`，实验图另加 `GC`。
  **不要引入外部图片或联网**——运行时纯离线。

## 硬约定（踩过坑）
1. **题干/解析里禁止 Markdown `**`**，游戏是纯文本渲染，会原样显示。用「」代替。
2. **画实验图必须先推原理再落笔**：量筒仰视偏小（滴定管相反）、加热液体管口向上 45°／
   加热固体管口向下、蒸馏冷凝水下进上出、过滤漏斗口紧靠烧杯内壁。
   第一版凭印象画，被用户当场指出科学性错误。
3. **离图域**（`therm/optic/lab/plab`，不在地图上开区）的题：
   加一个就必须同步四处——`BANK` 初始化列表、`DRILL_RIDS[科目]`、`DRILL_TOPICS`、`OFFMAP_NAME`。
   漏了 `OFFMAP_NAME` 或 groupHtml 的 extra 段，题会"做进去了却点不到"。
4. **长关键词优先**：`topicBest` 取命中关键词最长者。`plab` 的关键词要写全称
   （"验证牛顿第二定律"），且 `DRILL_RIDS.phys` 里 `plab` 必须**排最前**
   （`topicOfSid` 按顺序返回第一个命中的域）。
5. 写完任何题，**必须跑一遍知识点探针**（见下），确认新 `k` 值有归属。

## 自测流程（CDP，脚本在 `../.tmp_shot/`）
- `_shotfig.py <out>` 在真实游戏里渲染全部图形函数并截图 → 看有没有画崩。
- `_shot_ui2.py` 截菜单/面板/答题界面（**要点：关掉 `#news` 公告层；switchTo 与 openPanel
  要写在同一次 evaluate 里**，分开调用会被世界切换流程把面板关掉）。
- `_probe.py` 全量知识点归属探针（当前应 **121/121**）。
- `_test_lad.py` 阶梯结构校验（三级齐全 / 4 选项 / 答案在选项内 / 提示≥3 / 步骤≥3 / 有无重复）。
- 语法：抽出最大的 `<script>` 存成 `_check.js`，跑 `node --check`。
- 放大复核用 `deviceScaleFactor:3` 单卡渲染——**只看缩略图会漏掉文字重叠、元素压盖**。

## 试玩/自动化（`.tmp_play/_play.py`，动作 JSON 驱动）
- 动作：tapel(#id) / taptxt(文本) / tapxy / swipe / joy(摇杆) / eval / shot / state。截图在 `.tmp_play/shots/`。
- 视口参数：`--landscape`(932×430) / `--size=WxH` / `--fullintro`(不跳开场) / `--keep`(不清档)；
  **可串联多个动作 JSON**（同一 run 内跑完，因为 headless 不持久）。
- **必须 setTouchEmulationEnabled(maxTouchPoints:5)**，否则 IS_PC=true 全是 PC 版 UI（多"电脑端键位"、WASD 提示条）。
- **每次运行=全新加载**（headless 不持久）：完整流程必须单次运行内跑完；快速就绪 =
  写 `genji_news=v4.0-1012` + `genji_v1_intro=1` 后 reload。合成 click() 不可信，一律真实触摸事件。
- 触屏移动 = 按住拖动（摇杆）；"点地图走过去"是 PC 行为。答题变量 q/opts 在闭包内，外部读不到答案。
- 快速传送：`state.x=SPOTS.filter(s=>s.t==='stele')[0].x` 直接改坐标；练枪场用 `switchTo(DRILL)` + `DRILL_SPOTS[0]`。

## 横屏布局（169 版已内置）
- 规则在 `数境169.html:1581`：`@media (orientation:landscape) and (max-height:560px)` ——
  **平板横屏（高 768/1024）不走这套**，手机横屏才拆两栏。
- 答题面板 `.panel:has(> .qtext):has(> .opts)` 左题面/右作答；菜单/图鉴/自习室/烽火大厅等网格也变两列。
- 横屏可视面板高 ≈408px（屏高 430），竖屏 ≈801px（屏高 932）——横屏一屏只有竖屏的 51%。
- **已知待修 3 处**（2026-10-12 横屏试玩实测，详见 `汇报/数境169_横屏试玩报告_2026-10-12.html`）：
  1. `#scrollTip` 挂屏幕不挂面板（`bottom:12px`），横屏面板吃满高度后压住底部按钮（烽火「部署行动」实测重叠）；
  2. 练枪第一步/第二步面板比可视区高 18/32px，底部按钮只露上半截；
  3. 答完题不自动滚到解析（`panel.scrollTop` 仍为 0），只看得到选项变色。
- 横屏优势：顶栏快捷入口 7 个全可见（竖屏只剩 ☰）；答题面板 803→245px；图鉴需滚动 1718→1077。

## 渲染结构（2026-10-13 性能优化后，改 draw/buildStatic 前必读）
- **地形不再是每帧 blit**：静态地图画进 DOM 里的 `<canvas id="bg">`（世界尺寸 2400×1900），
  每帧只写 `syncBgTransform()` → `translate3d(tx,ty,0) scale(SCALE)`，位移**吸附到整数设备像素**
  （2026-10-14 起：`Math.round(-cam.x*SCALE*rd)/rd`，rd = 真实 devicePixelRatio，不是被降级的 DPR）。
  世界坐标 (wx,wy) → 屏幕 ((wx-cam.x)*SCALE, (wy-cam.y)*SCALE)，两边公式必须一致，否则错位。
  `#game` 必须有 `position:relative;z-index:1`，否则会被定位的 `#bg` 盖住。
- **画布分辨率是「按像素预算」算的**（`36_loop.js` 顶部 `PIX_BUDGET=1800000`）：
  `DPR=clamp(sqrt(PIX_BUDGET/(VW*VH)),1,min(dpr,2))`。手机 dpr=2 不变；12 寸平板会落到 dpr≈1.14。
  **改这块要想到**：`draw()` 兜底分支按 `SCALE*DPR>=1` 决定关不关平滑；`#bg` 的吸附必须用真实 dpr。
- **`loop()` 里不再直接调 draw()**：走 `paceProbe(dt)` + `paceDraw(now)` —— 面板/公告打开时不画、
  并且按 vsync 整数倍抽帧（`PERF.multi`，144Hz → 144/72/48/36/24）。**如果以后有面板内的东西
  依赖地图每帧刷新，得先想到这里**；`PERF.*` 同时是 `?dbg=1` 角标的数据源。
- `draw()` 里保留了兜底分支：`staticLayer===bgCv` 时走老的一次性 blit + 关双线性（倍率≥1 才关）。
- 性能基线（软件光栅+CPU×6 弱机模拟）：竖屏 菜单 56fps / 答题 54fps / 地图 ~17fps；
  平板横屏 1400×984@dpr2 地图 9fps → 改完 15~16fps（这台模拟机复现不出 GPU 合成，只能比比例）。

## 性能排查方法（下次直接复用）
- **PC headless 有巨大余量（144fps），测不出卡顿** → 必须 `--disable-gpu` + `Emulation.setCPUThrottlingRate(6)`。
- 逐项 A/B 用轮询多轮取最小值（最小对计时最稳）；单次顺序测量会有漂移，会得出"关掉反而更慢"的假结论。
- 已知结论：全屏位图 blit 的成本**只取决于要不要重采样**，与贴多大面积无关。
  平移取整、只贴可视区都没用；预缩放 1:1 + 整数偏移、或关 imageSmoothing，都能快 4.5 倍。
- 探针：`.tmp_play/_perf2.py`（A/B）、`_perf_final.py <html> [标签] [--land]`（前后对比）、
  **`_perf_dev.py <html> <标签> [--phone|--tab|--tabp]`**（分设备档位：手机 430×932@2 / 平板横屏 1400×984@2 /
  平板竖屏；多轮取最好用 `set REPS=3`；末尾还会把 DPR 强改回 2 做隔离实验）。
  `_play.py` 支持 `--file=<路径>` 跑任意版本；`_diag.py` 逐秒打印 PERF 读数并可 `--shot=`。
- ⚠️ 三个坑（2026-10-14 踩过）：
  1. **跳过公告必须用页面自己的 `NEWS_KEY`/`NEWS_VER`**（写死旧值 → 公告照样弹，而公告打开时
     `draw()` 根本不跑，测出来全是假数据：9fps 其实是"什么都没画"）；要关它就直接调 `hideNews()`。
  2. **CDP 脚本不能并行跑**（同 PORT + 同 user-data-dir 会互相抢）。
  3. **调试端口必须每次现取**（脚本里的 `_free_port()`）：写死端口时，上一轮那个 Chrome 还活着占着它，
     新进程 bind 失败、`urlopen` 却照样有响应 —— CDP 于是接到**旧页面**上，测什么都是上一轮的状态
     （"全新存档里带着上一轮的四国进度"就是这么来的，白折腾三轮）。profile 目录也要每次唯一，
     否则同一个 `--user-data-dir` 会被并进旧实例。
- 功能验收脚本：`_test_nations.py`（四国并联 34 项，含截图）、`_shot_portal.py <html> <out.png> [--visit=phys] [--menu]`
  （拍传送面板/菜单，新旧版本都能拍，用于前后对比）、`_probe_totem.py`（盯 state.totems 的时序）、
  `_shot_html.py <html> <out.png>`（任意 HTML 拍长图）。
- Windows 控制台是 GBK：脚本里打印 emoji 一律先 `sys.stdout.reconfigure(encoding='utf-8',errors='replace')`
  （`check.py` / `smoke.py` / `_imgcheck.py` 都补了这条）。`sys.path` 里的 python 需要 `websocket-client`。

## 云存档 / 账号（2026-10-13 接入）
- **权威副本是 `shujing-app/index.html`**（工作区内），桌面 `数境169.html` 是它的同步副本。
  改完要 `cp shujing-app/index.html "C:/Users/Lenovo/Desktop/数境/数境169.html"`。
- 线上地址 `https://shujing.app.workbuddy.host/`，云服务应用 `wbapp_5b1uGj28EZC4FoiTkHB5Do`；
  数据表 `saves`（一个账号一行，`payload` 存整包存档 JSON）。重新发布用同一个 directory 即可，域名不变。
- **登录只在发布域名下生效**：`cloudWhy()` 会拦住 file:// 和非发布域名，那种情况下不加载 SDK。
- SDK 走 CDN（`@tencent-ai/workbuddy-cloud-sdk@dev` 的 `index.global.js`），
  全局名 `WorkBuddyCloud`；初始化必须带 `endpoint` + `oauthRelayBaseUrl` + `publishableKey`。
- `save` 被包装过（挂存档时间戳 + 脏标记），同步键前缀 `genji_`/`himath_`，
  本机元数据前缀 `shujing_`（不同步）。覆盖前备份 `shujing_prev_local`。
- **RLS 铁律（踩过坑）**：这个环境里 `auth.uid()` 对匿名调用返回字符串 `'anon'` 而不是 NULL，
  所以 `owner_id = auth.uid()` 挡不住匿名用户。用户私有数据的策略与 GRANT **一律只给 `authenticated`**，
  绝不要按文档默认连 `anon` 一起给。`db_list_rls` 的 `Roles` 字段恒为空，只能靠真实请求验证权限。

## 线上托管状态（2026-10-12 核查）
资料库"数境169"页面（hWngQZSZFLta3R55vGXGiA）的编辑态+发布态仍是**旧版 1.64MB**，
缺 169 新版 30 个函数（母题阶梯/自习室/实验图等）→ 需要重新导入发布。
试玩分析报告已入库：`ZBF02fkS32meUegYE5BKIl`；横屏试玩报告：`r73SBniIjcNVMZX4SsPYLo`。
空间 ID `ZHGSE4MSfca6qGzIOOmvxi`（个人空间根目录）。
- 坑：library 的图片自检 grep 会**误报** base64 大文件（正则把 base64 里的 `//` 当外链）。
  用 `汇报/_imgcheck.py` 精确校验 `<img>` 的 src/srcset 取值。

## 汇报要求（用户明确提的）
每次更新完，**生成一份带实机截图的 HTML 汇报**（`汇报/` 目录，图片 base64 内嵌成单文件），
里面要说清"新东西在游戏里的哪个入口"。用户嫌每次打开游戏找太慢。

## 现状（2026-10-11）
闯关题库 572 · 多步大题库 158 · 攻坚题 37 · 母题阶梯 11 模型 / 33 题 ·
实验图 13 张 · 测验探针 121/121。
