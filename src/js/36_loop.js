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
    ph.innerHTML='⌨️ <b>WASD</b> 移动 · <b>Shift</b> 疾跑 · <b>E</b> 互动 · <b>H</b> 键位';
    ph.addEventListener('click',()=>{audioKick();showKeyHelp();});
  }
}

function resize(){
  stickMetrics();          // 旋转屏幕 / 换设备后，摇杆直径会跟着 --stick 变
  DPR=Math.min(window.devicePixelRatio||1,2);
  VW=appEl.clientWidth||window.innerWidth;
  VH=appEl.clientHeight||window.innerHeight;
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
  /* 缩放变了，地形层的位移与倍率要立刻跟着改。
     否则「面板开着时转屏」会留下一个按旧比例摆的底图。 */
  syncBgTransform();
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
  /* 地形层跟着镜头挪一格 —— 这是整个渲染里最省的一步：
     一次 CSS 变换交给合成器，主线程不做任何绘制。 */
  syncBgTransform();
  if(staticLayer===bgCv){
    /* 【帧率 3/3】地形层换了实现：不再每帧 drawImage，只把整层挪到镜头位置。
       下面这段是兜底 —— 万一 #bg 没取到（旧结构 / 被裁掉的页面），
       退回原来的一次性位图 blit，功能不受影响。
       兜底时把双线性关掉：源图按 1 世界单位 1px 画的，贴屏要放大
       SCALE*DPR 倍（手机竖屏 1.39），非整数倍放大时每个目标像素都要插值，
       实测单这一笔 5.8ms；改用最近邻取整采样只要 1.3ms，快 4.5 倍。
       源图最终只占 0.69 个 CSS 像素，画质差别在亚像素级（做过放大对比核对）。
       倍率 < 1（桌面窄窗口）时最近邻会丢像素，那种情况保留平滑。 */
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

function loop(now){
  const dt=Math.min(50,now-last);last=now;t+=dt;
  update(dt);
  /* 【帧率 1/3】面板 / 公告一开，地图就不用再画了。
     它被压在蒙层底下，玩家根本看不见，而每帧重画一次地图要花掉 5~6ms
     （实测：整帧画布开销里 90% 以上都在这里）。
     更亏的是 #modal 上挂着 backdrop-filter:blur(4px)：底下这张 canvas 每帧都在变，
     合成器就得每帧重算一次全屏高斯模糊 —— 答题时的卡顿主要来自这一条。
     停画之后背景成了静止画面，模糊只算一次，帧率立刻回来。
     面板关掉后下一帧自然恢复重画，不需要额外触发；
     update() 照常跑，所以 t 继续累加，动画不会跳帧。 */
  if(!panelOpen()&&!newsIsOpen())draw();
  requestAnimationFrame(loop);
}

