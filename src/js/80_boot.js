/* =========================================================
   启动执行点（唯一的"求值期执行"模块 · 4.1.1）
   ---------------------------------------------------------
   在它之前的 74 个模块只负责定义（函数声明提升 + 顶层常量），
   真正的启动动作全部集中在这里、按固定顺序跑一遍：

     startGame()      世界选择 / 读档 / 首屏渲染（定义在 55_boot_news.js）
     advNationBoot()  ADV 开局按存档里的国度重建地图（定义在 57_multination.js；
                      以前是个求值期 IIFE，全靠"排在 startGame 之后"才不踩空）
     newsBoot()       公告绑定 + 未读则排入队列（定义在 55_boot_news.js）
     maybeIntro(700)  首访说明（定义在 55_boot_news.js）
     自动存档注册      每 5 秒心跳 + pagehide/beforeunload/visibilitychange 三路兜底
                      （以前藏在 56_selftest.js 里，差点被当调试代码清掉）
     存档丢失提示      玩过但本机存档没了 → 提醒可用存档码恢复

   ⚠️ 本文件必须是最后一个 JS 模块 —— build.py 的 boot_last_check() 断言这条。
      往后追加新模块时，启动语句一律写进这里，别在别处再开"执行"的口子。
   ========================================================= */
startGame();
advNationBoot();
newsBoot();
maybeIntro(700);

/* 自动存档：每 5 秒 + 切到后台 + 关页面时各存一次。
   cloudBoot（72_cloud_save.js）已把 save() 包了一层脏标记，
   这里注册的心跳拿到的就是包过装的版本。 */
setInterval(save,5000);
const autoSave=()=>{if(!wiping)save();};
window.addEventListener('pagehide',autoSave);
window.addEventListener('beforeunload',autoSave);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')autoSave();});

/* 玩过但本机存档不见了 → 提醒可以用存档码恢复。
   startGame() 已把 curKey 切到本局世界，这里读到的是"当前世界"的键。 */
try{
  if(localStorage.getItem(curKey+'_intro')&&!localStorage.getItem(curKey))
    setTimeout(()=>toast('本机存档不见了，可用存档码恢复 💾'),2800);
}catch(e){}
