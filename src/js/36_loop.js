/* =========================================================
   主循环
   ========================================================= */
let cam={x:0,y:0},last=performance.now(),t=0;
let curSpot=null,bannerTimer=0,movedEver=false;
const moveHintEl=document.getElementById('moveHint');

/* 电脑端：把「按住拖动」的提示换成键鼠说法，
   再挂一条常驻键位小抄（点它开完整键位表）。
   注意分工 —— 左下角那条小抄已经把 WASD / Shift / E 讲全了，
   中间这条大字引导再重复一遍就是两块字说同一件事，
   而且它还压在屏幕中下部挡视野。所以这里只留给它一句别处没有的：
   "点地图自动走过去"（小抄里放不下这句，而它恰好是最好用的操作）。
   移动之后这条会自己淡出，不会一直挡着。 */
if(IS_PC&&moveHintEl)moveHintEl.textContent='👆 点地图任意位置，自动走过去';
if(IS_PC){
  /* 这里还在脚本中段，$() 那条 const 尚未声明，直接用原生 API 取元素 */
  const ph=document.getElementById('pcHint');
  if(ph){
    setH(ph, '⌨️ <b>WASD</b> 移动 · <b>Shift</b> 疾跑 · <b>E</b> 互动 · <b>H</b> 键位');
    ph.addEventListener('click',()=>{audioKick();showKeyHelp();});
  }
}

/* 【帧率 4/4】画布像素预算（单位 = CSS 像素 × DPR²，也就是后备画布的总像素数）。
   以前写的是 DPR=min(devicePixelRatio,2)，这条上限其实只在高 dpr 的手机上生效：
   手机要维持 393dp 左右的显示宽度，dpr 必然在 3.2 上下 → 被压到 2，
   等于只用 62% 分辨率渲染 —— 这才是手机流畅的隐藏原因。
   而 12.1 寸平板（2800px 宽 / 默认密度正好是 2）根本压不动：
   后备画布 2800×1968 = 551 万像素，是手机的 4 倍，
   偏偏 144Hz 每帧只有 6.9ms 预算（120Hz 是 8.3ms），拖着摇杆跑就是必然掉帧。
   改成按预算反推：预算内一分不降（手机竖屏 138 万 / 横屏 160 万，照旧 dpr=2），
   超了就按面积开方降 dpr —— 平板落到 dpr≈1.14、画布约 180 万像素，
   主线程光栅化的活直接少掉 2/3。
   画质代价很小：#game 上只有光晕、影子、圈、小地图这些没有细节的东西，
   文字和 emoji 全在 DOM 实体层，不经过这张画布。

   【4.0.19】预算变成两档：完整 180 万 / 流畅 100 万。
   因为"关毛玻璃"那件事已经默认做掉了（整站零 backdrop-filter），
   「流畅档」原来无事可做 —— 现在它改管分辨率，这是最后一块真能省下来的开销。 */
const PIX_BUDGET_FULL=1800000;
const PIX_BUDGET_LITE=1000000;
let PIX_BUDGET=PIX_BUDGET_FULL;
function resize(){
  stickMetrics();          // 旋转屏幕 / 换设备后，摇杆直径会跟着 --stick 变
  VW=appEl.clientWidth||window.innerWidth;
  VH=appEl.clientHeight||window.innerHeight;
  /* 下限不低于 1（别把画面糊掉）—— 但流畅档要**在所有设备上都有感**：
     小屏的像素数本来就低于预算，"只压预算"在小屏上等于没发生
     （冒烟那条「流畅档要降分辨率」就是这么红起来的：888448 → 888448）。
     所以流畅档额外把 DPR 乘 0.8（线性 80% = 像素少 36%），下限 0.75。 */
  DPR=clamp(Math.sqrt(PIX_BUDGET/Math.max(1,VW*VH)),1,Math.min(window.devicePixelRatio||1,2));
  if(typeof PERF!=='undefined'&&PERF.lite)DPR=Math.max(0.75,DPR*0.8);
  cv.width=Math.floor(VW*DPR);cv.height=Math.floor(VH*DPR);
  cv.style.width=VW+'px';cv.style.height=VH+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  /* 缩放 = 一屏能看多少「世界单位」。
     旧公式是 min(VW/1100, VH/700)，在手机上得出 0.354，又被下限抬到 0.42，
     结果 390x844 的屏幕能装下 929x2010 世界单位 —— 整张 2400x1900 的地图
     一屏看完，石碑 emoji 只剩 16px、角色 11px，全糊在一起。
     改成以「屏幕宽度定缩放」：竖屏看地图的 1/4 宽，元素间距和字号都回到正常。 */
  const BASE_VW=(CUR===EPIC)?620:620;      // 希望一屏横向看到的世界宽度
  const BASE_VH=(CUR===EPIC)?900:860;      // 横向富余时，再按高度收一收
  const MIN_S  =(CUR===EPIC)?0.62:0.55;    // 下限 = 石碑 emoji 约 21px，再小就看不清
  SCALE=clamp(Math.min(VW/BASE_VW,VH/BASE_VH),MIN_S,1.7);
  /* 4.0.17：这里原来要 syncBgTransform() 把地形层挪到新位置 ——
     地形改在主画布上贴图之后，SCALE 一变下一帧画出来就是对的，不需要补一次。 */
  if(typeof measureTopbar==='function')measureTopbar();
  /* 旋转屏幕会切换「单列 / 横屏两栏」两套排版：
     已经渲染好的题面是按旧布局分的档（题干字号、单列还是双列、限高多少），
     不重跑一次就会停在旧值上 —— 竖屏转横屏后右栏的选项仍按窄屏单列排。
     把 dataset.fit 清掉再跑，等价于"重新量一遍"。 */
  try{
    if(typeof modal!=='undefined'&&modal.classList.contains('show')
       &&typeof fitPanelText==='function'&&panel.querySelector('.qtext')){
      panel.querySelectorAll('.qtext').forEach(t=>{
        t.dataset.fit='';
        t.style.maxHeight='';
        t.classList.remove('scrollable','at-end');
      });
      panel.querySelectorAll('.opts').forEach(o=>o.dataset.fit='');
      fitPanelText(panel);
    }
  }catch(e){}
}
window.addEventListener('resize',resize);
window.addEventListener('orientationchange',()=>setTimeout(resize,250));

function walkable(x,y){
  let ok=false;
  for(const r of REGIONS)if(inRect(x,y,r.rect)){ok=true;break;}
  if(!ok)for(const b of BRIDGES)if((!b.need||state.badges[b.need])&&inRect(x,y,b.rect)){ok=true;break;}
  if(!ok)return false;
  /* 烽火地带还有一层室内地形：楼是能进的，但不能穿墙、不能越界 */
  if(CUR===BLAZE)return blazeWalkable(x,y);
  return true;
}
function currentRegion(x,y){
  for(const r of REGIONS)if(inRect(x,y,r.rect))return r;
  return null;
}

function update(dt){
  /* 坐标一旦变成 NaN，clamp 也救不回来，角色和镜头会一起消失。
     存档被手改、JSON 里混进 null 都可能触发，这里每帧拦一道。 */
  if(!Number.isFinite(state.x)||!Number.isFinite(state.y)){
    state.x=clamp(Number(state.x)||0,16,W-16);
    state.y=clamp(Number(state.y)||0,16,H-16);
    if(!Number.isFinite(state.x)||!Number.isFinite(state.y)){
      const p=findSpawn();state.x=p.x;state.y=p.y;
    }
  }
  /* 面板一开就停手：答题时按 A/D 是在选选项，不是要往左往右跑 */
  const uiBlock=panelOpen();
  let vx=uiBlock?0:moveVec.x, vy=uiBlock?0:moveVec.y;
  if(!uiBlock){
    if(keys['arrowleft']||keys['a'])vx=-1;
    if(keys['arrowright']||keys['d'])vx=1;
    if(keys['arrowup']||keys['w'])vy=-1;
    if(keys['arrowdown']||keys['s'])vy=1;
  }
  /* 电脑端点地图走过去：没有键也没有摇杆输入时才接管方向 */
  if(!uiBlock&&goTarget&&Math.hypot(vx,vy)<0.05){
    const dx=goTarget.x-state.x, dy=goTarget.y-state.y;
    const d=Math.hypot(dx,dy);
    if(d<14||performance.now()-(goTarget.t0||0)>15000)goTarget=null;
    else{vx=dx/d;vy=dy/d;}
  }
  let len=Math.hypot(vx,vy);
  if(len>1){vx/=len;vy/=len;len=1;}

  if(len>0.05){
    movedEver=true;
    if(moveHintEl&&!moveHintEl.classList.contains('hide'))moveHintEl.classList.add('hide');
    /* 按住 Shift 疾跑：跑图和搜刮时能省下不少时间 */
    const run=keys['shift']?1.75:1;
    const sp=((CUR===EPIC?4.7:(CUR===BLAZE?4.3:3.6)))*run*(dt/16.67);
    const nx=state.x+vx*sp,ny=state.y+vy*sp;
    const pad=16;
    let movedX=false,movedY=false;
    if(walkable(nx+Math.sign(vx)*pad,state.y)){state.x=nx;movedX=true;}
    if(walkable(state.x,ny+Math.sign(vy)*pad)){state.y=ny;movedY=true;}
    /* 点着走的时候撞墙（室内房门、岩石）不要原地卡死：
       先试着贴墙滑一段，实在走不通就放弃这个目标点 */
    if(goTarget&&!movedX&&!movedY){
      if(walkable(nx+Math.sign(vx)*pad,ny+Math.sign(vy)*pad)){state.x=nx;state.y=ny;}
      else goTarget=null;
    }
    state.x=clamp(state.x,16,W-16);state.y=clamp(state.y,16,H-16);
  }

  const reg=currentRegion(state.x,state.y);
  if(reg&&reg.id!==state.region){
    state.region=reg.id;
    const onRiver=CUR===EPIC&&reg.kind==='river';
    if(CUR===EPIC&&!onRiver)state.era=reg.id;
    if(!onRiver){showBanner(reg.emoji+' '+reg.name,reg.sub);SFX.open();}
    save();updateHUD();
  }

  LOOSE.forEach(c=>{
    if(c.got)return;
    if(dist(state.x,state.y,c.x,c.y)<46){
      c.got=true;state.loose[c.id]=true;
      if(CUR===BLAZE&&BZ.active){blazeLoosePick(c);return;}
      SFX.coin();toast(CUR===EPIC?'+3 ✨ 时间星尘':'+3 🪙 数字结晶');
      /* 起点用「含浮动偏移」的当前高度，特效才会从眼睛看到的那一颗上飞出来 */
      const by=Math.sin(t/300+c.bob)*5;
      gainCrystals(3,c.x,c.y+by,(CUR===EPIC?'✨':'💎'));   // 内部含 save() + updateHUD()
    }
  });

  if(CUR===BLAZE)blazeTick(dt);

  curSpot=null;let best=1e9;
  const nearR=(CUR&&CUR.actR)||86;
  for(const s of SPOTS){
    if(spotDone(s))continue;
    const d=dist(state.x,state.y,s.x,s.y);
    if(d<nearR&&d<best){best=d;curSpot=s;}
  }
  updateActBtn(curSpot);

  const tx=state.x-VW/SCALE/2,ty=state.y-VH/SCALE/2;
  cam.x+=(tx-cam.x)*Math.min(1,dt/140);
  cam.y+=(ty-cam.y)*Math.min(1,dt/140);
  cam.x=clamp(cam.x,Math.min(0,W-VW/SCALE),Math.max(0,W-VW/SCALE));
  cam.y=clamp(cam.y,Math.min(0,H-VH/SCALE),Math.max(0,H-VH/SCALE));

  if(guideTimer>0){guideTimer-=dt;if(guideTimer<=0){guideTimer=0;guideTarget=null;}}
  if(bannerTimer>0){bannerTimer-=dt;if(bannerTimer<=0)document.getElementById('banner').style.opacity=0;}
  if(questTimer>0){questTimer-=dt;if(questTimer<=0){questTimer=0;document.getElementById('quest').style.opacity=0;}}
}

function draw(){
  ctx.clearRect(0,0,VW,VH);
  ctx.save();
  ctx.scale(SCALE,SCALE);
  ctx.translate(-cam.x,-cam.y);
  /* ================================================================
     地形每帧贴一次（4.0.17 起只有这一种画法）
     ----------------------------------------------------------------
     以前"完整画质"是把地形交给合成器挪 #bg 那一层，只有省电档才主线程贴图。
     实测（tools/perf.py 消融）说明这个分工是反的：那一层是 2400×1900 的 DOM 画布，
     dpr2 平板上要按 4800×3800（1850 万像素）重光栅化、而且每帧重来一遍 ——
     单它一项就把帧间隔顶到 33.3ms（收掉它 → 16.7ms）。
     主线程贴图只花 1.3ms，还顺带把地形从合成器手里彻底拿回来。
     所以现在**所有设备都走贴图**，观感差别只在"位移步长"上：
     贴图以设备像素为步长，比合成器的亚像素滑动更稳，网格不会逐帧游走发糊。

     要关双线性：源图按 1 世界单位 1px 画的，贴屏要放大 SCALE*DPR 倍，
     非整数倍时每个目标像素都要插值（实测 5.8ms），改最近邻只要 1.3ms。
     倍率 < 1（桌面窄窗口）时最近邻会丢像素，那种情况保留平滑。
     ================================================================ */
  if(staticLayer){
    const _sm=ctx.imageSmoothingEnabled;
    if(SCALE*DPR>=1)ctx.imageSmoothingEnabled=false;
    ctx.drawImage(staticLayer,0,0);
    ctx.imageSmoothingEnabled=_sm;
  }

  const pulse=.5+.5*Math.sin(t/380);
  /* emoji 与名牌都由 DOM 实体层渲染（iOS 上 canvas 画不出彩色 emoji），
     这里只画脚下的光晕和影子 */
  const bzWorld=(CUR===BLAZE);
  SPOTS.forEach(s=>{
    const done=spotDone(s);
    ctx.save();
    if(bzWorld){
      /* 烽火：地面只留一枚贴地小影 + 一圈细警戒环。
         敌人红环、物资淡蓝环，撤离点地面已有停机坪就不再叠光斑 ——
         几十个金色脉冲圈铺满屏幕时，地形本身反而看不见了。 */
      if(done)ctx.globalAlpha=.32;
      ctx.fillStyle='rgba(0,0,0,.34)';
      ctx.beginPath();ctx.ellipse(s.x,s.y+14,17,6,0,0,7);ctx.fill();
      if(!done){
        if(s.t==='patrol'||s.t==='guard'){
          ctx.strokeStyle='rgba(255,107,107,'+(.30+.22*pulse)+')';
          ctx.lineWidth=2.5;
          ctx.beginPath();ctx.ellipse(s.x,s.y+14,27+4*pulse,10,0,0,7);ctx.stroke();
        }else if(s.t==='crate'||s.t==='vault'){
          ctx.strokeStyle='rgba(150,200,255,.28)';ctx.lineWidth=2;
          ctx.beginPath();ctx.ellipse(s.x,s.y+14,22,8,0,0,7);ctx.stroke();
        }
      }
      ctx.restore();return;
    }
    if(done){ctx.globalAlpha=.3;}
    else{
      if(CUR===EPIC&&state.read[s.sid])ctx.globalAlpha=.5;
      ctx.fillStyle='rgba(255,215,106,'+(.13+.1*pulse)+')';
      ctx.beginPath();ctx.arc(s.x,s.y-6,30+3*pulse,0,7);ctx.fill();
      ctx.globalAlpha=1;
    }
    ctx.fillStyle='rgba(0,0,0,.28)';
    ctx.beginPath();ctx.ellipse(s.x,s.y+14,20,7,0,0,7);ctx.fill();
    ctx.restore();
  });

  BRIDGES.forEach(b=>{
    const cx=b.rect[0]+b.rect[2]/2,cy=b.rect[1]+b.rect[3]/2;
    if(b.need&&!state.badges[b.need]){
      ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
      const t2='需'+((REGIONS.find(r=>r.id===b.need)||{}).name||'')+'徽章';
      ctx.font='bold 13px system-ui,-apple-system,sans-serif';
      const w=ctx.measureText(t2).width+14;
      ctx.fillStyle='rgba(10,22,38,.82)';
      roundRect(ctx,cx-w/2,cy,w,20,10);ctx.fill();
      ctx.fillStyle='#ffd76a';ctx.fillText(t2,cx,cy+10);
      ctx.restore();
    }
  });

  LOOSE.forEach(c=>{
    if(c.got)return;
    const by=Math.sin(t/300+c.bob)*5;
    ctx.save();
    ctx.fillStyle='rgba(255,215,106,.2)';
    ctx.beginPath();ctx.arc(c.x,c.y+by,17,0,7);ctx.fill();
    ctx.restore();
  });

  /* 电脑端点地图走过去：在落点画一圈扩散的涟漪，
     走没走对一眼就能看出来，不用盯着小人猜 */
  if(goTarget){
    const p2=.5+.5*Math.sin(t/220);
    ctx.save();
    ctx.strokeStyle='rgba(255,215,106,'+(.35+.35*p2)+')';
    ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(goTarget.x,goTarget.y,9+5*p2,0,7);ctx.stroke();
    ctx.fillStyle='rgba(255,215,106,.55)';
    ctx.beginPath();ctx.arc(goTarget.x,goTarget.y,3.5,0,7);ctx.fill();
    ctx.restore();
  }

  const px=state.x,py=state.y,bob=Math.sin(t/150)*3;
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.28)';
  ctx.beginPath();ctx.ellipse(px,py+18,20,8,0,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.92)';
  ctx.beginPath();ctx.arc(px,py-6+bob,20,0,7);ctx.fill();
  ctx.strokeStyle='#3b82c4';ctx.lineWidth=4;ctx.stroke();
  // 玩家形象由 DOM 实体层渲染
  // 移动方向指示
  if(moveVec.power>0.1){
    ctx.save();
    ctx.globalAlpha=.35;
    ctx.strokeStyle='#ffd76a';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(px,py+bob);
    ctx.lineTo(px+Math.cos(moveVec.ang)*44*moveVec.power,py+Math.sin(moveVec.ang)*44*moveVec.power+bob);
    ctx.stroke();ctx.restore();
  }
  /* 引路标：脚边浮一支金色箭头指向目标，跟着人走，走岔了也能掰回来 */
  if(guideTimer>0&&guideTarget&&dist(px,py,guideTarget.x,guideTarget.y)>30){
    const ga=Math.atan2(guideTarget.y-py,guideTarget.x-px);
    ctx.save();
    ctx.translate(px+Math.cos(ga)*42,py+Math.sin(ga)*42-8);
    ctx.rotate(ga);
    ctx.globalAlpha=.5+.35*Math.sin(t/170);
    ctx.fillStyle='#ffd76a';
    ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(-9,9);ctx.lineTo(-9,-9);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.restore();
  syncEnts();
  drawMiniMap();
}

function drawMiniMap(){
  if(!miniLayer)return;
  const narrow=VW<660,epic=CUR===EPIC;
  const mw=epic?(narrow?Math.min(106,VW*.28):128):(narrow?Math.min(148,VW*.36):168);
  const mh=miniLayer.height*(mw/miniLayer.width);
  const x=VW-mw-12;
  /* 史诗地图更狭长，小地图上移 + 缩小，免得压住右下角的互动键 */
  const y=narrow?(VH-mh-(epic?250:186)):106;
  ctx.save();
  ctx.globalAlpha=.94;
  roundRect(ctx,x,y,mw,mh,12);ctx.clip();
  ctx.drawImage(miniLayer,0,0,miniLayer.width,miniLayer.height,x,y,mw,mh);
  ctx.fillStyle='#ffd76a';
  ctx.beginPath();ctx.arc(x+state.x/W*mw,y+state.y/H*mh,4.5,0,7);ctx.fill();
  ctx.strokeStyle='#000';ctx.lineWidth=1.5;ctx.stroke();
  SPOTS.forEach(s=>{
    if(CUR===EPIC?!!state.read[s.sid]:spotDone(s))return;
    ctx.fillStyle=s.t==='guard'?'#ff8a5b':'rgba(255,255,255,.85)';
    ctx.beginPath();ctx.arc(x+s.x/W*mw,y+s.y/H*mh,s.t==='guard'?3.6:2.2,0,7);ctx.fill();
  });
  /* 引路标生效时，小地图上给目标套一圈呼吸的圆 */
  if(guideTimer>0&&guideTarget){
    ctx.strokeStyle='#ffd76a';ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(x+guideTarget.x/W*mw,y+guideTarget.y/H*mh,5+2.5*Math.sin(t/170),0,7);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1.5;
  roundRect(ctx,x,y,mw,mh,12);ctx.stroke();
  ctx.restore();
}

/* =========================================================
   【帧率 5/4】渲染节拍器：不再「每次 rAF 都画」
   ---------------------------------------------------------
   为什么要抽帧：屏幕 144Hz 时每帧只有 6.9ms 预算（120Hz 8.3ms、60Hz 16.7ms）。
   画不完的时候浏览器会跳过若干个 vsync 才交下一帧，间隔于是变成
   「等 2 个 vsync、等 3 个 vsync」交替出现 —— 眼睛看到的正是那种一顿一顿的卡。
   与其贴着刷新率忽快忽慢，不如稳稳地每 2 个 vsync 出一帧：
   144Hz 上就是 72fps，帧间隔永远一样，观感反而更顺。
   档位只取 vsync 的整数倍，所以 144Hz → 144/72/48/36/24，120Hz → 120/60/40/30/24，
   60Hz → 60/30/20/15 —— 任何屏幕上间隔都均匀。
   （顺带解决一个老问题：144 除以 60 除不尽，硬塞 60fps 会 2 帧/3 帧交替。）
   升降档看两件事：一帧的主线程耗时占了预算多少、以及帧有没有真的迟到。
   ========================================================= */
const PERF={
  vs:7,                    // 一个 vsync 的毫秒数。开机先按最快的屏（144Hz）假设：
                           //   vs 只会在窗口量完之后变小/变大，起点低才不会在
                           //   头 1.5 秒里把「还没量准」当成「还没到点」而白掉帧
  hz:0,                    // 实测屏幕刷新率（?dbg=1 角标要显示）
  win:1e9,winHit:0,winN:0,winMs:0,winUp:0,  // 量 vsync 用的滑动窗口
  multi:1,                 // 每几个 vsync 出一帧
  maxMulti:1,              // 本屏允许的最低档（不低于 24fps）
  last:0,                  // 上一帧的 rAF 时间戳（落在 vsync 网格上）
  lite:false,              // 省电档：连面板毛玻璃也关掉（见 setPerfLite）
  slow:0,                  // 连着几次评估都"降着档还迟到" —— 用来判定该切省电档
  work:0,                  // 一帧主线程实际耗时（EMA，ms）
  span:0,                  // 相邻两帧的真实间隔（ms）
  drawn:0,n:0,miss:0,ticks:0,fast:0,
  bad:0                    // 连着几批"够呛"（heavy 或过半迟到）—— 连两批才降档
};
/* 量屏幕节拍：一个窗口里最小的 rAF 间隔就是 vsync ——
   慢帧只会让间隔变大、不会变小，所以最小值代表真实节拍。
   窗口按「20 帧 且 至少 1.5 秒」关：机器越慢窗口越长，免得
   弱机上量一次节拍要等十几秒（原来按 400 帧算，19fps 的机器要 21 秒）。
   变快（系统从 60Hz 切回 144Hz）当场认；变慢要连着 3 个窗口都慢才认，
   免得开局加载卡几下就把节拍记低了。
   ⚠️ 两个防呆（踩过）：间隔小于 5ms 的不算数（240Hz 屏才会那么快，
   而偶发的 3~4ms 抖动会把节拍记成 250Hz，整个档位表跟着崩：实测
   一次误判就让渲染从 19fps 掉到 15fps）；而且这个最小值必须在一个窗口里
   **出现两次以上**才采纳 —— 只出现一次的极小值是抖动，不是节拍。
   没量准（hz=0）时不会升降档，游戏就照「每帧都画」跑，跟改之前一样。 */
/* ---------------- 省电档（4.0.16 / 4.0.17 收窄） ----------------
   平板/弱机上掉帧的主因不在主线程（实测 draw 只要 0.5ms），而在合成器那侧：
   压在地图上的毛玻璃每帧都要跟着底下的 canvas 重算一遍、
   2400x1900 的地形图层每帧重采样一遍（tools/perf.py 消融：
   关掉模糊 33.3ms → 16.7ms，收掉地形图层 33.3ms → 16.7ms）。

   4.0.17 起这两样**默认就是关的**（地形改主线程贴图、HUD 毛玻璃换成同色底，
   见 draw() 与 00_base.css），所以这一档现在只剩"连面板与公告的毛玻璃也关掉"。
   换句话说：以前它是"想上 60fps 就得开"的档，现在只是给最弱那批设备多留一手。
   （面板/公告的模糊本来就几乎不花钱 —— 它们一开地图就停画，模糊只算一次。）

   自动切：节拍器连着几次"已经降了档、帧还是迟到"就切 ——
   光看 PERF.work 是看不出来的（它只有零点几毫秒）。
   手动切：☰ 菜单里那一项。两边都写进 localStorage，下次打开记得住。 */
const LITE_KEY = 'genji_perflite';
function setPerfLite(on, why){
  PERF.lite = !!on;
  try{document.body.classList.toggle('perf-lite', PERF.lite);}catch(e){}
  try{localStorage.setItem(LITE_KEY, PERF.lite ? '1' : '0');}catch(e){}
  /* 4.0.19：这一档改为压画布分辨率（毛玻璃已经默认全关了，它没别的可关）。
     预算变了要重新量一次画布 —— 但开机那会儿 VW/VH 还没量，别急着调 resize。 */
  const want = PERF.lite ? PIX_BUDGET_LITE : PIX_BUDGET_FULL;
  if(PIX_BUDGET !== want){
    PIX_BUDGET = want;
    if(VW > 0 && VH > 0){ try{ resize(); }catch(e){} }
  }
  /* 自动切的时候要说一声：悄悄把画面变差，玩家会以为游戏坏了 */
  if(why === 'auto')try{
    toast('⚡ 已自动切到「流畅画质」：这台设备带不动完整分辨率，已降一档。☰ 菜单里可以改回来');
  }catch(e){}
}
try{if(localStorage.getItem(LITE_KEY) === '1')setPerfLite(true, 'boot');}catch(e){}

function paceProbe(dt){
  if(dt<5)return;
  if(dt<PERF.win){PERF.win=dt;PERF.winHit=1;}
  else if(dt<PERF.win+1)PERF.winHit++;
  PERF.winN++;PERF.winMs+=dt;
  if(PERF.winN<20||PERF.winMs<1500)return;
  PERF.winN=0;PERF.winMs=0;
  const m=PERF.win,hit=PERF.winHit;PERF.win=1e9;PERF.winHit=0;
  if(hit<2)return;
  /* hz===0 表示这是量到的第一个窗口：直接采纳（开机那个 7ms 只是假设） */
  if(m<PERF.vs||PERF.hz===0){PERF.vs=m;PERF.winUp=0;}
  else if(m>PERF.vs*1.3){if(++PERF.winUp>=3){PERF.vs=m;PERF.winUp=0;}}
  else PERF.winUp=0;
  PERF.vs=clamp(PERF.vs,5,34);
  PERF.hz=Math.round(1000/PERF.vs);
  PERF.maxMulti=clamp(Math.floor(1000/(PERF.vs*24)),1,6);
}
/* 该不该画这一帧。判断用「隔了几个 vsync」而不是比毫秒：
   rAF 时间戳本来就落在 vsync 网格上，取整之后即使 vsync 估偏 10~20%，
   也不会被误判成「还差一点、再等一帧」而白掉一半帧。 */
function paceDraw(now){
  PERF.ticks++;
  if(!PERF.last||panelOpen()||newsIsOpen()){PERF.last=now;PERF.fast=0;PERF.n=0;PERF.miss=0;return;}
  if(Math.round((now-PERF.last)/PERF.vs)<PERF.multi)return;
  PERF.span=now-PERF.last;
  PERF.last=now;
  const w0=performance.now();
  draw();
  const work=performance.now()-w0;
  PERF.work=PERF.work?PERF.work*.85+work*.15:work;
  PERF.drawn++;PERF.n++;
  if(PERF.span>PERF.vs*PERF.multi*1.5)PERF.miss++;
  /* 每 30 帧评一次档：
     一帧耗时超过预算的 80%，或这批里**过半**的帧迟到 → 降一档；
     连续 6 批（约 3 秒）都用不到 40% 的预算、一次没迟到 → 升一档。
     节拍还没量准（hz=0）时不评：那会儿预算本身是假的，评了只会乱降档。

     【4.0.17 把迟到的门槛从 1/4 提到 1/2，且要求连着两批】
     原来"这批有 1/4 帧迟到"就降档 —— 在本机明明能跑满的机器上，
     开局那几次 GC / 布局抖动就够凑满 1/4，于是它把帧率永久砍成一半（30fps），
     tools/perf.py 复测时撞到过两次（同一台机器两次跑出 16.7 与 33.3 两档）。
     真正"跟不上"的设备是**过半**的帧都迟到，而且一批评不完还会再评一批：
     所以现在要求过半 + 连着两批。主线程真的忙（heavy）仍然是当场降 ——
     那个数（PERF.work）是实测的，不会误判。 */
  if(PERF.n>=30&&PERF.hz>0){
    const budget=PERF.vs*PERF.multi;
    const heavy=PERF.work>budget*.8, late=PERF.miss>PERF.n*.5;
    PERF.bad=(heavy||late)?PERF.bad+1:0;
    /* 已经降着档、帧还在迟到 —— 瓶颈多半不在主线程而在合成器（毛玻璃 / 图层重采样）。
       连着三次这样才切省电档：一次就切会被偶发卡顿误判。 */
    if(PERF.multi >= 2 && late){
      if(++PERF.slow >= 3){PERF.slow = 0;setPerfLite(true, 'auto');}
    }else PERF.slow = 0;
    if(PERF.multi<PERF.maxMulti&&(heavy||PERF.bad>=2)){PERF.multi++;PERF.fast=0;PERF.work=0;}
    else if(PERF.multi>1){
      /* 升档要连着几批都很闲：偶尔一批只是"不闲"就停表不计数，
         真忙起来（>60% 预算）才把计数器清零 —— 免得刚升上去就又被压回来，
         来回抖比一直低一档还难看。
         4.0.17：已经降着档时门槛从 6 批降到 3 批。降档更容易误判了（见上），
         所以回来也要更快 —— 否则一次开局抖动能让玩家白白看 6 秒的 30fps。 */
      if(PERF.work<budget*.4){if(++PERF.fast>=(PERF.multi>1?3:6)){PERF.multi--;PERF.fast=0;}}
      else if(PERF.work>budget*.6)PERF.fast=0;
    }
    PERF.n=0;PERF.miss=0;
  }
}

function loop(now){
  const dt=Math.min(50,now-last);last=now;t+=dt;
  update(dt);
  paceProbe(dt);
  /* 【帧率 1/3】面板 / 公告一开，地图就不用再画了。
     它被压在蒙层底下，玩家根本看不见，而每帧重画一次地图要花掉 5~6ms
     （实测：整帧画布开销里 90% 以上都在这里）。
     更亏的是 #modal 上挂着 backdrop-filter:blur(4px)：底下这张 canvas 每帧都在变，
     合成器就得每帧重算一次全屏高斯模糊 —— 答题时的卡顿主要来自这一条。
     停画之后背景成了静止画面，模糊只算一次，帧率立刻回来。
     面板关掉后下一帧自然恢复重画，不需要额外触发；
     update() 照常跑，所以 t 继续累加，动画不会跳帧。
     这条规则和上面那三条一起落在 paceDraw() 里。 */
  paceDraw(now);
  requestAnimationFrame(loop);
}

