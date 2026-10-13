/* =========================================================
   判定 · 名牌 · 互动键
   ========================================================= */
/* 这座容器所在房间里还有活着的守卫吗 —— 有就打不开。
   不传参数时指保险箱房（任务条上的那句"还有 N 名守卫"）。 */
function blazeVaultGuards(spot){
  let room=spot?spot.room:null;
  if(!room)room=(BZ.map&&BZ.map.vault)||null;
  if(!room)return BLAZE_SPOTS.filter(s=>s.t==='guard'&&!s.dead);
  return BLAZE_SPOTS.filter(s=>s.t==='guard'&&!s.dead&&s.room===room);
}
function blazeSpotDone(s){
  if(!BZ.active)return false;
  if(s.t==='crate') return !!s.looted;
  if(s.t==='vault') return !!s.looted;
  if(s.t==='patrol')return !!s.dead;
  if(s.t==='guard') return !!s.dead;
  if(s.t==='door')  return !!s.opened;
  return false;                      // 撤离点永远可交互
}
function blazeSpotLabel(s){
  if(!BZ.active)return s.t==='lobby'?'🎖️ 指挥部':'目标';
  if(s.t==='crate') return '📦 物资箱'+bzGridTag(s);
  if(s.t==='vault') return (s.locked?'🔒 '+(s.name||'保险箱')+'（守卫未清）':(s.name||'保险箱'))+bzGridTag(s);
  if(s.t==='guard') return '💂 '+(s.name||'守卫')+'（精锐 · 打掉他才进得去）';
  if(s.t==='patrol')return '👾 巡逻队'+bzGridTag(s);
  if(s.t==='guard') return '💂 '+(s.name||'守卫')+'（精锐）';
  if(s.t==='exfil') return '🚁 '+(s.name||'撤离点')+bzGridTag(s);
  if(s.t==='door'){
    const c=BLAZE_CARD_OF[s.card]||{};
    return s.opened?('🔓 已刷开 · '+(c.n||'上锁')+'房间')
                   :('🔒 '+(c.n||'上锁')+'房间 · 需'+(c.n||'房卡')+bzGridTag(s));
  }
  return '目标';
}
let blazeBtnCache='';
function blazeActBtn(spot,btn,hint){
  if(!spot||BZ.busy){btn.classList.remove('show');hint.classList.remove('show');blazeBtnCache='';return;}
  let t,blocked=false;
  if(!BZ.active)t='🎖️ 指挥部';
  else if(spot.t==='crate') t='📦 搜索';
  else if(spot.t==='vault'){
    const g=blazeVaultGuards(spot);
    if(g.length){t='🔒 有人守着';blocked=true;}
    else if(spot.needKey&&!(BZ.gear&&BZ.gear.key)){t='🔑 需要钥匙卡';blocked=true;}
    else t='🔓 开保险箱';
  }
  else if(spot.t==='door'){
    const c=BLAZE_CARD_OF[spot.card];
    if(spot.opened)t='🔓 门已开';
    else if(BZ.gear&&(BZ.gear['kc'+spot.card]|0)>0)t='🔑 刷卡开门';
    else{t='🔒 需要'+(c?c.n:'房卡');blocked=true;}
  }
  else if(spot.t==='guard') t='💥 强攻';
  else if(spot.t==='patrol')t='💥 交火';
  else if(spot.t==='exfil') t='🚨 撤离';
  else t='🔍 查看';
  if(t!==blazeBtnCache){btn.textContent=t;blazeBtnCache=t;}
  btn.classList.add('show');hint.classList.remove('show');
  /* 条件不满足时按键变灰，但还留着 —— 点一下会弹出原因 */
  btn.style.filter=blocked?'grayscale(.75) brightness(.8)':'';
}

/* =========================================================
   单题问答（烽火的每一次交互都是一道题）
   —— 不走思路层：搜打撤讲的是节奏，两步答题会拖慢心跳
   ========================================================= */
function blazeAsk(o){
  /* 172 版起：烽火直接从真题池抽（跳过「思路·」元问题），抽完就答，不走思路环节 */
  const q=genQuestion(o.rid,o.tier,1);
  const opts=q.opts.slice();
  BZ.busy=true;
  /* 烽火里也能要思路：花哈夫币让指挥部递一层进来，最多两层。
     同样是给思路，不是划选项 —— 战场上最值钱的从来不是答案本身。 */
  const chain=buildHintChain(q,null).slice(0,2);
  let hintLv=0;
  openPanel(`
    <h2>${o.title}</h2>
    <div class="sub">${esc(o.sub||'')}</div>
    ${o.bar||''}
    <div style="text-align:center"><span class="qtag">${esc(o.tag||'')}</span>${srcBadge(q.src,q.qt)}</div>
    <div class="qtext">${esc(q.text)}</div>${qFigHtml(q)}
    ${lingStrip(q)}
    <div class="opts">${opts.map((v,i)=>`<div class="opt" data-i="${i}">${esc(v)}</div>`).join('')}</div>
    <div id="hintBox"></div>
    <div id="feedback"></div>
    <div class="row">
      <button class="btn" id="hintBtn">💡 要思路（${BLAZE_HINT_COST} 🪙）</button>
      <button class="btn primary" id="nextBtn" style="display:none">${esc(o.nextText||'继续 →')}</button>
    </div>
  `,1);
  const hb=$('hintBtn');
  if(hb)hb.onclick=()=>{
    if(hintLv>=chain.length){toast('指挥部也没更多话要说了');return;}
    if((BLAZE_STATE.crystals|0)<BLAZE_HINT_COST){toast('仓库结晶不够（需要 '+BLAZE_HINT_COST+' 🪙）');return;}
    BLAZE_STATE.crystals=(BLAZE_STATE.crystals|0)-BLAZE_HINT_COST;
    hintLv++;save();updateHUD();
    const box=$('hintBox');
    if(box)box.innerHTML=hintBoxHtml(chain,hintLv);
    if(hintLv>=chain.length)hb.textContent='💡 思路已给完';
    else hb.textContent='💡 再要一层（'+BLAZE_HINT_COST+' 🪙）';
    if(hintLv>=chain.length)hb.disabled=true;
    SFX.open();
    panel.scrollTop=panel.scrollHeight;
  };
  let locked=false;
  panel.querySelectorAll('.opt').forEach(el=>{
    el.addEventListener('click',()=>{
      if(locked)return;locked=true;
      if(hb)hb.disabled=true;   // 已经下笔了就不再卖思路
      const i=+el.dataset.i, ok=opts[i]===q.ansText;
      panel.querySelectorAll('.opt').forEach(e2=>{
        const k=+e2.dataset.i;e2.classList.add('locked');
        if(opts[k]===q.ansText)e2.classList.add('right');
        else if(k===i)e2.classList.add('wrong');
        else e2.classList.add('dim');
      });
      const fb=$('feedback');
      if(ok){
        BLAZE_STATE.totalRight=(BLAZE_STATE.totalRight||0)+1;
        SFX.right();fb.className='ok';
        fb.innerHTML=`✅ 答对！${o.okText?'<div class="exp">'+esc(o.okText)+'</div>':''}`;
        /* 思路灵：战场上花钱要过思路，同样不算独立解出 */
        try{lingJudge(q,true,hintLv>0);}catch(e){}
      }else{
        BLAZE_STATE.totalWrong=(BLAZE_STATE.totalWrong||0)+1;
        SFX.wrong();fb.className='no';
        fb.innerHTML=`❌ 正确答案：<b>${esc(q.ansText)}</b><div class="exp">💡 ${esc(q.exp)}</div>`;
      }
      $('nextBtn').style.display='block';
      $('nextBtn').onclick=()=>{
        BZ.busy=false;
        const seq=panelSeq;
        /* onDone 里干的是「结算 / 开下一题」这类重活（撤离最后一波就是结算）。
           它一抛异常，下面这层兜底就注册不上：面板锁着、人还站在战场上，
           整局就此断死。所以兜底要放在 finally 里，保证一定挂得上。 */
        try{o.onDone&&o.onDone(ok);}
        catch(err){console.error('[blaze] onDone 异常',err);}
        finally{
          /* 兜底：如果 onDone 既没关面板、也没开新面板（连打题的下一题要等
             280~300ms 才到，比这个 420ms 早），说明这一轮问答已经走完，
             替它把关掉，避免任何调用点漏了 closePanel 就锁死整局。 */
          setTimeout(()=>{
            if(modal.classList.contains('show')&&panelSeq===seq)closePanel();
          },420);
        }
      };
    });
  });
}

/* =========================================================
   地形：不规则战场 · 建筑 · 墙体 · 门洞 · 障碍
   —— 可行走区不再是一个矩形，而是一条闭合折线（噪声推出来的"岸线"），
      折线以外全是焦土禁区，走不过去也看不见任何东西。
   —— 房间由 1~2 个矩形拼成（L 形 / T 形），内部可走；
      墙 = 房间向外扩 BZ_WALL 的那一圈减去门洞。
      判定与绘制共用同一组矩形，不会出现"看着有门却走不进去"的错位。
   —— 另外撒一批岩石 / 集装箱堆做掩体，逼着玩家在地形里绕路。
   ========================================================= */
const BZ_WALL=26;    // 墙厚
const BZ_DOOR=104;   // 门宽

/* ---------- 不规则边界 ---------- */
function bzPolyPath(c,poly){
  c.moveTo(poly[0],poly[1]);
  for(let i=2;i<poly.length;i+=2)c.lineTo(poly[i],poly[i+1]);
  c.closePath();
}
/* 射线法：点是否落在闭合折线内（poly 为 [x0,y0,x1,y1,…]） */
function bzPtInPoly(x,y,poly){
  let inside=false;
  const n=poly.length;
  for(let i=0,j=n-2;i<n;j=i,i+=2){
    const xi=poly[i],yi=poly[i+1],xj=poly[j],yj=poly[j+1];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
/* 生成战区轮廓 —— 方形战术地图，不是圆盘。
   三角洲行动的地图（零号大坝 / 长弓溪谷 / 攀升 …）都是一块矩形战区：
   边界是直的、四个角斜切掉一块，边上啃出几处内凹的湾和外凸的岬，
   绝不是一整个圆。这里照那个形状来：
   ① 取矩形四边，四角按 45° 斜切（战术地图最典型的轮廓）
   ② 每条长边吃 1~2 段低频"湾 / 岬"，法向幅度只有短边的 4%~9%
      —— 再大就又变成圆盘了，再小就成了纯矩形、跑图没有辨识度
   ③ 最后按角度重采样成 96 个点：矩形顶点要是直接当边界点，
      撤离点按角度布点时会全挤在四个角上；重采样后 96 个点均匀覆盖
      360°，撤离点才会沿四条边摊开（bzEdgePoint 是按角度找点的）。
   同一个 seed 下凹凸位置固定 —— 跑第二趟能记住"那个缺口在哪"。 */
function blazeGenPoly(rect,seed){
  const [rx,ry,rw,rh]=rect;
  const rnd=mulberry((seed|0)^0x2b7a);
  const cx=rx+rw/2, cy=ry+rh/2;
  /* 斜切角：短边的 8%~14%，切太深战区就成了八边形 */
  const cut=Math.round(Math.min(rw,rh)*(0.08+rnd()*0.06));
  const L=rx,T=ry,Ri=rx+rw,B=ry+rh;
  /* 顺时针列出斜切后的 8 个角点（偶数是长边、奇数是斜切小边） */
  const corners=[
    [L+cut,T],[Ri-cut,T],[Ri,T+cut],[Ri,B-cut],
    [Ri-cut,B],[L+cut,B],[L,B-cut],[L,T+cut]
  ];
  const out=[];
  const SEG=10;
  for(let i=0;i<8;i++){
    const a=corners[i], b=corners[(i+1)%8];
    const dx=b[0]-a[0], dy=b[1]-a[1], len=Math.hypot(dx,dy)||1;
    const nx=dy/len, ny=-dx/len;           // 单位法向，指向战区外侧
    const isLong=(i%2===0);
    const amp=isLong?Math.min(rw,rh)*(0.04+rnd()*0.05):0;   // 斜切小边不扰动
    const ph1=rnd()*6.283, ph2=rnd()*6.283;
    const k1=1+Math.floor(rnd()*2), k2=2+Math.floor(rnd()*3);
    for(let s=0;s<SEG;s++){
      const u=s/SEG;
      let off=0;
      if(amp>0){
        off=amp*Math.sin(u*6.283*k1+ph1)+amp*0.55*Math.sin(u*6.283*k2+ph2);
        /* 两端收口：贴着角点的位置不偏移，免得把斜切角啃掉 */
        off*=clamp(Math.min(u,1-u)/0.18,0,1);
      }
      out.push(Math.round(a[0]+dx*u+nx*off), Math.round(a[1]+dy*u+ny*off));
    }
  }
  return blazeResamplePoly(out,cx,cy,96);
}
/* 按角度重采样：以战区中心为原点，每隔 2π/N 打一条射线求与轮廓的交点。
   方形轮廓相对中心是"星形"的（一条射线只交一次），取唯一交点即可。 */
function blazeResamplePoly(poly,cx,cy,N){
  const n=poly.length/2, out=[];
  if(n<3)return poly.slice();
  for(let i=0;i<N;i++){
    const a=i/N*6.28318, dx=Math.cos(a), dy=Math.sin(a);
    let bt=-1;
    for(let j=0;j<n;j++){
      const x1=poly[j*2],  y1=poly[j*2+1];
      const x2=poly[((j+1)%n)*2], y2=poly[((j+1)%n)*2+1];
      const ex=x2-x1, ey=y2-y1;
      const den=dx*ey-dy*ex;
      if(Math.abs(den)<1e-9)continue;
      const fx=x1-cx, fy=y1-cy;
      const t=(fx*ey-fy*ex)/den;          // 射线参数（>0 在前方）
      const u=(fx*dy-fy*dx)/den;          // 线段参数（0~1 落在这一段上）
      if(t>0&&u>=0&&u<=1&&t>bt)bt=t;
    }
    if(bt>0){out.push(Math.round(cx+dx*bt),Math.round(cy+dy*bt));continue;}
    /* 兜底：这条射线没打中（不该发生），退回到最近的轮廓顶点 */
    let bd=1e18,bx=cx,by=cy;
    for(let j=0;j<n;j++){
      const d=dist(poly[j*2],poly[j*2+1],cx,cy);
      if(d<bd){bd=d;bx=poly[j*2];by=poly[j*2+1];}
    }
    out.push(Math.round(bx),Math.round(by));
  }
  return out;
}
/* 边界上某角度的点，再往地图内挪 inset —— 撤离点就贴着边放 */
function bzEdgePoint(poly,ang,inset,cx,cy){
  const N=poly.length/2;let bi=0,bd=1e9;
  for(let i=0;i<N;i++){
    const a=i/N*6.28318;
    let d=Math.abs(((a-ang+Math.PI*3)%(Math.PI*2))-Math.PI);
    if(d<bd){bd=d;bi=i;}
  }
  const x=poly[bi*2],y=poly[bi*2+1];
  const dx=cx-x,dy=cy-y,L=Math.hypot(dx,dy)||1;
  return {x:Math.round(x+dx/L*inset),y:Math.round(y+dy/L*inset)};
}
/* 折线内随机取一点（拒绝采样，够快也够稳） */
function bzRandPoint(poly,rx,ry,rw,rh,rnd,pad){
  for(let k=0;k<160;k++){
    const x=rx+pad+rnd()*(rw-pad*2), y=ry+pad+rnd()*(rh-pad*2);
    if(bzPtInPoly(x,y,poly))return {x:x,y:y};
  }
  return null;
}

