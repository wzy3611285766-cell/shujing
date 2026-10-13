/* =========================================================
   ⚡🔥🌿 物理 / 化学 / 生物三国
   —— 三域品字形布局：上排两域，下排一域居中，两座桥串成一条路线
   ========================================================= */

/* 三域的标准位置（品字形）与两座桥 */
const TRI_SLOT=[[140,140],[900,140],[520,880]];
const TRI_SIZE=[640,600];
const TRI_BRIDGE=[
 {rect:[780,380,120,140]},   // 域1 → 域2（左右）
 {rect:[960,740,140,140]}    // 域2 → 域3（上下）
];

/* 域内点位模板（归一化，域内留 60px 内边距）。
   传送塔放在域顶居中，其余点位按经验分布，彼此间距均 > 70px */
const TRI_LAYOUT={
 stele: [[.10,.20],[.50,.42],[.87,.16],[.38,.80]],
 spirit:[[.20,.66],[.80,.62],[.60,.20]],
 guard: [.88,.84], hermit:[.08,.94], totem:[.50,.06],
 dust:  [[.16,.44],[.22,.92],[.70,.30],[.94,.50],[.50,.72]]
};
function triPut(rect,p){
  const [x,y,w,h]=rect;
  return [Math.round(x+60+p[0]*(w-120)), Math.round(y+60+p[1]*(h-120))];
}

/* ---------------- 三国的域配置 ---------------- */
const SCI_DEFS={
 phys:[
  {id:'mech',name:'力学圣殿',sub:'运动学 · 牛顿定律 · 受力分析',emoji:'⚙️',
   ground:['#a8bdd4','#5d7a99'],edge:'#3b5470',prop:['⚙️','🧱','📐','🎢','🪨'],
   guard:'力学圣殿守护者 · 托利拆利巨像',
   hermit:'受力分析先画重力，再找接触面。摩擦力的方向永远"只想阻止相对运动"，不是"阻止运动"。'},
  {id:'neng',name:'能量熔炉',sub:'功和能 · 动量 · 万有引力',emoji:'🔥',
   ground:['#f2b46a','#d0762f'],edge:'#8f4712',prop:['🔥','🪵','💥','🌋','🛞'],
   guard:'能量熔炉守护者 · 守恒之炎',
   hermit:'看见"只有重力做功"就写机械能守恒；看见碰撞、爆炸、打击就先想动量守恒。'},
  {id:'dian',name:'电磁穹顶',sub:'电场 · 恒定电流 · 磁场感应',emoji:'⚡',
   ground:['#b3a6ee','#6a5bc4'],edge:'#42358c',prop:['⚡','🧲','🔌','🌀','💡'],
   guard:'电磁穹顶守护者 · 法拉第之环',
   hermit:'安培力、洛伦兹力的方向一律用左手；感应电流的方向一律用右手（或楞次定律）。'}
 ],
 chem:[
  {id:'atom',name:'原子港',sub:'原子结构 · 周期律 · 化学键',emoji:'⚛️',
   ground:['#9fe6d4','#3ea391'],edge:'#1f6a5c',prop:['⚛️','🔬','🧊','📗','🧭'],
   guard:'原子港守护者 · 门捷列夫之瞳',
   hermit:'"位、构、性"三角：位置决定结构，结构决定性质。周期表就是这张地图。'},
  {id:'rate',name:'平衡回廊',sub:'反应速率 · 化学平衡 · 水电离',emoji:'⚖️',
   ground:['#edc27a','#c08a34'],edge:'#8a5c17',prop:['⚖️','⏳','🌡️','🫧','🧪'],
   guard:'平衡回廊守护者 · 勒夏特列之秤',
   hermit:'平衡移动的万能钥匙是 Q 与 K 比大小：Q > K 往左，Q < K 往右。'},
  {id:'org', name:'有机园林',sub:'烃 · 烃的衍生物 · 电化学',emoji:'🧪',
   ground:['#f2a6cd','#c25e9b'],edge:'#8b3a6d',prop:['🧪','🌸','🍇','🔋','🧫'],
   guard:'有机园林守护者 · 千链藤王',
   hermit:'写有机方程式先找官能团——反应发生在官能团上，碳骨架通常不动。'}
 ],
 bio:[
  {id:'cell',name:'细胞雨林',sub:'细胞结构 · 物质运输 · 酶与ATP',emoji:'🔬',
   ground:['#a8e6a1','#4fa347'],edge:'#2e6b28',prop:['🔬','🌿','💧','🍃','🧫'],
   guard:'细胞雨林守护者 · 膜界守卫',
   hermit:'判断物质运输方式只看三点：要不要载体、要不要 ATP、顺不顺浓度梯度。'},
  {id:'gene',name:'遗传高塔',sub:'遗传定律 · DNA · 变异与育种',emoji:'🧬',
   ground:['#9fe0ef','#3d9fb8'],edge:'#1f6780',prop:['🧬','🗼','🕊️','🎲','📜'],
   guard:'遗传高塔守护者 · 双螺旋之影',
   hermit:'自由组合的前提是"非同源染色体上的非等位基因"，两对基因绑在同一对染色体上就不自由。'},
  {id:'eco', name:'生态汪洋',sub:'内环境稳态 · 免疫 · 种群群落',emoji:'🌍',
   ground:['#a9c8f0','#4b7fc4'],edge:'#2a5188',prop:['🌍','🐟','🦌','🛡️','🌊'],
   guard:'生态汪洋守护者 · 盖亚之息',
   hermit:'生态系统三大功能：能量流动（单向递减）、物质循环（全球循环）、信息传递（双向）。'}
 ]
};

/* ---------------- 三国的精灵（每国 9 只） ---------------- */
const SCI_SPIRITS={
 phys:[
  {id:'p1', e:'🦅',n:'运动隼',  k:'匀变速直线运动',   slot:0},
  {id:'p2', e:'🐂',n:'牛顿犍',  k:'牛顿定律与受力分析',slot:0},
  {id:'p3', e:'🕊️',n:'抛体鸽',  k:'平抛与圆周运动',   slot:0},
  {id:'p4', e:'🦏',n:'动量犀',  k:'动量定理与守恒',   slot:1},
  {id:'p5', e:'🐆',n:'机械能豹',k:'功、功率与动能定理',slot:1},
  {id:'p6', e:'🐋',n:'引力鲸',  k:'万有引力与航天',   slot:1},
  {id:'p7', e:'🦊',n:'电场狐',  k:'电场强度与电势',   slot:2},
  {id:'p8', e:'🕷️',n:'电路蛛',  k:'恒定电流与电功率', slot:2},
  {id:'p9', e:'🦉',n:'磁感鸮',  k:'磁场与电磁感应',   slot:2}
 ],
 chem:[
  {id:'c1', e:'🐝',n:'周期蜂',  k:'原子结构与周期律', slot:0},
  {id:'c2', e:'🕸️',n:'键合蛛',  k:'化学键与分子结构', slot:0},
  {id:'c3', e:'🐢',n:'晶体龟',  k:'晶体类型与性质',   slot:0},
  {id:'c4', e:'🐰',n:'速率兔',  k:'化学反应速率',     slot:1},
  {id:'c5', e:'🐍',n:'平衡蛇',  k:'化学平衡移动',     slot:1},
  {id:'c6', e:'🪼',n:'电离水母',k:'水电离与盐类水解', slot:1},
  {id:'c7', e:'🐉',n:'烃链蛟',  k:'烃与卤代烃',       slot:2},
  {id:'c8', e:'🧚',n:'官能团灵',k:'烃的含氧衍生物',   slot:2},
  {id:'c9', e:'🐙',n:'电化章鱼',k:'原电池与电解池',   slot:2}
 ],
 bio:[
  {id:'b1', e:'🦀',n:'膜蛋白蟹',k:'细胞膜与物质运输', slot:0},
  {id:'b2', e:'🐈',n:'细胞器猫',k:'细胞器分工合作',   slot:0},
  {id:'b3', e:'🦋',n:'酶活性蝶',k:'酶与 ATP',         slot:0},
  {id:'b4', e:'🦜',n:'孟德尔鹦',k:'分离与自由组合',   slot:1},
  {id:'b5', e:'🐲',n:'双螺旋龙',k:'DNA 复制与表达',   slot:1},
  {id:'b6', e:'🐸',n:'变异蛙',  k:'变异、育种与进化', slot:1},
  {id:'b7', e:'🦌',n:'稳态鹿',  k:'内环境与体液调节', slot:2},
  {id:'b8', e:'🐺',n:'免疫狼',  k:'免疫调节',         slot:2},
  {id:'b9', e:'🐳',n:'生态鲸',  k:'种群、群落与生态', slot:2}
 ]
};

/* ---------------- 构建三国 ---------------- */
['phys','chem','bio'].forEach(nid=>{
  natBegin(nid);
  const defs=SCI_DEFS[nid];
  const rects=defs.map((d,i)=>[TRI_SLOT[i][0],TRI_SLOT[i][1],TRI_SIZE[0],TRI_SIZE[1]]);
  // 域
  defs.forEach((d,i)=>{
    CUR_BUILD.regions.push(Object.assign({},d,{
      nation:nid,
      rect:[TRI_SLOT[i][0],TRI_SLOT[i][1],TRI_SIZE[0],TRI_SIZE[1]],
      base:i+1
    }));
  });
  // 桥
  CUR_BUILD.bridges.push(
    {id:nid+'_b1',from:defs[0].id,to:defs[1].id,rect:TRI_BRIDGE[0].rect.slice(),
     need:defs[0].id,name:'初阶桥'},
    {id:nid+'_b2',from:defs[1].id,to:defs[2].id,rect:TRI_BRIDGE[1].rect.slice(),
     need:defs[1].id,name:'进阶桥'}
  );
  // 精灵
  SCI_SPIRITS[nid].forEach(s=>{
    CUR_BUILD.spirits.push({id:s.id,e:s.e,n:s.n,k:s.k,r:defs[s.slot].id,nation:nid});
  });
  // 点位
  defs.forEach((d,i)=>{
    const rect=rects[i], L=TRI_LAYOUT;
    L.stele.forEach(p=>{const q=triPut(rect,p);addStele(q[0],q[1],d.id);});
    const sp=SCI_SPIRITS[nid].filter(v=>v.slot===i);
    L.spirit.forEach((p,k)=>{if(sp[k]){const q=triPut(rect,p);addSpirit(q[0],q[1],sp[k].id);}});
    const g=triPut(rect,L.guard);   addGuard(g[0],g[1],d.id,d.guard);
    const h=triPut(rect,L.hermit);  addHermit(h[0],h[1],d.hermit);
    const t=triPut(rect,L.totem);   addTotem(t[0],t[1],'tot_'+nid+'_'+d.id,d.name+' · 传送塔',d.id);
    L.dust.forEach(p=>{
      const q=triPut(rect,p);
      CUR_BUILD.loose.push({id:nid[0]+'c'+CUR_BUILD.looseK++,x:q[0],y:q[1],
        r:d.id,got:false,bob:Math.random()*6});
    });
  });
  natEnd();
});

/* =========================================================
   全局世界量：引擎直接读写的「当前国度」引用
   —— 初值取数学国，切换国度时由 useNation() 整体换掉
   ========================================================= */
let REGIONS=NATIONS[0].regions;
let BRIDGES=NATIONS[0].bridges;
let SPOTS  =NATIONS[0].spots;
let LOOSE  =NATIONS[0].loose;
let SPIRITS=NATIONS[0].spirits;

