/* =========================================================
   入局核算 —— 这一趟配不配得上这张图
   ------------------------------------------------------------
   战备值：制式配装 + 勾选携带物资的采购原价。带出去就没了，
           所以它是「本钱」而不是「存款」—— 押得越重，门槛越容易过。
   跑刀：  不买票也不带货，战备值只剩制式配装那一层，
           所以只够进常规场 —— 光着身子想混进高考场？门都没有。
           省下的是门票钱，赌上的是保底、估值与一格信号值。
   行动经费：部署当场扣，计入「已投入」，阵亡也不退。
   ========================================================= */
function blazeLoadoutValue(carry,naked){
  if(naked)return BLAZE_BASE_KIT;
  const c=carry||BZ.carry||{};
  let v=BLAZE_BASE_KIT;
  BLAZE_GEAR.forEach(it=>{if(c[it.id])v+=(it.price|0);});
  return v;
}
function blazeEntryCheck(c0){
  const pick=BLAZE_STATE.pick||{site:'math',diff:1};
  const diff=BLAZE_DIFF_OF[pick.diff]||BLAZE_DIFF[0];
  const naked=!!BLAZE_STATE.naked;
  const val=blazeLoadoutValue(c0||BZ.carry,naked);
  const req=(diff.req|0)||BLAZE_BASE_KIT;
  const fee=diff.fee|0;
  const money=Math.max(0,BLAZE_STATE.crystals|0);
  /* 🎟️ 行动经费抵用券：手上有就一定能进，门票走券不走结晶 */
  const ticket=aidCount('ticket')>0;
  const scan  =aidCount('scan')>0;
  return {
    diff:diff, naked:naked, val:val, req:req, fee:fee,
    ticket:ticket, scan:scan,
    ok    : val>=req,                     // 战备值够不够
    need  : Math.max(0,req-val),          // 还差多少战备值
    canPay: naked||ticket||money>=fee,    // 门票买不买得起（券也算）
    poor  : !naked&&!ticket&&money<fee,
    needMoney: (naked||ticket)?0:Math.max(0,fee-money),
    ready : val>=req&&(naked||ticket||money>=fee) // 能不能按下部署键
  };
}

/* ---------------- 烽火存档 ---------------- */
function blankBlaze(){
  const o=blankState();
  o.crystals=0;          // 仓库结晶 = 哈夫币（撤离成功才入账，采购从这里扣）
  /* 仓库里还没带出去的物资（含房卡）—— 键随战备清单走，加新货不用改这里 */
  o.gear={};BLAZE_GEAR.forEach(it=>{o.gear[it.id]=0;});
  /* 特勤处：五个部门各自升级（老存档只有一条 hq 等级线，见 healState 迁移） */
  o.hqd={cmd:1,log:1,med:1,intel:1,arms:1};
  o.stash={};            // 仓库库存：能卖、也能被特勤处上缴的物资 {名字: {n,e,r,val,cnt}}
  o.dex={};              // 图鉴：历史见过的物资（只增不减，卖掉也不会消失）
  o.sold=0;              // 累计卖出的件数
  o.soldVal=0;           // 累计卖出的哈夫币
  o.spent=0;             // 特勤处累计花掉的哈夫币
  o.spentItem=0;         // 特勤处累计上缴的稀有物资件数
  o.best={r:-1,n:'',v:0};// 历史最贵的一件（图鉴用）
  /* 战绩：撤离 / 阵亡 / 最高单次估值 / 累计估值 / 累计带回件数 */
  o.bstat={exfil:0,wipe:0,best:0,loot:0,items:0};
  /* 注意：state.stat 是引擎留给「各域答题统计」的，烽火战绩另开 bstat，
     两边混在一个字段里会把学习报告的数据冲掉 */
  o.pick={site:'math',diff:1};               // 大厅里选中的地点与难度
  o.naked=false;                             // 跑刀进图（免行动经费，代价见 BLAZE_NAKED_MUL）
  o.fee=0;                                   // 累计交出去的行动经费（战绩用）
  o.run=null;                                // 进行中的那一局（存档用）
  return o;
}
const BLAZE_STATE=blankBlaze();

/* ---------------- 局内状态（内存 + 存档双份） ----------------
   BZ 是跑起来那一局的全部状态，每次变更都同步进 BLAZE_STATE.run；
   刷新页面能接着打，不会白跑一趟。 */
let BZ={active:false,phase:'lobby',site:'math',diff:1,
  loot:0,sig:4,sigMax:4,waves:1,opened:0,killed:0,busy:false,
  bag:[],                                  // 本局搜到的物资（撤离成功才折算成结晶）
  map:null,                                // 本局地形：{rooms:[], vault:null}
  vaultOpen:false,                         // 保险箱房的守卫清干净了没
  medkitUsed:false,
  gear:{},                                 // 本局带进来的物资（含房卡），部署时按清单填
  naked:false,                             // 本局是不是跑刀进图（免票 · 无保底 · 估值打折）
  fee:0,                                   // 本局交掉的行动经费
  usedTicket:false,                        // 本局的门票是不是用 🎟️ 抵用券抵掉的
  intelAid:false,                          // 本局是不是用了 📟 开局情报券
  cards:0};                                // 本局已经刷开的门数（战绩用）
/* 战场底纹：true = 简洁（默认）。
   扫描线、战术网格、焦土斜线、地表装饰这些东西单看都只有 5%~11% 的透明度，
   叠在一起却把地形和点位糊成一片 —— 手机上尤其明显（缩放只有 0.55，
   每 6px 一条的扫描线到屏上就是每 3 个物理像素一条）。
   简洁档把它们压到"看得出有、但不抢戏"，想看完整底纹在 ☰ 菜单里切回来。 */
let BZ_CLEAN=true;
try{BZ_CLEAN=(localStorage.getItem('himath_bzclean')||'1')!=='0';}catch(e){}
function setBzClean(v){
  BZ_CLEAN=!!v;
  try{localStorage.setItem('himath_bzclean',BZ_CLEAN?'1':'0');}catch(e){}
  if(CUR===BLAZE)buildStatic();          // 底纹画在静态层，改完得重铺一次
}
/* 局内携带表按战备清单初始化（房卡也是其中一项）。
   必须等 BZ 声明完再填 —— 写在 BZ 之前会撞上 TDZ，整个脚本在加载时就崩。 */
BLAZE_GEAR.forEach(it=>{BZ.gear[it.id]=0;});

const BLAZE_REGIONS=[];
const BLAZE_SPOTS=[];
const BLAZE_LOOSE=[];

const BLAZE={
  id:'blaze',W:1600,H:1200,
  title:'数境：搜打撤',
  sub:'搜刮 · 交火 · 活着撤离',
  regions:BLAZE_REGIONS,bridges:[],spots:BLAZE_SPOTS,loose:BLAZE_LOOSE,spirits:[],
  st:BLAZE_STATE,save:SAVE_KEY_BLAZE,actR:78,
  drawWorld:drawBlazeWorld,
  doneSpot:blazeSpotDone,
  spotLabel:blazeSpotLabel,
  actBtn:blazeActBtn
};

