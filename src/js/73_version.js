/* =========================================================
   版本自检 · 更新推送（2026-10-13，4.0.6 加通知栏）
   —— 玩家手里那份可能是缓存里的旧版：他刷新一下就能拿到新的，
      但他不知道"已经有新版了"。这里替他说这句话。

   做法：构建时把版本占位符换成真实版本号，发布目录里放一份
   version.json（tools/build.py 生成 —— 里面除了版本号，还带着
   news.json 那条公告的标题与要点）。启动时取一次：对不上就
   ① 在游戏顶部顶出一条通知栏，把这次改了什么直接列出来，
      给一个「立即刷新」；② 顺带 toast 一句。
   边界：file:// 打开、离线、没部署 version.json、预览沙箱 —— 一律静默跳过，
   绝不让"版本检查"影响游戏本身。
   ========================================================= */
const BUILD_VER='__BUILD_VER__';
const UPBAR_KEY='genji_upbar_skip';   /* 点过 ✕ 的版本号：同一个标签页里不再顶 */
function upbarSkipped(v){
  try{return sessionStorage.getItem(UPBAR_KEY)===String(v);}catch(e){return false;}
}
/* 通知栏：不只是"有新版"，而是把新版改了哪几件事摆出来。
   没有 news_items（老版 version.json / 部署没更新）时退回一句话。 */
function showUpbar(j){
  const el=$('upbar');if(!el)return;
  const items=(j.news_items||[]).slice(0,6);
  const ti=$('upTitle'), li=$('upList');
  if(ti)ti.textContent='新版本 v'+j.version+' 已就绪 · 你手上这份还是 v'+BUILD_VER;
  if(li){
    let html=items.map(s=>'<div class="up-li">'+esc(s)+'</div>').join('');
    if(!html&&j.news_title)html='<div class="up-li">'+esc(j.news_title)+'</div>';
    li.innerHTML=html;
  }
  el.hidden=false;
  /* 顶栏 / 任务条 / toast / 面板 按 --upH 往下让位：通知栏不压任何东西。
     高度实测写入（和 37_hud.js 写 --topH 同一个套路）。 */
  document.documentElement.style.setProperty('--upH',el.offsetHeight+'px');
  document.body.classList.add('upbar-on');
  const go=$('upGo'), x=$('upX');
  /* 通知栏里那颗「⛶ 全屏」（4.0.10）在 55_boot_news.js 的 newsBoot 里统一绑：
     它在"打开游戏就会看到"的位置上，比藏在 ☰ 菜单里容易发现得多，
     但绑定不能等到这条栏真的顶出来才做 —— 那时玩家已经点不到它了。 */
  if(go)go.onclick=()=>{try{location.reload();}catch(e){}};
  if(x)x.onclick=()=>{
    el.hidden=true;
    document.documentElement.style.setProperty('--upH','0px');
    document.body.classList.remove('upbar-on');
    try{sessionStorage.setItem(UPBAR_KEY,String(j.version));}catch(e){}
    toast('新版还在等你 —— 什么时候刷新都行');
  };
}
(function(){
  /* 只在真正的网页部署下检查：本地双击打开 / 沙箱预览里没有"新旧"这回事 */
  if(!/^https?:$/.test(location.protocol))return;
  if(BUILD_VER.indexOf('__')===0)return;          /* 没经过构建，跳过 */
  let done=false;
  const check=()=>{
    if(done)return;done=true;
    fetch('version.json?t='+Date.now(),{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(j=>{
        if(!j||!j.version)return;
        if(String(j.version)===String(BUILD_VER))return;
        toast('🔄 有新版本 v'+j.version+'（当前 v'+BUILD_VER+'）· 刷新一下就能用上');
        if(!upbarSkipped(j.version))showUpbar(j);
      })
      .catch(()=>{});
  };
  /* 别和开场的公告、首次说明抢屏幕：等 5 秒再说 */
  setTimeout(check,5000);
})();
