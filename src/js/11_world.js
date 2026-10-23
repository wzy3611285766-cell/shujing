/* =========================================================
   数境 · 四国并立
   —— 数学 / 物理 / 化学 / 生物，各为一国，各有一张独立地图
   —— 国与国之间靠「传送塔」（⛩️，即七天神像）往来
   ========================================================= */

/* ---------------- 全局世界量（引擎会直接读写这些） ----------------
   地图尺寸随国度切换而改变，这里的初值只是数学国的默认 */
let W=2400,H=1900;
let WORLD_TITLE='数境 · 四国远征';
let WORLD_SUB='走遍数理群岛、力理亚、嬗变利亚、生衍利亚';
const SAVE_KEY='genji_v1';
const SAVE_KEY_EPIC='genji_epic_v1';

/* =========================================================
   跨世界支援券 —— 三个模式之间唯一的资金通道
   ------------------------------------------------------------
   三个世界的进度与货币是各自独立的，直接打通会毁掉两边的经济：
   烽火跑一趟高考场赚几千哈夫币，闯关得刷几个月才赚得到。
   所以这里不搞兑换，只做「支援」——
     史诗读史攒下的 ⏳ 时间星尘 → 买成一次性券 → 带给另外两个世界用
   券只能自己用、不能卖、不能换回钱，也换不回星尘。
   它自己单独存一份，不挂在任何一个模式的存档里：
   清掉某个模式的进度，手上已经买好的券不受影响。
   ========================================================= */
const SAVE_KEY_AID='genji_aid_v1';
const AID_ITEMS=[
 {id:'ticket', e:'🎟️', n:'行动经费抵用券', price:30, to:'blaze',
  d:'烽火：部署时自动抵掉一次行动经费（常规 15 / 中档 60 / 高考 180）'},
 /* id 还是 'key'（老存档里买过的券不丢），东西已经换成房卡了 ——
    4.0.12 把「保险箱钥匙卡」并进了房卡，券也跟着换成发一张蓝卡 */
 {id:'key',    e:'🔑', n:'房卡补给',      price:45, to:'blaze',
  d:'烽火：仓库直接 +1 张蓝色房卡，不看指挥部等级也不用花哈夫币'},
 {id:'scan',   e:'📟', n:'开局情报',      price:25, to:'blaze',
  d:'烽火：部署时自动生效，开局报出保险箱房与全部上锁房间的方位'},
 {id:'lamp',   e:'💡', n:'启示灯',        price:20, to:'adv',
  d:'闯关：+1 盏启示灯，卡住时给一层思路（商行里要卖 15 结晶）'},
 {id:'compass',e:'🧭', n:'卷宗罗盘',      price:10, to:'epic',
  d:'史诗：指出当前时代最近的一篇未读卷宗，并指路 20 秒'}
];
const AID_OF={};AID_ITEMS.forEach(a=>{AID_OF[a.id]=a;});
/* 券的库存：键随 AID_ITEMS 走，加新券不用改这里 */
const AID_STATE={};
AID_ITEMS.forEach(a=>{AID_STATE[a.id]=0;});
function aidCount(id){return Math.max(0,AID_STATE[id]|0);}
function aidTotal(){return AID_ITEMS.reduce((s,a)=>s+aidCount(a.id),0);}
function saveAid(){
  try{localStorage.setItem(SAVE_KEY_AID,JSON.stringify(AID_STATE));return true;}
  catch(e){return false;}
}
function loadAid(){
  let s=null;
  try{s=localStorage.getItem(SAVE_KEY_AID);}catch(e){}
  if(s){try{const o=JSON.parse(s);if(o&&typeof o==='object')Object.assign(AID_STATE,o);}catch(e){}}
  /* 自愈：老存档没有的券补 0，被手改成负数或小数的也拉回来 */
  AID_ITEMS.forEach(a=>{
    const v=Math.floor(Number(AID_STATE[a.id]));
    AID_STATE[a.id]=(isFinite(v)&&v>0)?v:0;
  });
}
/* 用掉一张。返回 false 表示手上没有 */
function aidUse(id){
  if(aidCount(id)<=0)return false;
  AID_STATE[id]--;saveAid();return true;
}
loadAid();

/* ---------------- 四大国度 ----------------
   color 用于图鉴、传送面板、区域名着色；emoji 是国家徽记 */
const NATIONS=[
 {id:'math',name:'数理群岛',sub:'数学之国 · 理性元素',emoji:'📐',color:'#9db4ff',
  W:2400,H:1900,desc:'一切从这里开始：符号、结构与推演'},
 {id:'phys',name:'力理亚',  sub:'物理之国 · 雷元素',  emoji:'⚡',color:'#ffd76a',
  W:1680,H:1620,desc:'万物运行的规矩都刻在这里'},
 {id:'chem',name:'嬗变利亚',sub:'化学之国 · 火元素',  emoji:'🔥',color:'#ffb072',
  W:1680,H:1620,desc:'一切变化都要付出能量的代价'},
 {id:'bio', name:'生衍利亚',sub:'生物之国 · 草元素',  emoji:'🌿',color:'#84e3a6',
  W:1680,H:1620,desc:'活着本身就是最精密的化学'}
];
const NATION_OF={};
NATIONS.forEach(n=>{NATION_OF[n.id]=n;});

/* ---------------- 题库容器 ----------------
   14 个域共用一个 BANK：区域 id 全局唯一，genQuestion 直接按 id 取。
   173.5 补了三域 —— 热学 / 光学与近代 / 化学实验 ——
   它们**不在地图上开区域**（开区域要配套石碑、精灵、守护者、地表装饰、
   传送桥，代价远超收益），但题库、练枪专题、错题本、学习报告全部照常接入：
   练枪选「物理」就能刷到热学与光学，选「化学」能刷到实验。 */
const BANK={};
['func','tri','seq','geo','prob',
 'mech','neng','dian','atom','rate','org','cell','gene','eco',
 'therm','optic','lab','plab']
 .forEach(k=>{BANK[k]={1:[],2:[],3:[]};});

/* ---------------- 正在构建的国度 ----------------
   各国的 add* 助手都往这里塞，构建完再挂到 NATIONS 上 */
let CUR_BUILD=null;
function natBegin(id){
  CUR_BUILD={id:id,regions:[],bridges:[],spirits:[],spots:[],loose:[],totems:[],looseK:0};
  return CUR_BUILD;
}
function natEnd(){
  const n=NATION_OF[CUR_BUILD.id];
  n.regions=CUR_BUILD.regions;n.bridges=CUR_BUILD.bridges;
  n.spirits=CUR_BUILD.spirits;n.spots=CUR_BUILD.spots;
  n.loose=CUR_BUILD.loose;n.totems=CUR_BUILD.totems;
  return CUR_BUILD;
}

/* ---------------- 点位助手 ---------------- */
function addStele(x,y,r){CUR_BUILD.spots.push({t:'stele',x,y,r,e:'🗿',name:'智慧石碑'});}
function addSpirit(x,y,id){
  const s=CUR_BUILD.spirits.find(v=>v.id===id);
  CUR_BUILD.spots.push({t:'spirit',x,y,sid:id,r:s?s.r:'',e:s?s.e:'✨',name:s?s.n:'精灵'});
}
function addGuard(x,y,r,n){CUR_BUILD.spots.push({t:'guard',x,y,r,e:'🛡️',name:n});}
function addHermit(x,y,tip){CUR_BUILD.spots.push({t:'hermit',x,y,e:'🧙',name:'引路人',tip});}
/* 传送塔：每域一座，走过去自动点亮，之后可在四国之间任意往返 */
function addTotem(x,y,tid,name,rid){
  CUR_BUILD.spots.push({t:'totem',x,y,r:rid||'',tid:tid,e:'⛩️',name:name||'传送塔'});
  CUR_BUILD.totems.push({id:tid,x:x,y:y,name:name||'传送塔',rid:rid||''});
}

/* =========================================================
   📐 数学之国 · 数理群岛
   ========================================================= */
natBegin('math');

// 数学国：五岛（沿用经典布局）
const MATH_REGIONS=[
 {id:'func',nation:'math',name:'函数之境',sub:'函数 · 指对幂 · 导数',rect:[140,820,600,600],base:1,
  ground:['#96d9a8','#5fb57b'],edge:'#3a8055',prop:['📈','🌳','🧭','🌿','📐'],emoji:'📈'},
 {id:'tri',nation:'math',name:'三角海湾',sub:'三角函数 · 解三角形',rect:[900,560,600,580],base:2,
  ground:['#7fc7e8','#4b9dc6'],edge:'#2c719a',prop:['🌊','⛵','🐚','🌴','⚓'],emoji:'🌊'},
 {id:'seq',nation:'math',name:'数列高原',sub:'数列 · 不等式',rect:[1620,700,640,600],base:3,
  ground:['#e8c98a','#d0a457',],edge:'#a37c37',prop:['⛰️','🪨','🌾','🦅','🔢'],emoji:'⛰️'},
 {id:'geo',nation:'math',name:'几何尖塔',sub:'立体几何 · 解析几何',rect:[900,1300,600,480],base:4,
  ground:['#d9c7f0','#b09ade'],edge:'#7557bd',prop:['🔺','📐','🗼','🧊','📏'],emoji:'🔺'},
 {id:'prob',nation:'math',name:'概率熔炉',sub:'计数 · 概率 · 统计',rect:[1620,1400,640,400],base:5,
  ground:['#f0a58c','#dd7358'],edge:'#a2412a',prop:['🎲','🔥','🎯','📊','🕳️'],emoji:'🎲'}
];


const MATH_BRIDGES=[
 {id:'b1',from:'func',to:'tri',   rect:[740,880,160,80], need:'func',name:'函数桥'},
 {id:'b2',from:'tri', to:'seq',   rect:[1500,760,120,80],need:'tri', name:'正弦桥'},
 {id:'b3',from:'tri', to:'geo',   rect:[1160,1140,80,160],need:'tri',name:'余弦桥'},
 {id:'b4',from:'seq', to:'prob',  rect:[1900,1300,80,100],need:'seq',name:'递推桥'},
 {id:'b5',from:'geo', to:'prob',  rect:[1500,1520,120,80],need:'geo',name:'坐标桥'}
];


const MATH_SPIRITS=[
 {id:'m1', e:'🦊',n:'定义域狐',  k:'定义域与值域',   r:'func',nation:'math'},
 {id:'m2', e:'🐼',n:'单调性熊',  k:'单调性与奇偶性', r:'func',nation:'math'},
 {id:'m3', e:'🐆',n:'导数猎豹',  k:'导数与切线',     r:'func',nation:'math'},
 {id:'m4', e:'🐬',n:'弧度海豚',  k:'弧度制与诱导公式',r:'tri',nation:'math'},
 {id:'m5', e:'🦈',n:'和差角鲨',  k:'和差角与二倍角', r:'tri',nation:'math'},
 {id:'m6', e:'🐙',n:'正弦章鱼',  k:'正余弦定理',     r:'tri',nation:'math'},
 {id:'m7', e:'🦅',n:'等差鹰',    k:'等差数列',       r:'seq',nation:'math'},
 {id:'m8', e:'🐐',n:'等比羚',    k:'等比数列',       r:'seq',nation:'math'},
 {id:'m9', e:'🐪',n:'不等式驼',  k:'基本不等式',     r:'seq',nation:'math'},
 {id:'m10',e:'🦉',n:'向量鸮',    k:'空间向量与体积', r:'geo',nation:'math'},
 {id:'m11',e:'🦚',n:'离心率雀',  k:'圆锥曲线',       r:'geo',nation:'math'},
 {id:'m12',e:'🦢',n:'方程天鹅',  k:'直线与圆',       r:'geo',nation:'math'},
 {id:'m13',e:'🐿️',n:'排列松鼠',  k:'排列组合与二项式',r:'prob',nation:'math'},
 {id:'m14',e:'🦔',n:'条件概率刺猬',k:'概率与分布',   r:'prob',nation:'math'},
 {id:'m15',e:'🐦',n:'统计云雀',  k:'统计与回归',     r:'prob',nation:'math'}
];


// —— 石碑 · 精灵 · 守护者 · 引路人 ——
CUR_BUILD.spirits=MATH_SPIRITS;
// 函数之境
addStele(240,960,'func');addStele(400,1080,'func');addStele(300,1280,'func');addStele(600,1300,'func');
addSpirit(660,920,'m1');addSpirit(220,1150,'m2');addSpirit(520,980,'m3');
addGuard(665,1345,'func','函数之境守护者 · 极值巨像');
addHermit(200,890,'复合函数求导要一层一层剥：先对外层求导，再乘以内层的导数。');
// 三角海湾
addStele(1000,680,'tri');addStele(1180,800,'tri');addStele(1360,920,'tri');addStele(1060,1040,'tri');
addSpirit(1400,680,'m4');addSpirit(980,900,'m5');addSpirit(1290,1040,'m6');
addGuard(1400,1020,'tri','三角海湾守护者 · 三棱浪神');
addHermit(950,630,'诱导公式记一句就够："奇变偶不变，符号看象限"。');
// 数列高原
addStele(1740,820,'seq');addStele(1900,960,'seq');addStele(2120,860,'seq');addStele(2040,1140,'seq');
addSpirit(1800,1160,'m7');addSpirit(2180,820,'m8');addSpirit(1960,1200,'m9');
addGuard(2160,1200,'seq','数列高原守护者 · 无穷石碑');
addHermit(1700,1220,'看到 a_{n+1} − a_n = f(n) 就累加，看到 a_{n+1}/a_n = g(n) 就连乘。');
// 几何尖塔
addStele(1000,1420,'geo');addStele(1200,1540,'geo');addStele(1400,1440,'geo');addStele(1130,1690,'geo');
addSpirit(980,1640,'m10');addSpirit(1420,1670,'m11');addSpirit(1300,1400,'m12');
addGuard(1430,1730,'geo','几何尖塔守护者 · 双曲之影');
// 概率熔炉
addStele(1720,1520,'prob');addStele(1900,1640,'prob');addStele(2140,1540,'prob');addStele(2030,1740,'prob');
addSpirit(1780,1490,'m13');addSpirit(2160,1680,'m14');addSpirit(1950,1740,'m15');
addGuard(2190,1480,'prob','概率熔炉守护者 · 随机变量之主');


// 传送塔：每岛一座，走过去自动点亮
addTotem(300,900,'tot_math_func','函数之境 · 传送塔','func');
addTotem(1050,600,'tot_math_tri', '三角海湾 · 传送塔','tri');
addTotem(1700,760,'tot_math_seq', '数列高原 · 传送塔','seq');
addTotem(1000,1330,'tot_math_geo','几何尖塔 · 传送塔','geo');
addTotem(1700,1450,'tot_math_prob','概率熔炉 · 传送塔','prob');

// —— 散落结晶 ——
const MATH_LOOSE=[];
[[200,1040,'func'],[340,1180,'func'],[660,1240,'func'],[430,1360,'func'],[240,1330,'func'],
 [960,760,'tri'],[1150,660,'tri'],[1300,980,'tri'],[1420,880,'tri'],[1000,1120,'tri'],
 [1690,860,'seq'],[1860,1060,'seq'],[2150,1000,'seq'],[2230,900,'seq'],[1990,800,'seq'],
 [940,1350,'geo'],[1250,1640,'geo'],[1450,1560,'geo'],[1060,1740,'geo'],[1350,1760,'geo'],
 [1660,1560,'prob'],[1860,1700,'prob'],[2090,1600,'prob'],[2200,1740,'prob'],[1750,1600,'prob']
].forEach((p,i)=>MATH_LOOSE.push({id:'mc'+i,x:p[0],y:p[1],r:p[2],got:false,bob:Math.random()*6}));


/* ---- 挂载到数学国 ---- */
natEnd();
const MN=NATION_OF.math;
MN.regions=MATH_REGIONS;MN.bridges=MATH_BRIDGES;
MN.spirits=MATH_SPIRITS;MN.loose=MATH_LOOSE;

/* =========================================================
   数学题库（函数 · 三角 · 数列 · 几何 · 概率）
   ========================================================= */
const F=BANK.func,T=BANK.tri,S=BANK.seq,G=BANK.geo,P=BANK.prob;

