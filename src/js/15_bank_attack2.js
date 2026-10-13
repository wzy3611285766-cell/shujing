/* =========================================================
   🔥 攻坚题库（2.0.0）
   ---------------------------------------------------------
   练枪场第四档「攻坚」专用。和普通题的区别：
     · 题干长、条件多，一步出不了答案
     · 每题一张示意图（fig，运行时拼的 SVG）
     · 长解析（把完整的来龙去脉写清楚，不是一句话带过）
     · hints：3~4 层阶梯提示，逐层逼近但不把答案端出来
     · steps：答完之后摊开的完整 3~4 步求解过程
     · appr：思路层（正确入手 + 三条学生真会跑偏的路）
   抽题用 hardDraw()，与 genQuestion 完全分开，互不污染。
   ========================================================= */
const HARD=[];
function QH(o){
  const ans=String(o.a);
  const set=[ans],seen=new Set([ans]);
  const push=v=>{v=String(v);if(v&&!seen.has(v)&&set.length<4){seen.add(v);set.push(v);}};
  (o.w||[]).forEach(push);
  (o.w2||[]).forEach(push);
  if(set.length<4)decoysFor(ans).forEach(push);
  const q={text:o.t,ansText:ans,opts:shuffle(set),exp:o.x,topic:o.k,src:'攻坚',
    fig:o.f||null,hints:o.h||null,steps:o.st||null,
    rid:o.rid||'',subject:o.s||'',hard:1};
  if(o.p){
    const r=String(o.p.r||'');
    const as=[r].concat((o.p.w||[]).filter(v=>v&&String(v)!==r));
    if(r&&as.length>=4)q.appr={r:r,opts:shuffle(as.slice(0,4)),why:o.p.y||''};
  }
  if(!q.appr)q.appr=approachFor(q);
  HARD.push(q);
  /* 攻坚大题同时并入多步大题库（记作高考档），练枪场三档都能刷到它 */
  if(typeof BIG!=='undefined'){
    const c=Object.assign({},q,{d:3,big:1});
    if(BIG.indexOf(q)<0)BIG.push(c);
  }
  return q;
}
function hardList(sid){return HARD.filter(q=>q.subject===sid);}

/* =========================================================
   🔥 多步大题库（3.0.0）
   ---------------------------------------------------------
   练枪场三档（基础 / 中档 / 高考）全面改用多步大题：
     · 题干长、条件多，一步出不了答案
     · 每题一个「主问 + 追问」，答案是组合量（如 "a = 2，最大值 4"）
     · 每题配一张示意图（f: 运行时拼的 SVG，能动的带动画）
     · hints：3~4 层阶梯提示，最后一步留给自己算
     · steps：答完摊开的 3~4 步求解
     · appr：思路层（正确入手 + 三条学生真会跑偏的路 + 为什么）
     · d：难度档 1 / 2 / 3（对应练枪场基础 / 中档 / 高考）
   抽题走 bigDraw()，与闯关推图的 genQuestion 完全分开。
   题不够时 bigDraw 会退回原来的 BANK，不会出现刷不出题的情况。
   ========================================================= */
const BIG=[];
function QB(o){
  const ans=String(o.a);
  const set=[ans],seen=new Set([ans]);
  const push=v=>{v=String(v);if(v&&!seen.has(v)&&set.length<4){seen.add(v);set.push(v);}};
  (o.w||[]).forEach(push);
  (o.w2||[]).forEach(push);
  if(set.length<4)decoysFor(ans).forEach(push);
  const q={text:o.t,ansText:ans,opts:shuffle(set),exp:o.x,topic:o.k,src:'大题',
    fig:o.f||null,hints:o.h||null,steps:o.st||null,
    rid:o.rid||'',subject:o.s||'',big:1,d:o.d||2};
  if(o.p){
    const r=String(o.p.r||'');
    const as=[r].concat((o.p.w||[]).filter(v=>v&&String(v)!==r));
    if(r&&as.length>=4)q.appr={r:r,opts:shuffle(as.slice(0,4)),why:o.p.y||''};
  }
  if(!q.appr)q.appr=approachFor(q);
  BIG.push(q);
  return q;
}
