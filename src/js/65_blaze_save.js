/* =========================================================
   局内存档：刷新页面能接着打
   ========================================================= */
function blazeSaveRun(){
  if(!BZ.active){BLAZE_STATE.run=null;return;}
  BLAZE_STATE.run={
    site:BZ.site,diff:BZ.diff,loot:BZ.loot|0,sig:BZ.sig|0,sigMax:BZ.sigMax|0,
    waves:BZ.waves|0,opened:BZ.opened|0,killed:BZ.killed|0,gear:BZ.gear,
    naked:!!BZ.naked,fee:BZ.fee|0,usedTicket:!!BZ.usedTicket,intelAid:!!BZ.intelAid,
    bag:(BZ.bag||[]).map(L=>({n:L.n,e:L.e,r:L.r,val:L.val})),
    medkitUsed:!!BZ.medkitUsed,
    /* 地形整份落盘：房间、不规则边界、岩石都是随机生成的，
       刷新后重 roll 一次会把人刷进墙里，也会让上锁房间的门对不上号 */
    map:BZ.map&&BZ.map.rooms?{
      poly:(BZ.map.poly||[]).map(v=>Math.round(v)),
      rocks:(BZ.map.rocks||[]).map(k=>({x:Math.round(k.x),y:Math.round(k.y),
        r:Math.round(k.r),seed:k.seed|0})),
      rooms:BZ.map.rooms.map(r=>({
        x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.w),h:Math.round(r.h),
        vault:!!r.vault,lock:r.lock|0,opened:!!r.opened,
        cells:(r.cells||[]).map(cc=>({x:Math.round(cc.x),y:Math.round(cc.y),
          w:Math.round(cc.w),h:Math.round(cc.h)})),
        doors:(r.doors||[]).map(d=>[Math.round(d.x),Math.round(d.y),
          Math.round(d.w),Math.round(d.h)])}))}:null,
    x:Math.round(state.x),y:Math.round(state.y),
    spots:BLAZE_SPOTS.map(s=>({t:s.t,x:Math.round(s.x),y:Math.round(s.y),
      ax:Math.round(s.ax||0),ay:Math.round(s.ay||0),
      path:s.path?s.path.map(p=>[Math.round(p.x),Math.round(p.y)]):null,
      pi:s.pi|0,looted:!!s.looted,dead:!!s.dead,locked:!!s.locked,
      val:s.val|0,name:s.name||'',boost:s.boost||0,card:s.card|0,
      opened:!!s.opened,ri:(s.room&&s.room.idx!=null)?s.room.idx:null}))
  };
  save();
}
function blazeRestoreRun(){
  const r=BLAZE_STATE.run;
  if(!r||!BLAZE_SITE_OF[r.site]){blazeToLobby(true);return;}
  const sp=blazeGenMap(r.site,r.diff,r.gear||{},r.map);
  /* 用存档里的位置覆盖随机生成的点位，包括巡逻兵当前跑到哪儿了 */
  const roomsArr=(BZ.map&&BZ.map.rooms)||[];
  BLAZE_SPOTS.forEach((s,i)=>{
    const d=r.spots[i];
    /* 类型对不上就别硬套：版本之间点位表改过（比如房卡房现在必带保险箱），
       存档里的第 i 个点和新生成的第 i 个点未必是同一样东西，
       按错位的数据覆盖会把箱子写成守卫、把坐标安到别的单位头上。 */
    if(!d||d.t!==s.t)return;
    s.x=d.x;s.y=d.y;s.ax=d.ax;s.ay=d.ay;s.pi=d.pi;
    s.val=d.val;s.name=d.name;s.boost=d.boost||0;s.card=d.card|0;
    /* 房间是按引用挂在 spot 上的，重建地图后要把引用接回来 */
    if(d.ri!=null&&roomsArr[d.ri])s.room=roomsArr[d.ri];
    if(s.t==='crate'){s.looted=d.looted;}
    if(s.t==='vault'){s.looted=d.looted;s.locked=d.locked;}
    if(s.t==='patrol'||s.t==='guard'){s.dead=d.dead;s.cd=0;}
    if(s.t==='door'){s.opened=!!d.opened;if(s.opened&&s.room)s.room.opened=true;}
  });
  BZ.active=true;BZ.phase='search';BZ.site=r.site;BZ.diff=r.diff;
  BZ.loot=Math.max(0,parseInt(r.loot,10)||0);
  BZ.sig=Math.max(0,parseInt(r.sig,10)||0);
  BZ.sigMax=Math.max(1,parseInt(r.sigMax,10)||1);
  BZ.waves=clamp(parseInt(r.waves,10)||1,1,3);
  BZ.opened=Math.max(0,parseInt(r.opened,10)||0);
  BZ.killed=Math.max(0,parseInt(r.killed,10)||0);
  BZ.busy=false;
  BZ.gear=r.gear||{battery:0,beacon:0,bag:0,ins:0,key:0,scan:0,medkit:0,luck:0};BZ._sv=0;
  BZ.bag=Array.isArray(r.bag)?r.bag.filter(L=>L&&L.n):[];
  BZ.medkitUsed=!!r.medkitUsed;
  BZ.naked=!!r.naked;BZ.fee=r.fee|0;
  BZ.usedTicket=!!r.usedTicket;BZ.intelAid=!!r.intelAid;
  state.x=r.x;state.y=r.y;state.region='zone';
  if(!walkable(state.x,state.y)){state.x=sp.spawnX;state.y=sp.spawnY;}
  /* 老存档自愈：1.5.11 之前巡逻队会刷进屋里，读回来当场请出去；
     保险箱房的封锁状态按屋里（门口）守卫的存活情况重新定档 */
  blazeEvacVaultRoom();
  blazeVaultSync();
}

