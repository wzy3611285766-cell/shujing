/* =========================================================
   调试角标（URL 带 ?dbg=1 才出现）
   ---------------------------------------------------------
   实机上排查「为什么这台设备卡」的第一现场：平板、手机浏览器里没有 devtools，
   看不到 devicePixelRatio、后备画布多大、一帧到底花了几毫秒。
   这个角标把这几个数直接摆到屏幕上，一眼就能分辨是
   「每帧超预算」（该降分辨率）还是「被系统/浏览器限了刷新率」（该去改设置）。

   只在 ?dbg=1 时创建，正常玩家什么都看不到：
   元素和样式都在这里从 JS 注入，不占 HTML / CSS 模块，不要了整块删掉即可。

   读数说明（配合 src/js/36_loop.js 里的 PERF）：
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
      (panelOpen()?'面板开':'面板关')+(IS_PC?' · PC':'');
  },500);
})();
