/* =========================================================
   输入：浮动虚拟摇杆
   —— 手指按在地图任意位置，摇杆就在那儿出现
   —— 同时监听 pointer / touch / mouse 三套事件，任意一套生效即可
   ========================================================= */
const stickEl=document.getElementById('stick'),knobEl=document.getElementById('knob');
const appEl=document.getElementById('app');
const moveVec={x:0,y:0,ang:0,power:0};
let movePointer=null,cx0=0,cy0=0;
/* 摇杆直径由 CSS 的 --stick 决定（随屏幕短边缩放），JS 这里实测后跟着走。
   以前写死 46/22/26，屏幕一小摇杆就变成「手指移一点、人跑老远」。
   HOME_* 是 CSS 里的停靠位（left:14px / bottom:16px），这里同步成常量；
   不能从 getComputedStyle 读 left —— 摇杆被手指带走过之后，读回来的是上次的位置。 */
let STICK_R=46,STICK_HALF=66;
const HOME_L=14,HOME_B=16;
function stickMetrics(){
  const d=stickEl.getBoundingClientRect().width||stickEl.offsetWidth||0;
  if(d>0){
    STICK_HALF=d/2;
    /* 可推动距离 = 底盘半径 − 旋钮半径。旋钮宽度是底盘的 42%（见 #knob），
       半径就是 21%，再留出 2px 内边距，旋钮推到头也压在底盘里面。
       以前写死减 14px，直径一大旋钮就飞出底盘外。 */
    STICK_R=Math.max(20,d*0.5-d*0.21-2);
  }
}

function stickTo(left,top){
  /* 手指按在屏幕最边上时，摇杆中心贴着手指就会有一半跑到屏幕外。
     这里把整个圆盘夹回可视区内（方向判定仍以手指起点为准，不受影响）。 */
  const d=STICK_HALF*2,m=4;
  const maxL=Math.max(m,(appEl.clientWidth||window.innerWidth)-d-m);
  const maxT=Math.max(m,(appEl.clientHeight||window.innerHeight)-d-m);
  stickEl.style.left=clamp(left,m,maxL)+'px';
  stickEl.style.top=clamp(top,m,maxT)+'px';
  stickEl.style.bottom='auto';
}
/* 停靠位要和 CSS 里的写法一致：left 是 safeL + 14px，不是裸的 14px。
   以前漏了安全区，横屏（有刘海/圆角）时摇杆会有一半贴在安全区外面。
   这里直接写 env() 字面量，不去读 --safeL —— 自定义属性是延迟求值的，
   不同浏览器 getPropertyValue 拿回来的可能是原始 token 也可能是算好的值，拼进 calc 有风险。 */
function stickHome(){
  stickMetrics();
  stickEl.style.left='calc(env(safe-area-inset-left, 0px) + '+HOME_L+'px)';
  stickEl.style.top='auto';
  stickEl.style.bottom='calc(env(safe-area-inset-bottom, 0px) + '+HOME_B+'px)';
}
function paintKnob(dx,dy){
  const d=Math.min(Math.hypot(dx,dy),STICK_R);
  const ang=Math.atan2(dy,dx);
  /* 只改 CSS 变量，居中用的 -50% 保留在 CSS 里，不会被覆盖 */
  knobEl.style.setProperty('--kx',(Math.cos(ang)*d).toFixed(1)+'px');
  knobEl.style.setProperty('--ky',(Math.sin(ang)*d).toFixed(1)+'px');
  if(d>7){moveVec.ang=ang;moveVec.power=d/STICK_R;moveVec.x=Math.cos(ang)*(d/STICK_R);moveVec.y=Math.sin(ang)*(d/STICK_R);}
  else{moveVec.x=0;moveVec.y=0;moveVec.power=0;}
}
function release(){
  movePointer=null;moveVec.x=0;moveVec.y=0;moveVec.power=0;
  knobEl.style.setProperty('--kx','0px');
  knobEl.style.setProperty('--ky','0px');
  stickHome();
  stickEl.classList.remove('active');
}
function isUI(target){
  return !!(target&&target.closest&&target.closest('#topbar,#actBtn,#modal,#quest'));
}
function down(x,y,target){
  audioKick();
  if(isUI(target))return;
  /* 记下按下的起点：抬手时用它区分「拖动了」还是「只点了一下」 */
  downPt={x:x,y:y,t:performance.now(),moved:0};
  movePointer='p';
  stickEl.classList.add('active');
  stickMetrics();
  stickTo(x-STICK_HALF,y-STICK_HALF);
  cx0=x;cy0=y;
  paintKnob(0,0);
}
function move(x,y){
  if(!movePointer)return;
  if(downPt)downPt.moved=Math.max(downPt.moved,Math.hypot(x-downPt.x,y-downPt.y));
  paintKnob(x-cx0,y-cy0);
}
/* 抬手：拖过就是摇杆，几乎没动又很快 —— 判定成「点一下走过去」。
   只在电脑端启用：手机上误触太常见，还是老老实实用摇杆。 */
function tapToWalk(){
  if(!IS_PC||!downPt)return;
  const p=downPt;downPt=null;
  if(p.moved>10||performance.now()-p.t>400)return;
  if(panelOpen())return;
  setGoTarget(p.x,p.y);
}

/* --- Pointer Events（现代浏览器） --- */
if(window.PointerEvent){
  appEl.addEventListener('pointerdown',e=>{ if(isUI(e.target))return; e.preventDefault(); down(e.clientX,e.clientY,e.target); },{passive:false});
  appEl.addEventListener('pointermove',e=>{ if(!movePointer)return; e.preventDefault(); move(e.clientX,e.clientY); },{passive:false});
  appEl.addEventListener('pointerup',e=>{ if(movePointer){tapToWalk();release();} });
  appEl.addEventListener('pointercancel',release);
  appEl.addEventListener('pointerleave',e=>{ if(movePointer)release(); });
  window.addEventListener('blur',release);
}else{
  /* --- Touch Events 兜底（老 WebView） --- */
  appEl.addEventListener('touchstart',e=>{
    if(isUI(e.target))return;
    e.preventDefault();
    const t=e.changedTouches[0];
    down(t.clientX,t.clientY,e.target);
  },{passive:false});
  appEl.addEventListener('touchmove',e=>{
    /* 面板里也要能划：以前只看 movePointer，但手指落在面板上时
       本就不该走摇杆逻辑；配合 isUI 一起挡，滚动才不会被 preventDefault 掐掉 */
    if(isUI(e.target))return;
    if(!movePointer)return;
    e.preventDefault();
    const t=e.changedTouches[0];
    move(t.clientX,t.clientY);
  },{passive:false});
  /* touchend 上的 preventDefault 会连 click 一起吃掉（面板按钮就点不动了），
     面板内同样跳过 */
  appEl.addEventListener('touchend',e=>{
    if(isUI(e.target))return;
    e.preventDefault();tapToWalk();release();
  },{passive:false});
  appEl.addEventListener('touchcancel',release);
  /* --- 鼠标（桌面调试） --- */
  appEl.addEventListener('mousedown',e=>{ if(isUI(e.target))return; down(e.clientX,e.clientY,e.target); });
  window.addEventListener('mousemove',e=>{ move(e.clientX,e.clientY); });
  window.addEventListener('mouseup',release);
}

/* =========================================================
   电脑端控制（键鼠）
   —— 手机上不生效，触屏操作一点不受影响
   —— 键位：
        WASD / ↑↓←→    移动（按住 Shift 疾跑）
        鼠标左键点地图  自动走过去（再点别处可随时改道）
        E / F / 空格    互动：石碑 / 精灵 / 物资箱 / 撤离点
        1~4 · A/B/C/D   答题时选选项（面板打开时字母才表示选项）
        Enter / 空格    确认 · 下一题 · 收好
        Esc             关面板（答题过程中锁着，关不掉，这是故意的）
        Tab ☰ 菜单　M 引路标　G 当前目标　H 键位帮助
   ========================================================= */
/* 判定是不是桌面。
   不能只看 'ontouchstart' in window —— 桌面版 Chrome 也把这几个触摸事件的
   处理器属性挂在 window 上，那样会把所有电脑用户误判成手机，键鼠全失效。
   可靠的是这两条：最大触摸点数 > 0（真触屏设备才会是正数），
   以及媒体查询 (pointer:coarse) —— 浏览器对「主指针是不是手指」的官方回答。
   URL 上加 ?pc=1 / ?pc=0 可以手动指定（二合一设备常被误判）。 */
let IS_PC=false;
try{
  let coarse=false, mqOK=false;
  try{
    const mq=matchMedia('(pointer:coarse)');
    mqOK = mq.media!=='not all';
    coarse=!!mq.matches;
  }catch(e){}
  const UA_MOBILE=/Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent||'');
  const HAS_TOUCH=(navigator.maxTouchPoints|0)>0 || (mqOK?coarse:UA_MOBILE);
  const q=new URLSearchParams(location.search).get('pc');
  IS_PC = (q==='1') || ((q!=='0') && !HAS_TOUCH);
}catch(e){ IS_PC=false; }
if(IS_PC&&document.body)document.body.classList.add('pc');

const keys={};
/* 点哪儿走哪儿的目标点（世界坐标） */
let goTarget=null;
/* 按下时的起点，用来区分「拖动摇杆」和「点一下走过去」 */
let downPt=null;

/* 在输入框里打字时不抢按键（存档码那个 textarea 就靠这条） */
function typingIn(el){
  return !!(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.isContentEditable));
}
/* modal / panel 在这段代码之后才声明（const 有暂时性死区），
   包一层 try：万一在初始化途中被调用，也不会整页崩掉 */
function panelOpen(){try{return modal.classList.contains('show');}catch(e){return false;}}
function panelLocked(){try{return panel.dataset.lock==='1';}catch(e){return false;}}
/* 这个按钮现在看得见、点得着吗？
   不能只看 offsetParent —— #app 是 position:fixed，
   它内部所有元素的 offsetParent 一律是 null，那样会误判成"全都不可见"，
   Enter 键就再也点不到任何按钮了。改成先看样式、再看盒子尺寸。 */
function visible(el){
  if(!el)return false;
  try{
    const cs=getComputedStyle(el);
    if(cs&&(cs.display==='none'||cs.visibility==='hidden'))return false;
  }catch(e){}
  if(el.offsetParent)return true;
  try{
    const r=el.getBoundingClientRect();
    if(r.width>0&&r.height>0)return true;
  }catch(e){}
  /* 没有布局引擎的环境（比如被自动化测试跑）退到内联样式判断 */
  return el.style.display!=='none';
}
/* 面板里的主按钮：能继续就继续，否则收好 / 关闭 */
function panelPrimary(){
  const nb=panel.querySelector('#nextBtn'); if(visible(nb))return nb;
  const ok=panel.querySelector('#ok');      if(visible(ok))return ok;
  const pr=panel.querySelector('.row .btn.primary');
  return visible(pr)?pr:null;
}
/* 选第 i 个选项：直接复用原有的 click 逻辑，判定、计分、错题本全都一致 */
function pickOpt(i){
  if(!panelOpen())return false;
  const el=panel.querySelector('.opt[data-i="'+i+'"]');
  if(!el||el.classList.contains('locked'))return false;
  el.click();return true;
}
/* 靠近点位时按 E 互动：和点右下角那个圆按钮完全等价 */
function keyInteract(){
  if(panelOpen())return false;
  const b=$('actBtn');
  if(b&&b.classList.contains('show')){b.click();return true;}
  return false;
}

const PC_KEYS=[' ','arrowup','arrowdown','arrowleft','arrowright','tab'];
window.addEventListener('keydown',e=>{
  if(typingIn(e.target))return;
  const k=e.key.toLowerCase();
  if(e.ctrlKey||e.metaKey||e.altKey)return;   // 放行浏览器快捷键（Ctrl+C 等）
  keys[k]=true;
  if(PC_KEYS.includes(k))e.preventDefault();

  /* Esc：关面板。答题 / 结算这些锁住的面板按 Esc 不动，
     免得手一抖把一道正在做的题关掉（关了就白做）。 */
  if(k==='escape'){
    if(panelOpen()&&!panelLocked()){closePanel();blazeDismiss();}
    else if(panelOpen()){toast('这道题做完才能离开');}
    else goTarget=null;
    return;
  }
  if(k==='h'){ if(!panelOpen())showKeyHelp(); return; }
  if(k==='tab'){ if(!panelOpen()){audioKick();showMenu();} return; }
  /* M：闯关 / 史诗是引路标，烽火里摊开整张战术地图 */
  if(k==='m'){ if(!panelOpen()){audioKick();(CUR===BLAZE&&BZ.active)?showTacMap():showGuide();} return; }
  if(k==='g'){ if(!panelOpen())flashQuest(true); return; }

  if(panelOpen()){
    /* 数字键选选项：1 = 第一个 */
    if(k.length===1&&k>='1'&&k<='9'){
      if(pickOpt(+k-1))return;
    }
    /* 字母选选项 —— 只在面板打开时这么解释，
       回到地图上 A / D 仍然是左右移动 */
    const ab='abcd'.indexOf(k);
    if(k.length===1&&ab>=0&&pickOpt(ab))return;
    /* 空格 / 回车 = 继续、收好、确认 */
    if(k===' '||k==='enter'){
      const b=panelPrimary();
      if(b){e.preventDefault();b.click();}
      return;
    }
    return;                       // 面板打开时不做移动
  }

  /* 地图上：互动键 */
  if(k===' '||k==='e'||k==='f'){
    e.preventDefault();
    if(keyInteract())goTarget=null;
    return;
  }
});
window.addEventListener('keyup',e=>{
  keys[e.key.toLowerCase()]=false;
});
/* 切走窗口 / 失焦：把所有按键松掉，否则回来时人会一直往一个方向跑 */
window.addEventListener('blur',()=>{
  for(const k in keys)keys[k]=false;
  goTarget=null;
});
document.addEventListener('gesturestart',e=>e.preventDefault());

/* 点地图走过去：屏幕坐标 → 世界坐标 */
function setGoTarget(sx,sy){
  if(!(SCALE>0))return false;
  const x=clamp(cam.x+sx/SCALE,16,W-16), y=clamp(cam.y+sy/SCALE,16,H-16);
  if(!walkable(x,y))return false;
  /* t0 用来兜底：万一目标点在墙后头绕不过去，走太久就自己放弃，
     免得角色顶着墙角抖一整局 */
  goTarget={x:x,y:y,t0:performance.now()};
  return true;
}
/* 首次在电脑上打开时，把键位表递到眼前 */
function showKeyHelp(){
  audioKick();
  openPanel(`
    <h2>⌨️ 电脑端操作</h2>
    <div class="sub">键盘玩这一套，手机上完全不受影响</div>
    <div class="it-list keys"><div class="il"><b style="color:#ffd76a">W A S D</b> / <b style="color:#ffd76a">↑ ↓ ← →</b>　移动角色</div><div class="il"><b style="color:#ffd76a">Shift</b>　按住疾跑</div><div class="il"><b style="color:#ffd76a">鼠标左键</b>　点地图上任意位置，自动走过去</div><div class="il"><b style="color:#ffd76a">E / F / 空格</b>　互动：石碑 · 精灵 · 箱子 · 撤离点</div><div class="il"><b style="color:#ffd76a">1~4</b> 或 <b style="color:#ffd76a">A B C D</b>　答题时选选项</div><div class="il"><b style="color:#ffd76a">Enter / 空格</b>　确认 · 下一题 · 收好</div><div class="il"><b style="color:#ffd76a">Esc</b>　关面板（答题时锁着，防止误关）</div><div class="il"><b style="color:#ffd76a">Tab</b> 菜单　<b style="color:#ffd76a">M</b> ${CUR===BLAZE?'战术地图':'引路标'}　<b style="color:#ffd76a">G</b> 当前目标　<b style="color:#ffd76a">H</b> 键位</div></div>
    <div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;margin-top:10px;line-height:var(--lh-base)">
      答题面板一打开，WASD 会自动让位给选项键，<br>
      不会一边翻页一边乱跑。
    </div>
    <div class="row"><button class="btn primary" id="ok">知道了</button></div>`);
  const b=$('ok');if(b)b.onclick=closePanel;
}

