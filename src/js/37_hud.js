/* =========================================================
   HUD
   ========================================================= */
const $=id=>document.getElementById(id);
const TIER_NAME={1:'普通',2:'中档',3:'高考',4:'🔥 攻坚'};
/* 攻坚档只有练枪场有：题更长、带图、解析摊开讲，提示给足 3~4 步 */
function tierLabel(t){return t>=4?'攻坚':TIER_NAME[t]||'';}
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

function updateHUD(){
  updateWbBadge();
  if(CUR===EPIC)return updateHudEpic();
  const reg=REGIONS.find(r=>r.id===state.region)||REGIONS[0];
  $('regionChip').innerHTML='📍 <span class="txt">'+esc(reg.name)+'</span>';
  const tv=state.tier[state.region]||1;
  $('diffChip').innerHTML='<span class="txt">'+TIER_NAME[tv]+'题</span>';
  $('diffChip').style.color=tv>=3?'#ffb0b0':(tv===2?'#ffd76a':'');
  const cv=crystalShown();
  $('crystalChip').innerHTML='🪙 <span class="mono">'+cv+'</span>';
  $('crystalChip').style.color='#ffd76a';
  watchCrystal(cv);                       // 数字变多时顶栏弹一下
  setQuestText(questText());
  measureTopbar();
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
function questText(){
  if(CUR===BLAZE)return questTextBlaze();
  if(CUR===EPIC)return questTextEpic();
  if(CUR===DRILL)return questTextDrill();
  /* 到期题攒多了就提醒一句，别让错题本白攒 */
  const dueN=wbDueList().length;
  if(dueN>=8)return `📕 错题本有 ${dueN} 题到期，去「错题中心 → 今日复习」`;
  const reg=REGIONS.find(r=>r.id===state.region)||REGIONS[0];
  if(!state.badges[reg.id]){
    const tot=SPOTS.filter(s=>s.r===reg.id&&s.t==='stele').length;
    const left=SPOTS.filter(s=>s.r===reg.id&&s.t==='stele'&&!state.solved[s.x+','+s.y]).length;
    if(left>0)return `点亮${reg.name}的石碑 ${tot-left}/${tot}，再挑战守护者`;
    return `石碑全亮！去挑战${reg.name}守护者`;
  }
  const next=REGIONS.find(r=>!state.badges[r.id]);
  if(next)return `已获${reg.name}徽章，前往${next.name}`;
  return '十四域徽章集齐！你已走遍四国 🏆';
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
function updateActBtn(spot){
  const btn=$('actBtn'),hint=$('actHint');
  if(CUR&&CUR.actBtn){CUR.actBtn(spot,btn,hint);return;}
  let nearLocked=null;
  for(const b of BRIDGES){
    if(!b.need||state.badges[b.need])continue;
    const cx=b.rect[0]+b.rect[2]/2,cy=b.rect[1]+b.rect[3]/2;
    if(dist(state.x,state.y,cx,cy)<150)nearLocked=b;
  }
  if(nearLocked){
    const h='🔒 需要'+((REGIONS.find(r=>r.id===nearLocked.need)||{}).name||'')+'徽章才能通行';
    if(h!==actHintCache){hint.textContent=h;actHintCache=h;}
    hint.classList.add('show');btn.classList.remove('show');return;
  }
  if(spot){
    hint.classList.remove('show');btn.classList.add('show');
    const t=spot.t==='guard'?'⚔️ 挑战':spot.t==='spirit'?'✨ 收服':spot.t==='hermit'?'💬 请教':'🗿 解谜';
    if(t!==actBtnCache){btn.textContent=t;actBtnCache=t;}
    return;
  }
  btn.classList.remove('show');hint.classList.remove('show');
}

