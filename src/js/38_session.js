/* =========================================================
   答题会话
   ========================================================= */
const modal=$('modal'),panel=$('panel');
/* 题干/选项里会出现 {x | 1 < x < 2} 这类内容，插入 innerHTML 前先转义 */
const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let introShowing=false;
/* 面板换页计数器：每次 openPanel 都 +1。
   答题收尾时用它判断「onDone 有没有自己开新面板」，见 blazeAsk 的兜底 */
let panelSeq=0;
/* 第二个参数 lock：只有"正在作答的题"才传 1。
   锁以前是调用方直接写 panel.dataset.lock 的，写上去就得靠 closePanel 清；
   一旦那张面板被别的入口（☰ / 顶栏 / 交易站）覆盖、没走按钮，
   锁就永远留在 panel 上 —— Esc 关不掉面板、切模式被"先把这道题做完"拦下，
   整局人就出不去了。现在锁跟着面板走：换页即重置，谁开谁声明。 */
function openPanel(html,lock){
  /* 首次说明面板被别的入口顶掉 → 也记成"读过了"，免得每次进这个世界都再弹一遍 */
  if(!introShowing&&panel.dataset.intro==='1'){
    panel.dataset.intro='';
    try{localStorage.setItem(curKey+'_intro','1');}catch(e){}
  }
  /* 结算面板被别的入口顶掉 = 玩家不想再看了：替他把这一局收干净。
     否则人留在已经结束的战场上（BZ.active 已经是 false），
     撤离点、箱子全点不动，只能靠 ☰ 找回基地 —— 看着就像"退出不了"。 */
  try{if(CUR===BLAZE&&BZ.phase==='over'&&!BZ._finishing)blazeToLobby(true);}catch(e){}
  panel.innerHTML=html;modal.classList.add('show');SFX.open();
  panel.dataset.lock=lock?'1':'';panelSeq++;
  /* 题图里带 data-fig 的是动图：面板一挂上就把它接进全局时间线 */
  try{qfigRun(panel);}catch(e){}
  /* 排版自适应：面板内容刚落地，按题干/选项的实际长度选字号与对齐 */
  try{fitPanelText(panel);}catch(e){}
  syncScrollTip();
}
/* ---------- 自适应排版：按文本实际长度给题干 / 选项挑字号与对齐 ----------
   同一个 .qtext 样式喂所有题，是"一大坨字"的根源：
   12 字的口算题和 300 字的大题共用 23px 居中粗体，前者空得慌、后者糊成一片。
   这里在面板渲染后按「视觉宽度」重新分档（阈值见 CSS 里的 f-xs ~ f-xl），
   长题再顺手拆成条件清单 —— 一坨变成几条，漏看哪个条件一眼能数出来。 */
/* 三档倍率（172.3 重标定）：
   用户要"默认最小"，顺带把最小档真正拉开差距 —— 旧的 0.88 和标准档只差 12%，
   肉眼看不出"调小了"。现在最小 0.80（比标准小 20%）、最大 1.18（比标准大 18%），
   三档跨度 1.48 倍，按一下就能明显感觉到。 */
const FIT_D=[0.80,1,1.18],FIT_NAME=['最小','标准','宽松'],FIT_MARK=['A−','A','A+'],FIT_K='fitDensity';
/* 默认档 = 最小档（索引 0）。用户明确要求：一进来就是小字，字少了再自己调大。 */
const FIT_DEFAULT=0;
/* 视觉宽度：汉字记 1，英数符号记 0.55，空格记 0.25。
   纯按字符数分档会把 "m=2kg，μ=0.2，g=10m/s²" 这类符号题算得过长 ——
   符号在屏幕上只占半个汉字宽，按字数算会平白降掉两档字号 */
function visLen(s){
  let w=0,s2=String(s||'');
  for(let i=0;i<s2.length;i++){
    const c=s2.charCodeAt(i);
    w+=(c>0x2e80)?1:(s2[i]===' '?0.25:0.55);
  }
  return w;
}

function fitSplit(s,re){
  return String(s).replace(new RegExp(re.source,'g'),m=>m+'\u0001').split('\u0001');
}
/* 把成对括号里的分隔符临时替换成占位符 —— 切句前先保护，切完再还原。
   否则「当 x ∈ [0, 1] 时 f(x) = x + 1」会被逗号切成两条，
   屏幕上就成了「当 x ∈ [0,」/「1] 时 f(x) = x + 1」这种断掉的区间。
   括号里出现逗号的地方几乎都是区间、坐标、参数表、化学式下标，
   没有一处是该断句的 —— 所以整段括号一律保护。 */
function fitGuard(s){
  const keep=[];
  /* 括号可嵌套（f(g(a, b), c)），所以用栈配对而不是简单的懒惰正则 */
  let out='',depth=0,buf='';
  const pairs={'(':')','[':']','{':'}','（':'）','【':'】','［':'］'};
  const closes={'':true,')':true,']':true,'}':true,'）':true,'】':true,'］':true};
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(pairs[c]!==undefined){
      if(depth===0)buf='';
      depth++;buf+=c;continue;
    }
    if(closes[c]&&depth>0){
      depth--;buf+=c;
      if(depth===0){keep.push(buf);out+='\u0002'+(keep.length-1)+'\u0002';buf='';}
      continue;
    }
    if(depth>0)buf+=c;else out+=c;
  }
  /* 括号没闭合（题干被截断等）：剩下的原样接回去，不能丢字 */
  if(depth>0)out+=buf;
  return {text:out,keep:keep};
}
function fitUnguard(s,keep){
  return String(s).replace(/\u0002(\d+)\u0002/g,(m,i)=>keep[+i]!==undefined?keep[+i]:m);
}
function fitHard(s){
  const out=[];let cur='',w=0,s2=String(s);
  for(let i=0;i<s2.length;i++){
    cur+=s2[i];w+=visLen(s2[i]);
    if(w>=30){out.push(cur);cur='';w=0;}
  }
  if(cur.trim())out.push(cur);
  return out;
}
/* 长题干拆条：先按句号 / 分号 / 换行切，切不动再按逗号切，最后按宽度硬切。
   硬切是兜底 —— 有些题干整段没标点（题干选项连写、一长串化学式），
   不兜底它就会被当成"一句话"，等于没拆 */
function fitSegHtml(raw){
  /* 全程在"保护过的"文本上做切分，最后一步才还原括号内容 */
  const g=fitGuard(String(raw));
  const src=g.text;
  const back=a=>a.map(s=>fitUnguard(s,g.keep));
  let parts=back(src.split(/\n+/)
    .reduce((a,l)=>a.concat(fitSplit(l,/[。！？；;!?]/)),[])
    .map(s=>s.trim()).filter(Boolean));
  /* 顿号「、」是并列连接词，不是句读 —— 「设点 A(1, 2)、B(3, 4)」断在顿号上，
     下一条就从「B(3, 4)」起头，读起来像少了一半。逗号、冒号才是断句点。 */
  if(parts.length<2)parts=back(fitSplit(src,/[，,：:] ?/).map(s=>s.trim()).filter(Boolean));
  if(parts.length<2)parts=back(fitHard(src));
  /* 二次切：单条超过 42 个汉字宽（约两行半）就再按逗号切开。
     物理大题常见"整个装置描述"一句话七八十字，不切还是一坨。
     窄栏（横屏两栏、小屏）里一行装得下的字更少，阈值按列宽收一档，
     不然"一句话占三行"在窄栏里会变成四五行的长条。 */
  const narrow=(function(){
    try{
      const w=window.innerWidth||0,h=window.innerHeight||0;
      return w>h&&h<=560;
    }catch(e){return false;}
  })();
  const lim=narrow?34:42;
  const out=[];
  parts.forEach(function(t){
    if(visLen(t)>lim){
      back(fitSplit(fitGuard(t).text,/[，,、] ?/).map(s=>s.trim()).filter(Boolean))
        .forEach(s2=>out.push(s2));
    }else out.push(t);
  });
  return out.map(s=>'<span class="qs">'+esc(s)+'</span>').join('');
}
/* 是否处于「横屏两栏」布局（与 CSS 里那组的媒体条件保持一致）。
   两栏时题面和选项是左右并排的，纵向压力本来就减半 ——
   再按单列那套去压题干、藏提示行，反而会把左栏压得只剩半截。 */
function isWideLandscape(){
  try{
    const w=window.innerWidth||0,h=window.innerHeight||0;
    return w>h&&h<=560;
  }catch(e){return false;}
}
/* 题干限高基准：视口 42vh 与"面板可视高的 40%"取小。
   只看视口是不够的 —— 面板本身只占屏高的 88%，横屏时可视区更小，
   按视口算出来的限高会把选项顶出面板底部。
   下限 150px：约 5 行，再少题干就成了"读一句滚一下" */
function fitStemLimit(el){
  const vh=window.innerHeight||800;
  let pn=el;while(pn&&!pn.classList.contains('panel'))pn=pn.parentElement;
  const ph=pn?pn.clientHeight:0;
  let lim=Math.round(vh*0.42);
  if(ph)lim=Math.min(lim,Math.round(ph*0.40));
  return Math.max(150,lim);
}
/* 选项必须留在首屏：题干读完才知道选什么，可选项看不见就没法点。
   攻坚大题带图时，题干 300 + 图 250 + 头部 200 轻易超一屏 ——
   题干限高只是"大概合适"，这里按选项的实际位置再收一次：
   先压题干（面板里最高的块，压它最划算），压不动了再等比缩题图。 */
function fitOptsVisible(root){
  const box=root.querySelector('.opts');
  if(!box)return;
  /* 横屏两栏：选项在独立右栏里，纵向自然够放，不用再压题干 */
  if(isWideLandscape())return;
  const t=root.querySelector('.qtext'),fg=root.querySelector('.qfig');
  const vh=window.innerHeight||800;
  /* 留出一整行选项的高度，别只让选项露个头。
     173 起选项带了 A/B/C/D 徽标，整体比旧版高约 8px、两行就是 16px，
     预留从 110 放宽到 126，长题才不会把最后一行选项挤出屏幕。 */
  const okTop=vh-126;
  for(let k=0;k<6;k++){
    if(box.getBoundingClientRect().top<=okTop)return;
    if(t&&t.classList.contains('scrollable')){
      const cur=t.clientHeight;
      const nx=Math.max(150,Math.round(cur*0.76));
      if(nx<cur-4){t.style.maxHeight=nx+'px';continue;}
    }
    if(fg&&!fg.classList.contains('fig-xs')){
      fg.classList.add(fg.classList.contains('fig-sm')?'fig-xs':'fig-sm');
      continue;
    }
    /* 都压到底了还挤：把"第二步 · 选答案"这类提示行收掉，最后 30px */
    const mt=root.querySelector('.qmeta');
    if(mt&&mt.style.display!=='none'){mt.style.display='none';continue;}
    return;
  }
}
/* 题干实际折了几行（扣掉上下 padding —— scrollHeight 含内边距，
   20px×2 在 31px 行高下就顶一行多，不扣会把几乎所有题都误判成"多行"） */
function stemLines(el){
  try{
    const cs=getComputedStyle(el);
    const lh=parseFloat(cs.lineHeight)||24;
    return (el.scrollHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom))/lh;
  }catch(e){return 0;}
}
function fitStem(el){
  if(el.dataset.fit==='1')return 0;
  const raw=String(el.textContent||'').trim();
  if(!raw)return 0;
  const n=visLen(raw);
  const STEPS=['f-xs','f-sm','f-md'];
  let seg=false,si=-1;
  if(n<=14)si=0;
  else if(n<=30)si=1;
  else if(n<=46)si=2;
  if(si>=0){
    el.classList.add(STEPS[si]);
    /* 分完档再量真实行数：按视觉宽度估的档位和实际折几行常有出入
       （带长公式、长化学式的题最明显）。居中只在两行以内成立：
       排不进两行就降一档字号（23.1 → 20.1），降到底还超，才改左对齐 */
    while(si<2&&stemLines(el)>2.4){
      el.classList.remove(STEPS[si]);si++;el.classList.add(STEPS[si]);
    }
    if(stemLines(el)>2.4)el.classList.add('fl');
  }
  else if(n<=110){el.classList.add('f-lg');seg=true;}
  else {el.classList.add('f-xl');seg=true;}
  if(seg){
    el.classList.add('seg');
    el.innerHTML=fitSegHtml(raw);
    /* 限高滚动：把选项留在首屏。限高必须写成内联样式 ——
       面板高度是 auto，CSS 里用百分比算不出来（会整条失效）。
       横屏两栏时左栏本来就只放题面、纵向压力减半，不限高，
       让条件清单完整铺开比"够得着的滚动窗口"更利于扫读。 */
    try{
      if(!isWideLandscape()){
        const lim=fitStemLimit(el);
        if(el.scrollHeight>lim){
          el.classList.add('scrollable');
          el.style.maxHeight=lim+'px';
          el.addEventListener('scroll',function(){
            const end=el.scrollTop+el.clientHeight>=el.scrollHeight-6;
            el.classList.toggle('at-end',end);
          },{passive:true});
        }
      }
    }catch(e){}
  }
  el.dataset.fit='1';
  return n;
}
function fitOpts(box){
  if(box.dataset.fit==='1')return 0;
  const items=box.querySelectorAll?box.querySelectorAll('.opt'):[];
  if(!items.length)return 0;
  let mx=0;
  for(let i=0;i<items.length;i++){
    const n=visLen(items[i].textContent||'');
    if(n>mx)mx=n;
  }
  const appr=items[0]&&items[0].classList.contains('appr');
  let t='';
  if(mx<=6)t='';
  else if(mx<=11)t='t-lg';
  else if(mx<=16)t='t-md';
  else t=(mx<=34?'t-md':'t-sm');
  for(let i=0;i<items.length;i++){
    items[i].classList.remove('t-lg','t-md','t-sm');
    if(t)items[i].classList.add(t);
  }
  /* 单列：半屏宽只有 150px，超过 16 个字必折三行（思路选项常见 15~24 字）；
     思路选项一律单列 —— 它是整句，要读不要扫。
     173 起每个选项左侧多了 A/B/C/D 徽标（约 1.6em + 间距），
     双列时的可用文字宽少了一截 —— 阈值从 16 收到 13，
     免得"本来两行放得下"的选项被徽标挤成三行。 */
  box.classList.toggle('one',mx>13||!!appr);
  box.classList.toggle('apprs',!!appr);
  box.dataset.fit='1';
  return mx;
}
/* 字号档位（172.2 修复）：
   以前每次点击都「现读现写 localStorage」，但预览沙箱 / 无痕模式里存储可能
   整个不可用（读写全抛异常，被 try/catch 吞掉）—— 读到的永远是默认档「标准」，
   加一后每次都落在「宽松」，于是出现"不管咋摁都是宽松、调不大也调不小"。
   现在内存缓存是真相来源：localStorage 只当锦上添花的持久层，
   封不封它，点击都能真实轮换 紧凑 → 标准 → 宽松 → 紧凑。 */
let FIT_DENSITY=null;
function fitDensity(){
  if(FIT_DENSITY!=null)return FIT_DENSITY;
  let d=FIT_DEFAULT;
  try{
    const v=parseInt(localStorage.getItem(FIT_K),10);
    /* 注意 0 是最小档的合法值，不能用 ||FIT_DEFAULT 兜底 —— 那样最小档永远读不出来 */
    d=isNaN(v)?FIT_DEFAULT:clamp(v,0,2);
  }catch(e){}
  FIT_DENSITY=d;
  return d;
}
function setFitDensity(d){
  FIT_DENSITY=clamp(d|0,0,2);
  try{localStorage.setItem(FIT_K,String(FIT_DENSITY));}catch(e){}
}
function applyFit(root){
  const d=fitDensity();
  try{root.style.setProperty('--qs',String(FIT_D[d]));}catch(e){}
  const b=root.querySelector?root.querySelector('#fitBtn'):null;
  if(b)b.textContent=FIT_MARK[d];
}
function addFitBtn(root){
  if(root.querySelector('#fitBtn'))return;
  bindFitDeleg();
  const b=document.createElement('button');
  b.id='fitBtn';b.className='fitbtn';b.type='button';
  b.setAttribute('aria-label','调整题面字号');
  root.appendChild(b);
  applyFit(root);
}
/* 字号按钮的触发逻辑（172.1）：
   ① 监听委托在常驻的 #panel 上 —— 按钮是每次开面板重造的节点，直连监听要跟着重建，
      委托一次装好、永不失效，任何面板里的 #fitBtn 都算数；
   ② 触发用 pointerdown 而不是 click —— 移动端手指落下常有几像素位移，
      浏览器会把这类触摸判成滚动 / 或等双击判定，把 click 丢掉，小按钮最容易中招。
      按下即换档，谁也拦不住。键盘 / 辅助功能走 click 兜底（ptrHandled 标记防双触发）。 */
let fitDelegBound=false;
function bindFitDeleg(){
  if(fitDelegBound)return;
  fitDelegBound=true;
  let ptrHandled=false;
  panel.addEventListener('pointerdown',function(e){
    const t=e.target;
    if(!t||t.id!=='fitBtn')return;
    if(e.pointerType==='mouse'&&e.button!==0)return;   // 只认左键
    ptrHandled=true;
    fitBtnFire();
    try{t.blur&&t.blur();}catch(err){}                 // 不留焦点：之后的回车仍是游戏自己的「继续」
  });
  panel.addEventListener('click',function(e){
    const t=e.target;
    if(!t||t.id!=='fitBtn')return;
    if(ptrHandled){ptrHandled=false;return;}           // 这次点击已由 pointerdown 处理过
    fitBtnFire();
  });
}
function fitBtnFire(){
  const b=panel.querySelector('#fitBtn');
  const d=(fitDensity()+1)%3;
  setFitDensity(d);            // 先落内存（存储被封也照常轮换），再尽力持久化
  applyFit(panel);
  toast('题面字号：'+FIT_NAME[d]);
  /* 按钮自己弹一下：这是「按了有反应」最直接的证据 */
  if(b){
    try{
      b.classList.remove('fp-pop');
      void b.offsetWidth;
      b.classList.add('fp-pop');
      setTimeout(function(){b.classList.remove('fp-pop');},360);
    }catch(e){}
  }
  try{SFX.open();}catch(e){}
}
/* 答题后解析是后写进 #feedback 的（那时 openPanel 早已返回），
   靠观察器补一次排版，长解析才不会也是一坨 */
let fitMO=null,fitTimer=null;
function fitWatch(){
  if(fitMO||typeof MutationObserver==='undefined')return;
  fitMO=new MutationObserver(function(){
    /* 答完题是往已有的 #feedback 里塞内容（不是新加一个 #feedback），
       所以按"内容长度变了"来判断，而不是看有没有新节点 */
    if(fitTimer)clearTimeout(fitTimer);
    fitTimer=setTimeout(function(){
      const fb=panel.querySelector('#feedback');
      if(fb){
        const n=String(fb.textContent||'').length;
        if(fb.dataset.fitLen!==String(n)){
          fb.dataset.fitLen=String(n);
          const long=visLen(fb.textContent||'')>130;
          fb.classList.toggle('long',long);
          /* 答题代码会整体重写 fb.className，光靠 class 会被冲掉 —— 内联样式兜底 */
          fb.style.lineHeight=long?'1.9':'';
          fb.style.textAlign=long?'left':'';
        }
      }
      const ts=panel.querySelectorAll('.qtext');
      for(let i=0;i<ts.length;i++)if(ts[i].dataset.fit!=='1')fitStem(ts[i]);
      const os=panel.querySelectorAll('.opts');
      for(let i=0;i<os.length;i++)if(os[i].dataset.fit!=='1')fitOpts(os[i]);
    },60);
  });
  try{fitMO.observe(panel,{childList:true,subtree:true});}catch(e){}
}
function fitPanelText(root){
  root.classList.remove('long-q');
  let stem=0;
  const ts=root.querySelectorAll('.qtext');
  for(let i=0;i<ts.length;i++){
    ts[i].dataset.fit='';
    const n=fitStem(ts[i]);
    if(n>stem)stem=n;
  }
  const os=root.querySelectorAll('.opts');
  for(let i=0;i<os.length;i++){os[i].dataset.fit='';fitOpts(os[i]);}
  if(stem>46)root.classList.add('long-q');
  const fb=root.querySelector('#feedback');
  if(fb&&fb.dataset.fit!=='1'){
    const long=visLen(fb.textContent||'')>130;
    fb.classList.toggle('long',long);
    fb.style.lineHeight=long?'1.9':'';
    fb.style.textAlign=long?'left':'';
    fb.dataset.fit='1';
    fb.dataset.fitLen=String((fb.textContent||'').length);
  }
  applyFit(root);
  if(ts.length)addFitBtn(root);
  /* 收敛要在按钮挂上之后：按钮是 absolute，不影响布局，但保险起见放最后 */
  try{fitOptsVisible(root);}catch(e){}
  try{fitWatch();}catch(e){}
}
/* 内容比面板高时，底部挂一个「还能往下滑」的提示，划过一点就收起。
   图鉴几十个精灵、错题本能装两百题，首屏一定装不下 ——
   以前没有任何提示，人只会以为内容就这么点，不会去试着划。
   要等一帧再量：innerHTML 刚写完，布局还没定，此刻的 scrollHeight 是旧值。 */
function syncScrollTip(){
  modal.classList.remove('can-scroll','scrolled');
  panel.scrollTop=0;
  const measure=()=>{
    const can=panel.scrollHeight-panel.clientHeight>8;
    modal.classList.toggle('can-scroll',can);
  };
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(measure);
  else setTimeout(measure,30);
}
panel.addEventListener('scroll',()=>{
  modal.classList.toggle('scrolled',panel.scrollTop>24);
},{passive:true});
/* 出处徽章：真题 / 真题改编 / 名校模拟 三类用不同颜色区分；
   思路题另按「思维动作」分成八种题型，各占一个颜色 */
const QT_NAME={conv:'转化',loc:'定位',nc:'非常规',path:'多解',
  pit:'防坑',cond:'条件',str:'结构',mig:'迁移'};
function srcBadge(src,qt){
  /* 题型徽章优先：它告诉学生"这题在练什么动作"，比出处更有用 */
  if(qt&&QT_NAME[qt])return `<span class="qsrc qt-${qt}">${QT_NAME[qt]}</span>`;
  if(!src)return '';
  const cls=/^思路/.test(src)?'think'
    :/^导入/.test(src)?'imp'
    :(/真题改编|改编/.test(src)?'gaib':(/真题|卷/.test(src)?'zhen':'moni'));
  return `<span class="qsrc ${cls}">${esc(src)}</span>`;
}
/* 关面板时必须把锁一起清掉。
   答题面板用 dataset.lock 挡住"误点遮罩关闭"，但锁是挂在 panel 上的：
   面板一旦被别的入口（顶栏、菜单、切国度）关掉而锁没清，
   它就会一直留在 panel 上，之后切国度、切模式全被"先把这道题做完"拦下。 */
function closePanel(){
  modal.classList.remove('show');panel.innerHTML='';
  modal.classList.remove('can-scroll','scrolled');
  panel.dataset.lock='';
  /* intro 标记不在这里清：交给 openPanel 处理，
     这样"intro 被别的入口顶掉"也能记成已读，不会反复弹。 */
}
/* =========================================================
   游戏内确认弹窗（4.0.14）
   ---------------------------------------------------------
   以前这些"要不要卖"的确认走的是浏览器原生 confirm()。
   它在手机上会**把全屏踢掉**：卖一次东西 → 弹一次原生框 → 全屏没了 →
   回来还得再点一次「⛶ 全屏」。频繁交易时，这件事比点错按钮还烦。

   换成面板里的一张卡：不碰浏览器 UI，全屏状态原地不动。
   顺带比原生 confirm 多给两样东西：
     · 明细行（卖的是哪几样、各多少件、各值多少）
     · **到手金额用大字标出来** —— 这才是玩家真正要看的那个数
   ---------------------------------------------------------
   o = {icon,title,sub,lines:[{e,n,c,v}],maxLines,total:{label,v,unit,sub},
        note,warn,ok,no}
   cbOk / cbNo 是回调（和工程里其它面板一个路子）。两个回调都要负责
   "把上一屏画回来"（交易站的惯例是 re()）；没给 cbNo 就只是关掉弹窗。
   ========================================================= */
function uiConfirm(o,cbOk,cbNo){
  if(!o)o={};
  const keep=panel.scrollTop||0;     // 上一屏滚到哪：交易站一屏列不完，回来别从头翻
  const all=o.lines||[];
  const shown=all.slice(0,o.maxLines||6);
  const more=all.length-shown.length;
  const lines=shown.map(L=>`<div class="cf-line">
      <span class="e">${L.e||''}</span>
      <span class="n">${esc(L.n||'')}${L.c?` <b>${esc(L.c)}</b>`:''}</span>
      <span class="v">${L.v==null?'':L.v}</span></div>`).join('')
    +(more>0?`<div class="cf-line cf-more">… 另有 ${more} 种物资</div>`:'');
  const t=o.total;
  openPanel(`
    <h2>${o.icon||'❓'} ${esc(o.title||'确认一下')}</h2>
    ${o.sub?`<div class="sub">${o.sub}</div>`:''}
    ${lines?`<div class="cf-list">${lines}</div>`:''}
    ${t?`<div class="cf-total"><div class="lb">${esc(t.label||'到手')}</div>
      <div class="big">${t.v==null?'':t.v}<span class="u">${t.unit||''}</span></div>
      ${t.sub?`<div class="sm">${t.sub}</div>`:''}</div>`:''}
    ${o.note?`<div class="cf-note">${o.note}</div>`:''}
    ${o.warn?`<div class="cf-warn">⚠️ ${o.warn}</div>`:''}
    <div class="row">
      <button class="btn" id="ucNo">${esc(o.no||'取消')}</button>
      <button class="btn primary" id="ucOk">${esc(o.ok||'确认')}</button>
    </div>`);
  /* 回调里通常会重画上一屏（re() 会把滚动位置清零），画完再把位置放回去 */
  const rewind=()=>{try{if(panelOpen())panel.scrollTop=keep;}catch(e){}};
  $('ucNo').onclick=()=>{closePanel();if(cbNo)cbNo();rewind();};
  $('ucOk').onclick=()=>{audioKick();closePanel();if(cbOk)cbOk();rewind();};
}

/* 「没走按钮」的关闭（Esc / 点遮罩）统一走这里收尾。
   烽火里一堆面板是靠按钮复位的：按钮点了才会 BZ.busy=false、才会结算。
   直接从旁边关掉的话，busy 一直卡着 —— 互动键不亮、巡逻队不动、撤离点也点不了，
   人就被钉在战场上出不来了。 */
function blazeDismiss(){
  try{
    if(typeof CUR==='undefined'||CUR!==BLAZE)return;
    if(BZ.phase==='over'){blazeToLobby(true);toast('🎖️ 已回到行动基地');return;}
    if(BZ.busy){BZ.busy=false;blazeAfter();}
  }catch(e){}
}
modal.addEventListener('click',e=>{
  if(e.target===modal&&!panel.dataset.lock&&!panel.dataset.intro){closePanel();blazeDismiss();}
});

$('actBtn').addEventListener('click',e=>{
  e.stopPropagation();
  audioKick();
  if(!curSpot)return;
  if(CUR===BLAZE){blazeInteract(curSpot);return;}
  if(CUR===EPIC){openEra(curSpot);return;}
  if(CUR===DRILL){showDrill();return;}   // 训练台：开练枪大厅
  if(curSpot.t==='stele')startStele(curSpot);
  else if(curSpot.t==='spirit')startSpirit(curSpot);
  else if(curSpot.t==='guard')startGuard(curSpot);
  else if(curSpot.t==='hermit')openHermit(curSpot);
  else if(curSpot.t==='totem')showNationPortal();
});

/* 会话：从生成器抽题
   每道题走两步：先选「思路」（从哪儿入手），再选「答案」。
   思路选错不判错、不占可错次数，只记进诊断流水账 —— 最终对错仍以答案为准，
   免得"蒙对答案却被思路拦下"这种别扭体验。
   思路对 + 答案对额外 +2 结晶，鼓励先想清楚再动手。 */
