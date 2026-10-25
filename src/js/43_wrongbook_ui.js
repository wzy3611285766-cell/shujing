/* =========================================================
   错题中心 UI（今日复习 / 全部错题 / 已掌握 / 错题分析 + 编辑错题）
   ---------------------------------------------------------
   4.1.1 自 39_hints.js 拆出 —— 39 里留下的是答题会话与提示链，
   错题本的内核（熟炼度/复习日程）在 44_wrongbook_core.js，
   导入导出在 45_wrongbook_io.js，配图在 40_wrongbook_photo.js：
   四个文件合成完整的「错题」垂直切片。
   ========================================================= */
/* 错题本：容量 WRONG_CAP（200），并按四科筛选。
   老存档里的题没有 subject 字段，用 rid 反查科目补齐。 */
function wbSubj(w){return DRILL_OF[w.subject||subjOfRid(w.rid)]||null;}

/* ---------- 📕 错题中心 ----------
   四个页签：今日复习（到期队列）/ 全部错题 / 已掌握（毕业归档）/ 错题分析。
   showWrongBook('math') 这种老调用仍然认 —— 当成"打开全部错题并筛数学"。 */
function showWrongBook(tab0,subj0){
  let tab='today',subj='all',kw='',sort='due',curList=[];
  if(tab0&&WB_TABS.some(x=>x.id===tab0))tab=tab0;
  else if(tab0){tab='all';subj=tab0;}
  if(subj0)subj=subj0;
  /* 空本子：给一条最短的路（文字导入），别让人对着空面板发呆 */
  if(!state.wrongBook.length&&!state.wrongDone.length){
    openPanel(`<h2>📕 错题中心</h2><div class="sub">还没有错题</div>
      <div class="center" style="font-size:44px;margin:10px 0">🎉</div>
      <div class="center">闯关与练枪答错的题会自动收进这里，
        并按熟炼度排好复习日程 —— 到期就练，连对 5 次毕业。<br>
        <span style="color:#9cc0e0;font-size:var(--fs-xs)">容量 ${WRONG_CAP} 题 · 也可以把作业、卷子上的错题导入进来</span></div>
      <div class="row"><button class="btn primary" id="imp">📥 导入错题</button></div>
      <div class="row"><button class="btn" id="ok">关闭</button></div>`);
    $('ok').onclick=closePanel;
    $('imp').onclick=showImportWrong;
    return;
  }
  function match(w){
    if(subj!=='all'&&(w.subject||subjOfRid(w.rid))!==subj)return false;
    if(kw){
      const k=kw.trim().toLowerCase();
      if(k&&(String(w.text)+' '+(w.topic||'')+' '+(w.ans||'')+' '+(w.note||'')
        ).toLowerCase().indexOf(k)<0)return false;
    }
    return true;
  }
  function sorted(arr){
    arr=arr.slice();
    if(sort==='due')arr.sort((a,b)=>String(a.due||'9').localeCompare(String(b.due||'9')));
    else if(sort==='weak')arr.sort((a,b)=>(b.badN||0)-(a.badN||0)||(a.box||0)-(b.box||0));
    else if(sort==='new')arr.sort((a,b)=>(b.addAt||0)-(a.addAt||0));
    else arr.sort((a,b)=>(a.addAt||0)-(b.addAt||0));
    return arr;
  }
  let curDone=[];                 /* 「已掌握」页签的当前列表（折叠题图要用） */
  function itemHtml(w,i,mode){
    const s=wbSubj(w),t=todayStr();
    const dueNow=!w.due||w.due<=t;
    const bx=w.box||0;
    const ops=(mode==='done')
      ?'<button class="wb-op" data-op="back" data-i="'+i+'">↩️ 拉回本子</button>'
       +'<button class="wb-op" data-op="del" data-i="'+i+'">🗑 删除</button>'
      :'<button class="wb-op" data-op="soon" data-i="'+i+'">📌 今天就复习</button>'
       +'<button class="wb-op" data-op="know" data-i="'+i+'">✅ 会了</button>'
       +'<button class="wb-op" data-op="del" data-i="'+i+'">🗑 删除</button>';
    return '<div class="wb-item'+(w.imp?' imp':'')+'">'
      +(w.img?imgTag(w.img,'wb-th'):'')
      +'<div class="wb-t">'+(s?s.emoji+' ':'')
        +'<span class="qtag" style="margin:0 8px 0 0">'+esc(w.topic||'')+'</span>'
        +(i+1)+'. '+esc(w.text)+'</div>'
      +'<div class="wb-a">答案：<b>'+esc(w.ans)+'</b></div>'
      +(w.note?'<div class="wb-e" style="color:#ffd0a0">📝 '+esc(w.note)+'</div>':'')
      +'<div class="wb-e">'+esc(w.exp)+'</div>'
      +stepsHtml(w)
      +'<div class="wb-meta">'
        +'<span class="wb-tag box">'+'★'.repeat(bx)+'☆'.repeat(WB_PASS-bx)+' '+bx+'/'+WB_PASS+'</span>'
        +'<span class="wb-tag '+(dueNow?'due':'ok')+'">'
          +(dueNow?'今天该复习':'下次 '+esc(w.due))+'</span>'
        +'<span class="wb-tag">练过 '+(w.rev||0)+' 次 · 又错 '+(w.badN||0)+' 次</span>'
        +'<span class="wb-tag">'+esc(w.src2||'')+'</span>'
      +'</div>'
      +'<div class="wb-ops">'
        +'<button class="wb-op'+(w.star?' on':'')+'" data-op="star" data-i="'+i+'">'
          +(w.star?'⭐ 已收藏':'☆ 收藏')+'</button>'
        +'<button class="wb-op" data-op="edit" data-i="'+i+'">✏️ 改</button>'
        +ops
      +'</div></div>';
  }
  function op(name,w){
    if(!w)return;
    if(name==='star'){w.star=w.star?0:1;save();render();toast(w.star?'⭐ 已收藏':'已取消收藏');}
    else if(name==='edit'){showWbEdit(w);}
    else if(name==='soon'){
      wbHeal(w,false);w.due=todayStr();save();render();
      toast('📌 已排进今天的复习');}
    else if(name==='know'){
      wbArchive(w);save();updateHUD();render();toast('✅ 收进「已掌握」🎓');}
    else if(name==='back'){
      wbRestore(w);save();updateHUD();render();toast('↩️ 拉回本子，明天见');}
    else if(name==='del'){
      if(!confirm('删掉这道错题？删了就找不回来了'))return;
      wbDel(w);save();updateHUD();render();toast('已删除');}
  }
  function render(){
    const st=wbStat();
    const dueList=wbDueList();
    let body='',foot='';
    if(tab==='today'){
      const list=sorted(dueList);
      const show=list.slice(0,12);
      curList=show;
      const pct=(st.n+st.done)?Math.round(st.done/(st.n+st.done)*100):0;
      body='<div class="wb-card">'
        +'<div class="wb-kv"><span>今天该复习</span><b style="color:'
          +(dueList.length?'#ffb0b0':'#8ef0b8')+'">'+dueList.length+' 题</b></div>'
        +'<div class="wb-kv"><span>本子里的错题</span><b>'+st.n+' / '+WRONG_CAP+'</b></div>'
        +'<div class="wb-kv"><span>已掌握（毕业）</span><b style="color:#8ef0b8">'
          +st.done+' 题</b></div>'
        +'<div class="wb-kv"><span>连续复习</span><b>'+st.streak+' 天 · 累计 '+st.rev+' 题</b></div>'
        +'<div class="pbar"><i style="width:'+pct+'%"></i></div>'
        +'<div class="center" style="font-size:var(--fs-xs);color:#9cc0e0">掌握进度 '
          +pct+'%（已掌握 / 曾收录）</div></div>';
      if(dueList.length){
        body+='<div class="row" style="margin-top:0"><button class="btn primary" id="wbGo" '
          +'style="flex:1;justify-content:center">🔥 开始今日复习（'
          +Math.min(WB_ONCE,dueList.length)+' 题）</button></div>'
          +(dueList.length>WB_ONCE
            ?'<div class="center" style="font-size:var(--fs-xs);color:#9cc0e0;margin-top:6px">'
              +'到期 '+dueList.length+' 题，一次练 '+WB_ONCE+' 题，剩下的做完再来</div>':'')
          +'<div class="row" style="margin-top:8px"><button class="btn" id="wbDueAll" '
          +'style="flex:1;justify-content:center">📚 一口气清完这 '+dueList.length+' 题</button></div>';
      }else{
        body+='<div class="center" style="font-size:40px;margin:6px 0">🎉</div>'
          +'<div class="center">今天的复习清完了'
          +(st.n?'，剩下的题都还没到期':'，本子也是空的')+'</div>'
          +(st.n?'<div class="center" style="color:#9cc0e0;font-size:var(--fs-xs);margin-top:4px">'
            +'想提前练就去「🗂 全部错题」，点「📌 今天就复习」把它排进来</div>':'')
          +'<div class="row"><button class="btn" id="wbGoAll" style="flex:1;justify-content:center">'
          +'🗂 去全部错题看看</button></div>';
      }
      body+='<div style="max-height:36vh;overflow:auto;margin-top:10px">'
        +show.map((w,i)=>itemHtml(w,i,'bk')).join('')+'</div>';
    }else if(tab==='all'){
      const list=sorted(state.wrongBook.filter(match));
      curList=list;
      const chips=[{id:'all',n:'全部',e:'📕'}].concat(
        DRILL_SUBJ.map(s=>({id:s.id,n:s.name,e:s.emoji})));
      body='<input class="wb-sr" id="wbSr" placeholder="🔍 搜题干 / 知识点 / 答案 / 笔记" value="'
          +esc(kw)+'">'
        +'<div class="row" style="margin:0 0 8px;gap:5px;justify-content:center;flex-wrap:wrap">'
        +chips.map(c=>'<button class="wb-tab'+(c.id===subj?' on':'')+'" data-s="'+c.id+'">'
          +c.e+' '+c.n+'</button>').join('')
        +'</div>'
        +'<div class="row" style="margin:0 0 10px;gap:5px;justify-content:center;flex-wrap:wrap">'
        +WB_SORTS.map(s=>'<button class="wb-tab" data-sort="'+s.id+'" style="'
          +(sort===s.id?'background:linear-gradient(180deg,rgba(94,214,255,.26),rgba(94,214,255,.15));box-shadow:var(--gb-edge-hi),0 0 0 .5px rgba(94,214,255,.5),var(--gb-drop);color:#9fe4ff':'')
          +'">'+s.n+'</button>').join('')
        +'</div>'
        +'<div style="max-height:44vh;overflow:auto">'
        +(list.length?list.map((w,i)=>itemHtml(w,i,'bk')).join('')
          :'<div class="center" style="color:#9cc0e0;padding:16px">没有符合条件的错题</div>')
        +'</div>';
    }else if(tab==='done'){
      const list=sorted(state.wrongDone.filter(match));
      curList=list;curDone=list;
      body='<div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;margin-bottom:8px">'
        +'连对 5 次的题会毕业到这里。忘了就点「↩️ 拉回本子」重新学。</div>'
        +'<div style="max-height:50vh;overflow:auto">'
        +(list.length?list.map((w,i)=>itemHtml(w,i,'done')).join('')
          :'<div class="center" style="color:#9cc0e0;padding:16px">还没有题毕业 🎓 继续复习</div>')
        +'</div>';
    }else{
      const mx=Math.max(1,DRILL_SUBJ.reduce((m,s)=>Math.max(m,st.bySubj[s.id]||0),0));
      const subjBar=DRILL_SUBJ.map(s=>{
        const n=st.bySubj[s.id]||0;
        return '<div class="wb-bar" data-drill="'+s.id+'" style="cursor:pointer">'
          +'<span class="nm">'+s.emoji+' '+s.name+'</span>'
          +'<span class="tr"><i style="width:'+(n/mx*100)+'%"></i></span>'
          +'<span class="vl">'+n+'</span>'
          +'<span class="wb-tag" style="flex:none">🎯 去练</span></div>';}).join('');
      const nm=Math.max(1,st.n);
      const boxBar=[5,4,3,2,1,0].map(b=>{
        const n=st.byBox[b]||0;
        return '<div class="wb-bar"><span class="nm">'+'★'.repeat(b)+'☆'.repeat(WB_PASS-b)+'</span>'
          +'<span class="tr"><i style="width:'+(n/nm*100)+'%;'
          +'background:linear-gradient(90deg,#5ed6ff,#34c77b)"></i></span>'
          +'<span class="vl">'+n+'</span></div>';}).join('');
      const tp=Object.keys(st.byTopic).map(k=>({k:k,v:st.byTopic[k]}))
        .sort((a,b)=>b.v-a.v).slice(0,6);
      const tpMax=Math.max(1,tp.reduce((m,x)=>Math.max(m,x.v),0));
      const tpBar=tp.length?tp.map(x=>{
          /* 热点行能反向定位到专题：本子里这块错得多，就去练枪场专攻它 */
          const tid=(function(){for(const r in DRILL_TOPICS){const b=topicBest(r,x.k);if(b)return b;}return null;})();
          return '<div class="wb-bar"><span class="nm" style="min-width:88px;'
          +'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(x.k)+'</span>'
          +'<span class="tr"><i style="width:'+(x.v/tpMax*100)+'%"></i></span>'
          +'<span class="vl">'+x.v+'</span>'
          +(tid?'<span class="wb-tag" data-tp="'+tid+'" style="flex:none;cursor:pointer">🎯 去练</span>':'')
          +'</div>';}).join('')
        :'<div class="center" style="color:#9cc0e0;font-size:var(--fs-sm)">还没有数据</div>';
      const dm=Math.max(1,st.day7.reduce((m,x)=>Math.max(m,x.n),0));
      const trend='<div style="display:flex;align-items:flex-end;gap:4px;height:58px;margin:6px 0 0">'
        +st.day7.map(x=>{
          const h=Math.max(2,x.n/dm*40);
          return '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;'
            +'align-items:center;height:100%">'
            +'<div style="width:100%;height:'+h+'px;border-radius:4px 4px 0 0;'
            +'background:linear-gradient(180deg,#ffd76a,#ff9f2b)"></div>'
            +'<div style="font-size:var(--fs-2xs);color:#8fb4d6;margin-top:3px">'+x.d+'</div>'
            +'<div style="font-size:var(--fs-2xs);color:#fff;font-weight:700">'+(x.n||'')+'</div></div>';
        }).join('')+'</div>';
      const tough=st.tough.filter(w=>(w.badN||0)>0);
      body='<div class="wb-card">'
        +'<div class="wb-kv"><span>本子里</span><b>'+st.n+' 题'
          +(st.star?' · ⭐ '+st.star:'')+'</b></div>'
        +'<div class="wb-kv"><span>今日待复习</span><b style="color:#ffb0b0">'+st.due+' 题</b></div>'
        +'<div class="wb-kv"><span>已掌握</span><b style="color:#8ef0b8">'+st.done+' 题</b></div>'
        +'<div class="wb-kv"><span>累计复习</span><b>'+st.rev+' 题</b></div>'
        +'<div class="wb-kv"><span>连续复习</span><b>'+st.streak+' 天（最长 '+st.best+' 天）</b></div>'
        +'</div>'
        +'<div class="wb-card"><div class="wb-t" style="margin-bottom:6px">📚 哪科错得多</div>'
          +(subjBar||'<div class="center" style="color:#9cc0e0;font-size:var(--fs-sm)">—</div>')
          +'<div class="center" style="font-size:var(--fs-xs);color:#9cc0e0;margin-top:4px">'
          +'点一行直接去练枪场专攻这科的薄弱点</div></div>'
        +'<div class="wb-card"><div class="wb-t" style="margin-bottom:6px">🎯 熟炼度分布</div>'
          +boxBar
          +'<div class="center" style="font-size:var(--fs-xs);color:#9cc0e0;margin-top:4px">'
          +'★ 越多越接近毕业，满 5 星就收进「已掌握」</div></div>'
        +'<div class="wb-card"><div class="wb-t" style="margin-bottom:6px">🔥 顽固错题</div>'
          +(tough.length?tough.map((w,i)=>'<div class="wb-kv"><span style="flex:1;overflow:hidden;'
            +'text-overflow:ellipsis;white-space:nowrap">'+(i+1)+'. '
            +esc(String(w.text).slice(0,22))+'</span><b>又错 '+w.badN+' 次</b></div>').join('')
            :'<div class="center" style="color:#9cc0e0;font-size:var(--fs-sm)">没有反复错的题，很好 👍</div>')
          +'</div>'
        +'<div class="wb-card"><div class="wb-t" style="margin-bottom:6px">🏷 知识点热点</div>'
          +tpBar+'</div>'
        +'<div class="wb-card"><div class="wb-t" style="margin-bottom:2px">📈 近 7 天收录</div>'
          +trend+'</div>';
      curList=[];
    }
    if(tab==='stat'){
      foot='<div class="row"><button class="btn" id="exp">📤 导出</button>'
        +'<button class="btn primary" id="ok">关闭</button></div>';
    }else if(tab==='done'){
      foot='<div class="row"><button class="btn" id="imp">📥 导入</button>'
        +'<button class="btn" id="dr">🔁 抽 5 题复习</button>'
        +'<button class="btn" id="clrD">🗑 清空归档</button></div>'
        +'<div class="row"><button class="btn primary" id="ok">关闭</button></div>';
    }else{
      foot='<div class="row"><button class="btn" id="imp">📥 导入</button>'
        +'<button class="btn" id="exp">📤 导出</button>'
        +'<button class="btn" id="dr">🔁 重练</button></div>'
        +'<div class="row"><button class="btn" id="clr">🗑 清空本子</button>'
        +'<button class="btn primary" id="ok">关闭</button></div>';
    }
    openPanel('<h2>📕 错题中心</h2>'
      +'<div class="sub">'+st.n+' 题待攻克 · 今日 '+st.due+' 题到期 · 已掌握 '+st.done+' 题</div>'
      +'<div class="wb-tabs">'+WB_TABS.map(x=>'<button class="wb-tab'+(x.id===tab?' on':'')
        +'" data-tab="'+x.id+'">'+x.e+' '+x.n
        +(x.id==='today'&&st.due?' · '+st.due:'')+'</button>').join('')+'</div>'
      +body+foot);
    panel.querySelectorAll('[data-tab]').forEach(b=>{
      b.onclick=()=>{tab=b.dataset.tab;render();};});
    panel.querySelectorAll('[data-s]').forEach(b=>{
      b.onclick=()=>{subj=b.dataset.s;render();};});
    panel.querySelectorAll('[data-sort]').forEach(b=>{
      b.onclick=()=>{sort=b.dataset.sort;render();};});
    panel.querySelectorAll('[data-drill]').forEach(b=>{
      b.onclick=()=>{const sid=b.dataset.drill;closePanel();
        try{drillPick(sid);}catch(e){showDrill();}};});
    /* 知识点热点那几行也能点：直接定位它所属的专题 */
    panel.querySelectorAll('[data-tp]').forEach(b=>{
      b.onclick=()=>{
        const t=topicInfo(b.dataset.tp);
        if(!t)return;
        closePanel();
        try{drillPick(subjOfRid(t.rid),t.id);}catch(e){showDrill();}
      };});
    panel.querySelectorAll('[data-op]').forEach(b=>{
      b.onclick=()=>{op(b.dataset.op,curList[+b.dataset.i]);};});
    /* 攻坚题 / 带图的题：列表里只放一个折叠条，点开才画 SVG ——
       本子最多 200 条，一上来全画出来会把手机卡住 */
    try{
      const items=panel.querySelectorAll('.wb-item');
      for(let i=0;i<items.length;i++){
        const w=(tab==='done'?curDone:curList)[i];
        if(!w||(w.hardIdx==null&&!w.fig))continue;
        const det=document.createElement('details');
        det.className='wb-fig';
        setH(det, '<summary>🖼 看题图</summary><div class="fgbox"></div>');
        det.addEventListener('toggle',()=>{
          if(!det.open)return;
          const box=det.querySelector('.fgbox');
          if(box&&!hasH(box)){
            setH(box, qFigHtml(w)||'<div class="wb-e">这道题没有图</div>');
            try{fillImgs(box);}catch(e){}
            try{qfigRun(box);}catch(e){}
          }
        });
        items[i].appendChild(det);
      }
    }catch(e){}
    const sr=$('wbSr');
    if(sr){
      let tm=null;
      sr.oninput=()=>{
        clearTimeout(tm);
        const pos=sr.selectionStart;
        tm=setTimeout(()=>{
          kw=sr.value;render();
          const n2=$('wbSr');
          if(n2){n2.focus();try{n2.setSelectionRange(pos,pos);}catch(e){}}
        },450);
      };
    }
    $('ok').onclick=closePanel;
    const gi=$('imp'),ge=$('exp'),gd=$('dr'),gc=$('clr'),gcd=$('clrD');
    if(gi)gi.onclick=showImportWrong;
    if(ge)ge.onclick=showExportWrong;
    if(gd)gd.onclick=()=>{
      const src=(tab==='done')?state.wrongDone:state.wrongBook;
      const list=shuffle(src.filter(match));
      if(!list.length){toast('没有可练的题');return;}
      closePanel();startWrongDrill(list,5);
    };
    if(gc)gc.onclick=()=>{
      if(!confirm('清空全部 '+state.wrongBook.length+' 道错题？\n'
        +'（闯关、练枪、导入的错题都会一起清掉，已掌握的归档会保留）'))return;
      shotClearAll();
      state.wrongBook=[];save();updateHUD();closePanel();toast('错题本已清空');
    };
    if(gcd)gcd.onclick=()=>{
      if(!confirm('清空「已掌握」里的 '+state.wrongDone.length+' 道题？\n（只是清掉归档记录，不影响本子里的错题）'))return;
      state.wrongDone=[];save();closePanel();toast('归档已清空');
    };
    const gg=$('wbGo');
    if(gg)gg.onclick=()=>{closePanel();startWrongDrill(wbDueList(),WB_ONCE,true);};
    const gda=$('wbDueAll');
    if(gda)gda.onclick=()=>{closePanel();startWrongDrill(wbDueList(),wbDueList().length,true);};
    const ga=$('wbGoAll');
    if(ga)ga.onclick=()=>{tab='all';render();};
    fillImgs(panel);
  }
  render();
}

/* ---------- 编辑一条错题 ----------
   认错的题干、记错的答案、自己总结的坑，都能在这儿改回来；
   「我的笔记」只有你自己看得到，适合写"我为什么错"。 */
function showWbEdit(w){
  if(!w||!w.text){toast('这道题已经不在本子里了');return;}
  let subj=w.subject||subjOfRid(w.rid)||'math';
  function render(){
    const picks=DRILL_SUBJ.map(d=>'<button class="wb-tab'+(d.id===subj?' on':'')
      +'" data-s="'+d.id+'">'+d.emoji+' '+d.name+'</button>').join('');
    openPanel('<h2>✏️ 编辑错题</h2>'
      +'<div class="sub">改完点保存 · 当前熟炼度 '+(w.box||0)+' / '+WB_PASS+'</div>'
      +'<div class="imp-box" style="margin-bottom:5px">题干</div>'
      +'<textarea id="eT" style="'+TA_STYLE+';height:86px">'+esc(w.text)+'</textarea>'
      +'<div class="imp-box" style="margin:10px 0 5px">答案</div>'
      +'<textarea id="eA" style="'+TA_STYLE+';height:52px">'+esc(w.ans)+'</textarea>'
      +'<div class="imp-box" style="margin:10px 0 5px">解析 / 思路</div>'
      +'<textarea id="eE" style="'+TA_STYLE+';height:76px">'+esc(w.exp)+'</textarea>'
      +'<div class="imp-box" style="margin:10px 0 5px">知识点</div>'
      +'<textarea id="eK" style="'+TA_STYLE+';height:44px">'+esc(w.topic||'')+'</textarea>'
      +'<div class="imp-box" style="margin:10px 0 5px">我的笔记（只有你自己看得到）</div>'
      +'<textarea id="eN" style="'+TA_STYLE+';height:58px">'+esc(w.note||'')+'</textarea>'
      +'<div class="imp-box" style="margin:10px 0 5px">🧠 思路步骤（一行一步，最多 4 步）</div>'
      +'<textarea id="eS" style="'+TA_STYLE+';height:70px">'+esc((w.steps||[]).join('\n'))+'</textarea>'
      +'<div class="imp-box" style="margin:10px 0 5px">科目</div>'
      +'<div class="row" style="margin-top:0;gap:6px;justify-content:center;flex-wrap:wrap">'
        +picks+'</div>'
      +'<div class="row"><button class="btn primary" id="eOk">保存</button>'
        +'<button class="btn" id="eCn">取消</button></div>');
    panel.querySelectorAll('[data-s]').forEach(b=>{b.onclick=()=>{subj=b.dataset.s;render();};});
    $('eCn').onclick=()=>showWrongBook('all');
    $('eOk').onclick=()=>{
      const t=$('eT').value.trim();
      if(!t){toast('题干不能为空');return;}
      w.text=t;
      w.ans=$('eA').value.trim()||'见解析';
      w.exp=$('eE').value.trim();
      w.topic=$('eK').value.trim()||'未分类';
      w.note=$('eN').value.trim();
      w.steps=String($('eS').value).split(/\n+/).map(x=>String(x).trim())
        .filter(Boolean).slice(0,4);
      if(!w.steps.length)w.steps=null;
      w.subject=subj;
      /* 答案改了而选项里没有它，重练时会永远判错 —— 直接改成自评模式 */
      if(w.opts&&w.opts.length>=2&&w.ans&&w.opts.indexOf(w.ans)<0)w.opts=null;
      save();toast('已保存 ✏️');showWrongBook('all');
    };
  }
  render();
}
