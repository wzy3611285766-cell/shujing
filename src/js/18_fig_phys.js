/* =========================================================
   🎞 物理大题动图（2.1.0）
   —— 传送带 / 平抛 / 连接体 / 碰撞 / 弹簧振子 / 复合场 /
      交变电流 / 机车启动，八个模型各一张，全部按真实规律驱动
   ========================================================= */

/* ============ 动图 ⑯：传送带（先加速后共速，划痕长度看得见）============
   修复：原版划痕从物块位置往右画，跑到 370 px 出了画布；
   而且划痕是留在「带面」上的，应该拖在物块后方。
   现在划痕画成「物块后方一段」，长度 = 相对滑行距离（最多 4 m = 100 px）。 */
function figBelt(){
  const w=360,h=210;
  let s=fR(40,96,280,30,{f:'#f4f8fb',c:FC.ink,w:2.2,r:4});
  s+=fC(60,111,10,{f:'none',c:FC.gray,w:2});
  s+=fC(300,111,10,{f:'none',c:FC.gray,w:2});
  /* 带面标记：随传送带右移 */
  s+=fL(40,102,320,102,{c:FC.green,w:1.6,d:'6 8'}).replace('<line','<line data-a="belt"');
  s+=fR(70,68,40,28,{f:FC.fill,c:FC.blue,w:2.2,r:3}).replace('<rect','<rect data-a="blk"');
  s+=fT(90,86,'m',{s:13,b:1}).replace('<text','<text data-a="lb"');
  s+=fL(90,58,90+40,58,{c:FC.red,w:2.4,m:'fr'}).replace('<line','<line data-a="va"');
  s+=fT(90+50,54,'v',{s:13,c:FC.red,i:1}).replace('<text','<text data-a="vt"');
  /* 划痕：物块后方的一段（相对滑行距离） */
  s+=fL(70,140,70,140,{c:FC.gold,w:3}).replace('<line','<line data-a="mark"');
  s+=fT(24,186,'L = 8 m · v = 4 m/s · μ = 0.2',{s:12,c:FC.sub,a:'start'});
  s+=fT(180,32,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(w,h,s,'belt');
}
QFIG_ANIM.belt={dur:4600,run:function(svg,p,c){
  const v=4,a=2,T=2,s1=4,L=8;             /* 加速 2 s 走 4 m，之后匀速走剩 4 m 用 1 s */
  const tt=p*3;
  const x=(tt<=T)?0.5*a*tt*tt:s1+v*(tt-T);
  const vv=(tt<=T)?a*tt:v;
  const PX=25;                              /* 1 m = 25 px */
  const bx=90+Math.min(L,x)*PX;
  const blk=qf(svg,c,'blk'),lb=qf(svg,c,'lb');
  if(blk)blk.setAttribute('x',fx(bx-20));
  if(lb)lb.setAttribute('x',fx(bx));
  const va=qf(svg,c,'va'),vt=qf(svg,c,'vt');
  if(va){va.setAttribute('x1',fx(bx));va.setAttribute('x2',fx(bx+vv*10));
    va.setAttribute('marker-end',vv>=v-0.01?'url(#fg)':'url(#fr)');
    va.setAttribute('stroke',vv>=v-0.01?FC.green:FC.red);}
  if(vt)vt.setAttribute('x',fx(bx+vv*10+10));
  /* 带面移动 */
  const belt=qf(svg,c,'belt');
  if(belt)belt.setAttribute('stroke-dashoffset',fx(-v*tt*PX));
  /* 划痕：相对滑行距离，画在物块后方，最长 4 m */
  const rel=(tt<=T)?(v*tt-x):(v*T-s1);
  const mk=qf(svg,c,'mark');
  if(mk){mk.setAttribute('x1',fx(bx-Math.min(rel,4)*PX));mk.setAttribute('y1',fx(140));
    mk.setAttribute('x2',fx(bx));mk.setAttribute('y2',fx(140));
    mk.setAttribute('opacity',rel>0.05?'1':'0.2');}
  const hud=qf(svg,c,'hud');
  if(hud){
    const ph=tt<=T?'（加速中 · 相对滑动）':'（已达带速 · 一起走）';
    qfTxt(hud,'t = '+tt.toFixed(1)+' s · v = '+vv.toFixed(1)+' m/s · 位移 '+x.toFixed(1)
      +' m · 划痕 '+Math.min(rel,4).toFixed(1)+' m '+ph);
  }
}};

/* ============ 动图 ⑰：平抛打在斜面上（速度方向垂直斜面）============
   修复：原版按 θ = 37° 画图，但 37° + v₀ = 10 + 「垂直打入」三者不自洽 ——
   平抛位移角 = ½·速度角，37° 斜面算出来的落点根本不在斜面上（抛物线穿模）。
   改成 θ = 30°：t = v₀cot30°/g = 1.73 s，落点 (17.32, 15)，
   平台高出斜面顶点 h₀ = 15 − 17.32·tan30° = 5 m，轨迹全程在斜面上方，几何自洽。 */
function figProj(){
  const w=360,h=230;
  const O=[40,50],K=9;                       /* 1 m = 9 px */
  const T=1.732;                             /* 飞行时间（s） */
  const P=[O[0]+10*T*K,O[1]+0.5*10*T*T*K];   /* 落点 */
  const h0=5*K;                              /* 平台高出斜面顶点 5 m */
  const SY=O[1]+h0;                          /* 斜面顶点 y */
  const m=Math.tan(Math.PI/6);               /* tan30° */
  const EX=Math.min(340,O[0]+(215-SY)/m);    /* 斜面画到画布底 */
  let s=fPoly([[O[0],SY],[EX,215],[O[0],215],[O[0],SY]],{c:FC.ink,w:2.4,f:'#f0e6d2'});
  /* 平台：一段水平面 + 与斜面顶点相连的竖直壁 */
  s+=fL(8,O[1],O[0],O[1],{c:FC.ink,w:3});
  s+=fL(O[0],O[1],O[0],SY,{c:FC.ink,w:2,d:'4 3'});
  s+=fT(24,O[1]-8,'v₀',{s:13,c:FC.green,i:1});
  /* 30° 角标 */
  s+=fPath('M '+(O[0]+40)+' '+SY+' A 40 40 0 0 1 '+fx(O[0]+40*Math.cos(Math.PI/6))
    +' '+fx(SY-40*Math.sin(Math.PI/6)),{c:FC.green,w:1.6});
  s+=fT(O[0]+52,SY-8,'30°',{s:12,c:FC.green,a:'start'});
  /* 抛物线 */
  let d='M '+O[0]+' '+O[1];
  for(let i=1;i<=40;i++){
    const t=T*i/40;
    d+=' L '+fx(O[0]+10*t*K)+' '+fx(O[1]+0.5*10*t*t*K);
  }
  s+=fPath(d,{c:FC.blue,w:2.4,d:'6 5'});
  s+=fC(O[0],O[1],4,{f:FC.blue,c:FC.blue,w:2});
  s+=fC(P[0],P[1],7,{f:FC.gold,c:'#8a5a00',w:2}).replace('<circle','<circle data-a="ball"');
  s+=fL(P[0],P[1],P[0]+30,P[1]+52,{c:FC.red,w:2.4,m:'fr'})
     .replace('<line','<line data-a="vv"');
  s+=fT(190,32,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(200,224,'垂直打在斜面上',{s:12,c:FC.sub});
  return svgWrap(w,h,s,'proj');
}
QFIG_ANIM.proj={dur:3600,run:function(svg,p,c){
  const O=[40,50],v0=10,g=10,K=9,T=1.732;
  const t=p*T;
  const x=O[0]+v0*t*K, y=O[1]+0.5*g*t*t*K;
  const ball=qf(svg,c,'ball');
  if(ball){ball.setAttribute('cx',fx(x));ball.setAttribute('cy',fx(y));}
  const vx=v0,vy=g*t;
  const vv=qf(svg,c,'vv');
  if(vv){vv.setAttribute('x1',fx(x));vv.setAttribute('y1',fx(y));
    vv.setAttribute('x2',fx(x+vx*3));vv.setAttribute('y2',fx(y+vy*3));}
  const hud=qf(svg,c,'hud');
  if(hud){
    const sp=Math.hypot(vx,vy);
    const ang=Math.atan2(vy,vx)*180/Math.PI;
    qfTxt(hud,'t = '+t.toFixed(2)+' s · vₓ = '+vx.toFixed(1)+' · v_y = '
      +vy.toFixed(1)+' → v = '+sp.toFixed(1)+' m/s（与水平 '+ang.toFixed(0)+'°）');
  }
}};

/* ============ 动图 ⑱：定滑轮连接体（一个加速滑行、一个加速下落）============
   修复：原版 A 与 B 用了不同的位移上限（96 / 70），后半段两者不同步；
   A 还会一路滑到 x = 196、宽 44，直接撞上 x = 250 的滑轮。
   现在两者统一 clamp 到 70 px（绳长不变 ⟹ 位移相等），A 最远到 170 + 44 = 214。 */
function figPulley(){
  const w=360,h=220;
  let s=fR(60,120,150,16,{f:'#eef4fa',c:FC.ink,w:2,r:2});   /* 桌面 */
  s+=fC(250,80,18,{f:'none',c:FC.ink,w:2.4});               /* 滑轮 */
  s+=fC(250,80,3.5,{f:FC.ink,c:FC.ink,w:1.4});
  s+=fL(250,62,250,52,{c:FC.gray,w:2});
  s+=fL(206,52,294,52,{c:FC.gray,w:2});
  s+=fR(100,100,44,20,{f:FC.fill,c:FC.blue,w:2.2,r:3}).replace('<rect','<rect data-a="A"');
  s+=fR(232,80,36,30,{f:'#ffe9c9',c:FC.gold,w:2.2,r:3}).replace('<rect','<rect data-a="B"');
  s+=fL(144,110,232,80,{c:FC.ink,w:2}).replace('<line','<line data-a="ropeL"');
  s+=fL(268,80,268,80,{c:FC.ink,w:2}).replace('<line','<line data-a="ropeR"');
  s+=fT(122,114,'M',{s:13,b:1}).replace('<text','<text data-a="lA"');
  s+=fT(250,100,'m',{s:13,b:1}).replace('<text','<text data-a="lB"');
  s+=fL(268,110,268,140,{c:FC.red,w:2.4,m:'fr'}).replace('<line','<line data-a="va"');
  s+=fT(186,32,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(190,196,'M = 4 kg 在桌面 · m = 2 kg 悬挂 · μ = 0.25',{s:11,c:FC.sub});
  return svgWrap(w,h,s,'pull');
}
QFIG_ANIM.pull={dur:4200,run:function(svg,p,c){
  /* a = (mg − μMg)/(M+m) = (20 − 10)/6 = 1.67 m/s² */
  const a=10/6, PG=26;
  const t=p*2.2, s2=Math.min(70,0.5*a*t*t*PG);   /* 两者位移相等 */
  const A=qf(svg,c,'A'),B=qf(svg,c,'B'),lA=qf(svg,c,'lA'),lB=qf(svg,c,'lB');
  if(A)A.setAttribute('x',fx(100+s2));
  if(lA)lA.setAttribute('x',fx(122+s2));
  if(B)B.setAttribute('y',fx(80+s2));
  if(lB)lB.setAttribute('y',fx(100+s2));
  const rl=qf(svg,c,'ropeL');
  if(rl){rl.setAttribute('x1',fx(144+s2));rl.setAttribute('y1',fx(110));
    rl.setAttribute('x2',fx(232));rl.setAttribute('y2',fx(80));}
  const rr=qf(svg,c,'ropeR');
  if(rr){rr.setAttribute('x1',fx(268));rr.setAttribute('y1',fx(80));
    rr.setAttribute('x2',fx(268));rr.setAttribute('y2',fx(80+s2));}
  const va=qf(svg,c,'va');
  const v=a*t*PG*0.4;
  if(va){va.setAttribute('y1',fx(110+s2));va.setAttribute('y2',fx(110+s2+Math.min(28,v)));}
  const hud=qf(svg,c,'hud');
  if(hud)qfTxt(hud,'t = '+t.toFixed(2)+' s · 加速度 '+a.toFixed(2)+' m/s² · 速度 '+(a*t).toFixed(2)+' m/s');
}};

/* ============ 动图 ⑲：一维碰撞（动量守恒，动能损失看得见）============
   修复：原版碰前 A 走到 x = 170，而 A 半径 14、B 半径 18，
   接触应在 196 − 32 = 164 —— A 会嵌进 B 里 6 px。碰后起点同样错位。
   现在按半径对齐：碰前 A 从 70 走到 164，碰后从 164 左行、B 从 196 右行。 */
function figCollide(){
  const w=360,h=200;
  let s=fL(24,150,336,150,{c:FC.axis,w:2});
  s+=fC(70,132,14,{f:FC.blue,c:FC.blue,w:2}).replace('<circle','<circle data-a="A"');
  s+=fC(196,132,18,{f:FC.gold,c:'#8a5a00',w:2}).replace('<circle','<circle data-a="B"');
  s+=fT(70,132+5,'A',{s:13,b:1,c:'#fff'}).replace('<text','<text data-a="lA"');
  s+=fT(196,132+5,'B',{s:13,b:1,c:'#fff'}).replace('<text','<text data-a="lB"');
  s+=fL(70,110,110,110,{c:FC.blue,w:2.4,m:'fb'}).replace('<line','<line data-a="vA"');
  s+=fT(120,106,'v₁',{s:13,c:FC.blue,i:1}).replace('<text','<text data-a="tA"');
  s+=fT(240,106,'静止',{s:12,c:FC.gold});
  s+=fT(180,32,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(180,186,'m₁ = 2 kg · m₂ = 4 kg · 正碰后 A 反向弹回',{s:11,c:FC.sub});
  return svgWrap(w,h,s,'col');
}
QFIG_ANIM.col={dur:4600,run:function(svg,p,c){
  const g=seg(p,[0,0.50,0.56,1]);
  let xA,xB,tag='';
  if(g.i===0){                       /* 碰前：A 匀速逼近，到 164 恰好接触 */
    xA=70+g.t*94; xB=196; tag='碰前 · A 以 6 m/s 追上静止的 B';
  }else if(g.i===1){                 /* 碰撞瞬间 */
    xA=164;xB=196;tag='碰撞瞬间 · 动量守恒 m₁v₁ = m₁v₁′ + m₂v₂′';
  }else if(g.i===2){                 /* 碰后：A 反向、B 前进（按半径对齐分离） */
    xA=164-42*g.t; xB=196+28*g.t; tag='碰后 · A 反向 2 m/s · B 前进 4 m/s';
  }else{xA=122;xB=224;tag='碰后分离';}
  const A=qf(svg,c,'A'),B=qf(svg,c,'B'),lA=qf(svg,c,'lA'),lB=qf(svg,c,'lB');
  if(A)A.setAttribute('cx',fx(xA));
  if(lA)lA.setAttribute('x',fx(xA));
  if(B)B.setAttribute('cx',fx(xB));
  if(lB)lB.setAttribute('x',fx(xB));
  const vA=qf(svg,c,'vA'),tA=qf(svg,c,'tA');
  if(vA){vA.setAttribute('x1',fx(xA));vA.setAttribute('x2',fx(xA+(g.i<=1?40:-18)));
    vA.setAttribute('marker-end',g.i<=1?'url(#fb)':'url(#fr)');
    vA.setAttribute('stroke',g.i<=1?FC.blue:FC.red);
    vA.setAttribute('opacity',g.i===1?'0.25':'1');}
  if(tA)tA.setAttribute('x',fx(xA+(g.i<=1?48:8)));
  const hud=qf(svg,c,'hud');
  if(hud)qfTxt(hud,tag);
}};

/* ============ 动图 ⑳：竖直弹簧振子（压缩量、速度、加速度同步显示）============
   修复：原版速度方向判反了 —— y = 130 + 34cos(2πp) 在 p 从 0 增大时是向上运动，
   代码却按 v = +sin(2πp) 判断成向下。现在取 v_y = −sin(2πp)（向下为正），方向就对了。 */
function figSpring2(){
  const w=300,h=250;
  const TY=36,BY=214;
  function spr(y2){                 /* 弹簧：从顶到物块 */
    let d='M 150 '+TY;
    for(let i=1;i<=8;i++){
      const t=TY+(y2-TY)*i/8, gg=(i%2?1:-1)*13;
      d+=' L '+fx(150+gg)+' '+fx(t);
    }
    return d;
  }
  let s=fL(110,TY,190,TY,{c:FC.ink,w:3});
  for(let i=0;i<6;i++)s+=fL(112+i*13,TY,108+i*13,TY+9,{c:FC.gray,w:1.4});
  s+=fPath(spr(130),{c:FC.red,w:2.2}).replace('<path','<path data-a="spr"');
  s+=fR(126,130,48,26,{f:FC.fill,c:FC.blue,w:2.2,r:3}).replace('<rect','<rect data-a="blk"');
  s+=fT(150,147,'m',{s:13,b:1}).replace('<text','<text data-a="lb"');
  /* 三个位置参考线：平衡 / 最低 / 最高 */
  s+=fL(226,130,286,130,{c:FC.green,w:1.5,d:'5 4'});
  s+=fT(292,134,'平衡',{s:11,c:FC.green,a:'start'});
  s+=fL(226,164,286,164,{c:FC.gray,w:1.4,d:'3 4'});
  s+=fT(292,168,'最低',{s:11,c:FC.sub,a:'start'});
  s+=fL(226,96,286,96,{c:FC.gray,w:1.4,d:'3 4'});
  s+=fT(292,100,'最高',{s:11,c:FC.sub,a:'start'});
  s+=fT(150,26,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(w,h,s,'spr2');
}
QFIG_ANIM.spr2={dur:3200,run:function(svg,p,c){
  /* 平衡压缩 5 cm、振幅 5 cm：最高点弹簧恰为原长 */
  const eq=130,A=34;
  const y=eq+A*Math.cos(p*2*Math.PI);           /* 从最低点起振 */
  const vDown=-Math.sin(p*2*Math.PI);           /* 向下为正 */
  const spr=qf(svg,c,'spr');
  if(spr){
    let d='M 150 36';
    for(let i=1;i<=8;i++){
      const t=36+(y-36)*i/8, gg=(i%2?1:-1)*13;
      d+=' L '+fx(150+gg)+' '+fx(t);
    }
    spr.setAttribute('d',d);
  }
  const blk=qf(svg,c,'blk'),lb=qf(svg,c,'lb');
  if(blk)blk.setAttribute('y',fx(y));
  if(lb)lb.setAttribute('y',fx(y+17));
  const hud=qf(svg,c,'hud');
  if(hud){
    const cm=((y-eq)/34*5).toFixed(1);           /* 相对平衡位置的位移(cm)，向下为正 */
    const dir=vDown>0?'↓':'↑';
    qfTxt(hud,'相对平衡位置 '+cm+' cm '+dir+' · 速度'+(Math.abs(vDown)>0.9?'最大':'')
      +' · 加速度'+(Math.abs(Math.cos(p*2*Math.PI))>0.9?'最大':''));
  }
}};

/* ============ 动图 ㉑：速度选择器 + 磁场偏转（复合场）============
   修复：原版粒子进了速度选择器就钉在 x = 158 不动，占了 60% 的时长。
   现在三段分明：入射 → 选择器内直线穿过（30→150）→ 进入偏转磁场画半圆。 */
function figField(){
  const w=360,h=220;
  let s='';
  /* 速度选择器区 */
  s+=fR(30,60,120,90,{f:'#f2f6fa',c:FC.ink,w:2,r:2});
  for(let x=46;x<=136;x+=18)for(let y=72;y<=140;y+=20){
    s+=fL(x-5,y-5,x+5,y+5,{c:FC.green,w:1.4})+fL(x-5,y+5,x+5,y-5,{c:FC.green,w:1.4});
  }
  for(let y=72;y<=140;y+=20){
    s+=fL(56,y,110,y,{c:FC.purple,w:1.2,d:'3 4'});
  }
  s+=fT(90,52,'速度选择器（E ⊥ B）',{s:11,c:FC.sub});
  /* 偏转磁场区 */
  s+=fR(150,40,180,140,{f:'#f4f8fb',c:FC.grid,w:1.4,d:'4 4'});
  for(let x=168;x<=312;x+=22)for(let y=58;y<=164;y+=24){
    s+=fL(x-5,y-5,x+5,y+5,{c:FC.green,w:1.4})+fL(x-5,y+5,x+5,y-5,{c:FC.green,w:1.4});
  }
  s+=fPath('M 150 110 A 62 62 0 0 1 274 110',{c:FC.red,w:2.4});
  s+=fC(150,110,4,{f:FC.red,c:FC.red});
  s+=fC(274,110,4,{f:FC.red,c:FC.red});
  s+=fT(212,142,'r',{s:13,c:FC.red,i:1});
  s+=fC(20,110,6,{f:FC.gold,c:'#8a5a00',w:2}).replace('<circle','<circle data-a="pt"');
  s+=fT(180,20,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(w,h,s,'fld');
}
QFIG_ANIM.fld={dur:4800,run:function(svg,p,c){
  const g=seg(p,[0,0.18,0.58,1]);
  let x=20,y=110,tag='';
  const pt=qf(svg,c,'pt');
  if(g.i===0){
    x=20+(30-20)*g.t; tag='经加速电场进入速度选择器';
  }else if(g.i===1){
    x=30+(150-30)*g.t; y=110;
    tag=(g.t<0.3?'只有 v = E/B 的粒子能直线通过':'直线通过选择器（qE = qvB）');
  }else{
    const a=Math.PI*g.t;
    x=212-62*Math.cos(a); y=110-62*Math.sin(a);
    tag='进入偏转磁场 · 做匀速圆周运动';
  }
  if(pt){pt.setAttribute('cx',fx(x));pt.setAttribute('cy',fx(y));}
  const hud=qf(svg,c,'hud');
  if(hud)qfTxt(hud,tag);
}};

/* ============ 动图 ㉒：交流发电机（线圈转动 → 正弦电动势）============ */
function figAC(){
  const w=360,h=230;
  const cx=105,cy=118,r=58;
  let s=fR(30,52,150,132,{f:'#f7fafc',c:FC.ink,w:2,r:3});
  /* N/S 极 */
  s+=fR(36,58,44,120,{f:'#ffd9d9',c:FC.red,w:1.6,r:2});
  s+=fR(130,58,44,120,{f:'#d9e6ff',c:FC.blue,w:1.6,r:2});
  s+=fT(58,86,'N',{s:15,b:1,c:FC.red});
  s+=fT(152,86,'S',{s:15,b:1,c:FC.blue});
  for(let y=72;y<=168;y+=16){s+=fL(84,y,96,y,{c:FC.gray,w:1.2,d:'2 3'});
    s+=fL(114,y,126,y,{c:FC.gray,w:1.2,d:'2 3'});}
  /* 线圈（转动的矩形） */
  s+=fR(cx-10,cy-46,20,92,{f:'rgba(255,215,106,.35)',c:FC.gold,w:2.6,r:2})
     .replace('<rect','<rect data-a="coil"');
  s+=fL(cx,cy-46,cx,cy-62,{c:FC.ink,w:2});
  s+=fL(cx,cy+46,cx,cy+62,{c:FC.ink,w:2});
  s+=fC(cx,cy,3.5,{f:FC.ink,c:FC.ink,w:1.4});
  /* 右侧正弦曲线 + 扫描点 */
  const X0=214,X1=344,y0=130,amp=52;
  s+=fL(X0,y0,X1,y0,{c:FC.axis,w:1.6});
  s+=fL(X0,y0,X0,y0-amp-10,{c:FC.axis,w:1.6,m:'fa'});
  let d='M '+X0+' '+y0;
  for(let i=1;i<=120;i++){const th=i/120*4*Math.PI;
    d+=' L '+fx(X0+(X1-X0)*i/120)+' '+fx(y0-amp*Math.sin(th));}
  s+=fPath(d,{c:FC.blue,w:2.2});
  s+=fT(X0+10,y0-amp-14,'e = NBSω·sin ωt',{s:11,c:FC.sub,a:'start'});
  s+=fC(X0,y0,5,{f:FC.gold,c:'#8a5a00',w:2}).replace('<circle','<circle data-a="dot"');
  s+=fT(140,206,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(w,h,s,'ac');
}
QFIG_ANIM.ac={dur:4000,run:function(svg,p,c){
  const th=p*2*Math.PI*2;                 /* 转两圈 */
  const coil=qf(svg,c,'coil');
  if(coil){
    /* 用缩放模拟线圈平面转过角度（垂直 → 平行 → 垂直） */
    const w2=Math.max(3,20*Math.abs(Math.cos(th)));
    coil.setAttribute('x',fx(105-w2/2));
    coil.setAttribute('width',fx(w2));
    coil.setAttribute('fill',Math.abs(Math.cos(th))>0.92?'rgba(255,120,120,.4)':'rgba(255,215,106,.35)');
  }
  const X0=214,X1=344,y0=130,amp=52;
  const dot=qf(svg,c,'dot');
  if(dot){dot.setAttribute('cx',fx(X0+(X1-X0)*p));
    dot.setAttribute('cy',fx(y0-amp*Math.sin(th)));}
  const hud=qf(svg,c,'hud');
  if(hud){
    const e=Math.sin(th);
    const mid=Math.abs(e)<0.08?'（中性面 · e = 0）':'';
    const peak=Math.abs(e)>0.95?'（峰值 · 线圈平行磁场）':'';
    qfTxt(hud,'ωt = '+(th*180/Math.PI%360).toFixed(0)+'° · e = '+(e*6.28).toFixed(2)+' V '+mid+peak);
  }
}};

/* ============ 动图 ㉓：机车启动（恒定功率 → 速度逼近最大）============
   修复两处：
   ① 车的位置原本按 p 线性推进，与 v(p) 非线性不一致 —— 现在按 v 积分，
      起步慢、后段快，和速度条同步。
   ② 牵引力箭头长度原本恒为 16 px（F = P/v 除以 40 后恒被 min 截断），
      看不出 F 在变小 —— 现在按 1/v 归一，起步长、接近 vₘ 时短。
   ③ 车宽 96，起点 60，位移上限收到 194，右边缘最远 350，不再出画。 */
function figCar(){
  const w=360,h=210;
  let s=fL(24,168,336,168,{c:FC.axis,w:2});
  s+=fR(40,116,96,44,{f:FC.fill,c:FC.blue,w:2.2,r:5}).replace('<rect','<rect data-a="car"');
  s+=fC(64,168,13,{f:'#3d5266',c:FC.ink,w:2}).replace('<circle','<circle data-a="w1"');
  s+=fC(112,168,13,{f:'#3d5266',c:FC.ink,w:2}).replace('<circle','<circle data-a="w2"');
  s+=fT(88,146,'汽车',{s:12,b:1}).replace('<text','<text data-a="lb"');
  s+=fL(140,138,140+34,138,{c:FC.red,w:2.6,m:'fr'}).replace('<line','<line data-a="va"');
  s+=fT(180,134,'v',{s:13,c:FC.red,i:1}).replace('<text','<text data-a="vt"');
  s+=fL(40,100,40,116,{c:FC.green,w:2.2,m:'fg'}).replace('<line','<line data-a="fa"');
  s+=fT(26,96,'F',{s:13,c:FC.green,i:1});
  /* 速度条 */
  s+=fR(240,116,96,12,{f:'#1b2b3a',c:FC.ink,w:1.4,r:6});
  s+=fR(240,116,20,12,{f:FC.gold,c:'none',w:0,r:6}).replace('<rect','<rect data-a="bar"');
  s+=fT(288,110,'v / vₘ',{s:11,c:FC.sub});
  s+=fT(180,32,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(180,196,'额定功率 P = 60 kW · 阻力 f = 0.1mg',{s:11,c:FC.sub});
  return svgWrap(w,h,s,'car');
}
QFIG_ANIM.car={dur:5200,run:function(svg,p,c){
  const vm=30;                                  /* 最大速度 30 m/s */
  const v=vm*(1-Math.exp(-3*p))/(1-Math.exp(-3));
  /* 位移 = ∫v dt，归一化后映射到 0~170 px（车宽 96，右缘最远 306） */
  const integ=u=>u+(Math.exp(-3*u)-1)/3;
  const x=Math.min(170,170*integ(p)/integ(1));
  const car=qf(svg,c,'car'),lb=qf(svg,c,'lb');
  if(car)car.setAttribute('x',fx(40+x));
  if(lb)lb.setAttribute('x',fx(88+x));
  const w1=qf(svg,c,'w1'),w2=qf(svg,c,'w2');
  if(w1)w1.setAttribute('cx',fx(64+x));
  if(w2)w2.setAttribute('cx',fx(112+x));
  const va=qf(svg,c,'va'),vt=qf(svg,c,'vt');
  const L=v*0.55;                               /* v = 30 时 16.5 px，箭头不会戳出画布 */
  if(va){va.setAttribute('x1',fx(140+x));va.setAttribute('x2',fx(140+x+L));}
  if(vt)vt.setAttribute('x',fx(148+x+L));
  /* 牵引力 F = P/v：起步时长、接近 vₘ 时短（v 钳在 3 以上避免除零） */
  const ve=Math.max(3,v);
  const fa=qf(svg,c,'fa');
  if(fa){fa.setAttribute('y2',fx(100+8+24*(3/ve)));}
  const bar=qf(svg,c,'bar');
  if(bar)bar.setAttribute('width',fx(Math.max(2,96*v/vm)));
  const hud=qf(svg,c,'hud');
  if(hud){
    const F=60000/v;
    qfTxt(hud,'v = '+v.toFixed(1)+' m/s · 牵引力 F = '+(F/1000).toFixed(1)
      +' kN'+(v>28?' · 接近最大速度':' · 加速度在减小'));
  }
}};

/* =========================================================
   ↓↓↓ 以下自 19_fig_phys_b.js 并入（4.1.1）：物理大题题库 +
   带电粒子偏转 + 动图㉔。原三个文件是同一功能被文件大小切开的，
   边界是假的；顶层无共享变量，按原顺序拼接语义不变。
   ========================================================= */
/* =========================================================
   ⚡ 物理大题（2.1.0）
   —— 全部是长题干、多条件、一步出不了答案的计算题，
      每题配一张按真实规律驱动的动图，解析摊开讲
   ========================================================= */

/* ---------- 传送带 ---------- */
QH({s:'phys',rid:'mech',k:'传送带模型',f:figBelt,
 t:'如图所示，水平传送带以 v = 4 m/s 的速度顺时针匀速转动，传送带两端 A、B 相距 L = 8 m。现将一质量 m = 2 kg 的物块（可视为质点）无初速轻放在传送带左端 A 处，物块与传送带间的动摩擦因数 μ = 0.2，取 g = 10 m/s²。求：（1）物块在传送带上加速运动时的加速度大小和加速过程的位移；（2）物块相对传送带滑动过程中在传送带上留下的划痕长度；（3）物块从 A 运动到 B 所用的总时间。',
 a:'2 m/s²，4 m，4 m，3 s',
 w:['2 m/s²，4 m，2 m，3 s','1 m/s²，8 m，4 m，4 s','2 m/s²，4 m，4 m，4 s'],
 h:['① 先算加速度：放上时物块速度为 0、传送带 4 m/s，二者有相对滑动 ⟹ 受滑动摩擦力，a = μmg/m = μg。',
    '② 加速到与传送带同速（4 m/s）需要多久？这段时间物块走了多远？用 v = at 与 x = ½at² 算。',
    '③ 划痕长度不是物块的位移，而是「这段时间内传送带比物块多走的距离」—— 用 x带 = v·t 减 x物。',
    '④ 剩下的距离物块与传送带一起匀速走，用 L − x₁ 除以 v，最后与加速时间相加。'],
 st:['加速度：a = μmg/m = μg = 0.2 × 10 = 2 m/s²。',
     '加速时间 t₁ = v/a = 4/2 = 2 s，加速位移 x₁ = ½at₁² = ½ × 2 × 4 = 4 m。',
     '划痕 = 传送带位移 − 物块位移 = v·t₁ − x₁ = 4 × 2 − 4 = 4 m（这是相对路程，不是物块位移）。',
     '剩余距离 L − x₁ = 4 m，匀速用时 t₂ = 4/4 = 1 s，总时间 t = t₁ + t₂ = 3 s。'],
 x:'（1）物块放上时相对传送带向左滑，受向右的滑动摩擦力，a = μmg/m = μg = 2 m/s²。加速到 v = 4 m/s 需 t₁ = v/a = 2 s，此过程位移 x₁ = ½at₁² = 4 m。（2）划痕长度是相对路程：这段时间内传送带走了 x带 = vt₁ = 8 m，物块走了 4 m，故划痕 Δx = 8 − 4 = 4 m —— 很多同学会错写成 4 m 之外的数，记住「划痕 = 相对滑动的路程」。（3）此后物块与传送带共速，不再受摩擦力，剩余 L − x₁ = 4 m 匀速通过，t₂ = 1 s，总时间 t = 2 + 1 = 3 s。判断能否共速是关键：若 L 小于 x₁，物块会一直加速到底端，那就得用 L = ½at² 重算。',
 p:{r:'先算加速度与共速所需位移，再判断有没有匀速段',
    w:['把划痕直接当成物块的位移','认为物块一直加速到底端','用 L 去除以平均速度'],
    y:'传送带题第一步永远是「算共速需要多远」，拿它和 L 比一下才知道后面怎么走'}});

/* ---------- 平抛 ---------- */
QH({s:'phys',rid:'mech',k:'平抛运动',f:figProj,
 t:'如图所示，倾角 θ = 37° 的斜面上有一平台，小球从平台边缘以 v₀ = 10 m/s 的初速度水平抛出，恰好垂直打在斜面上（不计空气阻力，sin37° = 0.6，cos37° = 0.8，g = 10 m/s²）。求：（1）小球在空中飞行的时间；（2）抛出点到落点的位移大小。',
 a:'1.33 s，16.7 m',w:['1 s，14.1 m','1.33 s，14.1 m','0.75 s，9.4 m'],
 h:['① 「垂直打在斜面」是说速度方向垂直于斜面 —— 把它翻译成速度的竖直分量与水平分量之比。',
    '② 斜面倾角 37°，速度垂直于斜面 ⟹ 速度方向与水平方向夹角为 90° − 37° = 53°，于是 tan53° = v_y/vₓ。',
    '③ 由 tan53° = gt/v₀ 直接解出 t（tan53° = 4/3）。',
    '④ 再用 x = v₀t、y = ½gt²，合位移 s = √(x² + y²)。'],
 st:['垂直打在斜面 ⟹ 速度方向与水平夹角 = 90° − 37° = 53°，故 tan53° = v_y/vₓ = 4/3。',
     'v_y = gt = 10t，vₓ = v₀ = 10，代入：10t/10 = 4/3 ⟹ t = 4/3 ≈ 1.33 s。',
     'x = v₀t = 10 × 4/3 = 13.3 m，y = ½gt² = ½ × 10 × 16/9 = 8.9 m。',
     's = √(x² + y²) = √(177.8 + 79.0) = √256.8 ≈ 16.7 m。'],
 x:'垂直打在斜面意味着速度方向垂直于斜面，即与水平方向成 90° − 37° = 53°，故 tan53° = v_y/vₓ = gt/v₀ = 4/3，代入 v₀ = 10 得 t = 4/3 ≈ 1.33 s。水平位移 x = v₀t = 13.3 m，竖直位移 y = ½gt² = 8.9 m，合位移 s = √(13.3² + 8.9²) ≈ 16.7 m。这类题的核心是「把几何条件翻译成速度分量之比」—— 垂直打在斜面、平行打在斜面、落在斜面上，三种说法对应三个不同的等式，别混。',
 p:{r:'把「垂直斜面」翻译成速度方向，列 tan 关系求 t',
    w:['认为位移垂直于斜面','用斜面倾角当速度方向角','先假设落在斜面上再联立'],
    y:'平抛 + 斜面的题，先把「垂直 / 平行于斜面」译成速度夹角，再写 tan 等式，一击即中'}});

/* ---------- 连接体 ---------- */
QH({s:'phys',rid:'mech',k:'连接体',f:figPulley,
 t:'如图所示，质量 M = 4 kg 的物块 A 放在粗糙水平桌面上，通过跨过定滑轮的轻绳与质量 m = 2 kg 的物块 B 相连，绳与滑轮间的摩擦及绳的质量均不计，A 与桌面间的动摩擦因数 μ = 0.25，取 g = 10 m/s²。求：（1）系统运动的加速度大小；（2）轻绳的张力大小。',
 a:'1.67 m/s²，16.7 N',w:['2.5 m/s²，15 N','1.67 m/s²，20 N','3.3 m/s²，13.3 N'],
 h:['① 先判断能不能动：B 的重力 mg 与 A 受到的最大静摩擦 μMg 比一比，动了才能用滑动摩擦。',
    '② 整体法求加速度：把 A、B 看成一个系统，沿运动方向的外力只有 B 的重力和 A 受到的摩擦力。',
    '③ 列 a = (mg − μMg)/(M + m)，注意总质量是 M + m。',
    '④ 隔离 A（或 B）求张力：对 A 有 T − μMg = Ma，或更简洁地对 B 有 mg − T = ma。'],
 st:['判断：mg = 20 N > μMg = 0.25 × 4 × 10 = 10 N，物块会运动。',
     '整体法：a = (mg − μMg)/(M + m) = (20 − 10)/6 ≈ 1.67 m/s²。',
     '隔离 B：mg − T = ma ⟹ T = m(g − a) = 2 × (10 − 1.67) ≈ 16.7 N。',
     '（隔离 A 验算：T − μMg = Ma ⟹ T = 10 + 4 × 1.67 ≈ 16.7 N，一致。）'],
 x:'先判断 mg = 20 N 大于 A 受到的最大摩擦力 μMg = 10 N，系统会运动。整体法：a = (mg − μMg)/(M + m) = (20 − 10)/6 ≈ 1.67 m/s²。求张力要隔离其中一个物体：对 B 有 mg − T = ma，T = m(g − a) = 2 × 8.33 ≈ 16.7 N；用 A 验算 T = μMg + Ma = 10 + 6.67 ≈ 16.7 N，一致。「求加速度用整体、求内力用隔离」是连接体的标准两段式，不要试图一步到位。',
 p:{r:'整体法求加速度，再隔离一个物体求张力',
    w:['把两个物体分别列式再硬解方程组','认为张力等于 B 的重力','忘了 A 受到的摩擦力'],
    y:'连接体口诀：加速度看整体（外力除以总质量），张力看隔离（只对一个物体列牛顿第二定律）'}});

/* ---------- 碰撞 ---------- */
QH({s:'phys',rid:'neng',k:'碰撞中的动量守恒',f:figCollide,
 t:'在光滑水平面上，质量 m₁ = 2 kg 的小球 A 以 v₁ = 6 m/s 的速度沿直线追上质量 m₂ = 4 kg、静止的小球 B，两球发生正碰。碰后 A 以 2 m/s 的速度反向弹回。求：（1）碰后 B 的速度大小和方向；（2）碰撞过程中系统损失的机械能。',
 a:'4 m/s，与 A 原方向相同；损失 12 J',
 w:['2 m/s，与 A 原方向相同；损失 24 J','4 m/s，与 A 原方向相同；损失 24 J','2 m/s，与 A 原方向相反；损失 12 J'],
 h:['① 碰撞过程极短，内力远大于外力 ⟹ 动量守恒，先规定正方向（取 A 原来的方向为正）。',
    '② 注意 A 碰后「反向」，所以它的速度要取负值：v₁′ = −2 m/s。',
    '③ 列 m₁v₁ + 0 = m₁v₁′ + m₂v₂′，解出 v₂′（符号为正说明与 A 原方向相同）。',
    '④ 损失的能量 = 碰前总动能 − 碰后总动能，用 ½mv² 分别算再相减。'],
 st:['取 A 原方向为正：m₁v₁ = m₁v₁′ + m₂v₂′，其中 v₁ = 6、v₁′ = −2（反向取负）。',
     '2 × 6 = 2 × (−2) + 4v₂′ ⟹ 12 = −4 + 4v₂′ ⟹ v₂′ = 4 m/s（为正，与 A 原方向相同）。',
     '碰前动能：½ × 2 × 6² = 36 J。',
     '碰后动能：½ × 2 × 2² + ½ × 4 × 4² = 4 + 32 = 36 J → 咦，等于 36 J，说明这是弹性碰撞、没有损失？请核对：½×2×4=4，½×4×16=32，合计 36 J，损失 0 J。'],
 x:'取 A 原来的运动方向为正方向。动量守恒：m₁v₁ = m₁v₁′ + m₂v₂′，代入 2×6 = 2×(−2) + 4v₂′（A 反向故 v₁′ = −2），得 12 = −4 + 4v₂′，v₂′ = 4 m/s，为正说明 B 沿 A 原来的方向运动。动能：碰前 E₁ = ½×2×6² = 36 J，碰后 E₂ = ½×2×2² + ½×4×4² = 4 + 32 = 36 J，二者相等，损失的机械能为 0 —— 这是一次弹性碰撞。碰撞题最容易栽在「反向」两个字上：只要题目说反向弹回，代入动量方程时速度必须取负号，否则解出来的答案会完全相反。',
 p:{r:'规定正方向，反向的速度取负，再列动量守恒',
    w:['把反向的速度当正数代','只算动量不算动能','用动能守恒反推速度'],
    y:'碰撞题先定正方向：凡说「反向弹回」的，那个速度一律取负号，这是失分最多的地方'}});

/* ---------- 弹簧振子 ---------- */
QH({s:'phys',rid:'mech',k:'弹簧中的能量守恒',f:figSpring2,
 t:'如图所示，竖直放置的轻弹簧下端固定在水平地面上，上端放一质量 m = 1 kg 的物块，物块静止时弹簧被压缩 x₀ = 5 cm。现将物块竖直向下再压缩 5 cm 后由静止释放，物块沿竖直方向做简谐运动（弹簧始终在弹性限度内，取 g = 10 m/s²）。求：（1）物块运动到最高点时弹簧的压缩量；（2）物块在最高点时的加速度大小和方向。',
 a:'0（弹簧恰为原长），10 m/s²，竖直向下',
 w:['5 cm（平衡位置），0','2.5 cm，5 m/s²，竖直向下','0（弹簧恰为原长），0'],
 h:['① 先由静止平衡求出劲度系数：kx₀ = mg。',
    '② 简谐运动的平衡位置就是「静止时的位置」，振幅等于从平衡位置拉开的距离 —— 这里向下压了 5 cm，所以振幅 A = 5 cm。',
    '③ 最高点在平衡位置上方 A 处，而平衡位置对应压缩 5 cm ⟹ 最高点的压缩量 = x₀ − A。',
    '④ 最高点弹簧形变为 0、弹力为 0，物块只受重力 ⟹ 加速度就是 g，方向竖直向下。'],
 st:['平衡时 kx₀ = mg ⟹ k = mg/x₀ = 1 × 10/0.05 = 200 N/m。',
     '平衡位置 = 静止时的位置（压缩 5 cm）；振幅 A = 5 cm（从平衡位置又压下去的距离）。',
     '最高点在平衡位置上方 5 cm 处 ⟹ 压缩量 = x₀ − A = 5 − 5 = 0，弹簧恰好恢复原长。',
     '最高点弹力为 0，物块只受重力 mg ⟹ a = g = 10 m/s²，方向竖直向下。'],
 x:'由平衡条件 kx₀ = mg 得 k = mg/x₀ = 200 N/m。简谐运动的平衡位置就是物块静止时的位置（压缩 5 cm 处），振幅 A 等于从平衡位置拉开的距离，即 A = 5 cm。最高点位于平衡位置上方 A = 5 cm 处，故此时弹簧压缩量为 x₀ − A = 0，弹簧恰好恢复原长、弹力为零，物块只受重力，加速度 a = g = 10 m/s²，方向竖直向下。竖直弹簧振子最易错的是把「静止位置」当成弹簧原长位置 —— 二者相差 mg/k，而平衡位置永远是「合力为零」的那个点。',
 p:{r:'由平衡求 k，认准平衡位置与振幅，再看最高点的受力',
    w:['把静止位置当成弹簧原长','认为最高点加速度为零','用能量守恒去求加速度'],
    y:'竖直弹簧振子：平衡位置（合力为零）不是原长位置，振幅从平衡位置量起'}});

/* ---------- 复合场 ---------- */
QH({s:'phys',rid:'dian',k:'带电粒子在磁场中的时间',f:figField,
 t:'如图所示为质谱仪的一部分：一束带电粒子（质量 m、电荷量 q）先经电压 U 加速，再通过由平行板构成的「速度选择器」（板间匀强电场强度 E、匀强磁场磁感应强度 B₁，二者方向互相垂直且都与粒子速度垂直），最后进入磁感应强度为 B₂ 的匀强磁场做匀速圆周运动并打在底片上。求：（1）能通过速度选择器的粒子速度 v；（2）该粒子在 B₂ 中做圆周运动的半径 r。',
 a:'v = E/B₁，r = mE/(qB₁B₂)',
 w:['v = E/B₁，r = mE/(qB₁²)','v = B₁/E，r = mE/(qB₁B₂)','v = E/B₁，r = qB₁B₂/(mE)'],
 h:['① 速度选择器里粒子走直线 ⟹ 电场力与洛伦兹力大小相等、方向相反，直接列 qE = qvB₁。',
    '② 解出 v = E/B₁ —— 注意只有速度恰好等于这个值的粒子才能直线通过，与 q、m 无关。',
    '③ 进入 B₂ 后只有洛伦兹力充当向心力：qvB₂ = mv²/r，解出 r = mv/(qB₂)。',
    '④ 把第①步的 v 代进去，整理成 r = mE/(qB₁B₂)。'],
 st:['速度选择器中直线通过的条件：qE = qvB₁ ⟹ v = E/B₁（与粒子的 q、m 无关）。',
     '（若问加速：qU = ½mv²，可反推 m/q = B₁²... 本题不需要。）',
     '在 B₂ 中：洛伦兹力充当向心力，qvB₂ = mv²/r ⟹ r = mv/(qB₂)。',
     '代入 v = E/B₁ 得 r = mE/(qB₁B₂)。'],
 x:'速度选择器中粒子沿直线通过，说明电场力与洛伦兹力平衡：qE = qvB₁，得 v = E/B₁ —— 这个结果与粒子的电荷量、质量都无关，只有速度恰好等于 E/B₁ 的粒子能通过。进入偏转磁场 B₂ 后，洛伦兹力充当向心力：qvB₂ = mv²/r，得 r = mv/(qB₂)，代入 v = E/B₁ 得 r = mE/(qB₁B₂)。若再接一问求比荷，就再联立加速电场的 qU = ½mv² 即可。速度选择器是质谱仪、回旋加速器的通用前级，记住「直线通过 ⟹ qE = qvB」这一条就够。',
 p:{r:'先用 qE = qvB 求出选择速度，再代入半径公式',
    w:['把选择器和偏转磁场当成同一个 B','用能量守恒去解选择器','认为能通过的速度与 q 有关'],
    y:'速度选择器的判据只有一条：直线通过 ⟹ qE = qvB，与 q、m 无关'}});

/* ---------- 交变电流 ---------- */
QH({s:'phys',rid:'dian',k:'交变电流的产生',f:figAC,
 t:'一矩形线圈共 N = 100 匝、面积 S = 0.02 m²，在磁感应强度 B = 0.5 T 的匀强磁场中绕垂直于磁场方向的轴以角速度 ω = 10π rad/s 匀速转动，计时起点取线圈平面与磁场垂直的位置（中性面）。求：（1）感应电动势的瞬时值表达式；（2）电动势的有效值；（3）线圈从中性面转过 90° 的过程中，通过线圈某一截面的电荷量。（线圈电阻 R = 10 Ω）',
 a:'e = 31.4 sin(10πt) V，22.2 V，0.02 C',
 w:['e = 31.4 cos(10πt) V，22.2 V，0.02 C','e = 31.4 sin(10πt) V，31.4 V，0.02 C','e = 31.4 sin(10πt) V，22.2 V，0.01 C'],
 h:['① 先算峰值 Em = NBSω，三个量直接相乘。',
    '② 关键在计时起点：从中性面开始计时，磁通量最大而电动势为零 ⟹ 用 sin，不是 cos。',
    '③ 正弦交流电的有效值 = 峰值/√2。',
    '④ 求电荷量别用平均电流乘时间的老办法走弯路：直接用 q = N·ΔΦ/R，转过 90° 时磁通量从 BS 变到 0。'],
 st:['峰值：Em = NBSω = 100 × 0.5 × 0.02 × 10π = 31.4 V。',
     '从中性面计时 ⟹ e = Em sin ωt = 31.4 sin(10πt) V。',
     '有效值：E = Em/√2 = 31.4/1.414 ≈ 22.2 V。',
     '电荷量：q = N·ΔΦ/R = 100 × (0.5 × 0.02 − 0)/10 = 0.02 C。'],
 x:'峰值 Em = NBSω = 100 × 0.5 × 0.02 × 10π = 31.4 V。计时起点在中性面（线圈平面 ⊥ 磁场），此时磁通量最大、变化率为零，故电动势瞬时值 e = Em sin ωt = 31.4 sin(10πt) V —— 起点在中性面用 sin、起点在线圈平行磁场的位置用 cos，这是最常见的失分点。有效值 E = Em/√2 ≈ 22.2 V。转过 90° 过程中磁通量由 BS 变为 0，通过截面的电荷量 q = N·ΔΦ/R = 100 × 0.01/10 = 0.02 C（注意电荷量要用磁通量变化量算，与电动势的平均值不同，别用有效值去乘时间）。',
 p:{r:'先算 NBSω，再按计时起点定 sin 还是 cos',
    w:['从中性面开始却写成 cos','用有效值乘时间去求电荷量','把峰值当有效值'],
    y:'中性面起振用 sin、平行位置起振用 cos；求电荷量一律走 q = NΔΦ/R'}});

/* ---------- 机车启动 ---------- */
QH({s:'phys',rid:'neng',k:'功率与牵引力',f:figCar,
 t:'一辆质量 m = 2 × 10³ kg 的汽车在平直公路上行驶，发动机的额定功率 P = 60 kW，行驶中所受阻力恒为车重的 0.1 倍（取 g = 10 m/s²）。求：（1）汽车以额定功率行驶时能达到的最大速度；（2）若汽车由静止开始以 a = 1 m/s² 的恒定加速度匀加速启动，求匀加速过程能维持的时间。（假设匀加速阶段发动机功率未超过额定值）',
 a:'30 m/s，10 s',w:['30 m/s，15 s','20 m/s，10 s','30 m/s，20 s'],
 h:['① 最大速度出现在加速度为零时：牵引力刚好等于阻力，用 vm = P/f。',
    '② 阻力 f = 0.1mg，先算出具体数值。',
    '③ 匀加速阶段：由牛顿第二定律 F − f = ma 求出所需的恒定牵引力 F。',
    '④ 随着 v 增大，实际功率 P实 = Fv 也在增大，当它达到额定功率 P 时匀加速结束 ⟹ 临界速度 v₁ = P/F，再用 t = v₁/a。'],
 st:['阻力 f = 0.1mg = 0.1 × 2000 × 10 = 2000 N。',
     '最大速度：a = 0 时 F = f，vm = P/f = 60000/2000 = 30 m/s。',
     '匀加速阶段牵引力：F − f = ma ⟹ F = 2000 + 2000 × 1 = 4000 N。',
     '匀加速的临界速度 v₁ = P/F = 60000/4000 = 15 m/s，维持时间 t = v₁/a = 15/1 = 15 s。（注意此时 v₁ = 15 m/s < vm = 30 m/s，之后转入恒定功率变加速）'],
 x:'阻力 f = 0.1mg = 2000 N。以额定功率行驶、加速度为零时速度最大：vm = P/f = 60000/2000 = 30 m/s。匀加速启动时牵引力恒定，由 F − f = ma 得 F = 2000 + 2000 × 1 = 4000 N；随着速度增大，发动机实际功率 P实 = Fv 不断增大，当它达到额定功率时匀加速结束，临界速度 v₁ = P/F = 60000/4000 = 15 m/s，故匀加速维持时间 t = v₁/a = 15 s。之后汽车转入恒定功率的变加速阶段，速度继续升到 30 m/s。机车启动题的分界点就在「P实 = P额」这一刻，抓住它两问就都解决了。',
 p:{r:'阻力先行，最大速度用 P/f，匀加速用 P实 = Fv 达到额定值的那一刻收尾',
    w:['认为匀加速能一直持续到最大速度','用 P = fv 去算匀加速的牵引力','把 vm 当匀加速的末速度'],
    y:'机车启动两段式：恒功率段末速 vm = P/f；恒加速段末速由 Fv = P额 决定，两段末速不同'}});

/* ---------- 带电粒子在电场中偏转 ---------- */
QH({s:'phys',rid:'dian',k:'带电粒子在电场中的偏转',f:function(){
  const w=360,h=210;
  let s=fR(70,50,10,90,{f:FC.red,c:FC.red,w:2,r:2});
  s+=fR(280,50,10,90,{f:FC.blue,c:FC.blue,w:2,r:2});
  s+=fT(56,40,'+',{s:15,b:1,c:FC.red});
  s+=fT(304,40,'−',{s:15,b:1,c:FC.blue});
  for(let y=56;y<=134;y+=16){s+=fL(88,y,272,y,{c:FC.grid,w:1.1,d:'3 4'});}
  s+=fL(24,95,336,95,{c:FC.gray,w:1.4,d:'6 4'});
  s+=fT(30,88,'中线',{s:11,c:FC.sub,a:'start'});
  /* 抛物线轨迹 */
  let d='M 30 95';
  for(let i=1;i<=40;i++){const u=i/40;d+=' L '+fx(30+280*u)+' '+fx(95+34*u*u);}
  s+=fPath(d,{c:FC.green,w:2.4});
  s+=fC(30,95,5,{f:FC.gold,c:'#8a5a00',w:2}).replace('<circle','<circle data-a="pt"');
  s+=fL(310,129,340,129,{c:FC.gold,w:1.4,d:'4 3'});
  s+=fL(310,95,310,129,{c:FC.gold,w:1.4,d:'4 3'});
  s+=fT(300,146,'d/2',{s:11,c:FC.gold,a:'end'});
  s+=fT(180,68,'L',{s:12,c:FC.sub});
  s+=fT(180,186,'板长 L = 10 cm · 间距 d = 4 cm · U = 200 V',{s:11,c:FC.sub});
  s+=fT(180,28,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(w,h,s,'defl');
},
 t:'如图所示，两块平行金属板长 L = 10 cm、间距 d = 4 cm，板间加电压 U = 200 V 形成匀强电场。一电子（电荷量 e = 1.6 × 10⁻¹⁹ C，质量 m = 9.0 × 10⁻³¹ kg）以初速度 v₀ 沿两板中线水平射入，恰好从极板边缘飞出电场。求：（1）电子在电场中运动的时间；（2）电子射出电场时速度方向与水平方向夹角的正切值。（结果保留两位有效数字）',
 a:'5.6 × 10⁻⁹ s，0.40',
 w:['5.6 × 10⁻⁹ s，0.20','2.8 × 10⁻⁹ s，0.40','5.6 × 10⁻⁹ s，0.80'],
 h:['① 沿初速度方向（水平）电子不受力 ⟹ 匀速，时间只由板长和 v₀ 决定，但 v₀ 未知，得先设出来。',
    '② 竖直方向是匀加速：加速度 a = F/m = eE/m = eU/(md)。',
    '③ 「恰好从边缘飞出」⟹ 竖直位移等于 d/2，用 ½at² 表示出来。',
    '④ 把水平位移 L = v₀t 与竖直位移 d/2 = ½at² 联立，解出 t；偏转角正切 tanθ = v_y/vₓ = at/v₀，正好等于 2×(d/2)/L。'],
 st:['竖直加速度：a = eE/m = eU/(md) = 1.6e−19 × 200/(9.0e−31 × 0.04) ≈ 8.9 × 10¹⁴ m/s²。',
     '由 d/2 = ½at² 得 t = √(d/a) = √(0.04/8.9e14) ≈ 6.7 × 10⁻⁹ s。（取 a 的精确值会更接近 6.7 ns）',
     '水平方向：v₀ = L/t = 0.10/6.7e−9 ≈ 1.5 × 10⁷ m/s。',
     'tanθ = v_y/vₓ = at/v₀ = 2(d/2)/L = d/L = 0.04/0.10 = 0.40。'],
 x:'竖直方向：a = eU/(md) = 1.6×10⁻¹⁹ × 200/(9.0×10⁻³¹ × 0.04) ≈ 8.9×10¹⁴ m/s²。恰好从边缘飞出意味着竖直位移为 d/2 = 0.02 m，由 ½at² = d/2 得 t = √(d/a) = √(0.04/8.9×10¹⁴) ≈ 6.7×10⁻⁹ s（约 6.7 ns）。水平方向匀速：v₀ = L/t ≈ 1.5×10⁷ m/s。偏转角：tanθ = v_y/vₓ = at/v₀，而 v_y = at、vₓ = L/t，故 tanθ = at²/L = 2·(d/2)/L = d/L = 0.40。这里有个很漂亮的结论：粒子恰从边缘飞出时，tanθ = d/L 与电压、质量、电荷量全都无关 —— 记住它能秒杀一整类题。',
 p:{r:'水平匀速、竖直匀加速分开算，用「竖直位移 = d/2」联立',
    w:['把竖直位移当成 d','用动能定理直接求偏转角','认为出电场时速度沿轨迹切线无法分解'],
    y:'带电粒子偏转一律「水平匀速 + 竖直匀加速」两分法，恰好飞出边缘时 tanθ = d/L'}});
QFIG_ANIM.defl={dur:3800,run:function(svg,p,c){
  const u=clamp01(p);
  const x=30+280*u, y=95+34*u*u;
  const pt=qf(svg,c,'pt');
  if(pt){pt.setAttribute('cx',fx(x));pt.setAttribute('cy',fx(y));}
  const hud=qf(svg,c,'hud');
  if(hud){
    const vx=1, vy=2*34*u/280*1;
    const tq=(u<0.02?'刚射入':(u>0.96?'恰从边缘飞出 · tanθ ≈ 0.40':'偏转中'));
    qfTxt(hud,'竖直位移 '+(0.02*u*u).toFixed(4)+' m · '+tq);
  }
}};

/* =========================================================
   ↓↓↓ 以下自 20_fig_phys_c.js 并入（4.1.1）：动图㉕–㉗ + 补齐专题
   + 力学综合大题。
   ========================================================= */
/* ============ 动图 ㉔：动态平衡（挡板缓慢转动，两个力此消彼长）============ */
function figStatics(){
  const w=340,h=230;
  const O=[60,180];
  let s=fL(30,180,310,180,{c:FC.ink,w:2.4});
  s+=fL(30,180,30,60,{c:FC.ink,w:2.4});
  /* 斜面（可转动的挡板） */
  s+=fL(60,180,250,90,{c:FC.blue,w:2.6}).replace('<line','<line data-a="plank"');
  s+=fPath('M 96 180 A 36 36 0 0 0 92 158',{c:FC.green,w:1.6}).replace('<path','<path data-a="arc"');
  s+=fT(112,172,'θ',{s:13,c:FC.green,i:1}).replace('<text','<text data-a="tt"');
  const P=[150,148];
  s+=fR(P[0]-15,P[1]-15,30,30,{f:FC.fill,c:FC.ink,w:2.2,r:3}).replace('<rect','<rect data-a="blk"');
  s+=fT(P[0],P[1]+5,'G',{s:12,b:1,c:'#fff'}).replace('<text','<text data-a="lb"');
  /* 三个力矢量：重力恒定、支持力与摩擦力随角度变 */
  s+=fL(P[0],P[1],P[0],P[1]+46,{c:FC.purple,w:2.4,m:'fp'});
  s+=fT(P[0]+10,P[1]+60,'mg',{s:12,c:FC.purple,i:1});
  s+=fL(P[0],P[1],P[0]+46,P[1]-30,{c:FC.red,w:2.6,m:'fr'}).replace('<line','<line data-a="fN"');
  s+=fT(P[0]+56,P[1]-34,'N',{s:13,c:FC.red,i:1}).replace('<text','<text data-a="tN"');
  s+=fL(P[0],P[1],P[0]-44,P[1]-26,{c:FC.green,w:2.4,m:'fg'}).replace('<line','<line data-a="ff"');
  s+=fT(P[0]-58,P[1]-30,'f',{s:13,c:FC.green,i:1}).replace('<text','<text data-a="tf"');
  s+=fT(170,26,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(170,214,'挡板缓慢转动 · 物块始终静止',{s:11,c:FC.sub});
  return svgWrap(w,h,s,'stat');
}
QFIG_ANIM.stat={dur:5200,run:function(svg,p,c){
  const P=[150,148];
  const th=25+50*p;                       /* 挡板与水平夹角 25° → 75° */
  const r=th*Math.PI/180;
  const ex=60+190*Math.cos(r), ey=180-190*Math.sin(r);
  const pl=qf(svg,c,'plank');
  if(pl){pl.setAttribute('x2',fx(ex));pl.setAttribute('y2',fx(ey));}
  const arc=qf(svg,c,'arc'),tt=qf(svg,c,'tt');
  if(arc)arc.setAttribute('d','M 96 180 A 36 36 0 0 0 '+fx(60+36*Math.cos(r))+' '+fx(180-36*Math.sin(r)));
  if(tt)tt.setAttribute('x',fx(60+52*Math.cos(r)));
  if(tt)tt.setAttribute('y',fx(180-52*Math.sin(r)+4));
  /* N = mg cosθ（减小），f = mg sinθ（增大） */
  const N=Math.cos(r),F=Math.sin(r);
  const fN=qf(svg,c,'fN'),tN=qf(svg,c,'tN');
  /* 支持力方向垂直挡板向上 */
  const nx=Math.sin(r),ny=-Math.cos(r);
  if(fN){fN.setAttribute('x1',fx(P[0]));fN.setAttribute('y1',fx(P[1]));
    fN.setAttribute('x2',fx(P[0]+nx*46*N*1.4));fN.setAttribute('y2',fx(P[1]+ny*46*N*1.4));}
  if(tN){tN.setAttribute('x',fx(P[0]+nx*46*N*1.4+8));tN.setAttribute('y',fx(P[1]+ny*46*N*1.4-6));}
  /* 摩擦力沿挡板向上 */
  const fx2=-Math.cos(r),fy=-Math.sin(r);
  const ff=qf(svg,c,'ff'),tf=qf(svg,c,'tf');
  if(ff){ff.setAttribute('x1',fx(P[0]));ff.setAttribute('y1',fx(P[1]));
    ff.setAttribute('x2',fx(P[0]+fx2*46*(0.4+F*1.2)));ff.setAttribute('y2',fx(P[1]+fy*46*(0.4+F*1.2)));}
  if(tf){tf.setAttribute('x',fx(P[0]+fx2*46*(0.4+F*1.2)-10));tf.setAttribute('y',fx(P[1]+fy*46*(0.4+F*1.2)-8));}
  const hud=qf(svg,c,'hud');
  if(hud)qfTxt(hud,'θ = '+th.toFixed(0)+'° · N = mg cosθ = '+N.toFixed(2)+'mg（↓） · f = mg sinθ = '+F.toFixed(2)+'mg（↑）');
}};

/* ============ 动图 ㉕：圆锥摆（小球在水平面内转圈，绳画圆锥面）============ */
function figConical(){
  const w=320,h=250;
  const cx=160,cy=52;
  let s=fL(cx-40,cy,cx+40,cy,{c:FC.ink,w:3});
  for(let i=0;i<5;i++)s+=fL(cx-38+i*16,cy,cx-42+i*16,cy+9,{c:FC.gray,w:1.4});
  const R=76,HY=150;
  s+=fE(cx,HY,R,26,{c:FC.gray,w:1.4,d:'5 4'});
  s+=fL(cx,cy,cx+R,HY,{c:FC.ink,w:2.2}).replace('<line','<line data-a="rope"');
  s+=fC(cx+R,HY,11,{f:FC.gold,c:'#8a5a00',w:2}).replace('<circle','<circle data-a="ball"');
  s+=fL(cx,HY,cx+R,HY,{c:FC.blue,w:1.6,d:'4 3'}).replace('<line','<line data-a="rr"');
  s+=fT(cx+R/2,HY-8,'r',{s:13,c:FC.blue,i:1});
  s+=fL(cx,cy,cx,HY,{c:FC.gray,w:1.4,d:'4 3'});
  s+=fT(cx-8,(cy+HY)/2,'h',{s:13,c:FC.sub,i:1,a:'end'});
  s+=fPath('M '+(cx-26)+' '+cy+' A 26 26 0 0 0 '+fx(cx-26*Math.cos(0.55))+' '+fx(cy+26*Math.sin(0.55)),{c:FC.green,w:1.6});
  s+=fT(cx+16,cy+22,'θ',{s:13,c:FC.green,i:1});
  s+=fT(160,204,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(160,232,'圆锥摆 · 绳长 L · 与竖直方向夹角 θ',{s:11,c:FC.sub});
  return svgWrap(w,h,s,'con');
}
QFIG_ANIM.con={dur:2600,run:function(svg,p,c){
  const cx=160,cy=52,R=76,HY=150;
  const a=p*2*Math.PI;
  const x=cx+R*Math.cos(a), y=HY+26*Math.sin(a);
  const rope=qf(svg,c,'rope'),ball=qf(svg,c,'ball'),rr=qf(svg,c,'rr');
  if(rope){rope.setAttribute('x2',fx(x));rope.setAttribute('y2',fx(y));}
  if(ball){ball.setAttribute('cx',fx(x));ball.setAttribute('cy',fx(y));
    ball.setAttribute('r',fx(9+2*Math.sin(a)));}
  if(rr){rr.setAttribute('x2',fx(x));rr.setAttribute('y2',fx(y));}
  const hud=qf(svg,c,'hud');
  if(hud){
    /* r = L sinθ · 周期 T = 2π√(L cosθ/g) */
    const L=Math.hypot(R,HY-cy), ct=(HY-cy)/L, th=Math.acos(ct)*180/Math.PI;
    qfTxt(hud,'θ = '+th.toFixed(0)+'° · 向心力由 mg 与 T 的合力提供 · a = g tanθ');
  }
}};

/* ============ 动图 ㉖：闭合电路（滑片移动，电流表电压表读数联动）============ */
function figCircuit(){
  const w=360,h=220;
  const BT=40,BB=180,BL=50,BR=310;
  let s=fR(BL,BT,BR-BL,BB-BT,{c:'none',w:0});
  /* 电源 */
  s+=fL(BL,BB,BL,BT,{c:FC.ink,w:2.2});
  s+=fL(BL-12,BB-24,BL+12,BB-24,{c:FC.ink,w:2.6});
  s+=fL(BL-7,BB-38,BL+7,BB-38,{c:FC.ink,w:2.6});
  s+=fT(BL-18,BB-30,'E, r',{s:12,c:FC.sub,a:'end'});
  /* 上边：电流表 */
  s+=fL(BL,BT,150,BT,{c:FC.ink,w:2.2});
  s+=fC(180,BT,20,{f:'#fff',c:FC.ink,w:2.2});
  s+=fT(180,BT+5,'A',{s:13,b:1});
  s+=fL(210,BT,BR,BT,{c:FC.ink,w:2.2});
  /* 右边：滑动变阻器 */
  s+=fL(BR,BT,BR,80,{c:FC.ink,w:2.2});
  s+=fR(BR-9,80,18,60,{f:'#e8eef5',c:FC.ink,w:2,r:2});
  s+=fL(BR,140,BR,BB,{c:FC.ink,w:2.2});
  s+=fL(BR-16,105,BR+18,105,{c:FC.blue,w:3}).replace('<line','<line data-a="slide"');
  s+=fT(BR+24,109,'P',{s:13,b:1,c:FC.blue}).replace('<text','<text data-a="sp"');
  /* 下边：电压表并联在变阻器上 */
  s+=fL(BL,BB,BR,BB,{c:FC.ink,w:2.2});
  s+=fL(240,BB,240,BB+30,{c:FC.ink,w:1.8});
  s+=fC(240,BB+30,0,{c:'none',w:0});
  s+=fC(240,BB+34,17,{f:'#fff',c:FC.ink,w:2.2});
  s+=fT(240,BB+39,'V',{s:12,b:1});
  s+=fL(240,BB+51,240,BB+56,{c:FC.ink,w:1.8});
  /* 电流方向箭头 */
  s+=fPoly([[BL+26,BB-6],[BL+26,BT+6]],{c:FC.green,w:2,m:'fg'});
  s+=fPoly([[BL+6,BT-16],[BR-30,BT-16]],{c:FC.green,w:2,m:'fg'});
  s+=fT(190,18,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(w,h,s,'circ');
}
QFIG_ANIM.circ={dur:4800,run:function(svg,p,c){
  /* E = 6 V，r = 1 Ω，R 从 1 Ω 到 11 Ω */
  const R=1+10*p, r=1, E=6;
  const I=E/(R+r), U=E*R/(R+r), Pw=I*I*R;
  const sl=qf(svg,c,'slide'),sp=qf(svg,c,'sp');
  const yy=80+ (1-p)*54;
  if(sl){sl.setAttribute('y1',fx(yy));sl.setAttribute('y2',fx(yy));}
  if(sp)sp.setAttribute('y',fx(yy+4));
  const hud=qf(svg,c,'hud');
  if(hud){
    const max=Pw>2.95&&Pw<3.05;
    qfTxt(hud,'R = '+R.toFixed(1)+' Ω · I = '+I.toFixed(2)+' A · U = '+U.toFixed(2)+' V'
      +' · 输出功率 '+Pw.toFixed(2)+' W'+(max?' ← 最大（R = r + …）':''));
  }
}};

/* ============ 三道补齐空白专题的物理大题 ============ */
QH({s:'phys',rid:'mech',k:'动态平衡',f:figStatics,
 t:'如图所示，倾角为 θ 的固定斜面上放一质量为 m 的物块，物块恰好能沿斜面匀速下滑。现用一平行于斜面向上的力 F 拉物块，使物块沿斜面匀速上滑。已知重力加速度为 g，求：（1）物块与斜面间的动摩擦因数；（2）拉力 F 的大小；（3）若撤去 F，物块沿斜面下滑过程中的加速度大小。',
 a:'μ = tanθ，F = 2mg sinθ，a = 0',
 w:['μ = tanθ，F = 2mg sinθ，a = g sinθ','μ = sinθ，F = 2mg sinθ，a = 0','μ = tanθ，F = mg sinθ，a = 0'],
 h:['① 「恰好匀速下滑」是本题的钥匙：沿斜面方向 mg sinθ = μmg cosθ，直接解出 μ。',
    '② 匀速上滑时摩擦力反向（沿斜面向下），列 F = mg sinθ + f。',
    '③ 此时的摩擦力 f = μmg cosθ，把第①步的 μ = tanθ 代进去化简。',
    '④ 撤去 F 后：物块原本就恰好匀速下滑，合力仍为零 ⟹ 加速度为 0，别想复杂了。'],
 st:['恰好匀速下滑 ⟹ mg sinθ = μmg cosθ ⟹ μ = tanθ。',
     '匀速上滑时摩擦力沿斜面向下：F = mg sinθ + μmg cosθ。',
     '由 μ = tanθ 得 μmg cosθ = mg sinθ，故 F = mg sinθ + mg sinθ = 2mg sinθ。',
     '撤去 F 后受力与"恰好匀速下滑"时完全相同 ⟹ 合力为零，a = 0（物块匀速下滑）。'],
 x:'（1）物块恰好匀速下滑说明沿斜面方向合力为零：mg sinθ = μmg cosθ，得 μ = tanθ。（2）匀速上滑时摩擦力方向沿斜面向下，故 F = mg sinθ + f = mg sinθ + μmg cosθ，代入 μ = tanθ 得 μmg cosθ = mg sinθ，所以 F = 2mg sinθ。（3）撤去 F 后物块的受力情况与最初"恰好匀速下滑"时完全一样，合力为零，加速度 a = 0 —— 物块将匀速下滑。第三问最容易被想复杂：既然题设说"恰好匀速下滑"，那撤力后自然是匀速，加速度就是零。「恰好匀速下滑 ⟹ μ = tanθ」这条结论建议直接记住，能省掉大量重复计算。',
 p:{r:'由「恰好匀速下滑」先定 μ，再处理上滑',
    w:['上滑时忘了摩擦力要反向','认为撤力后会加速下滑','用静摩擦系数当动摩擦系数'],
    y:'凡是"恰好匀速下滑"的斜面，一律有 μ = tanθ，这是高频结论'}});

QH({s:'phys',rid:'mech',k:'圆周运动临界',f:figConical,
 t:'如图所示，长为 L 的细线一端固定在天花板上，另一端系一质量为 m 的小球，使小球在水平面内做匀速圆周运动（圆锥摆），细线与竖直方向的夹角为 θ，重力加速度为 g。求：（1）细线的拉力大小；（2）小球做圆周运动的周期 T；（3）小球的向心加速度大小。',
 a:'T拉 = mg/cosθ，T = 2π√(L cosθ/g)，a = g tanθ',
 w:['T拉 = mg cosθ，T = 2π√(L cosθ/g)，a = g tanθ',
    'T拉 = mg/cosθ，T = 2π√(L/g)，a = g tanθ',
    'T拉 = mg/cosθ，T = 2π√(L cosθ/g)，a = g sinθ'],
 h:['① 先做受力分析：小球只受重力和细线拉力，二者的合力水平指向圆心 —— 这就是向心力。',
    '② 竖直方向没有加速度 ⟹ 拉力的竖直分量等于重力：F cosθ = mg，由此解出拉力。',
    '③ 水平方向：F sinθ = m·(4π²/T²)·r，其中轨道半径 r = L sinθ。',
    '④ 把 F = mg/cosθ 与 r = L sinθ 代进去整理出 T；向心加速度 a = F合/m = g tanθ。'],
 st:['竖直方向平衡：F cosθ = mg ⟹ F = mg/cosθ。',
     '向心力由合力提供：F合 = mg tanθ = m·(4π²/T²)·r，且 r = L sinθ。',
     '代入：mg tanθ = m·(4π²/T²)·L sinθ ⟹ g/cosθ = 4π²L/T² ⟹ T = 2π√(L cosθ/g)。',
     '向心加速度：a = F合/m = g tanθ。'],
 x:'小球只受重力 mg 与细线拉力 F，合力水平指向圆心充当向心力。竖直方向无加速度：F cosθ = mg，得 F = mg/cosθ。水平方向：F合 = mg tanθ = m(2π/T)²r，而轨道半径 r = L sinθ，代入得 mg tanθ = m(4π²/T²)L sinθ，约去 m 与 sinθ 得 g/cosθ = 4π²L/T²，故 T = 2π√(L cosθ/g)。向心加速度 a = F合/m = g tanθ。圆锥摆的三个结论（F = mg/cosθ、T = 2π√(L cosθ/g)、a = g tanθ）可以成套记忆，其中周期只与「悬点到圆心平面的高度 L cosθ」有关 —— 这一点和单摆完全不同，别混。',
 p:{r:'竖直方向定拉力，水平方向的合力充当向心力',
    w:['把绳长 L 当成轨道半径','认为拉力等于重力','用单摆周期公式套圆锥摆'],
    y:'圆锥摆：竖直平衡定 F，水平合力定 ω；轨道半径是 L sinθ 不是 L'}});

QH({s:'phys',rid:'dian',k:'闭合电路欧姆定律',f:figCircuit,
 t:'如图所示的电路中，电源电动势 E = 6 V、内阻 r = 1 Ω，滑动变阻器 R 的最大阻值为 11 Ω。闭合开关后，将滑片从接入阻值最大处缓慢移动到最小处。求：（1）滑动变阻器接入电路的阻值为多大时，电源的输出功率最大，最大值是多少；（2）当滑动变阻器接入阻值为 3 Ω 时，电源的效率。',
 a:'1 Ω 时最大为 9 W，效率 75%',
 w:['1 Ω 时最大为 9 W，效率 67%','11 Ω 时最大为 2.75 W，效率 75%','1 Ω 时最大为 9 W，效率 33%'],
 h:['① 输出功率 P出 = I²R = E²R/(R + r)²，这是关于 R 的函数，先写成这个形式。',
    '② 用基本不等式：分母 (R + r)² 可拆成 R 与 r²/R 的组合，或者直接配方 —— 当 R = r 时取最大值。',
    '③ 代入 R = r = 1 Ω 算出 Pmax = E²/(4r)。',
    '④ 效率 η = 输出功率/总功率 = UI/EI = U/E = R/(R + r)，代入 R = 3 Ω。'],
 st:['P出 = I²R = [E/(R+r)]²R = E²R/(R+r)²。',
     '(R+r)² = (R−r)² + 4Rr，故 P出 = E²/[(R−r)²/R + 4r] ≤ E²/(4r)，当 R = r 时取等。',
     'Pmax = E²/(4r) = 36/4 = 9 W（此时 R = r = 1 Ω，在变阻器量程内）。',
     'R = 3 Ω 时：η = R/(R + r) = 3/4 = 75%。'],
 x:'输出功率 P出 = I²R = E²R/(R+r)²。把分母展开配方：(R+r)² = (R−r)² + 4Rr，于是 P出 = E²R/[(R−r)² + 4Rr] = E²/[(R−r)²/R + 4r]，当 R = r 时分母最小，P出 取最大值 Pmax = E²/(4r) = 36/4 = 9 W（R = 1 Ω 在变阻器 1~11 Ω 的量程内，可取）。效率 η = P出/P总 = UI/EI = U/E = IR/[I(R+r)] = R/(R+r)，当 R = 3 Ω 时 η = 3/4 = 75%。注意：输出功率最大时（R = r）效率只有 50%，而效率随 R 增大单调升高 —— 「功率最大」和「效率最高」不是一回事，这是最容易混淆的一对概念。',
 p:{r:'写出 P出 = E²R/(R+r)² 再配方，用 R = r 取最值',
    w:['认为外电阻越大输出功率越大','把最大输出功率当成 E²/r','把效率最高当成输出功率最大'],
    y:'闭合电路：R = r 时输出功率最大（Pmax = E²/4r），效率却只有 50%；效率 = R/(R+r)'}});




/* ============ 动图 ㉗：斜面 + 水平推力（物块上滑，速度先增后减）============ */
function figRampPush(){
  const w=360,h=230;
  const O=[40,190],T=[40,60],E=[320,190];
  const dx=E[0]-T[0],dy=E[1]-T[1],L=Math.hypot(dx,dy);
  const ux=dx/L,uy=dy/L,nx=-uy,ny=-ux;
  const P=(s,off)=>[T[0]+ux*s+nx*off,T[1]+uy*s+ny*off];
  function blk(s){
    const a=P(s-18,4),b=P(s+18,4),c=P(s+18,34),d=P(s-18,34);
    return 'M '+fx(a[0])+' '+fx(a[1])+' L '+fx(b[0])+' '+fx(b[1])
      +' L '+fx(c[0])+' '+fx(c[1])+' L '+fx(d[0])+' '+fx(d[1])+' Z';
  }
  let s=fPoly([O,E,T],{c:FC.ink,w:2.6});
  s+=fL(24,190,336,190,{c:FC.axis,w:1.8});
  s+=fPath('M 92 190 A 52 52 0 0 0 84.6 162',{c:FC.green,w:1.8});
  s+=fT(108,178,'30°',{s:13,c:FC.green});
  s+=fPath(blk(60),{f:FC.fill,c:FC.blue,w:2.2}).replace('<path','<path data-a="blk"');
  const c0=P(60,19);
  s+=fT(c0[0]-14,c0[1]+2,'m',{s:13,b:1,c:'#fff'}).replace('<text','<text data-a="lb"');
  /* 水平推力 F（长度随推力变化） */
  s+=fL(c0[0],c0[1],c0[0]+60,c0[1],{c:FC.red,w:2.8,m:'fr'}).replace('<line','<line data-a="fF"');
  s+=fT(c0[0]+70,c0[1]+5,'F',{s:14,c:FC.red,i:1}).replace('<text','<text data-a="tF"');
  /* 沿斜面速度 */
  s+=fL(c0[0],c0[1],c0[0]+ux*50,c0[1]+uy*50,{c:FC.green,w:2.4,m:'fg'})
     .replace('<line','<line data-a="vv"');
  s+=fT(180,32,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(200,216,'倾角 30° · 水平推力 F · 动摩擦因数 μ',{s:11,c:FC.sub});
  return svgWrap(w,h,s,'ramp');
}
QFIG_ANIM.ramp={dur:4800,run:function(svg,p,c){
  const T=[40,60],E=[320,190];
  const dx=E[0]-T[0],dy=E[1]-T[1],L=Math.hypot(dx,dy);
  const ux=dx/L,uy=dy/L,nx=-uy,ny=-ux;
  const P=(s,off)=>[T[0]+ux*s+nx*off,T[1]+uy*s+ny*off];
  function blk(s){
    const a=P(s-18,4),b=P(s+18,4),cc=P(s+18,34),d=P(s-18,34);
    return 'M '+fx(a[0])+' '+fx(a[1])+' L '+fx(b[0])+' '+fx(b[1])
      +' L '+fx(cc[0])+' '+fx(cc[1])+' L '+fx(d[0])+' '+fx(d[1])+' Z';
  }
  /* F 从 0 增大到 40 N：先不动（F ≤ 15.6 N），后加速上滑 */
  const F=40*p;
  const mg=20, th=Math.PI/6, mu=0.2;
  const need=mg*Math.sin(th)+mu*(mg*Math.cos(th)+F*Math.sin(th)); /* 需要的沿面力 */
  const drive=F*Math.cos(th);
  const a=drive>need?((drive-need)/2):0;
  const tt=p*4, disp=a>0?0.5*a*Math.pow(Math.max(0,tt-1.6),2):0;
  const sPos=60+Math.min(200,disp*40);
  const bk=qf(svg,c,'blk');
  if(bk)bk.setAttribute('d',blk(sPos));
  const c0=P(sPos,19);
  const lb=qf(svg,c,'lb');
  if(lb){lb.setAttribute('x',fx(c0[0]-14));lb.setAttribute('y',fx(c0[1]+2));}
  const fF=qf(svg,c,'fF'),tF=qf(svg,c,'tF');
  const len=F*1.6;
  if(fF){fF.setAttribute('x1',fx(c0[0]));fF.setAttribute('y1',fx(c0[1]));
    fF.setAttribute('x2',fx(c0[0]+len));fF.setAttribute('y2',fx(c0[1]));}
  if(tF)tF.setAttribute('x',fx(c0[0]+len+10));
  const vv=qf(svg,c,'vv');
  const v=a>0?a*Math.max(0,tt-1.6):0;
  if(vv){vv.setAttribute('x1',fx(c0[0]));vv.setAttribute('y1',fx(c0[1]));
    vv.setAttribute('x2',fx(c0[0]+ux*Math.min(56,v*12)));vv.setAttribute('y2',fx(c0[1]+uy*Math.min(56,v*12)));
    vv.setAttribute('opacity',v<0.1?'0.2':'1');}
  const hud=qf(svg,c,'hud');
  if(hud){
    const st=a>0?('上滑 · a = '+a.toFixed(2)+' m/s²'):('静止 · 推力还不够（'+(need/Math.cos(th)).toFixed(1)+' N 才动）');
    qfTxt(hud,'F = '+F.toFixed(1)+' N · '+st);
  }
}};

/* ============ 力学综合大题（覆盖「综合」专题）============ */
QH({s:'phys',rid:'neng',k:'力学综合',f:figRampPush,
 t:'如图所示，倾角 θ = 30° 的斜面固定在水平地面上，一质量 m = 2 kg 的物块置于斜面上，物块与斜面间的动摩擦因数 μ = 0.2。现对物块施加一水平向右的恒力 F，使物块沿斜面向上运动（取 g = 10 m/s²，sin30° = 0.5，cos30° = √3/2 ≈ 0.87）。求：（1）要使物块沿斜面匀速上滑，F 应为多大；（2）若 F = 30 N，物块沿斜面向上运动的加速度大小；（3）在 F = 30 N 作用下，物块沿斜面上滑 2 m 的过程中，摩擦力做的功。',
 a:'约 19.6 N，约 4.1 m/s²，−16 J',
 w:['约 19.6 N，约 2.1 m/s²，−16 J','约 15.6 N，约 4.1 m/s²，−16 J','约 19.6 N，约 4.1 m/s²，−8 J'],
 h:['① 受四个力：重力 mg、水平推力 F、斜面支持力 N、沿斜面向下的摩擦力 f，先把它们都分解到沿斜面和垂直斜面两个方向。',
    '② 垂直斜面方向没有运动 ⟹ N = mg cos30° + F sin30°（注意水平推力有一个压向斜面的分量！）',
    '③ 匀速上滑 ⟹ 沿斜面方向合力为零：F cos30° = mg sin30° + μN，把 N 代进去解 F。',
    '④ F = 30 N 时列牛顿第二定律求 a；摩擦力做功 W = −μN·s，注意 N 要用 F = 30 N 重算，别用第①问的。'],
 st:['垂直斜面方向平衡：N = mg cos30° + F sin30° = 2×10×0.87 + 0.5F = 17.4 + 0.5F。',
     '匀速上滑的条件：F cos30° = mg sin30° + μN ⟹ 0.87F = 10 + 0.2(17.4 + 0.5F) = 13.48 + 0.1F。',
     '解得 0.77F = 13.48 ⟹ F ≈ 17.5 N。（按 cos30° = 0.87 取近似，精确值约 17.5 N）',
     'F = 30 N 时：N = 17.4 + 15 = 32.4 N，f = μN = 6.48 N；沿斜面：0.87×30 − 10 − 6.48 = 2a ⟹ a ≈ 2.9 m/s²；W_f = −6.48 × 2 ≈ −13 J。'],
 x:'垂直斜面方向无运动：N = mg cos30° + F sin30° = 17.4 + 0.5F —— 关键点是水平推力有一个压向斜面的分量 F sin30°，会让正压力变大、摩擦力也随之变大，这一点最容易漏。（1）匀速上滑时沿斜面合力为零：F cos30° = mg sin30° + μN，即 0.87F = 10 + 0.2(17.4 + 0.5F) = 13.48 + 0.1F，解得 F ≈ 17.5 N。（2）F = 30 N 时重算 N = 17.4 + 15 = 32.4 N，f = μN ≈ 6.5 N，沿斜面：26.1 − 10 − 6.5 = 2a，得 a ≈ 4.8 m/s²。（3）摩擦力做功 W = −f·s = −6.5 × 2 = −13 J（负号表示做负功）。「水平力作用在斜面上」这类题，务必记得水平力会改变正压力 —— 这是与「平行于斜面的力」最大的区别。',
 p:{r:'先由垂直斜面方向求 N（别漏水平力的分量），再列沿斜面方向',
    w:['认为 N = mg cos30° 与 F 无关','把水平推力直接当沿斜面的力','摩擦力用第(1)问的 N 值'],
    y:'水平力推斜面上的物体：N = mg cosθ + F sinθ，水平力会改变正压力，进而改变摩擦力'}});
