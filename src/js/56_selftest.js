/* =========================================================
   题库自检：地址栏加 ?selftest=1 打开本页，控制台会给出报告
   每道题生成器随机跑 N 次，检查选项数、重复、假选项、答案缺失、NaN
   ========================================================= */
function selfTest(n){
  n=n||600;const bad=[];let gens=0;
  for(const rid in BANK)for(const tier of [1,2,3]){
    const pool=BANK[rid][tier];
    pool.forEach((f,pi)=>{
      gens++;
      const id=rid+'['+tier+']#'+pi;
      for(let k=0;k<n;k++){
        let q;
        try{q=f();}catch(e){bad.push(id+' 生成报错：'+e.message);break;}
        /* 用 \u0001 分隔再拼，不要直接相连：题干以 "Na" 结尾、选项以 "Na" 开头时
           拼出来是 "NaNa"，会被下面的 NaN 正则误判成"题目里出现了 NaN" */
        const all=[q.text].concat(q.opts,[q.exp]).join('\u0001');
        if(/undefined|NaN|Infinity/.test(all)){bad.push(id+' 文本含 undefined/NaN：'+q.text);break;}
        if(q.opts.length!==4){bad.push(id+' 选项只有 '+q.opts.length+' 个：'+q.text+' => '+q.opts.join(' / '));break;}
        if(new Set(q.opts).size!==q.opts.length){bad.push(id+' 选项重复：'+q.opts.join(' / '));break;}
        if(!q.opts.includes(q.ansText)){bad.push(id+' 正确答案不在选项中：'+q.text+' => '+q.ansText);break;}
        if(q.opts.some(o=>/\*\d+$/.test(o))){bad.push(id+' 出现兜底假选项：'+q.opts.join(' / '));break;}
      }
    });
  }
  let egens=0;
  try{
    EPIC_SPOTS.forEach(sp=>{
      const it=EPIC_LIB[sp.sid];
      if(!it||!it.quiz)return;
      egens++;
      const id='EPIC#'+sp.sid;
      if(!it.title||!it.body||!it.year)bad.push(id+' 缺少年份/正文');
      for(let k=0;k<Math.min(n,60);k++){
        let q;
        try{q=it.quiz();}catch(e){bad.push(id+' 考题生成报错：'+e.message);break;}
        /* 用 \u0001 分隔再拼，不要直接相连：题干以 "Na" 结尾、选项以 "Na" 开头时
           拼出来是 "NaNa"，会被下面的 NaN 正则误判成"题目里出现了 NaN" */
        const all=[q.text].concat(q.opts,[q.exp]).join('\u0001');
        if(/undefined|NaN|Infinity/.test(all)){bad.push(id+' 考题含 undefined/NaN：'+q.text);break;}
        if(q.opts.length!==4){bad.push(id+' 考题选项只有 '+q.opts.length+' 个：'+q.opts.join(' / '));break;}
        if(new Set(q.opts).size!==q.opts.length){bad.push(id+' 考题选项重复：'+q.opts.join(' / '));break;}
        if(!q.opts.includes(q.ansText)){bad.push(id+' 考题答案不在选项中：'+q.opts.join(' / '));break;}
      }
    });
  }catch(e){bad.push('史诗内容检查异常：'+e.message);}
  const head='题库自检：'+(gens+egens)+' 个生成器 × '+n+' 次（史诗题上限 60 次）';
  if(bad.length){
    console.warn('❌ '+head+'，发现 '+bad.length+' 处问题');
    bad.forEach(b=>console.warn(' · '+b));
    toast('题库自检发现 '+bad.length+' 处问题，详见控制台');
  }else{
    console.log('%c✅ '+head+'，全部通过','color:#34c77b;font-weight:bold');
    toast('题库自检通过 ✅');
  }
  return bad;
}
if(/[?&]selftest=1/.test(location.search))setTimeout(()=>selfTest(800),500);

/* 自动存档：每 5 秒 + 切到后台 + 关页面时各存一次 */
setInterval(save,5000);
const autoSave=()=>{if(!wiping)save();};
window.addEventListener('pagehide',autoSave);
window.addEventListener('beforeunload',autoSave);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')autoSave();});

/* 玩过但本机存档不见了 → 提醒可以用存档码恢复 */
try{
  if(localStorage.getItem(curKey+'_intro')&&!localStorage.getItem(curKey))
    setTimeout(()=>toast('本机存档不见了，可用存档码恢复 💾'),2800);
}catch(e){}


