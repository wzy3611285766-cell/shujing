/* =========================================================
   🎯 练枪场 · 第四世界（172 版）
   —— 与闯关 / 编年史 / 烽火并列的第四个模式：一块安静的训练场，
      走近训练台（首访说明里也有入口）打开练枪大厅。
      题库 = 四科多步大题 / 攻坚压轴（BIG / HARD），带完整的思路详解；
      进度独立存储（genji_drill_v1），不污染另外三个世界。
   ========================================================= */
const SAVE_KEY_DRILL='genji_drill_v1';
const DRILL_STATE=blankState();
DRILL_STATE.sound=ADV_STATE.sound;

const DRILL_REGIONS=[{
  id:'range',name:'练枪场',emoji:'🎯',
  rect:[150,140,1200,780],
  ground:['#24405e','#132033'],edge:'#0b1626'
}];
const DRILL_SPOTS=[
  {t:'drillstand',x:750,y:560,e:'🎯',name:'练枪台'}
];

const DRILL={
  id:'drill',W:1500,H:1060,
  title:'数境 · 练枪场',
  sub:'高考压轴 · 思路详解 · 四科无限题',
  regions:DRILL_REGIONS,bridges:[],spots:DRILL_SPOTS,loose:[],spirits:[],
  st:DRILL_STATE,save:SAVE_KEY_DRILL,actR:78,
  drawWorld:drawDrillWorld,
  doneSpot:()=>false,
  spotLabel:s=>s.name||'练枪台',
  actBtn:drillActBtn
};

/* 训练场地表：网格 + 跑道 + 中央靶区，安静的深蓝 */
function drawDrillWorld(c,rnd){
  const g=c.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#101d30');g.addColorStop(.5,'#0d1830');g.addColorStop(1,'#0a1322');
  c.fillStyle=g;c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(120,170,230,.05)';c.lineWidth=2;
  for(let x=60;x<W;x+=80){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
  for(let y=60;y<H;y+=80){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  const [rx,ry,rw,rh]=DRILL_REGIONS[0].rect;
  c.save();
  c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=30;c.shadowOffsetY=10;
  c.fillStyle='#1c3350';roundRect(c,rx,ry,rw,rh,48);c.fill();
  c.restore();
  const gg=c.createLinearGradient(rx,ry,rx,ry+rh);
  gg.addColorStop(0,'#24405e');gg.addColorStop(1,'#132033');
  c.fillStyle=gg;roundRect(c,rx,ry,rw,rh,48);c.fill();
  c.strokeStyle='#0b1626';c.lineWidth=6;roundRect(c,rx,ry,rw,rh,48);c.stroke();
  /* 中央靶区：同心圆 + 靶心 */
  const cx=rx+rw*.5,cy=ry+rh*.5;
  [[220,'rgba(255,215,106,.10)'],[165,'rgba(255,215,106,.14)'],
   [110,'rgba(255,215,106,.18)'],[55,'rgba(255,215,106,.24)']].forEach(k=>{
    c.beginPath();c.arc(cx,cy,k[0],0,7);c.fillStyle=k[1];c.fill();
    c.strokeStyle='rgba(255,215,106,.20)';c.lineWidth=2;c.stroke();
  });
  c.beginPath();c.arc(cx,cy,16,0,7);c.fillStyle='rgba(255,215,106,.5)';c.fill();
  /* 四角灯位 + 散点器械 */
  c.fillStyle='rgba(150,200,255,.08)';
  [[rx+40,ry+40],[rx+rw-40,ry+40],[rx+40,ry+rh-40],[rx+rw-40,ry+rh-40]].forEach(p=>{
    c.beginPath();c.arc(p[0],p[1],26,0,7);c.fill();
  });
  const decos=['🎯','🏹','⏱️','🧱','🎯','🪵','🥊','🎯'];
  const rnd2=mulberry(20261008);
  for(let i=0;i<14;i++){
    const x=rx+80+rnd2()*(rw-160), y=ry+80+rnd2()*(rh-160);
    if(Math.hypot(x-cx,y-cy)<260)continue;
    c.globalAlpha=.12+rnd2()*.10;
    c.font=(30+(rnd2()*16|0))+'px system-ui';
    c.fillText(decos[i%decos.length],x,y);
  }
  c.globalAlpha=1;
}

/* 训练台的互动键 */
let drillBtnCache={t:'',h:''};
function drillActBtn(spot,btn,hint){
  if(!spot){
    btn.classList.remove('show');hint.classList.remove('show');
    drillBtnCache.t='';drillBtnCache.h='';
    return;
  }
  btn.classList.add('show');
  const t='🎯 开练';
  if(t!==drillBtnCache.t){btn.textContent=t;drillBtnCache.t=t;}
  const h='🎯 练枪台 · 四科压轴 / 思路详解';
  if(h!==drillBtnCache.h){hint.textContent=h;drillBtnCache.h=h;}
  hint.classList.add('show');
}

/* 练枪模式的 HUD：位置 / 统计 / 任务条 */
function updateHudDrill(){
  setH($('regionChip'), '<span class="txt">🎯 练枪场 · 压轴专训</span>');
  $('regionChip').style.color='#ffd76a';
  const tt=drillTotal();
  setH($('diffChip'), '<span class="txt">'+(tt.n?('累计 '+tt.n+' 题 · 命中 '+pctOf(tt.p)):'还没开练')+'</span>');
  $('diffChip').style.color=tt.n?'#ffd76a':'';
  const cv=crystalShown();
  setH($('crystalChip'), '🪙 <span class="mono">'+cv+'</span>');
  $('crystalChip').style.color='#ffd76a';
  watchCrystal(cv);
  setQuestText(questTextDrill());
  measureTopbar();
}
function questTextDrill(){
  const due=wbDueList().length;
  if(due>=8)return `📕 错题本有 ${due} 题到期，去「错题中心 → 今日复习」`;
  let worst=null,wp=2;
  DRILL_SUBJ.forEach(s=>{
    const d=drillStat(s.id);
    if(!d||!d.n)return;
    const p=rateOf({r:d.r||0,w:d.w||0});
    if(p<wp){wp=p;worst=s;}
  });
  if(worst)return `🎯 点「训练台」开练 —— ${worst.name}命中 ${pctOf(wp)}，先补它`;
  return '🎯 走近训练台点「开练」，或 ☰ 菜单换科 · 建议从「专攻薄弱」开始';
}

/* 练枪模式的首访说明 */
function drillIntroHtml(){
  return `
    <h2>🎯 练枪场</h2>
    <div class="sub">数境 · 第四模式</div>
    <div class="it-list">
      <div class="il">🎯 <b>四科无限题</b>：数 / 理 / 化 / 生，走近场上的训练台随时开练</div>
      <div class="il">🧭 <b>思路详解</b>：先选「从哪儿入手」，选完给为什么 + 第一步落点 —— 这是练枪独有的环节</div>
      <div class="il">🔥 <b>高考压轴</b>：多步大题 + 攻坚档，长题干配图，提示分三到四步递给你</div>
      <div class="il">📕 <b>零损失</b>：答错不扣结晶不降档，错题自动进错题本，后台攒薄弱清单</div>
      <div class="il">💾 <b>独立进度</b>：与另外三个世界的存档分开，互不影响</div>
    </div>
    <div class="row"><button class="btn primary" id="go">开始练枪</button></div>`;
}

function useWorld(w){
  CUR=w;
  W=w.W;H=w.H;
  WORLD_TITLE=w.title;WORLD_SUB=w.sub;
  REGIONS=w.regions;BRIDGES=w.bridges;SPOTS=w.spots;LOOSE=w.loose;SPIRITS=w.spirits;
  state=w.st;curKey=w.save;
  /* 错题本全局共享（4.0.22）：每次切世界都把四个 state 指回同一份数组。
     不这么做的话，烽火 / 史诗 / 练枪里读到的 state.wrongBook 是 undefined —— 
     错题中心在那些世界等于空的，而"先复习错题"正好要在烽火开局前拦人。 */
  if(typeof wbShare==='function')wbShare();
}

/* ---------------- 判定与标签 ---------------- */
function spotDone(s){
  if(CUR&&CUR.doneSpot)return CUR.doneSpot(s);
  if(s.t==='spirit')return !!state.caught[s.sid];
  if(s.t==='guard') return !!state.badges[s.r];
  if(s.t==='stele') return !!state.solved[s.x+','+s.y];
  return false;
}
function epicSpotLabel(s){
  const it=EPIC_LIB[s.sid];
  if(!it)return '卷宗';
  return (state.read[s.sid]?'✅ ':'📜 ')+it.title;
}
/* updateActBtn 每帧都会跑，这里只在内容真的变了才写 DOM ——
   原先每次都重设 textContent / style，等于每帧做一次无谓的文本节点替换。 */
let epicBtnCache={t:'',h:''};
function epicActBtn(spot,btn,hint){
  if(!spot){
    btn.classList.remove('show');hint.classList.remove('show');
    epicBtnCache.t='';epicBtnCache.h='';
    return;
  }
  const it=EPIC_LIB[spot.sid];
  btn.classList.add('show');
  const t=state.read[spot.sid]?'📖 重读':'📖 阅读';
  if(t!==epicBtnCache.t){btn.textContent=t;epicBtnCache.t=t;}
  const h='📜 '+(it?it.title:'卷宗')+'　'+(it?it.year:'');
  if(h!==epicBtnCache.h){
    hint.style.maxWidth='calc(100vw - 56px)';
    hint.style.overflow='hidden';
    hint.style.textOverflow='ellipsis';
    hint.textContent=h;
    epicBtnCache.h=h;
  }
  hint.classList.add('show');
}

/* ---------------- 时间长河的绘制 ---------------- */
function drawEpicWorld(c,rnd){
  const g=c.createLinearGradient(0,0,W*.4,H);
  g.addColorStop(0,'#180f31');g.addColorStop(.34,'#0e1b3a');
  g.addColorStop(.72,'#0b2440');g.addColorStop(1,'#071a2c');
  c.fillStyle=g;c.fillRect(0,0,W,H);
  // 星空
  for(let i=0;i<540;i++){
    const x=rnd()*W,y=rnd()*H,r=rnd()*1.7+.35;
    c.globalAlpha=.18+rnd()*.6;
    c.fillStyle=rnd()<.16?'#ffd76a':(rnd()<.32?'#bcd9f5':'#ffffff');
    c.beginPath();c.arc(x,y,r,0,7);c.fill();
  }
  c.globalAlpha=1;
  // 河
  RIVERS.forEach(r=>{
    const [x,y,w,h]=r.rect,hor=w>h,rad=Math.min(w,h)/2;
    const gg=hor?c.createLinearGradient(0,y,0,y+h):c.createLinearGradient(x,0,x+w,0);
    gg.addColorStop(0,'rgba(46,132,196,.62)');
    gg.addColorStop(.5,'rgba(126,208,255,.78)');
    gg.addColorStop(1,'rgba(46,132,196,.62)');
    c.fillStyle=gg;roundRect(c,x,y,w,h,rad);c.fill();
    c.strokeStyle='rgba(180,235,255,.45)';c.lineWidth=3;
    roundRect(c,x,y,w,h,rad);c.stroke();
    c.save();roundRect(c,x,y,w,h,rad);c.clip();
    c.strokeStyle='rgba(255,255,255,.24)';c.lineWidth=2;
    if(hor){
      for(let k=1;k<=2;k++){c.beginPath();
        for(let px=x;px<=x+w;px+=15)c.lineTo(px,y+h*k/3+Math.sin((px+y)/40)*4);c.stroke();}
    }else{
      for(let k=1;k<=2;k++){c.beginPath();
        for(let py=y;py<=y+h;py+=15)c.lineTo(x+w*k/3+Math.sin((py+x)/40)*4,py);c.stroke();}
    }
    c.restore();
    c.save();c.textAlign='center';c.textBaseline='middle';
    c.font='bold 21px system-ui,-apple-system,sans-serif';
    c.fillStyle='rgba(205,242,255,.55)';
    c.fillText(r.label,x+w/2,y+h/2);
    c.restore();
  });
  // 纪元岛
  EPOCHS.forEach(ep=>{
    const [x,y,w,h]=ep.rect;
    c.save();
    c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=26;c.shadowOffsetY=10;
    c.fillStyle=ep.ground[1];roundRect(c,x,y,w,h,46);c.fill();
    c.restore();
    const gg=c.createLinearGradient(x,y,x,y+h);
    gg.addColorStop(0,ep.ground[0]);gg.addColorStop(1,ep.ground[1]);
    c.fillStyle=gg;roundRect(c,x,y,w,h,46);c.fill();
    c.strokeStyle=ep.edge;c.lineWidth=5;roundRect(c,x,y,w,h,46);c.stroke();
    // 地表纹样
    const r2=mulberry(ep.rect[0]*17+ep.rect[1]*7+3);
    c.save();roundRect(c,x+6,y+6,w-12,h-12,40);c.clip();
    c.textAlign='center';c.textBaseline='middle';
    const style=PROP_STYLE[ep.id]||'dot';
    for(let i=0;i<w*h/9500;i++){
      drawProp(c,style,x+20+r2()*(w-40),y+18+r2()*(h-78),
        9+r2()*9,r2()*6.28,ep.edge,.14+r2()*.16);
    }
    c.restore();
    // 岛名交给 DOM 实体层画（带 emoji），这里只留一道底部渐变让文字更清楚
    const gg2=c.createLinearGradient(0,y+h-92,0,y+h);
    gg2.addColorStop(0,'rgba(0,0,0,0)');gg2.addColorStop(1,'rgba(0,0,0,.32)');
    c.save();roundRect(c,x+6,y+6,w-12,h-12,40);c.clip();
    c.fillStyle=gg2;c.fillRect(x,y+h-92,w,92);c.restore();
  });
}

/* ---------------- HUD ---------------- */
function updateHudEpic(){
  const ep=EPOCHS.find(r=>r.id===state.era)||EPOCHS.find(r=>r.id===state.region)||EPOCHS[0];
  const list=EPIC_SPOTS.filter(s=>s.era===ep.id);
  const rd=list.filter(s=>state.read[s.sid]).length;
  setH($('regionChip'), '📍 <span class="txt">'+esc(ep.name)+'</span>');
  setH($('diffChip'), '<span class="txt">已读 '+rd+'/'+list.length+'</span>');
  $('diffChip').style.color='';
  const cv=crystalShown();
  setH($('crystalChip'), '<span class="txt">✨ <span class="mono">'+cv+'</span></span>');
  watchCrystal(cv);
  setQuestText(questTextEpic(),QUEST_SHOW_MS);
  measureTopbar();
}
function questTextEpic(){
  const ep=EPOCHS.find(r=>r.id===state.era)||EPOCHS[0];
  const list=EPIC_SPOTS.filter(s=>s.era===ep.id);
  const left=list.filter(s=>!state.read[s.sid]).length;
  let txt;
  if(left>0)txt=`在「${ep.name}」还有 ${left} 篇卷宗未读`;
  else{
    const nx=EPOCHS.find(r=>EPIC_SPOTS.some(s=>s.era===r.id&&!state.read[s.sid]));
    txt=nx?`「${ep.name}」已读完 · 顺流而下前往${nx.name}`
          :'十五纪元读完！你已走完四科交织的科学长河 🌌';
  }
  /* 星尘攒够一张券、手上又没几张时，顺带提一句出口在哪 ——
     这条河以前是死水，攒到一千多枚也没处花 */
  if(aidDust()>=30&&aidTotal()<3)
    txt+=' · ✨ 星尘可在「⏳ 时空交易所」换支援券';
  return txt;
}

/* ---------------- 阅读一篇卷宗 ----------------
   EPIC_LIB 字段的转义约定（改内容时请照此办理）：
     富文本，可直接写 HTML —— body、link
        （可写 <span class="fm">公式</span>；若真要显示 "<" 请写成 &lt;）
     纯文本，必须过 esc() —— title、year、place、who、quote、why
   link 里有二十多处 <span class="fm">，之前误加了 esc()，
   玩家看到的是 "<span class="fm">tanθ = 对边/邻边</span>" 这种源码。 */
function openEra(sp){
  const it=EPIC_LIB[sp.sid];
  if(!it){toast('这篇卷宗还是空白的');return;}
  const ep=EPOCHS.find(r=>r.id===sp.era);
  const first=!state.read[sp.sid];
  if(first){state.read[sp.sid]=true;state.crystals+=5;SFX.coin();toast('✨ +5 时间星尘');}
  save();updateHUD();
  const passed=!!state.quiz[sp.sid];
  openPanel(`
    <h2>${it.e} ${esc(it.title)}</h2>
    <div class="sub">${ep?esc(ep.name)+' · '+esc(ep.sub):'时间长河'}</div>
    <div class="epic-meta">
      <span>📅 ${esc(it.year)}</span>
      <span>🌍 ${esc(it.place)}</span>
      ${it.who?'<span>👤 '+esc(it.who)+'</span>':''}
    </div>
    <div class="epic-body">${it.body}${it.quote?`<div class="epic-quote">${esc(it.quote)}</div>`:''}</div>
    <div class="epic-sec why">💡 <b>为什么重要</b><br>${esc(it.why)}</div>
    <div class="epic-sec link">🔗 <b>与课本的联系</b><br>${it.link||''}</div>
    ${first?'<div class="center" style="margin-top:12px;color:#ffd76a;font-weight:700">✨ 首次阅读 +5 时间星尘</div>'
           :'<div class="center" style="margin-top:10px;color:#8fb4d6;font-size:var(--fs-sm)">已读过这篇，随时可以重读</div>'}
    <div class="row">
      ${it.quiz?`<button class="btn ${passed?'':'primary'}" id="qz">${passed?'✅ 时空题已通过':'📝 时空考题'}</button>`:''}
      <button class="btn primary" id="ok">${first?'收下这卷':'放回书架'}</button>
    </div>
  `);
  const back=()=>{closePanel();afterRead(ep);};
  $('ok').onclick=back;
  const qb=$('qz');
  if(qb)qb.onclick=()=>{
    const q=it.quiz();
    q.ans=q.ansText;
    q.topic=q.topic||'时空考题';
    sessionFixed([q],'📜 时空考题 · '+it.title,(right,total)=>{
      if(right>0){
        if(!state.quiz[sp.sid]){state.quiz[sp.sid]=true;state.crystals+=8;SFX.win();toast('✨ +8 星尘 · 时空题通过');}
        else{state.crystals+=2;SFX.coin();}
      }
      save();updateHUD();
      openPanel(`
        <h2>${right>0?'✅ 时空题通过':'❌ 再想想'}</h2>
        <div class="sub">${esc(it.title)}</div>
        <div class="center" style="font-size:44px;margin:8px 0">${right>0?'🎓':'📜'}</div>
        <div class="center">${right>0?'这一段历史，你算是真的读懂了。':'别急，回到卷宗里再看一眼。'}</div>
        <div class="row"><button class="btn primary" id="ok">继续</button></div>
      `);
      $('ok').onclick=()=>{closePanel();afterRead(ep);};
    });
  };
}
function afterRead(ep){
  if(!ep)return;
  const list=EPIC_SPOTS.filter(s=>s.era===ep.id);
  if(!list.length)return;
  if(list.some(s=>!state.read[s.sid]))return;
  if(state.badges[ep.id])return;
  state.badges[ep.id]=true;state.crystals+=20;save();updateHUD();SFX.unlock();
  showBanner('🎖️ '+ep.name+'读完','获得「'+ep.name+'」纪元章');
  const all=EPOCHS.every(r=>state.badges[r.id]);
  setTimeout(()=>{
    if(all){openPanel(epicFinalHtml());}
    else{
      openPanel(`
        <h2>🎖️ ${esc(ep.name)} · 纪元章</h2>
        <div class="sub">${esc(ep.sub)}</div>
        <div class="center" style="font-size:52px;margin:8px 0">${ep.emoji}</div>
        <div class="center">这一纪元的 ${list.length} 篇卷宗已全部读完。<br>
        奖励 <b style="color:#ffd76a">20</b> ✨ 时间星尘<br>
        <span style="color:#9cc0e0;font-size:var(--fs-sm)">顺流而下，下一段历史在等着你</span></div>
        <div class="row"><button class="btn primary" id="ok">继续航行</button></div>
      `);
    }
    $('ok').onclick=closePanel;
  },950);
}
function epicFinalHtml(){
  return `
    <h2>🌌 长河尽头</h2>
    <div class="sub">十五纪元读完 · 四科同源</div>
    <div class="epic-body">
      <p>从伊尚戈骨上的刻痕，到佩雷尔曼拒绝领奖的沉默；从尼罗河畔的拉绳人，到今天用 AI 寻找猜想的数学家——所有努力都指向同一件事：<b>把混乱的世界，写成可以推理的形式</b>。</p>
      <p>你现在手里的高中数学课本，是这条长河最近的一段。定义域、导数、向量、概率……每一个概念都不是凭空掉下来的，它们被人一次次想错过、推翻过、重建过。</p>
      <p>你会发现一个反复出现的规律：数学的进步往往不是来自更聪明的头脑，而是来自<b>更耐心的提问</b>——为什么这个一定对？有没有反例？换个符号会怎样？如果它不存在呢？</p>
      <p>下次遇到一道解不出的题，可以想想阿贝尔和伽罗瓦：他们只活到 26 岁和 20 岁，却改变了数学的形状。<b>你只是还没想到，不是想不出来。</b></p>
    </div>
    <div class="epic-sec why">🎖️ 你已获得「历史见证者」称号 · 十五枚纪元章全部点亮<br>
      <span style="font-size:var(--fs-sm)">长河没有终点，它只是流到你脚下，然后继续往前。</span></div>
    <div class="row"><button class="btn primary" id="ok">回到长河</button></div>
  `;
}

