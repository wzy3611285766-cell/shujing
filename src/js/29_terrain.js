/* =========================================================
   实体层 / 地表纹样
   —— canvas 只画地面、阴影、光效；emoji 交给 DOM，彻底绕开
      iOS Safari「canvas 里彩色 emoji 变纯色方块」的老问题
   ========================================================= */

/* ---------- 地表纹样：全部用路径画，不依赖任何字体 ---------- */
const PROP_STYLE={
  /* 📐 数学之国 */ func:'tree',tri:'wave',seq:'peak',geo:'tri',prob:'dot',
  /* ⚡ 物理之国 */ mech:'gear',neng:'flame',dian:'bolt',
  /* 🔥 化学之国 */ atom:'orbit',rate:'scale',org:'hex',
  /* 🌿 生物之国 */ cell:'cellm',gene:'helix',eco:'wave',
  /* 📜 编年史 15 纪元 */ e1:'bone',e2:'pillar',e3:'scroll',e4:'star',e5:'sail',
  e6:'lens',e7:'note',e8:'flame',e9:'gear',e10:'crystal',e11:'cellm',
  e12:'orbit',e13:'bolt',e14:'helix',e15:'circuit'};

function drawProp(c,st,x,y,r,rot,color,alpha){
  c.save();c.translate(x,y);c.rotate(rot);
  c.globalAlpha=alpha;
  c.strokeStyle=color;c.fillStyle=color;
  c.lineWidth=Math.max(1.3,r*.15);c.lineCap='round';c.lineJoin='round';
  switch(st){
    case 'tree':                                    // 小树
      c.beginPath();c.moveTo(0,r*.95);c.lineTo(0,-r*.35);c.stroke();
      c.beginPath();c.arc(0,-r*.62,r*.7,0,7);c.stroke();break;
    case 'wave':                                    // 水波
      for(let k=-1;k<=1;k++){c.beginPath();
        for(let i=-r;i<=r+.1;i+=r/4)c.lineTo(i,k*r*.5+Math.sin(i/r*3.1)*r*.3);
        c.stroke();}
      break;
    case 'peak':                                    // 山脊
      c.beginPath();c.moveTo(-r,-r*.45);c.lineTo(-r*.22,r*.72);c.lineTo(r*.14,-r*.1);
      c.lineTo(r*.5,r*.72);c.lineTo(r,-r*.45);c.stroke();break;
    case 'tri':                                     // 三角形
      c.beginPath();c.moveTo(0,-r*.85);c.lineTo(r*.8,r*.6);c.lineTo(-r*.8,r*.6);
      c.closePath();c.stroke();break;
    case 'dot':                                     // 点阵（骰子面）
      for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
        c.beginPath();c.arc(i*r*.44,j*r*.44,r*.14,0,7);c.fill();}
      break;
    case 'bone':                                    // 刻痕骨
      c.beginPath();c.moveTo(-r*.85,0);c.lineTo(r*.85,0);c.stroke();
      for(let i=-2;i<=2;i++){
        c.beginPath();c.moveTo(i*r*.32,-r*.36);c.lineTo(i*r*.32,r*.36);c.stroke();}
      break;
    case 'pillar':                                  // 希腊柱
      for(let i=-1;i<=1;i++){
        c.beginPath();c.moveTo(i*r*.42,-r*.6);c.lineTo(i*r*.42,r*.78);c.stroke();}
      c.beginPath();c.moveTo(-r*.82,-r*.78);c.lineTo(r*.82,-r*.78);c.stroke();break;
    case 'scroll':                                  // 竹简卷
      for(let i=-1;i<=1;i++){
        c.beginPath();c.moveTo(i*r*.4,-r*.72);c.lineTo(i*r*.4,r*.72);c.stroke();}
      c.beginPath();c.arc(0,0,r*.82,0,7);c.stroke();break;
    case 'star':                                    // 八角星
      c.beginPath();
      for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=(i%2?r*.36:r*.86);
        c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}
      c.closePath();c.stroke();break;
    case 'sail':                                    // 帆
      c.beginPath();c.moveTo(-r*.66,r*.72);c.lineTo(-r*.66,-r*.42);
      c.lineTo(r*.58,r*.72);c.closePath();c.stroke();
      c.beginPath();c.moveTo(-r*.78,r*.72);c.lineTo(r*.82,r*.72);c.stroke();break;
    case 'lens':                                    // 透镜
      c.beginPath();c.arc(0,0,r*.76,0,7);c.stroke();
      c.beginPath();c.moveTo(-r*.92,r*.3);c.lineTo(r*.92,-r*.3);c.stroke();break;
    case 'note':                                    // 音符
      c.beginPath();c.arc(-r*.32,r*.42,r*.27,0,7);c.stroke();
      c.beginPath();c.moveTo(-r*.06,r*.42);c.lineTo(-r*.06,-r*.74);
      c.lineTo(r*.72,-r*.54);c.stroke();break;
    case 'crystal':                                 // 晶体
      c.beginPath();c.moveTo(0,-r*.9);c.lineTo(r*.58,0);c.lineTo(0,r*.9);
      c.lineTo(-r*.58,0);c.closePath();c.stroke();
      c.beginPath();c.moveTo(-r*.58,0);c.lineTo(r*.58,0);c.stroke();break;
    case 'circuit':                                 // 电路
      c.beginPath();c.moveTo(-r*.82,r*.5);c.lineTo(0,r*.5);
      c.lineTo(0,-r*.5);c.lineTo(r*.82,-r*.5);c.stroke();
      c.beginPath();c.arc(-r*.82,r*.5,r*.2,0,7);c.fill();
      c.beginPath();c.arc(r*.82,-r*.5,r*.2,0,7);c.fill();
      c.beginPath();c.arc(0,0,r*.23,0,7);c.fill();break;
    case 'gear':                                    /* 齿轮 */
      c.beginPath();c.arc(0,0,r*.5,0,7);c.stroke();
      for(let i=0;i<8;i++){const a=i*Math.PI/4;
        c.beginPath();c.moveTo(Math.cos(a)*r*.5,Math.sin(a)*r*.5);
        c.lineTo(Math.cos(a)*r*.82,Math.sin(a)*r*.82);c.stroke();}
      c.beginPath();c.arc(0,0,r*.18,0,7);c.stroke();break;
    case 'flame':                                   /* 火苗 */
      c.beginPath();c.moveTo(0,r*.85);
      c.quadraticCurveTo(-r*.72,r*.12,0,-r*.9);
      c.quadraticCurveTo(r*.72,r*.12,0,r*.85);c.stroke();
      c.beginPath();c.moveTo(0,r*.85);
      c.quadraticCurveTo(-r*.3,r*.3,0,-r*.18);
      c.quadraticCurveTo(r*.3,r*.3,0,r*.85);c.stroke();break;
    case 'bolt':                                    /* 闪电 */
      c.beginPath();c.moveTo(r*.2,-r*.9);c.lineTo(-r*.42,r*.08);
      c.lineTo(r*.02,r*.08);c.lineTo(-r*.2,r*.9);c.lineTo(r*.44,-r*.12);
      c.lineTo(0,-r*.12);c.closePath();c.stroke();break;
    case 'orbit':                                   /* 电子轨道 */
      c.beginPath();c.arc(0,0,r*.22,0,7);c.fill();
      for(let i=0;i<3;i++){
        c.save();c.rotate(i*Math.PI/3);
        c.beginPath();c.ellipse(0,0,r*.84,r*.34,0,0,7);c.stroke();
        c.beginPath();c.arc(r*.84,0,r*.11,0,7);c.fill();
        c.restore();}
      break;
    case 'scale':                                   /* 天平 */
      c.beginPath();c.moveTo(0,-r*.6);c.lineTo(0,r*.74);c.stroke();
      c.beginPath();c.moveTo(-r*.78,-r*.32);c.lineTo(r*.78,-r*.32);c.stroke();
      c.beginPath();c.moveTo(-r*.4,r*.72);c.lineTo(r*.4,r*.72);c.stroke();
      c.strokeRect(-r*.78,-r*.32,r*.36,r*.3);
      c.strokeRect(r*.42,-r*.32,r*.36,r*.3);break;
    case 'hex':                                     /* 苯环 */
      c.beginPath();
      for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3;
        c.lineTo(Math.cos(a)*r*.8,Math.sin(a)*r*.8);}
      c.closePath();c.stroke();
      c.beginPath();c.arc(0,0,r*.4,0,7);c.stroke();break;
    case 'cellm':                                   /* 细胞 */
      c.beginPath();c.arc(0,0,r*.82,0,7);c.stroke();
      c.beginPath();c.arc(-r*.18,-r*.12,r*.26,0,7);c.stroke();
      c.beginPath();c.arc(r*.3,r*.26,r*.14,0,7);c.stroke();
      c.beginPath();c.arc(r*.24,-r*.38,r*.1,0,7);c.stroke();break;
    case 'helix':                                   /* 双螺旋 */
      for(let k=0;k<2;k++){
        c.beginPath();
        for(let i=-r;i<=r+.1;i+=r/6)c.lineTo(Math.sin((i/r)*3.1+k*Math.PI)*r*.42,i);
        c.stroke();}
      for(let i=-2;i<=2;i++){
        const yy=i*r*.42;
        c.beginPath();
        c.moveTo(Math.sin((yy/r)*3.1)*r*.42,yy);
        c.lineTo(Math.sin((yy/r)*3.1+Math.PI)*r*.42,yy);c.stroke();}
      break;
    default:
      c.beginPath();c.arc(0,0,r*.5,0,7);c.stroke();
  }
  c.restore();
}

/* ---------- 实体层 ---------- */
const ENT={layer:null,map:new Map()};
function entInit(){ENT.layer=document.getElementById('ents')||null;fxInit();}
function entReset(){
  ENT.map.forEach(n=>{if(n.parentNode)n.parentNode.removeChild(n);});
  ENT.map.clear();
  fxClear();
  crystalPending=null;crystalSeen=-1;   // 换世界后别让旧数字多弹一次
}
function entNode(key){
  let n=ENT.map.get(key);
  if(!n){
    n=document.createElement('div');
    if(ENT.layer)ENT.layer.appendChild(n);
    ENT.map.set(key,n);
  }
  return n;
}
/* 底部中心锚定：用于角色、石碑、结晶这类「立在地上」的东西 */
function entDraw(key,wx,wy,ico,sizePx,top,cls,opa){
  const sx=(wx-cam.x)*SCALE, sy=(wy-cam.y)*SCALE;
  const n=entNode(key);
  const fs=Math.max(18,Math.round(sizePx*SCALE));   // 下限 18px：低于这个数 emoji 就看不清了
  const m=fs*3+80;
  if(sx<-m||sy<-m||sx>VW+m||sy>VH+m){
    if(n.style.display!=='none')n.style.display='none';
    return;
  }
  if(n.style.display==='none')n.style.display='';
  const c2='ent'+(cls?' '+cls:'');
  if(n.className!==c2)n.className=c2;
  const html=(top||'')+'<span class="ico" style="font-size:'+fs+'px">'+ico+'</span>';
  if(n.innerHTML!==html)n.innerHTML=html;
  const o=opa==null?1:opa;
  if(n.style.opacity!=String(o))n.style.opacity=o;
  n.style.transform='translate(-50%,-100%) translate('+sx.toFixed(1)+'px,'+(sy+fs*.5).toFixed(1)+'px)';
}
/* 把一个实体节点从 DOM 里彻底摘掉（捡到的结晶、消失的精灵都走这里） */
function entDrop(key){
  const n=ENT.map.get(key);
  if(!n)return;
  if(n.parentNode)n.parentNode.removeChild(n);
  ENT.map.delete(key);
}

/* =========================================================
   拾取特效：结晶 / 时间星尘被捡起的一瞬间
   ---------------------------------------------------------
   一次拾取同时抛出四样东西：地面冲击环 ×2、四散的光屑、上浮的「+3」，
   以及一枚向上弹起后沿弧线飞向顶栏结晶数的本体。
   本体砸中顶栏那一刻，数字才真正跳到新值并弹一下 —— 反馈链条闭合。
   动画用 Web Animations 驱动，播完节点自行移除；不支持的老浏览器
   自动降级成「数字直接更新 + 顶栏弹一下」，不会卡住数值。
   ========================================================= */
const FX={layer:null,reduce:false};
function fxInit(){
  FX.layer=document.getElementById('fx');
  try{
    const mq=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');
    FX.reduce=!!(mq&&mq.matches);
  }catch(e){FX.reduce=false;}
}
function fxClear(){if(FX.layer)FX.layer.textContent='';}
function fxPos(wx,wy){return {x:(wx-cam.x)*SCALE,y:(wy-cam.y)*SCALE};}
function fxAdd(cls,txt,size,ice){
  if(!FX.layer)return null;
  const d=document.createElement('div');
  d.className=cls+(ice?' ice':'');
  if(txt!=null)d.textContent=txt;
  if(size){d.style.width=size+'px';d.style.height=size+'px';}
  FX.layer.appendChild(d);
  return d;
}
/* transform 固定写成 translate(屏幕坐标) scale() rotate() translate(-50%,-50%)：
   百分位移必须放最后，缩放才以元素自身中心为锚点，否则会往左上角飘。
   每帧都带齐四个函数，关键帧之间才能平滑插值。 */
function fxT(x,y,s,rot){
  return 'translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) scale('+s+')'+
    ' rotate('+(rot||0)+'deg) translate(-50%,-50%)';
}
function fxPlay(el,frames,dur,ease,delay,onEnd){
  if(!el)return;
  let done=false;
  const fin=()=>{
    if(done)return;done=true;
    if(el.parentNode)el.parentNode.removeChild(el);
    if(onEnd)onEnd();
  };
  if(!el.animate){setTimeout(fin,dur+(delay||0));return;}
  let a=null;
  try{a=el.animate(frames,{duration:dur,delay:delay||0,easing:ease||'ease-out',fill:'both'});}
  catch(e){a=null;}
  if(!a){setTimeout(fin,dur+(delay||0));return;}
  a.onfinish=fin;a.oncancel=fin;
}
/* 地面冲击环 */
function fxRing(x,y,d0,d1,dur,delay,ice){
  const el=fxAdd('fx-ring',null,d0,ice);
  fxPlay(el,[
    {transform:fxT(x,y,1,0),opacity:.95},
    {transform:fxT(x,y,d1/d0,0),opacity:0}
  ],dur,'cubic-bezier(.2,.75,.3,1)',delay);
}
/* 光屑：先向外冲，再带一点重力往下坠 */
function fxShard(x,y,ang,rr,sz,dur,delay,ice){
  const el=fxAdd('fx-shard',null,sz,ice);
  const mx=x+Math.cos(ang)*rr*.62, my=y+Math.sin(ang)*rr*.62-8;
  const ex=x+Math.cos(ang)*rr,     ey=y+Math.sin(ang)*rr+R(10,28);
  fxPlay(el,[
    {transform:fxT(x,y,.4,0),opacity:1},
    {transform:fxT(mx,my,1,0),opacity:1,offset:.55},
    {transform:fxT(ex,ey,.25,0),opacity:0}
  ],dur,'cubic-bezier(.15,.7,.35,1)',delay);
}
/* 顶栏结晶数的屏幕坐标（飞行终点） */
function crystalTarget(){
  const el=document.getElementById('crystalChip');
  if(!el)return null;
  const r=el.getBoundingClientRect();
  if(!r.width||!r.height)return null;
  return {x:r.left+r.width/2,y:r.top+r.height/2};
}
function fxPickup(wx,wy,ico,amount){
  const tgt=crystalTarget(), p=fxPos(wx,wy);
  const onScreen=p.x>-60&&p.y>-60&&p.x<VW+60&&p.y<VH+60;
  if(!FX.layer||!tgt||!onScreen||FX.reduce){settleCrystal();return;}
  const ice=(CUR===EPIC);

  /* ① 两道错开的冲击环，做出"啵"的一下 */
  fxRing(p.x,p.y,26,104,520,0,ice);
  fxRing(p.x,p.y,16,142,660,80,ice);

  /* ② 光屑迸射 */
  const n=9;
  for(let i=0;i<n;i++){
    const a=(i/n)*Math.PI*2+R(-.35,.35)-Math.PI/2;   // 整体略微偏上
    fxShard(p.x,p.y,a,R(34,74),R(5,10),R(430,620),R(0,70),ice);
  }

  /* ③ 本体：先向上弹起，再沿弧线飞向顶栏，最后缩成一点被吸收 */
  const fly=fxAdd('fx-fly',ico||(ice?'✨':'💎'),null,ice);
  const fs=Math.max(20,Math.round(30*SCALE));
  fly.style.fontSize=fs+'px';
  const dx=tgt.x-p.x, dy=tgt.y-p.y, len=Math.hypot(dx,dy);
  const dur=clamp(480+len*.5,540,900);
  const mx=p.x+dx*.45, my=p.y+dy*.4-Math.min(130,52+len*.16);
  fxPlay(fly,[
    {transform:fxT(p.x,p.y,1.45,0),opacity:1},
    {transform:fxT(p.x,p.y-16,1.15,-120),opacity:1,offset:.18},
    {transform:fxT(mx,my,.9,260),opacity:1,offset:.6},
    {transform:fxT(tgt.x,tgt.y,.3,520),opacity:.15}
  ],dur,'cubic-bezier(.36,.06,.3,1)',0,()=>{
    fxRing(tgt.x,tgt.y,18,56,420,0,ice);   // 砸中顶栏的落点光斑
    settleCrystal();
  });
  setTimeout(settleCrystal,dur+900);       // 兜底：动画被打断也保证数字会更新

  /* ④ 世界坐标处的 +N */
  if(amount>0){
    const pop=fxAdd('fx-pop','+'+amount,null,ice);
    pop.style.fontSize=Math.max(15,Math.round(19*SCALE))+'px';
    fxPlay(pop,[
      {transform:fxT(p.x,p.y-24,.6,0),opacity:0},
      {transform:fxT(p.x,p.y-48,1.14,0),opacity:1,offset:.3},
      {transform:fxT(p.x,p.y-90,1,0),opacity:0}
    ],900,'cubic-bezier(.2,.8,.3,1)',60);
  }
}

/* ---------- 结晶入账 ----------
   (wx,wy) 给了世界坐标就播完整的拾取动画，否则只让顶栏数字跳一下。
   飞行途中顶栏仍显示旧值，本体砸中后 settleCrystal() 才补上新值。 */
let crystalPending=null,crystalSeen=-1;
function crystalShown(){return crystalPending==null?state.crystals:crystalPending;}
function settleCrystal(){
  if(crystalPending==null)return;
  crystalPending=null;
  updateHUD();
}
function watchCrystal(v){
  if(crystalSeen>=0&&v>crystalSeen)pulseCrystalChip();
  crystalSeen=v;
}
function pulseCrystalChip(){
  const el=document.getElementById('crystalChip');
  if(!el)return;
  el.classList.remove('pop');
  void el.offsetWidth;                 // 强制回流，连续拾取时动画才会重新起跑
  el.classList.add('pop');
  clearTimeout(el._popT);
  el._popT=setTimeout(()=>el.classList.remove('pop'),540);
}
function gainCrystals(n,wx,wy,ico){
  const from=state.crystals;
  state.crystals+=n;
  if(wx!=null){
    if(crystalPending==null)crystalPending=from;   // 已有结晶在飞就沿用最早的显示值
    fxPickup(wx,wy,ico,n);
  }else settleCrystal();
  save();updateHUD();
}
/* 中心锚定：用于岛名这类横幅文字 */
function entLabel(key,wx,wy,html,scaleWithCam){
  const sx=(wx-cam.x)*SCALE, sy=(wy-cam.y)*SCALE;
  const n=entNode(key);
  const m=260;
  if(sx<-m||sy<-m||sx>VW+m||sy>VH+m){
    if(n.style.display!=='none')n.style.display='none';
    return;
  }
  if(n.style.display==='none')n.style.display='';
  if(n.className!=='ent')n.className='ent';
  if(n.innerHTML!==html)n.innerHTML=html;
  const k=(scaleWithCam!==false)?Math.max(.62,Math.min(1.25,SCALE)):1;
  n.style.transform='translate(-50%,-50%) translate('+sx.toFixed(1)+'px,'+sy.toFixed(1)+'px) scale('+k.toFixed(2)+')';
}

/* 每帧把世界上的东西同步到 DOM 层 */
function syncEnts(){
  if(!ENT.layer)return;
  const seen=new Set();
  const mark=k=>seen.add(k);

  const bzWorld=(CUR===BLAZE);
  SPOTS.forEach((s,idx)=>{
    const key='s'+idx, done=spotDone(s);
    mark(key);
    const sizePx=(s.t==='guard'?46:38);
    /* 烽火：目标一律贴地站好。
       entDraw 的锚点是「底边中心」，底边的世界坐标 = wy + 8 + sizePx/2
       （8 是历史遗留偏移，sizePx/2 是图标那一行字高度的一半）。
       这里反解出 wy，直接指定「脚底该落在哪」：
         普通目标 → s.y+14，正踩在 draw() 画的那枚影子上（中心 s.y+14、纵半轴 7）；
         撤离点   → s.y-30，悬在停机坪上方，不糊住地面上那个 H（占 s.y-18 ~ s.y+22）。
       实测各档缩放下脚底都落在 13.7~14.3，改动前是 -19 —— 整只浮在地面上方约 33 个单位。
       闯关 / 史诗沿用原来的「悬空 46 + 上下轻飘」—— 石碑、精灵本就是浮在空中的设定，
       照搬到烽火就成了敌人整只浮在地面上方一个身位、和地形对不上。 */
    const footY=bzWorld ? (s.t==='exfil'?-30 : 14) : 0;
    const py=bzWorld ? (s.y+footY-8-sizePx*0.5)
                     : (s.y-46+Math.sin(t/420+s.x)*5);
    /* 名牌只挂在「当前能互动的那一个」上：全挂会一屏挤成一团，手机上尤其看不清 */
    let label='';
    if(!done&&s===curSpot){
      const txt=(CUR&&CUR.spotLabel)?CUR.spotLabel(s)
        :(s.t==='totem'?('⛩️ '+s.name)
          :s.t==='guard'?'守护者挑战'
          :s.t==='spirit'?('精灵 · '+s.name)
          :s.t==='hermit'?'引路人':'解谜');
      label='<div class="lbl">'+esc(txt)+'</div>';
    }
    const read=CUR===EPIC&&state.read[s.sid];
    entDraw(key,s.x,py,s.e,sizePx,label,
      (done?'dim ':'')+(CUR===EPIC?(read?'':'glow'):''),done?.34:(read?.6:1));
  });

  LOOSE.forEach(c=>{
    const key='c'+c.id;
    if(c.got){
      /* 关键：捡到的结晶必须主动把 DOM 节点摘掉。
         以前这里直接 return，既不 mark 也不删除，节点就永远停在
         捡到那一刻的坐标上——屏幕上于是堆出一串卡住不消失的宝石。 */
      entDrop(key);
      return;
    }
    mark(key);
    const by=Math.sin(t/300+c.bob)*5;
    /* 靠近时轻轻放大：拾取前给一点"就在眼前"的预示，也是拾取特效的起手式 */
    const near=clamp(1+(1-dist(state.x,state.y,c.x,c.y)/110)*.22,1,1.22);
    const csize=28*near;
    /* 烽火：散落的战利品是掉在地上的，脚底落在 c.y+by，正好压住地面那圈光晕
       （draw() 画在 c.y+by、半径 17）；闯关 / 史诗的结晶是浮空旋转的设定，保持原样。
       反解方式同上：wy = 目标脚底 − 8 − 图标半高。 */
    entDraw(key,c.x,(bzWorld?(c.y+by-8-csize*0.5):(c.y+by)),
            (CUR===EPIC?'✨':'💎'),csize,'','glow',1);
  });

  if(CUR===EPIC){
    BRIDGES.forEach(b=>{
      if(!b.need||state.badges[b.need])return;
      const key='lk'+b.id;mark(key);
      const cx=b.rect[0]+b.rect[2]/2,cy=b.rect[1]+b.rect[3]/2;
      entDraw(key,cx,cy-24,'🔒',30,'','' ,1);
    });
    EPOCHS.forEach(ep=>{
      const key='ep'+ep.id;mark(key);
      const cx=ep.rect[0]+ep.rect[2]/2, cy=ep.rect[1]+ep.rect[3]-46;
      entLabel(key,cx,cy,
        '<div class="nm" style="font-size:var(--fs-3xl);max-width:80vw;'+
          'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+ep.emoji+' '+esc(ep.name)+'</div>'+
        '<div class="yr" style="font-size:var(--fs-md);max-width:80vw;'+
          'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(ep.sub)+'</div>');
    });
  }else{
    BRIDGES.forEach(b=>{
      if(!b.need||state.badges[b.need])return;
      const key='lk'+b.id;mark(key);
      const cx=b.rect[0]+b.rect[2]/2,cy=b.rect[1]+b.rect[3]/2;
      entDraw(key,cx,cy-24,'🔒',30,'','',1);
    });
  }

  const px=state.x,py=state.y,bob=Math.sin(t/150)*3;
  mark('me');
  /* 角色的底边本来就算在 py+19 上下，正好压住 draw() 里那枚影子（中心 py+18），
     三个世界通用，烽火里不必再动 —— 之前多此一举的 +2 反而把人往下沉了。 */
  entDraw('me',px,py-5+bob,(CUR===EPIC?'⛵':(CUR===BLAZE?'🥷':'🧑‍🎓')),32,'','',1);

  /* 切换世界 / 收服精灵后，清掉不再需要的节点。
     以前这里有个「多出 6 个以上才清理」的阈值，结果残留节点会一直挂在屏幕上；
     节点总数最多几十个，每帧扫一遍的开销可以忽略，直接全扫更保险。 */
  ENT.map.forEach((n,k)=>{
    if(seen.has(k))return;
    if(n.parentNode)n.parentNode.removeChild(n);
    ENT.map.delete(k);
  });
}

