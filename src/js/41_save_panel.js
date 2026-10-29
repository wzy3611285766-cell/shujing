/* =========================================================
   存档面板（手动存 / 读档 / 存档码导入导出 / 文件工具）
   ---------------------------------------------------------
   4.1.1 自 49_drill.js 拆出 —— 它服务全部四个世界（☰ 菜单 + 顶栏 💾），
   和「练枪」没有任何关系，当年只是加在了练枪文件里。
   copyText / downloadFile 同时被 45_wrongbook_io（错题导出）使用；
   跨文件引用靠函数声明提升，本文件位置只需在「使用前求值」即可。
   ========================================================= */
/* ---------------- 存档面板（手动存/读档） ---------------- */
let saveCodeCache='';
const TA_STYLE='width:100%;height:150px;background:rgba(255,255,255,.06);color:#cfe6ff;'+
  'border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:10px;font-size:var(--fs-xs);'+
  'line-height:1.5;resize:none;word-break:break-all;user-select:text;-webkit-user-select:text;'+
  'touch-action:auto;'+
  '-webkit-touch-callout:default;font-family:ui-monospace,Menlo,Consolas,monospace';

function copyText(t){
  return new Promise(res=>{
    if(navigator.clipboard&&window.isSecureContext){
      navigator.clipboard.writeText(t).then(()=>res(true),()=>res(false));
    }else{
      try{
        const ta=document.createElement('textarea');
        ta.value=t;ta.style.position='fixed';ta.style.top='0';ta.style.opacity='0';
        ta.setAttribute('readonly','');
        document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,t.length);
        const ok=document.execCommand('copy');document.body.removeChild(ta);res(ok);
      }catch(e){res(false);}
    }
  });
}
function downloadFile(name,text){
  try{
    const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
    return true;
  }catch(e){return false;}
}
function showSavePanel(){
  const st=storageOK
    ? '<span style="color:#8ef0b8">正常（自动存档已开启）</span>'
    : '<span style="color:#ffb0b0">不可用（无痕模式 / 存储被禁用）<br>请务必用存档码保存进度</span>';
  openPanel(`
    <h2>💾 存档管理</h2>
    <div class="sub">本机自动存档：${st}</div>
    <div class="center" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
      border-radius:14px;padding:12px;margin-bottom:10px;font-size:var(--fs-sm);line-height:var(--lh-loose)">${saveSummary()}</div>
    <div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;line-height:var(--lh-base);margin-bottom:4px;text-align:left">
      · <b style="color:#ffd76a">存档码</b>是一串文本，复制走就能在别的手机/浏览器粘回来<br>
      · 换设备、清缓存、换网址前，先导出一次最保险
    </div>
    <div class="row">
      <button class="btn primary" id="sv1">💾 立即存档</button>
      <button class="btn" id="sv2">📤 导出存档码</button>
    </div>
    <div class="row">
      <button class="btn" id="sv3">📥 导入存档码</button>
      <button class="btn" id="sv4">📄 存成文件</button>
    </div>
    <div class="row">
      <button class="btn" id="sv5">📂 读取文件</button>
      <button class="btn" id="sv6">🗑️ 清空重来</button>
    </div>
    <div class="row"><button class="btn primary" id="ok">关闭</button></div>
  `);
  $('ok').onclick=closePanel;
  $('sv1').onclick=()=>{save()?toast('已保存到本机 ✅'):toast('本机存不了，请用存档码');updateHUD();};
  $('sv2').onclick=async()=>{
    toast('生成中…');
    saveCodeCache=await exportCode();
    showExportView();
  };
  $('sv3').onclick=showImportView;
  $('sv4').onclick=async()=>{
    toast('生成中…');
    const code=await exportCode();   // 每次都重新生成，避免存到旧进度
    saveCodeCache=code;
    downloadFile('数境存档_'+new Date().toISOString().slice(0,10)+'.txt',
      '数境：搜打撤 —— 存档码\n（把下面这整段粘回游戏的「导入存档码」即可）\n\n'+code);
    toast('已存成文件 ✅');
  };
  $('sv5').onclick=()=>{
    const inp=document.createElement('input');
    inp.type='file';inp.accept='.txt,.json,text/plain';
    inp.onchange=async()=>{
      const f=inp.files&&inp.files[0];if(!f)return;
      const txt=await f.text().catch(()=>null);
      if(txt==null){toast('读取失败');return;}
      const r=await importCode(txt);
      if(!r.ok){alert('❌ '+r.msg);return;}
      if(!confirm('用文件里的存档覆盖当前进度？'))return;
      applySave(r.adv,r.epic,r.blaze,r.drill);toast('导入成功，正在载入…');setTimeout(()=>location.reload(),600);
    };
    inp.click();
  };
  $('sv6').onclick=()=>{
    /* 用 CUR 判断而不是读按钮文字 —— 按钮文案随时可能改，读了就错 */
    if(!confirm('清空【'+(CUR===BLAZE?'烽火地带':(CUR===EPIC?'科学编年史':(CUR===DRILL?'练枪场':'闯关')))+'模式】的进度？另外三个模式不受影响。\n此操作不可恢复。\n（建议先导出存档码留底）'))return;
    if(confirm('再确认一次：真的清空吗？'))resetSave();
  };
}
function showExportView(){
  openPanel(`
    <h2>📤 导出存档码</h2>
    <div class="sub">复制下面整段，存进备忘录或发给自己</div>
    <textarea id="code" readonly style="${TA_STYLE}">${saveCodeCache}</textarea>
    <div class="center" id="msg" style="min-height:20px;color:#ffd76a;font-weight:700;font-size:var(--fs-sm)"></div>
    <div class="row">
      <button class="btn primary" id="cp">📋 复制</button>
      <button class="btn" id="dl">⬇️ 文件</button>
      <button class="btn" id="bk">返回</button>
    </div>
  `);
  const ta=$('code');
  ta.addEventListener('focus',()=>ta.select());
  $('cp').onclick=async()=>{
    const ok=await copyText(saveCodeCache);
    $('msg').textContent=ok?'已复制到剪贴板 ✅':'复制失败，请手动长按全选复制';
    if(!ok){ta.focus();ta.select();}
  };
  $('dl').onclick=()=>{
    downloadFile('数境存档_'+new Date().toISOString().slice(0,10)+'.txt',saveCodeCache);
    $('msg').textContent='已存成文件 ✅';
  };
  $('bk').onclick=showSavePanel;
}
function showImportView(){
  openPanel(`
    <h2>📥 导入存档码</h2>
    <div class="sub">粘贴以前保存的存档码，确认后覆盖当前进度</div>
    <textarea id="code" placeholder="在这里长按 → 粘贴存档码（HMG. 开头的那一整段）" style="${TA_STYLE};height:130px"></textarea>
    <div class="center" id="msg" style="min-height:20px;color:#ffd76a;font-weight:700;font-size:var(--fs-sm)"></div>
    <div class="row">
      <button class="btn primary" id="im">✅ 确认导入</button>
      <button class="btn" id="bk">返回</button>
    </div>
  `);
  $('bk').onclick=showSavePanel;
  $('im').onclick=async()=>{
    const v=$('code').value;
    if(!v.trim()){$('msg').textContent='请先粘贴存档码';return;}
    $('msg').textContent='校验中…';
    const r=await importCode(v);
    if(!r.ok){$('msg').textContent='❌ '+r.msg;return;}
    const adv=r.adv||{},epic=r.epic||{},bz=r.blaze||{},aid=r.aid||null,dr=r.drill||{};
    const got=Object.keys(adv.caught||{}).length;
    const bd=Object.keys(adv.badges||{}).length;
    const rd=Object.keys(epic.read||{}).length;
    const bst=bz.bstat||{};
    const drN=Object.keys(dr.drill||{}).length;
    if(!confirm(`用这个存档覆盖四个模式的进度？\n\n闯关：${bd} 枚徽章 · ${got} 只精灵 · ${adv.crystals||0} 结晶\n史诗：已读 ${rd} 篇卷宗\n烽火：撤离 ${bst.exfil||0} 次 · 仓库 ${bz.crystals||0} 结晶\n练枪：${drN?drN+' 科有练枪记录':'暂无记录'}`
      +(aid?`\n支援券：${AID_ITEMS.filter(it=>(aid[it.id]|0)>0).map(it=>it.e+it.n+'×'+(aid[it.id]|0)).join(' · ')||'无'}`:''))){
      $('msg').textContent='已取消';return;
    }
    applySave(r.adv,r.epic,r.blaze,r.drill);
    if(aid){Object.assign(AID_STATE,aid);AID_ITEMS.forEach(it=>{
      const v=Math.floor(Number(AID_STATE[it.id]));AID_STATE[it.id]=(isFinite(v)&&v>0)?v:0;});saveAid();}
    $('msg').textContent='导入成功，正在载入…';
    setTimeout(()=>location.reload(),600);
  };
}
$('btnSave').onclick=()=>{audioKick();showSavePanel();};
