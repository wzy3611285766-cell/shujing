/* =========================================================
   📕 错题中心 · 间隔重复内核（1.7.0）
   ---------------------------------------------------------
   1.6 及以前，错题本只是个"收纳袋"：答错的题丢进来，重练答对就划掉。
   毛病很明显 —— 划掉的题过两天又忘，没划掉的一直占着位子，
   本子越攒越厚，却没人告诉你"今天该看哪几题"。
   1.7.0 把它升级成复习系统：
     · 每条错题带熟炼度 box（0~5 星）和下次复习日 due，
       间隔按 1 / 2 / 4 / 8 / 15 天递增（艾宾浩斯那一套）
     · 到期的题自动排进「今日复习」，答对往后推、答错打回第一天
     · 满 5 星再答对一次 → 搬进「已掌握」归档区，本子不再堆着会的题
     · 顶栏 📕 挂待复习角标，任务条与开场都会提醒
   ========================================================= */
const WB_GAP=[0,1,2,4,8,15];      /* 熟炼度 → 隔几天再考你一次 */
const WB_PASS=5;                  /* 满 5 星再答对一次就毕业 */
const WB_DONE_CAP=400;            /* 归档区容量 */
const WB_ONCE=8;                  /* 一次复习最多抽几题（多了做不完） */
const WB_TABS=[{id:'today',n:'今日复习',e:'📌'},{id:'all',n:'全部错题',e:'🗂'},
               {id:'done',n:'已掌握',e:'✅'},{id:'stat',n:'错题分析',e:'📊'}];
const WB_SORTS=[{id:'due',n:'最快到期'},{id:'weak',n:'最薄弱'},
                {id:'new',n:'最新收录'},{id:'old',n:'最早收录'}];
/* 老存档 / 手改过的存档里没有熟炼度字段，统一补齐。
   fresh=true 表示刚收进来的新题 —— 当天就可以复习 */
function wbHeal(w,fresh){
  if(!w||typeof w!=='object')return w;
  let b=Number(w.box);if(!isFinite(b))b=0;
  w.box=Math.max(0,Math.min(WB_PASS,Math.round(b)));
  if(typeof w.okN!=='number'||!isFinite(w.okN))w.okN=0;
  if(typeof w.badN!=='number'||!isFinite(w.badN))w.badN=0;
  if(typeof w.rev!=='number'||!isFinite(w.rev))w.rev=0;
  if(typeof w.addAt!=='number')w.addAt=Date.now();
  w.star=w.star?1:0;
  if(typeof w.note!=='string')w.note='';
  if(!w.src2)w.src2=w.imp?(w.img?'照片导入':'文字导入'):'闯关';
  /* 没有复习日期的（老错题）一律算今天到期 —— 一次清干净，别让它躺着 */
  if(typeof w.due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(w.due))w.due=todayStr();
  return w;
}
function wbHealAll(){
  let k=0;
  (state.wrongBook||[]).forEach(w=>{
    /* 记下它原本有没有复习日期：没有的就是老版本收进来的错题 */
    const had=(typeof w.due==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(w.due));
    wbHeal(w,false);
    /* 老错题错峰排到未来一周里，不然升级当天会一下子冒出几百题到期 */
    if(!had){w.due=dayOffsetStr(k%7);k++;}
  });
  (state.wrongDone||[]).forEach(w=>wbHeal(w,false));
}
/* 错题本是**全局**的（4.0.22）
   ---------------------------------------------------------------
   以前 wrongBook / wrongDone 只挂在 ADV_STATE 上，而 `state` 指向"当前世界" ——
   于是进了烽火 / 史诗 / 练枪之后，全项目 99 处 `state.wrongBook` 的读写
   都落在**一个不存在的字段**上：静默变空。表现是
     · 烽火里点「错题中心」显示 0 题
     · 烽火里答错的题进不了错题本（而这正是"先复习错题"要拦的东西）
     · ☰ 菜单里那行「今日待复习 N」在烽火下永远是 0
   改法：让四个世界的 state **指向同一份数组**（引用别名），
   99 处调用一行都不用改。读档之后再并一次（按 text 去重、ADV 那份优先），
   避免"只玩烽火"时 ADV 的存档落后、把新错的题丢掉。 */
function wbShare(){
  try{
    const keep=(typeof ADV_STATE!=='undefined'&&ADV_STATE)?ADV_STATE:null;
    if(!keep)return null;
    keep.wrongBook=keep.wrongBook||[];
    keep.wrongDone=keep.wrongDone||[];
    const others=[(typeof EPIC_STATE!=='undefined')?EPIC_STATE:null,
                  (typeof BLAZE_STATE!=='undefined')?BLAZE_STATE:null,
                  (typeof DRILL_STATE!=='undefined')?DRILL_STATE:null].filter(Boolean);
    const merge=(field)=>{
      const seen=new Set((keep[field]||[]).map(w=>String(w&&w.text)));
      others.forEach(o=>{
        (o[field]||[]).forEach(w=>{
          const k=String(w&&w.text);
          if(w&&k&&!seen.has(k)){seen.add(k);keep[field].push(w);}
        });
      });
    };
    merge('wrongBook');
    merge('wrongDone');
    if(!keep.wbRev)keep.wbRev={streak:0,last:''};
    [keep].concat(others).forEach(o=>{
      o.wrongBook=keep.wrongBook;o.wrongDone=keep.wrongDone;o.wbRev=keep.wbRev;
    });
    return keep;
  }catch(e){return null;}
}
/* 到期的题：今天该复习哪几题，全靠它 */
function wbDueList(){
  const t=todayStr();
  return (state.wrongBook||[]).filter(w=>!w.due||w.due<=t);
}
/* 收一道新错题。返回 true 表示真的收进去了 */
function wbAdd(it){
  if(!it||!it.text)return false;
  if(state.wrongBook.some(w=>w.text===it.text))return false;
  if(state.wrongBook.length>=WRONG_CAP)return false;
  wbHeal(it,true);
  state.wrongBook.unshift(it);
  /* 归档区里有同名的（毕业过又错了）→ 拉回来重新学，别留两份 */
  const d=(state.wrongDone||[]).filter(w=>w.text===it.text)[0];
  if(d){
    state.wrongDone=state.wrongDone.filter(w=>w.text!==it.text);
    it.rev=d.rev||0;it.addAt=d.addAt||it.addAt;
  }
  return true;
}
/* 按题干找一条：本子里 / 归档区里。用题干当主键是全工程一贯的做法 */
function wbFind(text){
  const t=String(text);
  return (state.wrongBook||[]).filter(w=>w.text===t)[0]||null;
}
function wbFindDone(text){
  const t=String(text);
  return (state.wrongDone||[]).filter(w=>w.text===t)[0]||null;
}
/* 练习模式（练枪场 / 闯关）答错，一步到位：新收 / 拉回 / 打回第一天。
   ------------------------------------------------------------
   以前这些模式只调 wbAdd()，而它碰到"题干已经在本子里"会直接返回 false
   —— 于是「又错一次」这件事被整个丢掉：熟炼度不掉、badN 不涨、复习日不重排。
   结果就是：连着三天在练枪场错同一道题，本子里那条还安安稳稳写着
   「熟炼度 3 星 · 4 天后再见」，而错题分析里按 badN 排的「最薄弱」
   永远看不见练习场上犯的错 —— 恰恰是练得最多的地方。
   返回 'new' 新收 | 'down' 打回第一天 | 'back' 从「已掌握」拉回 | 'full' 本子满了 */
function wbMiss(it){
  if(!it||!it.text)return 'full';
  const hit=wbFind(it.text);
  if(hit){wbGrade(hit,false);return 'down';}
  const old=wbFindDone(it.text);
  if(old){wbRestore(old);wbGrade(old,false);return 'back';}
  if(state.wrongBook.length>=WRONG_CAP)return 'full';
  return wbAdd(it)?'new':'full';
}
/* 把 wbMiss 的结果说成人话。各模式共用一套说法，别一个地方一个口径 */
function wbMissWord(kind){
  if(kind==='new')return '已收进错题本，明天再考你一次';
  if(kind==='down')return '这题本来就在本子里 —— 又错一次，熟炼度打回第一天';
  if(kind==='back')return '这题你已经掌握过了 —— 又错了，已从「已掌握」拉回来重学';
  return '错题本满了（'+WRONG_CAP+' 题）没存下 —— 去「错题本」删几道吧';
}
/* 判一次复习结果：答对升一星，满星毕业；答错打回第一天。
   返回 'up' 升级 / 'down' 打回 / 'done' 毕业 / 'back' 从归档区拉回 / 'none' 不在本子里 */
function wbGrade(w,ok){
  const hit=(state.wrongBook||[]).filter(x=>x.text===w.text)[0];
  if(!hit){
    /* 归档区的题：答对让它继续躺着；答错说明又忘了，拉回本子重新学 */
    const d=(state.wrongDone||[]).filter(x=>x.text===w.text)[0];
    if(d&&!ok){wbRestore(d);return 'back';}
    return 'none';
  }
  wbHeal(hit,false);
  hit.rev++;
  if(ok){
    hit.okN++;hit.badN=0;
    if(hit.box<WB_PASS)hit.box++;
    if(hit.box>=WB_PASS&&hit.okN>=WB_PASS){wbArchive(hit);return 'done';}
    hit.due=dayOffsetStr(WB_GAP[hit.box]||1);
    return 'up';
  }
  hit.badN++;hit.okN=0;hit.box=0;hit.due=dayOffsetStr(1);
  return 'down';
}
/* 毕业：搬进「已掌握」归档区 */
function wbArchive(w){
  w.doneAt=Date.now();w.box=WB_PASS;
  state.wrongBook=state.wrongBook.filter(x=>x.text!==w.text);
  state.wrongDone=state.wrongDone.filter(x=>x.text!==w.text);
  state.wrongDone.unshift(w);
  if(state.wrongDone.length>WB_DONE_CAP){
    state.wrongDone.slice(WB_DONE_CAP).forEach(x=>{if(x.img)shotDel(x.img);});
    state.wrongDone=state.wrongDone.slice(0,WB_DONE_CAP);
  }
}
/* 从归档区拉回主本：又忘了，或者想再练一遍 */
function wbRestore(w){
  state.wrongDone=state.wrongDone.filter(x=>x.text!==w.text);
  wbHeal(w,true);w.box=0;w.okN=0;w.due=todayStr();
  state.wrongBook.unshift(w);
  state.wrongBook=state.wrongBook.slice(0,WRONG_CAP);
  return true;
}
/* 彻底删掉一题：照片一起清掉，不然图会在存图库里越堆越多没人管 */
function wbDel(w){
  if(!w)return;
  if(w.img)shotDel(w.img);
  state.wrongBook=state.wrongBook.filter(x=>x.text!==w.text);
  state.wrongDone=state.wrongDone.filter(x=>x.text!==w.text);
}
/* 老版本「答对就划掉」的同名入口，1.7.0 起改走熟炼度归档 */

/* 复习流水账：连续复习天数（同一天重复练不重复计数） */
function wbRevTick(n){
  if(!state.wbRev||typeof state.wbRev!=='object')state.wbRev={};
  const r=state.wbRev,t=todayStr();
  if(r.d!==t){
    r.streak=(r.d===dayOffsetStr(-1))?((r.streak||0)+1):1;
    r.best=Math.max(r.best||0,r.streak);
    r.d=t;r.n=0;
  }
  r.n=(r.n||0)+n;
  r.total=(r.total||0)+n;
}
/* 错题分析页要的全部数字，一次算完 */
function wbStat(){
  const bk=state.wrongBook||[],dn=state.wrongDone||[],t=todayStr();
  const bySubj={},byTopic={},byBox=[0,0,0,0,0,0];
  bk.forEach(w=>{
    const sid=w.subject||subjOfRid(w.rid)||'?';
    bySubj[sid]=(bySubj[sid]||0)+1;
    const tp=w.topic||'未分类';
    byTopic[tp]=(byTopic[tp]||0)+1;
    byBox[Math.min(WB_PASS,w.box||0)]++;
  });
  const base=new Date();base.setHours(0,0,0,0);
  const day7=[];
  for(let i=6;i>=0;i--){
    const d=new Date(base);d.setDate(d.getDate()-i);
    const lo=d.getTime();
    day7.push({d:(d.getMonth()+1)+'/'+d.getDate(),
      n:bk.filter(w=>(w.addAt||0)>=lo&&(w.addAt||0)<lo+864e5).length});
  }
  return {n:bk.length,due:bk.filter(w=>!w.due||w.due<=t).length,done:dn.length,
    bySubj:bySubj,byTopic:byTopic,byBox:byBox,day7:day7,
    star:bk.filter(w=>w.star).length,
    tough:bk.slice().sort((a,b)=>(b.badN||0)-(a.badN||0)).slice(0,5),
    rev:(state.wbRev&&state.wbRev.total)||0,
    streak:(state.wbRev&&state.wbRev.streak)||0,
    best:(state.wbRev&&state.wbRev.best)||0};
}
/* ---------- 写入错题本 ---------- */
function commitPhotos(defSubj){
  const list=PHOTO_SHOTS.filter(sh=>sh.text||sh.ans);
  if(!list.length){const m=$('phMsg');if(m)m.innerHTML='<span class="imp-no">至少给一张图填点内容</span>';return;}
  const room=WRONG_CAP-state.wrongBook.length;
  if(room<=0){toast('错题本已满 '+WRONG_CAP+' 题');return;}
  const items=list.slice(0,room).map(sh=>{
    const sid=impSubj(sh.subj)||impSubj(defSubj);
    /* AI 认出选项、且答案确实在其中，就做成选择题，重练时点选项判对错 */
    let opts=null,ans=(sh.ans||'').trim()||'见图片';
    if(sh.opts&&sh.opts.length>=2){
      const p=aiPickOpt(ans,sh.opts);
      if(p.ok){ans=p.ans;opts=sh.opts.slice(0,6);}
    }
    return {text:(sh.text||'').trim()||'（看图作答）',
            ans:ans,
            exp:(sh.lecture||sh.exp||'').trim()||(sh.topic?('解析：'+sh.topic):''),
            steps:(sh.steps&&sh.steps.length)?sh.steps.slice(0,4):null,
            hints:(sh.hints&&sh.hints.length)?sh.hints.slice(0,4):null,
            trap:sh.trap||'',appr:sh.appr||null,
            topic:sh.topic?sh.topic.slice(0,12):'照片题',opts:opts,
            rid:impRid(sid),subject:sid,
            src:'导入·图',imp:1,img:sh.id};
  });
  const r=commitImport(items);
  /* 成功入库的图留着，被挤掉 / 重复的图删掉，别留垃圾 */
  const keep={};state.wrongBook.forEach(w=>{if(w.img)keep[w.img]=1;});
  PHOTO_SHOTS.forEach(sh=>{if(!keep[sh.id])shotDel(sh.id);});
  PHOTO_SHOTS=[];photoOpen=false;
  openPanel(`
    <h2>✅ 导入完成</h2>
    <div class="sub">错题本现在 ${state.wrongBook.length} / ${WRONG_CAP} 题</div>
    <div class="center" style="font-size:44px;margin:8px 0">📷</div>
    <div class="center" style="line-height:var(--lh-loose)">
      <span class="imp-ok">新增 ${r.added} 题</span><br>
      ${r.dup?`跳过重复 ${r.dup} 题<br>`:''}
      ${r.cut?`<span class="imp-no">超出容量，截断 ${r.cut} 题</span><br>`:''}
      <span style="color:#9cc0e0;font-size:var(--fs-sm)">重练时看图做：先选思路，再选答案；卡住有 3~4 步提示，答完摊开完整讲解</span>
    </div>
    <div class="row"><button class="btn" id="pvDr">🔁 马上重练</button><button class="btn primary" id="ok">好</button></div>
  `);
  $('ok').onclick=closePanel;
  $('pvDr').onclick=()=>{closePanel();startWrongDrill(state.wrongBook.filter(w=>w.img),5);};
}
/* ---------- 识别设置 ---------- */
function showOcrSettings(){
  let mode=OCR_CFG.mode,preset=OCR_CFG.preset;
  let base=OCR_CFG.aiBase,key=OCR_CFG.aiKey,model=OCR_CFG.aiModel;
  let ep=OCR_CFG.endpoint,akey=OCR_CFG.key;
  /* 换预设时自动把地址和模型填上，Key 得自己填（没人替你保管） */
  function applyPreset(){
    const p=aiPreset(preset);
    if(!p||p.id==='custom')return;
    base=p.base;model=p.model;
  }
  function grab(){
    const g=id=>{const e=$(id);return e?String(e.value==null?'':e.value):null;};
    const b=g('ocBase'),k=g('ocKey'),m=g('ocModel'),e=g('ocEp'),ak=g('ocAKey');
    if(b!=null)base=b;if(k!=null)key=k;if(m!=null)model=m;
    if(e!=null)ep=e;if(ak!=null)akey=ak;
  }
  function save(){
    OCR_CFG.mode=mode;OCR_CFG.preset=preset;
    OCR_CFG.aiBase=(base||'').trim();OCR_CFG.aiKey=key;OCR_CFG.aiModel=(model||'').trim();
    OCR_CFG.endpoint=(ep||'').trim();OCR_CFG.key=akey;
    saveOcrCfg();
  }
  function aiForm(){
    if(mode!=='ai')return '';
    const cur=aiPreset(preset)||aiPreset('custom');
    const opts=AI_PRESETS.map(p=>`<option value="${p.id}"${p.id===preset?' selected':''}>${esc(p.n)}</option>`).join('');
    return `
      <div class="imp-box">
        <b>哪家的大模型？</b>选一个，地址和模型会自动填好，你只管填 Key<br>
        · 标「免费」的有官方免费额度或免费模型，先试这些<br>
        · 用 OpenAI 兼容格式，大部分国内外厂商都能接
      </div>
      <select class="shot-inp" id="ocPreset" style="margin-bottom:8px">${opts}</select>
      <input class="shot-inp" id="ocBase" placeholder="接口地址（Base URL）" value="${esc(base||cur.base)}" style="margin-bottom:8px">
      <input class="shot-inp" id="ocModel" placeholder="模型名" value="${esc(model||cur.model)}" style="margin-bottom:8px">
      <input class="shot-inp" id="ocKey" placeholder="API Key（填在这里，只存在本机）" value="${esc(key)}" style="margin-bottom:6px">
      <div class="center" style="color:#9cc0e0;font-size:var(--fs-xs);line-height:var(--lh-base);text-align:left">
        · Key 只存在这台设备的浏览器里，不会发给除了你选的那家之外的任何人<br>
        · 看图要花一点点钱（一张图约几分钱），免费的那个是真免费<br>
        · 如果提示「请求失败 / CORS」，说明这家不允许浏览器直连，换一家或自己搭个中转<br>
        · <b style="color:#9fe4ff">识别时会顺手要解析 / 步骤 / 思路层</b>：小模型（如 glm-4v-flash）
          偶尔吐不全，会自动退回只要题干和答案；想要步骤更准就换强一点的视觉模型
          （智谱可用 <b>glm-4v-plus</b> / <b>glm-4v</b>，地址不变，只改模型名）
      </div>`;
  }
  function render(){
    openPanel(`
      <h2>⚙️ 识别设置</h2>
      <div class="sub">认错题用哪种方式</div>
      <div class="menu-list">
        <button class="menu-li" id="ocAi"><span class="e">${mode==='ai'?'✅':'　'}</span>
          <span class="tx">🤖 AI 识别（推荐）<div class="d">视觉大模型，公式、化学式、表格、拍歪的都看得懂，还能判断科目和知识点</div></span></button>
        <button class="menu-li" id="ocT"><span class="e">${mode==='tess'?'✅':'　'}</span>
          <span class="tx">🆓 本地免费识别<div class="d">浏览器自己认，不用 Key，但就是普通的字库匹配 —— 公式和手写基本认不出</div></span></button>
        <button class="menu-li" id="ocA"><span class="e">${mode==='api'?'✅':'　'}</span>
          <span class="tx">🔧 自定义接口<div class="d">自己搭的服务，收图片返回文本</div></span></button>
      </div>
      ${aiForm()}
      ${mode==='api'?`<div style="margin-top:12px">
        <div class="imp-box">POST 一个 JSON <span class="imp-code">{"image":"图片base64"}</span>
          返回 <span class="imp-code">{"text":"识别出来的文字"}</span> 或直接返回纯文本</div>
        <input class="shot-inp" id="ocEp" placeholder="接口地址 URL" value="${esc(ep)}" style="margin-bottom:8px">
        <input class="shot-inp" id="ocAKey" placeholder="Key（没有就留空）" value="${esc(akey)}">
      </div>`:''}
      <div class="row"><button class="btn" id="ocTest">🧪 试一张</button><button class="btn primary" id="ocSave">💾 保存</button></div>
      <div class="row"><button class="btn" id="ok">返回</button></div>
    `);
    $('ocAi').onclick=()=>{grab();mode='ai';save();render();};
    $('ocT').onclick =()=>{grab();mode='tess';save();render();};
    $('ocA').onclick =()=>{grab();mode='api';save();render();};
    const ps=$('ocPreset');
    if(ps)ps.onchange=()=>{grab();preset=ps.value;applyPreset();save();render();};
    $('ocSave').onclick=()=>{grab();save();toast('已保存 ✅');};
    $('ocTest').onclick=async()=>{
      grab();save();
      if(!PHOTO_SHOTS.length){toast('先加一张图再试');return;}
      toast('识别中…');
      const r=await ocrOne(PHOTO_SHOTS[0].url,t=>toast(t));
      if(!r.ok){alert('❌ 识别失败：'+r.err);return;}
      let msg='题干：'+(r.text||'(空)')+'\n\n答案：'+(r.ans||'(没找到，会自己敲)');
      if(r.topic)msg+='\n\n知识点：'+r.topic;
      if(r.subject)msg+='\n科目：'+r.subject;
      if(r.opts&&r.opts.length)msg+='\n\n选项：'+r.opts.join(' / ');
      if(r.explain)msg+='\n\n解析：'+r.explain;
      if(r.steps&&r.steps.length)msg+='\n\n思路（' +r.steps.length+' 步）：\n'
        +r.steps.map((s,i)=>(i+1)+'. '+s).join('\n');
      if(r.appr)msg+='\n\n思路层：'+r.appr.r
        +'\n（干扰项：'+r.appr.opts.filter(v=>v!==r.appr.r).join(' / ')+'）';
      /* 试一张不带深度信息，多半是模型吐不出长 JSON 自动退回简版了 */
      if(!r.steps&&!r.explain)msg+='\n\n（这次没拿到解析与步骤，已退回只认题干答案）';
      alert(msg);
    };
    $('ok').onclick=()=>{grab();save();showImportPhoto();};
  }
  render();
}

