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


