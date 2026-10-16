/* =========================================================
   HUD
   ========================================================= */
const $=id=>document.getElementById(id);
const TIER_NAME={1:'普通',2:'中档',3:'高考',4:'🔥 攻坚'};
/* 攻坚档只有练枪场有：题更长、带图、解析摊开讲，提示给足 3~4 步 */

/* 顶栏 📕 的待复习角标：有到期题就挂红点，按钮自己也开始呼吸 */
function updateWbBadge(){
  const el=$('wbDot'),b=$('btnWb'),el2=$('wbDot2');
  /* 史诗与烽火的菜单里没有「错题中心」这一项（那是闯关 / 练枪场的东西），
     所以这两个世界不挂角标。
     〔必须同时清掉 ☰ 上那颗〕
     旧版在这里直接 return，只清了自己那一颗 —— ☰ 上的数字就留在了上一个世界：
     在闯关攒了 4 题到期，切到烽火后 ☰ 右上角依然顶着「4」，
     可点开菜单满屏找不到哪一项是 4（红点悬空、没有落点）。
     角标和它指向的入口必须同进同退，缺一个就成了假消息。 */
  const muted=(CUR===EPIC||CUR===BLAZE);
  if(muted){
    if(el)el.hidden=true;
    if(el2)el2.hidden=true;
    if(b)b.classList.remove('pend');
    return;
  }
  const n=wbDueList().length;
  const txt=n>99?'99+':String(n);
  if(el){el.hidden=!n;if(n)el.textContent=txt;}
  if(el2){el2.hidden=!n;if(n)el2.textContent=txt;}
  if(b){try{b.classList.toggle('pend',n>0);}catch(e){}}
}

let questTopH=0;
/* 顶栏换行时任务条要跟着下移。写进 CSS 变量，一次测量全局生效；
   顺带用 ResizeObserver 兜住「字体加载完 / 旋转屏幕」导致的高度变化。 */
function measureTopbar(){
  const tb=$('topbar');if(!tb)return;
  const h=tb.offsetHeight;
  if(!h||Math.abs(h-questTopH)<1)return;
  questTopH=h;
  document.documentElement.style.setProperty('--topH',h+'px');
  /* 也要让开顶部那条"新版本通知栏"（--upH，没有它时是 0） */
  const q=$('quest');if(q)q.style.top='calc(var(--safeT) + var(--upH) + '+h+'px + 6px)';
}
if(window.ResizeObserver&&document.getElementById('topbar')){
  try{new ResizeObserver(measureTopbar).observe(document.getElementById('topbar'));}catch(e){}
}

/* 任务条一律「闪现」：显示 QUEST_SHOW_MS 毫秒后淡出，不再常驻挡视野。
   只有文案真的变了才重新显示并重新计时——否则每捡一颗星尘都会把它叫回来。
   force=true 用于玩家手动点 🎯 按钮召回。 */
const QUEST_SHOW_MS=5200;
let questTimer=0,questShown='';
function setQuestText(txt,showMs,force){
  const el=$('quest');if(!el)return;
  showMs=showMs||QUEST_SHOW_MS;
  $('questText').textContent=txt;
  if(force||txt!==questShown){questShown=txt;el.style.opacity='1';questTimer=showMs;}
}
function flashQuest(force){setQuestText(questText(),QUEST_SHOW_MS,force);}
function toast(msg,ms){
  const box=$('toast');
  if(!box)return;
  /* 相同文字的提示先清旧的再挂新的：连点字号按钮时十条一样的提示叠一墙太闹心 */
  try{
    const old=box.querySelectorAll('.tst');
    for(let i=0;i<old.length;i++)if(old[i].textContent===msg)old[i].remove();
  }catch(e){}
  const d=document.createElement('div');d.className='tst';d.textContent=msg;
  box.appendChild(d);setTimeout(()=>d.remove(),ms||1900);
}
function showBanner(a,b){
  const el=$('banner');
  el.querySelector('.t').textContent=a;
  el.querySelector('.s').textContent=b||'';
  el.style.opacity=1;bannerTimer=2100;
}
let actBtnCache='',actHintCache='';

