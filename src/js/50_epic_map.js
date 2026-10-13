/* =========================================================
   史诗世界：时间长河的地图
   ========================================================= */

/* =========================================================
   史诗模式 · 引擎
   —— 与「闯关模式」并列，共用同一套渲染 / 移动 / 弹窗机制
   ========================================================= */
let CUR=null;                       // 当前世界（ADV 或 EPIC）
const ADV_STATE=state;              // 闯关模式的进度
const EPIC_STATE=blankState();      // 史诗模式的进度（两边分开存）
EPIC_STATE.sound=ADV_STATE.sound;

const ADV={
  id:'adv',W:2400,H:1900,
  title:'格物纪元 · 四国远征',
  sub:'走遍数理群岛、力理亚、嬗变利亚、生衍利亚',
  regions:REGIONS,bridges:BRIDGES,spots:SPOTS,loose:LOOSE,spirits:SPIRITS,
  st:ADV_STATE,save:SAVE_KEY,actR:86
};
const EPIC={
  id:'epic',W:EPIC_W,H:EPIC_H,
  title:'格物纪元 · 科学编年史',
  sub:'从伊尚戈骨上的刻痕，到碱基的双螺旋',
  regions:EPIC_REGIONS,bridges:[],spots:EPIC_SPOTS,loose:EPIC_DUST,spirits:[],
  st:EPIC_STATE,save:SAVE_KEY_EPIC,actR:74,
  drawWorld:drawEpicWorld,
  doneSpot:()=>false,               // 卷宗读过了也可以重读
  spotLabel:epicSpotLabel,
  actBtn:epicActBtn
};

