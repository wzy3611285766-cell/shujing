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
  return el;
}
function addH(el,html){
  if(!el)return el;
  const src=html==null?'':String(html);
  el.appendChild(document.createRange().createContextualFragment(src));
  return el;
}
function hasH(el){return !!(el&&el.firstChild);}

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

