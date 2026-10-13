/* =========================================================
   战术平面图：栅格 · 水系 · 分区 · 道路
   —— 这四样把战场从"一块空地"变成一张能报点、能记路的地图
   ========================================================= */
/* ---------- 栅格坐标（A1 / C4 …）----------
   战术地图上那条网格不是装饰：队内报点说的是"C4 变电站"，
   有了它，"物资箱在东北方向"才有明确落点。 */
const BZ_M_PER_UNIT=2;          // 1 世界单位 ≈ 2 米：战区短边 880 ≈ 1.8 km
function blazeGridOfRect(rect){
  const [rx,ry,rw,rh]=rect;
  const cols=8, rows=clamp(Math.round(cols*rh/rw),5,8);
  return {x:rx,y:ry,w:rw,h:rh,cols:cols,rows:rows,cw:rw/cols,ch:rh/rows};
}
function blazeGridOf(x,y){
  const mp=(CUR===BLAZE)?BZ.map:null;
  const g=mp&&mp.grid;
  if(!g)return '';
  const cx=Math.floor((x-g.x)/g.cw), ry=Math.floor((y-g.y)/g.ch);
  if(cx<0||cx>=g.cols||ry<0||ry>=g.rows)return '';
  return String.fromCharCode(65+cx)+(ry+1);
}
/* 报点时挂在名字后面的「· C4」 */
function bzGridTag(s){
  const g=blazeGridOf(s.x,s.y);
  return g?' · '+g:'';
}

/* ---------- 点到线段的距离（水系判定要用） ---------- */
function bzSegDist(px,py,x1,y1,x2,y2){
  const dx=x2-x1, dy=y2-y1, L=dx*dx+dy*dy;
  const t=L?clamp(((px-x1)*dx+(py-y1)*dy)/L,0,1):0;
  return Math.hypot(px-(x1+dx*t), py-(y1+dy*t));
}
/* 折线上按比例取点：返回位置与走向（桥要顺着水流方向摆） */
function bzPathAt(pts,t){
  const n=pts.length;
  if(n<2)return {x:pts[0][0],y:pts[0][1],a:0};
  let L=0;const seg=[];
  for(let i=0;i<n-1;i++){
    const l=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);
    seg.push(l);L+=l;
  }
  let d=clamp(t,0,1)*L;
  for(let i=0;i<seg.length;i++){
    if(d<=seg[i]||i===seg.length-1){
      const u=seg[i]?(d/seg[i]):0;
      return {x:pts[i][0]+(pts[i+1][0]-pts[i][0])*u,
              y:pts[i][1]+(pts[i+1][1]-pts[i][1])*u,
              a:Math.atan2(pts[i+1][1]-pts[i][1],pts[i+1][0]-pts[i][0])};
    }
    d-=seg[i];
  }
}

/* ---------- 水系：一条斜穿战区的河 + 三座桥 ----------
   零号大坝、长弓溪谷这些图都有水：它把战区切成两半，
   过河只能走桥 —— 于是"从哪座桥过"就成了跑图的第一个决策。 */
function blazeGenRiver(rect,seed){
  const [rx,ry,rw,rh]=rect;
  const rnd=mulberry((seed|0)^0x1d7f);
  const j=()=>0.28+rnd()*0.44;
  const pts=[],vert=rnd()<.5;
  if(vert){
    const x0=rx+rw*j(), x1=rx+rw*j();
    pts.push([x0,ry-45]);
    for(let i=1;i<4;i++){
      const u=i/4;
      pts.push([x0+(x1-x0)*u+(rnd()-.5)*rw*0.18, ry+rh*u+(rnd()-.5)*rh*0.10]);
    }
    pts.push([x1,ry+rh+45]);
  }else{
    const y0=ry+rh*j(), y1=ry+rh*j();
    pts.push([rx-45,y0]);
    for(let i=1;i<4;i++){
      const u=i/4;
      pts.push([rx+rw*u+(rnd()-.5)*rw*0.10, y0+(y1-y0)*u+(rnd()-.5)*rh*0.18]);
    }
    pts.push([rx+rw+45,y1]);
  }
  const half=Math.round(30+rnd()*14);
  /* 桥：沿河挑三处，t 避开两端，免得半座桥悬在战区外面 */
  const bridges=[];
  [0.26,0.55,0.80].forEach(t=>{
    const p=bzPathAt(pts,clamp(t+(rnd()-.5)*0.05,0.12,0.88));
    bridges.push({x:Math.round(p.x),y:Math.round(p.y),a:p.a,
      len:half*2+140, wid:104});
  });
  return {pts:pts,half:half,bridges:bridges};
}
/* 这一点是不是落在水里（桥面除外）—— 水是过不去的地形，不是装饰 */
function bzInRiver(x,y){
  const mp=(CUR===BLAZE)?BZ.map:null;
  const rv=mp&&mp.river;
  if(!rv||!rv.pts||rv.pts.length<2)return false;
  const br=rv.bridges||[];
  for(let i=0;i<br.length;i++){
    const b=br[i], ca=Math.cos(b.a), sa=Math.sin(b.a);
    const dx=x-b.x, dy=y-b.y;
    const lx=dx*ca+dy*sa, ly=-dx*sa+dy*ca;      // 局部坐标：lx 顺流 · ly 横跨
    if(Math.abs(lx)<=b.wid/2&&Math.abs(ly)<=b.len/2)return false;
  }
  for(let i=0;i<rv.pts.length-1;i++){
    const a=rv.pts[i], b=rv.pts[i+1];
    if(bzSegDist(x,y,a[0],a[1],b[0],b[1])<rv.half)return true;
  }
  return false;
}

/* ---------- 道路网：把分区串起来，过河一律绕桥 ---------- */
function blazeGenRoads(pois,river,seed){
  const n=pois.length;
  if(n<2)return [];
  const rnd=mulberry((seed|0)^0x77c1);
  const inx=[0],edges=[];
  const has=j=>inx.indexOf(j)>=0;
  /* 最小生成树：保证每个区都通路，又不会连成一张密密麻麻的网 */
  while(inx.length<n){
    let bi=-1,bj=-1,bd=1e18;
    for(const i of inx)for(let j=0;j<n;j++){
      if(has(j))continue;
      const d=dist(pois[i].x,pois[i].y,pois[j].x,pois[j].y);
      if(d<bd){bd=d;bi=i;bj=j;}
    }
    if(bj<0)break;
    inx.push(bj);edges.push([bi,bj,46]);
  }
  /* 再补两条支路：只有生成树的话，跑图永远得原路返回，没有"绕一圈"的选择 */
  for(let k=0;k<2;k++){
    const i=Math.floor(rnd()*n);
    const near=pois.map((p,j)=>({j:j,d:dist(pois[i].x,pois[i].y,p.x,p.y)}))
                   .filter(o=>o.j!==i).sort((a,b)=>a.d-b.d);
    const j=near[1]?near[1].j:-1;
    if(j<0)continue;
    if(edges.some(e=>(e[0]===i&&e[1]===j)||(e[0]===j&&e[1]===i)))continue;
    edges.push([i,j,32]);
  }
  return edges.map(e=>({w:e[2],
    pts:blazeRoadPath({x:pois[e[0]].x,y:pois[e[0]].y},
                      {x:pois[e[1]].x,y:pois[e[1]].y},river)}));
}
/* 两点之间的路：不跨河就直连；跨河就把最近的那座桥串进来。
   桥是唯一的过河处，路于是自然在桥头汇合 ——
   玩家不用猜"水能不能趟过去"，看路的走向就知道该从哪儿过。 */
function blazeRoadPath(a,b,river){
  const pts=[[a.x,a.y]];
  if(blazeCrossRiver(a,b,river)){
    const br=blazeNearestBridge(river,(a.x+b.x)/2,(a.y+b.y)/2);
    if(br){
      const ax=-Math.sin(br.a), ay=Math.cos(br.a);   // 横跨水流的方向
      const d=br.len/2-30;
      const p1={x:br.x+ax*d,y:br.y+ay*d}, p2={x:br.x-ax*d,y:br.y-ay*d};
      if(dist(a.x,a.y,p1.x,p1.y)<=dist(a.x,a.y,p2.x,p2.y))pts.push([p1.x,p1.y],[p2.x,p2.y]);
      else pts.push([p2.x,p2.y],[p1.x,p1.y]);
    }
  }
  pts.push([b.x,b.y]);
  return pts;
}
function blazeCrossRiver(a,b,river){
  if(!river||!river.pts||river.pts.length<2)return false;
  for(let i=0;i<24;i++){
    const u=i/23, x=a.x+(b.x-a.x)*u, y=a.y+(b.y-a.y)*u;
    for(let k=0;k<river.pts.length-1;k++){
      const p=river.pts[k], q=river.pts[k+1];
      if(bzSegDist(x,y,p[0],p[1],q[0],q[1])<river.half+10)return true;
    }
  }
  return false;
}
function blazeNearestBridge(river,x,y){
  let best=null,bd=1e18;
  (river.bridges||[]).forEach(b=>{
    const d=dist(x,y,b.x,b.y);
    if(d<bd){bd=d;best=b;}
  });
  return best;
}

/* ---------- 分区：模板比例 → 这张图的绝对坐标 ---------- */
function blazeGenPois(siteId,rect){
  const [rx,ry,rw,rh]=rect;
  const tpl=BLAZE_POI[siteId]||BLAZE_POI.math;
  const m=Math.min(rw,rh);
  return tpl.map((p,i)=>({i:i,n:p.n,e:p.e,hot:p.hot||1,
    x:Math.round(rx+rw*p.x), y:Math.round(ry+rh*p.y),
    r:Math.round(m*(p.r||0.16))}));
}
/* 人现在站在哪个区里（不在任何区里就返回 null） */
function blazePoiAt(x,y){
  const mp=(CUR===BLAZE)?BZ.map:null;
  const ps=mp&&mp.pois;
  if(!ps)return null;
  let best=null,bd=1e18;
  for(const p of ps){
    const d=dist(x,y,p.x,p.y);
    if(d<=p.r&&d<bd){bd=d;best=p;}
  }
  return best;
}
/* 按资源等级轮转分配目标区：hot 越高摊得越多 */
function blazePoiQueue(pois){
  const q=[];
  pois.forEach(p=>{for(let i=0;i<(p.hot||1)+1;i++)q.push(p);});
  return shuffle(q);
}

/* ---------- 障碍：岩石 / 集装箱堆 ---------- */
function blazeGenRocks(poly,rx,ry,rw,rh,seed,avoid){
  const rnd=mulberry((seed|0)^0x5f3a),out=[],n=RI(9,15);
  for(let i=0;i<n;i++){
    const p=bzRandPoint(poly,rx,ry,rw,rh,rnd,90);
    if(!p)continue;
    /* 石头不滚进河里：河面本来就过不去，再压块石头只是白占一处地形 */
    if(bzInRiver(p.x,p.y))continue;
    const r=RI(26,54);
    let bad=false;
    for(const a of avoid)if(dist(p.x,p.y,a.x,a.y)<a.m+r+70){bad=true;break;}
    if(!bad)for(const o of out)if(dist(p.x,p.y,o.x,o.y)<o.r+r+150){bad=true;break;}
    if(bad)continue;
    out.push({x:Math.round(p.x),y:Math.round(p.y),r:r,seed:RI(1,99999)});
  }
  return out;
}
function drawBlazeRocks(c,rocks){
  (rocks||[]).forEach(k=>{
    const rnd=mulberry(k.seed);
    c.save();
    /* 先铺一圈焦土，让岩石像是"长"在地上而不是贴上去的 */
    c.fillStyle='rgba(0,0,0,.34)';
    c.beginPath();c.ellipse(k.x,k.y+4,k.r*1.15,k.r*0.62,0,0,7);c.fill();
    /* 不规则多边形：判定用的是半径 k.r 的圆，绘制时让顶点在 0.92~1.12 倍浮动，
       视觉轮廓和碰撞圆基本贴合，不会出现"看着能过其实卡住" */
    c.beginPath();
    const n=7+Math.floor(rnd()*4);
    for(let i=0;i<n;i++){
      const a=i/n*6.283, rr=k.r*(0.92+rnd()*0.20);
      const px=k.x+Math.cos(a)*rr, py=k.y+Math.sin(a)*rr*0.86;
      i?c.lineTo(px,py):c.moveTo(px,py);
    }
    c.closePath();
    /* 岩石和掩体一样属于"实体"，走同一套中性灰阶（不再是蓝灰）——
       全场只有地面和水用蓝色，实体一律灰，两套色语言互不干扰。 */
    const g=c.createLinearGradient(k.x,k.y-k.r,k.x,k.y+k.r);
    g.addColorStop(0,'#525963');g.addColorStop(1,'#262b33');
    c.fillStyle=g;c.fill();
    c.strokeStyle='rgba(255,255,255,.20)';c.lineWidth=2;c.stroke();
    c.fillStyle='rgba(255,255,255,.13)';
    c.beginPath();c.ellipse(k.x-k.r*0.22,k.y-k.r*0.32,k.r*0.44,k.r*0.24,-0.42,0,7);c.fill();
    c.restore();
  });
}

