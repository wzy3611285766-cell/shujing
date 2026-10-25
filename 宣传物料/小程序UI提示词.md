# 小程序玻璃拟态 UI 提示词（微信小程序可用版）

> 来源：数境 H5 的真实设计令牌（三层玻璃拟态），已按微信小程序做了适配：
> 镜面层用多背景叠加替代伪元素（Skyline 安全）、hover-class 按压态、
> 同层渲染 canvas 上的模糊红线。直接整段投给 AI 即可。

```text
角色：你在为微信小程序写一套深色玻璃拟态（glassmorphism）游戏 UI，夜航主题：
底色 #0d1b2a 深海军蓝，UI 压在游戏地图 canvas 之上。严格按下面的令牌和规则写
WXSS/WXML，颜色与透明度不许自由发挥，尺寸单位一律 rpx。

【设计系统：三层玻璃】
每颗按键/卡片 = 三层叠加：
  ① 底面：半透明渐变玻璃
  ② 边缘：上亮下暗两道发丝线（模拟玻璃厚度）
  ③ 高光：一道自上而下衰减的镜面渐变 —— 用【多背景叠加】实现
    （background-image 第一层在最上），不用伪元素、不用负 z-index，
    WebView 与 Skyline 两种渲染器都稳。

【令牌（写在 page{} 里）】
--gb-face:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.08));     /* 浮层内白玻璃 */
--gb-face-deep:linear-gradient(180deg,rgba(24,46,74,.82),rgba(10,24,40,.72));      /* 压在地图上的深蓝玻璃 */
--gb-edge-hi:inset 0 1rpx 0 rgba(255,255,255,.18);
--gb-edge-lo:inset 0 -1rpx 0 rgba(0,0,0,.34);
--gb-hair:0 0 0 1rpx rgba(255,255,255,.10);
--gb-drop:0 2rpx 4rpx rgba(0,0,0,.34),0 16rpx 40rpx -20rpx rgba(0,0,0,.55);
--gb-sheen:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.04) 42%,rgba(255,255,255,0) 62%);
--gb-press:inset 0 4rpx 12rpx rgba(0,0,0,.40);
--gold:#ffd76a;
文字：主 #eaf4ff / 次 #9cc0e0 / 弱 #8fb4d6；正确 rgba(52,199,123,*)；危险 rgba(255,107,107,*)。

【胶囊按钮 .btn】
border-radius:999rpx；font-weight:600；color:#eaf4ff；
background-image:var(--gb-sheen),var(--gb-face);   /* 镜面层叠在玻璃底之上、文字之下 */
box-shadow:var(--gb-edge-hi),var(--gb-edge-lo),var(--gb-hair),var(--gb-drop)；
transition:transform .12s ease-out,filter .15s,box-shadow .15s。
按压态用 hover-class="pressed"：transform:scale(.96);filter:brightness(.96);
  box-shadow:var(--gb-press),var(--gb-hair);
禁用态 opacity:.4。图标键：正方形（只有 emoji，无文字）。

【金色主键（每屏至多一颗）】
background-image:var(--gb-sheen),
  radial-gradient(circle at 50% 116%,rgba(255,255,255,.30),transparent 60%),
  radial-gradient(122% 122% at 30% 16%,#FFE39A 0%,#FFD76A 30%,#F5A623 62%,#B3651A 100%);
box-shadow:inset 0 1rpx 0 rgba(255,255,255,.42),0 0 0 1rpx rgba(255,214,110,.42),
  0 16rpx 44rpx -16rpx rgba(245,159,43,.55);文字用深色。

【反馈状态玻璃】
正确：linear-gradient(180deg,rgba(52,199,123,.36),rgba(52,199,123,.22))，描边 0 0 0 1rpx rgba(110,231,183,.42)
错误：linear-gradient(180deg,rgba(255,107,107,.32),rgba(255,107,107,.20))，描边 0 0 0 1rpx rgba(255,138,128,.42)

【性能红线（必须遵守）】
1. 压在【持续重绘的画面】（canvas/视频/轮播）上的按钮、chip、HUD：禁止 backdrop-filter，
   一律用 --gb-face-deep（不透明度 ≥.72 的同色渐变）撑质感。
   小程序里 canvas 2d 是同层渲染原生组件，iOS 上 backdrop-filter 对它经常
   不生效或表现异常 —— 这条红线在两头都成立。
2. 只有【WebView 渲染】下背景静止的全屏浮层才允许 backdrop-filter:blur(32-48rpx)
   saturate(180%)，同屏最多一层。
3. 长列表滚动区内的任何元素禁止 backdrop-filter（滚动时每帧全屏重算模糊）。

【渲染器与组件注意】
1. 默认 WebView 渲染：以上全部可用。
2. 若 app.json 开了 Skyline 渲染（renderer:"skyline"）：backdrop-filter 支持不完整，
   本系统按红线写法（模糊只出现在可选的浮层）本就不依赖它；镜面层已是多背景叠加，
   无伪元素、无负 z-index，Skyline 安全。
3. 自绘按键一律用 view + hover-class，不用原生 button 组件 —— 它自带默认样式和
   ::after 边框；实在要用先 button::after{border:none} 剥干净。
4. CSS 变量放 page{}；描边一律 1rpx 发丝线，不用 2rpx；emoji 直接当图标，不用图标库。
5. 全局 -webkit-tap-highlight-color:transparent、user-select:none（输入框单独放开）。

【交付】
输出：① app.wxss / page.wxss（令牌 + .btn + .btn-gold + .chip + .panel + .pressed 按压态）；
② 示例 WXML：顶栏（两颗 chip + 图标键）+ 一颗金色主键 + 一个面板卡片；
③ 每条规则注释标明对应三层玻璃的哪一层，性能红线单独注释在浮层与 chip 上。
```
