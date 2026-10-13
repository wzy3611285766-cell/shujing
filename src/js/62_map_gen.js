/* =========================================================
   地图生成
   ========================================================= */
function blazeGenMap(siteId,diffId,gear,savedMap){
  const site=BLAZE_SITE_OF[siteId]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[diffId]||BLAZE_DIFF[0];
  BLAZE_REGIONS.length=0;BLAZE_SPOTS.length=0;BLAZE_LOOSE.length=0;

  const rect=diff.size.slice();
  /* 保险箱房的封锁状态每局重置：上一局清过场，这一局的门得重新守起来。
     不重置的话，生成地图时 blazeWalkable 会认为保险箱房畅通无阻，
     物资箱与巡逻队就会往那间屋里塞。 */
  BZ.vaultOpen=false;BZ.reachAll=false;
  BLAZE_REGIONS.push({id:'zone',nation:siteId,name:site.name,sub:site.sub,rect:rect,
    ground:site.ground,edge:site.edge,prop:site.prop,emoji:site.emoji});

  const [rx,ry,rw,rh]=rect;
  const cx=rx+rw/2, cy=ry+rh/2;
  const taken=[];
  const seed=(rx*7919+ry*1299709+rw*31+rh*17+diffId*1013+siteId.length*77)|0;

  /* ① 地形：不规则边界 + 岩石障碍
     读档时整份沿用 —— 刷新一次就换一副地貌的话，
     存档里的墙与玩家位置会对不上，人会被凭空冒出来的墙卡死。 */
  const saved=(savedMap&&savedMap.poly&&savedMap.poly.length>=6)?savedMap:null;
  const poly=saved?saved.poly.slice():blazeGenPoly(rect,seed);
  /* 平面图四件套：栅格 → 水系（河 + 桥）→ 分区 → 道路网。
     四样都由同一个 seed 推出来，读档时照原样重算一遍就能和存档对上，
     所以不必落盘（落盘还得额外操心旧存档的兼容）。 */
  const grid =blazeGridOfRect(rect);
  const river=blazeGenRiver(rect,seed);
  const pois =blazeGenPois(siteId,rect);
  const roads=blazeGenRoads(pois,river,seed);
  BZ.map={rooms:[],vault:null,poly:poly,rocks:[],grid:grid,river:river,
          pois:pois,roads:roads,rect:rect.slice()};
  /* 桥头不许堆石头：桥是过河的唯一通道，一封就是半个战区去不了 */
  const rockAvoid=[{x:cx,y:cy,m:170}].concat(
    (river.bridges||[]).map(b=>({x:b.x,y:b.y,m:130})));
  const rocks=saved
    ? (saved.rocks||[]).filter(k=>isFinite(k.x)&&isFinite(k.y)&&k.r>0)
        .map(k=>({x:k.x|0,y:k.y|0,r:k.r|0,seed:k.seed|0||1}))
    : blazeGenRocks(poly,rx,ry,rw,rh,seed,rockAvoid);
  BZ.map.rocks=rocks;
  /* 读档时点位必须整份照搬存档，不能「先随机生成一份再按下标覆盖坐标」——
     生成的数量和顺序每次都不一样，坐标会安到别的类型的头上（见 blazeSpotsFromSave）。 */
  const fromSave=!!(saved&&Array.isArray(saved.spots)&&saved.spots.length);

  /* ② 撤离点：贴着不规则边缘放，彼此拉开距离 */
  const nEx=diff.exfils+(gear&&gear.beacon?1:0);
  /* 撤离点按方位命名（东侧 / 西南 …）：
     方形战区上"北岭""南门"这类名字跟实际位置对不上，
     报点时报"西南侧撤离点"，队友才能照着方位找过去。 */
  const DIR8=['东','东南','南','西南','西','西北','北','东北'];
  const exfils=[],base=Math.random()*6.283;
  for(let i=0;i<nEx&&!fromSave;i++){
    let p=null;
    for(let k=0;k<30&&!p;k++){
      const ang=base+i*6.283/Math.max(1,nEx)+(k?R(-0.16,0.16):0);
      const q=bzEdgePoint(poly,ang,120,cx,cy);
      if(!blazeWalkable(q.x,q.y))continue;
      let ok=true;
      for(const e of exfils)if(dist(q.x,q.y,e.x,e.y)<330){ok=false;break;}
      if(ok)p=q;
    }
    if(!p)continue;
    exfils.push(p);taken.push({x:p.x,y:p.y});
    const di=((Math.round(Math.atan2(p.y-cy,p.x-cx)/6.28318*8)%8)+8)%8;
    BLAZE_SPOTS.push({t:'exfil',x:p.x,y:p.y,e:'🚁',name:DIR8[di]+'侧撤离点'});
  }
  /* 一个都没放出来就强制补一个，否则这一局没法撤离 */
  if(!fromSave&&!exfils.length){
    let q=bzEdgePoint(poly,-1.5708,120,cx,cy);
    /* 兜底位置也得站得住：写死「中心下方 150」有可能正落在河里或岩石上，
       一局没法撤离，前面全白跑 —— 这里再就近找一个合法落脚点。 */
    if(!blazeWalkable(q.x,q.y))q=bzNearestWalkable(q.x,q.y,420)||
                                 {x:Math.round(cx),y:Math.round(ry+150)};
    exfils.push(q);taken.push({x:q.x,y:q.y});
    BLAZE_SPOTS.push({t:'exfil',x:q.x,y:q.y,e:'🚁',name:'紧急撤离点'});
  }

  /* ③ 建筑：L 形 / T 形的屋子，位置全部落在不规则边界内 */
  let rooms;
  if(saved&&saved.rooms&&saved.rooms.length){
    rooms=saved.rooms.filter(o=>o&&isFinite(o.x)&&isFinite(o.y)&&o.w>60&&o.h>60).map(o=>({
      x:o.x|0,y:o.y|0,w:o.w|0,h:o.h|0,
      cells:(Array.isArray(o.cells)&&o.cells.length)
        ? o.cells.filter(cc=>cc&&cc.w>40&&cc.h>40)
            .map(cc=>({x:cc.x|0,y:cc.y|0,w:cc.w|0,h:cc.h|0}))
        : [{x:o.x|0,y:o.y|0,w:o.w|0,h:o.h|0}],
      doors:(o.doors||[]).map(d=>Array.isArray(d)?{x:d[0],y:d[1],w:d[2],h:d[3]}:d)
              .filter(d=>d&&isFinite(d.x)&&isFinite(d.w)),
      vault:!!o.vault,lock:o.lock|0,opened:!!o.opened}));
  }else{
    rooms=blazeGenRooms(rx,ry,rw,rh,exfils.concat([{x:cx,y:cy}]),poly);
  }
  BZ.map.rooms=rooms;
  /* 岩石与楼上、与撤离点的重叠是纯视觉噪音：
     石头和墙都是障碍，两块障碍叠在一起就成了「一坨糊在墙上的深色多边形」，
     看不出哪儿是墙、哪儿是石头；停机坪圈里竖着块石头，更像道具摆错了地方。
     判定的时候两边都是不可走，搬走它不影响任何玩法，只让画面清爽。
     （读档时不重算：存档里的岩石就是上一局筛过的那一批） */
  if(!fromSave&&rocks.length){
    BZ.map.rocks=rocks.filter(k=>
      !rooms.some(r=>bzRoomShell(r,k.x,k.y))&&
      !exfils.some(e=>dist(k.x,k.y,e.x,e.y)<k.r+80));
  }

  /* ④ 出生点：从中心螺旋外扩，找第一个能站人的地方 */
  let sx=cx,sy=cy;
  if(!blazeWalkable(sx,sy)){
    let done=false;
    for(let rad=26;rad<660&&!done;rad+=24){
      for(let a=0;a<18;a++){
        const ang=a/18*6.283;
        const nx=cx+Math.cos(ang)*rad, ny=cy+Math.sin(ang)*rad;
        if(blazeWalkable(nx,ny)){sx=nx;sy=ny;done=true;break;}
      }
    }
    if(!done){
      const rnd2=mulberry(seed^99);
      for(let k=0;k<500&&!done;k++){
        const q=bzRandPoint(poly,rx,ry,rw,rh,rnd2,70);
        if(q&&blazeWalkable(q.x,q.y)){sx=q.x;sy=q.y;done=true;}
      }
    }
    /* 最后一道理：螺旋和随机都没找到（极窄的地形才会这样），
       就地往外扩一圈找最近的合法落脚点。出生点站不住的话，
       玩家一落地就卡在墙里，整局动弹不得。 */
    if(!done){
      const q=bzNearestWalkable(cx,cy,900);
      if(q){sx=q.x;sy=q.y;}
    }
  }
  taken.push({x:sx,y:sy});

  /* prefer：先在这个分区里找位置 —— 物资箱按区分配，才不会全挤在一个角上；
     区里实在放不下（水、岩石、楼占了）再退回全图随机 */
  function place(min,pad,extra,prefer){
    if(prefer){
      for(let k=0;k<80;k++){
        const a=Math.random()*6.283, rr=Math.sqrt(Math.random())*prefer.r;
        const x=prefer.x+Math.cos(a)*rr, y=prefer.y+Math.sin(a)*rr;
        if(!blazeWalkable(x,y))continue;
        if(extra&&extra(x,y))continue;
        let bad=false;
        for(const p of taken)if(dist(x,y,p.x,p.y)<min){bad=true;break;}
        if(bad)continue;
        taken.push({x,y});return {x:Math.round(x),y:Math.round(y)};
      }
    }
    for(let k=0;k<420;k++){
      const x=rx+pad+Math.random()*(rw-pad*2);
      const y=ry+pad+Math.random()*(rh-pad*2);
      if(!blazeWalkable(x,y))continue;
      let bad=false;
      for(const p of taken)if(dist(x,y,p.x,p.y)<min){bad=true;break;}
      if(bad)continue;
      if(extra&&extra(x,y))continue;
      taken.push({x,y});return {x:Math.round(x),y:Math.round(y)};
    }
    /* 间距和分区都放宽了，但屋子禁区还得守住：
       这里的点是「实在放不下」时的退路，退路也不能退进屋里，
       否则就成了「敌人刷在房间里 / 贴着保险箱站」 */
    for(let k=0;k<300;k++){
      const x=rx+pad+Math.random()*(rw-pad*2),y=ry+pad+Math.random()*(rh-pad*2);
      if(blazeWalkable(x,y)&&!inLockedRoom(x,y)&&!inVaultRoom(x,y)&&!bzInAnyRoom(x,y))
        return {x:Math.round(x),y:Math.round(y)};
    }
    return {x:Math.round(sx),y:Math.round(sy)};
  }
  /* 点是否落在还没开门的上锁房间里（外面的箱子不该刷进去） */
  function inLockedRoom(x,y){
    for(const r of rooms)if(r.lock>0&&!r.opened&&bzRoomInside(r,x,y))return true;
    return false;
  }

  /* ④b 保险箱房：必须在巡逻队 / 物资箱之前挑定。
     这间屋是「先清守卫、再开保险箱」的固定舞台，最忌讳别的点位先落进去：
     以前它是第 ⑧ 步才选的，巡逻队（⑥）和物资箱（⑦）根本排不到它，
     于是近半数的局里，巡逻兵就站在保险箱旁边晃 ——
     玩家还没进门就被拦下打一场，屋里那几个守卫也失去了把守的意义。
     提前定下来，后面的落点才能统一避开它。 */
  let vr=null,fd=-1;
  /* 读档时沿用存档里那一间：屋里的守卫 / 保险箱是按房间引用挂着的，
     重挑一间会让 BZ.map.vault 和 spot.room 对不上号 ——
     任务条上的「还有 N 名守卫」和保险箱的实际状态就分裂了。 */
  if(saved&&saved.rooms)vr=rooms.find(r=>r.vault)||null;
  if(!vr){
    rooms.forEach(r=>{
      if(r.lock>0)return;
      /* 落在高价值分区里的屋子加权：好东西就该在"最肥、也最难走"的地方 */
      const poi=blazePoiAt(r.x+r.w/2,r.y+r.h/2);
      const w=(poi&&poi.hot>=3)?1.35:((poi&&poi.hot===2)?1.15:1);
      const d=dist(r.x+r.w/2,r.y+r.h/2,sx,sy)*w;
      if(d>fd){fd=d;vr=r;}
    });
    if(!vr)vr=rooms.find(r=>!r.lock)||rooms[0];
  }
  if(vr){
    vr.vault=true;vr.lock=0;BZ.map.vault=vr;
    /* 出生点要是正落在这间屋里，人一落地就被封在门里（门要清完守卫才开），
       这一局直接废掉 —— 挑屋子时已经按「离出生点最远」加权，
       但只剩一两间房的窄图仍可能撞上，这里兜住。 */
    if(bzRoomInside(vr,sx,sy)){
      const q=bzNearestWalkable(sx,sy,900,(x,y)=>!bzRoomInside(vr,x,y));
      if(q){sx=q.x;sy=q.y;}
    }
  }
  /* 保险箱房内部一律留空：巡逻队、物资箱、散落战利品都按这条让开。
     屋里只该有它自己的守卫和保险箱（第 ⑧ 步放）。 */
  function inVaultRoom(x,y){
    const v=BZ.map&&BZ.map.vault;
    return !!(v&&bzRoomInside(v,x,y));
  }

  /* ⑤ 上锁房间：门被铁闸焊死，得用房卡刷开 —— 屋里的东西按卡的等级加厚 */
  const plain=shuffle(rooms.filter(r=>!r.vault));
  const nLock=clamp(1+(diff.id>=2?1:0)+(hqLevel()>=3?1:0),0,plain.length);
  for(let i=0;i<nLock;i++){
    const r=plain[i];
    const lv=diff.id>=3?RI(1,3):(diff.id>=2?RI(1,2):(Math.random()<.35?2:1));
    r.lock=lv;r.opened=false;
    const d0=r.doors&&r.doors[0];
    let out=null;
    if(d0){
      for(let k=0;k<10&&!out;k++){
        const off=k?(k%2?1:-1)*Math.ceil(k/2)*22:0;
        const q=blazeDoorOutside(r,{x:d0.x+off,y:d0.y+off,w:d0.w,h:d0.h});
        if(blazeWalkable(q.x,q.y))out=q;
      }
      if(!out)out=blazeDoorOutside(r,d0);
    }
    if(!out)out={x:Math.round(r.x+r.w/2),y:Math.round(r.y-BZ_WALL-56)};
    /* 门牌落进墙里或河里，玩家就永远刷不开这扇门，屋里的箱子和守卫全成摆设。
       兜底位置（屋子正上方 / 门外侧）也可能压在墙上，这里再螺旋找一个站得住的点，
       且只挪一小段 —— 门牌必须还贴着这扇门，不能挪到别的屋子去。 */
    if(!blazeWalkable(out.x,out.y))out=bzNearestWalkable(out.x,out.y,320)||out;
    BLAZE_SPOTS.push({t:'door',x:out.x,y:out.y,e:(BLAZE_CARD_OF[lv]||{}).e||'🔑',
      card:lv,room:r,opened:false,
      name:((BLAZE_CARD_OF[lv]||{}).n||'上锁')+'铁门'});
    taken.push({x:out.x,y:out.y});
    /* 屋里的东西逐个按「离已摆好的远一点」落位：
       箱子压着守卫、保险箱叠在箱子上，一眼看过去就是贴图重叠 */
    const inner=[];
    const putSpot=function(margin){
      const p=blazeRoomSpotFar(r,margin,inner);
      inner.push({x:p.x,y:p.y});return p;
    };
    const nC=1+(lv>=2?1:0)+(lv>=3?1:0);
    for(let k=0;k<nC;k++){
      const p=putSpot(66);
      BLAZE_SPOTS.push({t:'crate',x:p.x,y:p.y,e:'📦',name:'物资箱',
        looted:false,boost:1+lv*0.7,room:r});
    }
    const nG=(lv>=3?2:(lv>=2?1:0));
    for(let k=0;k<nG;k++){
      const p=putSpot(74);
      BLAZE_SPOTS.push({t:'guard',x:p.x,y:p.y,ax:p.x,ay:p.y,e:'💂',
        name:((BLAZE_CARD_OF[lv]||{}).n||'上锁')+'房守卫',
        dead:false,cd:0,elite:true,room:r,gid:k});
    }
    /* 房卡房里必有一座「免费」保险箱（不用钥匙卡，刷开门就能开）：
       卡的价钱越贵，屋里的箱子越厚 ——
       🔵 小保险箱 → 🟡 大保险箱 → 🔴 一大一小 / 两大（随机二选一）。
       以前只有红卡房才有保险箱，蓝黄两张卡等于花钱买几个纸箱，
       房卡这条养成线根本立不住。 */
    const vplan=lv>=3?(Math.random()<.5?[{big:1},{big:0}]:[{big:1},{big:1}])
             :(lv>=2?[{big:1}]:[{big:0}]);
    vplan.forEach(function(v,k){
      const p=putSpot(84);
      BLAZE_SPOTS.push({t:'vault',x:p.x,y:p.y,e:v.big?'🔐':'🔒',
        name:v.big?(k?'备用保险箱':'保险箱'):'小型保险箱',
        locked:nG>0,looted:false,big:v.big,room:r});
    });
  }

  /* ⑥ 巡逻队：离出生点至少 340，别一落地就开打
     落点和路点都要避开所有屋子 —— 巡逻队是野外部队，
     在野外活动、在路上遭遇，进楼搜刮时才该碰上屋里的守卫。
     以前只避开上锁房与保险箱房，普通屋里照刷不误，
     于是「推开一扇没锁的门，先跟一个巡逻兵打一架」，
     既不合理，也把「进屋搜」的节奏打断了。 */
  for(let i=0;i<diff.patrols;i++){
    const p=place(230,70,(x,y)=>dist(x,y,sx,sy)<340||inLockedRoom(x,y)
                              ||inVaultRoom(x,y)||bzInAnyRoom(x,y));
    const rad=R(90,190),n=RI(3,4),a0=Math.random()*6.28;
    let path=[];
    for(let j=0;j<n;j++){
      const a=a0+j/n*6.28;
      const px=clamp(p.x+Math.cos(a)*rad,rx+40,rx+rw-40);
      const py=clamp(p.y+Math.sin(a)*rad,ry+40,ry+rh-40);
      /* 路点必须先站得住，再谈好不好走：
         以前只在「落在墙里」时才往房间里挪，落进河里或焦土禁区的点照原样塞进路径，
         巡逻队就顺着这条路径一路走出战区 —— 玩家进不去，人却在地图上越跑越远。
         第四个参数是不许落进去的区域（保险箱房）：巡逻路线绕着那间屋走。 */
      path.push(bzPatrolPoint(p.x,p.y,Math.atan2(py-p.y,px-p.x),
                              Math.min(rad,Math.hypot(px-p.x,py-p.y)),
                              (x,y)=>inVaultRoom(x,y)||bzInAnyRoom(x,y)));
    }
    /* 一圈路点全缩回中心（说明这块地根本转不开）就干脆少绕，避免原地打转。
       用距离判断而不是比坐标：路点已取整、中心点没有，直接比会漏掉。 */
    path=path.filter(q=>dist(q.x,q.y,p.x,p.y)>1);
    BLAZE_SPOTS.push({t:'patrol',x:p.x,y:p.y,ax:p.x,ay:p.y,path:path,pi:0,
      e:'👾',name:'巡逻队',dead:false,cd:0});
  }

  /* ⑦ 物资箱 —— 室内室外都放，逼玩家进楼搜（上锁房间里不放，那儿的箱子单独给过）
     野外的箱子按分区轮转分配：高价值区摊得最多，
     "哪儿肥"是这张图上明摆着的信息，不用记，看分区就知道。 */
  let inRoom=0;
  const poiQ=blazePoiQueue(pois);
  for(let i=0;i<diff.crates;i++){
    let p=null;
    /* 保险箱房里不放普通箱子：那间屋的收益是保险箱，
       塞两个物资箱进去等于把「高风险高回报」稀释成随手捡 */
    const openRooms=rooms.filter(r=>!r.vault&&!(r.lock>0&&!r.opened));
    if(openRooms.length&&inRoom<Math.ceil(diff.crates*0.45)&&Math.random()<.6){
      const r=pick(openRooms);
      const q=blazeRoomSpot(r,62);
      if(blazeWalkable(q.x,q.y)){p=q;inRoom++;}
    }
    if(!p){
      const q=poiQ[i%poiQ.length];
      p=place(165,60,(x,y)=>dist(x,y,sx,sy)<90||inLockedRoom(x,y)||inVaultRoom(x,y),
              q?{x:q.x,y:q.y,r:q.r*0.86}:null);
    }
    BLAZE_SPOTS.push({t:'crate',x:p.x,y:p.y,e:'📦',name:'物资箱',looted:false});
  }

  /* ⑧ 保险箱房：屋子在第 ④b 步就挑定了（离出生点最远的那间楼），
     这里只负责往里布置守卫与保险箱 —— 顺序不能反过来，
     否则巡逻队和物资箱会先一步落在屋里（见第 ⑥ ⑦ 步的 inVaultRoom）。 */
  vr=(BZ.map&&BZ.map.vault)||vr;
  if(vr){
    const nG=1+(diff.id>=2?1:0)+(diff.id>=3?1:0);
    /* 守卫一律守在门外，一个都不进屋 ——
       这间屋在守卫清干净之前是封死的（见 blazeBlocked），
       守卫要是站在屋里，玩家隔着墙根本打不到他们，就成了永远开不了门的死局。
       现在门口站着一支精锐：玩家在门外逐个击破，清完最后一个人，门才开。 */
    const d0=(vr.doors&&vr.doors[0])||{x:vr.x+vr.w/2,y:vr.y+vr.h,w:0,h:0};
    const gate=blazeDoorOutside(vr,d0);
    if(!blazeWalkable(gate.x,gate.y)){
      const q=bzNearestWalkable(gate.x,gate.y,320,(x,y)=>!bzRoomInside(vr,x,y));
      if(q){gate.x=q.x;gate.y=q.y;}
    }
    const horiz=d0.w>d0.h;
    for(let k=0;k<nG;k++){
      let gx=gate.x,gy=gate.y;
      if(k>0){
        /* 第二个人起沿门口左右错开站着，别叠成一坨 */
        const off=(k%2?1:-1)*Math.ceil(k/2)*46;
        gx=gate.x+(horiz?off:0); gy=gate.y+(horiz?0:off);
      }
      if(!blazeWalkable(gx,gy)){
        const q=bzNearestWalkable(gx,gy,240,(x,y)=>!bzRoomInside(vr,x,y));
        if(q){gx=q.x;gy=q.y;}else{gx=gate.x;gy=gate.y;}
      }
      BLAZE_SPOTS.push({t:'guard',x:Math.round(gx),y:Math.round(gy),
        ax:Math.round(gx),ay:Math.round(gy),
        e:k===0?'💂':'🕴️',name:k===0?'保险箱房门卫':('保险箱房守卫'+(k>1?' '+k:'')),
        dead:false,cd:0,elite:true,vault:1,gid:k,room:vr});
    }
    /* 保险箱：放在屋子正中，守卫没清完打不开 */
    const vp=blazeRoomSpot(vr,96);
    BLAZE_SPOTS.push({t:'vault',x:vp.x,y:vp.y,e:'🔐',name:'保险箱',
      locked:true,looted:false,big:1,room:vr});
    if(hqLevel()>=4){
      const vp2=blazeRoomSpot(vr,96);
      BLAZE_SPOTS.push({t:'vault',x:vp2.x,y:vp2.y,e:'💠',name:'高价值保险箱',
        locked:true,looted:false,big:2,needKey:1,room:vr});
    }
  }

  /* ⑩ 给房间编号：存档里用索引记「这个箱子在哪间屋」，读档时再接回引用 */
  rooms.forEach((r,ri)=>{r.idx=ri;});
  BLAZE_SPOTS.forEach(sp=>{if(sp.room&&sp.room.idx!=null)sp.ri=sp.room.idx;});

  /* ⑨ 散落的战利品：边跑边捡，给搜刮一点即时反馈 */
  BLAZE_STATE.loose={};
  for(let i=0;i<Math.round(diff.crates*0.9);i++){
    const q=poiQ[(i*2+1)%poiQ.length];
    const p=place(105,50,(x,y)=>dist(x,y,sx,sy)<70||inLockedRoom(x,y)||inVaultRoom(x,y),
                  q?{x:q.x,y:q.y,r:q.r*0.9}:null);
    BLAZE_LOOSE.push({id:'bz'+i,x:p.x,y:p.y,got:false,bob:Math.random()*6});
  }

  /* ⑫ 可达性收尾：河把战区切成两半，桥是唯一通路 ——
     万一有箱子 / 撤离点落在过不去的那一岸，就把它挪到走得到的地方，
     免得出现"看得见、摸不着"的死物。 */
  blazeEnsureReach(sx,sy);
  /* 收尾：巡逻队一个都不许待在屋里；保险箱房的封锁状态按守卫存活情况定档 */
  blazeEvacVaultRoom();
  blazeVaultSync();
  return {spawnX:Math.round(sx),spawnY:Math.round(sy)};
}

/* ---------------- 基地（未部署时的小场景） ---------------- */
function blazeBuildLobby(){
  BLAZE_REGIONS.length=0;BLAZE_SPOTS.length=0;BLAZE_LOOSE.length=0;
  BZ.map=null;                       // 回基地就把地形拆了，免得残留墙体
  BLAZE_REGIONS.push({id:'base',nation:'blaze',name:'行动基地',sub:'战前准备 · 选地点与难度',
    rect:[430,330,740,540],
    ground:['#31435f','#18222f'],edge:'#0b1119',
    prop:['⛺','🚙','📦','🛰️','🔦'],emoji:'🎖️'});
  BLAZE_SPOTS.push({t:'lobby',x:800,y:520,e:'🎖️',name:'指挥部'});
  BLAZE_STATE.loose={};
}

