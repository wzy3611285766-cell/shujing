/* =========================================================
   🧪 实验装置图（4.0.0）
   ---------------------------------------------------------
   化学「操作是否规范」和物理「读仪器」这两类题，光靠文字描述，
   学生想象不出装置长什么样，等于没考 —— 而这两类恰恰是高考实验题
   的主力。所以补一套手绘 SVG 图，复用上面那套绘图原语，白底深灰线，
   与原有题图同一风格；全程离线、无损缩放、单张 1~2 KB。

   ⚠️ 画这类图必须先推原理、再落笔，不能凭印象：
     · 量筒三条视线——仰视时眼低、视线朝上，与筒壁的交点落在液面
       【下方】，所以读到偏小的刻度（实际取的液体偏多）。俯视反过来。
       （注意滴定管相反：它的刻度自上而下增大，所以滴定管是仰视偏大。）
     · 加热液体 = 管口向上约 45°；加热固体 = 管口略向下倾斜。
       两者互斥，不能画在同一支试管上。
     · 蒸馏冷凝水必须【下进上出】——既让外管充满水，又与蒸气流向成逆流。
   ========================================================= */
/* 玻璃仪器统一配色 */
const GC={water:'#cfe6ff',water2:'#b9d9f7',wood:'#e8c88f',wood2:'#d9b878',
  powder:'#f2d9a8',lamp:'#eef3f8',cap:'#dfe7ef',flame:'#ffd76a'};
/* 眼睛符号：读数类题目用，标出视线是从哪个高度发出来的 */
function gEye(x,y,c){
  return fPath('M'+(x-13)+','+y+' Q'+x+','+(y-9)+' '+(x+13)+','+y
    +' Q'+x+','+(y+9)+' '+(x-13)+','+y+' Z',{f:'#fff',c:c,w:1.7})
    +fC(x,y,3.6,{f:c,c:c,w:1});
}

/* ① 量筒读数：三条视线都射向凹液面最低点 */
function figCylRead(){
  const w=360,h=252,LX=178,RX=238,TOP=44,BOT=190,MX=208,MY=104;
  let s='';
  s+=fPath('M'+LX+','+(MY-8)+' Q'+MX+','+MY+' '+RX+','+(MY-8)
    +' L'+RX+','+(BOT-8)+' Q'+RX+','+BOT+' '+MX+','+BOT
    +' Q'+LX+','+BOT+' '+LX+','+(BOT-8)+' Z',{f:GC.water,c:'none',w:0});
  s+=fPath('M'+LX+','+(MY-8)+' Q'+MX+','+MY+' '+RX+','+(MY-8),{c:FC.blue,w:2.2});
  s+=fPath('M'+LX+','+TOP+' L'+LX+','+(BOT-8)+' Q'+LX+','+BOT+' '+MX+','+BOT
    +' Q'+RX+','+BOT+' '+RX+','+(BOT-8)+' L'+RX+','+TOP,{f:'none',c:FC.ink,w:2.4});
  s+=fPath('M'+(LX-7)+','+(TOP-4)+' L'+LX+','+TOP,{c:FC.ink,w:2.4});
  s+=fL(RX,TOP,LX-7,TOP-4,{c:FC.ink,w:2.4});
  s+=fPath('M'+(LX-8)+','+BOT+' L'+(RX+8)+','+BOT+' L'+(RX+14)+','+(BOT+10)
    +' L'+(LX-14)+','+(BOT+10)+' Z',{f:'#eef3f8',c:FC.ink,w:2.2});
  for(let i=0;i<21;i++){const y=68+i*6,big=(i%5===0);
    s+=fL(LX,y,LX-(big?15:9),y,{c:FC.ink,w:big?2:1.3});}
  [{ey:190,c:FC.red},{ey:104,c:FC.green},{ey:18,c:FC.blue}].forEach(r=>{
    const x0=72,y0=r.ey+(MY-r.ey)*(x0-60)/(MX-60);
    s+=fL(x0,y0,MX,MY,{c:r.c,w:2.1});
    s+=gEye(60,r.ey,r.c);
    const yc=r.ey+(MY-r.ey)*(LX-60)/(MX-60);
    s+=fC(LX,yc,4.6,{f:r.c,c:'#fff',w:1.6});
    s+=fL(LX-16,yc,LX+10,yc,{c:r.c,w:1.2,d:'3 3'});
  });
  s+=fT(44,194,'仰视',{s:12,c:FC.red,b:1,a:'end'});
  s+=fT(44,108,'平视',{s:12,c:FC.green,b:1,a:'end'});
  s+=fT(44,22,'俯视',{s:12,c:FC.blue,b:1,a:'end'});
  s+=fT(248,108,'凹液面最低处',{s:11,c:FC.sub,a:'start'});
  s+=fT(50,234,'仰视 → 偏小',{s:12,c:FC.red,b:1,a:'start'});
  s+=fT(172,234,'平视 → 准确',{s:12,c:FC.green,b:1,a:'start'});
  s+=fT(276,234,'俯视 → 偏大',{s:12,c:FC.blue,b:1,a:'start'});
  return svgWrap(w,h,s);
}

/* ② 加热试管里的液体：管口向上 45°、夹在距管口 1/3 处、外焰加热 */
function figHeatLiq(){
  const w=360,h=232;let s='';
  s+=fPath('M138,198 L182,198 L174,162 L146,162 Z',{f:GC.lamp,c:FC.ink,w:2.2});
  s+=fR(150,150,20,12,{f:GC.cap,c:FC.ink,w:1.9,r:3});
  s+=fPath('M160,150 Q150,128 160,106 Q170,128 160,150 Z',{f:GC.flame,c:FC.gold,w:1.7});
  s+=fT(128,192,'酒精灯',{s:11,c:FC.sub,a:'end'});
  s+='<g transform="translate(197,102) rotate(48)">';
  s+=fPath('M-11,-80 L-11,68 Q-11,80 0,80 Q11,80 11,68 L11,-80 Z',{f:'#fff',c:FC.ink,w:2.4});
  s+=fPath('M-9,24 L9,24 L9,68 Q9,78 0,78 Q-9,78 -9,68 Z',{f:GC.water,c:'none',w:0});
  s+=fL(-11,-80,11,-80,{c:FC.ink,w:2.4});
  s+=fR(-15,-34,30,19,{f:GC.wood,c:FC.ink,w:2,r:6});
  s+=fR(-66,-29,52,10,{f:GC.wood2,c:FC.ink,w:1.8,r:3});
  s+='</g>';
  s+=fT(112,154,'外焰',{s:12,c:FC.red,b:1,a:'end'});
  s+=fL(116,150,138,140,{c:FC.red,w:1.4,d:'3 3'});
  s+=fT(206,46,'夹在距管口 1/3 处',{s:11.5,c:FC.red,b:1,a:'start'});
  s+=fL(206,52,182,68,{c:FC.red,w:1.3,d:'3 3'});
  s+=fT(180,226,'管口向上约 45°，且不能对着人',{s:12,c:FC.sub,b:1});
  return svgWrap(w,h,s);
}

/* ③ 加热试管里的固体：管口略向下倾斜，防冷凝水倒流 */
function figHeatSolid(){
  const w=360,h=218;let s='';
  s+='<g transform="translate(196,96) rotate(105)">';
  s+=fPath('M-11,-80 L-11,68 Q-11,80 0,80 Q11,80 11,68 L11,-80 Z',{f:'#fff',c:FC.ink,w:2.4});
  s+=fR(1,-52,8,120,{f:GC.powder,c:'none',w:0,r:4});
  s+=fL(-11,-80,11,-80,{c:FC.ink,w:2.4});
  s+='</g>';
  s+=fPath('M192,149 Q182,127 192,107 Q202,127 192,149 Z',{f:GC.flame,c:FC.gold,w:1.7});
  s+=fR(182,149,20,12,{f:GC.cap,c:FC.ink,w:1.9,r:3});
  s+=fPath('M170,197 L214,197 L206,161 L178,161 Z',{f:GC.lamp,c:FC.ink,w:2.2});
  s+=fT(180,212,'管口略向下倾斜 —— 防止冷凝水倒流炸裂试管',{s:11.5,c:FC.red,b:1});
  return svgWrap(w,h,s);
}

/* ④ 过滤装置：一贴二低三靠，漏斗下端管口紧靠烧杯内壁 */
function figFilter(){
  const w=360,h=234;let s='';
  s+=fR(24,200,92,11,{f:GC.lamp,c:FC.ink,w:2.2,r:3});
  s+=fL(60,200,60,54,{c:FC.ink,w:3.4});
  s+=fL(60,100,116,100,{c:FC.ink,w:3});
  s+=fE(142,100,26,6,{f:'none',c:FC.ink,w:2.6});
  s+=fPath('M140,158 L140,194 Q140,202 148,202 L198,202 Q206,202 206,194 L206,158',
    {f:'#fff',c:FC.ink,w:2.4});
  s+=fPath('M141,176 L205,176 L205,193 Q205,201 197,201 L149,201 Q141,201 141,193 Z',
    {f:GC.water,c:'none',w:0});
  s+=fPath('M110,76 L174,76 L142,120',{f:'#fff',c:FC.ink,w:2.4});
  s+=fPath('M110,76 L142,120',{f:'#fff',c:FC.ink,w:2.4});
  s+=fL(110,76,174,76,{c:FC.ink,w:2.4});
  s+=fL(142,120,142,182,{c:FC.ink,w:2.4});
  s+=fPath('M116,80 L168,80 L142,118 Z',{f:'#f7fafc',c:FC.sub,w:1.6});
  s+=fL(96,34,136,102,{c:FC.blue,w:3.2});
  s+=fT(86,28,'玻璃棒引流',{s:11.5,c:FC.blue,b:1,a:'start'});
  s+=fC(134,104,9,{f:'none',c:FC.gold,w:1.6,d:'3 3'});
  s+=fT(156,30,'一贴：滤纸紧贴漏斗内壁',{s:10.5,c:FC.sub,a:'start'});
  s+=fT(156,48,'二低：滤纸低于漏斗口，液面低于滤纸',{s:10.5,c:FC.sub,a:'start'});
  s+=fT(214,168,'漏斗下端管口',{s:11,c:FC.red,b:1,a:'start'});
  s+=fT(214,184,'紧靠烧杯内壁',{s:11,c:FC.red,b:1,a:'start'});
  s+=fL(210,172,148,174,{c:FC.red,w:1.3,d:'3 3'});
  s+=fT(20,226,'三靠：烧杯口靠玻璃棒 · 玻璃棒靠三层滤纸 · 漏斗口靠烧杯内壁',
    {s:10,c:FC.sub,a:'start'});
  return svgWrap(w,h,s);
}

/* ⑤ 蒸馏：温度计水银球与支管口齐平；冷凝水 下进上出（逆流） */
function figDistill(){
  const w=360,h=240;let s='';
  s+=fC(66,166,36,{f:'#fff',c:FC.ink,w:2.4});
  s+=fL(54,133,54,84,{c:FC.ink,w:2.4});
  s+=fL(78,133,78,84,{c:FC.ink,w:2.4});
  s+=fL(54,84,78,84,{c:FC.ink,w:2.4});
  s+=fPath('M40,180 A34,30 0 0 0 92,180 Z',{f:GC.water,c:'none',w:0});
  s+=fL(78,110,146,100,{c:FC.ink,w:2.4});
  s+=fL(78,120,146,110,{c:FC.ink,w:2.4});
  s+=fL(146,100,146,110,{c:FC.ink,w:2.4});
  s+=fL(66,44,66,110,{c:FC.ink,w:2.6});
  s+=fC(66,115,5.4,{f:FC.red,c:FC.ink,w:1.6});
  s+=fT(88,38,'温度计水银球与支管口齐平',{s:10.5,c:FC.red,b:1,a:'start'});
  s+=fL(90,43,74,109,{c:FC.red,w:1.3,d:'3 3'});
  s+=fR(146,86,104,38,{f:'#fff',c:FC.ink,w:2.4,r:8});
  s+=fL(146,105,276,105,{c:FC.ink,w:2.4});
  s+=fL(250,124,250,150,{c:FC.blue,w:2.4});
  s+=fL(146,86,146,58,{c:FC.blue,w:2.4});
  s+=fT(258,118,'进水（下口）',{s:10.5,c:FC.blue,b:1,a:'start'});
  s+=fT(140,52,'出水（上口）',{s:10.5,c:FC.blue,b:1,a:'end'});
  s+=fL(276,105,292,105,{c:FC.ink,w:2.4});
  s+=fL(292,105,292,146,{c:FC.ink,w:2.4});
  s+=fL(278,146,278,136,{c:FC.ink,w:2.4});
  s+=fL(306,146,306,136,{c:FC.ink,w:2.4});
  s+=fL(274,136,310,136,{c:FC.ink,w:2.4});
  s+=fPath('M278,146 L306,146 L322,196 L262,196 Z',{f:'#fff',c:FC.ink,w:2.4});
  s+=fPath('M268,184 L316,184 L321,195 L263,195 Z',{f:GC.water,c:'none',w:0});
  s+=fT(292,214,'锥形瓶',{s:10.5,c:FC.sub});
  s+=fT(180,234,'冷凝水必须下进上出：既充满管壁，又与蒸气形成逆流',{s:11,c:FC.sub,b:1});
  return svgWrap(w,h,s);
}

/* ⑥ 尾气吸收：倒置漏斗防倒吸（左正确 / 右错误，对照着看） */
function figAntiSuck(){
  const w=360,h=216;let s='';
  s+=fPath('M36,96 L36,180 L142,180 L142,96',{f:'#fff',c:FC.ink,w:2.4});
  s+=fPath('M37,128 L141,128 L141,179 L37,179 Z',{f:GC.water,c:'none',w:0});
  s+=fPath('M58,128 L96,96 L124,128',{f:'#fff',c:FC.ink,w:2.4});
  s+=fL(96,96,96,58,{c:FC.ink,w:2.4});
  s+=fL(88,58,104,58,{c:FC.ink,w:2.4});
  s+=fC(91,128,8,{f:'none',c:FC.green,w:1.8});
  s+=fT(89,46,'倒置漏斗',{s:11,c:FC.green,b:1});
  s+=fT(89,202,'✓ 边缘刚好接触液面',{s:10.5,c:FC.green,b:1});
  s+=fPath('M212,96 L212,180 L318,180 L318,96',{f:'#fff',c:FC.ink,w:2.4});
  s+=fPath('M213,142 L317,142 L317,179 L213,179 Z',{f:GC.water,c:'none',w:0});
  s+=fL(252,58,252,178,{c:FC.ink,w:2.4});
  s+=fL(266,58,266,178,{c:FC.ink,w:2.4});
  s+=fR(254,114,10,64,{f:GC.water2,c:'none',w:0});
  s+=fL(288,140,288,104,{c:FC.red,w:2.2});
  s+=fPath('M282,112 L288,102 L294,112',{c:FC.red,w:2.2});
  s+=fT(259,46,'✗ 导管直插液面下',{s:11,c:FC.red,b:1});
  s+=fT(265,202,'会倒吸，溶液冲入发生装置',{s:10.5,c:FC.red,b:1});
  return svgWrap(w,h,s);
}

/* ⑦ 游标卡尺（10 分度，精度 0.1 mm）—— 刻度位置由 X(mm) 精确算出，
   主尺 25 mm 与游标第 4 条线严格重合，读数 21.4 mm 可以直接验算 */
function figVernier(){
  const w=360,h=180,X=mm=>30+(mm-20)*15;let s='';
  s+=fR(24,44,314,50,{f:'#f7fafc',c:FC.ink,w:2.2,r:3});
  for(let mm=20;mm<=40;mm++){
    const big=(mm%5===0);
    s+=fL(X(mm),48,X(mm),big?78:66,{c:FC.ink,w:big?2:1.2});
    if(big)s+=fT(X(mm),90,String(mm),{s:9,c:FC.ink,b:1});
  }
  s+=fT(28,38,'主尺 / mm',{s:11,c:FC.sub,a:'start'});
  s+=fR(42,102,166,44,{f:GC.lamp,c:FC.ink,w:2.2,r:3});
  for(let k=0;k<=10;k++){
    const x=51+13.5*k;
    s+=fL(x,102,x,k%5===0?124:116,{c:FC.ink,w:k%5===0?2:1.2});
    s+=fT(x,140,String(k),{s:8.5,c:FC.ink});
  }
  s+=fT(44,164,'游标尺（10 分度）',{s:11,c:FC.sub,a:'start'});
  s+=fT(240,164,'10 格 = 9 mm',{s:10.5,c:FC.sub,a:'start'});
  return svgWrap(w,h,s);
}

/* ⑧ 打点计时器纸带：点距越来越大 ⟹ 匀加速 */
function figTape(){
  const w=360,h=180;let s='';
  s+=fR(20,44,320,40,{f:'#f7fafc',c:FC.ink,w:2.2,r:4});
  const xs=[40,74,116,166,224],lab=['A','B','C','D','E'];
  xs.forEach(x=>{s+=fC(x,64,3.4,{f:FC.ink,c:FC.ink,w:1});});
  xs.forEach((x,i)=>{s+=fT(x,104,lab[i],{s:13,c:FC.red,b:1});});
  xs.forEach(x=>{s+=fL(x,80,x,108,{c:FC.grid,w:1.2,d:'3 3'});});
  ['s₁','s₂','s₃','s₄'].forEach((nm,i)=>{
    const x1=xs[i],x2=xs[i+1],y=132;
    s+=fL(x1,y,x2,y,{c:FC.blue,w:1.8});
    s+=fL(x1,y-6,x1,y+6,{c:FC.blue,w:1.8});
    s+=fL(x2,y-6,x2,y+6,{c:FC.blue,w:1.8});
    s+=fT((x1+x2)/2,y-9,nm,{s:11.5,c:FC.blue,b:1});
  });
  s+=fT(20,34,'打点计时器纸带（点距越来越大 ⟹ 匀加速）',{s:11,c:FC.sub,a:'start'});
  s+=fT(20,168,'相邻计数点时间间隔 T = 0.1 s（每两点间还有 4 个点未标出）',
    {s:10.5,c:FC.sub,a:'start'});
  return svgWrap(w,h,s);
}

/* ⑨ 螺旋测微器读数（可动刻度按展开画法给出 50 格）
   基准线正对第 20 格，固定刻度露出 6 整格 + 半格 → 6.5 + 0.200 = 6.700 mm */
function figMicrometer(){
  const w=360,h=256;let s='';
  s+=fR(26,100,170,58,{f:'#fff',c:FC.ink,w:2.2,r:3});
  [4,5,6].forEach(mm=>{
    const x=150+(mm-6)*30;
    s+=fL(x,110,x,129,{c:FC.ink,w:2});
    s+=fT(x,104,String(mm),{s:11,c:FC.ink,b:1});
  });
  [4.5,5.5,6.5].forEach(mm=>{
    const x=150+(mm-6)*30;
    s+=fL(x,129,x,148,{c:FC.ink,w:2});
  });
  s+=fT(28,92,'固定刻度 / mm',{s:11,c:FC.sub,a:'start'});
  s+=fR(171,56,79,178,{f:GC.lamp,c:FC.ink,w:2.2,r:6});
  s+=fL(30,129,190,129,{c:FC.ink,w:2.2});
  for(let k=0;k<50;k++){
    const y=129+(k-20)*3.4694,big=(k%5===0);
    s+=fL(173,y,173+(big?14:8),y,{c:FC.ink,w:big?1.9:1.1});
    if(big)s+=fT(196,y+3,String(k),{s:9,c:FC.ink,a:'start'});
  }
  s+=fT(256,62,'可动刻度',{s:11,c:FC.sub,a:'start'});
  s+=fT(256,78,'（展开）',{s:10,c:FC.sub,a:'start'});
  s+=fT(180,248,'读数 = 固定刻度 + 可动刻度 × 0.01 mm',{s:11.5,c:FC.sub,b:1});
  return svgWrap(w,h,s);
}

/* ⑩ 伏安法测电阻：电流表外接 / 电压表并联在 Rₓ 两端 */
function figCircuitVA(){
  const w=360,h=212,L=44,R=320,T=70,B=176;let s='';
  s+=fL(L,T,92,T,{c:FC.ink,w:2.2});
  s+=fC(110,T,18,{f:'#fff',c:FC.ink,w:2.2});
  s+=fT(110,T+6,'A',{s:15,c:FC.ink,b:1,i:1});
  s+=fL(128,T,206,T,{c:FC.ink,w:2.2});
  s+=fR(206,T-11,48,22,{f:'#fff',c:FC.ink,w:2.2,r:2});
  s+=fT(230,T+5,'Rₓ',{s:13,c:FC.ink,b:1,i:1});
  s+=fL(254,T,R,T,{c:FC.ink,w:2.2});
  s+=fL(R,T,R,B,{c:FC.ink,w:2.2});
  s+=fL(R,B,L,B,{c:FC.ink,w:2.2});
  s+=fL(L,B,L,T,{c:FC.ink,w:2.2});
  /* 电压表并联在 Rₓ 两端 */
  s+=fL(206,T,206,T-46,{c:FC.ink,w:2.2});
  s+=fL(206,T-46,214,T-46,{c:FC.ink,w:2.2});
  s+=fC(230,T-46,16,{f:'#fff',c:FC.ink,w:2.2});
  s+=fT(230,T-40,'V',{s:14,c:FC.ink,b:1,i:1});
  s+=fL(246,T-46,254,T-46,{c:FC.ink,w:2.2});
  s+=fL(254,T-46,254,T,{c:FC.ink,w:2.2});
  /* 电源（两节） */
  s+=fL(80,B,B,B,{c:'none',w:0});
  s+=fL(L,B,86,B,{c:FC.ink,w:2.2});
  [90,106].forEach(x=>{s+=fL(x,B-13,x,B+13,{c:FC.ink,w:2.4});});
  [98,114].forEach(x=>{s+=fL(x,B-7,x,B+7,{c:FC.ink,w:4.2});});
  s+=fL(118,B,150,B,{c:FC.ink,w:2.2});
  /* 开关 */
  s+=fC(152,B,2.6,{f:FC.ink,c:FC.ink,w:1});
  s+=fL(152,B,180,B-14,{c:FC.ink,w:2.2});
  s+=fC(182,B,2.6,{f:FC.ink,c:FC.ink,w:1});
  s+=fL(184,B,236,B,{c:FC.ink,w:2.2});
  /* 滑动变阻器 */
  s+=fR(238,B-10,50,20,{f:'#fff',c:FC.ink,w:2.2,r:2});
  s+=fL(263,B-30,263,B-12,{c:FC.ink,w:2.2});
  s+=fPath('M257,'+(B-18)+' L263,'+(B-10)+' L269,'+(B-18)+'',{c:FC.ink,w:2.2});
  s+=fL(288,B,R,B,{c:FC.ink,w:2.2});
  s+=fT(106,B+30,'电源',{s:11,c:FC.sub});
  s+=fT(168,B+30,'开关',{s:11,c:FC.sub});
  s+=fT(263,B+30,'滑动变阻器',{s:11,c:FC.sub});
  s+=fT(110,T-62,'电流表',{s:11,c:FC.sub});
  s+=fT(276,T-46,'电压表',{s:11,c:FC.sub,a:'start'});
  return svgWrap(w,h,s);
}

/* ⑪ 单摆：摆长 = 摆线长 + 小球半径；只有小角度才近似简谐 */
function figPendulum(){
  const w=360,h=240,px=196,py=44,L=138,th=12*Math.PI/180;let s='';
  s+=fR(64,32,192,9,{f:GC.lamp,c:FC.ink,w:2.2,r:3});
  s+=fL(72,41,72,206,{c:FC.ink,w:3.2});
  s+=fR(36,206,72,10,{f:GC.lamp,c:FC.ink,w:2.2,r:3});
  s+=fL(px,py,px,py+L+34,{c:FC.gray,w:1.6,d:'6 5'});
  const bx=px-L*Math.sin(th),by=py+L*Math.cos(th);
  s+=fL(px,py,bx,by,{c:FC.ink,w:2});
  s+=fC(bx,by,9,{f:'#dfe7ef',c:FC.ink,w:2.2});
  s+=fC(px,py+L,9,{f:'none',c:FC.gray,w:1.6,d:'4 3'});
  s+=fPath('M'+px+','+(py+62)+' A62,62 0 0 0 '+(px-62*Math.sin(th))+','+(py+62*Math.cos(th)),
    {c:FC.red,w:2});
  s+=fT(px-30,py+76,'θ',{s:13,c:FC.red,b:1,i:1});
  s+=fT(px+16,py+L/2,'摆长 L = 摆线长 + 小球半径',{s:11,c:FC.blue,b:1,a:'start'});
  s+=fL(px+12,py+L/2-4,px-4,py+L/2+6,{c:FC.blue,w:1.2,d:'3 3'});
  s+=fT(px,236,'只有 θ 很小（约 < 5°）时单摆才是简谐运动',{s:11.5,c:FC.sub,b:1});
  return svgWrap(w,h,s);
}

/* ⑫ 验证牛顿第二定律：小车 + 打点计时器 + 细线过定滑轮挂砝码 */
function figNewton2(){
  const w=360,h=200;let s='';
  s+=fR(28,124,252,10,{f:GC.lamp,c:FC.ink,w:2.2,r:2});
  s+=fR(44,100,44,24,{f:'#f7fafc',c:FC.ink,w:2.2,r:3});
  s+=fL(88,110,120,110,{c:FC.ink,w:2});
  s+=fR(120,96,58,18,{f:'#fff',c:FC.ink,w:2.2,r:4});
  s+=fC(134,118,6,{f:GC.cap,c:FC.ink,w:1.8});
  s+=fC(166,118,6,{f:GC.cap,c:FC.ink,w:1.8});
  s+=fL(178,106,268,106,{c:FC.ink,w:1.8});
  s+=fC(276,106,9,{f:GC.lamp,c:FC.ink,w:2.2});
  s+=fC(276,106,2.4,{f:FC.ink,c:FC.ink,w:1});
  s+=fL(276,115,276,148,{c:FC.ink,w:1.8});
  s+=fR(262,148,28,26,{f:GC.lamp,c:FC.ink,w:2.2,r:4});
  s+=fT(66,92,'打点计时器',{s:10.5,c:FC.sub});
  s+=fT(149,88,'小车 M',{s:10.5,c:FC.sub});
  s+=fT(223,96,'细线',{s:10.5,c:FC.sub});
  s+=fT(276,86,'定滑轮',{s:10.5,c:FC.sub});
  s+=fT(276,190,'砝码和盘 m',{s:10.5,c:FC.sub});
  s+=fT(20,188,'必须满足 m ≪ M，并且事先平衡摩擦力',{s:11.5,c:FC.red,b:1,a:'start'});
  return svgWrap(w,h,s);
}

/* ⑬ 测电源电动势与内阻：电压表并在电源两端，电流表串联 */
function figEMF(){
  const w=360,h=232,L=56,R=316,T=74,B=170;let s='';
  s+=fL(L,B,L,T,{c:FC.ink,w:2.2});
  s+=fL(L,T,122,T,{c:FC.ink,w:2.2});
  s+=fC(140,T,18,{f:'#fff',c:FC.ink,w:2.2});
  s+=fT(140,T+6,'A',{s:15,c:FC.ink,b:1,i:1});
  s+=fL(158,T,236,T,{c:FC.ink,w:2.2});
  s+=fR(236,T-10,56,20,{f:'#fff',c:FC.ink,w:2.2,r:2});
  s+=fT(264,T+5,'R',{s:13,c:FC.ink,b:1,i:1});
  s+=fL(292,T,R,T,{c:FC.ink,w:2.2});
  s+=fL(R,T,R,B,{c:FC.ink,w:2.2});
  s+=fL(R,B,236,B,{c:FC.ink,w:2.2});
  /* 开关 */
  s+=fC(234,B,2.6,{f:FC.ink,c:FC.ink,w:1});
  s+=fL(234,B,210,B-14,{c:FC.ink,w:2.2});
  s+=fC(208,B,2.6,{f:FC.ink,c:FC.ink,w:1});
  s+=fL(206,B,134,B,{c:FC.ink,w:2.2});
  /* 电源（两节） */
  [90,106].forEach(x=>{s+=fL(x,B-13,x,B+13,{c:FC.ink,w:2.4});});
  [98,114].forEach(x=>{s+=fL(x,B-7,x,B+7,{c:FC.ink,w:4.2});});
  s+=fL(118,B,86,B,{c:FC.ink,w:2.2});
  s+=fL(84,B,L,B,{c:FC.ink,w:2.2});
  /* 电压表并联在电源两端 */
  s+=fL(84,B,84,B+40,{c:FC.ink,w:2.2});
  s+=fL(84,B+40,94,B+40,{c:FC.ink,w:2.2});
  s+=fC(110,B+40,16,{f:'#fff',c:FC.ink,w:2.2});
  s+=fT(110,B+46,'V',{s:14,c:FC.ink,b:1,i:1});
  s+=fL(126,B+40,134,B+40,{c:FC.ink,w:2.2});
  s+=fL(134,B+40,134,B,{c:FC.ink,w:2.2});
  s+=fT(108,B-22,'电源 E、r',{s:11,c:FC.sub});
  s+=fT(140,T-24,'电流表',{s:11,c:FC.sub});
  s+=fT(264,T-20,'滑动变阻器',{s:11,c:FC.sub});
  s+=fT(221,B+30,'开关',{s:11,c:FC.sub});
  s+=fT(172,B+44,'电压表',{s:11,c:FC.sub,a:'start'});
  return svgWrap(w,h,s);
}

