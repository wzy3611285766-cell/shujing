/* =========================================================
   版本自检 · 更新推送（2026-10-13）
   —— 玩家手里那份可能是缓存里的旧版：他刷新一下就能拿到新的，
      但他不知道"已经有新版了"。这里替他说这句话。

   做法：构建时把版本占位符换成真实版本号，发布目录里放一份
   version.json（tools/release.py 生成）。启动时取一次 version.json，
   对不上就提示刷新。
   边界：file:// 打开、离线、没部署 version.json、预览沙箱 —— 一律静默跳过，
   绝不让"版本检查"影响游戏本身。
   ========================================================= */
const BUILD_VER='__BUILD_VER__';
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
      })
      .catch(()=>{});
  };
  /* 别和开场的公告、首次说明抢屏幕：等 5 秒再说 */
  setTimeout(check,5000);
})();
