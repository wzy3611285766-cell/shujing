/* =========================================================
   🧠 思路灵（3.3.0）—— 你脑内的八种声音
   —— 八种「思维动作」的人格化（极乐迪斯科的脑内声 × 宝可梦的收服养成）：
      不看提示独立答对某型思路题 → 该灵觉醒；之后同型独立答对累积羁绊。
      答题面板上，主导思路的灵会递一句口头禅；多解题里两只灵各报一条路、
      点开能看「什么时候该想到这条路」（题目的 angles 数据，零新增题库）。
   —— 数据独立存档（genji_lings_v1），三模式通用，老存档零影响。
   —— 对外只四个接口：lingJudge / lingStrip / lingDexSection / showLings，
      全部自带 try/catch，模块整个抽掉也不影响答题。
   ========================================================= */
const LING_KEY='genji_lings_v1';
/* 羁绊五档的独立答对次数门槛：初识(觉醒即得) → 共鸣 → 同频 → 知音 → 化身 */
const LING_BOND=[0,3,8,16,28];
const LING_TITLES=['初识','共鸣','同频','知音','化身'];
/* col 与 .qt-* 徽章八色严格对应：颜色就是这套思维动作的第二张脸。
   quip 只给气质不给答案；wake 是觉醒时它对你说的第一句话。 */
const LINGS=[
 {id:'conv',e:'🌀',n:'阿化',title:'老炼金术士',col:'#9fe4ff',
  craft:'转化：把陌生的样子，翻译成熟悉的样子',
  wake:'嘿嘿……又一具老实下来的皮囊。',
  quip:['换具皮囊，它就老实了。','这句话——其实就是说……','别动刀，先翻译。',
        '你算的是它，我看的是它的替身。','陌生？不存在的，只有还没换过来的熟脸。']},
 {id:'loc',e:'📌',n:'锚',title:'寡言制图师',col:'#ffd0a0',
  craft:'定位：先找题眼，再问第一步往哪迈',
  wake:'……旗，插稳了。',
  quip:['先找那个不动的点。','题眼在那儿。别动，先看。','第一步动错，步步都错。',
        '地图上，先插旗，再走路。','找不着突破口，就别往前走。']},
 {id:'nc',e:'🎲',n:'阿蹊',title:'野路子军师',col:'#ffc4e8',
  craft:'非常规：对称、极端、特殊值，不靠硬算靠巧劲',
  wake:'哈！正门不通，咱翻墙进来的。',
  quip:['正经路堵死了？那就走野的。','特殊值，先扔一个进去试试。',
        '对称、极端、量纲——选一件暗器。','不用算，看一眼就够了。','巧劲，只用四两。']},
 {id:'path',e:'🔀',n:'岔婆',title:'岔路口引路人',col:'#d9c6ff',
  craft:'多解：一座山顶四面坡，挑最省力的那条上',
  wake:'呵，又到岔路口了——奶奶给你指路。',
  quip:['别急着走，这儿有好几条路。','一条道走到黑？傻孩子。',
        '这条路省力，那条路稳妥，你挑。','山顶只有一个，坡有四面。','路多不压身。']},
 {id:'pit',e:'🚧',n:'哨兵',title:'神经衰弱的警戒兵',col:'#ffc2c2',
  craft:'防坑：专门盯着题干里埋的雷，见谁拦谁',
  wake:'哈！！我就知道这儿有埋伏！！',
  quip:['等等！！你看见那个字了吗！','站住！这里有陷阱！',
        '“不一定”三个字，值十分。','别过去！上一个人就栽在这儿！','再读一遍题！求你了！']},
 {id:'cond',e:'🚪',n:'门官',title:'逐条验票的把关人',col:'#b9f2d3',
  craft:'条件：每个条件管着什么，少一张票都不开门',
  wake:'验票通过——以后这道门，归你管。',
  quip:['把门的票，一张一张验。','少一个条件，这门关不上。',
        '加一个条件，结论就变天。','先排队，再入场。','条件不说话，但它什么都管。']},
 {id:'str',e:'🏛️',n:'阿构',title:'营造师',col:'#ffd76a',
  craft:'结构：看穿梁架，答案自己就站住了',
  wake:'梁正柱稳，屋子成了。',
  quip:['别看砖，看梁架。','形状对了，答案自己就站住了。',
        '画个骨架，肉自己会长。','繁文缛节都是装修，结构在里头。','拆了墙，屋子还在。']},
 {id:'mig',e:'🧳',n:'归客',title:'识破旧皮囊的旅人',col:'#b6f0e0',
  craft:'迁移：题是新的，模子是旧的',
  wake:'走了千里，又是同一家客栈。',
  quip:['这张脸……我在别处见过。','换了马甲，照样认得你。',
        '同一只鸟，换了片林子叫。','新题旧模，见过就不慌。','山河千里，模型就那几个。']}
];
let lingState=null;
function lingLoad(){
  if(lingState)return lingState;
  let o={};
  try{o=JSON.parse(localStorage.getItem(LING_KEY)||'{}')||{};}catch(e){o={};}
  if(!o||typeof o!=='object'||Array.isArray(o))o={};
  o.muted=!!o.muted;
  if(!o.lings||typeof o.lings!=='object'||Array.isArray(o.lings))o.lings={};
  LINGS.forEach(L=>{
    const d=o.lings[L.id];
    if(!d||typeof d!=='object'){delete o.lings[L.id];return;}
    if(typeof d.exp!=='number'||!isFinite(d.exp))d.exp=0;
    d.exp=Math.max(0,Math.floor(d.exp));
  });
  lingState=o;
  return o;
}
function lingSave(){
  try{localStorage.setItem(LING_KEY,JSON.stringify(lingLoad()));}catch(e){}
}
function lingLevel(d){
  let lv=0;const exp=(d&&d.exp)|0;
  for(let i=0;i<LING_BOND.length;i++)if(exp>=LING_BOND[i])lv=i;
  return lv;
}
/* 答题判定唯一挂点。
   correct：答案对错；usedHint：这题有没有点开过提示链（看了提示就不算独立解出）。
   返回 {awaken:L} 表示这一次判定触发了觉醒（调用方一般不用管）。 */
function lingJudge(q,correct,usedHint){
  try{
    if(!q||!correct)return null;
    const L=LINGS.find(x=>x.id===q.qt);
    if(!L)return null;
    const st=lingLoad();
    let d=st.lings[L.id];
    if(!d){
      /* 第一次见面还看了提示：它在旁边静静看着，不出来 */
      if(usedHint)return null;
      d=st.lings[L.id]={exp:0,at:Date.now()};
      lingSave();
      lingAwakenFx(L);
      return {awaken:L};
    }
    if(usedHint)return null;
    const before=lingLevel(d);
    d.exp=((d.exp|0)+1);
    const after=lingLevel(d);
    lingSave();
    if(after>before){
      try{SFX.unlock();}catch(e){}
      toast(L.e+' '+L.n+' 羁绊 →「'+LING_TITLES[after]+'」');
    }
    return null;
  }catch(e){return null;}
}
/* 觉醒仪式：金光 + 扩散环 + 灵浮现，2.4s 自散，不挡任何点击 */
function lingAwakenFx(L){
  try{SFX.unlock();}catch(e){}
  toast(L.e+' '+L.n+'：'+L.wake,2600);
  let ov=document.getElementById('lingFx');
  if(!ov){ov=document.createElement('div');ov.id='lingFx';$('app').appendChild(ov);}
  ov.innerHTML='<div class="lf-veil"></div><div class="lf-ring"></div><div class="lf-ring r2"></div>'
    +'<div class="lf-e">'+L.e+'</div>'
    +'<div class="lf-t">思路灵觉醒</div>'
    +'<div class="lf-n" style="color:'+L.col+'">'+esc(L.n)+' · '+esc(L.title)+'</div>'
    +'<div class="lf-c">'+esc(L.craft)+'</div>';
  ov.classList.remove('go');void ov.offsetWidth;ov.classList.add('go');
  clearTimeout(ov._t);
  ov._t=setTimeout(function(){ov.classList.remove('go');ov.innerHTML='';},2400);
}
/* ---------- 心声条 ----------
   同一道题永远听到同一句话（按题干哈希取），别让它像走马灯一样烦人。 */
function lingHash(s){s=String(s||'');let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h);}
/* 多解题的「这条路归谁」：按路名 + 信号词里的关键词认领，认不出来归岔婆 */
const LING_ROUTE_RE=[
  ['conv',/转化|换元|代换|翻译|替换|令\s*[a-z]|改成|变形成?/],
  ['loc',/定位|题眼|突破口|不动点|定点|不变量|入手|先找/],
  ['nc',/特殊值|极端|临界|对称|量纲|猜|巧劲|直觉|举个?例/],
  ['pit',/坑|陷阱|易错|别忘|小心|注意|忽略|漏(?!斗)|雷/],
  ['cond',/条件|恒成立|增减|去掉|加上|前提|票/],
  ['str',/结构|形状|骨架|图像|图形|几何|构造|梁/],
  ['mig',/迁移|同类|同一个?模型|换.{0,4}皮|似曾|见过|旧瓶/]
];
function lingRouteSpirit(a){
  const t=String((a&&a.n)||'')+' '+( (a&&a.sig)||'');
  for(const pair of LING_ROUTE_RE){if(pair[1].test(t))return pair[0];}
  return 'path';
}
function lingStrip(q){
  try{
    if(!q)return '';
    if(lingLoad().muted)return '';
    const L=q.qt?LINGS.find(x=>x.id===q.qt):null;
    const ang=Array.isArray(q.angles)
      ?q.angles.filter(a=>a&&(a.n||a.sig||a.d)):[];
    const bicker=ang.length>=2;
    if(!L&&!bicker)return '';
    let rows=[];
    if(bicker){
      ang.slice(0,2).forEach(function(a,k){
        let id=(k===0&&L)?L.id:lingRouteSpirit(a);
        if(rows.some(r=>r.sp.id===id))id='path';
        if(rows.some(r=>r.sp.id===id))return;       /* 岔婆也重复就不再排队 */
        const sp=LINGS.find(x=>x.id===id);
        if(sp)rows.push({sp:sp,a:a});
      });
      if(!rows.length){
        if(!L)return '';
        rows.push({sp:L,a:null});
      }
    }else{
      rows.push({sp:L,a:null});
    }
    const h=lingHash(q.text||'');
    const body=rows.map(function(r){
      const sp=r.sp,a=r.a;
      const say=bicker&&a
        ? '「'+esc(a.n||('第 '+(rows.indexOf(r)+1)+' 条路'))+'」'
        : esc((sp.quip||[])[h%(sp.quip||[]).length]||sp.craft);
      return '<div class="ls-row"><span class="ls-who">'+sp.e+' '+esc(sp.n)
        +'</span><span class="ls-say">'+say+'</span></div>';
    }).join('');
    /* 展开区：多解给「什么时候想到它」（sig），单灵给它的身份卡（craft） */
    let more;
    if(bicker){
      const sigs=rows.filter(r=>r.a&&r.a.sig)
        .map(r=>'<div><b style="color:'+r.sp.col+'">'+r.sp.e+' '+esc(r.sp.n)+'：</b>'
          +'👀 '+esc(r.a.sig)+'</div>').join('');
      more=sigs?'<div class="ls-more">'+sigs+'</div>':'';
    }else{
      const sp=rows[0].sp;
      more='<div class="ls-more"><b style="color:'+sp.col+'">'+sp.e+' '+esc(sp.title)
        +'</b><br>'+esc(sp.craft)+'</div>';
    }
    const tag='<span class="ls-tag">'+(bicker?'听信号 ▾':'它是谁 ▾')+'</span>';
    return '<div class="lstrip" id="lstrip" data-open="0" style="--lc:'+rows[0].sp.col+'">'
      +'<button class="ls-x" id="lstripMute" type="button" aria-label="静暖心声">✕</button>'
      +body+tag+more+'</div>';
  }catch(e){return '';}
}
/* ---------- 图鉴 ---------- */
function lingDexSection(){
  const st=lingLoad();
  const awake=LINGS.filter(L=>st.lings[L.id]).length;
  return '<div class="nat-sec"><div class="nat-hd" style="color:#ffd76a">🧠 思路灵'
    +' <span style="font-weight:600;opacity:.8;font-size:var(--fs-xs)">觉醒 '
    +awake+' / 8'+(st.muted?' · 心声已静默':'')+'</span></div>'
    +'<div class="lgrid">'+LINGS.map(L=>{
      const d=st.lings[L.id],lv=d?lingLevel(d):0;
      return '<button class="lcell'+(d?'':' lock')+'" data-ling="'+L.id+'">'
        +'<div class="e">'+(d?L.e:'🔒')+'</div>'
        +'<div class="n">'+(d?esc(L.n):'？？')+'</div>'
        +'<div class="lv">'+(d?'★'.repeat(lv+1)+'☆'.repeat(4-lv):(QT_NAME[L.id]||''))+'</div>'
        +'</button>';
    }).join('')+'</div></div>';
}
function showLings(focusId){
  const st=lingLoad();
  const awake=LINGS.filter(L=>st.lings[L.id]).length;
  const cards=LINGS.map(L=>{
    const d=st.lings[L.id],on=!!d,lv=d?lingLevel(d):0;
    const head='<div class="lc-hd"><div class="lc-e">'+(on?L.e:'🔒')+'</div>'
      +'<div class="lc-tt"><div class="lc-n" style="color:'+(on?L.col:'#7d94ab')+'">'
      +(on?esc(L.n):'未觉醒的灵')+'</div>'
      +'<div class="lc-sub">'+(QT_NAME[L.id]||'')+' · '+(on?esc(L.title):'？？？？')+'</div></div>'
      +(on?'<div class="lc-stars">'+'★'.repeat(lv+1)+'☆'.repeat(4-lv)
        +'<div style="font-size:var(--fs-2xs);color:#9cc0e0;text-align:right">'
        +LING_TITLES[lv]+' · '+(d.exp|0)+'</div></div>':'')
      +'</div>';
    const body=on
      ? '<div class="lc-craft">'+esc(L.craft)+'</div>'
        +'<div class="lc-quote" style="--lc:'+L.col+'">「'+esc(L.wake)+'」</div>'
      : '<div class="lc-craft" style="color:#8fa8c2">'+esc(L.craft)+'</div>'
        +'<div class="lc-how">🔑 觉醒条件：在挂着「'+(QT_NAME[L.id]||'')
        +'」徽章的思路题里，<b>不看提示、独立答对一次</b> —— 它自会现身。</div>';
    return '<div class="lcard'+(on?'':' lock')+'" data-ling="'+L.id+'" style="--lc:'+L.col+'">'
      +head+body+'</div>';
  }).join('');
  openPanel('<h2>🧠 思路灵</h2>'
    +'<div class="sub">觉醒 '+awake+' / 8 · 你脑内八种思维动作的声音</div>'
    +cards
    +'<div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-top:10px;line-height:var(--lh-base)">'
    +'多解题里它们会为该走哪条路拌嘴；羁绊每升一档，它们的话就更尖一点</div>'
    +'<div class="row">'
    +'<button class="btn" id="lingMuteBtn">'+(st.muted?'🔔 唤醒心声':'🔕 静暖心声')+'</button>'
    +'<button class="btn primary" id="ok">关闭</button></div>');
  $('ok').onclick=closePanel;
  $('lingMuteBtn').onclick=function(){
    st.muted=!st.muted;lingSave();
    toast(st.muted?'🔕 心声已静默 · 答题面板清净了':'🔔 心声回来了');
    showLings(focusId);
  };
  if(focusId)setTimeout(function(){
    const el=panel.querySelector('.lcard[data-ling="'+focusId+'"]');
    if(el)el.scrollIntoView({block:'center'});
  },40);
}
/* 面板内的事件委托（#panel 是常驻节点，所有面板共用）：
   ✕ 静默 / 轻点心声条展开 / 图鉴小格进详情。委托一次，各调用方零改动。 */
panel.addEventListener('click',function(e){
  try{
    if(!e.target.closest)return;
    const mute=e.target.closest('#lstripMute');
    if(mute){
      e.stopPropagation();
      lingLoad().muted=true;lingSave();
      const s=document.getElementById('lstrip');if(s)s.remove();
      toast('🔕 心声已静默 · 图鉴里可随时唤醒');
      return;
    }
    const cell=e.target.closest('.lcell[data-ling]');
    if(cell){audioKick();showLings(cell.dataset.ling);return;}
    const strip=e.target.closest('#lstrip');
    if(strip)strip.dataset.open=strip.dataset.open==='1'?'0':'1';
  }catch(err){}
});
/* 自检 / 自动化测试用：不污染玩法，只挂只读接口 */
window.LING_API={judge:lingJudge,strip:lingStrip,section:lingDexSection,
  show:showLings,load:lingLoad,LINGS:LINGS,reset:function(){lingState=null;
    try{localStorage.removeItem(LING_KEY);}catch(e){}}};

