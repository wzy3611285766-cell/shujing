# 数境项目 · 长期约定

## 产品
单文件 HTML 答题闯关游戏：`C:\Users\Lenovo\Desktop\数境\数境169.html`（约 1.8 MB，2.5 万行）。
用户是高三学生（内蒙包头八十一中，总分 550 上下），拿它当**碎片化补知识点 + 刷母题**的工具。
四个世界：闯关 / 科学编年史 / 烽火地带 / 练枪场。

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
  每帧只写 `syncBgTransform()` → `translate3d(-cam.x*SCALE, -cam.y*SCALE,0) scale(SCALE)`。
  世界坐标 (wx,wy) → 屏幕 ((wx-cam.x)*SCALE, (wy-cam.y)*SCALE)，两边公式必须一致，否则错位。
  `#game` 必须有 `position:relative;z-index:1`，否则会被定位的 `#bg` 盖住。
- `loop()` 里有 `if(!panelOpen()&&!newsIsOpen())draw();` —— 面板打开时不重画地图。
  **如果以后有面板内的东西依赖地图每帧刷新，得先想到这里。**
- `draw()` 里保留了兜底分支：`staticLayer===bgCv` 时走老的一次性 blit + 关双线性（倍率≥1 才关）。
- 性能基线（软件光栅+CPU×6 弱机模拟）：竖屏 菜单 56fps / 答题 54fps / 地图 ~17fps。

## 性能排查方法（下次直接复用）
- **PC headless 有巨大余量（144fps），测不出卡顿** → 必须 `--disable-gpu` + `Emulation.setCPUThrottlingRate(6)`。
- 逐项 A/B 用轮询多轮取最小值（最小对计时最稳）；单次顺序测量会有漂移，会得出"关掉反而更慢"的假结论。
- 已知结论：全屏位图 blit 的成本**只取决于要不要重采样**，与贴多大面积无关。
  平移取整、只贴可视区都没用；预缩放 1:1 + 整数偏移、或关 imageSmoothing，都能快 4.5 倍。
- 探针：`.tmp_play/_perf2.py`（A/B）、`_perf_final.py <html> [标签] [--land]`（前后对比）。
  `_play.py` 支持 `--file=<路径>` 跑任意版本。

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
