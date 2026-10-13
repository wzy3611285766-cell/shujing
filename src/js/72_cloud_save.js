/* =========================================================
   覆盖：顶栏「区域名」在烽火里点开行动大厅
   —— 引擎给 regionChip 绑的是匿名监听器，没法直接替换，
      这里加一个捕获阶段的监听：捕获先于冒泡，stopPropagation 就能拦下。
   ========================================================= */
(function(){
  function openLobby(e){
    if(CUR!==BLAZE)return;
    e.stopPropagation();
    audioKick();showBlazeLobby();
  }
  const el=document.getElementById('regionChip');
  if(el)el.addEventListener('click',openLobby,true);
  const nb=document.getElementById('btnNation');
  if(nb)nb.addEventListener('click',openLobby,true);
})();



/* =========================================================
   云存档 · 账号与跨设备同步（2026-10-13）
   ---------------------------------------------------------
   在此之前进度只躺在浏览器 localStorage 里：换台设备、换个浏览器、
   清了缓存，攒下来的东西就没了。这一段接上云端的账号体系 ——
   登录一次，之后本机每次存档都会自动往云上备一份；
   在另一台设备上登录同一个账号，进度自己回来。

   三条原则，写在这儿免得以后改坏：
   1. 本机永远是主副本。没网、没登录、云挂了，游戏照常玩 ——
      云端只做备份，不做运行前提。
   2. 覆盖前先备份。云端存档要盖本机之前，先把本机那份原样留一份到
      shujing_prev_local，面板上留一个「撤销」的口子。
   3. 比"谁更新"用「存档自己记的写入时刻」，不用设备时钟去猜 ——
      两台设备时间差几小时也不会把进度判反。
   ========================================================= */
const CLOUD={
  /* 这四个值来自云服务开通时返回的 publicConfig，是唯一允许写进前端的配置。
     换域名 / 重新发布时要跟着更新，否则服务端会因为来源不匹配拒绝请求。 */
  endpoint:'https://shujing.app.workbuddy.host',
  oauthRelayBaseUrl:'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey:'wbpk_5b1uGj28EZC4FoiTkHB5Do_RDU6rzofAxGC6dArqNoKUBBHYTa6OM6q',
  sdkUrl:'https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js',
  host:'shujing.app.workbuddy.host'
};
const SYNC_PREFIX=['genji_','himath_'];   // 跟着云走的存档键前缀（shujing_ 开头的本机元数据不同步）
const SYNC_AT='shujing_local_at';         // 本机存档最后写入时刻
const SYNC_BK='shujing_prev_local';       // 被云端覆盖前的本机存档备份
const SYNC_OFF='shujing_sync_off';        // 玩家手动关掉自动同步

const ACCT={
  sdk:'idle',          // idle | loading | ready | fail
  cloud:null,
  user:null,
  step:'phone',        // phone | code
  pending:null,        // 发过验证码之后待验证的那条
  busy:false,
  msg:'',
  msgKind:'',
  lastSync:0,
  autoTimer:null,
  dirty:false,
  atWritten:0
};

/* 输入框统一这一套，跟「AI 设置」里的 Key 输入框保持一致 */
const ACCT_IN='width:100%;padding:10px 12px;border-radius:11px;background:rgba(255,255,255,.07);'
  +'border:1px solid rgba(255,255,255,.16);color:#eaf4ff;font-size:var(--fs-md);font-family:inherit';
const ACCT_LB='color:#9cc0e0;font-size:var(--fs-sm);margin:0 0 5px';
const ACCT_ERR='color:#ffb0b0;font-size:var(--fs-sm);margin:4px 0 0;min-height:1.1em';

function acctMsg(t,k){ACCT.msg=t||'';ACCT.msgKind=k||'';}

/* 登录只认应用自己的发布域名：服务端拿 Origin 做精确比对。
   本地双击打开的 file:// 不带 Origin，预览地址也不是注册过的回调域名 ——
   这两种情况老老实实说不支持，别让玩家点半天以为是网卡了。 */
function cloudOriginOK(){
  try{
    if(location.protocol==='file:')return 'file';
    if(location.hostname===CLOUD.host)return 'ok';
    return 'other';
  }catch(e){return 'other';}
}
function cloudWhy(){
  const s=cloudOriginOK();
  if(s==='file')return '现在是本地打开的文件版，浏览器不会给出可校验的来源，登录同步用不了。';
  if(s==='other')return '当前是从 '+location.hostname+' 打开的，不是这个应用发布后的地址，登录同步用不了。';
  return '';
}

/* ---------- SDK：按需加载；加载不出来就当没有这个功能 ---------- */
function cloudLoadSdk(cb){
  if(ACCT.cloud){cb&&cb();return;}
  if(window.WorkBuddyCloud){cloudInit(cb);return;}
  if(ACCT.sdk==='loading')return;
  if(ACCT.sdk==='fail'){cb&&cb();return;}
  ACCT.sdk='loading';
  const s=document.createElement('script');
  s.src=CLOUD.sdkUrl;
  s.onload=()=>{ACCT.sdk='ready';cloudInit(cb);};
  s.onerror=()=>{ACCT.sdk='fail';acctMsg('云端组件没加载出来 —— 检查一下网络，或者稍后再试。','bad');cb&&cb();};
  document.head.appendChild(s);
}
function cloudInit(cb){
  if(ACCT.cloud){cb&&cb();return;}
  try{
    ACCT.cloud=window.WorkBuddyCloud.createWorkBuddyCloud({
      endpoint:CLOUD.endpoint,
      oauthRelayBaseUrl:CLOUD.oauthRelayBaseUrl,
      publishableKey:CLOUD.publishableKey
    });
  }catch(e){ACCT.sdk='fail';acctMsg('云端组件初始化失败：'+e.message,'bad');}
  cb&&cb();
}

/* ---------- 存档打包 / 解包 ---------- */
function collectLocal(){
  const keys={};
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&SYNC_PREFIX.some(p=>k.indexOf(p)===0))keys[k]=localStorage.getItem(k);
    }
  }catch(e){}
  return keys;
}
/* 本机这份练到什么程度了 —— 用来判断「要不要让云端盖掉它」。
   刚装好的空档不该拦住云端存档；真练过的档也不能被一份旧云端覆盖。 */
function localProgress(){
  const cnt=o=>(o&&typeof o==='object')?Object.keys(o).length:0;
  let n=0;
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(raw){const o=JSON.parse(raw)||{};
      n+=cnt(o.solved)*3+cnt(o.badges)*20+cnt(o.caught)*5;
      n+=Math.max(0,(o.crystals|0))/10;
      n+=(Array.isArray(o.wrongBook)?o.wrongBook.length:0);
      n+=Math.max(0,(o.totalRight|0))/2;
    }
    const e=localStorage.getItem(SAVE_KEY_EPIC);
    if(e){const o=JSON.parse(e)||{};n+=cnt(o.read)*6+cnt(o.quiz)*4;}
    const b=localStorage.getItem(SAVE_KEY_BLAZE);
    if(b){const o=JSON.parse(b)||{};n+=cnt(o.solved)*4+cnt(o.badges)*10;}
    const d=localStorage.getItem(SAVE_KEY_DRILL);
    if(d){const o=JSON.parse(d)||{};n+=cnt(o.drill)*2+Math.max(0,(o.totalRight|0))/2;}
  }catch(err){}
  return Math.round(n);
}
function localAt(){return Number(localStorage.getItem(SYNC_AT))||0;}
function packNow(){
  return {v:1,at:Date.now(),dev:deviceName(),prog:localProgress(),keys:collectLocal()};
}
function deviceName(){
  const u=navigator.userAgent||'';
  if(/iPhone|iPad|iPod/i.test(u))return 'iPhone / iPad';
  if(/Android/i.test(u))return 'Android 手机';
  if(/Macintosh/i.test(u))return 'Mac';
  if(/Windows/i.test(u))return 'Windows 电脑';
  return '浏览器';
}
function fmtAt(ms){
  if(!ms)return '—';
  const d=new Date(ms),p=n=>String(n).padStart(2,'0');
  return (d.getMonth()+1)+'月'+d.getDate()+'日 '+p(d.getHours())+':'+p(d.getMinutes());
}
function syncOff(){try{return localStorage.getItem(SYNC_OFF)==='1';}catch(e){return false;}}
function setSyncOff(v){
  try{v?localStorage.setItem(SYNC_OFF,'1'):localStorage.removeItem(SYNC_OFF);}catch(e){}
}

/* ---------- 上传 / 下载 ---------- */
function db(){return ACCT.cloud.database;}
async function sessionNow(){
  if(!ACCT.cloud)return null;
  try{
    const r=await ACCT.cloud.auth.getSession();
    if(r&&r.error){ACCT.user=null;return null;}
    const s=r&&r.data;
    ACCT.user=(s&&s.user)?s.user:null;
    return s||null;
  }catch(e){ACCT.user=null;return null;}
}
async function cloudPush(silent){
  if(!ACCT.cloud||ACCT.busy)return false;
  const s=await sessionNow();
  if(!s){if(!silent)acctMsg('还没登录，先登录再同步。','bad');return false;}
  ACCT.busy=true;
  const pack=packNow();
  const row={
    payload:JSON.stringify(pack),
    saved_at:pack.at,
    device:pack.dev,
    owner_name:(ACCT.user&&ACCT.user.name)||null,
    updated_at:new Date().toISOString()
  };
  let ok=false,errTxt='';
  try{
    let r=await db().from('saves').upsert(row,{onConflict:'owner_id'}).select();
    if(r&&r.error){
      /* upsert 万一不被支持，退回「查一行 → 更新，没有才插入」。
         owner_id 上有唯一约束，两条路都不会写出重复行。 */
      const q=await db().from('saves').select('id').limit(1);
      if(q&&q.data&&q.data.length){
        r=await db().from('saves').update(row).eq('id',q.data[0].id).select();
      }else{
        r=await db().from('saves').insert(row).select();
      }
    }
    if(r&&r.error)errTxt=r.error.message||'未知错误';
    else if(r&&Array.isArray(r.data)&&r.data.length===0)errTxt='没有写入权限';
    else ok=true;
  }catch(e){errTxt=e.message||'网络异常';}
  ACCT.busy=false;
  if(ok){
    try{localStorage.setItem(SYNC_AT,String(pack.at));}catch(e){}
    ACCT.atWritten=pack.at;
    ACCT.lastSync=pack.at;ACCT.dirty=false;
    if(silent)toast('☁️ 云存档已更新');
    else acctMsg('已上传 ✓ 云端存下了本机 '+fmtAt(pack.at)+' 的进度。','ok');
  }else if(!silent){
    acctMsg('上传失败：'+(errTxt||'请稍后再试'),'bad');
  }
  return ok;
}
async function cloudPull(){
  if(!ACCT.cloud)return null;
  try{
    const r=await db().from('saves').select('id,payload,saved_at,device,updated_at').limit(1);
    if(r&&r.error)throw new Error(r.error.message||'读取失败');
    if(!r||!r.data||!r.data.length)return null;
    const row=r.data[0];
    let pack=null;
    try{pack=JSON.parse(row.payload);}catch(e){}
    if(!pack||!pack.keys)return null;
    pack.rowId=row.id;pack.savedAt=Number(row.saved_at)||0;
    return pack;
  }catch(e){return null;}
}
/* 用云端盖本机：先留一份本机的，再写云端那份，最后整页重载 ——
   存档散在四五个键里，重载是唯一能保证「整份一起生效」的做法。 */
function applyCloud(pack){
  /* 覆盖前先把本机那份留一份（面板上的「撤销上次覆盖」就是回到这里）。
     关键：本机是空档时**不覆盖已有的备份** —— 否则连着盖两次，
     第一次留住的真进度会被第二次的空白顺手抹掉，备份就白留了。 */
  try{
    const had=localStorage.getItem(SYNC_BK);
    if(!had||localProgress()>0)
      localStorage.setItem(SYNC_BK,JSON.stringify({at:Date.now(),prog:localProgress(),keys:collectLocal()}));
  }catch(e){}
  try{
    Object.keys(pack.keys).forEach(k=>{localStorage.setItem(k,pack.keys[k]);});
    localStorage.setItem(SYNC_AT,String(pack.savedAt||Date.now()));
  }catch(e){acctMsg('写入失败：浏览器不允许存本地数据。','bad');return;}
  /* 先把"盖过哪一版"记下来再重载：重启后云对账看到这个标记就不会再盖第二次 */
  markApplied(pack.savedAt);
  toast('☁️ 云端进度已取回 · 正在重开…');
  setTimeout(()=>location.reload(),900);
}
/* 面板上那句「本机备份：…」，让玩家知道撤销能换回什么时候的进度 */
function backupInfo(){
  try{
    const bk=JSON.parse(localStorage.getItem(SYNC_BK)||'null');
    if(!bk||!bk.keys)return '';
    return fmtAt(bk.at)+(bk.prog?' · '+bk.prog+' 分':'');
  }catch(e){return '';}
}
function undoCloud(){
  let bak=null;
  try{bak=JSON.parse(localStorage.getItem(SYNC_BK)||'null');}catch(e){}
  if(!bak||!bak.keys)return false;
  try{
    /* 先把本机现有的存档键清掉再写回备份 —— 否则"备份里没有、现在有"的键会残留 */
    Object.keys(collectLocal()).forEach(k=>localStorage.removeItem(k));
    Object.keys(bak.keys).forEach(k=>localStorage.setItem(k,bak.keys[k]));
    localStorage.removeItem(SYNC_BK);
    localStorage.setItem(SYNC_AT,String(Date.now()));
  }catch(e){return false;}
  toast('↩️ 已换回本机那份进度 · 正在重开…');
  setTimeout(()=>location.reload(),900);
  return true;
}

/* ---------- 启动时自动对一次账 ---------- */
/* 上一次"云端盖本机"盖的是云端哪一版（同一个标签页内有效）。
   取回会整页重载，标记活在 sessionStorage 里，重载后还在 ——
   这是"绝不在同一份云端存档上重载第二次"的凭据。 */
const SYNC_APPLIED='shujing_applied_at';
function appliedAt(){try{return Number(sessionStorage.getItem(SYNC_APPLIED))||0;}catch(e){return 0;}}
function markApplied(v){try{sessionStorage.setItem(SYNC_APPLIED,String(v||0));}catch(e){}}

/* 对账决策：只吃数字，不碰网络也不碰 DOM，所以可以直接被自动化测试喂极端输入。
   返回 'none' | 'apply'（云端盖本机）| 'push'（本机推上去）

   ⚠️ 这里修的是一个真实事故：老逻辑第一句是「本机进度为 0 → 取回云端」，
      而取回之后会整页重载；新账号第一次登录时推上云的恰好是一份空档，
      于是重启后本机还是 0 分、云端还是 0 分 → 再取回 → 再重载 —— 无限循环，
      玩家永远进不了游戏。现在两头都堵上：
      ① 两边都是空档就什么都不做（没有"更好的一份"可换）；
      ② 同一份云端存档只允许盖本机一次（applied 标记），
         万一盖完本机还是空的，也只是停在那儿，不会来回重载。 */
function cloudDecide(d){
  const prog=Number(d.prog)||0, cp=Number(d.cp)||0;
  const mine=Number(d.mine)||0, at=Number(d.savedAt)||0;
  const applied=Number(d.applied)||0;
  if(prog<=0&&cp<=0)return 'none';          // ① 都没东西：不换、不重载
  if(at&&applied===at)return 'none';        // ② 这份云端刚盖过一次：不再盖
  if(prog<=0)return 'apply';                //    本机空、云端有 → 取回
  if(cp<=0)return 'push';                   //    云端空、本机有 → 推上去（别拿空档盖掉真进度）
  if(!mine)return 'push';                   //    本机练过但从没同步过 → 保本机（原有规矩）
  if(at>mine+2000)return 'apply';           //    云端更新 → 取回
  if(d.dirty||mine>at)return 'push';        //    本机更新 → 推上去
  return 'none';
}
async function cloudAutoSync(){
  if(syncOff()||!ACCT.cloud)return;
  const s=await sessionNow();
  if(!s)return;                                  // 没登录：什么都不做
  const pack=await cloudPull();
  if(!pack){cloudPush(true);return;}             // 云端还没有：把本机推上去
  const act=cloudDecide({
    prog:localProgress(),cp:pack.prog,mine:localAt(),
    savedAt:pack.savedAt,applied:appliedAt(),dirty:ACCT.dirty
  });
  if(act==='apply'){applyCloud(pack);return;}
  if(act==='push'){cloudPush(true);return;}
  /* 走到这儿说明"不用动"。如果这份云端刚取回过、本机却还是空的，
     那就是云端那份也救不了本机 —— 说明白，别让玩家对着空白页猜。 */
  if(localProgress()<=0&&pack.savedAt&&appliedAt()===pack.savedAt){
    toast('☁️ 云端存档取回后本机仍是空的 —— 先不重复重载了，去 ☰ → 云存档 看一眼');
  }
}
/* 本机每存一次档就盖一个「本机改过」的时间戳，攒够 15 秒再往云上送一次 ——
   游戏本身是每 5 秒存一跳，直接每次都推会白烧流量。
   时间戳最多 20 秒落一次盘，避免每 5 秒写一次 localStorage。 */
function cloudMarkDirty(){
  const now=Date.now();
  if(now-ACCT.atWritten>20000){
    ACCT.atWritten=now;
    try{localStorage.setItem(SYNC_AT,String(now));}catch(e){}
  }
  if(syncOff()||!ACCT.cloud||!ACCT.user)return;
  ACCT.dirty=true;
  if(ACCT.autoTimer)return;
  ACCT.autoTimer=setTimeout(()=>{
    ACCT.autoTimer=null;
    if(ACCT.dirty&&ACCT.user)cloudPush(true);
  },15000);
}

/* ---------- 登录 ---------- */
async function acctSendCode(){
  const inp=$('acctPhone');
  const phone=((inp&&inp.value)||'').replace(/\s|-/g,'');
  const pe=$('acctPErr');
  if(!/^1\d{10}$/.test(phone)){if(pe)pe.textContent='请输入正确的 11 位手机号';return;}
  if(pe)pe.textContent='';
  if(!ACCT.cloud){acctMsg('云端还没连上，稍等一下再点。','bad');return;}
  acctMsg('正在发送…','');
  const r=await ACCT.cloud.auth.sendOtp({phone:phone});
  if(r&&r.error){acctMsg('发送失败：'+(r.error.message||'请稍后再试'),'bad');return;}
  ACCT.pending={phone:phone,verificationId:r.data.verificationId,isExistingUser:r.data.isExistingUser};
  ACCT.step='code';
  acctMsg('验证码已发出，看一下短信。','ok');
  acctRender();
}
async function acctVerify(){
  const pend=ACCT.pending;
  if(!pend){acctMsg('请先点「获取验证码」。','bad');return;}
  const inp=$('acctCode');
  const code=((inp&&inp.value)||'').trim();
  if(!code){acctMsg('把短信里的验证码填进来。','bad');return;}
  acctMsg('正在验证…','');
  const r=await ACCT.cloud.auth.verifyOtp({
    phone:pend.phone,verificationId:pend.verificationId,
    isExistingUser:pend.isExistingUser,token:code
  });
  if(r&&r.error){acctMsg('验证失败：'+(r.error.message||'验证码不对或已过期'),'bad');return;}
  ACCT.pending=null;ACCT.step='phone';
  ACCT.user=(r&&r.data)?r.data.user:null;
  acctMsg('登录成功，正在对账…','ok');
  acctRender();
  setTimeout(cloudAutoSync,200);
}
async function acctWechat(){
  if(!ACCT.cloud){acctMsg('云端还没连上，稍等一下再点。','bad');return;}
  acctMsg('正在跳转微信…','');
  const r=await ACCT.cloud.auth.signInWithOAuth({provider:'wechat',redirectTo:location.origin});
  if(r&&r.error){acctMsg('微信登录打不开：'+(r.error.message||''),'bad');return;}
  if(r&&r.data&&r.data.url)location.assign(r.data.url);
  else acctMsg('微信登录没有返回跳转地址。','bad');
}
async function acctLogout(){
  try{await ACCT.cloud.auth.signOut();}catch(e){}
  ACCT.user=null;ACCT.pending=null;ACCT.step='phone';
  acctMsg('已退出登录。云端存档还在，随时能再登回来。','ok');
  acctRender();
}
/* 微信回跳进来的那一次要先把 code 换掉再谈别的。
   state 是一次性的，换完必须从地址栏抹掉，否则刷新会重放一次已用过的 code。 */
async function cloudRestoreAuth(cb){
  let url;
  try{url=new URL(location.href);}catch(e){cb&&cb();return;}
  if(!url.searchParams.has('code')&&!url.searchParams.has('error')){cb&&cb();return;}
  if(url.searchParams.get('provider')!=='wechat'){cb&&cb();return;}
  const fn=ACCT.cloud.auth.handleWechatWebCallback;
  if(typeof fn!=='function'){acctMsg('当前云端组件不支持微信登录。','bad');cb&&cb();return;}
  const r=await fn.call(ACCT.cloud.auth);
  if(r&&r.error)acctMsg('微信登录失败：'+(r.error.message||''),'bad');
  else{
    ['code','state','provider'].forEach(k=>url.searchParams.delete(k));
    try{history.replaceState(null,'',url.pathname+url.search+url.hash);}catch(e){}
  }
  cb&&cb();
}

/* ---------- 面板 ---------- */
function acctRender(){
  const box=$('acctWrap');
  if(!box)return;
  box.innerHTML=acctBodyHtml();
  acctBind();
}
function acctBodyHtml(){
  const why=cloudWhy();
  const u=ACCT.user;
  const m=ACCT.msg
    ?'<div class="center" style="font-size:var(--fs-sm);margin:8px 0;color:'
      +(ACCT.msgKind==='bad'?'#ffb0b0':(ACCT.msgKind==='ok'?'#8fe0a8':'#9cc0e0'))+'">'+esc(ACCT.msg)+'</div>'
    :'';
  if(why){
    return '<div class="center" style="padding:4px 0 2px">'
      +'<div style="font-size:42px;line-height:1.2">☁️</div>'
      +'<div class="sub" style="margin-top:6px">云存档 · 换设备也能接着玩</div></div>'
      +'<div class="center" style="background:rgba(255,180,90,.10);border:1px solid rgba(255,180,90,.3);'
      +'border-radius:12px;padding:11px 13px;font-size:var(--fs-sm);color:#ffd9a8;text-align:left;margin:10px 0">'
      +'⚠️ '+esc(why)+'<br><br>要用登录同步，请从<b>发布后的网址</b>打开这个游戏。'
      +'<br>本机这份进度不受影响，照常能玩、照常自动存档。</div>';
  }
  if(ACCT.sdk==='fail'){
    return '<div class="center" style="font-size:var(--fs-sm);color:#ffb0b0;margin:12px 0">'
      +'云端组件没加载出来，检查一下网络，再打开这个面板试试。</div>'+m;
  }
  if(!ACCT.cloud){
    return '<div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;margin:12px 0">正在连接云端…</div>'+m;
  }
  if(u){
    const off=syncOff();
    const bkInfo=backupInfo();
    return '<div class="center" style="font-size:40px;line-height:1.2">✅</div>'
      +'<div class="center" style="color:#8fe0a8;font-weight:700;margin:2px 0 10px">已登录</div>'
      +'<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;'
      +'padding:11px 13px;font-size:var(--fs-sm);line-height:1.75;color:#cfe6ff">'
      +'账号：'+esc(u.name||u.phone||u.email||'已登录')+'<br>'
      +'本机最后存档：<b>'+fmtAt(localAt())+'</b><br>'
      +'本机进度：<b>'+localProgress()+'</b> 分<br>'
      +'自动同步：<b style="color:'+(off?'#ffd76a':'#8fe0a8')+'">'+(off?'已关闭':'开启中')+'</b>'
      +'</div>'+m
      +'<div class="row" style="margin-top:12px">'
      +'<button class="btn primary" id="acctUp">⬆️ 上传本机进度</button>'
      +'<button class="btn" id="acctDown">⬇️ 取回云端进度</button></div>'
      +'<div class="row">'
      +'<button class="btn" id="acctToggle">'+(off?'开自动同步':'关自动同步')+'</button>'
      +'<button class="btn" id="acctUndo">↩️ 撤销上次覆盖</button></div>'
      +(bkInfo?'<div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-top:6px">'
        +'本机备份：'+esc(bkInfo)+'（撤销可换回）</div>':'')
      +'<div class="row"><button class="btn" id="acctOut">退出登录</button></div>'
      +'<div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-top:8px;line-height:1.6">'
      +'换设备时：在新设备上打开同一个网址 → 登录同一账号 → 进度自动取回。</div>';
  }
  if(ACCT.step==='code'){
    return '<div class="center" style="font-size:40px;line-height:1.2">📩</div>'
      +'<div class="center" style="color:#cfe6ff;margin:2px 0 12px;font-size:var(--fs-sm)">'
      +'验证码已发到 '+esc(ACCT.pending?ACCT.pending.phone:'')+'</div>'
      +'<div style="text-align:left"><div style="'+ACCT_LB+'">验证码</div>'
      +'<input id="acctCode" type="tel" inputmode="numeric" maxlength="6" placeholder="6 位数字" style="'+ACCT_IN+'"></div>'
      +m
      +'<div class="row" style="margin-top:12px">'
      +'<button class="btn" id="acctBack">← 换号码</button>'
      +'<button class="btn primary" id="acctGo">登录 / 注册</button></div>';
  }
  return '<div class="center" style="font-size:40px;line-height:1.2">☁️</div>'
    +'<div class="sub" style="margin-top:4px">登录后存档自动上云 · 换设备登同一账号就能取回</div>'
    +'<div style="text-align:left;margin-top:12px">'
    +'<div style="'+ACCT_LB+'">手机号</div>'
    +'<input id="acctPhone" type="tel" inputmode="numeric" maxlength="11" placeholder="11 位手机号" style="'+ACCT_IN+'">'
    +'<div id="acctPErr" style="'+ACCT_ERR+'"></div></div>'
    +m
    +'<div class="row" style="margin-top:6px">'
    +'<button class="btn" id="acctSend">获取验证码</button>'
    +'<button class="btn primary" id="acctGo">登录 / 注册</button></div>'
    +'<div class="center" style="color:#7d94ab;font-size:var(--fs-xs);margin:12px 0 8px">— 或者 —</div>'
    +'<div class="row"><button class="btn" id="acctWx">💬 微信登录</button></div>'
    +'<div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-top:10px;line-height:1.6">'
    +'没登录也能玩。登录只是为了换设备时进度能跟着走。</div>';
}
function acctBind(){
  const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn;};
  on('acctSend',()=>{if(!ACCT.busy)acctSendCode();});
  on('acctGo',()=>{if(ACCT.busy)return;ACCT.step==='code'?acctVerify():acctSendCode();});
  on('acctBack',()=>{ACCT.step='phone';ACCT.pending=null;acctMsg('');acctRender();});
  on('acctWx',()=>{if(!ACCT.busy)acctWechat();});
  on('acctUp',()=>cloudPush(false));
  on('acctDown',async()=>{
    acctMsg('正在取回…','');
    const p=await cloudPull();
    if(!p){acctMsg('云端还没有存档 —— 先在这台设备上传一次。','bad');return;}
    acctMsg('云端存的是 '+fmtAt(p.savedAt)+' 的进度，正在换过来…','ok');
    setTimeout(()=>applyCloud(p),500);
  });
  on('acctToggle',()=>{
    setSyncOff(!syncOff());
    acctMsg(syncOff()?'已关掉自动同步：存档只留在本机。':'已打开自动同步，之后自动往云上送。','ok');
    acctRender();
  });
  on('acctUndo',()=>{
    let has=false;
    try{has=!!localStorage.getItem(SYNC_BK);}catch(e){}
    if(!has){acctMsg('没有可撤销的备份 —— 只在上一次被云端覆盖时才会留一份。','bad');return;}
    undoCloud();
  });
  on('acctOut',()=>{if(!ACCT.busy)acctLogout();});
  const ph=$('acctPhone');
  if(ph)ph.addEventListener('input',()=>{const e=$('acctPErr');if(e)e.textContent='';});
}
function showAccountPanel(){
  openPanel('<h2>☁️ 云存档</h2>'
    +'<div class="sub">登录一次，手机和电脑共用同一份进度</div>'
    +'<div id="acctWrap">'+acctBodyHtml()+'</div>'
    +'<div class="row" style="margin-top:12px"><button class="btn" id="acctClose">关闭</button></div>');
  $('acctClose').onclick=closePanel;
  acctBind();
  if(!ACCT.cloud&&ACCT.sdk!=='fail'&&!cloudWhy())cloudLoadSdk(()=>acctRender());
}

/* ---------- 挂上自动同步 ---------- */
(function cloudBoot(){
  /* save() 每 5 秒被自动调一次，这里只盖个时间戳 + 挂脏标记，不发网络请求 */
  const _save=save;
  save=function(){
    const r=_save.apply(this,arguments);
    /* 不看返回值：只要存档动作发生过就记一笔"本机改过"。
       （save() 在"内容没变"时返回 true、在熔断时返回 false，
         以前用 if(r) 判断，等于把"没写成功"当成了"没改过"。） */
    cloudMarkDirty();
    return r;
  };
  if(cloudWhy())return;                     // 本地文件版：一个远端请求都不发
  cloudLoadSdk(()=>{
    if(!ACCT.cloud)return;
    cloudRestoreAuth(()=>cloudAutoSync());
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'&&ACCT.dirty&&ACCT.user)cloudPush(true);
  });
})();

/* 菜单里那一行的说明文字：三种状态说人话 */
function acctMenuDesc(){
  if(cloudWhy())return '本机离线版 · 登录同步要在发布后的网址上用';
  if(ACCT.user)return '☁️ 已登录 · 换设备登同一账号即可取回进度';
  if(ACCT.sdk==='fail')return '云端组件没加载出来，点开看看';
  return '登录后手机和电脑共用一份进度';
}

