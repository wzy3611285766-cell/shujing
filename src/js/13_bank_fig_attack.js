/* =========================================================
   🔥🔥 攻坚层（2.0.0）：题图库 + 长步骤攻坚题库
   ========================================================= */
/* =========================================================
   🖼 题图库（2.0.0）
   ---------------------------------------------------------
   攻坚题每题配一张图。图全部是运行时拼出来的内联 SVG：
   没有外链图片、不依赖字体、断网也能看，整页导出成单文件照样显示。
   画法约定：白底 + 深灰线，和答题面板里的照片样式保持一致。
   ========================================================= */
const FC={ink:'#20303f',sub:'#5b6b7c',grid:'#cfdbe6',axis:'#3d5266',
  red:'#d8453f',blue:'#2f6fd0',green:'#2c9c5a',gold:'#d99607',
  purple:'#7b52c9',pink:'#e0699b',gray:'#8a99a8',fill:'#e8f0f7'};
function svgWrap(w,h,body,anim){
  return '<svg class="qfig-svg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet"'
   +(anim?' data-fig="'+anim+'"':'')
   +' xmlns="http://www.w3.org/2000/svg">'
   +'<rect x="0" y="0" width="'+w+'" height="'+h+'" rx="8" fill="#ffffff"/>'
   +'<defs>'
   +'<marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="'+FC.ink+'"/></marker>'
   +'<marker id="fr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="'+FC.red+'"/></marker>'
   +'<marker id="fb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="'+FC.blue+'"/></marker>'
   +'<marker id="fg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="'+FC.green+'"/></marker>'
   +'<marker id="fp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="'+FC.purple+'"/></marker>'
   +'<marker id="fk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="'+FC.gold+'"/></marker>'
   +'</defs>'+body
   +(anim?'<g><rect x="'+(w-62)+'" y="8" width="54" height="20" rx="10" fill="#0d1b2a" opacity="0.72"/>'
     +'<text x="'+(w-35)+'" y="22" fill="#7ee0ff" font-size="12" font-weight="700" text-anchor="middle">▶ 动图</text></g>':'')
   +'</svg>';
}
function fL(x1,y1,x2,y2,o){o=o||{};
  return '<line x1="'+fx(x1)+'" y1="'+fx(y1)+'" x2="'+fx(x2)+'" y2="'+fx(y2)+'" stroke="'+(o.c||FC.ink)
   +'" stroke-width="'+(o.w||2)+'" stroke-linecap="round"'
   +(o.d?' stroke-dasharray="'+(o.d===1?'5 4':o.d)+'"':'')
   +(o.m?' marker-end="url(#'+o.m+')"':'')+'/>';}
function fT(x,y,s,o){o=o||{};
  return '<text x="'+fx(x)+'" y="'+fx(y)+'" fill="'+(o.c||FC.ink)+'" font-size="'+(o.s||15)+'"'
   +(o.i?' font-style="italic"':'')+(o.b?' font-weight="700"':'')
   +' text-anchor="'+(o.a||'middle')+'" font-family="Georgia,Times New Roman,serif">'+s+'</text>';}
function fC(x,y,r,o){o=o||{};
  return '<circle cx="'+fx(x)+'" cy="'+fx(y)+'" r="'+fx(r)+'" fill="'+(o.f||'none')
   +'" stroke="'+(o.c||FC.ink)+'" stroke-width="'+(o.w||2)+'"'+(o.d?' stroke-dasharray="'+o.d+'"':'')+'/>';}
function fE(x,y,rx,ry,o){o=o||{};
  return '<ellipse cx="'+fx(x)+'" cy="'+fx(y)+'" rx="'+fx(rx)+'" ry="'+fx(ry)+'" fill="'+(o.f||'none')
   +'" stroke="'+(o.c||FC.ink)+'" stroke-width="'+(o.w||2)+'"'+(o.d?' stroke-dasharray="'+o.d+'"':'')+'/>';}
function fR(x,y,w,h,o){o=o||{};
  return '<rect x="'+fx(x)+'" y="'+fx(y)+'" width="'+fx(w)+'" height="'+fx(h)+'" rx="'+(o.r==null?3:o.r)
   +'" fill="'+(o.f||'none')+'" stroke="'+(o.c||FC.ink)+'" stroke-width="'+(o.w||2)+'"'
   +(o.d?' stroke-dasharray="'+o.d+'"':'')+'/>';}
function fPoly(p,o){o=o||{};
  return '<polyline points="'+p.map(q=>fx(q[0])+','+fx(q[1])).join(' ')+'" fill="'+((o.f||'none'))
   +'" stroke="'+(o.c||FC.ink)+'" stroke-width="'+(o.w||2)+'" stroke-linejoin="round"'
   +(o.d?' stroke-dasharray="'+o.d+'"':'')+'/>';}
function fPath(d,o){o=o||{};
  return '<path d="'+d+'" fill="'+(o.f||'none')+'" stroke="'+(o.c||FC.ink)+'" stroke-width="'+(o.w||2)
   +'" stroke-linejoin="round" stroke-linecap="round"'+(o.d?' stroke-dasharray="'+o.d+'"':'')+'/>';}
function fx(v){return Math.round(v*100)/100;}
/* ---------- 平面直角坐标系 ----------
   返回 {X,Y,s}：X/Y 是数据 → 画布的映射，s 是轴与网格的 SVG 片段 */
function mkAx(o){
  const w=o.w||360,h=o.h||220;
  const L=o.L||36,R=o.R||18,T=o.T||18,B=o.B||30;
  const xmin=o.xmin,xmax=o.xmax,ymin=o.ymin,ymax=o.ymax;
  const X=x=>L+(x-xmin)/(xmax-xmin)*(w-L-R);
  const Y=y=>h-B-(y-ymin)/(ymax-ymin)*(h-T-B);
  let s='';
  const gx=o.gx||6,gy=o.gy||4;
  if(o.grid!==false){
    for(let i=0;i<=gx;i++){const x=xmin+(xmax-xmin)*i/gx;s+=fL(X(x),Y(ymin),X(x),Y(ymax),{c:FC.grid,w:1});}
    for(let j=0;j<=gy;j++){const y=ymin+(ymax-ymin)*j/gy;s+=fL(X(xmin),Y(y),X(xmax),Y(y),{c:FC.grid,w:1});}
  }
  const y0=Math.max(ymin,Math.min(ymax,0)),x0=Math.max(xmin,Math.min(xmax,0));
  s+=fL(X(xmin),Y(y0),X(xmax)+8,Y(y0),{c:FC.axis,w:2,m:'fa'});
  s+=fL(X(x0),Y(ymin),X(x0),Y(ymax)-8,{c:FC.axis,w:2,m:'fa'});
  (o.xt||[]).forEach(v=>{s+=fL(X(v),Y(y0),X(v),Y(y0)+5,{c:FC.axis,w:2});
    s+=fT(X(v),Y(y0)+19,String(v),{s:12,c:FC.sub,a:'middle'});});
  (o.yt||[]).forEach(v=>{s+=fL(X(x0)-5,Y(v),X(x0),Y(v),{c:FC.axis,w:2});
    s+=fT(X(x0)-9,Y(v)+4,String(v),{s:12,c:FC.sub,a:'end'});});
  if(o.xlab)s+=fT(w-8,Y(y0)+19,o.xlab,{s:13,c:FC.sub,a:'end',i:1});
  if(o.ylab)s+=fT(X(x0)+12,T+2,o.ylab,{s:13,c:FC.sub,a:'start',i:1});
  if(o.O)s+=fT(X(x0)-9,Y(y0)+17,'O',{s:12,c:FC.sub,a:'end'});
  return {X:X,Y:Y,s:s,w:w,h:h};
}
/* 采样一条函数曲线（遇到无定义就断开，免得画飞出去） */
function curvePts(f,xmin,xmax,n,X,Y,ymin,ymax,c,w){
  const segs=[],cur=[];
  for(let i=0;i<=n;i++){
    const x=xmin+(xmax-xmin)*i/n;
    let y=f(x);
    if(!isFinite(y)||y<ymin-1||y>ymax+1){if(cur.length>1)segs.push(cur);cur.length=0;continue;}
    cur.push([X(x),Y(y)]);
  }
  if(cur.length>1)segs.push(cur);
  return segs.map(p=>fPoly(p,{c:c||FC.blue,w:w||2.4})).join('');
}

/* ============ 数学 ============ */
/* 三次函数：两个极值点 + 一条水平线（看 a 怎么挪） */
function figCubic(){
  const ax=mkAx({xmin:-2.2,xmax:3.2,ymin:-3.4,ymax:4.4,xt:[-2,-1,1,2,3],yt:[-2,2,4],xlab:'x',ylab:'y',O:1});
  const f=x=>x*x*x-3*x;
  let s=ax.s+curvePts(f,-2.2,3.2,140,ax.X,ax.Y,-3.4,4.4,FC.blue,2.6);
  s+=fC(ax.X(-1),ax.Y(2),3.6,{f:'#fff',c:FC.red,w:2.2});
  s+=fC(ax.X(1),ax.Y(-2),3.6,{f:'#fff',c:FC.red,w:2.2});
  s+=fT(ax.X(-1)-4,ax.Y(2)-9,'极大',{s:12,c:FC.red});
  s+=fT(ax.X(1)+18,ax.Y(-2)+19,'极小',{s:12,c:FC.red});
  s+=fT(ax.X(3.0),ax.Y(3.6),'y = x³ − 3x',{s:13,c:FC.blue,a:'end'});
  s+=fT(ax.X(2.0),ax.Y(-3.0),'P(2, m) 在曲线外',{s:11,c:FC.sub,a:'end'});
  return svgWrap(ax.w,ax.h,s);
}
/* 对数 + 二次型：最大值出现在驻点（恒成立问题的示意） */
function figLnMax(){
  const ax=mkAx({xmin:0.05,xmax:3.4,ymin:-2.6,ymax:0.7,xt:[1,2,3],yt:[-2,-1,0],xlab:'x',ylab:'y',O:1});
  const f=x=>Math.log(x)-0.5*x*x;
  let s=ax.s+curvePts(f,0.08,3.4,160,ax.X,ax.Y,-2.6,0.7,FC.blue,2.6);
  s+=fC(ax.X(1),ax.Y(-0.5),3.8,{f:'#fff',c:FC.red,w:2.2});
  s+=fL(ax.X(0.05),ax.Y(0),ax.X(3.4),ax.Y(0),{c:FC.gold,w:1.6,d:'5 4'});
  s+=fT(ax.X(3.3),ax.Y(0)-7,'y = 0',{s:12,c:FC.gold,a:'end'});
  s+=fT(ax.X(1)+34,ax.Y(-0.5)-8,'最高点 ≤ 0 ⟹ 恒成立',{s:11,c:FC.red,a:'start'});
  return svgWrap(ax.w,ax.h,s);
}
/* 一条侧棱垂直底面的三棱锥（外接球模型） */
function figPyramid(){
  const w=360,h=230;
  const pr=(x,y,z)=>[110+x*90-y*46,180+x*26+y*30-z*118];
  const A=pr(0,0,0),B=pr(1,0,0),C=pr(0.35,1,0),S=pr(0,0,1);
  let s='';
  s+=fPoly([B,C,A,B],{c:FC.ink,w:2.2});
  s+=fL(A[0]+(B[0]-A[0])*0.55,A[1]+(B[1]-A[1])*0.55,C[0],C[1],{c:FC.gray,w:1.4,d:'4 3'});
  s+=fL(A[0],A[1],S[0],S[1],{c:FC.red,w:2.8});
  s+=fL(S[0],S[1],B[0],B[1],{c:FC.ink,w:2.2});
  s+=fL(S[0],S[1],C[0],C[1],{c:FC.ink,w:2.2});
  s+=fL(S[0],S[1],A[0],A[1],{c:'none',w:0});
  /* 直角标记 */
  s+=fPoly([[A[0],A[1]-26],[A[0]+11,A[1]-26],[A[0]+11,A[1]-13]],{c:FC.red,w:1.6});
  [['S',S,4,-12],['A',A,-12,16],['B',B,16,14],['C',C,0,18]].forEach(v=>{
    s+=fC(v[1][0],v[1][1],3,{f:'#fff',c:FC.ink,w:1.6});
    s+=fT(v[1][0]+v[2],v[1][1]+v[3],v[0],{s:14,b:1});
  });
  s+=fT((A[0]+S[0])/2-24,(A[1]+S[1])/2,'SA = 2',{s:12,c:FC.red,a:'end'});
  s+=fT((A[0]+C[0])/2-30,(A[1]+C[1])/2+8,'AB = AC = 2，∠BAC = 120°',{s:11,c:FC.sub,a:'start'});
  return svgWrap(w,h,s);
}
/* 指数曲线与对数曲线：公切线问题 */
function figExpLog(){
  const ax=mkAx({xmin:-1.5,xmax:4.2,ymin:-2.6,ymax:5.4,xt:[1,2,3,4],yt:[2,4],xlab:'x',ylab:'y',O:1});
  let s=ax.s;
  s+=curvePts(x=>Math.exp(x)-1,-1.5,1.6,120,ax.X,ax.Y,-2.6,5.4,FC.blue,2.6);
  s+=curvePts(x=>Math.log(x),0.08,4.2,140,ax.X,ax.Y,-2.6,5.4,FC.red,2.6);
  s+=fT(ax.X(1.35),ax.Y(2.9)-10,'y=eˣ−1',{s:13,c:FC.blue,a:'start'});
  s+=fT(ax.X(3.2),ax.Y(1.16)+18,'y=ln x',{s:13,c:FC.red,a:'start'});
  s+=fC(ax.X(0),ax.Y(0),3.4,{f:'#fff',c:FC.green,w:2});
  s+=fC(ax.X(1),ax.Y(1),3.4,{f:'#fff',c:FC.green,w:2});
  return svgWrap(ax.w,ax.h,s);
}
/* 椭圆 + 焦点弦 */
function figEllipse(){
  const w=360,h=220;
  const cx=180,cy=110,a=130,b=76,c=Math.sqrt(a*a-b*b);
  let s=fE(cx,cy,a,b,{c:FC.ink,w:2.2});
  s+=fL(20,cy,340,cy,{c:FC.axis,w:1.6,m:'fa'});
  s+=fL(cx,20,cx,200,{c:FC.axis,w:1.6,m:'fa'});
  s+=fT(348,cy+16,'x',{s:13,c:FC.sub,i:1});s+=fT(cx+12,18,'y',{s:13,c:FC.sub,i:1});
  const A=[cx+a*Math.cos(-0.62),cy-b*Math.sin(0.62)],B=[cx+a*Math.cos(2.05),cy+b*Math.sin(2.05)];
  s+=fL(cx+c,cy,A[0],A[1],{c:FC.green,w:2.4});
  s+=fL(cx+c,cy,B[0],B[1],{c:FC.green,w:2.4});
  s+=fC(cx-c,cy,3.6,{f:FC.red,c:FC.red,w:2});
  s+=fC(cx+c,cy,3.6,{f:FC.red,c:FC.red,w:2});
  s+=fT(cx-c,cy-11,'F₁',{s:13,c:FC.red,b:1});
  s+=fT(cx+c+13,cy-11,'F₂',{s:13,c:FC.red,b:1});
  s+=fT(A[0]+4,A[1]-8,'A',{s:14,b:1});
  s+=fT(B[0]+10,B[1]+14,'B',{s:14,b:1});
  s+=fT(cx,cy+b+20,'x²/4 + y²/3 = 1',{s:13,c:FC.sub});
  return svgWrap(w,h,s);
}
/* 解三角形：顶点 + 边 + 中线 */
function figTri(){
  const w=360,h=250;
  const Ax=180,Ay=48,K=30;                     /* 顶点 A 固定，1 单位 = 30 px */
  const b0=1,c0=5;
  const Bx=Ax+c0*K*0.5, By=Ay+c0*K*0.866;
  const Cx=Ax-b0*K*0.5, Cy=Ay+b0*K*0.866;
  let s=fPoly([[Ax,Ay],[Bx,By],[Cx,Cy],[Ax,Ay]],{c:FC.ink,w:2.4,f:'rgba(66,153,225,.10)'})
    .replace('<polyline','<polyline data-a="tri"');
  /* A 处固定的 60° 角标 */
  s+=fPath('M '+(Ax+30)+' '+Ay+' A 30 30 0 0 1 '+fx(Ax+30*Math.cos(Math.PI/3))
    +' '+fx(Ay+30*Math.sin(Math.PI/3)),{c:FC.green,w:1.8});
  s+=fT(Ax+38,Ay+24,'60°',{s:12,c:FC.green});
  /* 中线（底边中点） */
  s+=fL(Ax,Ay,(Bx+Cx)/2,(By+Cy)/2,{c:FC.red,w:2.2,d:1}).replace('<line','<line data-a="mid"');
  s+=fC(Ax,Ay,4.5,{f:FC.gold,c:'#8a5a00',w:2}).replace('<circle','<circle data-a="Pa"');
  s+=fT(Ax,Ay-9,'A',{s:15,b:1}).replace('<text','<text data-a="ta"');
  s+=fC(Bx,By,4.5,{f:FC.blue,c:FC.blue,w:2}).replace('<circle','<circle data-a="Pb"');
  s+=fT(Bx+9,By+16,'B',{s:15,b:1}).replace('<text','<text data-a="tb2"');
  s+=fC(Cx,Cy,4.5,{f:FC.blue,c:FC.blue,w:2}).replace('<circle','<circle data-a="Pc"');
  s+=fT(Cx-21,Cy+16,'C',{s:15,b:1}).replace('<text','<text data-a="tc"');
  s+=fT(180,26,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(180,242,'A = 60° 与 b + c = 6 都固定，只有 b、c 的分配在变',{s:11,c:FC.sub});
  return svgWrap(w,h,s,'tri');
}

/* 递推 → 通项 → 求和：三步流程图 */
function figFlow(ts){
  const w=360,h=200,ys=[52,104,156];
  let s='';
  for(let i=0;i<ts.length;i++){
    s+=fR(46,ys[i]-22,268,44,{f:FC.fill,c:FC.blue,w:2,r:10});
    s+=fT(180,ys[i]+5,ts[i],{s:14,c:FC.ink,b:1});
    if(i<ts.length-1)s+=fL(180,ys[i]+22,180,ys[i+1]-24,{c:FC.gold,w:2.4,m:'fk'});
  }
  return svgWrap(w,h,s);
}
/* 正方体里的三棱锥（外接球同球心） */
function figSolid(){
  const w=360,h=230;
  const P=(x,y,z)=>[150+x*70-y*70,150+x*30+y*30-z*76];
  const V={'A':P(0,0,0),'B':P(1,0,0),'C':P(1,1,0),'D':P(0,1,0),
           'A1':P(0,0,1),'B1':P(1,0,1),'C1':P(1,1,1),'D1':P(0,1,1)};
  let s='';
  const ed=[[ 'A','B'],['B','C'],['C','D'],['D','A'],['A1','B1'],['B1','C1'],['C1','D1'],['D1','A1'],
            ['A','A1'],['B','B1'],['C','C1'],['D','D1']];
  ed.forEach(e=>{s+=fL(V[e[0]][0],V[e[0]][1],V[e[1]][0],V[e[1]][1],{c:FC.ink,w:2});});
  /* 三棱锥 A-B1-C-D1？选 A, B, C, D1 四点 */
  const tet=[['A','B'],['B','C'],['C','D1'],['D1','A'],['A','C']];
  tet.forEach(e=>{s+=fL(V[e[0]][0],V[e[0]][1],V[e[1]][0],V[e[1]][1],{c:FC.red,w:2.6});});
  Object.keys(V).forEach(k=>{s+=fC(V[k][0],V[k][1],3,{f:'#fff',c:FC.ink,w:1.6});});
  const o=V['C'];
  s+=fC(V['A'][0]+(V['C'][0]-V['A'][0])/2,V['A'][1]+(V['C'][1]-V['A'][1])/2+(0),8,{f:'none',c:FC.gold,w:1.8,d:'5 4'});
  s+=fT(V['A1'][0]-22,V['A1'][1]-8,'A₁',{s:13,b:1});
  s+=fT(V['B1'][0]+16,V['B1'][1]-8,'B₁',{s:13,b:1});
  s+=fT(V['C1'][0]+18,V['C1'][1]-4,'C₁',{s:13,b:1});
  s+=fT(V['D1'][0]-20,V['D1'][1]-4,'D₁',{s:13,b:1});
  s+=fT(V['A'][0]-14,V['A'][1]+16,'A',{s:13,b:1,c:FC.red});
  s+=fT(V['B'][0]+16,V['B'][1]+16,'B',{s:13,b:1,c:FC.red});
  s+=fT(V['C'][0]+18,V['C'][1]+14,'C',{s:13,b:1,c:FC.red});
  s+=fT(300,212,'棱长 2',{s:13,c:FC.sub});
  return svgWrap(w,h,s);
}

/* ============ 物理 ============ */
/* 斜面 + 物块 + 底端弹簧 */
function figSlopeSpring(){
  const w=360,h=230;
  const O=[40,190],E=[310,190],T=[40,70];
  let s=fPoly([O,E,T],{c:FC.ink,w:2.6});
  s+=fL(30,190,330,190,{c:FC.axis,w:1.8});
  /* 30° 角弧 */
  s+=fPath('M 90 190 A 50 50 0 0 0 83 163',{c:FC.green,w:1.8});
  s+=fT(104,178,'30°',{s:13,c:FC.green});
  /* 物块沿斜面 */
  const ux=(E[0]-T[0])/Math.hypot(E[0]-T[0],E[1]-T[1]),uy=(E[1]-T[1])/Math.hypot(E[0]-T[0],E[1]-T[1]);
  const px=T[0]+ux*118,py=T[1]+uy*118;
  const nx=-uy,ny=ux*-1;
  s+=fPath('M '+fx(px+nx*14)+' '+fx(py+ny*14)+' L '+fx(px+nx*14+ux*34)+' '+fx(py+ny*14+uy*34)
    +' L '+fx(px+nx*14+ux*34-nx*28)+' '+fx(py+ny*14+uy*34-ny*28)
    +' L '+fx(px+nx*14-nx*28)+' '+fx(py+ny*14-ny*28)+' Z',{f:FC.fill,c:FC.blue,w:2.2});
  s+=fT(px+nx*14+ux*17-nx*14+6,py+ny*14+uy*17-ny*14+2,'m',{s:13,c:FC.ink,b:1});
  /* 弹簧（锯齿） */
  let sp='M '+T[0]+' '+T[1];
  for(let i=1;i<=8;i++){
    const t=i/8*54;
    sp+=' L '+fx(T[0]+ux*t+(i%2?nx*9:-nx*9))+' '+fx(T[1]+uy*t+(i%2?ny*9:-ny*9));
  }
  s+=fPath(sp,{c:FC.red,w:2.2});
  s+=fT(T[0]+46,T[1]+40,'轻弹簧',{s:12,c:FC.red});
  s+=fL(px+nx*14+ux*17,py+ny*14+uy*17,px+nx*14+ux*17+uy*40,py+ny*14+uy*17-ux*40,{c:FC.green,w:1.8,d:1,m:'fg'});
  s+=fT(px+30,py-46,'v',{s:13,c:FC.green,i:1});
  s+=fL(300,70,300,190,{c:FC.gray,w:1.6,d:'6 4'});
  s+=fT(300,62,'h',{s:13,c:FC.sub,i:1});
  return svgWrap(w,h,s);
}
/* 板块模型 */
function figBlock(){
  const w=360,h=210;
  let s=fR(40,140,280,26,{f:FC.fill,c:FC.ink,w:2.2,r:3});
  s+=fR(96,104,74,36,{f:'#dbeafe',c:FC.blue,w:2.2,r:3});
  s+=fL(24,166,336,166,{c:FC.axis,w:2});
  s+=fT(180,196,'地面光滑',{s:12,c:FC.sub});
  s+=fL(133,90,193,90,{c:FC.green,w:2.4,m:'fg'});
  s+=fT(163,80,'v₀',{s:13,c:FC.green,i:1});
  s+=fT(133,126,'m',{s:13,b:1});
  s+=fT(272,158,'M',{s:13,b:1});
  s+=fL(40,120,40,166,{c:FC.gray,w:1.4,d:'4 3'});
  s+=fL(320,120,320,166,{c:FC.gray,w:1.4,d:'4 3'});
  s+=fT(180,60,'μ = 0.2 · 木板足够长',{s:13,c:FC.sub});
  return svgWrap(w,h,s);
}
/* 竖直圆轨道 */
function figLoop(){
  const w=300,h=250,cx=150,cy=130,r=88;
  let s=fC(cx,cy,r,{c:FC.ink,w:2.6});
  s+=fC(cx,cy,4,{f:FC.sub,c:FC.sub});
  s+=fC(cx,cy-r,5,{f:FC.red,c:FC.red,w:2});
  s+=fC(cx,cy+r,5,{f:FC.blue,c:FC.blue,w:2});
  s+=fT(cx,cy-r-12,'最高点',{s:12,c:FC.red});
  s+=fT(cx,cy+r+22,'最低点',{s:12,c:FC.blue});
  s+=fT(cx+r+16,cy+4,'R',{s:13,c:FC.sub,i:1});
  /* 一段弧上放个小球 */
  const ang=3.5;
  s+=fC(cx+r*Math.cos(ang),cy+r*Math.sin(ang),7,{f:FC.gold,c:'#8a5a00',w:2});
  s+=fT(cx+r*Math.cos(ang)-22,cy+r*Math.sin(ang)-10,'P',{s:13,b:1});
  s+=fT(cx,cy+r+40,'光滑圆轨道 · 半径 R',{s:12,c:FC.sub});
  return svgWrap(w,h,s);
}
/* 导轨 + 磁场 + 导体棒 */
function figRail(){
  const w=360,h=220;
  let s=fR(30,40,300,140,{c:FC.ink,w:2.4,r:2});
  s+=fR(150,40,64,140,{f:'#f2f6fa',c:'none',w:0});
  s+=fR(150,40,64,140,{c:FC.grid,w:1.4,d:'3 3'});
  /* 磁场叉 */
  for(let x=166;x<=206;x+=20)for(let y=58;y<=170;y+=24){
    s+=fL(x-5,y-5,x+5,y+5,{c:FC.green,w:1.6})+fL(x-5,y+5,x+5,y-5,{c:FC.green,w:1.6});
  }
  s+=fR(158,92,48,10,{f:FC.blue,c:FC.blue,w:2,r:2});
  s+=fT(182,80,'ab',{s:13,b:1,c:FC.blue});
  s+=fL(182,102,182,124,{c:FC.red,w:2.4,m:'fr'});
  s+=fT(196,120,'v',{s:13,c:FC.red,i:1});
  s+=fR(280,58,30,26,{f:'none',c:FC.ink,w:2.2,r:2});
  s+=fT(295,80,'R',{s:13,b:1});
  s+=fT(80,64,'B',{s:13,c:FC.green,b:1,i:1});
  s+=fT(182,196,'间距 L · 磁感应强度 B',{s:12,c:FC.sub});
  return svgWrap(w,h,s);
}
/* 质谱仪：加速电场 + 磁场半圆 */
function figMassSpec(){
  const w=360,h=220;
  let s=fR(40,60,8,100,{f:FC.ink,c:FC.ink,w:1.6});
  s+=fR(76,60,8,100,{f:FC.ink,c:FC.ink,w:1.6});
  s+=fT(62,50,'U',{s:13,c:FC.sub,i:1});
  s+=fL(84,110,118,110,{c:FC.blue,w:2,m:'fb'});
  s+=fT(100,100,'v',{s:12,c:FC.blue,i:1});
  /* 磁场区域 */
  s+=fR(120,30,210,160,{f:'#f4f8fb',c:FC.grid,w:1.4,d:'4 4'});
  for(let x=140;x<=310;x+=22)for(let y=48;y<=176;y+=24){
    s+=fL(x-5,y-5,x+5,y+5,{c:FC.green,w:1.4})+fL(x-5,y+5,x+5,y-5,{c:FC.green,w:1.4});
  }
  s+=fPath('M 130 110 A 78 78 0 0 1 286 110',{c:FC.red,w:2.6});
  s+=fC(130,110,4,{f:FC.red,c:FC.red});
  s+=fC(286,110,4,{f:FC.red,c:FC.red});
  s+=fT(208,152,'d',{s:13,c:FC.red,i:1});
  s+=fT(190,44,'B',{s:13,c:FC.green,b:1,i:1});
  return svgWrap(w,h,s);
}
/* 卫星变轨：低圆轨道 → 椭圆转移 → 高圆轨道 */
function figOrbit(){
  const w=330,h=240,cx=165,cy=120;
  let s=fC(cx,cy,14,{f:FC.gold,c:'#a8760a',w:2});
  s+=fC(cx,cy,44,{c:FC.blue,w:2.2});
  s+=fE(cx,cy,116,72,{c:FC.green,w:2.2,d:'7 5'});
  s+=fC(cx,cy,116,{c:FC.gray,w:1.6,d:'3 4'});
  const a=cx+44,b=cy;
  s+=fC(a,b,5,{f:FC.blue,c:FC.blue,w:1.6});
  s+=fT(a,b-12,'1',{s:12,c:FC.blue,b:1});
  const p=cx+116*Math.cos(-0.55),q=cy+72*Math.sin(-0.55);
  s+=fC(p,q,5,{f:FC.green,c:FC.green,w:1.6});
  s+=fT(p+2,q-12,'2',{s:12,c:FC.green,b:1});
  s+=fT(cx,cy+34,'地球',{s:12,c:'#8a5a00'});
  s+=fT(238,206,'r₁ : r₂ = 1 : 4',{s:12,c:FC.sub});
  return svgWrap(w,h,s);
}

/* ============ 化学 ============ */
/* 浓度—时间图（三段式的图） */
function figEquil(){
  const ax=mkAx({xmin:0,xmax:10,ymin:0,ymax:1.05,xt:[2,4,6,8,10],yt:[0.5,1.0],
    xlab:'t / min',ylab:'c / mol·L⁻¹',O:0,grid:false,gx:5,gy:2,h:210});
  let s=ax.s;
  const A=t=>1-0.6*(1-Math.exp(-0.55*t));
  const B=t=>0.3*(1-Math.exp(-0.55*t));
  s+=fPath('M '+ax.X(0)+' '+ax.Y(1),{c:FC.blue,w:2.6}).replace('<path','<path data-a="cA"');
  s+=fPath('M '+ax.X(0)+' '+ax.Y(0),{c:FC.red,w:2.6}).replace('<path','<path data-a="cB"');
  s+=fL(ax.X(0),ax.Y(1),ax.X(10),ax.Y(1),{c:FC.gray,w:1.4,d:'5 4'});
  s+=fT(ax.X(0.7),ax.Y(1)-7,'1.0',{s:12,c:FC.gray,a:'start'});
  s+=fL(ax.X(0),ax.Y(0.4),ax.X(10),ax.Y(0.4),{c:FC.gray,w:1.4,d:'5 4'});
  s+=fT(ax.X(0.7),ax.Y(0.4)-7,'0.4',{s:12,c:FC.gray,a:'start'});
  s+=fT(ax.X(7.6),ax.Y(A(7.6))-12,'A',{s:13,c:FC.blue,b:1});
  s+=fT(ax.X(7.6),ax.Y(B(7.6))+22,'B',{s:13,c:FC.red,b:1});
  s+=fL(ax.X(0),ax.Y(0),ax.X(0),ax.Y(1.05),{c:FC.gold,w:1.6,d:'4 3'})
     .replace('<line','<line data-a="scan"');
  s+=fT(190,26,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(ax.w,ax.h,s,'eq');
}
/* 酸碱中和滴定曲线（pH 突跃） */
function figTitr(){
  const ax=mkAx({xmin:0,xmax:26,ymin:0,ymax:14,xt:[5,10,15,20,25],yt:[4,8,12,14],
    xlab:'V(NaOH) / mL',ylab:'pH',O:0,grid:false,gx:5,gy:7,h:220});
  let s=ax.s+curvePts(titrPH,0.1,25.9,400,ax.X,ax.Y,0,14,FC.blue,2.6);
  s+=fC(ax.X(20),ax.Y(7),4,{f:FC.red,c:FC.red,w:2});
  s+=fL(ax.X(20),ax.Y(7),ax.X(20),ax.Y(0),{c:FC.red,w:1.6,d:'5 4'});
  s+=fT(ax.X(20),ax.Y(0.6),'20.00',{s:12,c:FC.red});
  s+=fT(ax.X(20)+52,ax.Y(11),'突跃范围',{s:12,c:FC.green});
  s+=fT(ax.X(3),ax.Y(1.6),'起点 pH = 1',{s:12,c:FC.sub,a:'start'});
  /* 滴定管 */
  s+=fR(20,16,26,54,{f:'#eef4fa',c:FC.ink,w:2,r:3});
  s+=fR(20,16,26,54,{f:'none',c:'none',w:0});
  s+=fL(33,70,33,84,{c:FC.ink,w:2});
  s+=fL(16,16,50,16,{c:FC.ink,w:2.4});
  s+=fR(21,17,24,40,{f:FC.blue,c:'none',w:0}).replace('<rect','<rect data-a="buret"');
  s+=fC(ax.X(0.1),ax.Y(titrPH(0.1)),5,{f:FC.gold,c:'#8a5a00',w:2})
     .replace('<circle','<circle data-a="dot"');
  s+=fL(ax.X(0.1),ax.Y(0),ax.X(0.1),ax.Y(14),{c:FC.gold,w:1.6,d:'4 4'})
     .replace('<line','<line data-a="scan"');
  s+=fT(190,30,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(ax.w,ax.h,s,'titr');
}
/* 电解池装置 */
function figElectro(){
  const w=360,h=230;
  let s=fR(60,50,240,150,{c:FC.ink,w:2.4,r:4});
  s+=fR(66,96,228,98,{f:'#e3eef7',c:'none',w:0,r:2});
  s+=fR(100,40,14,120,{f:FC.gray,c:'#5b6b7c',w:2,r:2});
  s+=fR(246,40,14,120,{f:FC.gold,c:'#a8760a',w:2,r:2});
  s+=fT(107,28,'阴极',{s:13,b:1});
  s+=fT(253,28,'阳极',{s:13,b:1});
  s+=fR(150,60,60,26,{f:'none',c:FC.ink,w:2,r:3});
  s+=fL(150,73,142,73,{c:FC.ink,w:2});
  s+=fL(210,73,218,73,{c:FC.ink,w:2});
  s+=fL(142,66,142,80,{c:FC.ink,w:2.6});
  s+=fL(218,66,218,80,{c:FC.ink,w:2.6});
  s+=fT(180,52,'直流电源',{s:11,c:FC.sub});
  s+=fL(114,46,114,16,{c:FC.blue,w:2,m:'fb'});
  s+=fL(246,16,246,46,{c:FC.blue,w:2,m:'fb'});
  s+=fL(114,16,246,16,{c:FC.blue,w:2});
  s+=fT(180,10,'e⁻',{s:12,c:FC.blue,i:1});
  s+=fT(180,110,'CuSO₄ 溶液',{s:13,c:FC.sub});
  s+=fT(107,180,'C',{s:13,b:1});
  s+=fT(253,180,'Cu',{s:13,b:1});
  /* 阴极析出层：随电解进行变厚 */
  s+=fR(100,90,14,0,{f:FC.gold,c:'#a8760a',w:1.6}).replace('<rect','<rect data-a="dep"');
  /* 三个电子：沿「阳极 → 上导线 → 阴极」跑 */
  s+=fC(253,40,4,{f:FC.blue,c:FC.blue,w:1.4}).replace('<circle','<circle data-a="e1"');
  s+=fC(253,40,4,{f:FC.blue,c:FC.blue,w:1.4}).replace('<circle','<circle data-a="e2"');
  s+=fC(253,40,4,{f:FC.blue,c:FC.blue,w:1.4}).replace('<circle','<circle data-a="e3"');
  s+=fT(180,26,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  s+=fT(180,222,'电解 0.2 mol e⁻',{s:12,c:FC.sub});
  return svgWrap(w,h,s,'elec');
}
/* 盖斯定律能量图 */
function figEnergy(){
  const w=340,h=210;
  const y=(v)=>190-v*40;
  let s=fL(40,190,300,190,{c:FC.axis,w:2});
  s+=fL(40,190,40,30,{c:FC.axis,w:2,m:'fa'});
  s+=fT(308,190,'反应过程',{s:12,c:FC.sub,a:'end'});
  s+=fT(30,26,'E',{s:13,c:FC.sub,a:'end',i:1});
  const lv=[['A',1.0],['B',2.4],['C',0.4]];
  lv.forEach(p=>{
    s+=fL(70,y(p[1]),250,y(p[1]),{c:FC.blue,w:2.6});
    s+=fT(58,y(p[1])+4,p[0],{s:14,b:1,a:'end'});
  });
  s+=fL(160,y(1.0),160,y(2.4),{c:FC.red,w:1.8,m:'fr'});
  s+=fT(168,(y(1.0)+y(2.4))/2+4,'ΔH₁',{s:13,c:FC.red,a:'start',i:1});
  s+=fL(220,y(2.4),220,y(0.4),{c:FC.red,w:1.8,m:'fr'});
  s+=fT(228,(y(2.4)+y(0.4))/2+4,'ΔH₂',{s:13,c:FC.red,a:'start',i:1});
  s+=fL(100,y(1.0),100,y(0.4),{c:FC.green,w:1.8,m:'fg'});
  s+=fT(92,(y(1.0)+y(0.4))/2+4,'ΔH₃',{s:13,c:FC.green,a:'end',i:1});
  s+=fT(190,206,'ΔH₃ = ΔH₁ + ΔH₂',{s:13,c:FC.sub});
  return svgWrap(w,h,s);
}
/* 有机结构：苯环 + 支链 + 官能团标注 */
function figOrg(){
  const w=360,h=200;
  const cx=110,cy=100,r=48;
  let s='';
  const pt=i=>[cx+r*Math.cos(i*Math.PI/3-Math.PI/6),cy+r*Math.sin(i*Math.PI/3-Math.PI/6)];
  const P=[];for(let i=0;i<6;i++)P.push(pt(i));
  s+=fPoly([P[0],P[1],P[2],P[3],P[4],P[5],P[0]],{c:FC.ink,w:2.2});
  [0,2,4].forEach(i=>{
    const a=P[i],b=P[(i+1)%6];
    const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
    const nx=(b[0]-a[0]),ny=(b[1]-a[1]);
    const L=Math.hypot(nx,ny);
    const ux=-ny/L*7,uy=nx/L*7;
    s+=fL(mx+ux,my+uy,mx+ux+nx/L*0+nx*0.001,my+uy,{c:FC.ink,w:1.6});
    s+=fL(mx-ux*0.2,my-uy*0.2,mx+ux*0.2,my+uy*0.2,{c:FC.ink,w:1.6});
  });
  s+=fL(cx+r*Math.cos(Math.PI/6),cy+r*Math.sin(Math.PI/6),cx+r+30,cy+r*Math.sin(Math.PI/6),{c:FC.ink,w:2.2});
  s+=fT(cx+r+46,cy+r*Math.sin(Math.PI/6)+5,'?',{s:16,c:FC.ink,b:1});
  s+=fL(cx-r*Math.cos(Math.PI/6),cy-r*Math.sin(Math.PI/6),cx-r-26,cy-r*Math.sin(Math.PI/6),{c:FC.ink,w:2.2});
  s+=fT(cx-r-44,cy-r*Math.sin(Math.PI/6)+5,'?',{s:16,c:FC.ink,b:1});
  s+=fT(cx,cy+2,'苯环',{s:12,c:FC.sub});
  s+=fT(250,56,'分子式 C₇H₈O',{s:13,c:FC.sub,a:'start'});
  s+=fT(250,82,'Ω = 4 ⟹ 一个苯环',{s:12,c:FC.sub,a:'start'});
  s+=fT(250,106,'遇 FeCl₃ 显紫色',{s:12,c:FC.red,a:'start'});
  s+=fT(250,130,'苯环一氯代物 2 种',{s:12,c:FC.ink,a:'start',b:1});
  return svgWrap(w,h,s);
}
/* 沉淀溶解：离子浓度与 pH 的双曲线 */
function figKsp(){
  const ax=mkAx({xmin:0,xmax:14,ymin:0,ymax:10,xt:[2,4,6,8,10,12],yt:[2,4,6,8],
    xlab:'pH',ylab:'−lg c',O:0,grid:false,gx:7,gy:5,h:210});
  let s=ax.s;
  s+=curvePts(x=>Math.min(10,8-0.62*x),0,14,120,ax.X,ax.Y,0,10,FC.blue,2.6);
  s+=curvePts(x=>Math.min(10,1.2+0.55*x),0,14,120,ax.X,ax.Y,0,10,FC.red,2.6);
  s+=fT(ax.X(2.6),ax.Y(6.4),'M(OH)₂',{s:13,c:FC.blue,b:1});
  s+=fT(ax.X(11),ax.Y(7.4),'N(OH)₃',{s:13,c:FC.red,b:1});
  s+=fL(ax.X(4.5),ax.Y(0),ax.X(4.5),ax.Y(10),{c:FC.green,w:1.8,d:'6 4'});
  s+=fT(ax.X(4.5)+30,ax.Y(0.8),'pH = 4.5 开始沉淀',{s:12,c:FC.green,a:'start'});
  return svgWrap(ax.w,ax.h,s);
}

/* ============ 生物 ============ */
/* 遗传系谱图 */
function figPed(){
  const w=360,h=220;
  const male=(x,y,fill)=>fR(x-11,y-11,22,22,{f:fill?FC.ink:'#fff',c:FC.ink,w:2,r:1});
  const female=(x,y,fill)=>fC(x,y,12,{f:fill?FC.ink:'#fff',c:FC.ink,w:2});
  let s='';
  s+=fT(20,26,'Ⅰ',{s:13,c:FC.sub,a:'start'});
  s+=fT(20,116,'Ⅱ',{s:13,c:FC.sub,a:'start'});
  s+=fT(20,196,'Ⅲ',{s:13,c:FC.sub,a:'start'});
  /* I 代 */
  s+=male(90,30)+female(170,30);
  s+=fL(101,30,159,30,{c:FC.ink,w:2});
  s+=fL(125,30,125,52,{c:FC.ink,w:2});
  /* II 代 */
  s+=male(70,90,1)+female(130,90)+male(200,90)+female(255,90);
  s+=fL(125,52,125,76,{c:FC.ink,w:2});
  s+=fL(70,76,255,76,{c:FC.ink,w:2});
  [70,130,200,255].forEach(x=>{s+=fL(x,76,x,90,{c:FC.ink,w:2});});
  s+=fL(81,90,119,90,{c:FC.ink,w:2});
  s+=fL(211,90,244,90,{c:FC.ink,w:2});
  /* III 代 */
  s+=fL(100,102,100,116,{c:FC.ink,w:2});
  s+=fL(70,116,140,116,{c:FC.ink,w:2});
  [70,100,140].forEach(x=>{s+=fL(x,116,x,132,{c:FC.ink,w:2});});
  s+=male(70,144)+female(100,144)+male(140,144);
  s+=fL(227,102,227,116,{c:FC.ink,w:2});
  s+=fL(200,116,255,116,{c:FC.ink,w:2});
  [200,227,255].forEach(x=>{s+=fL(x,116,x,132,{c:FC.ink,w:2});});
  s+=female(200,144,1)+male(227,144,1)+female(255,144);
  s+=fT(140,196,'■ ● 患病个体',{s:12,c:FC.sub,a:'start'});
  s+=fT(255,196,'？',{s:13,c:FC.red,b:1});
  s+=fC(255,144,18,{f:'none',c:FC.red,w:2,d:'4 3'});
  return svgWrap(w,h,s);
}
/* 两对相对性状杂交图解 */
function figCross(){
  const w=360,h=200;
  let s='';
  s+=fT(60,40,'P   AaBb × AaBb',{s:14,b:1,a:'start'});
  s+=fL(60,52,300,52,{c:FC.gray,w:1.4,d:'5 4'});
  /* 4x4 表 */
  const xs=[70,120,170,220],ys=[74,110,146,182];
  for(let i=0;i<4;i++)s+=fL(xs[i],70,xs[i],186,{c:FC.grid,w:1.4});
  for(let j=0;j<4;j++)s+=fL(66,ys[j],226,ys[j],{c:FC.grid,w:1.4});
  s+=fT(94,66,'AB',{s:12,b:1});s+=fT(144,66,'Ab',{s:12,b:1});
  s+=fT(194,66,'aB',{s:12,b:1});s+=fT(244,66,'ab',{s:12,b:1});
  s+=fT(60,92,'AB',{s:12,b:1,a:'start'});s+=fT(60,128,'Ab',{s:12,b:1,a:'start'});
  s+=fT(60,164,'aB',{s:12,b:1,a:'start'});s+=fT(60,200-2+0,'ab',{s:12,b:1,a:'start'});
  s+=fR(240,96,110,80,{f:FC.fill,c:FC.blue,w:2,r:8});
  s+=fT(295,124,'9 : 3 : 3 : 1',{s:13,b:1,c:FC.blue});
  s+=fT(295,146,'实际 9 : 7 ？',{s:13,b:1,c:FC.red});
  return svgWrap(w,h,s);
}
/* 光合 / 呼吸 曲线 */
function figPhoto(){
  const ax=mkAx({xmin:0,xmax:10,ymin:-6,ymax:14,xt:[2,4,6,8,10],yt:[-4,4,8,12],
    xlab:'光照强度 / klx',ylab:'速率',O:0,grid:false,gx:5,gy:5,h:220});
  const gross=x=>14*(1-Math.exp(-0.42*x));
  let s=ax.s;
  s+=curvePts(gross,0,10,120,ax.X,ax.Y,-6,14,FC.red,2.6);
  s+=curvePts(x=>gross(x)-4,0,10,120,ax.X,ax.Y,-6,14,FC.blue,2.6);
  s+=fL(ax.X(0),ax.Y(-4),ax.X(10),ax.Y(-4),{c:FC.green,w:1.8,d:'6 4'});
  s+=fT(ax.X(9.6),ax.Y(-4)-7,'呼吸速率 4',{s:12,c:FC.green,a:'end'});
  const xl=(function(){for(let x=0;x<10;x+=0.01)if(gross(x)>=4)return x;return 1;})();
  s+=fC(ax.X(xl),ax.Y(0),4,{f:FC.gold,c:FC.gold,w:2});
  s+=fT(ax.X(xl)+34,ax.Y(0)+16,'光补偿点',{s:12,c:FC.gold,a:'start'});
  s+=fT(ax.X(8.4),ax.Y(gross(8.4))-11,'总光合',{s:13,c:FC.red,b:1});
  s+=fT(ax.X(8.4),ax.Y(gross(8.4)-4)+20,'净光合',{s:13,c:FC.blue,b:1});
  s+=fL(ax.X(0),ax.Y(-6),ax.X(0),ax.Y(14),{c:FC.gold,w:1.6,d:'4 3'})
     .replace('<line','<line data-a="scan"');
  s+=fC(ax.X(0),ax.Y(-4),5,{f:FC.gold,c:'#8a5a00',w:2})
     .replace('<circle','<circle data-a="dot"');
  s+=fT(190,26,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(ax.w,ax.h,s,'photo');
}
/* 分裂过程中 DNA / 染色体 数量变化 */
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
/* 食物网 */
function figFood(){
  const w=360,h=220;
  const N={grass:[60,180],bug:[140,150],rabbit:[80,120],frog:[210,120],
    snake:[280,150],bird:[170,80],hawk:[250,50]};
  const E=[['grass','bug'],['grass','rabbit'],['bug','frog'],['bug','bird'],
    ['rabbit','snake'],['frog','snake'],['bird','hawk'],['snake','hawk'],['rabbit','hawk']];
  let s='';
  E.forEach(e=>{const a=N[e[0]],b=N[e[1]];
    s+=fL(a[0],a[1]-8,b[0],b[1]+10,{c:FC.green,w:2,m:'fg'});});
  const nm={grass:'草',bug:'昆虫',rabbit:'兔',frog:'蛙',snake:'蛇',bird:'鸟',hawk:'鹰'};
  Object.keys(N).forEach(k=>{
    s+=fC(N[k][0],N[k][1],k==='grass'?6:5,{f:k==='grass'?FC.green:'#fff',c:k==='grass'?FC.green:FC.ink,w:2});
    s+=fT(N[k][0],N[k][1]+(k==='hawk'?-14:22),nm[k],{s:13,b:1});
  });
  s+=fT(300,206,'能量传递效率 10%~20%',{s:11,c:FC.sub,a:'end'});
  return svgWrap(w,h,s);
}
/* 神经纤维动作电位 */
function figNerve(){
  const ax=mkAx({xmin:0,xmax:10,ymin:-90,ymax:45,xt:[2,4,6,8,10],yt:[-70,0,35],
    xlab:'t / ms',ylab:'电位 / mV',O:0,grid:false,gx:5,gy:4,h:210});
  let s=ax.s;
  s+=curvePts(nerveV,0,10,300,ax.X,ax.Y,-90,45,FC.blue,2.6);
  s+=fL(ax.X(0),ax.Y(-70),ax.X(10),ax.Y(-70),{c:FC.gray,w:1.4,d:'5 4'});
  s+=fT(ax.X(0.4),ax.Y(-70)-7,'−70 静息',{s:11,c:FC.gray,a:'start'});
  s+=fL(ax.X(0),ax.Y(0),ax.X(10),ax.Y(0),{c:FC.gray,w:1.4,d:'5 4'});
  s+=fT(ax.X(9.6),ax.Y(0)-7,'0',{s:11,c:FC.gray,a:'end'});
  s+=fT(ax.X(1.6),ax.Y(30),'Na⁺ 内流',{s:12,c:FC.red,b:1});
  s+=fT(ax.X(5.4),ax.Y(-58),'K⁺ 外流',{s:12,c:FC.green,b:1});
  s+=fT(ax.X(8),ax.Y(-84),'恢复',{s:11,c:FC.sub});
  s+=fC(ax.X(0),ax.Y(-70),5,{f:FC.gold,c:'#8a5a00',w:2})
     .replace('<circle','<circle data-a="dot"');
  s+=fL(ax.X(0),ax.Y(-90),ax.X(0),ax.Y(45),{c:FC.gold,w:1.6,d:'4 3'})
     .replace('<line','<line data-a="scan"');
  s+=fT(190,26,'',{s:12,c:FC.gold,b:1}).replace('<text','<text data-a="hud"');
  return svgWrap(ax.w,ax.h,s,'nerve');
}

