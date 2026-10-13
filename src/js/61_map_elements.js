/* =========================================================
   平面图元素：水系 / 道路 / 分区 / 栅格
   ========================================================= */
function drawBlazeRiver(c,rv){
  if(!rv||!rv.pts||rv.pts.length<2)return;
  const p=rv.pts,h=rv.half;
  c.save();
  c.lineCap='round';c.lineJoin='round';
  c.beginPath();c.moveTo(p[0][0],p[0][1]);
  for(let i=1;i<p.length;i++)c.lineTo(p[i][0],p[i][1]);
  c.strokeStyle='rgba(62,54,36,.9)';c.lineWidth=h*2+34;c.stroke();   // 河岸
  c.strokeStyle='#12303f';          c.lineWidth=h*2;    c.stroke();   // 水面
  c.strokeStyle='rgba(94,214,255,.13)';c.lineWidth=h*2-20;c.stroke();
  c.setLineDash([26,36]);c.strokeStyle='rgba(180,235,255,.15)';
  c.lineWidth=3;c.stroke();c.setLineDash([]);
  c.restore();
  /* 桥：木桥面 + 两侧护栏，方向顺着水流 */
  (rv.bridges||[]).forEach(b=>{
    c.save();
    c.translate(b.x,b.y);c.rotate(b.a);
    c.fillStyle='rgba(0,0,0,.42)';c.fillRect(-b.wid/2-7,-b.len/2-7,b.wid+14,b.len+14);
    c.fillStyle='#4a3f2c';c.fillRect(-b.wid/2,-b.len/2,b.wid,b.len);
    c.fillStyle='rgba(255,255,255,.07)';
    for(let y=-b.len/2+8;y<b.len/2-4;y+=18)c.fillRect(-b.wid/2,y,b.wid,9);
    c.fillStyle='#5b4d33';
    c.fillRect(-b.wid/2,-b.len/2,11,b.len);
    c.fillRect(b.wid/2-11,-b.len/2,11,b.len);
    c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=3;
    c.strokeRect(-b.wid/2,-b.len/2,b.wid,b.len);
    c.restore();
  });
}
function drawBlazeRoads(c,roads){
  (roads||[]).forEach(rd=>{
    const p=rd.pts;
    if(!p||p.length<2)return;
    /* 简洁档：干道（46 宽）留一道淡黄中心线做导航，支路（32 宽）只留路基和沥青。
       支路本来就是"可走可绕"的次要信息，画上中心线后整张图会多出两张虚线网，
       和战术网格、河流虚线混在一起就分不清了。 */
    const main=rd.w>=44;
    const showLine=(!BZ_CLEAN)||main;
    c.save();
    c.lineCap='round';c.lineJoin='round';
    c.beginPath();c.moveTo(p[0][0],p[0][1]);
    for(let i=1;i<p.length;i++)c.lineTo(p[i][0],p[i][1]);
    c.strokeStyle='rgba(16,12,8,.55)';c.lineWidth=rd.w+14;c.stroke();  // 路基
    c.strokeStyle=BZ_CLEAN?'#2a2c33':'#31333a';c.lineWidth=rd.w;c.stroke();  // 沥青
    /* 中心线：白色实线，不是黄虚线。
       整张图里"虚线"已经被三处占了语义 —— 战场边界警戒线、POI 范围圈、
       撤离点虚线圈，它们全都表示"范围"。道路再挂一条黄虚线，
       四种虚线混在一起，眼睛就没法靠线型判断眼前这条是路还是边界。
       换成实线之后一眼分明：虚线 = 范围，实线 = 实体。
       顺带砍掉旧版那条 w-18 的内侧浅带 —— 路的层次已经够多，
       四条线叠出来的"路面纹理"在缩放后只会变成一道脏边。 */
    if(showLine){
      c.strokeStyle='rgba(226,240,255,.15)';
      c.lineWidth=3;c.stroke();
    }
    c.restore();
  });
}
/* 分区：淡色地块 + 虚线圈（withLabel=false）与地名牌子（withLabel=true）
   分成两趟画：色块要压在地形上、被楼和箱子盖住，牌子要浮在最上面。
   以前一趟画完两样、还被调用了两次 —— 半透明色块被叠画了两遍，
   交界处糊成一潭脏色，这是整张图看起来「乱」的一大来源。 */
function drawBlazePois(c,pois,withLabel){
  if(!withLabel){
    /* 色块按资源等级从低到高画，高价值区压在最上面；
       每画一块就把「后面还要画的那些圆」用 evenodd 挖掉 ——
       两块半透明色块交叠，交界会混出一种既不是金色也不是蓝色的脏色。 */
    const ps=(pois||[]).slice().sort((a,b)=>(a.hot||1)-(b.hot||1));
    ps.forEach((p,i)=>{
      const hot=p.hot>=3;
      c.save();
      if(i<ps.length-1){
        c.beginPath();
        c.rect(-200000,-200000,400000,400000);
        for(let j=i+1;j<ps.length;j++){
          c.moveTo(ps[j].x+ps[j].r,ps[j].y);
          c.arc(ps[j].x,ps[j].y,ps[j].r,0,7);
        }
        c.clip('evenodd');
      }
      const g=c.createRadialGradient(p.x,p.y,p.r*0.15,p.x,p.y,p.r);
      /* 简洁档：普通分区的色块几乎收干净（0.07 → 0.035），
         只留虚线圈标出范围；高价值区（hot）保持金色，那是"哪儿肥"的关键信息。 */
      g.addColorStop(0,hot?(BZ_CLEAN?'rgba(255,215,106,.105)':'rgba(255,215,106,.11)')
                         :(BZ_CLEAN?'rgba(150,200,255,.035)':'rgba(150,200,255,.07)'));
      g.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=g;c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fill();
      c.setLineDash([16,13]);c.lineWidth=3;
      c.strokeStyle=hot?(BZ_CLEAN?'rgba(255,215,106,.42)':'rgba(255,215,106,.40)')
                       :(BZ_CLEAN?'rgba(200,225,255,.15)':'rgba(200,225,255,.24)');
      c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.stroke();
      c.setLineDash([]);
      c.restore();
    });
    return;
  }
  /* 地名牌子：高价值区先占位（那是最要紧的路标），彼此不许叠在一起 */
  const ps2=(pois||[]).slice().sort((a,b)=>(b.hot||1)-(a.hot||1));
  const boxes=[];
  /* 撤离点的停机坪也占着一大块地方，牌子得让着它 */
  SPOTS.forEach(sp=>{if(sp.t==='exfil')
    boxes.push({x0:sp.x-72,y0:sp.y-72,x1:sp.x+72,y1:sp.y+72});});
  const hitBox=b=>boxes.some(o=>b.x0<o.x1&&b.x1>o.x0&&b.y0<o.y1&&b.y1>o.y0);
  ps2.forEach(p=>{
    const hot=p.hot>=3, txt=p.e+' '+p.n;
    c.save();
    /* 简洁档：地名牌子整体收小一号、底色调淡，普通分区再压到 58% 不透明度。
       地名是跑图时的重要参照，不能像栅格坐标那样直接删掉，
       但 8~9 块牌子全是亮白底 + 全亮文字时，边缘一圈比地形本身还抢眼。 */
    const fade=BZ_CLEAN?(hot?1:.58):1;
    c.globalAlpha=fade;
    c.font='bold '+(BZ_CLEAN?28:34)+'px system-ui,-apple-system,sans-serif';
    c.textAlign='center';c.textBaseline='middle';
    const w=c.measureText(txt).width+(BZ_CLEAN?24:30), h=(BZ_CLEAN?38:46);
    /* 撞上了就往上抬一格，抬三次还撞就不画 ——
       宁可少一块牌子，也不要两块牌子叠在一起谁都认不出来 */
    let bx=p.x-w/2, by=p.y-p.r*0.62-h/2, put=false;
    for(let k=0;k<4;k++){
      const box={x0:bx,y0:by,x1:bx+w,y1:by+h};
      if(!hitBox(box)){boxes.push(box);put=true;break;}
      by-=h+8;
    }
    if(!put){c.restore();return;}
    c.fillStyle=BZ_CLEAN?'rgba(6,14,24,.52)':'rgba(6,14,24,.62)';
    roundRect(c,bx,by,w,h,19);c.fill();
    c.strokeStyle=hot?'rgba(255,215,106,.55)':'rgba(255,255,255,.20)';
    c.lineWidth=2;roundRect(c,bx,by,w,h,19);c.stroke();
    c.fillStyle=hot?'#ffd76a':'#eaf4ff';
    c.fillText(txt,bx+w/2,by+h/2+1);
    c.restore();
  });
}
/* 栅格：线画在战区里（压得很淡），坐标字母 / 数字写在战区外的无人区上 */
function drawBlazeGridLines(c,g,poly){
  if(!g)return;
  c.save();
  if(poly&&poly.length>=6){c.beginPath();bzPolyPath(c,poly);c.closePath();c.clip();}
  c.strokeStyle='rgba(160,205,255,.085)';c.lineWidth=2;
  for(let i=1;i<g.cols;i++){
    const x=g.x+g.cw*i;c.beginPath();c.moveTo(x,g.y);c.lineTo(x,g.y+g.h);c.stroke();
  }
  for(let i=1;i<g.rows;i++){
    const y=g.y+g.ch*i;c.beginPath();c.moveTo(g.x,y);c.lineTo(g.x+g.w,y);c.stroke();
  }
  c.restore();
}
function drawBlazeGridLabels(c,g){
  /* 栅格坐标（A/B/C · 1/2/3）写在战区外圈，是最抢眼的一层文字背景。
     简洁档直接不画：报点用得上的是名牌里的格子号，地图上再来一圈字母数字，
     和分区地名、撤离点标记一起会把边缘挤满。 */
  if(!g||BZ_CLEAN)return;
  c.save();
  c.font='bold 30px system-ui,-apple-system,sans-serif';
  c.textBaseline='middle';
  c.fillStyle='rgba(190,220,255,.40)';
  c.textAlign='center';
  for(let i=0;i<g.cols;i++)c.fillText(String.fromCharCode(65+i),g.x+g.cw*(i+.5),g.y-28);
  c.textAlign='right';
  for(let i=0;i<g.rows;i++)c.fillText(String(i+1),g.x-16,g.y+g.ch*(i+.5));
  c.restore();
}

/* ---------- 房间几何 ---------- */
function bzRoomInside(r,x,y){
  for(const c of r.cells)
    if(x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h)return true;
  return false;
}
function bzRoomShell(r,x,y){
  const W=BZ_WALL;
  for(const c of r.cells)
    if(x>=c.x-W&&x<=c.x+c.w+W&&y>=c.y-W&&y<=c.y+c.h+W)return true;
  return false;
}
function bzRoomDoor(r,x,y){
  const ds=r.doors||[];
  for(const d of ds)if(inRect(x,y,[d.x,d.y,d.w,d.h]))return d;
  return null;
}
/* 点是不是落在某间屋子里（上锁的、保险箱房都算）。
   巡逻队是野外部队，落点与路点一律按这条避开 ——
   「推开一扇门，里面站着个巡逻兵」既不讲理，也毁了进屋搜刮的节奏。 */
function bzInAnyRoom(x,y){
  const rs=(BZ.map&&BZ.map.rooms)||[];
  for(const r of rs)if(bzRoomInside(r,x,y))return true;
  return false;
}
/* 保险箱房的门开没开 —— 屋里（门口）还有活着的守卫，门就封着。
   BZ.reachAll 是算可达性时临时开的口子：那时把门全当开了，
   免得屋里的保险箱被当成「走不到的死物」挪出屋子。 */
function blazeVaultSync(){
  const vr=BZ.map&&BZ.map.vault;
  BZ.vaultOpen=!(vr&&BLAZE_SPOTS.some(s=>s.t==='guard'&&!s.dead&&s.room===vr));
  return BZ.vaultOpen;
}
/* 点是否被挡住：房间内部和开着的门洞是通路，墙、锁着的门、岩石都是障碍 */
function blazeBlocked(x,y){
  const mp=(CUR===BLAZE)?BZ.map:null;
  if(mp&&mp.rooms&&mp.rooms.length){
    for(const r of mp.rooms){
      /* 保险箱房：守卫没清干净，整间屋封死（里面的保险箱看得见摸不着） */
      if(r.vault&&!BZ.vaultOpen&&!BZ.reachAll)continue;
      if(bzRoomInside(r,x,y))return false;
    }
    for(const r of mp.rooms){
      if(r.lock>0&&!r.opened&&!BZ.reachAll)continue;   // 锁着的房间：门不通
      if(r.vault&&!BZ.vaultOpen&&!BZ.reachAll)continue;// 封着的保险箱房：门也不通
      if(bzRoomDoor(r,x,y))return false;
    }
    for(const r of mp.rooms)if(bzRoomShell(r,x,y))return true;
  }
  if(mp&&mp.rocks){
    for(const k of mp.rocks){
      const dx=x-k.x,dy=y-k.y;
      if(dx*dx+dy*dy<k.r*k.r)return true;
    }
  }
  /* 河：水过不去，只有桥面能走（桥的判定在 bzInRiver 里先做掉了） */
  if(bzInRiver(x,y))return true;
  return false;
}
/* 烽火的可行走判定 = 在不规则边界内 + 不被墙/岩石挡住 */
function blazeWalkable(x,y){
  const mp=(CUR===BLAZE)?BZ.map:null;
  if(mp&&mp.poly&&mp.poly.length>=6&&!bzPtInPoly(x,y,mp.poly))return false;
  return !blazeBlocked(x,y);
}
/* 巡逻路点：按「中心 + 角度 + 半径」取一个站得住的点。
   落进河里 / 焦土 / 岩石里就沿半径往回收，收到底还不行就用中心点 ——
   绝不把走不到的坐标塞进巡逻路径，否则巡逻队会一路走出战区。
   avoid 是额外的禁区（比如保险箱房）：收半径的同时也要绕开它。 */
function bzPatrolPoint(cx,cy,ang,rad,avoid){
  const ca=Math.cos(ang), sa=Math.sin(ang);
  /* 先取整、再判可行走：路点最终是以整数存进路径的，
     按未取整的坐标判过再取整，边界上会差出半个单位，把点推到墙里去。 */
  for(let t2=1;t2>=.05;t2-=.2){
    const qx=Math.round(cx+ca*rad*t2), qy=Math.round(cy+sa*rad*t2);
    if(blazeWalkable(qx,qy)&&!(avoid&&avoid(qx,qy)))return {x:qx,y:qy};
  }
  /* 收到底都不行就退回中心：中心是巡逻队的落点，本身一定站得住，
     这里原样返回，别再取整 —— 取整会把贴着边界的点推出去。 */
  return {x:cx,y:cy};
}
/* 附近的落脚点：给走岔了的单位（读旧档、地形改过、巡逻点落进河里）
   找一个离得最近的合法位置。螺旋外扩找，找不到就返回 null。
   pred 是附加条件（比如「还得从出生点走得到」）—— 站得住和走得到是两回事，
   河湾或岩石圈出的飞地上，最近的一块合法地面玩家可能根本过不去。 */
function bzNearestWalkable(x,y,maxR,pred){
  const ok=(qx,qy)=>blazeWalkable(qx,qy)&&(!pred||pred(qx,qy));
  if(ok(x,y))return {x:x,y:y};
  const lim=maxR||260;
  for(let r=14;r<=lim;r+=14){
    for(let a=0;a<16;a++){
      const ang=a/16*6.283;
      const qx=x+Math.cos(ang)*r, qy=y+Math.sin(ang)*r;
      if(ok(qx,qy))return {x:Math.round(qx),y:Math.round(qy)};
    }
  }
  return null;
}

/* ---------- 可达性：从出生点洪水填充，只有「走得过去」的地方才算数 ----------
   单点可行走 ≠ 走得到：一圈岩石或一堵墙就能圈出一块飞地，
   箱子、撤离点落进去就是看得见摸不着的死物（实测高考难度约 46% 的局中招）。
   BZ_STEP 的格子边长取 12：比角色体型（16）细，又不会把地图切得太碎。 */
const BZ_STEP=12;
function blazeReachSet(sx,sy){
  const seen=new Set();
  const k=(x,y)=>(Math.round(x/BZ_STEP)|0)+','+(Math.round(y/BZ_STEP)|0);
  const x0=Math.round(sx/BZ_STEP)*BZ_STEP, y0=Math.round(sy/BZ_STEP)*BZ_STEP;
  const q=[[x0,y0]];seen.add(k(x0,y0));
  let h=0;
  while(h<q.length){
    const [x,y]=q[h++];
    for(const d of [[BZ_STEP,0],[-BZ_STEP,0],[0,BZ_STEP],[0,-BZ_STEP]]){
      const nx=x+d[0],ny=y+d[1],kk=k(nx,ny);
      if(seen.has(kk))continue;
      seen.add(kk);
      if(blazeWalkable(nx,ny))q.push([nx,ny]);
    }
  }
  return seen;
}
/* 目标点是否落在可达区域里（放宽一格，免得站在格子边缘被判成到不了） */
function blazeReachAt(seen,x,y){
  if(!seen)return true;
  const k=(a,b)=>(Math.round(a/BZ_STEP)|0)+','+(Math.round(b/BZ_STEP)|0);
  for(let ox=-BZ_STEP;ox<=BZ_STEP;ox+=BZ_STEP)
    for(let oy=-BZ_STEP;oy<=BZ_STEP;oy+=BZ_STEP)
      if(seen.has(k(x+ox,y+oy)))return true;
  return false;
}
/* 从可达格子里挑一个落脚点（带附加排除条件） */
function blazeReachPick(seen,min,taken,extra){
  if(!seen||!seen.size)return null;
  const arr=[];
  seen.forEach(key=>{
    const p=key.split(',');
    const x=(+p[0])*BZ_STEP, y=(+p[1])*BZ_STEP;
    if(blazeWalkable(x,y))arr.push({x:x,y:y});
  });
  if(!arr.length)return null;
  shuffle(arr);
  for(let i=0;i<Math.min(500,arr.length);i++){
    const p=arr[i];
    if(extra&&extra(p.x,p.y))continue;
    let ok=true;
    for(const t of (taken||[]))if(dist(p.x,p.y,t.x,t.y)<min){ok=false;break;}
    if(ok)return p;
  }
  return null;
}
/* 收尾：把落在"走不到"的地方的点位挪进可达区。
   架了桥之后理论上处处可达，但河湾 + 岩石圈出的飞地仍在所难免 ——
   与其留一个看得见拿不着的箱子，不如把它挪到玩家真能走到的地方。 */
function blazeEnsureReach(sx,sy){
  /* 上锁房间里的箱子 / 守卫是「等玩家拿房卡来开」的，
     保险箱房里的保险箱是「等玩家清完守卫」的 —— 门到时候自然开得成，
     不能当成走不到的死物给挪出屋子，否则「先清守卫、再开保险箱」
     这套设计就被自己搬空了。
     所以这里临时把所有门（含封着的保险箱房）当作开着来算可达性，算完立刻还原。 */
  const all0=!!BZ.reachAll;
  BZ.reachAll=true;
  let seen;
  try{seen=blazeReachSet(sx,sy);}
  finally{BZ.reachAll=all0;}
  if(!seen||!seen.size)return;
  const rec=(BZ.map&&BZ.map.rect)||[0,0,W,H];
  const ccx=rec[0]+rec[2]/2, ccy=rec[1]+rec[3]/2;
  const edgeMin=Math.min(rec[2],rec[3])*0.30;
  const inLockedRoom=(x,y)=>{
    const rs=(BZ.map&&BZ.map.rooms)||[];
    for(const r of rs)if(r.lock>0&&!r.opened&&bzRoomInside(r,x,y))return true;
    return false;
  };
  const vr0=BZ.map&&BZ.map.vault;
  const inVaultRoom=(x,y)=>!!(vr0&&bzRoomInside(vr0,x,y));
  const taken=[];
  BLAZE_SPOTS.forEach(s=>taken.push({x:s.x,y:s.y}));
  BLAZE_LOOSE.forEach(c=>taken.push({x:c.x,y:c.y}));
  const fix=[];
  BLAZE_SPOTS.forEach(s=>{
    /* 门牌是门的附属物，跟着门洞走，单独挪会脱离门 —— 只提示、不搬位 */
    if(s.t==='door')return;
    /* 两种毛病一起治：走不到（飞地），或者干脆站不住（墙里 / 河里 / 界外）。
       巡逻队和守卫以前只在「走不到」时才挪，站在界外照样原地不动，
       于是屏幕上就出现「敌人浮在焦土上、玩家永远够不着」的错位。 */
    if(blazeWalkable(s.x,s.y)&&blazeReachAt(seen,s.x,s.y))return;
    fix.push(s);
  });
  BLAZE_LOOSE.forEach(c=>{if(!blazeWalkable(c.x,c.y)||!blazeReachAt(seen,c.x,c.y))fix.push(c);});
  if(!fix.length)return;
  fix.forEach(s=>{
    const isEx=(s.t==='exfil');
    /* 屋里站不住的点位（上锁屋内的守卫 / 箱子压在墙角上）：
       在屋内重新挑个站位就好，房间归属必须保留 —— 拖出屋子就废了这一间房。 */
    if(s.room&&!blazeWalkable(s.x,s.y)){
      /* 屋里挑候选点时要「门全开」：
         保险箱房清场前整间屋子都算站不住，门关着的话候选点全部判失败，
         保险箱就会原封不动留在墙里。挑完立刻还原。 */
      BZ.reachAll=true;
      try{
        for(let k=0;k<12;k++){
          const q=blazeRoomSpot(s.room,66);
          if(blazeWalkable(q.x,q.y)){s.x=q.x;s.y=q.y;break;}
        }
        if(!blazeWalkable(s.x,s.y)){
          const q=bzNearestWalkable(s.x,s.y,240,(x,y)=>bzRoomInside(s.room,x,y));
          if(q){s.x=q.x;s.y=q.y;}
        }
      }finally{BZ.reachAll=all0;}
      taken.push({x:s.x,y:s.y});
      return;
    }
    let p=blazeReachPick(seen,isEx?120:150,taken,(x,y)=>
      inLockedRoom(x,y)||dist(x,y,sx,sy)<110||
      /* 补位也别挪进保险箱房：那是守卫和保险箱的地盘。
         本来就归这间屋的单位（守卫 / 保险箱）除外，它们必须留在屋里。
         普通屋子同样不进 —— 屋里的东西是进屋搜刮的奖励，
         野外的目标挪进屋就变成了「推门先打架」。 */
      (s.room!==vr0&&inVaultRoom(x,y))||
      (!s.room&&bzInAnyRoom(x,y))||
      (isEx&&dist(x,y,ccx,ccy)<edgeMin));
    /* 撤离点是这一局唯一的出口，位置再不理想也得给它一块走得到的地面：
       挑不出「离得远、又不在中心」的理想点时，退到「可达区里离原址最近的那一格」，
       绝不能留下一个走不到的撤离点 —— 那就是彻头彻尾的「撤不了」。 */
    if(!p&&isEx){
      let bd=1e18;
      seen.forEach(key=>{
        const q=key.split(',');
        const x=(+q[0])*BZ_STEP, y=(+q[1])*BZ_STEP;
        if(!blazeWalkable(x,y))return;
        if(inLockedRoom(x,y)||inVaultRoom(x,y)||bzInAnyRoom(x,y)||
           dist(x,y,sx,sy)<110)return;
        const d=(x-s.x)*(x-s.x)+(y-s.y)*(y-s.y);
        if(d<bd){bd=d;p={x:x,y:y};}
      });
    }
    if(!p){
      /* 挑不出理想位置（多半是这张图的可走区域太碎）时，别把目标丢下不管。
         优先挪到「既站得住、又走得到」的最近地面；这一档也没有才退而求其次
         只求站得住 —— 卡在墙里的死物比位置不理想更糟。 */
      /* 屋子禁区在这一档同样有效：最近的合法地面也不能是保险箱房 / 上锁屋，
         否则兜底兜出来的就是「敌人贴着保险箱站」 */
      const keepOut=(x,y)=>!inLockedRoom(x,y)&&!(s.room!==vr0&&inVaultRoom(x,y))
                          &&!(!s.room&&bzInAnyRoom(x,y));
      const q=bzNearestWalkable(s.x,s.y,320,(x,y)=>blazeReachAt(seen,x,y)&&keepOut(x,y))
            ||bzNearestWalkable(s.x,s.y,320,keepOut);
      if(q){s.x=q.x;s.y=q.y;taken.push({x:s.x,y:s.y});}
      else return;
      if(s.t==='patrol'&&s.path&&s.path.length){
        const rad=R(90,170),n=s.path.length,a0=Math.random()*6.28,np=[];
        for(let j=0;j<n;j++){
          const a=a0+j/n*6.283;
          np.push(bzPatrolPoint(s.x,s.y,a,rad,bzInAnyRoom));
        }
        s.path=np;s.pi=0;s.ax=s.x;s.ay=s.y;
      }
      return;
    }
    s.x=Math.round(p.x);s.y=Math.round(p.y);
    taken.push({x:s.x,y:s.y});
    /* 巡逻兵的巡逻圈是围着落点画的，人挪了圈也得重画（同样绕开所有屋子） */
    if(s.t==='patrol'&&s.path&&s.path.length){
      const rad=R(90,170),n=s.path.length,a0=Math.random()*6.28,np=[];
      for(let j=0;j<n;j++){
        const a=a0+j/n*6.283;
        np.push(bzPatrolPoint(s.x,s.y,a,rad,bzInAnyRoom));
      }
      s.path=np;s.pi=0;s.ax=s.x;s.ay=s.y;
    }
    if(s.room){s.room=null;s.ri=null;}
  });
}

/* ---------- 巡逻队清场：屋里一个都不留 ----------
   巡逻队是野外部队，就该在野外活动：屋里只该有守卫和容器。
   巡逻兵站在保险箱房里，玩家还没进门就得先打一场不该有的仗，
   「守卫把守」的设计也跟着失效；站在普通屋里同样别扭 ——
   推开一扇没锁的门迎面撞上敌人，进屋搜刮的节奏全乱了。
   生成结束后扫一遍，读档时也扫一遍 —— 老存档（1.5.11 之前生成的）
   里就是这么刷的，读回来得当场把人请出去，不能让玩家带着毛病继续跑。 */
function blazeEvacVaultRoom(){
  const rs=(BZ.map&&BZ.map.rooms)||[];
  if(!rs.length)return;
  BLAZE_SPOTS.forEach(s=>{
    if(s.t!=='patrol'||s.dead)return;
    if(!bzInAnyRoom(s.x,s.y))return;
    const q=bzNearestWalkable(s.x,s.y,460,(x,y)=>!bzInAnyRoom(x,y));
    if(!q)return;                       // 实在挪不出去（极窄地形）就留着，总好过丢进墙里
    s.x=q.x;s.y=q.y;s.ax=q.x;s.ay=q.y;
    /* 人挪了，巡逻圈也围着新落点重画，并且绕开所有屋子 */
    const rad=R(90,170),n=(s.path&&s.path.length)||RI(3,4),a0=Math.random()*6.28,np=[];
    for(let j=0;j<n;j++)
      np.push(bzPatrolPoint(s.x,s.y,a0+j/n*6.283,rad,bzInAnyRoom));
    s.path=np;s.pi=0;
  });
}

/* ---------- 生成一片建筑 ----------
   房间不再是清一色的方盒子：六成概率再长出一间"耳房"，
   与主屋重叠 70px，屋里因此是连通的，外形就成了 L / T 形。 */
function blazeGenRooms(rx,ry,rw,rh,avoid,poly,rocks){
  const rooms=[];
  const want=clamp(Math.round(rw*rh/300000)+2,4,7);
  const rk=rocks||[];
  let guard=0;
  const TRY=1800;
  while(rooms.length<want&&guard++<TRY){
    /* 试了若干次还放不下，就把房子慢慢缩小、彼此的间距也收紧。
       原先始终按最大尺寸硬试，大图上试满 900 次平均只落得 2.5 间（设计要 4~7 间），
       战场比预期空了一大半。 */
    const k=guard/TRY;
    const w=RI(Math.max(170,230-Math.round(k*60)),Math.max(230,370-Math.round(k*140)));
    const h=RI(Math.max(150,180-Math.round(k*30)),Math.max(200,290-Math.round(k*90)));
    const x=RI(rx+BZ_WALL+96,rx+rw-BZ_WALL-96-w);
    const y=RI(ry+BZ_WALL+96,ry+rh-BZ_WALL-96-h);
    if(x<rx+BZ_WALL+40||y<ry+BZ_WALL+40)continue;
    const cells=[{x:x,y:y,w:w,h:h}];
    if(Math.random()<.62){
      const side=pick(['n','s','w','e']);
      const cw=RI(120,190),ch=RI(110,170),over=70;
      let c2;
      if(side==='e')     c2={x:x+w-over, y:y+RI(10,Math.max(11,h-ch-10)), w:cw,h:ch};
      else if(side==='w')c2={x:x-cw+over, y:y+RI(10,Math.max(11,h-ch-10)), w:cw,h:ch};
      else if(side==='s')c2={x:x+RI(10,Math.max(11,w-cw-10)), y:y+h-over, w:cw,h:ch};
      else               c2={x:x+RI(10,Math.max(11,w-cw-10)), y:y-ch+over, w:cw,h:ch};
      cells.push(c2);
    }
    let bad=false;
    const g=BZ_WALL*2+86-Math.round(k*50);
    for(const o of rooms){
      for(const oc of o.cells){
        for(const nc of cells){
          if(nc.x<oc.x+oc.w+g&&nc.x+nc.w+g>oc.x&&
             nc.y<oc.y+oc.h+g&&nc.y+nc.h+g>oc.y){bad=true;break;}
        }
        if(bad)break;
      }
      if(bad)break;
    }
    if(bad)continue;
    for(const a of avoid)if(a.x>x-120&&a.x<x+w+120&&a.y>y-120&&a.y<y+h+120){bad=true;break;}
    if(bad)continue;
    /* 整间屋子连墙都得落在不规则边界内，否则会出现半间屋子悬在禁区里 */
    const pad=BZ_WALL+18;
    for(const cc of cells){
      if(!bzPtInPoly(cc.x-pad,cc.y-pad,poly)||!bzPtInPoly(cc.x+cc.w+pad,cc.y-pad,poly)||
         !bzPtInPoly(cc.x-pad,cc.y+cc.h+pad,poly)||!bzPtInPoly(cc.x+cc.w+pad,cc.y+cc.h+pad,poly)){bad=true;break;}
    }
    if(bad)continue;
    /* 房子也不能盖在河上 —— 屋里是能走的，盖上去就成了"水上楼" */
    for(const cc of cells){
      if(bzInRiver(cc.x+cc.w/2,cc.y+cc.h/2)||bzInRiver(cc.x-pad,cc.y-pad)||
         bzInRiver(cc.x+cc.w+pad,cc.y+cc.h+pad)){bad=true;break;}
    }
    if(bad)continue;
    const r={x:x,y:y,w:w,h:h,cells:cells,doors:[],vault:false,lock:0,opened:false,
      rot:(Math.random()*6.28)|0};
    blazeMakeDoors(r);
    if(!r.doors.length)continue;
    /* 门口不能被岩石压住：岩石撞不烂也拆不掉，一封就是整间屋子进不去，
       屋里的箱子、守卫、保险箱全成了看得见拿不着的摆设（实测 17.8% 的局中招）。
       岩石是在房间之前滚出来的，所以只能在这里反过来校验。 */
    if(blazeDoorsBlocked(r,rk))continue;
    rooms.push(r);
  }
  return rooms;
}
/* 这间屋子的门口（含门外落脚区）有没有被岩石压住。
   判定取「门洞中心 → 门外落脚点」这一条进出通路上的三个采样点，
   任何一点落进岩石的安全距离内就算封死 —— 玩家是绕不过去的。 */
function blazeDoorsBlocked(r,rocks){
  if(!rocks||!rocks.length)return false;
  for(const d of (r.doors||[])){
    const dcx=d.x+d.w/2, dcy=d.y+d.h/2;
    const out=blazeDoorOutside(r,d);
    const pts=[[dcx,dcy],[(dcx+out.x)/2,(dcy+out.y)/2],[out.x,out.y]];
    for(const p of pts){
      for(const k of rocks){
        const dx=p[0]-k.x, dy=p[1]-k.y, rr=k.r+34;
        if(dx*dx+dy*dy<rr*rr)return true;
      }
    }
  }
  return false;
}
/* 开门：在主屋的边上挑位置，避开被耳房占掉的那一段，
   门外还得有落脚地（落点必须在不规则边界内） */
function blazeMakeDoors(r){
  const m=r.cells[0], blk=(r.cells.length>1)?r.cells[1]:null;
  const cands=[];
  ['n','s','w','e'].forEach(sd=>{
    const horiz=(sd==='n'||sd==='s');
    const len=horiz?m.w:m.h, start=horiz?m.x:m.y;
    [0.24,0.5,0.76].forEach(f=>{
      const pos=start+len*f;
      if(blk){
        const b0=horiz?blk.x:blk.y, b1=horiz?(blk.x+blk.w):(blk.y+blk.h);
        if(pos>b0-BZ_DOOR*0.62&&pos<b1+BZ_DOOR*0.62)return;  // 这段被耳房占了
      }
      let d;
      if(sd==='n')     d={x:pos-BZ_DOOR/2,y:m.y-BZ_WALL-5,   w:BZ_DOOR,  h:BZ_WALL+5};
      else if(sd==='s')d={x:pos-BZ_DOOR/2,y:m.y+m.h,         w:BZ_DOOR,  h:BZ_WALL+5};
      else if(sd==='w')d={x:m.x-BZ_WALL-5, y:pos-BZ_DOOR/2,  w:BZ_WALL+5,h:BZ_DOOR};
      else             d={x:m.x+m.w,       y:pos-BZ_DOOR/2,  w:BZ_WALL+5,h:BZ_DOOR};
      cands.push(d);
    });
  });
  const want=Math.random()<.45?2:1;
  shuffle(cands).slice(0,want).forEach(d=>r.doors.push(d));
}
/* 门外的落脚点（放"刷卡开门"的交互位用） */
function blazeDoorOutside(r,d){
  const cx=d.x+d.w/2, cy=d.y+d.h/2, m=r.cells[0];
  if(d.w>d.h){
    return {x:Math.round(cx),y:Math.round(cy<m.y+m.h/2 ? m.y-BZ_WALL-52 : m.y+m.h+BZ_WALL+52)};
  }
  return {x:Math.round(cx<m.x+m.w/2 ? m.x-BZ_WALL-52 : m.x+m.w+BZ_WALL+52),y:Math.round(cy)};
}
/* 在房间里找一个能站人的点（避开墙角），放保险箱 / 内卫 / 容器用 */
function blazeRoomSpot(r,margin){
  const m=margin||70;
  const c=pick(r.cells);
  return {x:Math.round(c.x+m+R(0,Math.max(1,c.w-m*2))),
          y:Math.round(c.y+m+R(0,Math.max(1,c.h-m*2)))};
}
/* 在房间里找一个「离已经摆好的东西尽量远」的点。
   一间接一间地往里塞箱子、守卫、保险箱时，纯随机取点迟早会叠在一起 ——
   画面上就是两个图标糊在一处，玩家还以为是一个点。 */
function blazeRoomSpotFar(r,margin,taken){
  let best=null,bd=-1;
  for(let k=0;k<14;k++){
    const p=blazeRoomSpot(r,margin);
    let d=1e9;
    for(const t of (taken||[]))d=Math.min(d,dist(p.x,p.y,t.x,t.y));
    if(d>bd){bd=d;best=p;}
    if(d>96)break;
  }
  return best||blazeRoomSpot(r,margin);
}

/* 房间标记：贴在屋子内侧的顶沿，带一层暗底衬。
   以前写在屋顶外面（m.y - 墙厚 - 36），屋子挨得近的时候，
   这块字就压到隔壁那间的墙上，和墙、和另一块字糊成一团 ——
   满地图找不出哪间才是保险箱房。 */
function blazeRoomTag(c,r,txt,sub,color){
  const m=r.cells[0];
  let sub2=sub, fs=26;
  c.save();
  c.textAlign='left';c.textBaseline='top';
  c.font='bold '+fs+'px system-ui,-apple-system,sans-serif';
  let w=c.measureText(txt).width;
  if(sub2){
    c.font='bold 19px system-ui,-apple-system,sans-serif';
    w=Math.max(w,c.measureText(sub2).width);
    /* 屋子太窄就只留主标题，宁可少一行也别把字溢出到屋外的墙上 */
    if(w+18>m.w-18){sub2='';fs=21;c.font='bold '+fs+'px system-ui,-apple-system,sans-serif';
      w=c.measureText(txt).width;}
  }
  const bw=Math.min(w+18,m.w-14), bh=sub2?54:32, bx=m.x+9, by=m.y+9;
  c.fillStyle='rgba(6,14,24,.66)';roundRect(c,bx,by,bw,bh,10);c.fill();
  c.strokeStyle='rgba(255,255,255,.13)';c.lineWidth=1.5;roundRect(c,bx,by,bw,bh,10);c.stroke();
  c.font='bold '+fs+'px system-ui,-apple-system,sans-serif';
  c.fillStyle=color;c.fillText(txt,bx+9,by+4);
  if(sub2){
    c.font='bold 19px system-ui,-apple-system,sans-serif';
    c.fillStyle='rgba(226,240,255,.82)';c.fillText(sub2,bx+9,by+30);
  }
  c.restore();
}

/* ---------- 把房间画到静态层上 ----------
   墙 = 所有 cell 各向外扩 BZ_WALL 的并集 − 房间内部 − 门洞。
   并集用一张离屏 canvas 合成（fill 并集 → destination-out 挖掉内部和门洞），
   L 形拐角处的内隔墙会自然消失，屋里是连通的。 */
function blazeDrawRooms(c){
  const mp=BZ.map;
  if(!mp||!mp.rooms)return;
  mp.rooms.forEach(r=>{
    /* 地板：实色深灰，不再是"黑色叠蓝地面"。
       旧版是 rgba(0,0,0,.34) 盖在蓝地面上 —— 结果房间内部只是
       "一块更深的蓝"，和外部地面同色系，屋子在哪全靠那圈 2px 描边找。
       改成低饱和的实色之后，房间内部立刻变成"另一种材质"，
       和冷色地面分得开；比地面更暗，也符合"室内背光"的直觉。 */
    c.save();
    c.fillStyle=r.vault?'rgba(38,26,16,.94)':'rgba(26,30,37,.92)';
    c.beginPath();r.cells.forEach(x=>c.rect(x.x,x.y,x.w,x.h));c.fill();
    c.save();
    c.beginPath();r.cells.forEach(x=>c.rect(x.x,x.y,x.w,x.h));c.clip();
    c.strokeStyle='rgba(255,255,255,.035)';c.lineWidth=2;
    r.cells.forEach(cc=>{
      for(let gx=cc.x+36;gx<cc.x+cc.w;gx+=36){c.beginPath();c.moveTo(gx,cc.y);c.lineTo(gx,cc.y+cc.h);c.stroke();}
      for(let gy=cc.y+36;gy<cc.y+cc.h;gy+=36){c.beginPath();c.moveTo(cc.x,gy);c.lineTo(cc.x+cc.w,gy);c.stroke();}
    });
    c.restore();
    c.restore();

    /* 墙体 */
    blazeDrawWalls(c,r);

    /* 门洞：地面刷一道亮色门槛，提示这里能进；锁着的门 / 封着的保险箱房刷红色铁闸 */
    (r.doors||[]).forEach(d=>{
      const locked=(r.lock>0&&!r.opened)||(r.vault&&!BZ.vaultOpen);
      c.save();
      if(locked){
        c.fillStyle='rgba(255,90,90,.24)';c.fillRect(d.x,d.y,d.w,d.h);
        c.strokeStyle='rgba(255,120,120,.8)';c.lineWidth=3;
        c.strokeRect(d.x,d.y,d.w,d.h);
        c.fillStyle='rgba(0,0,0,.42)';
        for(let i=d.x+6;i<d.x+d.w-2;i+=14)c.fillRect(i,d.y+2,7,d.h-4);
      }else{
        c.fillStyle=r.vault?'rgba(255,190,110,.22)':'rgba(150,200,255,.16)';
        c.fillRect(d.x,d.y,d.w,d.h);
      }
      c.restore();
    });

    /* 房间标记：保险箱房 / 上锁房间 */
    if(r.vault){
      c.save();
      c.strokeStyle='rgba(255,201,74,.55)';c.lineWidth=5;c.setLineDash([18,12]);
      r.cells.forEach(cc=>{c.beginPath();c.rect(cc.x+8,cc.y+8,cc.w-16,cc.h-16);c.stroke();});
      c.setLineDash([]);
      c.restore();
      const gn=blazeVaultGuards().length;
      blazeRoomTag(c,r,BZ.vaultOpen?'🔓 保险箱房':'🔒 保险箱房',
        BZ.vaultOpen?'守卫已清空 · 可以进屋':('还有 '+gn+' 名守卫 · 清完才进得去'),
        '#ffc94a');
    }else if(r.lock>0&&!r.opened){
      const card=BLAZE_CARD_OF[r.lock];
      blazeRoomTag(c,r,(card?card.e:'🔒')+' '+(card?card.n+'房间':''),'需要房卡',
        card?card.c:'#ffd76a');
    }
  });
}
function blazeDrawWalls(c,r){
  const W=BZ_WALL;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  r.cells.forEach(cc=>{
    x0=Math.min(x0,cc.x-W-8);y0=Math.min(y0,cc.y-W-8);
    x1=Math.max(x1,cc.x+cc.w+W+8);y1=Math.max(y1,cc.y+cc.h+W+8);
  });
  const w=Math.ceil(x1-x0),h=Math.ceil(y1-y0);
  if(!(w>0&&h>0&&w<4000&&h<4000))return;
  const off=document.createElement('canvas');
  off.width=w;off.height=h;
  const o=off.getContext('2d');
  o.translate(-x0,-y0);
  /* ① 墙体的外轮廓（并集）
     颜色从 #2b3546（冷蓝灰，和地面同色系）提到 #414a56 ——
     低饱和、偏中性、比地面亮一档。墙面比地面亮，这就是"实体"的视觉信号；
     旧值比地面还暗，墙只能在暗地上再压一层暗，屋子边缘全靠描边撑着。 */
  o.fillStyle=r.vault?'#5a3b22':'#414a56';
  o.beginPath();r.cells.forEach(cc=>o.rect(cc.x-W,cc.y-W,cc.w+2*W,cc.h+2*W));o.fill();
  /* ② 描边画在挖空之前，挖空后只剩外侧那一线，正好是墙的外沿 */
  o.strokeStyle=r.vault?'rgba(255,180,90,.55)':'rgba(255,255,255,.20)';
  o.lineWidth=2.5;
  o.beginPath();r.cells.forEach(cc=>o.rect(cc.x-W,cc.y-W,cc.w+2*W,cc.h+2*W));o.stroke();
  /* ③ 挖掉房间内部与开着的门洞 */
  o.globalCompositeOperation='destination-out';
  o.beginPath();
  r.cells.forEach(cc=>o.rect(cc.x,cc.y,cc.w,cc.h));
  if(!(r.lock>0&&!r.opened))(r.doors||[]).forEach(d=>o.rect(d.x,d.y,d.w,d.h));
  o.fill();
  o.globalCompositeOperation='source-over';
  /* ④ 墙顶高光，让楼看起来有厚度 */
  o.strokeStyle=r.vault?'rgba(255,200,120,.30)':'rgba(255,255,255,.16)';
  o.lineWidth=4;
  r.cells.forEach(cc=>{
    o.beginPath();o.moveTo(cc.x-W+3,cc.y-W+3);o.lineTo(cc.x+cc.w+W-3,cc.y-W+3);o.stroke();
  });
  c.save();
  c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=16;c.shadowOffsetY=6;
  c.drawImage(off,x0,y0);
  c.restore();
  c.drawImage(off,x0,y0);
}

