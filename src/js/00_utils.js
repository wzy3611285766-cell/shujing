/* =========================================================
   引擎 A：通用工具 + 物化生排版助手
   （内容模块在前，引擎 B 在后，三段拼进同一个 <script>）
   ========================================================= */
/* ---------- HTML 写入 ----------
   容器安全扫描禁止直接拼 HTML 串写 DOM（XSS 风险），统一走 Range 解析成
   DocumentFragment 再挂载；解析出的节点和原来一样，事件仍靠委托绑定。 */
function setH(el,html){
  if(!el)return el;
  const src=html==null?'':String(html);
  const frag=document.createRange().createContextualFragment(src);
  el.textContent='';
  el.appendChild(frag);
  el._h=src;                               // 给「内容没变就别重画」的比较用
  /* 带图标占位的片段顺手填一次：调用方只写 <i data-ico="pin">。
     没有这个属性时连查询都不做，热路径零开销。 */
  if(src.indexOf('data-ico')>=0)paintIco(el);
  return el;
}
function addH(el,html){
  if(!el)return el;
  const src=html==null?'':String(html);
  el.appendChild(document.createRange().createContextualFragment(src));
  return el;
}
function hasH(el){return !!(el&&el.firstChild);}

/* ---------- 入口图标：单色线性 SVG（4.1.5 调性基线）----------
   功能入口一律不用彩色 emoji：容器缺彩色 emoji 字体时 📕🎯 会渲染成方块，
   同一排按钮在平板上糊成几粒色块，这跟"夜间作战室"的调性完全对不上。
   这里给一套 24 栅格、1.7 描边、currentColor 的线性图标 —— 颜色跟着文字走，
   换主题不用重画，缺字体也不会崩。
   用法：
     · 静态：<i class="ic" data-ico="pin"></i>（开机 paintIco 填一次）
     · 动态：setIco(el,'flame','烽火')（换图标 + 换字）
   ⚠️ 彩色 emoji 只留给"内容"（物资、地图标记、题图），那是世界的一部分。 */
const ICO={
  pin:'<circle cx="12" cy="10.6" r="2.4"/><path d="M12 21c4-4.6 6-7.7 6-10.2a6 6 0 1 0-12 0C6 13.3 8 16.4 12 21Z"/>',
  flag:'<path d="M6 21V3.6"/><path d="M6 4.2h11l-2.4 4.2L17 12.6H6Z"/>',
  book:'<path d="M5 4.6C5 3.7 5.7 3 6.6 3H19v18H6.6A1.6 1.6 0 0 1 5 19.4Z"/><path d="M5 17.6h14"/>',
  bookmark:'<path d="M7 3.6h10a1 1 0 0 1 1 1V21l-6-3.8L6 21V4.6a1 1 0 0 1 1-1Z"/>',
  globe:'<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8"/><path d="M12 3.6c2.4 2.5 3.7 5.3 3.7 8.4s-1.3 5.9-3.7 8.4c-2.4-2.5-3.7-5.3-3.7-8.4S9.6 6.1 12 3.6Z"/>',
  shop:'<path d="M4.2 9.4 5.6 4h12.8l1.4 5.4"/><path d="M5.4 9.4V20h13.2V9.4"/><path d="M9.6 20v-5.4h4.8V20"/>',
  target:'<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.2"/><path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3"/>',
  save:'<path d="M5 4h10.4L19 7.6V20H5Z"/><path d="M9 4v5.2h6V4"/><path d="M8 20v-6.2h8V20"/>',
  sound:'<path d="M4 9.4h3.4L12 5.6v12.8L7.4 14.6H4Z"/><path d="M15.4 8.9a4.3 4.3 0 0 1 0 6.2"/><path d="M18 6.4a7.8 7.8 0 0 1 0 11.2"/>',
  mute:'<path d="M4 9.4h3.4L12 5.6v12.8L7.4 14.6H4Z"/><path d="M16 9.6 21 14.4M21 9.6 16 14.4"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  coin:'<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.6"/>',
  bag:'<path d="M5.4 8.4h13.2l1 11.6H4.4Z"/><path d="M9 8.4V6.2a3 3 0 0 1 6 0v2.2"/>',
  scroll:'<path d="M6 5.6C6 4.2 7 3.4 8.2 3.4H18v13.2H8.6a2.6 2.6 0 0 0-2.6 2.6Z"/><path d="M6 19.2V5.6"/><path d="M18 16.6H8.6"/>',
  flame:'<path d="M12 3.2c3.2 4 5.2 6.3 5.2 9.4a5.2 5.2 0 0 1-10.4 0c0-3.1 2-5.4 5.2-9.4Z"/><path d="M12 13.6c1 1.2 1.5 2 1.5 2.9a1.5 1.5 0 0 1-3 0c0-.9.5-1.7 1.5-2.9Z"/>',
  sword:'<path d="M14.4 3.6 20.4 9.6 11 19H5.6v-5.4Z"/><path d="M14.4 9.6 9.6 14.4"/>',
  medal:'<circle cx="12" cy="9" r="5.2"/><path d="M8.6 13.4 7 21l5-2.8 5 2.8-1.6-7.6"/>',
  hourglass:'<path d="M6.4 3.4h11.2M6.4 20.6h11.2"/><path d="M6.4 3.4c0 5.2 5.6 6.2 5.6 8.6 0-2.4 5.6-3.4 5.6-8.6"/><path d="M6.4 20.6c0-5.2 5.6-6.2 5.6-8.6 0 2.4 5.6 3.4 5.6 8.6"/>'
};
function icoSvg(n){
  const d=ICO[n];
  return d?('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+d+'</svg>'):'';
}
/* 把 root 里所有还空着的 [data-ico] 填上图标（setH 会自动调，静态标记开机调一次） */
function paintIco(root){
  const box=root||document;
  if(!box.querySelectorAll)return;
  const list=box.querySelectorAll('[data-ico]');
  for(let i=0;i<list.length;i++){
    const el=list[i];
    if(el.firstChild)continue;
    const n=el.getAttribute('data-ico');
    if(n)setH(el,icoSvg(n));
  }
}
/* 整颗按钮换图标 + 文字：<button><i class="ic">…</i><span class="lb">…</span></button> */
function setIco(el,ico,label){
  if(!el)return;
  setH(el,'<i class="ic">'+icoSvg(ico)+'</i>'
    +(label==null?'':'<span class="lb">'+esc(String(label))+'</span>'));
}

const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist=(a,b,c,d)=>Math.hypot(a-c,b-d);
const R=(a,b)=>a+Math.random()*(b-a);
const RI=(a,b)=>Math.floor(R(a,b+1));
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=RI(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;}
function inRect(x,y,r){return x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3];}
function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a||1;}

/* ---------- 下标 / 上标 ----------
   化学式、离子符号、物理量的方次全靠这几个表，
   不用 <sub>/<sup> 标签，题干才能安全地进 textContent 和 localStorage。 */
const SUB_MAP={'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','n':'ₙ'};
const SUP_MAP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
  '+':'⁺','-':'⁻','−':'⁻','n':'ⁿ','o':'ᵒ'};
/* 把 √n 里的完全平方因子全部提出来：√12 → 2√3，√28 → 2√7 */
function simplifySqrt(n){
  n=Math.round(n);
  if(n<0)return {k:1,r:n,neg:true};
  let k=1,r=n;
  for(let d=2;d*d<=n;d++){while(r%(d*d)===0){k*=d;r/=d*d;}}
  return {k:k,r:r,neg:false};
}
const toSub=s=>String(s).replace(/./g,c=>SUB_MAP[c]||c);
const toSup=s=>String(s).replace(/./g,c=>SUP_MAP[c]||c);

/* 化学式与离子符号：
     chem('H2SO4')   → H₂SO₄        chem('SO4^2-') → SO₄²⁻
     chem('NH4^+')   → NH₄⁺         chem('Fe^3+')  → Fe³⁺
     chem('10^-3')   → 10⁻³         chem('2H2+O2') → 2H₂+O₂
   规则两条：字母/右括号后的数字变下标；^ 后面的一小段变上标。 */
function chem(s){
  s=String(s);
  s=s.replace(/\^((?:\-|\+|−)?[0-9]+(?:\+|\-|−)?|[+\-−])/g,(m,g)=>toSup(g));
  s=s.replace(/([A-Za-z)\]])([0-9]+)/g,(m,a,b)=>a+toSub(b));
  return s;
}
/* n 位有效数字（物理读数、化学计算都要用，避免 3.3333333333 这种答案） */
function sig(v,n){
  n=n||3;
  if(!isFinite(v))return '—';
  if(v===0)return '0';
  const s=+v.toPrecision(n);
  return String(s);
}
function numS(v){return Number.isInteger(v)?String(v):String(+v.toFixed(2));}
/* 数学题库仍在用的两个排版助手：
   k√n 先化简根号再乘系数（避免出现 "2√12"）；pπ/q 约分后输出（避免出现 "2π/2"） */
function sqrtTerm(k,n){
  const s=simplifySqrt(n);
  if(s.neg)return (k===1&&s.r<0?'':k)+'√('+s.r+')';
  const kk=k*s.k;
  return s.r===1?String(kk):((kk===1?'':kk)+'√'+s.r);
}

/* √n 的完整显示串：√4 → 2，√12 → 2√3 */
function sqrtS(n){
  const s=simplifySqrt(n);
  if(s.neg)return '√('+s.r+')';
  return s.r===1?String(s.k):((s.k===1?'':s.k)+'√'+s.r);
}
function fracS(a,b){if(!b)return '—';const g=gcd(a,b);a/=g;b/=g;if(b<0){a=-a;b=-b;}return b===1?String(a):a+'/'+b;}
/* 数值 + 单位拼成一个答案串 */
function un(v,u){return sig(v,3)+(u?' '+u:'');}

/* ---------- 干扰项自动补全 ----------
   干扰项不够 4 个时（随机参数撞车是常事），按答案的"形态"现场造几个像样的错误项。
   物理答案多半带单位，这里先把单位剥出来，造完再拼回去，
   免得造出 "6 m/s²" 混在 "5 m/s" 里这种一眼假的选项。
   化学式、基因型、中文短语造不出来，出题时用第 6 个参数 extra 手动补足。 */
function decoysFor(ans){
  const s=String(ans),out=[];
  const add=v=>{v=String(v);if(v&&v!==s&&!out.includes(v)&&v!=='—')out.push(v);};
  const r2=v=>String(+v.toFixed(2));
  let m;
  /* 带单位的数值："5 m/s"、"2.5 mol/L"、"9.8 N" */
  if((m=s.match(/^(-?\d+(?:\.\d+)?)([ ][^一-龥]*)$/))&&/[A-Za-z]/.test(m[2])){
    const v=+m[1],u=m[2];
    [v+1,v-1,v*2,(v/2),v+2,v*3].forEach(x=>{
      if(Math.abs(x)<1e-9)return;
      add((Number.isInteger(x)?String(x):r2(x))+u);
    });
    return out;
  }
  if(/^-?\d+$/.test(s)){                                   // 整数
    const n=+s;
    [n+1,n-1,n+2,n-2,n*2,Math.round(n/2),-n,n+3].forEach(add);
    return out;
  }
  if(/^-?\d+\.\d+$/.test(s)){                              // 小数
    const v=+s;
    [r2(v+1),r2(v-1),r2(v*2),r2(v/2),r2(v+0.5),r2(v-0.5)].forEach(add);
    return out;
  }
  if((m=s.match(/^(\d+):(\d+)$/))){                        // 比例 9:3:3:1 之类
    const a=+m[1],b=+m[2];
    [(a+1)+':'+b,a+':'+(b+1),(a+b)+':'+b,a+':'+(a+b),(b)+':'+(a)].forEach(add);
    return out;
  }
  if((m=s.match(/^(\d+)\/(\d+)$/))){                       // 分数
    const a=+m[1],b=+m[2];
    [fracS(a+1,b),fracS(a,b+1),fracS(b,a),fracS(a+b,b),fracS(a,b*2)].forEach(add);
    return out;
  }
  return out;                                              // 化学式 / 中文短语：交给 extra
}

