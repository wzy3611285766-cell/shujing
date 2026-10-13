/* =========================================================
   自动识别（OCR）
   默认：浏览器本地识别，免费、不用 Key，首次会下一份中文字库（十几 MB，有点慢）
   备选：自己填接口（URL + Key），走 POST {image: 图片base64}，返回 {text: 文本}
   ========================================================= */
const OCR_KEY='genji_ocr_v1';
let OCR_CFG={mode:'ai',endpoint:'',key:'',preset:'zhipu',aiBase:'',aiKey:'',aiModel:''};
/* 视觉大模型预设：都是 OpenAI 兼容的 /chat/completions，换地址换模型就能用。
   标了「免费」的是官方有免费额度 / 免费模型的，先试这些。 */
const AI_PRESETS=[
 {id:'zhipu',   n:'智谱 GLM（有免费模型）', base:'https://open.bigmodel.cn/api/paas/v4', model:'glm-4v-flash',        free:1},
 {id:'silicon', n:'硅基流动（有免费额度）', base:'https://api.siliconflow.cn/v1',         model:'Qwen/Qwen2.5-VL-32B-Instruct', free:1},
 {id:'qwen',    n:'阿里通义千问',           base:'https://dashscope.aliyuncs.com/compatible-mode/v1', model:'qwen-vl-max-latest'},
 {id:'openai',  n:'OpenAI',                 base:'https://api.openai.com/v1',             model:'gpt-4o-mini'},
 {id:'moonshot',n:'月之暗面 Kimi',          base:'https://api.moonshot.cn/v1',            model:'moonshot-v1-8k-vision-preview'},
 {id:'ark',     n:'火山方舟豆包',           base:'https://ark.cn-beijing.volces.com/api/v3', model:'doubao-1.5-vision-pro-32k'},
 {id:'ollama',  n:'本机 Ollama（完全免费）', base:'http://localhost:11434/v1',            model:'qwen2.5vl:7b', free:1},
 {id:'custom',  n:'自定义（自己填地址和模型）', base:'', model:''}
];
function aiPreset(id){return AI_PRESETS.filter(p=>p.id===id)[0]||null;}
function loadOcrCfg(){
  try{
    const v=localStorage.getItem(OCR_KEY);
    if(v){const o=JSON.parse(v);if(o&&typeof o==='object'){
      if(o.mode==='ai'||o.mode==='api'||o.mode==='tess')OCR_CFG.mode=o.mode;
      if(typeof o.endpoint==='string')OCR_CFG.endpoint=o.endpoint;
      if(typeof o.key==='string')OCR_CFG.key=o.key;
      if(typeof o.preset==='string')OCR_CFG.preset=o.preset;
      if(typeof o.aiBase==='string')OCR_CFG.aiBase=o.aiBase;
      if(typeof o.aiKey==='string')OCR_CFG.aiKey=o.aiKey;
      if(typeof o.aiModel==='string')OCR_CFG.aiModel=o.aiModel;
    }}
  }catch(e){}
}
function saveOcrCfg(){try{localStorage.setItem(OCR_KEY,JSON.stringify(OCR_CFG));}catch(e){}}
loadOcrCfg();
let tessP=null;
function tessLoad(){
  if(tessP)return tessP;
  tessP=new Promise((res,rej)=>{
    if(window.Tesseract)return res(window.Tesseract);
    /* 三个 CDN 轮着试：一个被墙就换下一个 */
    const urls=[
      'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
      'https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js'
    ];
    let i=0;
    (function next(){
      if(i>=urls.length)return rej(new Error('识别库下载失败'));
      const sc=document.createElement('script');
      sc.src=urls[i++];
      sc.onload=()=>window.Tesseract?res(window.Tesseract):next();
      sc.onerror=next;
      (document.head||document.body||document.documentElement).appendChild(sc);
    })();
  });
  return tessP;
}
const TESS_TXT={'loading tesseract core':'加载识别核心','initializing tesseract':'正在启动',
  'initialized tesseract':'已启动','loading language traineddata':'下载中文字库（首次较慢，十几 MB）',
  'loaded language traineddata':'字库就绪','initializing api':'准备识别','initialized api':'准备就绪',
  'recognizing text':'识别中'};
function ocrTess(url,onProg){
  return tessLoad().then(T=>{
    return T.recognize(url,'chi_sim+eng',{logger:m=>{
      if(onProg&&m&&typeof m.status==='string'){
        const t=TESS_TXT[m.status]||m.status;
        onProg(t+(m.progress!=null&&m.progress<1?' '+Math.round(m.progress*100)+'%':''));
      }
    }});
  }).then(r=>({ok:true,text:((r&&r.data&&r.data.text)||'').trim()}))
    .catch(e=>({ok:false,err:(e&&e.message)||'识别失败'}));
}
function ocrApi(url){
  const ep=(OCR_CFG.endpoint||'').trim();
  if(!ep)return Promise.resolve({ok:false,err:'还没填接口地址'});
  return fetch(ep,{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({image:url,key:OCR_CFG.key||''})})
    .then(r=>r.text())
    .then(t=>{
      let o=null;try{o=JSON.parse(t);}catch(e){}
      const txt=o?(o.text||o.result||(o.data&&(o.data.text||o.data.result))||''):t;
      return {ok:true,text:String(txt||'').trim()};
    })
    .catch(e=>({ok:false,err:'接口请求失败：'+((e&&e.message)||'')}));
}
/* ---------- AI 识别（视觉大模型）----------
   比 OCR 强在「看得懂」：公式、化学式、表格、拍歪的、带选项的，
   都能按语义整理好，还能顺手把科目和知识点判出来。 */
const AI_PROMPT=[
'你是中学试题解析助手。请看清图片里的题目，只输出 JSON，不要任何解释、不要 markdown 代码块标记。',
'格式：',
'{"stem":"题干全文（含所有文字、公式、化学式；有选项就把 A. B. C. D. 各占一行写进 stem）",',
' "answer":"正确答案（如 C、0.1 mol/L、x>2；图片里没有答案就填空字符串）",',
' "options":["A选项文本","B选项文本","C选项文本","D选项文本"],',
' "topic":"知识点（如 物质的量浓度、光合作用、牛顿第二定律）",',
' "subject":"math|phys|chem|bio 四选一"}',
'要求：',
'1. 保留原文写法：化学式 CO2 写成 CO₂ 或 CO2 都行，下标上标、分数线、根号、希腊字母按原样保留',
'2. 没有选项的填空/计算/解答题，options 填 null',
'3. 图片里有多道题时，只取第 1 道',
'4. 图片里找不到答案，answer 填空字符串，不要编',
'5. 看不清的地方用 ？ 代替，不要猜'
].join('\n');
/* ---------- 深度解析：题干答案之外，再要解析 / 步骤 / 思路层 ----------
   思路层（approach）直接要成游戏用的那种结构：
     right = 最好的入手方式，wrong = 学生真会这么想的偏路，why = 为什么这样最省事
   拿到手就能灌进错题本，重练时第一步「🧭 先选思路」直接有题可出。 */
const AI_PROMPT_DEEP=[
'你是中学试题解析助手。请看清图片里的题目，只输出 JSON，不要任何解释、不要 markdown 代码块标记。',
'格式：',
'{"stem":"题干全文（含公式化学式的原文写法；有选项就 A. B. C. D. 各占一行写进 stem）",',
' "answer":"正确答案（如 C、0.1 mol/L、x>2；图里没有就填空字符串）",',
' "options":["A选项文本","B选项文本","C选项文本","D选项文本"],',
' "topic":"知识点（如 物质的量浓度、牛顿第二定律、光合作用）",',
' "subject":"math|phys|chem|bio 四选一",',
' "explain":"一句话讲清为什么是这个答案，说中要害，60 字以内",',
' "steps":["第一步：先做什么","第二步：再做什么","第三步：得出什么"],',
' "approach":{"right":"最好的入手方式，动词开头，一句话，如 先受力分析再正交分解",',
'            "wrong":["学生会这么想但其实绕远的做法","另一种典型的错误入手","第三个常见误区"],',
'            "why":"为什么这样入手最省事，一句话"}}',
'要求：',
'1. 化学式、上下标、根号、分数线、希腊字母按原样保留，不要改写成口语',
'2. 没有选项的填空/计算/解答题，options 填 null',
'3. 图片里有多道题时只取第 1 道',
'4. 图里找不到答案，answer 填空字符串，不要编；但 steps 与 explain 照常给（当作讲解）',
'5. steps 给 2~4 步，每步一句话 20 字以内，要能看出"先做什么后做什么"，不要堆计算过程',
'6. approach.wrong 必须是"学生真会这么想"的错误入手方式，三条互不相同，',
'   不要写"随便猜"这类明显荒谬的；每条 18 字以内',
'7. approach 里不许出现与 answer 相同的整句，right 说的是"怎么下手"不是"答案是什么"',
'8. 看不清的地方用 ？ 代替，不要猜'
].join('\n');
/* ---------- 第二轮：把一道已识别的题「讲透」----------
   第一趟看图求的是结构化（题干 / 答案 / 选项 / 知识点），长 JSON 容易吐不全；
   讲解这种长文本单独走一趟、不带图，既省 token 又稳，失败也不影响入库。
   拿到的东西分三块，正好对上游戏的三处：
     lecture → 答题后摊开的完整解析
     hints   → 答前逐层给的 3~4 步提示（最后一步仍要自己算）
     trap    → 讲完点一句「最容易错在哪」 */
const AI_PROMPT_LECT=[
'你是中学金牌讲师。下面是一道已经识别出来的题，请给出讲解。只输出 JSON，不要任何解释、不要 markdown 代码块标记。',
'【题目】{Q}',
'【正确答案】{A}',
'【科目】{S}',
'输出格式：',
'{"lecture":"完整讲解。先点明考什么，再说关键一步怎么想、关键式子怎么写，最后怎么落到答案；要带具体数字和式子，不要空话，120~220 字",',
' "hints":["第一步：先做什么（不能给答案）","第二步：列出哪个关系式","第三步：算出哪个中间量","第四步：只剩哪一步就到答案"],',
' "trap":"学生最容易错在哪，一句话，30 字以内",',
' "key":"核心考点，10 字以内"}',
'要求：',
'1. hints 给 3~4 条，逐层逼近，前几条绝不能把答案说出来，最后一条也不给最终数值',
'2. lecture 要具体到数和式子，比如「由 2x/(4−x) = 0.4 得 x = 2/3」这种程度',
'3. 题目是填空 / 计算 / 解答题（没有选项）时，hints 就按「先求什么 → 再求什么」给',
'4. 看不懂题目就按科目给通用讲法，不要编造题里的数字'
].join('\n');
function aiLecture(stem,ans,subj,onProg){
  const base=(OCR_CFG.aiBase||'').trim(),key=(OCR_CFG.aiKey||'').trim();
  const model=(OCR_CFG.aiModel||'').trim();
  if(!base||!model)return Promise.resolve(null);
  if(!stem&&!ans)return Promise.resolve(null);
  if(onProg)onProg('AI 正在写讲解…');
  const subjName=(DRILL_OF[subj]&&DRILL_OF[subj].name)||'中学';
  const pm=AI_PROMPT_LECT.replace('{Q}',String(stem||'').slice(0,600))
    .replace('{A}',String(ans||'').slice(0,200)).replace('{S}',subjName);
  const body={model:model,temperature:0.2,
    messages:[{role:'user',content:pm}]};
  return fetch(base.replace(/\/+$/,'')+'/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify(body)
  }).then(r=>{
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(j=>{
    const c=j&&j.choices&&j.choices[0];
    const o=aiParseJson((c&&c.message&&c.message.content)||'');
    if(!o)return null;
    const hints=(o.hints||[]).map(v=>aiStr(v,90)).filter(v=>v.length>2);
    return {lecture:aiStr(o.lecture||o.explain||'',400),
            hints:hints.length?hints.slice(0,4):null,
            trap:aiStr(o.trap||'',60),key:aiStr(o.key||'',16)};
  }).catch(()=>null);
}
