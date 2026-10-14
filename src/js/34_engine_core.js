/* =========================================================
   引擎 B：状态 / 音效 / 渲染 / 输入 / 主循环 / 界面
   ========================================================= */

/* ---------------- 状态与存档 ---------------- */
/* 两个模式各用一份进度：state 始终指向"当前世界"的那一份 */
function blankState(){
  return {
    x:0,y:0,region:'',
    crystals:0,
    badges:{},caught:{},solved:{},loose:{},
    tier:{},
    hint:2,
    sound:true,
    totalRight:0,totalWrong:0,
    wrongBook:[],
    wrongDone:[],        // 已掌握的错题（毕业归档区，可拉回来重学）
    wbRev:{},            // 复习流水账：上次复习日 / 当天复习数 / 连续天数
    streak:0,
    /* 新增：考点诊断用的流水账
       stat[岛id] = {r:答对, w:答错}；tstat[知识点] = {r,w}（知识点比岛更细） */
    stat:{}, tstat:{},
    /* 思路层流水账：astat[知识点] = {r:思路对, w:思路错}
       单独记录，这样"会做但切入慢"和"做错"能分开看 */
    astat:{},
    /* 练枪场流水账：drill[科目] = {n,r,w,ar,aw,t:{知识点:{r,w}}}
       独立于 stat / tstat，这样"闯关推图的数据"和"练枪刷的数据"能分开看；
       知识点那一层会自动排出薄弱点，练枪面板直接读它 */
    drill:{},
    drillTier:{},        // 练枪场：每科上次选的难度档（1/2/3）
    drillTopic:{},       // 练枪场：每科上次选的专题 id（'all' = 不挑专题）
    daily:'',            // 每日一练：已完成的那一天（YYYY-MM-DD）
    dailyStreak:0,       // 连续完成天数
    bestStreak:0,        // 历史最长连对
    intro:false,
    read:{},          // 史诗：已读卷宗
    quiz:{},          // 史诗：已通过的时空考题
    era:''
  };
}
let state=blankState();
let curKey=SAVE_KEY;           // 当前世界的存档键
/* memSave 是"内存里的存档副本"，只在 localStorage 写不进去（无痕模式）时顶上。
   必须记住它是哪一把钥匙的副本：闯关和史诗各存各的键，
   不分钥匙地顶上，会把上一个世界的进度整份灌进新世界。 */
let memSave=null,memSaveKey=null,lastSaveAt=0,storageOK=true;
let wiping=false;            // 正在清档：这一刻起所有自动保存全部停掉
function save(){
  if(wiping)return false;
  let str=null;
  try{str=JSON.stringify(state);}catch(e){return false;}
  /* 内容没变就别再写一次。自动存档每 5 秒一跳，玩家站在原地不动时
     原本也会一遍遍序列化 + 写 localStorage。
     storageOK 为 false（无痕/被禁用）时不跳过，下次仍会重试写入。 */
  if(str===memSave&&storageOK)return true;
  memSave=str;memSaveKey=curKey;
  try{localStorage.setItem(curKey,str);storageOK=true;lastSaveAt=Date.now();return true;}
  catch(e){storageOK=false;return false;}   // 无痕模式 / 存储被禁用时退回内存
}
/* 老存档或手改过的存档可能缺字段，统一补齐，避免 undefined 报错 */
function healState(){
  const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  if(!isObj(state.badges))state.badges={};
  if(!isObj(state.caught))state.caught={};
  if(!isObj(state.solved))state.solved={};
  if(!isObj(state.loose))state.loose={};
  if(!isObj(state.tier))state.tier={};
  if(!isObj(state.read))state.read={};      // 史诗模式：已读篇章
  if(!isObj(state.quiz))state.quiz={};      // 史诗模式：已通过的时空考题
  if(!isObj(state.stat))state.stat={};      // 各岛答题统计（学习报告）
  if(!isObj(state.tstat))state.tstat={};    // 各知识点答题统计
  if(!isObj(state.astat))state.astat={};    // 各知识点思路选择统计
  if(!isObj(state.drill))state.drill={};    // 练枪场：各科 / 各知识点统计
  if(!isObj(state.drillTier))state.drillTier={};
  if(!isObj(state.drillTopic))state.drillTopic={};
  if(!Array.isArray(state.wrongBook))state.wrongBook=[];
  if(!Array.isArray(state.wrongDone))state.wrongDone=[];
  if(!isObj(state.wbRev))state.wbRev={};
  wbHealAll();          // 1.7.0：给老存档的错题补上熟炼度 / 复习日期
  if(typeof state.daily!=='string')state.daily='';
  if(typeof state.dailyStreak!=='number'||!isFinite(state.dailyStreak))state.dailyStreak=0;
  if(typeof state.crystals!=='number'||!isFinite(state.crystals))state.crystals=0;
  if(typeof state.hint!=='number'||!isFinite(state.hint))state.hint=2;
  state.hint=Math.max(0,Math.round(state.hint));   // 手改过的存档可能留下负数
  if(typeof state.totalRight!=='number')state.totalRight=0;
  if(typeof state.totalWrong!=='number')state.totalWrong=0;
  if(typeof state.streak!=='number')state.streak=0;
  if(typeof state.bestStreak!=='number'||!isFinite(state.bestStreak))state.bestStreak=0;
  if(typeof state.sound!=='boolean')state.sound=true;
  if(typeof state.x!=='number'||!isFinite(state.x))state.x=0;
  if(typeof state.y!=='number'||!isFinite(state.y))state.y=0;
  REGIONS.forEach(r=>{if(!state.tier[r.id])state.tier[r.id]=1;});
  /* 用"="而不是"||="：切换世界时要把上一个世界留下的 got 标记清干净 */
  LOOSE.forEach(c=>{c.got=!!state.loose[c.id];});
  if(typeof state.era!=='string')state.era='';
}
function load(){
  let s=null;
  try{localStorage.setItem(curKey+'__t','1');localStorage.removeItem(curKey+'__t');}
  catch(e){storageOK=false;}
  try{s=localStorage.getItem(curKey);}catch(e){storageOK=false;}
  /* 只有"同一个世界的备份"才能顶上。首次进入史诗时它还没有存档，
     若不分青红皂白用 memSave，闯关的徽章/结晶/坐标会被整份搬进编年史。 */
  if(!s&&memSave&&memSaveKey===curKey){s=memSave;storageOK=false;}
  try{ if(s){const o=JSON.parse(s);if(o&&typeof o==='object')Object.assign(state,o);} }
  catch(e){}
  healState();
}
/* 只清「当前世界」的进度，另一个模式的存档原封不动 ——
   图鉴和存档面板上的确认文案都是这么承诺的。
   scope==='all' 时才两个模式一起清（目前 UI 未开放，留作兜底）。 */
function resetSave(scope){
  if(wiping)return;
  const all=(scope==='all');
  wiping=true;                                   // 先熔断，再删，最后 reload
  try{
    const keys=all?[SAVE_KEY,SAVE_KEY_EPIC,SAVE_KEY_BLAZE,SAVE_KEY_DRILL]:[curKey];
    keys.forEach(k=>{
      localStorage.removeItem(k);
      localStorage.removeItem(k+'_intro');
    });
    /* 重开后 reload 默认落在闯关模式，记一个一次性标记回到刚才那个世界 */
    if(!all)localStorage.setItem('himath_lastmode',CUR===EPIC?'epic':(CUR===BLAZE?'blaze':(CUR===DRILL?'drill':'adv')));
    else localStorage.removeItem('himath_lastmode');
  }catch(e){}
  /* 内存里的进度也一并抹掉，防止 reload 前的自动保存又写回去。
     音效是全局偏好，清档不该把它一起重置。 */
  const resetObj=o=>{
    if(!o)return;
    const snd=o.sound;
    Object.keys(o).forEach(k=>delete o[k]);
    Object.assign(o,blankState());
    if(typeof snd==='boolean')o.sound=snd;
  };
  if(all||CUR!==EPIC)resetObj(ADV_STATE);
  if(all||CUR===EPIC)resetObj(EPIC_STATE);
  if(all||CUR===BLAZE)resetBlazeState();
  if(all||CUR===DRILL)resetObj(DRILL_STATE);
  /* 支援券是跨世界的，清掉某一个模式时留着 —— 那是你在别处真金白银换来的。
     只有「三个模式一起清」才连券一起作废。 */
  if(all){
    AID_ITEMS.forEach(it=>{AID_STATE[it.id]=0;});
    try{localStorage.removeItem(SAVE_KEY_AID);}catch(e){}
    /* 思路灵是跨三模式的「脑内进度」，只有全部重开才一起清掉 */
    try{localStorage.removeItem('genji_lings_v1');}catch(e){}
  }
  Object.keys(state).forEach(k=>delete state[k]);
  Object.assign(state,blankState());
  memSave=null;memSaveKey=null;
  try{location.reload();}catch(e){location.href=location.href;}
}

/* ---------------- 存档码：导出 / 导入 ----------------
   格式：HMG.<base64(gzip(JSON))>.<校验>   或   HM1.<base64(JSON)>.<校验>
   存档码是一串纯文本，复制走就行；换手机、清缓存、换浏览器都能粘回来。 */
function b64e(str){
  const bytes=new TextEncoder().encode(str);let bin='';
  for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64d(s){
  const bin=atob(s),bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function sumCode(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;
  return ((h>>>0)%1679616).toString(36).padStart(4,'0');}
async function exportCode(){
  /* 闯关 + 史诗两份进度一起打包，一个存档码就能带走全部。
     必须显式取 ADV_STATE / EPIC_STATE 两个对象，不能用 state：
     state 只是「当前世界」那一份的引用，在史诗模式下会写成
     {a:史诗, e:史诗}，闯关进度就永久丢了。 */
  const json=JSON.stringify({v:2,t:Date.now(),
    a:(typeof ADV_STATE!=='undefined'?ADV_STATE:state),
    e:(typeof EPIC_STATE!=='undefined'?EPIC_STATE:null),
    b:(typeof BLAZE_STATE!=='undefined'?BLAZE_STATE:null),
    /* 练枪场的独立进度（172 版加入） */
    d:(typeof DRILL_STATE!=='undefined'?DRILL_STATE:null),
    /* 支援券单独一份，换设备时跟着存档码一起走 */
    x:(typeof AID_STATE!=='undefined'?AID_STATE:null)});
  let pre='HM1',body;
  try{
    if(typeof CompressionStream!=='undefined'){
      const buf=await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
      const bytes=new Uint8Array(buf);let bin='';
      for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
      body=btoa(bin);pre='HMG';
    }else body=b64e(json);
  }catch(e){ body=b64e(json);pre='HM1'; }
  return pre+'.'+body+'.'+sumCode(body);
}
async function importCode(code){
  code=String(code||'').trim().replace(/\s+/g,'');
  const m=code.match(/^(HMG|HM1)\.([A-Za-z0-9+/=]+)\.([0-9a-z]{4})$/);
  if(!m)return{ok:false,msg:'存档码格式不对，请整段完整复制'};
  if(sumCode(m[2])!==m[3])return{ok:false,msg:'存档码不完整或已损坏'};
  let json;
  try{
    if(m[1]==='HMG'){
      const bin=atob(m[2]),bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      json=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    }else json=b64d(m[2]);
  }catch(e){return{ok:false,msg:'解码失败，存档码已损坏'};}
  let o;try{o=JSON.parse(json);}catch(e){return{ok:false,msg:'解析失败，存档码已损坏'};}
  if(!o||typeof o!=='object')return{ok:false,msg:'存档内容无效'};

  let adv=null,epic=null,blaze=null,aid=null,drill=null;
  if(o.v===2){
    /* v2：a = 闯关、e = 史诗、b = 烽火、d = 练枪场，四份各自独立。
       老码没有 b / d 字段，解析出来是 null，不影响其他模式。 */
    adv  =(o.a&&typeof o.a==='object')?o.a:null;
    epic =(o.e&&typeof o.e==='object')?o.e:null;
    blaze=(o.b&&typeof o.b==='object')?o.b:null;
    drill=(o.d&&typeof o.d==='object')?o.d:null;
    /* x = 支援券。老码没有这个字段，券留在原设备上也说得通 */
    aid  =(o.x&&typeof o.x==='object')?o.x:null;
    if(!adv&&!epic&&!blaze&&!drill)return{ok:false,msg:'存档内容无效'};
  }else{
    /* v1 老码：只有一个 s（导出时的当前世界）。
       用字段特征判断它属于哪一边——史诗进度一定有 read / quiz / era。
       史诗模式下导出的老码，闯关那一半确实已经丢了，这里只能尽力还原。 */
    const s=(o.s&&typeof o.s==='object')?o.s:null;
    if(!s)return{ok:false,msg:'存档内容无效'};
    const looksEpic=!!(s.read||s.quiz||s.era);
    if(looksEpic)epic=s; else adv=s;
    if(o.e&&typeof o.e==='object')epic=o.e;
  }
  return{ok:true,adv:adv,epic:epic,blaze:blaze,aid:aid,drill:drill};
}
function applySave(adv,epic,blaze,drill){
  /* 四份进度分开写回各自的对象，再让 state 指向的那一份同步 */
  if(adv &&typeof adv ==='object'&&typeof ADV_STATE !=='undefined')
    {Object.keys(ADV_STATE).forEach(k=>delete ADV_STATE[k]);Object.assign(ADV_STATE,adv);}
  if(epic&&typeof epic==='object'&&typeof EPIC_STATE!=='undefined')
    {Object.keys(EPIC_STATE).forEach(k=>delete EPIC_STATE[k]);Object.assign(EPIC_STATE,epic);}
  if(blaze&&typeof blaze==='object'&&typeof BLAZE_STATE!=='undefined')
    {Object.keys(BLAZE_STATE).forEach(k=>delete BLAZE_STATE[k]);Object.assign(BLAZE_STATE,blaze);
     BLAZE_STATE.run=null;}   // 进行中的那一局不跨设备继承，导入后回基地重新部署
  if(drill&&typeof drill==='object'&&typeof DRILL_STATE!=='undefined')
    {Object.keys(DRILL_STATE).forEach(k=>delete DRILL_STATE[k]);Object.assign(DRILL_STATE,drill);}
  /* state 是四个世界之一的引用，这里把引用内容重新对齐 */
  const mine=(CUR===EPIC&&typeof EPIC_STATE!=='undefined')?EPIC_STATE
            :((CUR===BLAZE&&typeof BLAZE_STATE!=='undefined')?BLAZE_STATE
            :((CUR===DRILL&&typeof DRILL_STATE!=='undefined')?DRILL_STATE:ADV_STATE));
  if(mine&&mine!==state)Object.assign(state,mine);
  healState();
  try{localStorage.setItem((curKey||SAVE_KEY)+'_intro','1');}catch(e){}
  save();
}

/* ---------------- 音效（照搬「学习目标管理台」的 Web Audio 现场合成引擎） ----------------
   设计要点：
   - 所有音色由振荡器 + 增益包络 + 低通滤波合成，不加载任何 mp3/wav，零音频文件
   - 输出链统一过主增益 → 软限幅器：想整体调响只改 SFX_MASTER 一个数，
     多个振荡器叠加（琶音、叠音）峰值超 1.0 时也不会削顶发破
   - AudioContext 在首次用户手势后惰性创建 / 恢复（移动端自动播放策略） */
let AC=null;
const SFX_MASTER=2.6;
let MASTER_NODE=null,MASTER_OWNER=null;
function audioMaster(ctx){
  if(MASTER_NODE&&MASTER_OWNER===ctx)return MASTER_NODE;
  const g=ctx.createGain();
  g.gain.value=SFX_MASTER;
  const comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-12;  // 超过 -12dB 开始压
  comp.knee.value=8;         // 软拐点，过渡不突兀
  comp.ratio.value=8;        // 8:1，接近限幅但保留一点动态
  comp.attack.value=0.003;
  comp.release.value=0.20;
  g.connect(comp);comp.connect(ctx.destination);
  MASTER_NODE=g;MASTER_OWNER=ctx;
  return g;
}
function audioCtx(){
  if(AC)return AC;
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return null;
    AC=new C();
    MASTER_NODE=null;MASTER_OWNER=null;   // 上下文重建时输出链一起重建
  }catch(e){AC=null;}
  return AC;
}
function soundOn(){return state.sound!==false;}
/* 单个音符：type 波形 / freq 基频 / dur 时长 / vol 音量 / delay 延迟
   slideTo 滑音终点 / filtHz 低通截止 / filtQ 谐振 / atk 起音 / slideDur 滑音时长 / detune 音分失谐 */
function tone(type,freq,dur,vol,delay,slideTo,filtHz,filtQ,atk,slideDur,detune){
  if(!soundOn())return;
  const ctx=audioCtx();
  if(!ctx||ctx.state==='closed')return;
  /* 上下文还没解锁（移动端/Chrome 的自动播放策略）：只申请恢复，
     【不要】在冻结的时间轴上排音符 —— suspended 时 ctx.currentTime 不前进，
     所有音符会堆在同一个 t0 上，等真解锁时一股脑炸出来，听着像噪音。
     这一次就先不响，下一拍再响。 */
  if(ctx.state!=='running'){audioUnlock();return;}
  try{
    const t0=ctx.currentTime+(delay||0);
    const a=atk==null?0.008:atk;
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type||'sine';
    osc.frequency.setValueAtTime(freq,t0);
    if(detune)osc.detune.setValueAtTime(detune,t0);
    if(slideTo&&slideTo!==freq){
      const sd=slideDur==null?Math.min(dur,0.06):slideDur;
      osc.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo),t0+Math.min(sd,dur));
    }
    /* 包络：起音 → 指数衰减 → 归零，避免爆音（click/pop） */
    gain.gain.setValueAtTime(0.0001,t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,vol==null?0.2:vol),t0+a);
    gain.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    let out=gain;
    if(filtHz){
      const f=ctx.createBiquadFilter();
      f.type='lowpass';f.frequency.setValueAtTime(filtHz,t0);f.Q.value=filtQ==null?0.7:filtQ;
      gain.connect(f);out=f;
    }
    osc.connect(gain);out.connect(audioMaster(ctx));
    osc.start(t0);osc.stop(t0+dur+0.03);
  }catch(e){}
}
function audioUnlock(){  // iOS / Chrome 要求手势内 resume
  const ctx=audioCtx();if(!ctx)return;
  if(ctx.state==='running')return;
  try{
    const p=ctx.resume&&ctx.resume();
    if(p&&p.catch)p.catch(()=>{});   // 手势外调用会被拒，静默吞掉即可
  }catch(e){}
}
function audioKick(){audioUnlock();}  // 兼容旧调用名
/* ---------- 首次手势解锁音频 ----------
   报障：「进游戏没声音，得手动开关一次音效才有」。
   根因：公告弹出时会播一段"解锁"音效（SFX.unlock，注意那是个【音效】不是解锁函数），
   而它发生在玩家第一次手势【之前】—— AudioContext 就是在这儿被创建成 suspended 的。
   之后所有音符都排在冻结的时间轴上，一直不出声，直到玩家碰巧点到某个会调 audioKick()
   的按钮才被 resume。而开局公告弹出时玩家第一下点的往往不是那种按钮。
   解法：挂全局监听，第一下手势（点/触/按键）就把上下文解锁，
   不再依赖"哪个按钮碰巧调了 kick"；解锁成功后自己摘掉监听，不留常驻回调。 */
(function bindFirstGestureAudio(){
  if(typeof document==='undefined')return;
  const EVTS=['pointerdown','touchstart','mousedown','keydown'];
  function onGesture(){
    audioUnlock();
    if(AC&&AC.state==='running')EVTS.forEach(e=>document.removeEventListener(e,onGesture,true));
  }
  EVTS.forEach(e=>document.addEventListener(e,onGesture,true));
})();
/* 音效清单：全部现场合成，纯正弦 / 三角 + 低通，不用方波（方波即使低通也发毛）
   right  —— 答对：E5→B5→E6 三级上行，干净利索
   wrong  —— 答错：两声柔和的下行小三度，低通正弦，音区压得低
   coin   —— 结晶入账：B5→E6 快速叮当 + 一星高八度尾光
   open   —— 展开面板：一段极轻的上滑，像抽屉拉开
   win    —— 通关 / 大收获：C-E-G-C 上行琶音，尾部高八度泛音轻轻化开
   unlock —— 解锁 / 升档：G-B-D-G 琶音，和 win 一耳朵分得开
   tap    —— 界面轻触：25ms 一声极轻的正弦
   toggle —— 音效开关：上行开 / 下行关 */
const SFX={
  right(){
    tone('sine',659.25,0.10,0.085,0,0,2600,0.7,0.005);
    tone('sine',987.77,0.13,0.062,0.075,0,2400,0.7,0.005);
    tone('sine',1318.51,0.15,0.034,0.135,0,null,null,0.005);
  },
  wrong(){
    tone('sine',392,0.17,0.10,0,349.23,900,0.6,0.006);
    tone('sine',311.13,0.22,0.09,0.11,293.66,900,0.6,0.006);
  },
  coin(){
    tone('sine',987.77,0.06,0.09,0,0,null,null,0.003);
    tone('sine',1318.51,0.13,0.075,0.055,0,null,null,0.003);
    tone('sine',2637.02,0.12,0.020,0.075,0,null,null,0.003);
  },
  open(){
    tone('sine',523.25,0.09,0.05,0,659.25,1200,0.7,0.004,0.09);
  },
  win(){
    const ns=[[523.25,0.42,0.115],[659.25,0.40,0.105],[783.99,0.38,0.10],[1046.50,0.62,0.09]];
    for(let i=0;i<ns.length;i++)tone('sine',ns[i][0],ns[i][1],ns[i][2],i*0.09,0,null,null,0.008);
    tone('sine',2093,0.5,0.026,0.40,2093,null,null,0.02);
  },
  unlock(){
    const ns=[[392,0.30,0.10],[493.88,0.30,0.09],[587.33,0.32,0.085],[783.99,0.50,0.08]];
    for(let i=0;i<ns.length;i++)tone('sine',ns[i][0],ns[i][1],ns[i][2],i*0.11,0,null,null,0.008);
    tone('sine',1567.98,0.42,0.020,0.46,1567.98,null,null,0.02);
  },
  tap(){
    tone('sine',1174.66,0.025,0.038,0,0,null,null,0.001);
  },
  toggle(on){
    if(on)tone('sine',880,0.055,0.045,0,1174.66,null,null,0.003);
    else  tone('sine',1174.66,0.065,0.05,0,880,null,null,0.003);
  }
};
/* 全局轻触音：按下任何按钮的瞬间给一声极轻的正弦（工作台的 tap 做法）。
   三个自带音效的入口排除在外，避免叠音：
     · 音效开关（开着按它是 toggle 上行音，关着按它本来就无声）
     · 互动大键（后续动作自带开场音，且它有自己的回弹手势） */
document.addEventListener('pointerdown',function(e){
  try{
    if(!soundOn())return;
    const t=e.target;
    if(!t||!t.closest)return;
    const el=t.closest('button');
    if(!el||el.disabled)return;
    if(el.id==='btnSound'||el.id==='mSound'||el.id==='actBtn'||el.id==='fitBtn')return;
    audioUnlock();
    SFX.tap();
  }catch(err){}
},{passive:true});
/* 互动大键：按下的一瞬弹一下（工作台 +1 键同款回弹） */
(function(){
  const ab=document.getElementById('actBtn');
  if(!ab)return;
  ab.addEventListener('pointerdown',function(){
    ab.classList.remove('p1-pop');
    void ab.offsetWidth;          // 强制重排，连点也能重新触发动画
    ab.classList.add('p1-pop');
    setTimeout(function(){ab.classList.remove('p1-pop');},480);
  },{passive:true});
})();

/* ---------------- 地图预渲染 ---------------- */
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
/* 静态地形层。正常情况下它就是页面上那个 #bg 元素（见 draw() 的注释），
   取不到时才退化回离屏 canvas + 每帧 drawImage 的老路。 */
const bgCv=document.getElementById('bg');
let VW=0,VH=0,DPR=1,SCALE=1;
let staticLayer=null,miniLayer=null;

function buildStatic(){
  /* 地形直接画进 #bg。它是个 DOM 节点，尺寸要写成内联 px：
     CSS 里那条 canvas{width:100%} 是给 #game 铺满用的，对这里不合适。 */
  const off=bgCv||document.createElement('canvas');
  off.width=W;off.height=H;
  if(bgCv){bgCv.style.width=W+'px';bgCv.style.height=H+'px';}
  const c=off.getContext('2d');
  /* 换世界时同一块画布会被重画，先抹干净，免得上一张地形的边缘漏出来 */
  c.setTransform(1,0,0,1,0,0);
  c.clearRect(0,0,W,H);
  const rnd=mulberry(20240808);
  if(CUR&&CUR.drawWorld)CUR.drawWorld(c,rnd);else drawAdvWorld(c,rnd);
  staticLayer=off;
  /* 图层一换就要归位，否则新地形会停在上一张的位置上 */
  syncBgTransform();

  const mw=170,mh=Math.round(mw*H/W);
  const m=document.createElement('canvas');m.width=mw;m.height=mh;
  const mc=m.getContext('2d');
  mc.drawImage(off,0,0,mw,mh);
  mc.fillStyle='rgba(4,12,24,.38)';mc.fillRect(0,0,mw,mh);
  miniLayer=m;
}
/* 把 #bg 挪到镜头位置上。世界坐标 (wx,wy) → 屏幕 ((wx-cam.x)*SCALE, ...)，
   而图层自身的 1px 就是 1 个世界单位，所以
   translate(-cam*SCALE) scale(SCALE) 合起来正好等价于 canvas 那条
   scale(SCALE) + translate(-cam) —— 两边的落点完全一致，不会错位。 */
function syncBgTransform(){
  if(!bgCv||staticLayer!==bgCv)return;
  /* 【帧率 6/4】位移吸附到整数设备像素。
     这一层每帧都要被合成器重采样一遍：位移带小数时采样点永远落在纹素之间，
     纹理在像素网格上逐帧「游走」，拖动时地形会持续发糊、闪。
     吸附之后采样点正好落在纹素中心，最清晰也最省。
     误差 ≤ 0.5 设备像素 = 0.25 CSS 像素，肉眼不可能看出来。
     用的是真实 devicePixelRatio：DPR 那个变量是 #game 画布的（可能被降过级），
     而 #bg 的缩放由 CSS 的 scale(SCALE) 交给合成器完成，走的是屏幕自己的网格。 */
  const rd=window.devicePixelRatio||1;
  const tx=(Math.round(-cam.x*SCALE*rd)/rd).toFixed(3);
  const ty=(Math.round(-cam.y*SCALE*rd)/rd).toFixed(3);
  bgCv.style.transform='translate3d('+tx+'px,'+ty+'px,0) scale('+SCALE+')';
}
function drawAdvWorld(c,rnd){
  // 海
  const g=c.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#0f3552');g.addColorStop(.5,'#17527e');g.addColorStop(1,'#0d2c46');
  c.fillStyle=g;c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=3;
  for(let y=40;y<H;y+=54){c.beginPath();for(let x=0;x<=W;x+=30)c.lineTo(x,y+Math.sin((x+y*1.7)/130)*7);c.stroke();}

  // 陆地
  REGIONS.forEach(reg=>{
    const [x,y,w,h]=reg.rect;
    c.save();
    c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=26;c.shadowOffsetY=8;
    c.fillStyle=reg.ground[1];roundRect(c,x,y,w,h,54);c.fill();c.restore();
    const gg=c.createLinearGradient(x,y,x,y+h);
    gg.addColorStop(0,reg.ground[0]);gg.addColorStop(1,reg.ground[1]);
    c.fillStyle=gg;roundRect(c,x,y,w,h,54);c.fill();
    c.strokeStyle=reg.edge;c.lineWidth=6;roundRect(c,x,y,w,h,54);c.stroke();
    c.save();roundRect(c,x,y,w,h,54);c.clip();
    for(let i=0;i<w*h/2400;i++){
      c.globalAlpha=.05+rnd()*.09;
      c.fillStyle=rnd()<.5?'#ffffff':'#000000';
      c.beginPath();c.arc(x+rnd()*w,y+rnd()*h,3+rnd()*13,0,7);c.fill();
    }
    c.globalAlpha=1;c.restore();
  });

  // 桥
  BRIDGES.forEach(b=>{
    const [x,y,w,h]=b.rect;
    const open=!b.need||state.badges[b.need];
    c.save();
    if(open){
      c.fillStyle='#7a5433';c.fillRect(x,y,w,h);
      c.fillStyle='#9c6b40';
      if(w>h){for(let i=x+6;i<x+w-4;i+=20)c.fillRect(i,y+5,12,h-10);}
      else{for(let i=y+6;i<y+h-4;i+=20)c.fillRect(x+5,i,w-10,12);}
      c.strokeStyle='rgba(80,50,22,.85)';c.lineWidth=4;c.strokeRect(x,y,w,h);
    }else{
      c.fillStyle='rgba(25,35,50,.6)';c.fillRect(x,y,w,h);
      c.setLineDash([14,12]);c.lineWidth=5;c.strokeStyle='rgba(255,215,106,.8)';
      c.strokeRect(x+3,y+3,w-6,h-6);c.setLineDash([]);
    }
    c.restore();
  });

  // 地表装饰
  REGIONS.forEach(reg=>{
    const [x,y,w,h]=reg.rect;
    const rnd2=mulberry(reg.rect[0]*31+reg.rect[1]);
    const n=Math.floor(w*h/2600);
    c.save();roundRect(c,x+8,y+8,w-16,h-16,44);c.clip();
    const style=PROP_STYLE[reg.id]||'dot';
    for(let i=0;i<n;i++){
      const px=x+16+rnd2()*(w-32),py=y+16+rnd2()*(h-32);
      let tooClose=false;
      for(const s of SPOTS){if(dist(px,py,s.x,s.y)<46){tooClose=true;break;}}
      if(tooClose)continue;
      drawProp(c,style,px,py,10+rnd2()*8,rnd2()*6.28,reg.edge,.16+rnd2()*.18);
    }
    c.restore();
  });

}
function roundRect(c,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  c.beginPath();
  c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
}

