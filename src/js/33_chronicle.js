/* =========================================================
   科学编年史 · 一条河，四个学科
   —— 86 篇卷宗按「发生的时间」排在 15 座纪元岛上，
      数学、物理、化学、生物交错出现，谁先发生谁在前
   ========================================================= */
const EPIC_W=1900,EPIC_H=2720;

/* 科目判定：卷宗编号前缀决定它属于哪一科
   m* = 数学；pa/pb/pc = 物理；pd/pe/pf = 化学；pg/ph/pi = 生物 */
function subjectOf(sid){
  if(!sid)return 'math';
  if(sid[0]==='m')return 'math';
  const c=sid[1];
  if(c==='a'||c==='b'||c==='c')return 'phys';
  if(c==='d'||c==='e'||c==='f')return 'chem';
  return 'bio';
}


/* ---------------- 15 座纪元岛 ----------------
   3 列 × 5 行，河道蛇形串联：row0 左→右，row1 右→左，……
   ids 按该岛内的时间先后排列 */
const EPOCHS=[
 {id:'e1', name:'刻痕与纸草',   sub:'前 20000 – 前 1650',emoji:'🦴',
  rect:[130,90,340,340],ground:['#cba96b','#8a6b3c'],edge:'#5c4423',prop:'bone',
  ids:['ma1','ma2','ma3','ma4','ma5','ma6']},
 {id:'e2', name:'希腊的追问',   sub:'前 600 – 前 240',  emoji:'🏛️',
  rect:[780,90,340,340],ground:['#e9e2cf','#b5a98e'],edge:'#7d7358',prop:'pillar',
  ids:['pa3','mb1','mb2','mb3','mb4','mb5','mb6']},
 {id:'e3', name:'东方的算法',   sub:'公元 100 – 1261',  emoji:'📜',
  rect:[1430,90,340,340],ground:['#a3d8c5','#4e9a8b'],edge:'#2f6b60',prop:'scroll',
  ids:['mc1','mc2','mc3','mc4','mc5','mc6']},
 {id:'e4', name:'智慧宫',       sub:'公元 820 – 1300',  emoji:'🕌',
  rect:[1430,630,340,340],ground:['#74b6d6','#2d6f97'],edge:'#1b4a68',prop:'star',
  ids:['md1','md4','md5','md2','md3','md6']},
 {id:'e5', name:'觉醒与突破',   sub:'公元 1535 – 1623', emoji:'⛵',
  rect:[780,630,340,340],ground:['#dba47c','#a15f3c'],edge:'#6f3b22',prop:'sail',
  ids:['me1','me2','me5','me3','pa1','me4','me6']},
 {id:'e6', name:'天空的立法者', sub:'公元 1543 – 1687', emoji:'🪐',
  rect:[130,630,340,340],ground:['#a3bdea','#4a68a8'],edge:'#2c4278',prop:'lens',
  ids:['pb1','pa2','mf1','mf2','pb2']},
 {id:'e7', name:'理性之光',     sub:'公元 1654 – 1696', emoji:'🔭',
  rect:[130,1170,340,340],ground:['#f0d98a','#b89a34'],edge:'#7d6417',prop:'note',
  ids:['mf3','mf4','pg1','mf7','mf5','mf6']},
 {id:'e8', name:'燃烧之谜',     sub:'公元 1703 – 1789', emoji:'🔥',
  rect:[780,1170,340,340],ground:['#f2a06a','#c25e2f'],edge:'#8a3b17',prop:'flame',
  ids:['pd1','mg1','mg2','pd2','pc1','pd3']},
 {id:'e9', name:'分析的世纪',   sub:'公元 1736 – 1809', emoji:'🎼',
  rect:[1430,1170,340,340],ground:['#c6abe9','#7d5ab0'],edge:'#4f3678',prop:'gear',
  ids:['mg3','mg4','mg5','pb3','pe1','mg6']},
 {id:'e10',name:'严密的时代',   sub:'公元 1821 – 1858', emoji:'🧊',
  rect:[1430,1710,340,340],ground:['#bcd9e9','#5f93b0'],edge:'#31607a',prop:'crystal',
  ids:['mh1','mh2','mh3','pc2','pg2','pg3']},
 {id:'e11',name:'生命的长河',   sub:'公元 1831 – 1886', emoji:'🌿',
  rect:[780,1710,340,340],ground:['#a8e6a1','#4fa347'],edge:'#2e6b28',prop:'cellm',
  ids:['pi1','mh4','ph1','pe2','pe3','mh5']},
 {id:'e12',name:'严密与现代',   sub:'公元 1865 – 1901', emoji:'⚛️',
  rect:[130,1710,340,340],ground:['#9fe6d4','#3ea391'],edge:'#1f6a5c',prop:'orbit',
  ids:['pc3','mh6','pf1','mh7','mi1']},
 {id:'e13',name:'两次危机',     sub:'公元 1901 – 1936', emoji:'⚡',
  rect:[130,2250,340,340],ground:['#f2a6cd','#c25e9b'],edge:'#8b3a6d',prop:'bolt',
  ids:['ph2','pf2','mi2','mi3','mi4']},
 {id:'e14',name:'黄金时代',     sub:'公元 1931 – 1994', emoji:'🧬',
  rect:[780,2250,340,340],ground:['#9fe0ef','#3d9fb8'],edge:'#1f6780',prop:'helix',
  ids:['pf3','ph3','mi5','pi2','mi6','mi7']},
 {id:'e15',name:'今天与未来',   sub:'公元 2000 – 今天', emoji:'🌐',
  rect:[1430,2250,340,340],ground:['#b6efe0','#3f9a8a'],edge:'#1f5a52',prop:'circuit',
  ids:['mi8','mi9','pi3']}
];

/* ---------------- 河道：蛇形串联 15 座岛 ---------------- */
const RIVER_RAW=[
 {rect:[40, 210,1820,100],label:'前 20000 → 前 1650'},
 {rect:[1830, 210,40,540], label:'→ 前 600'},
 {rect:[40, 750,1820,100],label:'前 300 → 公元 1623'},
 {rect:[30, 750,40,540],   label:'→ 公元 820'},
 {rect:[40,1290,1820,100],label:'1654 → 1809'},
 {rect:[1830,1290,40,540], label:'→ 1821'},
 {rect:[40,1830,1820,100],label:'1821 → 1901'},
 {rect:[30,1830,40,540],   label:'→ 1901'},
 {rect:[40,2370,1820,100],label:'1901 → 今天'}
];
const RIVERS=RIVER_RAW.map((r,i)=>Object.assign(
  {id:'rv'+i,kind:'river',name:'科学长河',sub:'四科同源，顺流而下'},r));
/* 岛排在河前面：站在岛上时，当前区域优先算「纪元」而不是「河」 */
const EPIC_REGIONS=EPOCHS.concat(RIVERS);

/* 把 n 篇卷宗均匀摆在一座岛上（≤6 篇单圈，更多则内 3 外 n−3） */
function placeStops(cx,cy,n,rad){
  const out=[];
  if(n<=6){
    for(let i=0;i<n;i++){const a=-Math.PI/2+i*2*Math.PI/n;
      out.push([cx+Math.cos(a)*rad,cy+Math.sin(a)*rad]);}
  }else{
    const inner=3,outer=n-inner;
    for(let i=0;i<inner;i++){const a=-Math.PI/2+i*2*Math.PI/inner;
      out.push([cx+Math.cos(a)*rad*.6,cy+Math.sin(a)*rad*.6]);}
    for(let i=0;i<outer;i++){const a=-Math.PI/2+(i+.5)*2*Math.PI/outer;
      out.push([cx+Math.cos(a)*rad*1.3,cy+Math.sin(a)*rad*1.3]);}
  }
  return out.map(p=>[Math.round(p[0]),Math.round(p[1])]);
}

const EPIC_SPOTS=[];
EPOCHS.forEach(ep=>{
  const cx=ep.rect[0]+ep.rect[2]/2, cy=ep.rect[1]+ep.rect[3]/2;
  const pts=placeStops(cx,cy,ep.ids.length,ep.ids.length>6?88:92);
  ep.ids.forEach((sid,i)=>{
    const it=EPIC_LIB[sid];
    EPIC_SPOTS.push({t:'era',sid:sid,era:ep.id,x:pts[i][0],y:pts[i][1],
      e:it?it.e:'📜',name:it?it.title:'卷宗',
      subj:subjectOf(sid)});
  });
});

/* 散落在长河与岛上的时间星尘 */
const EPIC_DUST=[];
(function(){
  let k=0;
  const add=(x,y)=>{EPIC_DUST.push({id:'d'+(k++),x:Math.round(x),y:Math.round(y),
    got:false,bob:Math.random()*6});};
  RIVERS.forEach(r=>{
    const [x,y,w,h]=r.rect,n=Math.max(2,Math.round((w>h?w:h)/260));
    if(w>h){for(let i=0;i<n;i++)add(x+w*(i+.5)/n,y+h/2);}
    else   {for(let i=0;i<n;i++)add(x+w/2,y+h*(i+.5)/n);}
  });
  EPOCHS.forEach(ep=>{
    const [x,y,w,h]=ep.rect;
    add(x+w*.16,y+h*.84);add(x+w*.84,y+h*.16);
  });
})();

