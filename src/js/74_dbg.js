/* =========================================================
   帧率显示 —— 两个版本，别混
   ---------------------------------------------------------
   ① 玩家版（4.0.11 起）：#fps，**右上角一行**，☰ 菜单 → 帧率角标 开关，
      开关记在本机。4.0.20 起**默认开着**（玩家要求：一直看得见，想关再去菜单关）。
      一行就两个数：渲染 fps · 每帧耗时 ms。
      每帧耗时超过这一档的预算时变黄 —— 那一格才是"该降画质了"的信号。
   ② 诊断版：URL 带 ?dbg=1 时的 #dbg，屏幕左侧六行。
      实机上排查「为什么这台设备卡」的第一现场：平板、手机浏览器里没有 devtools，
      看不到 devicePixelRatio、后备画布多大、一帧到底花了几毫秒。
      它把这几个数直接摆到屏幕上，一眼就能分辨是
      「每帧超预算」（该降分辨率）还是「被系统/浏览器限了刷新率」（该去改设置）。

   两个版本共用一个数据源（src/js/36_loop.js 里的 PERF），读数说明：
     屏 1400×984 dpr2  —— CSS 视口 · 设备像素比
     画布 1600×1125    —— 后备画布实际像素 = 每帧要光栅化的量
     节拍 144Hz 抽2    —— 实测 rAF 节拍 · 每几个 vsync 出一帧。
                          注意它是「实测到的最小帧间隔」：屏幕是 120/144Hz
                          但机器跟不上时，这里会读到 30/60Hz 这种非标准值，
                          角标会打个问号 —— 那不是屏幕变慢了，是这台机器跑不满。
     渲染 71.6fps      —— 真正 draw() 的频率
     rAF 72fps         —— 浏览器回调频率（明显低于「节拍」就是主线程被拖住了）
     每帧 8.4ms/13.9ms —— 主线程耗时 / 这一档的预算，超了就该降档
     迟到 3/30         —— 本批评里迟到的帧数
   ========================================================= */

/* ---------- ① 玩家版：右上角一行 ---------- */
/* 【4.0.20】默认**开**（原来默认关）。
   玩家的要求很合理：右上角一直显示，想关再去 ☰ 里关。
   实现上分两种情况，别把人手动关掉的又打开：
     · 本机没存过这个键（首次进来）→ 开
     · 存过 '1' / '0' → 照存的来（关过的人不会被翻回来）
   无痕模式读不到 localStorage（抛异常）→ 也当"首次"，开。 */
const FPS_KEY='genji_fps';
function fpsBadgeOn(){
  try{
    const v=localStorage.getItem(FPS_KEY);
    return v===null?true:v==='1';
  }catch(e){return true;}
}
let fpsEl=null,fpsTimer=null,fpsT0=0,fpsD0=0;
/* fps 传 null 表示"还没攒够一个统计窗口"—— 那种时候只画每帧耗时。
   一开开关就先摊个空壳、等半秒才有字，看着像坏了。 */
function fpsBadgePaint(fps){
  if(!fpsEl)return;
  const work=Math.round(PERF.work*10)/10;
  const budget=PERF.vs*PERF.multi;
  fpsEl.textContent=(fps==null?'—':fps)+'fps · '+work+'ms';
  /* 超预算才变黄：一直是绿色等于没信息，变黄才是"该降一档了" */
  fpsEl.style.color=(budget>0&&work>budget)?'#ffd76a':'#bfe9ff';
}
function fpsBadgeTick(){
  if(!fpsEl)return;
  const now=performance.now(),ms=now-fpsT0;
  if(ms<=0)return;
  const fps=Math.round((PERF.drawn-fpsD0)*1000/ms);
  fpsT0=now;fpsD0=PERF.drawn;
  fpsBadgePaint(fps);
}
function fpsBadgeApply(){
  /* 关掉时元素和计时器一起拆掉 —— 不留一个每秒跑两次的定时器 */
  if(fpsBadgeOn()){
    if(!fpsEl){
      if(!document.getElementById('fpsStyle')){
        const st=document.createElement('style');
        st.id='fpsStyle';
        st.textContent='#fps{position:absolute;right:calc(var(--safeR) + 10px);'+
          'top:calc(var(--safeT) + var(--upH) + var(--topH) + 6px);z-index:34;'+
          'pointer-events:none;font:700 10.5px/1.4 ui-monospace,Consolas,monospace;'+
          'white-space:nowrap;color:#bfe9ff;background:rgba(4,12,24,.62);'+
          'border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:3px 9px;'+
          'letter-spacing:.3px;transition:color .3s}';
        document.head.appendChild(st);
      }
      fpsEl=document.createElement('div');
      fpsEl.id='fps';
      appEl.appendChild(fpsEl);
      fpsT0=performance.now();fpsD0=PERF.drawn;   // 先取基准，第一格才不会算出天量 fps
      fpsBadgePaint(null);                        // 先把每帧耗时摊出来，fps 半秒后再填
    }
    if(!fpsTimer)fpsTimer=setInterval(fpsBadgeTick,500);
  }else{
    if(fpsTimer){clearInterval(fpsTimer);fpsTimer=null;}
    if(fpsEl){fpsEl.remove();fpsEl=null;}
  }
}
function setFpsBadge(v){
  try{localStorage.setItem(FPS_KEY,v?'1':'0');}catch(e){}
  fpsBadgeApply();
}
/* 开场按上次的选择恢复（默认关） */
fpsBadgeApply();

/* ---------- ② 诊断版：?dbg=1 ---------- */
(function(){
  let on=false;
  try{on=new URLSearchParams(location.search).get('dbg')==='1';}catch(e){}
  if(!on)return;
  const st=document.createElement('style');
  st.textContent='#dbg{position:absolute;left:6px;top:50%;transform:translateY(-50%);z-index:34;'+
    'pointer-events:none;font:600 10px/1.5 ui-monospace,Consolas,monospace;white-space:pre;'+
    'color:#dff0ff;background:rgba(4,12,24,.66);border:1px solid rgba(255,255,255,.16);'+
    'border-radius:8px;padding:5px 7px}';
  document.head.appendChild(st);
  const el=document.createElement('div');
  el.id='dbg';
  appEl.appendChild(el);
  /* 半秒刷一次就够了：角标自己每帧写 DOM 会反过来影响要测的东西 */
  let t0=performance.now(),d0=PERF.drawn,k0=PERF.ticks;
  setInterval(function(){
    const now=performance.now(),ms=now-t0;t0=now;
    const round1=v=>Math.round(v*10)/10;
    const fps=round1((PERF.drawn-d0)*1000/ms);
    const raf=round1((PERF.ticks-k0)*1000/ms);
    d0=PERF.drawn;k0=PERF.ticks;
    /* 节拍不是 60/90/120/144/165 这种常见值时打个问号：
       那是「这台机器跑不满屏幕」，不是「屏幕就这么慢」——
       光看数字容易得出相反结论。 */
    const odd=PERF.hz&&[50,60,90,120,144,165].indexOf(PERF.hz)<0;
    el.textContent=
      '屏 '+VW+'×'+VH+' dpr'+(window.devicePixelRatio||1)+'\n'+
      '画布 '+cv.width+'×'+cv.height+'\n'+
      '节拍 '+(PERF.hz||'?')+'Hz'+(odd?'?':'')+' 抽'+PERF.multi+'\n'+
      '渲染 '+fps+'fps rAF '+raf+'\n'+
      '每帧 '+round1(PERF.work)+'ms/预算 '+round1(PERF.vs*PERF.multi)+'ms\n'+
      '迟到 '+PERF.miss+'/'+PERF.n+' 缩放'+SCALE.toFixed(3)+'\n'+
      (panelOpen()?'面板开':'面板关')+(IS_PC?' · PC':'')+'\n'+
      /* 上一次答题：从"写入反馈"到"反馈真的画到屏幕上"隔了多久（4.0.21）。
         真机上如果这一格是几百毫秒，就是"按下去停一下才变色"的现场证据。 */
      '答题反馈 '+(window.__ansGap==null?'—':window.__ansGap+'ms');
  },500);
})();
