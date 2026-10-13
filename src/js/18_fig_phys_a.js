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


