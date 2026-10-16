/* =========================================================
   🎞 动图引擎与带动图的题图（2.0.0）
   ========================================================= */
/* =========================================================
   🎞 动图引擎（2.0.0）
   ---------------------------------------------------------
   物理题光给一张静态图，学生看不到"过程"：物块怎么滑、弹簧怎么压、
   速度什么时候最大、卫星怎么变轨 —— 这些恰恰是解题的钥匙。
   所以凡是能动的图都做成动图：SVG 里需要动的元素打上 data-a 标记，
   由这里统一用 requestAnimationFrame 驱动，一条全局时间线跑全部动画。

   用法：
     · 画图时给元素加 data-a="名字"
     · 用 svgWrap(w,h,body,'动画名') 输出，svg 会带上 data-fig
     · 面板打开后 openPanel 自动扫描 svg[data-fig] 并把动画挂上去
     · 元素离开 DOM（面板关闭）自动停掉，不留野循环
   ========================================================= */
const QFIG_ANIM={};                 /* 动画名 → {dur:周期ms, run(svg,p,c)} */
let   QFIG_LIST=[];                 /* 正在跑的动画实例 */
let   QFIG_PAUSE=0;                 /* 全局暂停（放大看时手动停） */
function qfigTick(now){
  for(let i=QFIG_LIST.length-1;i>=0;i--){
    const it=QFIG_LIST[i];
    /* 面板关了、元素被替换掉 —— 顺手摘掉，别让循环越跑越长 */
    if(!it.svg||!it.svg.isConnected){QFIG_LIST.splice(i,1);continue;}
    const A=QFIG_ANIM[it.name];
    if(!A){QFIG_LIST.splice(i,1);continue;}
    if(QFIG_PAUSE||it.off)continue;
    const p=((now-it.t0)%A.dur)/A.dur;
    try{A.run(it.svg,p,it.c||(it.c={}));}catch(e){QFIG_LIST.splice(i,1);}
  }
  requestAnimationFrame(qfigTick);
}
requestAnimationFrame(qfigTick);
/* 扫描一个容器里的所有动图并启动（同一张图只挂一次） */
function qfigRun(root){
  if(!root||!root.querySelectorAll)return;
  root.querySelectorAll('svg[data-fig]').forEach(svg=>{
    const name=svg.getAttribute('data-fig');
    if(!QFIG_ANIM[name]||svg.__qfig)return;
    svg.__qfig=1;
    QFIG_LIST.push({svg:svg,name:name,t0:performance.now(),c:{}});
  });
}
/* 取动画节点（第一次查到就缓存，之后不再 querySelector） */
function qf(svg,c,k){
  if(c[k]===undefined)c[k]=svg.querySelector('[data-a="'+k+'"]');
  return c[k];
}

function qfTxt(el,t){if(el&&el.textContent!==t)el.textContent=t;}

/* 缓动：加速 / 减速 */
const easeIn=p=>p*p, easeOut=p=>1-(1-p)*(1-p);
function clamp01(p){return p<0?0:p>1?1:p;}
/* 分段映射：把 0~1 的相位 p 按 [起点,终点] 列表切成若干段 */
function seg(p,stops){
  const n=stops.length-1;
  for(let i=0;i<n;i++){
    const a=stops[i],b=stops[i+1];
    if(p>=a&&p<=b)return {i:i,t:(p-a)/(b-a)};
  }
  return {i:n-1,t:1};
}
/* 折线/曲线查表插值（预先算好时间—角度表，避免每帧重算积分） */
function tblAt(tb,p){
  const n=tb.length-1;
  const x=clamp01(p)*n,i=Math.floor(x);
  if(i>=n)return tb[n];
  const f=x-i;
  return tb[i]+(tb[i+1]-tb[i])*f;
}

/* ============ 动图 ①：斜面 + 弹簧（物块从高处滑下，压缩底端弹簧）============
   修复：原版物块从斜面底端"上滑"到顶端压弹簧 —— 方向整个反了。
   现在：T 为顶端（高），E 为底端（低），倾角 30°，弹簧固定在底端挡板上，
   物块自 S0 自由下滑 → 接触弹簧 → 压缩到最低 → 弹回 → 上滑回原处。
   压缩段是简谐运动的一段：平衡位置（合力为零）速度最大，数值按能量守恒算。 */
function figSlopeSpring(){
  const w=360,h=250;
  const T=[40,50],E=[300,200];                 /* dy/dx = 150/260 → 恰好 30° */
  const dx=E[0]-T[0],dy=E[1]-T[1],L=Math.hypot(dx,dy);
  const ux=dx/L,uy=dy/L,nx=uy,ny=-ux;          /* 法向：指向斜面上方 */
  const P=(s,off)=>[T[0]+ux*s+nx*off,T[1]+uy*s+ny*off];
  const S0=30,SF=200,SM=277,SE=300;            /* 起点 / 接触 / 最大压缩 / 弹簧固定端 */
  function blk(s){
    const a=P(s-16,4),b=P(s+16,4),c=P(s+16,30),d=P(s-16,30);
    return 'M '+fx(a[0])+' '+fx(a[1])+' L '+fx(b[0])+' '+fx(b[1])
      +' L '+fx(c[0])+' '+fx(c[1])+' L '+fx(d[0])+' '+fx(d[1])+' Z';
  }
  function spr(s){
    let d='M '+fx(T[0]+ux*SE)+' '+fx(T[1]+uy*SE);
    for(let i=1;i<=9;i++){
      const t=SE-(SE-s)*i/9,g=(i%2?1:-1)*9;
      d+=' L '+fx(T[0]+ux*t+nx*g)+' '+fx(T[1]+uy*t+ny*g);
    }
    return d;
  }
  let s=fPoly([T,E,[T[0],E[1]]],{c:FC.ink,w:2.6});
  s+=fL(20,E[1],336,E[1],{c:FC.axis,w:1.8});
  /* 30° 角标（画在底端 E 处） */
  s+=fPath('M 255 '+E[1]+' A 45 45 0 0 1 261 177',{c:FC.green,w:1.8});
  s+=fT(268,196,'30°',{s:12,c:FC.green});
  /* 底端固定挡板 */
  s+=fL(T[0]+ux*SE+nx*26,T[1]+uy*SE+ny*26,T[0]+ux*SE-nx*5,T[1]+uy*SE-ny*5,{c:FC.ink,w:3});
  s+=fPath(spr(SF),{c:FC.red,w:2.2}).replace('<path','<path data-a="spr"');
  s+=fPath(blk(S0),{f:FC.fill,c:FC.blue,w:2.2}).replace('<path','<path data-a="blk"');
  const c0=P(S0,17);
  s+=fT(c0[0]-15,c0[1]-2,'m',{s:13,c:FC.ink,b:1}).replace('<text','<text data-a="lbl"');
  s+=fL(c0[0],c0[1],c0[0]+ux*26,c0[1]+uy*26,{c:FC.green,w:2.2,m:'fg'})
     .replace('<line','<line data-a="va"');
  s+=fT(c0[0]+ux*32,c0[1]+uy*32+6,'v',{s:13,c:FC.green,i:1})
     .replace('<text','<text data-a="vt"');
  s+=fT(180,20,'',{s:13,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(24,242,'轻弹簧 · 压缩 x = 0.10 m 时合力为零，v 最大',{s:11,c:FC.sub,a:'start'});
  return svgWrap(w,h,s,'slope');
}
QFIG_ANIM.slope={dur:4600,run:function(svg,p,c){
  const T=[40,50],E=[300,200];
  const dx=E[0]-T[0],dy=E[1]-T[1],L=Math.hypot(dx,dy);
  const ux=dx/L,uy=dy/L,nx=uy,ny=-ux;
  const Pq=(s,off)=>[T[0]+ux*s+nx*off,T[1]+uy*s+ny*off];
  const S0=30,SF=200,SM=277;
  const PX=120;                      /* 1 m = 120 px */
  const A=5;                         /* g·sin30° = 5 m/s² */
  const x0=0.10;                     /* 平衡压缩量（m） */
  const w2=A/x0;                     /* ω² = k/m */
  const v0=Math.sqrt(2*A*(SF-S0)/PX);          /* 接触弹簧时的速度 */
  const Amp=Math.sqrt(x0*x0+v0*v0/w2);         /* 简谐振幅（m） */
  const phi0=Math.asin(-x0/Amp);               /* 接触点相位 */
  const seq=SF+x0*PX;                          /* 平衡位置对应的 s */
  /* 各段真实时长（s）：自由下滑 / 压缩 / 弹回 / 上滑 */
  const t1=v0/A, t2=(Math.PI/2-phi0)/Math.sqrt(w2);
  const tot=2*t1+2*t2;
  const g=seg(p,[0,t1/tot,(t1+t2)/tot,(t1+2*t2)/tot,1]);
  let sPos,v;
  if(g.i===0){                       /* 自由下滑：匀加速 */
    const tt=g.t*t1; sPos=S0+0.5*A*tt*tt*PX; v=A*tt;
  }else if(g.i===1){                 /* 压缩：简谐，从接触点到最低点 */
    const phi=phi0+(Math.PI/2-phi0)*g.t;
    sPos=seq+Amp*Math.sin(phi)*PX; v=Math.sqrt(Math.max(0,w2*(Amp*Amp-Math.pow(Amp*Math.sin(phi),2))));
  }else if(g.i===2){                 /* 弹回：简谐，最低点回到接触点 */
    const phi=Math.PI/2-(Math.PI/2-phi0)*g.t;
    sPos=seq+Amp*Math.sin(phi)*PX; v=-Math.sqrt(Math.max(0,w2*(Amp*Amp-Math.pow(Amp*Math.sin(phi),2))));
  }else{                             /* 离开弹簧后减速上滑，回到 S0 */
    const tt=(1-g.t)*t1; sPos=SF-(v0*tt-0.5*A*tt*tt)*PX; v=-(v0-A*tt);
  }
  if(sPos>SM)sPos=SM; if(sPos<S0-4)sPos=S0;
  const blk=qf(svg,c,'blk');
  if(blk){
    const a=Pq(sPos-16,4),b=Pq(sPos+16,4),cc=Pq(sPos+16,30),d=Pq(sPos-16,30);
    blk.setAttribute('d','M '+fx(a[0])+' '+fx(a[1])+' L '+fx(b[0])+' '+fx(b[1])
      +' L '+fx(cc[0])+' '+fx(cc[1])+' L '+fx(d[0])+' '+fx(d[1])+' Z');
  }
  const spr=qf(svg,c,'spr');
  if(spr){
    const SE=300;
    let d='M '+fx(T[0]+ux*SE)+' '+fx(T[1]+uy*SE);
    for(let i=1;i<=9;i++){
      const t=SE-(SE-sPos)*i/9,gg=(i%2?1:-1)*9;
      d+=' L '+fx(T[0]+ux*t+nx*gg)+' '+fx(T[1]+uy*t+ny*gg);
    }
    spr.setAttribute('d',d);
  }
  const cp=Pq(sPos,17);
  const len=Math.min(46,Math.abs(v)*11),sg=v>=0?1:-1;
  const va=qf(svg,c,'va'),vt=qf(svg,c,'vt'),lbl=qf(svg,c,'lbl');
  if(va){va.setAttribute('x1',fx(cp[0]));va.setAttribute('y1',fx(cp[1]));
    va.setAttribute('x2',fx(cp[0]+ux*len*sg));va.setAttribute('y2',fx(cp[1]+uy*len*sg));
    va.setAttribute('marker-end',v>=0?'url(#fg)':'url(#fr)');
    va.setAttribute('stroke',v>=0?FC.green:FC.red);
    va.setAttribute('opacity',Math.abs(v)<0.12?'0.25':'1');}
  if(vt)vt.setAttribute('x',fx(cp[0]+ux*len*sg+8));
  if(vt)vt.setAttribute('y',fx(cp[1]+uy*len*sg+16));
  if(lbl){lbl.setAttribute('x',fx(cp[0]-15));lbl.setAttribute('y',fx(cp[1]-2));}
  const x=(sPos-SF)/PX;              /* 压缩量（m），未接触时为负 */
  const hud=qf(svg,c,'hud');
  if(hud){
    if(x<=0.002)qfTxt(hud,'下滑中 · 弹簧未接触 · v = '+Math.abs(v).toFixed(2)+' m/s');
    else if(Math.abs(x-x0)<0.012){qfTxt(hud,'x = '+x.toFixed(2)+' m → 合力为零，v 最大！');
      hud.setAttribute('fill',FC.gold);}
    else{qfTxt(hud,'x = '+x.toFixed(2)+' m · v = '+Math.abs(v).toFixed(2)+' m/s');
      hud.setAttribute('fill',FC.gold);}
  }
}};

/* ============ 动图 ②：板块模型（滑块减速 / 木板加速 / 共速）============
   修复：原版 PX=52，滑块与木板都会跑出画布右边界。
   现在木板缩短到 200 px、比例降到 20 px/m，全程留在画面内；
   相对滑行的标尺画成「木板上滑块起点 → 滑块当前位置」，长度就是相对位移。 */
function figBlock(){
  const w=360,h=210;
  let s=fR(40,140,200,26,{f:FC.fill,c:FC.ink,w:2.2,r:3}).replace('<rect','<rect data-a="plk"');
  s+=fR(96,104,74,36,{f:'#dbeafe',c:FC.blue,w:2.2,r:3}).replace('<rect','<rect data-a="blk"');
  s+=fL(24,166,336,166,{c:FC.axis,w:2});
  s+=fT(180,196,'地面光滑 · 木板足够长',{s:12,c:FC.sub});
  s+=fL(133,90,193,90,{c:FC.green,w:2.4,m:'fg'}).replace('<line','<line data-a="va"');
  s+=fT(163,80,'v₀',{s:13,c:FC.green,i:1}).replace('<text','<text data-a="vt"');
  s+=fT(133,126,'m',{s:13,b:1}).replace('<text','<text data-a="lm"');
  s+=fT(196,158,'M',{s:13,b:1}).replace('<text','<text data-a="lM"');
  s+=fT(180,58,'',{s:13,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  /* 相对滑行标尺：随木板走的参考点 → 滑块当前位置 */
  s+=fL(96,120,96,136,{c:FC.red,w:1.4}).replace('<line','<line data-a="m0"');
  s+=fL(170,120,170,136,{c:FC.red,w:1.4}).replace('<line','<line data-a="m1"');
  s+=fL(96,128,170,128,{c:FC.red,w:1.4,d:'4 3'}).replace('<line','<line data-a="mb"');
  return svgWrap(w,h,s,'block');
}
QFIG_ANIM.block={dur:4200,run:function(svg,p,c){
  /* 真实数据：a₁ = 2、a₂ = 2/3，1.5 s 后共速；滑块走 3.75 m、木板 0.75 m */
  const T=1.5,PX=20;                 /* 1 m = 20 px */
  let tt,v1,v2;
  const g=seg(p,[0,0.70,0.94,1]);
  if(g.i===0){
    tt=g.t*T;
    v1=4-2*tt; v2=(2/3)*tt;
  }else{                              /* 共速后一起匀速 */
    tt=T;
    v1=v2=4/3;
  }
  const s1=4*tt-tt*tt, s2=tt*tt/3;
  const extra=(g.i===1)?(g.t*1.2)*(4/3):(g.i===2?1.2*(4/3):0);
  const x1=(s1+extra)*PX, x2=(s2+extra)*PX;
  const blk=qf(svg,c,'blk'),plk=qf(svg,c,'plk');
  if(blk)blk.setAttribute('x',fx(96+x1));
  if(plk)plk.setAttribute('x',fx(40+x2));
  const lm=qf(svg,c,'lm');
  if(lm)lm.setAttribute('x',fx(133+x1));
  const lM=qf(svg,c,'lM');
  if(lM)lM.setAttribute('x',fx(196+x2));
  const va=qf(svg,c,'va'),vt=qf(svg,c,'vt');
  if(va){va.setAttribute('x1',fx(133+x1));va.setAttribute('x2',fx(133+x1+v1*12));
    va.setAttribute('opacity',Math.abs(v1)<0.05?'0.2':'1');}
  if(vt)vt.setAttribute('x',fx(133+x1+v1*12));
  /* 参考点随木板走（96+x2），滑块当前 96+x1，间距就是相对滑行距离 */
  const a=96+x2,b=96+x1;
  const m0=qf(svg,c,'m0'),m1=qf(svg,c,'m1'),mb=qf(svg,c,'mb');
  if(m0){m0.setAttribute('x1',fx(a));m0.setAttribute('x2',fx(a));}
  if(m1){m1.setAttribute('x1',fx(b));m1.setAttribute('x2',fx(b));}
  if(mb){mb.setAttribute('x1',fx(a));mb.setAttribute('x2',fx(b));
    mb.setAttribute('opacity',(g.i===0&&b-a>10)?'1':'0.25');}
  const hud=qf(svg,c,'hud');
  if(hud){
    if(g.i===0)qfTxt(hud,'v₁ = '+v1.toFixed(2)+' · v₂ = '+v2.toFixed(2)+' m/s　相对滑行 '+((s1-s2)).toFixed(2)+' m');
    else qfTxt(hud,'共速 v = 1.33 m/s · 相对滑行共 3.00 m');
  }
}};

/* ============ 动图 ③：竖直圆轨道（最高点慢、最低点快）============ */
function figLoop(){
  const w=300,h=250,cx=150,cy=130,r=88;
  let s=fC(cx,cy,r,{c:FC.ink,w:2.6});
  s+=fC(cx,cy,4,{f:FC.sub,c:FC.sub});
  s+=fC(cx,cy-r,5,{f:FC.red,c:FC.red,w:2});
  s+=fC(cx,cy+r,5,{f:FC.blue,c:FC.blue,w:2});
  s+=fT(cx,cy-r-12,'最高点',{s:12,c:FC.red});
  s+=fT(cx,cy+r+22,'最低点',{s:12,c:FC.blue});
  s+=fT(cx+r+16,cy+4,'R',{s:13,c:FC.sub,i:1});
  /* 初始位置与动画首帧一致（从最低点出发） */
  s+=fC(cx,cy+r,9,{f:FC.gold,c:'#8a5a00',w:2}).replace('<circle','<circle data-a="ball"');
  s+=fL(cx,cy+r,cx+30,cy+r,{c:FC.green,w:2,m:'fg'}).replace('<line','<line data-a="va"');
  s+=fT(150,26,'',{s:13,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(150,236,'光滑圆轨道 · 恰好过最高点',{s:11,c:FC.sub});
  return svgWrap(w,h,s,'loop');
}
QFIG_ANIM.loop={dur:3400,run:function(svg,p,c){
  const cx=150,cy=130,r=88;
  /* 预计算：从最低点出发，按机械能守恒积分一圈的 θ(t) */
  if(!c.tb){
    const g=10,R=0.4,v2low=20;                 /* 本题：v_低² = 20 (m/s)² */
    const v2=(th)=>{                            /* th 从最低点起算的圆心角 */
      const h=R*(1-Math.cos(th));
      return Math.max(0.01,v2low-2*g*h);
    };
    const dt=0.002;let th=0,t=0;const tb=[0];
    while(th<2*Math.PI&&t<20){
      const v=Math.sqrt(v2(th));
      th+=v/R*dt;t+=dt;tb.push(th);
    }
    c.tb=tb;
  }
  const th=tblAt(c.tb,p);
  const x=cx+r*Math.sin(th),y=cy+r*Math.cos(th);
  const ball=qf(svg,c,'ball');
  if(ball){ball.setAttribute('cx',fx(x));ball.setAttribute('cy',fx(y));}
  /* 速度方向 = 切线方向，长度 ∝ v */
  const vv=Math.sqrt(Math.max(0.01,20-2*10*0.4*(1-Math.cos(th))));
  const tx=Math.cos(th),ty=-Math.sin(th);
  const L=vv*3.2;
  const va=qf(svg,c,'va');
  if(va){va.setAttribute('x1',fx(x));va.setAttribute('y1',fx(y));
    va.setAttribute('x2',fx(x+tx*L));va.setAttribute('y2',fx(y+ty*L));}
  const hud=qf(svg,c,'hud');
  if(hud){
    const top=Math.abs(Math.cos(th)+1)<0.12;
    qfTxt(hud,top?('最高点 v = '+vv.toFixed(2)+' m/s = √(gR)'):('v = '+vv.toFixed(2)+' m/s'));
  }
}};

/* ============ 动图 ④：导体棒切割磁感线（减速直到停下）============ */
function figRail(){
  const w=360,h=220;
  let s=fR(30,40,300,140,{c:FC.ink,w:2.4,r:2});
  s+=fR(150,40,64,140,{f:'#f2f6fa',c:'none',w:0});
  s+=fR(150,40,64,140,{c:FC.grid,w:1.4,d:'3 3'});
  for(let x=166;x<=206;x+=20)for(let y=58;y<=170;y+=24){
    s+=fL(x-5,y-5,x+5,y+5,{c:FC.green,w:1.6})+fL(x-5,y+5,x+5,y-5,{c:FC.green,w:1.6});
  }
  s+=fR(158,92,48,10,{f:FC.blue,c:FC.blue,w:2,r:2}).replace('<rect','<rect data-a="bar"');
  s+=fT(182,80,'ab',{s:13,b:1,c:FC.blue}).replace('<text','<text data-a="lb"');
  s+=fL(182,102,182,124,{c:FC.red,w:2.4,m:'fr'}).replace('<line','<line data-a="va"');
  s+=fT(196,120,'v',{s:13,c:FC.red,i:1}).replace('<text','<text data-a="vt"');
  s+=fR(280,58,30,26,{f:'none',c:FC.ink,w:2.2,r:2});
  s+=fT(295,80,'R',{s:13,b:1});
  s+=fT(80,64,'B',{s:13,c:FC.green,b:1,i:1});
  /* 电流方向：沿回路流动的虚线 */
  s+=fPoly([[80,40],[80,180],[280,180],[280,84]],{c:FC.ink,w:2,d:'7 6'})
     .replace('<polyline','<polyline data-a="cur"');
  s+=fT(186,20,'',{s:13,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(180,204,'间距 L · 磁感应强度 B · 只有安培力做负功',{s:11,c:FC.sub});
  return svgWrap(w,h,s,'rail');
}
QFIG_ANIM.rail={dur:4000,run:function(svg,p,c){
  /* 真实规律：v = v₀e^(−t/τ)，τ = mR/(B²L²) = 2.5 s，画面取 0~3τ */
  const v0=5,tau=2.5,T=7.5;
  const t=p*T;
  const v=v0*Math.exp(-t/tau);
  const x=v0*tau*(1-Math.exp(-t/tau));      /* 单位 m */
  const PX=26;                               /* 1 m = 26 px */
  const bar=qf(svg,c,'bar');
  if(bar)bar.setAttribute('x',fx(158+Math.min(112,x*PX)));
  const lb=qf(svg,c,'lb');
  if(lb)lb.setAttribute('x',fx(182+Math.min(112,x*PX)));
  const bx=182+Math.min(112,x*PX);
  const va=qf(svg,c,'va'),vt=qf(svg,c,'vt');
  if(va){va.setAttribute('x1',fx(bx));va.setAttribute('x2',fx(bx+v*7));
    va.setAttribute('opacity',v<0.2?'0.2':'1');}
  if(vt)vt.setAttribute('x',fx(bx+v*7+10));
  /* 电流：dashoffset 流动速度 ∝ v */
  const cur=qf(svg,c,'cur');
  if(cur){cur.setAttribute('stroke-dashoffset',fx(-t*v*10));
    cur.setAttribute('opacity',v<0.15?'0.15':'1');}
  const hud=qf(svg,c,'hud');
  if(hud){
    const q=v0*tau*(1-Math.exp(-t/tau))*0.5;   /* q = mv₀/(BL)·(1−e^…) */
    qfTxt(hud,'v = '+v.toFixed(2)+' m/s · 已流过的电荷量 '+(v0*tau*(1-Math.exp(-t/tau))/2).toFixed(2)+' C');
  }
}};

/* ============ 动图 ⑤：质谱仪（加速 → 磁场半圆偏转 → 打底片）============ */
function figMassSpec(){
  const w=360,h=220;
  let s=fR(40,60,8,100,{f:FC.ink,c:FC.ink,w:1.6});
  s+=fR(76,60,8,100,{f:FC.ink,c:FC.ink,w:1.6});
  s+=fT(62,50,'U',{s:13,c:FC.sub,i:1});
  s+=fR(120,30,210,160,{f:'#f4f8fb',c:FC.grid,w:1.4,d:'4 4'});
  for(let x=140;x<=310;x+=22)for(let y=48;y<=176;y+=24){
    s+=fL(x-5,y-5,x+5,y+5,{c:FC.green,w:1.4})+fL(x-5,y+5,x+5,y-5,{c:FC.green,w:1.4});
  }
  s+=fPath('M 130 110 A 78 78 0 0 1 286 110',{c:FC.red,w:2.6});
  s+=fC(130,110,4,{f:FC.red,c:FC.red});
  s+=fC(286,110,4,{f:FC.red,c:FC.red});
  s+=fC(84,110,6,{f:FC.gold,c:'#8a5a00',w:2}).replace('<circle','<circle data-a="pt"');
  s+=fT(190,44,'B',{s:13,c:FC.green,b:1,i:1});
  s+=fT(208,152,'d',{s:13,c:FC.red,i:1});
  s+=fT(186,20,'',{s:13,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(w,h,s,'ms');
}
QFIG_ANIM.ms={dur:3800,run:function(svg,p,c){
  const g=seg(p,[0,0.22,0.86,1]);
  let x=84,y=110,txt='';
  const pt=qf(svg,c,'pt');
  if(g.i===0){                       /* 电场加速 */
    x=84+(130-84)*easeIn(g.t);
    txt='电场中加速：qU = ½mv²';
  }else if(g.i===1){                 /* 磁场中半圆偏转 */
    const a=Math.PI*g.t;
    x=208-78*Math.cos(a);y=110-78*Math.sin(a);
    txt='磁场中偏转：qvB = mv²/r';
  }else{                             /* 打在底片上 */
    x=286;y=110;txt='打在底片：d = 2r ⟹ q/m = 8U/(B²d²)';
  }
  if(pt){pt.setAttribute('cx',fx(x));pt.setAttribute('cy',fx(y));
    pt.setAttribute('opacity',g.i===2&&p>0.95?'0.4':'1');}
  const hud=qf(svg,c,'hud');
  if(hud)qfTxt(hud,txt);
}};

/* ============ 动图 ⑥：卫星变轨（圆 → 椭圆 → 圆）============
   修复：原版把转移椭圆画成「以地心为中心、半长轴 116」，
   于是近地点 P(r=44) 根本不在椭圆上，卫星出轨后直接飘走。
   正确的是：转移椭圆以地心为一个焦点，近地点 = r₁ = 44、远地点 = r₂ = 116，
   故半长轴 a = (44+116)/2 = 80，中心偏离地心 c = a − r₁ = 36。 */
function figOrbit(){
  const w=330,h=240,cx=150,cy=120;
  const a=80,b=Math.sqrt(a*a-36*36);       /* b = √(80²−36²) ≈ 71.4 */
  const ecx=cx-36;                          /* 椭圆中心（地心在其右侧 36） */
  let s=fC(cx,cy,12,{f:FC.gold,c:'#a8760a',w:2});
  s+=fC(cx,cy,44,{c:FC.blue,w:2.2});        /* 轨道 1 */
  s+=fE(ecx,cy,a,b,{c:FC.green,w:2.2,d:'7 5'});   /* 转移椭圆 */
  s+=fC(cx,cy,116,{c:FC.gray,w:1.6,d:'3 4'});     /* 轨道 2 参考 */
  s+=fC(cx+44,cy,5,{f:FC.blue,c:FC.blue,w:1.6});
  s+=fT(cx+44,cy-12,'P',{s:12,c:FC.blue,b:1});
  s+=fC(cx-116,cy,5,{f:FC.green,c:FC.green,w:1.6});
  s+=fT(cx-116,cy-12,'Q',{s:12,c:FC.green,b:1});
  s+=fT(cx,cy+30,'地球',{s:11,c:'#8a5a00'});
  s+=fC(cx+44,cy,7,{f:FC.red,c:FC.red,w:2}).replace('<circle','<circle data-a="sat"');
  s+=fT(165,26,'',{s:13,c:FC.red,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(238,222,'r₁ : r₂ = 1 : 4',{s:12,c:FC.sub});
  return svgWrap(w,h,s,'orbit');
}
QFIG_ANIM.orbit={dur:6400,run:function(svg,p,c){
  const cx=150,cy=120,r1=44,a=80,b=Math.sqrt(a*a-36*36),ecx=cx-36;
  if(!c.tb){
    /* 椭圆段按开普勒第二定律（面积速度守恒）积分：dθ/dt ∝ 1/r² */
    const N=120,tb=[0];let th=0;
    for(let i=1;i<=N;i++){
      const rr=Math.hypot(cx-(ecx+a*Math.cos(th)),b*Math.sin(th));
      th+=1/(rr*rr);
      tb.push(th);
    }
    c.tb=tb.map(v=>v/th*Math.PI);         /* 归一化到 0~π */
  }
  const g=seg(p,[0,0.26,0.74,1]);
  let x,y,txt='';
  if(g.i===0){                          /* 圆轨道 1：转到 P 点（右侧） */
    const th=-Math.PI/2+Math.PI/2*g.t*2;
    x=cx+r1*Math.cos(g.t*Math.PI*2-Math.PI/2);
    y=cy+r1*Math.sin(g.t*Math.PI*2-Math.PI/2);
    if(g.t<0.5){x=cx+r1*Math.sin(Math.PI*g.t*2);y=cy-r1*Math.cos(Math.PI*g.t*2);}
    else{x=cx+r1;y=cy;}
    txt='轨道 1：圆轨道匀速 · 半径 r₁';
  }else if(g.i===1){                    /* 转移椭圆：P → Q（近地点快、远地点慢） */
    const th=tblAt(c.tb,g.t);
    x=ecx+a*Math.cos(th);y=cy-b*Math.sin(th);
    txt=(g.t<0.12?'P 点加速 · 进入转移轨道':'转移轨道：椭圆');
  }else{                                /* 圆轨道 2 */
    const th=Math.PI*(1-g.t);
    x=cx+116*Math.cos(th);y=cy-116*Math.sin(th);
    txt=(g.t<0.12?'Q 点再次加速 · 进入轨道 2':'轨道 2：半径 r₂ = 4r₁');
  }
  const sat=qf(svg,c,'sat');
  if(sat){sat.setAttribute('cx',fx(x));sat.setAttribute('cy',fx(y));}
  const hud=qf(svg,c,'hud');
  if(hud)qfTxt(hud,txt);
}};

/* ============ 动图 ⑦：椭圆焦点弦（两条焦半径此消彼长，倒数和为定值）============
   修复：原版把「参数角」当成「极角」代进焦半径公式，还把真实长度（1.5）
   直接加到像素坐标上 —— B 点乱飞、倒数和也不是定值。
   现在：A 用参数角 t 定位，|AF₂| = a − e·x_A 直接算，
   |BF₂| 由 1/|AF₂| + 1/|BF₂| = 2a/b² = 4/3 反解，B 沿 F₂→A 的反向摆放。 */
function figEllipse(){
  const w=340,h=250,cx=170,cy=125;
  const K=60;                               /* 1 个单位长度 = 60 px */
  const a=2,bb=Math.sqrt(3),e=0.5;
  const A=K*a,B=K*bb,C=K*e;                 /* 像素半长轴 / 半短轴 / 半焦距 */
  let s=fE(cx,cy,A,B,{c:FC.ink,w:2.2});
  s+=fL(16,cy,332,cy,{c:FC.axis,w:1.6,m:'fa'});
  s+=fL(cx,18,cx,238,{c:FC.axis,w:1.6,m:'fa'});
  s+=fT(334,cy+16,'x',{s:13,c:FC.sub,i:1});s+=fT(cx+12,16,'y',{s:13,c:FC.sub,i:1});
  const t0=-0.6;
  const AX=cx+A*Math.cos(t0),AY=cy-B*Math.sin(t0);
  const rA=a-e*(a*Math.cos(t0));
  const rB=1/(4/3-1/rA);
  const ux=(AX-(cx+C))/1,uy=(AY-cy)/1;
  const ul=Math.hypot(ux,uy)||1;
  const BX=(cx+C)-ux/ul*rB*K, BY=cy-uy/ul*rB*K;
  s+=fL(cx+C,cy,AX,AY,{c:FC.green,w:2.4}).replace('<line','<line data-a="l1"');
  s+=fL(cx+C,cy,BX,BY,{c:FC.green,w:2.4}).replace('<line','<line data-a="l2"');
  s+=fC(cx-C,cy,3.6,{f:FC.red,c:FC.red,w:2});
  s+=fC(cx+C,cy,3.6,{f:FC.red,c:FC.red,w:2});
  s+=fT(cx-C,cy-11,'F₁',{s:13,c:FC.red,b:1});
  s+=fT(cx+C+13,cy-11,'F₂',{s:13,c:FC.red,b:1});
  s+=fC(AX,AY,4.5,{f:FC.blue,c:FC.blue,w:2}).replace('<circle','<circle data-a="Pa"');
  s+=fC(BX,BY,4.5,{f:FC.blue,c:FC.blue,w:2}).replace('<circle','<circle data-a="Pb"');
  s+=fT(AX+4,AY-9,'A',{s:14,b:1}).replace('<text','<text data-a="ta"');
  s+=fT(BX+11,BY+16,'B',{s:14,b:1}).replace('<text','<text data-a="tb2"');
  s+=fT(cx,cy+B+18,'x²/4 + y²/3 = 1',{s:13,c:FC.sub});
  s+=fT(170,14,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(w,h,s,'ell');
}
QFIG_ANIM.ell={dur:5200,run:function(svg,p,c){
  const cx=170,cy=125,K=60;
  const A=K*2,B=K*Math.sqrt(3),C=K*0.5,e=0.5,a=2;
  const t=p*2*Math.PI;
  const AX=cx+A*Math.cos(t),AY=cy-B*Math.sin(t);
  const rA=a-e*(a*Math.cos(t));                 /* |AF₂| = a − e·x_A */
  const rB=1/(4/3-1/rA);                        /* 倒数和为定值 4/3 */
  const l1=qf(svg,c,'l1');
  if(l1){l1.setAttribute('x2',fx(AX));l1.setAttribute('y2',fx(AY));}
  const Pa=qf(svg,c,'Pa'),ta=qf(svg,c,'ta');
  if(Pa){Pa.setAttribute('cx',fx(AX));Pa.setAttribute('cy',fx(AY));}
  if(ta){ta.setAttribute('x',fx(AX+4));ta.setAttribute('y',fx(AY-9));}
  const ux=AX-(cx+C),uy=AY-cy,ul=Math.hypot(ux,uy)||1;
  const BX=(cx+C)-ux/ul*rB*K, BY=cy-uy/ul*rB*K;
  const l2=qf(svg,c,'l2');
  if(l2){l2.setAttribute('x2',fx(BX));l2.setAttribute('y2',fx(BY));}
  const Pb=qf(svg,c,'Pb'),tb=qf(svg,c,'tb2');
  if(Pb){Pb.setAttribute('cx',fx(BX));Pb.setAttribute('cy',fx(BY));}
  if(tb){tb.setAttribute('x',fx(BX+11));tb.setAttribute('y',fx(BY+16));}
  const hud=qf(svg,c,'hud');
  if(hud)qfTxt(hud,'|AF₂| = '+rA.toFixed(2)+' · |BF₂| = '+rB.toFixed(2)
    +' → 倒数和 = '+(1/rA+1/rB).toFixed(3)+'（定值 4/3）');
}};

/* ============ 动图 ⑧：三次函数的切线族（切点动 → P 点动 → 切线条数变）============
   修复：原版 t 扫到 2.7 时 m = g(t) ≈ 21，P(2, m) 直接飞到画布上方几百像素外。
   现在纵轴范围放宽到 [−7, 6.5]，t 只在 [−1.2, 3.0] 内扫 —— m 恰好在 [−6, 6.1]，
   P 点始终留在画面里，「−6 < m < 2 有三条切线」看得见。 */
function figCubic(){
  const ax=mkAx({xmin:-2.2,xmax:3.2,ymin:-7,ymax:6.5,xt:[-2,-1,1,2,3],yt:[-6,-4,-2,2,4,6],
    xlab:'x',ylab:'y',O:1});
  const f=x=>x*x*x-3*x;
  let s=ax.s+curvePts(f,-2.2,3.2,140,ax.X,ax.Y,-7,6.5,FC.blue,2.6);
  s+=fC(ax.X(-1),ax.Y(2),3.6,{f:'#fff',c:FC.red,w:2.2});
  s+=fC(ax.X(1),ax.Y(-2),3.6,{f:'#fff',c:FC.red,w:2.2});
  s+=fT(ax.X(-1)-4,ax.Y(2)-9,'极大',{s:12,c:FC.red});
  s+=fT(ax.X(1)+18,ax.Y(-2)+19,'极小',{s:12,c:FC.red});
  s+=fT(ax.X(3.0),ax.Y(4.6),'y = x³ − 3x',{s:13,c:FC.blue,a:'end'});
  const t0=-1.2,m0=-2*t0*t0*t0+6*t0*t0-6;
  s+=fL(ax.X(-2.2),ax.Y(0),ax.X(3.2),ax.Y(0),{c:FC.gold,w:2.2})
     .replace('<line','<line data-a="tan"');
  s+=fC(ax.X(t0),ax.Y(f(t0)),5,{f:FC.gold,c:'#a8760a',w:2})
     .replace('<circle','<circle data-a="T"');
  s+=fC(ax.X(2),ax.Y(m0),5,{f:FC.purple,c:FC.purple,w:2})
     .replace('<circle','<circle data-a="P"');
  s+=fT(ax.X(2)+18,ax.Y(m0)+4,'P(2, m)',{s:12,c:FC.purple,b:1})
     .replace('<text','<text data-a="tp"');
  s+=fT(ax.X(0),ax.Y(5.8),'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(ax.w,ax.h,s,'cubic');
}
QFIG_ANIM.cubic={dur:6000,run:function(svg,p,c){
  const X=x=>36+(x+2.2)/(5.4)*(360-36-18);
  const Y=y=>220-30-(y+7)/(13.5)*(220-18-30);
  const XMIN=-2.2,XMAX=3.2,YMIN=-7,YMAX=6.5;
  const f=t=>t*t*t-3*t;
  const g=t=>-2*t*t*t+6*t*t-6;
  /* t 只扫 [−1.2, 2.35]：切点 f(t) 与 P 点的 m = g(t) 都留在纵轴范围内，
     同时仍能经过 t = −1、0、2 三个临界位置（m = 2、−6、2）。 */
  const t=-1.2+p*3.55;
  const m=g(t);
  const k=3*t*t-3;
  /* 切线是无限直线，画到画布边缘就得剪断，否则端点 y 会跑到 ±1000 去 */
  function clip(x0,y0,kk){
    if(Math.abs(kk)<1e-9){
      if(y0<YMIN||y0>YMAX)return null;
      return [XMIN,y0,XMAX,y0];
    }
    let x1=XMIN,y1=y0+kk*(XMIN-x0),x2=XMAX,y2=y0+kk*(XMAX-x0);
    if(y1<YMIN){x1=x0+(YMIN-y0)/kk;y1=YMIN;}else if(y1>YMAX){x1=x0+(YMAX-y0)/kk;y1=YMAX;}
    if(y2<YMIN){x2=x0+(YMIN-y0)/kk;y2=YMIN;}else if(y2>YMAX){x2=x0+(YMAX-y0)/kk;y2=YMAX;}
    if(x1>x2){const a=x1;x1=x2;x2=a;const b=y1;y1=y2;y2=b;}
    x1=Math.max(x1,XMIN);x2=Math.min(x2,XMAX);
    if(x2-x1<0.02)return null;
    return [x1,y1,x2,y2];
  }
  const seg2=clip(t,f(t),k);
  const tan=qf(svg,c,'tan');
  if(tan){
    if(!seg2){tan.setAttribute('opacity','0');}
    else{
      tan.setAttribute('opacity','1');
      tan.setAttribute('x1',fx(X(seg2[0])));tan.setAttribute('y1',fx(Y(seg2[1])));
      tan.setAttribute('x2',fx(X(seg2[2])));tan.setAttribute('y2',fx(Y(seg2[3])));
    }
  }
  const T=qf(svg,c,'T');
  if(T){T.setAttribute('cx',fx(X(t)));T.setAttribute('cy',fx(Y(f(t))));}
  const P=qf(svg,c,'P'),tp=qf(svg,c,'tp');
  if(P){P.setAttribute('cx',fx(X(2)));P.setAttribute('cy',fx(Y(m)));}
  if(tp){tp.setAttribute('x',fx(X(2)+18));tp.setAttribute('y',fx(Y(m)+4));}
  const hud=qf(svg,c,'hud');
  if(hud){
    const n=(m>-6&&m<2)?'3 条切线':((Math.abs(m+6)<0.15||Math.abs(m-2)<0.15)?'2 条（相切临界）':'1 条');
    qfTxt(hud,'m = '+m.toFixed(2)+'　此时可作 '+n+'　（−6 < m < 2 时为三条）');
  }
}};


/* 强酸强碱滴定：V(NaOH) → pH（化学计量点 20 mL，突跃 19.6~20.4 mL） */
function titrPH(v){
  const v0=20;
  if(v<v0-0.4){const H=Math.max(0.1*(v0-v)/(20+v),1e-13);return -Math.log10(H);}
  if(v>v0+0.4){const OH=Math.max(0.1*(v-v0)/(20+v),1e-13);return 14+Math.log10(OH);}
  /* 突跃段：与两侧端点平滑相接（端点 pH 由上式给出） */
  const p1=-Math.log10(Math.max(0.1*0.4/(20+v0-0.4),1e-13));
  const p2=14+Math.log10(Math.max(0.1*0.4/(20+v0+0.4),1e-13));
  const u=(v-(v0-0.4))/0.8;
  return p1+(p2-p1)*(u*u*(3-2*u));
}
QFIG_ANIM.titr={dur:5200,run:function(svg,p,c){
  const L=36,R=18,T=18,B=30,w=360,h=220;
  const X=v=>L+(v-0)/26*(w-L-R), Y=y=>h-B-(y-0)/14*(h-T-B);
  const v=0.1+p*25.8, ph=titrPH(v);
  const dot=qf(svg,c,'dot');
  if(dot){dot.setAttribute('cx',fx(X(v)));dot.setAttribute('cy',fx(Y(ph)));}
  const sc=qf(svg,c,'scan');
  if(sc){sc.setAttribute('x1',fx(X(v)));sc.setAttribute('x2',fx(X(v)));}
  const bu=qf(svg,c,'buret');
  if(bu){bu.setAttribute('y',fx(17+p*40));bu.setAttribute('height',fx(40-p*40));}
  const hud=qf(svg,c,'hud');
  if(hud){
    const near=Math.abs(v-20)<0.6;
    qfTxt(hud,(near?'⚡ 突跃！':'')+'滴入 '+v.toFixed(2)+' mL · pH = '+ph.toFixed(2));
  }
}};

/* ============ 动图 ⑩：化学平衡的建立（浓度随时间趋于定值）============ */
QFIG_ANIM.eq={dur:5000,run:function(svg,p,c){
  const L=36,R=18,T=18,BT=30,w=360,h=210;
  const X=t=>L+(t-0)/10*(w-L-R), Y=y=>h-BT-(y-0)/1.05*(h-T-BT);
  const cAv=t=>1-0.6*(1-Math.exp(-0.55*t));
  const cBv=t=>0.3*(1-Math.exp(-0.55*t));
  const tm=p*10;
  const build=(f)=>{let d='M '+fx(X(0))+' '+fx(Y(f(0)));
    for(let i=1;i<=60;i++){const t=tm*i/60;d+=' L '+fx(X(t))+' '+fx(Y(f(t)));}return d;};
  const cA=qf(svg,c,'cA'),cB=qf(svg,c,'cB');
  if(cA)cA.setAttribute('d',build(cAv));
  if(cB)cB.setAttribute('d',build(cBv));
  const sc=qf(svg,c,'scan');
  if(sc){sc.setAttribute('x1',fx(X(tm)));sc.setAttribute('x2',fx(X(tm)));}
  const hud=qf(svg,c,'hud');
  if(hud){
    const done=tm>7.5;
    qfTxt(hud,(done?'⚖️ 已达平衡 · ':'')+'t = '+tm.toFixed(1)+' min · c(A) = '
      +cAv(tm).toFixed(2)+' · c(B) = '+cBv(tm).toFixed(2));
  }
}};

/* ============ 动图 ⑪：神经纤维动作电位（沿时间轴扫描）============ */
function nerveV(t){
  if(t<1)return -70;
  if(t<2)return -70+(t-1)*105;
  if(t<3)return 35-(t-2)*35;
  if(t<4)return 0-(t-3)*15;
  if(t<6)return -15-(t-4)*35;
  if(t<7)return -85+(t-6)*10;
  if(t<8)return -75+(t-7)*5;
  return -70;
}
QFIG_ANIM.nerve={dur:4600,run:function(svg,p,c){
  const L=36,R=18,T=18,B=30,w=360,h=210;
  const X=t=>L+(t-0)/10*(w-L-R), Y=y=>h-B-(y+90)/135*(h-T-B);
  const t=p*10,v=nerveV(t);
  const dot=qf(svg,c,'dot');
  if(dot){dot.setAttribute('cx',fx(X(t)));dot.setAttribute('cy',fx(Y(v)));}
  const sc=qf(svg,c,'scan');
  if(sc){sc.setAttribute('x1',fx(X(t)));sc.setAttribute('x2',fx(X(t)));}
  const hud=qf(svg,c,'hud');
  if(hud){
    let st='静息';
    if(t>=1&&t<2)st='去极化 · Na⁺ 内流';
    else if(t>=2&&t<4)st='复极化 · K⁺ 外流';
    else if(t>=4&&t<6.5)st='Na⁺−K⁺ 泵恢复中';
    else if(t>=6.5)st='已恢复静息';
    qfTxt(hud,'t = '+t.toFixed(1)+' ms · '+v.toFixed(0)+' mV · '+st);
  }
}};

/* ============ 动图 ⑫：光合—呼吸曲线（光强扫描，净光合由负转正）============ */
QFIG_ANIM.photo={dur:5000,run:function(svg,p,c){
  const L=36,R=18,T=18,B=30,w=360,h=220;
  const X=x=>L+(x-0)/10*(w-L-R), Y=y=>h-B-(y+6)/20*(h-T-B);
  const gross=x=>14*(1-Math.exp(-0.42*x));
  const x=p*10,g=gross(x),n=g-4;
  const dot=qf(svg,c,'dot');
  if(dot){dot.setAttribute('cx',fx(X(x)));dot.setAttribute('cy',fx(Y(n)));}
  const sc=qf(svg,c,'scan');
  if(sc){sc.setAttribute('x1',fx(X(x)));sc.setAttribute('x2',fx(X(x)));}
  const hud=qf(svg,c,'hud');
  if(hud){
    const s2=(n<-0.15?'呼吸 > 光合 · 净放 CO₂':(Math.abs(n)<0.15?'光补偿点：净光合 = 0':'光合 > 呼吸 · 净吸收 CO₂'));
    qfTxt(hud,'光强 '+x.toFixed(1)+' klx · 总 '+g.toFixed(1)+' · 净 '+n.toFixed(1)+' · '+s2);
  }
}};

/* ============ 动图 ⑬：解三角形（b + c 固定，b、c 此消彼长，面积跟着变）============
   修复：原版把顶点画在「以 B、C 为焦点的椭圆」上，那是 b + c = 定值的轨迹，
   与 A = 60° 联立后 A 点只剩孤立解，面积随参数变化的演示根本不成立。
   现在：A 角固定 60°、b + c = 6 固定，让 b 在 1~5 之间往复（c = 6 − b），
   S = ½bc·sin60° 随 bc 变化，b = c = 3 时 bc 最大、S 最大 = 9√3/4。 */
QFIG_ANIM.tri={dur:5600,run:function(svg,p,c){
  const Ax=180,Ay=48,K=30;
  const b=3+2*Math.sin(p*2*Math.PI), cc=6-b;
  const Bx=Ax+cc*K*0.5, By=Ay+cc*K*0.866;
  const Cx=Ax-b*K*0.5,  Cy=Ay+b*K*0.866;
  const S=0.5*b*cc*Math.sin(Math.PI/3);
  const tri=qf(svg,c,'tri');
  if(tri)tri.setAttribute('points',fx(Ax)+','+fx(Ay)+' '+fx(Bx)+','+fx(By)
    +' '+fx(Cx)+','+fx(Cy)+' '+fx(Ax)+','+fx(Ay));
  const mid=qf(svg,c,'mid');
  if(mid){mid.setAttribute('x2',fx((Bx+Cx)/2));mid.setAttribute('y2',fx((By+Cy)/2));}
  const Pb=qf(svg,c,'Pb'),tb=qf(svg,c,'tb2');
  if(Pb){Pb.setAttribute('cx',fx(Bx));Pb.setAttribute('cy',fx(By));}
  if(tb){tb.setAttribute('x',fx(Bx+9));tb.setAttribute('y',fx(By+16));}
  const Pc=qf(svg,c,'Pc'),tc=qf(svg,c,'tc');
  if(Pc){Pc.setAttribute('cx',fx(Cx));Pc.setAttribute('cy',fx(Cy));}
  if(tc){tc.setAttribute('x',fx(Cx-21));tc.setAttribute('y',fx(Cy+16));}
  const hud=qf(svg,c,'hud');
  if(hud){
    const max=Math.abs(b-cc)<0.08;
    qfTxt(hud,(max?'⭐ 面积最大 ':'')+'b = '+b.toFixed(2)+' · c = '+cc.toFixed(2)
      +' → S = '+S.toFixed(2)+(max?'（= 9√3/4）':''));
  }
}};

QFIG_ANIM.elec={dur:4200,run:function(svg,p,c){
  /* 电子路径：阳极顶 (253,40) → 上导线 → 阴极顶 (114,40) */
  if(!c.pt){
    const wp=[[253,40],[253,16],[114,16],[114,40]];
    const segLen=[];let tot=0;
    for(let i=0;i<wp.length-1;i++){
      const L=Math.hypot(wp[i+1][0]-wp[i][0],wp[i+1][1]-wp[i][1]);
      segLen.push(L);tot+=L;
    }
    c.pt={wp:wp,segLen:segLen,tot:tot};
  }
  const at=u=>{
    const {wp,segLen,tot}=c.pt;
    let d=u*tot;
    for(let i=0;i<segLen.length;i++){
      if(d<=segLen[i]||i===segLen.length-1){
        const t=Math.max(0,Math.min(1,d/segLen[i]));
        return [wp[i][0]+(wp[i+1][0]-wp[i][0])*t, wp[i][1]+(wp[i+1][1]-wp[i][1])*t];
      }
      d-=segLen[i];
    }
    return wp[0];
  };
  for(let k=1;k<=3;k++){
    const el=qf(svg,c,'e'+k);
    if(!el)continue;
    const u=(p+k/3)%1;
    const q=at(u);
    el.setAttribute('cx',fx(q[0]));el.setAttribute('cy',fx(q[1]));
    el.setAttribute('opacity',u<0.06?'0.2':'1');
  }
  const dep=qf(svg,c,'dep');
  const mol=p*0.2;
  if(dep){
    const th=Math.min(46,p*46);
    dep.setAttribute('y',fx(136-th));dep.setAttribute('height',fx(th));
  }
  const hud=qf(svg,c,'hud');
  if(hud)qfTxt(hud,'通过 '+mol.toFixed(3)+' mol e⁻ → 阴极析出 '+(mol*32).toFixed(2)+' g Cu');
}};

/* ============ 动图 ⑮：有丝分裂中的 DNA / 染色体数量（沿时间轴扫描）============ */
function figDiv(){
  const w=360,h=210;
  const bx=50,by=170,bw=260,bh=110;
  let s=fL(bx,by,bx+bw,by,{c:FC.axis,w:2,m:'fa'});
  s+=fL(bx,by,bx,30,{c:FC.axis,w:2,m:'fa'});
  const xs=[70,120,170,220,270];
  const dna=[8,16,16,8,8],ch=[8,8,16,8,8];
  for(let i=0;i<4;i++){
    const x0=xs[i],x1=xs[i+1];
    s+=fPoly([[x0,by-dna[i]/16*bh],[x1,by-dna[i+1]/16*bh]],{c:FC.blue,w:2.6});
    s+=fPoly([[x0,by-ch[i]/16*bh],[x1,by-ch[i+1]/16*bh]],{c:FC.red,w:2.2,d:'6 4'});
  }
  const labs=['间期','前中','后期','末'];
  xs.forEach((x,i)=>{s+=fT(x,by+18,labs[i]||'',{s:11,c:FC.sub});});
  s+=fT(bx-8,by-8,'8',{s:12,c:FC.sub,a:'end'});
  s+=fT(bx-8,by-bh+4,'16',{s:12,c:FC.sub,a:'end'});
  s+=fT(300,60,'DNA',{s:13,c:FC.blue,b:1,a:'start'});
  s+=fT(300,84,'染色体',{s:13,c:FC.red,b:1,a:'start'});
  s+=fT(180,204,'2n = 8',{s:12,c:FC.sub});
  s+=fL(bx,by,bx,30,{c:FC.gold,w:1.6,d:'4 3'}).replace('<line','<line data-a="scan"');
  s+=fT(180,26,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(w,h,s,'div');
}
QFIG_ANIM.div={dur:5200,run:function(svg,p,c){
  const bx=50,bw=260;
  const x=bx+p*bw;
  const sc=qf(svg,c,'scan');
  if(sc){sc.setAttribute('x1',fx(x));sc.setAttribute('x2',fx(x));}
  const xs=[70,120,170,220,270];
  const dna=[8,16,16,8,8],ch=[8,8,16,8,8];
  const segs=4;
  const u=Math.min(0.999,p)*segs,i=Math.floor(u),f=u-i;
  const D=Math.round(dna[i]+(dna[i+1]-dna[i])*f);
  const C=Math.round(ch[i]+(ch[i+1]-ch[i])*f);
  const nm=['间期（复制）','前期 · 中期','后期（着丝粒分裂）','末期','子细胞'];
  const hud=qf(svg,c,'hud');
  if(hud)qfTxt(hud,(nm[Math.min(4,Math.round(p*4))]||'')+' · DNA '+D+' 条 · 染色体 '+C+' 条');
}};




/* =========================================================
   ⚡ 物理大题动图与题库（2.1.0）
   ========================================================= */

