/* =========================================================
   🔥 烽火地带 · 实现
   ========================================================= */

/* ---------------- 小工具 ---------------- */
function blazeBar(pct,color){
  pct=clamp(pct,0,100);
  return `<div class="pbar" style="margin:2px 0 10px"><i style="width:${pct}%;background:${color||'#ffd76a'}"></i></div>`;
}
function blazeSigBar(){
  const pct=Math.max(0,BZ.sig)/Math.max(1,BZ.sigMax)*100;
  const col=pct>60?'#34c77b':(pct>30?'#ffd76a':'#ff6b6b');
  return `<div style="font-size:var(--fs-xs);color:#9cc0e0;margin-bottom:2px">
    📶 信号值 <b style="color:${col}">${Math.max(0,BZ.sig)} / ${BZ.sigMax}</b></div>`+blazeBar(pct,col);
}

/* =========================================================
   地图绘制：军事风战场
   ========================================================= */
/* 这一屏是「战场」还是「营地」？
   判据很干脆：有地形数据（BZ.map.poly）才是战场。
   掩体方块与地表碎石只画在战场上 —— 营地上铺这两层，
   玩家从基地进图时会看到"特勤处地面的石子还在、跟地图叠在一起"（4.0.13）。
   抽成函数是为了能钉一条冒烟检查，而不是靠人记住。 */
function bzNeedGroundFurniture(){
  return !!(BZ.map&&BZ.map.poly&&BZ.map.poly.length>=6);
}
function drawBlazeWorld(c,rnd){
  /* ================================================================
     战场底图（173.3 重做）
     ----------------------------------------------------------------
     旧版的问题不是"细节少"，而是**没有层次**：
     底色渐变 + 军事网格 + 满屏扫描线 + 焦土斜线 + 栅格线 + 掩体 + 装饰
     七层纹理全部挤在同一个明度区间里，地面和物件分不开，
     眼睛找不到"底"和"图"的分界 —— 这就是"乱"的真正来源。

     重做的原则只有一条：**地面退到后面去**。
       · 明度上：地面压到 6%~14%，道路/建筑/掩体留在 25%~45%，
         道具与玩家冲到 80% 以上 —— 三层台阶拉开，谁重要一眼分明
       · 纹理上：砍层数、砍密度、砍对比。装饰从"铺满"改成"点缀"
     底下四件事都围着这条原则做。
     ================================================================ */

  /* ---- ① 世界之外：最外圈的底色 ----
     注意这一层几乎全被后面覆盖（焦土外圈 + 战场地面都是不透明填充），
     只在画布最边缘露出来 —— 所以它只需要是"最暗的一档"，
     不需要渐变、不需要纹理。真正的地表质感画在战场内部（见 forEach 里那段）。 */
  c.fillStyle='#05080c';c.fillRect(0,0,W,H);

  /* 这块战场的可行走范围是一条不规则闭合折线；
     没有地形数据时（比如行动基地）退回原来的矩形画法。 */
  const poly=(BZ.map&&BZ.map.poly&&BZ.map.poly.length>=6)?BZ.map.poly:null;

  REGIONS.forEach(reg=>{
    const [x,y,w,h]=reg.rect;
    /* 战场之外：被炮火犁过一遍的无人区，压成焦土色，一眼看出"那边进不去"。
       焦土的语义色（近黑）本身已经说清楚了，斜纹只是佐料 ——
       旧版 64px 一道、2px 粗，铺满整个外圈，把"战场轮廓"这道最重要的
       边界信息反而盖住了。现在拉到 96px、浓度降到 1.8%，退成背景质感。 */
    c.save();
    c.fillStyle='#080b10';
    c.fillRect(x-70,y-70,w+140,h+140);
    c.strokeStyle=BZ_CLEAN?'rgba(255,90,60,.018)':'rgba(255,90,60,.05)';c.lineWidth=2;
    for(let k=-h;k<w;k+=(BZ_CLEAN?96:36)){
      c.beginPath();c.moveTo(x+k,y-70);c.lineTo(x+k+h,y+h+70);c.stroke();
    }
    c.restore();

    const gg=c.createLinearGradient(x,y,x,y+h);
    gg.addColorStop(0,reg.ground[0]);gg.addColorStop(1,reg.ground[1]);

    if(poly){
      /* —— 不规则地形：沿闭合折线填出真正的战场 —— */
      c.save();
      c.beginPath();bzPolyPath(c,poly);c.closePath();
      c.shadowColor='rgba(255,120,60,.42)';c.shadowBlur=46;
      c.fillStyle=reg.ground[1];c.fill();
      c.shadowBlur=0;
      c.fillStyle=gg;c.fill();
      c.restore();

      /* ---- 地表纹理层（173.3）------------------------------------
         这两样**必须**画在战场地面填色之后。
         地面用的是不透明渐变，画在它之前的任何纹理都会被整片盖掉 ——
         第一版把斑块和细网格留在全局层，结果一个都看不见，白画一场。
         贴着 poly 做 clip，让纹理只落在战场内部，渗不到焦土区去，
         也不会盖住后面才画的河流、道路、建筑。 */
      c.save();
      c.beginPath();bzPolyPath(c,poly);c.closePath();c.clip();

      /* ① 地貌斑块：18 个大尺寸柔斑，一半隆起一半凹下。
             目的是让地面"不平"，但**不形成任何可辨认的图形**。
             半径取到短边的 32%~74% —— 关键是让每个斑块的边缘落在画面之外：
             半径一小，圆心和边缘同时进画面，人立刻就能看出那是个圆
             （基地那张小图上尤其明显，像水面上的油渍）。
             边缘出画之后，剩下的只是"这片区域比那片亮一点"。
             透明度只给 1.4%~5.4%，再把"可见"压到最低。 */
      const mBlob=mulberry(90210);
      for(let i=0;i<18;i++){
        const bx=x+mBlob()*w, by=y+mBlob()*h;
        const br=Math.min(w,h)*(0.32+mBlob()*0.42);
        const up=mBlob()<.55;                // 一半亮（隆起），一半暗（凹地）
        const eg=c.createRadialGradient(bx,by,0,bx,by,br);
        eg.addColorStop(0,up?('rgba(140,180,230,'+(0.014+mBlob()*0.014).toFixed(3)+')')
                            :('rgba(0,0,0,'+(0.028+mBlob()*0.026).toFixed(3)+')'));
        eg.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=eg;c.beginPath();c.arc(bx,by,br,0,7);c.fill();
      }

      /* ② 坐标网格：从"一层网"降成"若有若无的刻度"。
             旧版 168px 一条，一屏十几条横竖线，再叠上满屏扫描线就是两层网。
             现在拉到 240px、浓度 3% —— 用途只是"报点说 C3 时心里有个方位"，
             不需要看清每一条线。 */
      const GRID=BZ_CLEAN?240:160;
      c.strokeStyle=BZ_CLEAN?'rgba(140,190,255,.022)':'rgba(140,190,255,.030)';
      c.lineWidth=2;
      for(let gx=x;gx<x+w;gx+=GRID){c.beginPath();c.moveTo(gx,y);c.lineTo(gx,y+h);c.stroke();}
      for(let gy=y;gy<y+h;gy+=GRID){c.beginPath();c.moveTo(x,gy);c.lineTo(x+w,gy);c.stroke();}

      /* ③ 细碎颗粒（4.0.17）：撒一层极淡的小点，让地面"有东西"。
             地面原来是纯渐变 + 十几个大柔斑，缩放后是一块干净的色板 ——
             干净到像占位图，"丑"很大一部分来自这里。
             颗粒必须压到 4~6% 浓度：再高一点就变成满屏噪点
             （173.3 那次"乱"的教训就是纹理浓度失控）。
             数量按面积算，每 12000 平方世界单位一颗，上限 900 颗 ——
             大图不会拖慢静态层构建。 */
      const mDot=mulberry(31337);
      const dotN=Math.min(900,Math.floor(w*h/(BZ_CLEAN?20000:12000)));
      for(let i=0;i<dotN;i++){
        const px=x+mDot()*w,py=y+mDot()*h,r3=1.6+mDot()*3.4;
        const light=mDot()<0.45;
        c.fillStyle=light?'rgba(200,222,255,.055)':'rgba(0,0,0,.10)';
        c.beginPath();c.arc(px,py,r3,0,7);c.fill();
      }

      /* ④ 内暗角（4.0.17）：沿战场边缘内侧压一圈暗影，视线自然收到中间。
             用"裁剪 + 粗描边"实现：描边一半落在外面，被 clip 吃掉，
             留下的正好是内侧那条渐变一样的暗带 —— 比逐点算距离便宜得多。 */
      c.strokeStyle='rgba(0,0,0,.30)';c.lineWidth=150;
      c.beginPath();bzPolyPath(c,poly);c.closePath();c.stroke();
      c.restore();

      /* 边界：外圈焦土带 + 内侧黄色警戒虚线 + 一圈暗边 */
      c.save();
      c.beginPath();bzPolyPath(c,poly);c.closePath();
      c.strokeStyle='rgba(255,140,70,.30)';c.lineWidth=18;c.stroke();
      c.setLineDash([20,14]);c.lineWidth=4;
      c.strokeStyle='rgba(255,215,106,.60)';c.stroke();
      c.setLineDash([]);
      c.lineWidth=2.5;c.strokeStyle=reg.edge;c.stroke();
      c.restore();
    }else{
      c.save();
      c.shadowColor='rgba(255,120,60,.45)';c.shadowBlur=40;
      c.fillStyle=reg.ground[1];roundRect(c,x,y,w,h,26);c.fill();c.restore();
      c.fillStyle=gg;roundRect(c,x,y,w,h,26);c.fill();
      /* 地表纹理：和上面 poly 分支用同一套。
         行动基地（无地形数据）也走这条分支 ——
         两个分支的观感必须一致，不然"进大厅"看着像换了个游戏。 */
      c.save();
      roundRect(c,x,y,w,h,26);c.clip();
      const mBlob2=mulberry(4477);
      for(let i=0;i<12;i++){
        const bx=x+mBlob2()*w, by=y+mBlob2()*h;
        /* 同 poly 分支：半径取大，让边缘出画，才不会看成一个个圆圈 */
        const br=Math.min(w,h)*(0.34+mBlob2()*0.42);
        const up=mBlob2()<.55;
        const eg2=c.createRadialGradient(bx,by,0,bx,by,br);
        eg2.addColorStop(0,up?('rgba(140,180,230,'+(0.013+mBlob2()*0.013).toFixed(3)+')')
                             :('rgba(0,0,0,'+(0.026+mBlob2()*0.024).toFixed(3)+')'));
        eg2.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=eg2;c.beginPath();c.arc(bx,by,br,0,7);c.fill();
      }
      const GRID2=BZ_CLEAN?240:160;
      c.strokeStyle=BZ_CLEAN?'rgba(140,190,255,.022)':'rgba(140,190,255,.030)';
      c.lineWidth=2;
      for(let gx=x;gx<x+w;gx+=GRID2){c.beginPath();c.moveTo(gx,y);c.lineTo(gx,y+h);c.stroke();}
      for(let gy=y;gy<y+h;gy+=GRID2){c.beginPath();c.moveTo(x,gy);c.lineTo(x+w,gy);c.stroke();}
      /* 颗粒与内暗角：和战场用同一套（进大厅不能像换了个游戏） */
      const mDot2=mulberry(31337);
      const dotN2=Math.min(900,Math.floor(w*h/(BZ_CLEAN?20000:12000)));
      for(let i=0;i<dotN2;i++){
        const px=x+mDot2()*w,py=y+mDot2()*h,r4=1.6+mDot2()*3.4;
        c.fillStyle=mDot2()<0.45?'rgba(200,222,255,.055)':'rgba(0,0,0,.10)';
        c.beginPath();c.arc(px,py,r4,0,7);c.fill();
      }
      c.strokeStyle='rgba(0,0,0,.26)';c.lineWidth=130;
      roundRect(c,x,y,w,h,26);c.stroke();
      c.restore();
      /* 营地设施：帐篷 / 物资箱 / 油桶 / 沙袋围栏（4.0.17） */
      blazeDrawCamp(c,reg);
      c.strokeStyle=reg.edge;c.lineWidth=7;roundRect(c,x,y,w,h,26);c.stroke();
      c.save();c.setLineDash([16,12]);c.lineWidth=3;
      c.strokeStyle='rgba(255,215,106,.5)';roundRect(c,x+11,y+11,w-22,h-22,18);c.stroke();
      c.setLineDash([]);c.restore();
    }

    /* —— 平面图四件套：栅格 → 河与桥 → 道路 → 分区 ——
       顺序不能乱：路要压在河上（过河只能走桥），楼和掩体要压在路上。 */
    const mp=BZ.map||{};
    drawBlazeGridLines(c,mp.grid,poly);
    if(mp.river)drawBlazeRiver(c,mp.river);
    if(mp.roads)drawBlazeRoads(c,mp.roads);
    if(mp.pois) drawBlazePois(c,mp.pois,false);

    /* 四角的瞄准框 */
    c.save();
    c.strokeStyle='rgba(255,215,106,.75)';c.lineWidth=5;const L=54;
    [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([px,py,sx,sy])=>{
      c.beginPath();c.moveTo(px+sx*L,py);c.lineTo(px,py);c.lineTo(px,py+sy*L);c.stroke();
    });
    c.restore();

    /* 地表家具（掩体方块 + 地表碎石）只属于战场 ——
       行动基地是营地，没有地形数据（poly 为空），这两层一律不画。
       以前基地走的是同一个循环，于是营地上也铺满了一圈灰色掩体块与碎石点：
       它和战场上的掩体长得一模一样，玩家从基地部署进图时，
       看到的就是「特勤处地面的石子还在，跟地图背景叠在一起」（4.0.13 修）。 */
    if(!bzNeedGroundFurniture())return;      // forEach 里没有 continue，用 return 收工
    c.save();
    if(poly){c.beginPath();bzPolyPath(c,poly);c.closePath();c.clip();}
    else {roundRect(c,x+10,y+10,w-20,h-20,20);c.clip();}
    const r2=mulberry(reg.rect[0]*17+reg.rect[1]*7+2121);
    /* 先把这块地上「已经有东西」的位置登记下来：房间连墙、岩石、撤离点、
       所有点位，一律不许再往上贴图。
       掩体和装饰以前是纯随机撒的：压在墙上、压在石头上、彼此叠在一起，
       半透明的方块一叠就是一团深色的糊 —— 看着像地形，其实什么都不是。 */
    const mp0=BZ.map||{};
    const busy=[];
    (mp0.rooms||[]).forEach(rm=>(rm.cells||[]).forEach(cc=>
      busy.push({x0:cc.x-BZ_WALL-6,y0:cc.y-BZ_WALL-6,
                 x1:cc.x+cc.w+BZ_WALL+6,y1:cc.y+cc.h+BZ_WALL+6})));
    (mp0.rocks||[]).forEach(k=>busy.push({cx:k.x,cy:k.y,r:k.r+20}));
    SPOTS.forEach(sp=>busy.push({cx:sp.x,cy:sp.y,r:sp.t==='exfil'?80:52}));
    const hitBusy=(px,py,pad)=>{
      for(let i2=0;i2<busy.length;i2++){
        const b=busy[i2];
        if(b.cx!=null){
          const dx=px-b.cx,dy=py-b.cy,rr=b.r+pad;
          if(dx*dx+dy*dy<rr*rr)return true;
        }else if(px>b.x0-pad&&px<b.x1+pad&&py>b.y0-pad&&py<b.y1+pad)return true;
      }
      return false;
    };
    /* 掩体与地表装饰是真·噪音大户：高考档 1460x1060 的图上原来要撒 59 个掩体 +
       250 处装饰，一屏里和物资箱、巡逻队、分区地名混在一起，根本分不清哪个是目标。
       简洁档掩体减到约六成、装饰减到约一半，剩下的仍是随机分布，地形观感不变。 */
    for(let i=0;i<Math.floor(w*h/(BZ_CLEAN?42000:26000));i++){
      const bw=R(46,120),bh=R(34,86);
      const bx=x+30+r2()*(w-60-bw),by=y+30+r2()*(h-60-bh);
      /* 掩体如果落到禁区或墙里，就成了"看得见绕不过去"的假地形 */
      if(!blazeWalkable(bx+bw/2,by+bh/2))continue;
      const rad=Math.max(bw,bh)/2;
      /* 与楼、石头、点位、以及别的掩体都留出空档：两块掩体叠在一起
         就是一团圆角矩形的深色斑，谁也看不出那是两个掩体 */
      if(hitBusy(bx+bw/2,by+bh/2,rad+14))continue;
      busy.push({cx:bx+bw/2,cy:by+bh/2,r:rad});
      /* 掩体是"挡人也挡视线"的实体，必须让人一眼认出它是块东西。
         旧版只在深色地面上又压了一层 rgba(0,0,0,.30) ——
         结果就是"比地面更黑的一滩"，形状糊在背景里，看着像污渍。
         现在按"实体"来画，三条一起立：投影让它离地、顶面柔亮让它有厚度、
         顶沿一线冷光勾出朝向。
         注意别用"纯色块 + 一条高光带"——那条带子近景看就是一横白线，
         像贴在方块上的纸条；改成渐变里自带亮段才自然。 */
      c.fillStyle='rgba(0,0,0,.45)';roundRect(c,bx+2.5,by+6,bw,bh,8);c.fill();
      const bgc=c.createLinearGradient(bx,by,bx,by+bh);
      bgc.addColorStop(0,'rgba(82,89,100,.94)');
      bgc.addColorStop(.25,'rgba(60,66,76,.93)');
      bgc.addColorStop(1,'rgba(36,41,49,.93)');
      c.fillStyle=bgc;roundRect(c,bx,by,bw,bh,8);c.fill();
      c.strokeStyle='rgba(190,210,235,.20)';c.lineWidth=1.6;
      c.beginPath();c.moveTo(bx+7,by+1.2);c.lineTo(bx+bw-7,by+1.2);c.stroke();
      c.strokeStyle='rgba(160,180,205,.14)';c.lineWidth=1.6;
      roundRect(c,bx,by,bw,bh,8);c.stroke();
    }
    /* 地表装饰：从"撒满"改成"点缀"。
       旧版每 12000 平方单位撒一个（1460×1060 的图上约 129 个），
       满屏小图形和掩体、箱子、点位混在一起，根本分不清哪个是目标 ——
       这是"乱"的第二个来源（头一个是扫描线）。
       现在密度砍到 1/3、透明度再压一档：让它退成"地表质感"，
       只在视线停下时偶尔瞥见，不参与"这是什么"的判断。 */
    const style=PROP_STYLE[reg.id]||'dot';
    for(let i=0;i<Math.floor(w*h/(BZ_CLEAN?34000:6200));i++){
      const px=x+24+r2()*(w-48),py=y+24+r2()*(h-48);
      if(!blazeWalkable(px,py))continue;          // 别把装饰画进墙里或禁区里
      if(hitBusy(px,py,26))continue;              // 也别叠在掩体 / 石头 / 点位上
      busy.push({cx:px,cy:py,r:24});
      drawProp(c,style,px,py,8+r2()*5,r2()*6.28,reg.edge,
               (BZ_CLEAN?.05:.13)+r2()*(BZ_CLEAN?.06:.15));
    }
    c.restore();
  });

  /* ---- 障碍：岩石与集装箱堆，挡人也挡视线 ---- */
  if(BZ.map&&BZ.map.rocks&&BZ.map.rocks.length)drawBlazeRocks(c,BZ.map.rocks);

  /* ---- 建筑地坪（4.0.17）：楼脚下先铺一块混凝土 ----
     旧版的楼是直接贴在渐变地面上的，中间没有任何过渡 ——
     所以看着像"浮在地图上的几个方块"。先铺地坪（比地面亮一点、
     带一圈更亮的边），楼才算"落在地面上"：这是这次改动里观感提升最大的一步。
     顺序：地表家具之后、建筑之前。 */
  if(BZ.map&&BZ.map.rooms&&BZ.map.rooms.length)blazeDrawSlabs(c,BZ.map.rooms);

  /* ---- 建筑：地板 → 墙体（L 形房间用离屏合成一次挖出来） ---- */
  if(BZ.map&&BZ.map.rooms&&BZ.map.rooms.length)blazeDrawRooms(c);

  /* 撤离点：地面上画停机坪标记，跑图时一眼能看见 */
  SPOTS.forEach(s=>{
    if(s.t!=='exfil')return;
    c.save();
    c.strokeStyle='rgba(94,214,255,.85)';c.lineWidth=5;
    c.beginPath();c.arc(s.x,s.y,44,0,7);c.stroke();
    c.setLineDash([13,11]);c.strokeStyle='rgba(94,214,255,.42)';c.lineWidth=3;
    c.beginPath();c.arc(s.x,s.y,62,0,7);c.stroke();c.setLineDash([]);
    c.fillStyle='rgba(94,214,255,.13)';c.beginPath();c.arc(s.x,s.y,44,0,7);c.fill();
    c.fillStyle='rgba(94,214,255,.92)';
    c.font='bold 40px system-ui,-apple-system,sans-serif';
    c.textAlign='center';c.textBaseline='middle';
    c.fillText('H',s.x,s.y+2);
    c.restore();
  });

  /* 分区地名与栅格坐标画在最上层：跑图时抬头就知道自己在哪一格、哪个区 */
  if(BZ.map&&BZ.map.pois)drawBlazePois(c,BZ.map.pois,true);
  if(BZ.map&&BZ.map.grid)drawBlazeGridLabels(c,BZ.map.grid);
}

