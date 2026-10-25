/* =========================================================
   🎯 练枪场（Drill Range）
   —— 数 / 理 / 化 / 生 四科各开一条无限题线，想刷多久刷多久
   —— 每道题仍是两步：先选「思路」，再选「答案」
   —— 零损失：提示免费、答错不扣结晶、不降档、不算失败，随时可退出
   —— 后台按「科 → 知识点」累计对错，自动排出薄弱点；
      开「专攻薄弱」时抽题优先命中低命中率的知识点
   ========================================================= */
const WRONG_CAP=200;                 // 错题本容量（1.5.15 起 30 → 200）
const DRILL_SUBJ=[
 {id:'math',name:'数学',emoji:'📐',color:'#9db4ff'},
 {id:'phys',name:'物理',emoji:'⚡',color:'#ffd76a'},
 {id:'chem',name:'化学',emoji:'🔥',color:'#ffb072'},
 {id:'bio', name:'生物',emoji:'🌿',color:'#84e3a6'}
];
const DRILL_OF={};DRILL_SUBJ.forEach(s=>{DRILL_OF[s.id]=s;});
/* 科目 → 该科所有域 id：四国的域在构建时就挂到 NATIONS 上了，直接取现成的。
   BANK 是全局的，所以人在数学国也能刷物理题，不必先跑过去。 */
const DRILL_RIDS={};
DRILL_SUBJ.forEach(s=>{
  const n=NATION_OF[s.id];
  DRILL_RIDS[s.id]=(n&&n.regions&&n.regions.length)?n.regions.map(r=>r.id):['func'];
});
/* 173.5 补的三域（热学 / 光学与近代 / 化学实验）**不在地图上开区域**，
   而上面这段是从地图派生的，所以新域挂不上来 —— 在这里补挂。
   地图不开区是有意的：开一个区要同时配石碑、精灵、守护者、地表装饰、
   传送桥、四角瞄准框，还要重算区域矩形与桥的连通性，代价远超收益；
   而练枪场、错题本、学习报告全部只认 rid，不认地图。
   挂上之后：练枪选「物理」能刷热学与光学，选「化学」能刷实验题。 */
/* plab（物理实验）排在最前面：topicOfSid 是按 rids 顺序找第一个命中的，
   放在前面才能保证「验证牛顿第二定律」这类知识点落到物理实验专题，
   而不是被 mech 里那条更宽的「牛顿第二定律」抢走。 */
DRILL_RIDS.phys=['plab'].concat(DRILL_RIDS.phys,['therm','optic']);
DRILL_RIDS.chem=DRILL_RIDS.chem.concat(['lab']);
/* 不在地图上开区的域，在练枪的专题面板里得有个名字 */
const OFFMAP_NAME={therm:'🌡 热学',optic:'🔭 光学与近代',
  lab:'🧪 化学实验',plab:'🔬 物理实验'};
/* ---------- 练枪专题（1.9.0）----------
   一个域（如 tri 三角海湾）下面有二三十个知识点，随机刷会稀里糊涂；
   按专题练才能"今晚就把解三角形刷透"。
   表里 kw 是知识点名的关键词：抽到题就用它的 topic 去匹配，
   命中关键词最长的那个专题胜出 —— 所以「导数与单调性」会落到
   「导数应用」而不是「函数性质」，尽管两边都有"单调性"三个字。
   t 是这个专题实际有题的难度档（离线跑采样统计出来的）：
   「导数应用」没有普通档、「交变电流」只有高考档，选了会自动切档。 */
const DRILL_TOPICS={
 func:[{id:'fn_prop',n:'函数性质',t:[1,2,3],kw:['定义域','反函数','奇偶性','单调性','最值','函数零点与对称性','数形结合']},
  {id:'fn_exp',n:'指对幂运算',t:[1,3],kw:['指数运算','对数运算','换底公式','比较大小','幂函数']},
  {id:'fn_der',n:'导数与切线',t:[2,3],kw:['导数','切线']},
  {id:'fn_app',n:'导数应用',t:[2,3],kw:['导数与单调性','导数与极值','导数与零点','导数综合','恒成立问题','恒成立','构造法的适用检验']}],
 tri:[{id:'tr_img',n:'三角函数图象性质',t:[1,2],kw:['三角函数图象性质','三角函数的图象与性质','弧度制','周期','图象变换','三角函数单调性']},
  {id:'tr_id',n:'三角恒等变换',t:[1,2,3],kw:['同角关系','诱导公式','和差角','二倍角','辅助角公式','辅助角','三角恒等变换','凑角与整体代换','特殊值']},
  {id:'tr_solve',n:'解三角形',t:[1,2,3],kw:['正弦定理','余弦定理','解三角形','解三角形面积','解三角形最值','解三角形综合','余弦定理与面积','正余弦定理与形状判断','解的个数检验','单位圆与面积夹逼','边角互化','面积的最值']}],
 seq:[{id:'sq_ap',n:'等差数列',t:[1,3],kw:['等差数列','等差数列性质','等差数列求和','等差数列最值','等差数列与等比中项','递推与等差数列']},
  {id:'sq_gp',n:'等比数列',t:[1,2,3],kw:['等比数列','等比数列性质','等比数列求和','等比数列前n项和']},
  {id:'sq_gen',n:'通项与递推',t:[1,2,3],kw:['通项','递推数列','递推结构识别','Sn 与 an','函数观点看数列']},
  {id:'sq_sum',n:'求和与不等式',t:[2,3],kw:['裂项求和','错位相减','求和方法的选择','基本不等式']}],
 geo:[{id:'ge_lc',n:'直线与圆',t:[1,2,3],kw:['两点间距离','中点坐标','圆的方程','直线与圆']},
  {id:'ge_conic',n:'圆锥曲线',t:[1,2,3],kw:['椭圆','椭圆定义','椭圆离心率','双曲线','抛物线','抛物线定义','点差法','定义法']},
  {id:'ge_solid',n:'空间几何与向量',t:[1,2,3],kw:['异面直线','线面角','空间向量','体积','球的体积','外接球','补形法','坐标法与几何法的取舍']}],
 prob:[{id:'pr_count',n:'计数与二项式',t:[1,2,3],kw:['排列','插空法','二项式定理']},
  {id:'pr_prob',n:'概率',t:[1,2,3],kw:['古典概型','几何概型','条件概率','独立事件','事件独立性','对立事件','独立重复试验']},
  {id:'pr_dist',n:'分布与统计',t:[1,2,3],kw:['二项分布','超几何分布','超几何与二项分布','数学期望','方差性质','正态分布','回归分析','独立性检验']}],
 mech:[{id:'me_kin',n:'运动学',t:[1,2],kw:['匀变速直线运动','自由落体','运动图像','追及相遇','运动的合成与分解','平抛运动']},
  {id:'me_sta',n:'静力学',t:[1,2,3],kw:['共点力平衡','力的合成','摩擦力','静摩擦力','静摩擦力的方向','斜面','斜面上的平衡','动态平衡','临界状态分析','整体法与隔离法']},
  {id:'me_new',n:'牛顿运动定律',t:[1,2,3],kw:['牛顿第二定律','瞬时加速度','连接体','板块模型','传送带模型','超重与失重']},
  {id:'me_cir',n:'圆周运动',t:[2,3],kw:['圆周运动临界','圆周运动应用','竖直平面内的圆周运动']},
  {id:'me_misc',n:'综合与检验',t:[2,3],kw:['极限法检验','弹簧中的能量守恒']}],
 neng:[{id:'ne_work',n:'功与功率',t:[1,2,3],kw:['功','功的正负','功率','功率与牵引力','变力做功','恒定功率启动','机车启动','图象的物理意义']},
  {id:'ne_energy',n:'动能定理与机械能',t:[1,2,3],kw:['动能','动能定理','重力势能','弹性势能','机械能守恒','机械能守恒的条件','机械能守恒与圆周','守恒优先于过程']},
  {id:'ne_mom',n:'动量',t:[1,2,3],kw:['动量','动量守恒','动量定理','碰撞中的动量守恒','动量与能量的分工']},
  {id:'ne_grav',n:'万有引力与航天',t:[2,3],kw:['万有引力定律','万有引力与天体质量','人造卫星','卫星的线速度','宇宙速度']},
  {id:'ne_misc',n:'综合',t:[2],kw:['平抛运动的合成','力学综合','力电综合']}],
 dian:[{id:'di_field',n:'静电场',t:[1,2,3],kw:['库仑定律','电场强度','电场线与等势面','电场力做功与电势','电容器','带电粒子在电场中加速','带电粒子在电场中的偏转']},
  {id:'di_dc',n:'恒定电流',t:[1,2],kw:['欧姆定律','闭合电路欧姆定律','串并联电路','并联电路','电阻定律','电功率','焦耳定律','电源的输出功率','等势点缩点法','极值点分析法']},
  {id:'di_mag',n:'磁场与电磁感应',t:[1,2,3],kw:['安培力','安培定则','洛伦兹力','带电粒子在磁场中的圆周运动','带电粒子在磁场中的时间','找圆心定半径','楞次定律','电磁感应','电磁感应中的电荷量']},
  {id:'di_ac',n:'交变电流',t:[3],kw:['交变电流','交变电流的产生','变压器','远距离输电']}],
 atom:[{id:'at_struct',n:'原子结构与周期律',t:[1,2,3],kw:['原子结构','核外电子数','同位素','元素周期律','位构性三角','半径比较三步法','电离能','电负性','金属性强弱']},
  {id:'at_bond',n:'化学键与晶体',t:[1,2,3],kw:['化学键','离子键','共价化合物','离子化合物与共价化合物','元素推断与化学键','分子空间构型','杂化轨道','氢键与沸点','晶体类型与性质','晶胞结构','配合物']},
  {id:'at_mole',n:'物质的量',t:[1,2],kw:['物质的量','阿伏加德罗常数','物质的量浓度','化合价与化学式']},
  {id:'at_redox',n:'氧化还原与电化学',t:[1,2,3],kw:['氧化还原反应','氧化还原反应的计算','盖斯定律','电解原理','电解质']},
  {id:'at_ion',n:'离子反应',t:[1,2,3],
   kw:['离子方程式正误判断','与量有关的离子方程式','离子方程式书写','离子方程式']}],
 rate:[{id:'ra_rate',n:'反应速率',t:[1,3],kw:['反应速率','影响反应速率的因素','影响速率的因素','速率时间图读法']},
  {id:'ra_eq',n:'化学平衡',t:[1,2,3],kw:['化学平衡状态','平衡常数','平衡常数的意义','平衡常数计算','化学平衡常数的计算','平衡图像','浓度对平衡的影响','压强对平衡的影响','温度对平衡的影响','等效平衡','Q 与 K 比大小']},
  {id:'ra_ion',n:'电离与水解',t:[1,2,3],kw:['弱电解质电离','电离常数','电离度','水的电离','水的电离与pH','pH 计算','盐类水解','离子共存','离子浓度大小比较']},
  {id:'ra_tit',n:'沉淀溶解与滴定',t:[2,3],kw:['溶度积','溶度积与同离子效应','酸碱中和滴定','中和滴定的误差分析','电荷守恒与滴定']}],
 org:[{id:'or_hc',n:'烃与卤代烃',t:[1,2,3],kw:['甲烷的性质','乙烯的性质','苯的结构','卤代烃','卤代烃的检验','有机物燃烧的耗氧量']},
  {id:'or_oxy',n:'烃的衍生物',t:[1,2,3],kw:['醇的催化氧化','醛的性质','乙酸与酯化反应','酯化反应机理','酯的水解','官能团','官能团检验','有机反应类型']},
  {id:'or_iso',n:'同分异构与合成',t:[1,2,3],kw:['同分异构体','同分异构体数目','同分异构体枚举','有机合成路线','有机推断','逆合成分析']},
  {id:'or_cell',n:'电化学',t:[3],kw:['原电池原理','金属腐蚀与防护']},
  {id:'or_life',n:'生命中的有机物',t:[1,2,3],kw:['营养物质','葡萄糖的性质','蛋白质的盐析与变性','高分子','高分子化合物']}],
 cell:[{id:'ce_struct',n:'细胞结构与运输',t:[1,2,3],kw:['细胞器','细胞器的功能','细胞器分工合作','生物膜系统','细胞核的结构','细胞膜的成分','原核与真核细胞','物质跨膜运输','物质运输方式判断','质壁分离','结构与功能观']},
  {id:'ce_enz',n:'酶与 ATP',t:[1,2,3],kw:['酶的本质','酶的特性','影响酶活性的因素','ATP 的结构','ATP 与 ADP 的转化']},
  {id:'ce_resp',n:'细胞呼吸与光合',t:[2,3],kw:['有氧呼吸','无氧呼吸','细胞呼吸方式判断','光合作用','光合作用的过程','光合与呼吸的关系','光合与呼吸的综合','色素的提取与分离']},
  {id:'ce_div',n:'细胞分裂与实验',t:[1,2,3],kw:['有丝分裂实验','细胞的全能性','实验变量','实验设计的变量分析','同位素示踪','还原糖的鉴定']}],
 gene:[{id:'ge_mol',n:'遗传的分子基础',t:[1,2,3],kw:['DNA 的结构','DNA的结构','DNA 的半保留复制','DNA复制的计算','转录','翻译','中心法则','基因表达中的数量关系']},
  {id:'ge_div2',n:'减数分裂与变异',t:[1,2,3],kw:['减数分裂','染色体变异','基因突变','基因与染色体']},
  {id:'ge_law',n:'遗传定律',t:[1,2,3],kw:['基因的分离定律','分离定律的应用','分离定律的计算','分离定律','自由交配与自交','自由交配','测交','基因的自由组合定律','自由组合定律','自由组合定律的计算','自由组合的特殊分离比','先拆后合','假说演绎法']},
  {id:'ge_sex',n:'伴性遗传与系谱',t:[1,2,3],kw:['伴性遗传','性别决定','遗传系谱图分析','系谱判断两步法']},
  {id:'ge_evo',n:'进化与育种',t:[3],kw:['现代生物进化理论','基因频率的计算','育种方法']}],
 eco:[{id:'ec_home',n:'内环境与稳态',t:[1,2,3],kw:['内环境的组成','内环境稳态','体温调节','血糖调节','激素分泌的调节','激素的分级调节','体液调节的特点','负反馈调节']},
  {id:'ec_ni',n:'神经与免疫',t:[1,2,3],kw:['神经调节','免疫系统的防卫功能','特异性免疫','体液免疫','细胞免疫']},
  {id:'ec_pop',n:'种群与群落',t:[1,2,3],kw:['种群的特征','种群密度的调查','种群数量的调查实验','种群数量变化','群落演替','群落的垂直结构']},
  {id:'ec_sys',n:'生态系统',t:[1,2,3],kw:['生态系统的结构','生态系统的营养结构','生态系统的能量流动','能量传递效率','能量流动与物质循环','能量流动的计算','生态系统的信息传递','生态系统的稳定性','生物多样性的保护','生态农业']},
  {id:'ec_exp',n:'实验设计',t:[3],kw:['实验设计原则']}],
 /* ---- 173.5 补的三域：专题按"大题内部的出题主线"切 ---- */
 therm:[{id:'th_mol',n:'分子动理论与内能',t:[1,2,3],
   kw:['分子动理论','布朗运动','温度与分子动能','内能','分子间作用力','晶体与非晶体','晶体的微观结构','表面张力','浸润与不浸润','饱和汽','饱和汽压','热传递','分子直径估算','阿伏加德罗常数估算']},
  {id:'th_gas',n:'气体实验定律',t:[1,2,3],
   kw:['玻意耳定律','查理定律','盖-吕萨克定律','理想气体状态方程','气体压强的微观解释','状态方程计算','p–V 图像分析','多过程状态变化']},
  {id:'th_law',n:'热力学定律',t:[1,2,3],
   kw:['热力学第一定律','热一律的应用','做功与内能','绝热过程','热机效率','能量守恒','循环过程','热力学第二定律']}],
 optic:[{id:'op_geo',n:'几何光学',t:[1,2,3],
   kw:['光的直线传播','光的反射定律','折射定律','折射率','折射率与光速','光在介质中的波长','全反射','全反射临界角','光的色散','色光的折射比较','平行玻璃砖']},
  {id:'op_wave',n:'光的波动性',t:[1,2,3],
   kw:['双缝干涉','薄膜干涉','干涉条纹与波长','光的衍射现象','光的偏振','电磁波谱']},
  {id:'op_mod',n:'光电效应与原子',t:[1,2,3],
   kw:['光电效应现象','光子能量','光电效应方程','光电效应图像','逸出功计算','光强与光电流','波粒二象性','光子动量','能级跃迁','跃迁光子种类','氢原子光谱','核反应方程','质能方程']}],
 lab:[{id:'lb_op',n:'仪器与基本操作',t:[1,2,3],
   kw:['常用仪器的选择','固体药品的取用','加热操作','过滤操作','蒸发与结晶','气密性检查','浓硫酸的稀释','试剂的保存','溶液的配制','实验室安全操作','实验现象的描述','量筒读数','量筒的使用']},
  {id:'lb_gas',n:'气体制备与除杂',t:[1,2,3],
   kw:['气体制备装置','发生装置的选择','气体的收集','除杂顺序','尾气处理','干燥剂的选择','防倒吸','排水法收集与拆卸顺序','装置异常归因']},
  {id:'lb_sep',n:'检验与分离提纯',t:[1,2,3],
   kw:['SO₄²⁻的检验','沉淀的洗涤','沉淀洗涤的检验','物质的分离与提纯','晶体的洗涤与干燥','蒸馏操作','胶体的制备']},
  {id:'lb_quan',n:'定量实验与滴定',t:[1,2,3],
   kw:['滴定管的准备','滴定误差分析','滴定计算','指示剂的选择','双指示剂滴定','差量法测定组成','定量实验的设计','反应热测定误差','实验方案评价']}],
/* ---------- 物理实验（4.0.0）----------
   高考物理实验题那一整套：纸带、仪器读数、电学实验、验证类力学实验。
   关键词一律写全称（如"验证牛顿第二定律"而不是"牛顿第二定律"），
   因为 topicBest 取「命中关键词最长者」，全称才能稳压隔壁那条宽泛的。 */
 plab:[{id:'pl_tape',n:'纸带与打点计时器',t:[2],kw:['打点计时器纸带']},
  {id:'pl_read',n:'仪器读数',t:[2],kw:['游标卡尺读数','螺旋测微器读数']},
  {id:'pl_elec',n:'电学实验',t:[2,3],kw:['伏安法测电阻','测电源电动势与内阻','测金属丝电阻率']},
  {id:'pl_mech',n:'力学实验（验证类）',t:[2,3],
   kw:['单摆测重力加速度','验证牛顿第二定律','验证机械能守恒']}],
};
const DRILL_TOPIC_OF={};
Object.keys(DRILL_TOPICS).forEach(rid=>{
  (DRILL_TOPICS[rid]||[]).forEach(t=>{DRILL_TOPIC_OF[t.id]=Object.assign({rid:rid},t);});
});
function topicInfo(tid){return tid?DRILL_TOPIC_OF[tid]:null;}
/* 这道题属于哪个专题？命中关键词最长者胜 */
function topicBest(rid,topic){
  const list=DRILL_TOPICS[rid];
  if(!list||!topic)return null;
  let best=null,bl=0;
  list.forEach(t=>{
    (t.kw||[]).forEach(k=>{
      if(String(topic).indexOf(k)>=0&&k.length>bl){bl=k.length;best=t.id;}
    });
  });
  return best;
}
/* 知识点 → 专题（跨该科所有域找一遍） */
function topicOfSid(sid,topic){
  const rids=DRILL_RIDS[sid]||[];
  for(let i=0;i<rids.length;i++){
    const b=topicBest(rids[i],topic);
    if(b)return b;
  }
  return null;
}
/* 这个专题的历史命中率：把专题下所有知识点的流水账加起来 */
function drillTopicStat(sid,tid){
  const d=drillStat(sid);
  if(!d||!d.t)return null;
  let r=0,w=0;
  Object.keys(d.t).forEach(k=>{
    if(topicOfSid(sid,k)===tid){r+=d.t[k].r||0;w+=d.t[k].w||0;}
  });
  const n=r+w;
  return n?{n:n,r:r,w:w,p:r/n}:null;
}
/* 该专题在哪些难度档有题；返回空表示数据缺失（当作三档都有） */
function topicTiers(tid){
  const t=topicInfo(tid);
  return (t&&t.t&&t.t.length)?t.t:[1,2,3];
}
/* 想把难度定在 want 档，但专题只支持 ts 这些档 —— 挑最接近的 */
function topicFitTier(tid,want){
  const ts=topicTiers(tid);
  if(ts.indexOf(want)>=0)return want;
  let up=null,dn=null;
  ts.forEach(t=>{if(t>want&&(up==null||t<up))up=t;if(t<want&&(dn==null||t>dn))dn=t;});
  return up!=null?up:(dn!=null?dn:ts[0]);
}
function subjOfRid(rid){
  if(!rid)return '';
  for(let i=0;i<DRILL_SUBJ.length;i++)
    if(DRILL_RIDS[DRILL_SUBJ[i].id].indexOf(rid)>=0)return DRILL_SUBJ[i].id;
  return '';
}
/* ---------- 练枪流水账 ----------
   drill[科目] = {n,r,w,ar,aw,t:{知识点:{r,w}}}
   和 stat / tstat 分开存：推图数据是"考"，练枪数据是"练"，两边别混着看 */
function drillStat(sid){return (state.drill&&state.drill[sid])||null;}
function drillRec(sid,topic,ok,appr){
  if(!state.drill||typeof state.drill!=='object')state.drill={};
  const d=state.drill[sid]||(state.drill[sid]={n:0,r:0,w:0,ar:0,aw:0,t:{}});
  d.n++;if(ok)d.r++;else d.w++;
  if(appr===true)d.ar++;else if(appr===false)d.aw++;
  if(topic){const t=d.t[topic]||(d.t[topic]={r:0,w:0});if(ok)t.r++;else t.w++;}
}
/* 薄弱知识点：练够 min 题才进榜，一道题就下结论太武断 */
function drillWeak(sid,min,lim){
  const d=drillStat(sid);if(!d||!d.t)return [];
  return Object.keys(d.t).map(k=>{
    const a=d.t[k],n=(a.r||0)+(a.w||0);
    return {k:k,n:n,w:a.w||0,p:n?rateOf({r:a.r||0,w:a.w||0}):0};
  }).filter(x=>x.n>=(min||2)).sort((a,b)=>a.p-b.p||b.n-a.n).slice(0,lim||5);
}
function drillTotal(){
  let n=0,r=0;
  DRILL_SUBJ.forEach(s=>{const d=drillStat(s.id);if(d){n+=d.n||0;r+=d.r||0;}});
  return {n:n,r:r,p:n?r/n:0};
}
/* 抽题：普通模式随机；专攻薄弱时在候选里优先挑命中薄弱知识点的题。
   recent 记最近出过的题干，避免连着撞同一道 */
function drillDraw(sid,tier,weakSet,recent,tid){
  /* 第 4 档「攻坚」走另一套题库：题干更长、每题带图、提示给足 3~4 步。
     抽不到（该科还没攻坚题）才退回高考档，免得点了档位刷不出东西。 */
  if(tier>=4){
    const h=hardDraw(sid,(tid&&tid!=='all')?tid:null,recent);
    if(h&&h.q)return h;
    const fb=DRILL_RIDS[sid]||['func'];
    return {q:genQuestion(fb[0],3),rid:fb[0],hit:true,fell:1};
  }
  /* 2.1.0 起：基础 / 中档 / 高考三档一律优先刷「多步大题」——
     长题干、多问、配动图、提示给足三到四步。
     这一科这一档还没配大题时才退回原来的题库，保证刷得出题。 */
  if(typeof bigDraw==='function'){
    const b=bigDraw(sid,tier,null,(tid&&tid!=='all')?tid:null,recent);
    if(b&&b.q&&b.q.text&&b.q.opts&&b.q.opts.length)return b;
  }
  const rids=DRILL_RIDS[sid]||['func'];
  /* 定了专题就只去它所在的域抽题，别在别的域里白试 */
  let pool=rids;
  if(tid&&tid!=='all'){
    const t=topicInfo(tid);
    if(t&&rids.indexOf(t.rid)>=0)pool=[t.rid];
  }
  const want=(tid&&tid!=='all')?tid:null;
  let fall=null,fallHit=null;
  /* 专题的题只占该域一小块（有的只占 5%），次数给足才不至于老是抽不中 */
  for(let k=0;k<(want?80:14);k++){
    const rid=pick(pool);
    let q=null;
    try{q=genQuestion(rid,tier);}catch(e){q=null;}
    if(!q||!q.text||!q.opts||!q.opts.length)continue;
    if(recent&&recent.has(q.text))continue;
    if(want){
      if(topicBest(rid,q.topic)!==want){
        if(!fall)fall={q:q,rid:rid,hit:false};
        continue;
      }
      if(!weakSet||!weakSet.size)return {q:q,rid:rid,hit:true};
      if(q.topic&&weakSet.has(q.topic))return {q:q,rid:rid,hit:true};
      if(!fallHit)fallHit={q:q,rid:rid,hit:true};
      continue;
    }
    if(!weakSet||!weakSet.size)return {q:q,rid:rid,hit:true};
    if(q.topic&&weakSet.has(q.topic))return {q:q,rid:rid,hit:true};
    if(!fall)fall={q:q,rid:rid,hit:true};
  }
  if(fallHit)return fallHit;      /* 专题对了但没撞上薄弱点：也要 */
  if(fall)return fall;            /* 实在抽不到该专题的题：退而求其次 */
  return {q:genQuestion(pool[0],tier),rid:pool[0],hit:!want};
}

/* ---------- 练枪场入口：选科目 ---------- */
function showDrill(){
  /* 练枪是"随时开一局训练"的功能，不该被"先回闯关"挡住。
     旧版在史诗 / 烽火里点它只弹一块指路牌，玩家还得自己切两下 ——
     顶栏那颗 🎯 明明亮着，按下去却告诉你"回去再说"，很别扭。

     这里改成**直接把玩家送进练枪场**。为什么不就地开面板？
     因为练枪要写两本账（练题流水 drill[] / 专题 drillTopic[] / 错题本），
     而 state 是跟着世界走的 —— 就地打开会把练题数据写进史诗 / 烽火的
     进度里，两边的统计全被污染。所以必须真的切世界。
     switchTo 会先把烽火这一局落盘（blazeSaveRun），回来能接着打。 */
  if(CUR!==ADV&&CUR!==DRILL){
    switchTo(DRILL);
    /* switchTo 遇到"有题正在作答"会拦下并提示，这时不能继续开大厅 ——
       否则就是在史诗/烽火的 state 上打开练枪了 */
    if(CUR!==DRILL)return;
    toast('🎯 已切到练枪场 · ☰ 菜单可切回原来的世界');
  }
  const tt=drillTotal();
  openPanel(`
    <h2>🎯 练枪场</h2>
    <div class="sub">四科压轴专训 · 思路详解 · 提示与对错零损失 · 后台自动记薄弱点</div>
    <div class="center" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
      border-radius:14px;padding:11px;margin-bottom:12px;line-height:var(--lh-base)">
      累计练 <b>${tt.n}</b> 题 · 命中 <b style="color:#ffd76a">${pctOf(tt.p)}</b><br>
      错题本 ${state.wrongBook.length} / ${WRONG_CAP} 题
    </div>
    <div class="menu-list">
      ${DRILL_SUBJ.map(s=>{
        const d=drillStat(s.id),w=drillWeak(s.id,2,99);
        const tid=(state.drillTopic&&state.drillTopic[s.id])||'all';
        const ti=topicInfo(tid);
        const last=ti?` · 上次「${esc(ti.n)}」`:'';
        const hn=hardCountOf(s.id);
        return `<button class="menu-li" id="dr_${s.id}"><span class="e">${s.emoji}</span>
          <span class="tx">${s.name}<div class="d">${d
            ? `已练 ${d.n} 题 · 命中 ${pctOf(rateOf({r:d.r||0,w:d.w||0}))} · 薄弱 ${w.length} 个知识点${last}`
            : '还没练过 · 可挑专题，无限题随时收工'}${hn?' · 🔥 攻坚 '+hn+' 题':''}</div></span></button>`;}).join('')}
    </div>
    <div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-top:10px;line-height:var(--lh-base)">
      每题两步：先选<b style="color:#9fe4ff">思路</b>（选完给「为什么 + 第一步落点」的详解），再选<b>答案</b>。<br>
      提示免费、答错不扣结晶也不降档 —— 只管练，错题自动进错题本。<br>
      <b style="color:#ffd76a">选科之后还能挑专题</b>（导数应用 / 解三角形 / 圆锥曲线 …），
      专攻一块比满图乱刷见效快。<br>
      <b style="color:#ff8a5c">第四档「🔥 攻坚」</b>：长题干 + 配图 + 三到四步提示 + 完整讲解，
      专治「题太简单」—— 四科共 <b>${HARD.length}</b> 道。
    </div>
    <div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;margin:12px 0 2px">
      🔥 想直接刷大题？选一科，一步进攻坚</div>
    <div class="menu-list">
      ${DRILL_SUBJ.map(s=>{const hn=hardCountOf(s.id);
        return `<button class="menu-li" id="hd_${s.id}" style="box-shadow:var(--gb-edge-hi),var(--gb-edge-lo),0 0 0 .5px rgba(255,138,92,.50),var(--gb-drop)">
          <span class="e">🔥</span>
          <span class="tx">${s.name} · 攻坚大题<div class="d">${hn?hn+' 道长题干计算题 · 每题配动图 · 三到四步提示 · 完整讲解':'（这一科还没配攻坚题）'}</div></span></button>`;}).join('')}
    </div>
    <div class="row"><button class="btn" id="drWb">📕 错题中心${wbDueList().length?'（'+wbDueList().length+'）':''}</button><button class="btn primary" id="ok">关闭</button></div>
  `);
  $('ok').onclick=closePanel;
  $('drWb').onclick=showWrongBook;
  DRILL_SUBJ.forEach(s=>{const b=$('dr_'+s.id);if(b)b.onclick=()=>drillPick(s.id);});
  /* 一步进攻坚：直接以第 4 档开场，省掉先选档那一步 */
  DRILL_SUBJ.forEach(s=>{const b=$('hd_'+s.id);if(b)b.onclick=()=>{
    if(!hardCountOf(s.id)){toast('这一科还没有攻坚题');return;}
    closePanel();drillSession(s.id,{tier:4,focus:false,tid:'all'});};});
}

/* =========================================================
   📚 自习室（173.5）
   —— "打开就知道该学什么"的窗口。
   ---------------------------------------------------------
   练枪场解决的是"我想练某一块"，自习室补另一半：
   **不知道该练哪块的时候，替你排好序**。
   排序依据只有两条，全部来自真实做题记录（state.drill）：
     ① 做过但正确率低的专题 —— 真短板，排最前
     ② 一次都没碰过的专题 —— 盲区，排在其次
   已掌握的不列出来（做过 3 题以上且正确率 ≥ 80%），
   否则列表会越用越长、又变回"一大坨"。
   点进去仍然走 drillSession，所以思路详解、提示免费、
   错题自动归档这一整套机制原样复用 —— 这里只负责指路。
   ========================================================= */
function studyTopicStats(){
  const acc={};
  DRILL_SUBJ.forEach(s=>{
    const d=drillStat(s.id);
    if(!d||!d.t)return;
    Object.keys(d.t).forEach(topic=>{
      const rec=d.t[topic]||{};
      let hit=null;
      (DRILL_RIDS[s.id]||[]).forEach(rid=>{
        if(hit)return;
        const t=topicBest(rid,topic);
        if(t)hit=t;
      });
      if(!hit)return;
      /* topicBest 返回的是专题 **id 字符串**（不是对象），
         一开始按 hit.id 取，统计全落到了 undefined 这个键上，
         结果"动过 0 块"永远出不来 —— 这种"返回类型记岔了"的坑，
         写的时候一定要看一眼被调函数的 return。 */
      const a=acc[hit]||(acc[hit]={n:0,r:0,w:0,sid:s.id});
      const r=rec.r||0,w=rec.w||0;
      a.n+=r+w;a.r+=r;a.w+=w;
    });
  });
  return acc;
}
function studyAllTopics(){
  const st=studyTopicStats(),out=[];
  Object.keys(DRILL_TOPICS).forEach(rid=>{
    const sid=subjOfRid(rid);
    (DRILL_TOPICS[rid]||[]).forEach(t=>{
      const a=st[t.id];
      const n=a?a.n:0,r=a?a.r:0;
      out.push({id:t.id,nm:t.n,rid:rid,sid:sid,t:t,cnt:n,
        rate:n?r/n:null,done:n>=3&&(r/n)>=0.8});
    });
  });
  return out;
}
function showStudyRoom(){
  /* 和练枪场同一条规矩：自习记录写在 state.drill 里，跟着世界走，
     所以要真的切到练枪场这个世界才能落账（理由见 showDrill 的注释） */
  if(CUR!==ADV&&CUR!==DRILL){
    switchTo(DRILL);
    if(CUR!==DRILL)return;
    toast('📚 已切到练枪场 · ☰ 菜单可切回原来的世界');
  }
  const all=studyAllTopics();
  const total=all.length;
  const mastered=all.filter(x=>x.done).length;
  const touched=all.filter(x=>x.cnt>0).length;
  const weak=all.filter(x=>x.cnt>0&&!x.done).sort((a,b)=>(a.rate-b.rate)||(b.cnt-a.cnt));
  const fresh=all.filter(x=>x.cnt===0);
  const rec=weak.slice(0,3).concat(fresh.slice(0,2)).slice(0,5);
  function markOf(x){
    if(x.cnt===0)return {e:'⬜',c:'#7d94ab',t:'还没练过 · 点开就能开始'};
    const p=Math.round(x.rate*100);
    if(x.rate<0.6)return {e:'🔥',c:'#ff8a5c',t:'正确率 '+p+'% · 这是短板'};
    return {e:'🟡',c:'#ffd76a',t:'正确率 '+p+'% · 再练几题就掌握'};
  }
  function card(x,cid){
    const m=markOf(x);
    const s=DRILL_OF[x.sid]||{name:''};
    return `<button class="menu-li" id="${cid}">
      <span class="e">${m.e}</span>
      <span class="tx">${esc(x.nm)}<span style="font-size:var(--fs-xs);color:#9cc0e0"> · ${s.name}</span>
        <div class="d" style="color:${m.c}">${m.t}${x.cnt?' · 做过 '+x.cnt+' 题':''}</div>
      </span></button>`;
  }
  const recHtml=rec.map((x,i)=>card(x,'sr_r'+i)).join('');
  const groups=DRILL_SUBJ.map(s=>{
    const list=all.filter(x=>x.sid===s.id&&!x.done);
    if(!list.length)return '';
    /* 两列网格 + 每科最多 8 块：专题一共六十多个，全铺成竖排长条
       又会变成"一大坨"，滚动条拉半天才到底 */
    const show=list.slice(0,8),more=list.length-show.length;
    return `<div class="sub" style="text-align:left;margin:13px 0 8px">${s.emoji} ${s.name}
      <span style="color:#7d94ab;font-weight:600">　还有 ${list.length} 块没掌握</span></div>
      <div class="bz-grid2">${show.map((x,i)=>card(x,'sr_'+s.id+'_'+i)).join('')}
      ${more?`<div class="center" style="grid-column:1/-1;font-size:var(--fs-xs);color:#7d94ab;padding:2px">
        …还有 ${more} 块没列出，去 🎯 练枪场能挑全部专题</div>`:''}</div>`;
  }).join('');
  openPanel(`
    <h2>📚 自习室</h2>
    <div class="sub">打开就知道该补哪一块 · 提示免费 · 答错不扣分</div>
    <div class="center" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
      border-radius:14px;padding:11px;margin-bottom:12px;line-height:var(--lh-base)">
      已掌握 <b style="color:#84e3a6">${mastered}</b> / ${total} 块 · 动过 <b style="color:#ffd76a">${touched}</b> 块<br>
      <span style="font-size:var(--fs-xs);color:#9cc0e0">算掌握 = 做过 3 题以上且正确率 ≥ 80%</span>
    </div>
    ${rec.length?`<div class="sub" style="text-align:left;margin:2px 0 8px">🔥 最该补的几块</div>
      <div class="menu-list" style="margin-bottom:4px">${recHtml}</div>`:''}
    <div class="sub" style="text-align:left;margin:14px 0 4px">按科目看</div>
    ${groups||'<div class="center" style="color:#84e3a6;padding:12px 0">全部专题都掌握了 🎉</div>'}
    <div class="row"><button class="btn" id="srDrill">🎯 去练枪场</button>
      <button class="btn primary" id="ok">关闭</button></div>
  `);
  function go(x){
    closePanel();
    const last=state.drillTier&&state.drillTier[x.sid];
    const arr=x.t.t||[2];
    const tier=last||arr[arr.length-1]||2;
    drillSession(x.sid,{tier:tier,focus:true,tid:x.id});
  }
  rec.forEach((x,i)=>{const b=$('sr_r'+i);if(b)b.onclick=()=>go(x);});
  DRILL_SUBJ.forEach(s=>{
    all.filter(x=>x.sid===s.id&&!x.done).slice(0,8).forEach((x,i)=>{
      const b=$('sr_'+s.id+'_'+i);if(b)b.onclick=()=>go(x);
    });
  });
  const d=$('srDrill');if(d)d.onclick=()=>{closePanel();showDrill();};
  $('ok').onclick=closePanel;
}

/* ---------- 🧗 母题阶梯：挑一个模型，从母题一格格往上爬 ---------- */
function showLadder(){
  /* 和练枪场 / 自习室同一条规矩：进度写在 state.lad 里、跟着世界走，
     所以要真的切到练枪场这个世界才能落账 */
  if(CUR!==ADV&&CUR!==DRILL){
    switchTo(DRILL);
    if(CUR!==DRILL)return;
    toast('🧗 已切到练枪场 · ☰ 菜单可切回原来的世界');
  }
  const all=ladderList(null);
  const full=all.filter(L=>ladStat(L.id).lv>=2).length;
  function card(L,cid){
    const st=ladStat(L.id);
    const s=DRILL_OF[L.s]||{name:''};
    /* 三格进度：● 过了 · ◉ 正在这一级 · ○ 还没到 */
    const dots=[0,1,2].map(k=>st.lv>k?'●':(st.lv>=k||st.n===0?'○':'○')).join('');
    return `<button class="menu-li" id="${cid}">
      <span class="e">${ladMark(L.id)}</span>
      <span class="tx" style="white-space:normal">${esc(L.n)}<span style="font-size:var(--fs-xs);color:#9cc0e0"> · ${s.name}</span>
        <div class="d" style="color:#9cc0e0;white-space:normal;overflow:visible;text-overflow:clip">核心方法：${esc(L.model)}</div>
        <div class="d" style="color:${st.lv>=2?'#84e3a6':'#7d94ab'};white-space:normal;overflow:visible;text-overflow:clip">
          母题 → 变式 → 出其不意　<b>${dots}</b>${st.n?' · 过 '+Math.max(st.lv+1,0)+'/3':''}</div>
      </span></button>`;
  }
  const groups=DRILL_SUBJ.map(s=>{
    const list=ladderList(s.id);
    if(!list.length)return '';
    return `<div class="sub" style="text-align:left;margin:13px 0 8px">${s.emoji} ${s.name}
      <span style="color:#7d94ab;font-weight:600">　${list.length} 个模型</span></div>
      <div class="bz-grid2">${list.map((L,i)=>card(L,'ld_'+s.id+'_'+i)).join('')}</div>`;
  }).join('');
  openPanel(`
    <h2>🧗 母题阶梯</h2>
    <div class="sub">课本原型 → 换皮 → 出其不意 · 三级<b>按顺序</b>连刷 · 提示免费</div>
    <div class="center" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
      border-radius:14px;padding:11px;margin-bottom:12px;line-height:var(--lh-loose)">
      <b style="font-size:var(--fs-lg)">${full} / ${all.length}</b> 个模型三级全过
      <div style="color:#9cc0e0;font-size:var(--fs-xs);margin-top:4px">
        创新题不会做，多半是跳级了 —— 从母题一格格往上爬，爬到第三级你会发现自己已经能做那种题了</div>
    </div>
    ${groups||'<div class="center" style="color:#7d94ab;padding:20px">阶梯题库还没装进来</div>'}
    <div class="row"><button class="btn" id="ok">关闭</button></div>`);
  DRILL_SUBJ.forEach(s=>{
    ladderList(s.id).forEach((L,i)=>{
      const el=$('ld_'+s.id+'_'+i);
      if(el)el.onclick=()=>{closePanel();audioKick();ladderSession(L.id);};
    });
  });
  $('ok').onclick=closePanel;
}

/* ---------- 选难度 + 看薄弱清单 ---------- */
function drillPick(sid,pickTid){
  const s=DRILL_OF[sid]||DRILL_SUBJ[0];
  if(!state.drillTopic)state.drillTopic={};
  let tier=clamp(state.drillTier[sid]||2,1,4);   /* 4 = 攻坚档 */
  let tid=(pickTid!=null?pickTid:((state.drillTopic&&state.drillTopic[sid])||'all'));
  if(tid&&tid!=='all'&&!topicInfo(tid))tid='all';
  /* 上次存的专题在这一档没题（玩家可能上次练的是高考档），先进场就调好 */
  if(tid!=='all'&&tier<4){
    const fit=topicFitTier(tid,tier);
    if(fit!==tier){tier=fit;state.drillTier[sid]=tier;save();}
  }
  /* 攻坚档：这个专题还没有攻坚大题 —— 说一声再放开到本科全部，
     别让人选了专题却刷出别的专题的题，还以为游戏串了 */
  if(tid!=='all'&&tier>=4&&typeof hardHasTopic==='function'&&!hardHasTopic(sid,tid)){
    const nm=(topicInfo(tid)||{}).n||'';
    setTimeout(()=>toast('「'+nm+'」还没有攻坚大题，已切换到本科全部攻坚题'),60);
    tid='all';state.drillTopic[sid]=tid;save();
  }
  /* 专题 chip：选中高亮；当前档没题的置灰但可点（点了自动切到它有题的档） */
  function chip(id,name,sub){
    const on=(id===tid);
    const off=(tier>=4)?(id!=='all'&&!hardHasTopic(sid,id))
                       :(id!=='all'&&topicTiers(id).indexOf(tier)<0);
    return `<button class="tp${on?' on':''}${off?' off':''}" data-p="${id}" title="${esc(name)}"
      >${esc(name)}${sub?' <b>'+esc(sub)+'</b>':''}</button>`;
  }
  function groupHtml(){
    const nat=NATION_OF[sid];
    const regs=(nat&&nat.regions)||[];
    const onMap={};regs.forEach(r=>{onMap[r.id]=1;});
    const groups=regs.map(r=>{
      const ts=DRILL_TOPICS[r.id]||[];
      if(!ts.length)return '';
      return `<div class="tp-grp"><div class="tp-hd">${r.emoji||''} ${esc(r.name)}</div>
        <div class="tp-chips">${ts.map(t=>{
          const st=drillTopicStat(sid,t.id);
          return chip(t.id,t.n,(st&&st.n>=3)?pctOf(st.p):'');
        }).join('')}</div></div>`;
    }).join('');
    /* 不在图上开区的域（热学 / 光学 / 化学实验 / 物理实验）也要能点进来。
       它们没有石碑和精灵，但练枪场只认 rid，照样能练 —— 早期版本漏了这段，
       结果这些专题的题"做进去了却点不到"，只能在"全部专题"里碰运气。 */
    const extra=(DRILL_RIDS[sid]||[]).filter(id=>!onMap[id]&&(DRILL_TOPICS[id]||[]).length)
      .map(id=>{
        const ts=DRILL_TOPICS[id]||[];
        return `<div class="tp-grp"><div class="tp-hd">${OFFMAP_NAME[id]||id}</div>
          <div class="tp-chips">${ts.map(t=>{
            const st=drillTopicStat(sid,t.id);
            return chip(t.id,t.n,(st&&st.n>=3)?pctOf(st.p):'');
          }).join('')}</div></div>`;
      }).join('');
    return `<div class="tp-all">${chip('all','🎲 全部专题（混着练）','')}</div>${groups}${extra}`;
  }
  function render(){
    const d=drillStat(sid);
    const wl=drillWeak(sid,2,6);
    const wa=(tid&&tid!=='all')
      ?drillWeak(sid,1,99).filter(x=>topicOfSid(sid,x.k)===tid)
      :drillWeak(sid,1,99);
    const ti=topicInfo(tid);
    openPanel(`
      <h2>${s.emoji} ${s.name} · 练枪</h2>
      <div class="sub">${d?`已练 ${d.n} 题 · 命中 ${pctOf(rateOf({r:d.r||0,w:d.w||0}))}`:'无限题 · 想刷多久刷多久'}${ti?' · '+esc(ti.n):''}</div>
      <div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;margin-bottom:6px">选择难度档</div>
      <div class="row" style="margin-top:0">
        ${[1,2,3].map(t=>`<button class="btn ${t===tier?'primary':''}" data-t="${t}">${TIER_NAME[t]}</button>`).join('')}
      </div>
      <div class="row" style="margin-top:8px">
        <button class="btn" data-t="4" style="flex:1;justify-content:center;line-height:1.5;${
          tier>=4?'background:linear-gradient(160deg,#ff8a5c,#e8542a);color:#3a1400;border:none;box-shadow:0 4px 14px rgba(232,84,42,.4)'
                 :'background:linear-gradient(160deg,rgba(255,138,92,.28),rgba(232,84,42,.22));color:#ffb99a;border:1px solid rgba(255,138,92,.6)'
        }">🔥 攻坚大题${hardCountOf(sid)?'（'+hardCountOf(sid)+' 道）':''}<br>
          <span style="font-size:var(--fs-xs);opacity:.85">长题干 · 配动图 · 三到四步提示 · 完整讲解</span></button>
      </div>
      <div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;margin:12px 0 2px">
        挑个专题专攻 <span style="color:#7d94ab;font-size:var(--fs-xs)">（置灰的这一档没题，点它会自动切档）</span>
      </div>
      <div class="tp-wrap">${groupHtml()}</div>
      <div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-top:8px;line-height:var(--lh-base)">
        题目无限刷，随时点「🏁 收工」退出。<br>
        练枪不计结晶（免得刷分），只攒诊断数据 —— 错题照样进错题本。
      </div>
      ${wl.length?`<div class="center" style="text-align:left;margin-top:14px;line-height:var(--lh-loose)">
        <b style="color:#ff8a8a">🎯 薄弱知识点（练过 ≥ 2 题的才上榜）</b><br>
        ${wl.map((x,i)=>`· <span class="tp" data-w="${i}" style="padding:1px 8px">${esc(x.k)}</span>：<b style="color:${levelOf(x.p).c}">${pctOf(x.p)}</b>
          <span style="color:#8fb4d6;font-size:var(--fs-xs)">（${x.n} 题 · 错 ${x.w} 次）</span>`).join('<br>')}
      </div>`:`<div class="center" style="margin-top:14px;font-size:var(--fs-sm);color:#7d94ab;line-height:var(--lh-base)">
        还没有足够的诊断数据 ——<br>先随便刷十几题，这里会自己长出薄弱清单。</div>`}
      <div class="row" style="margin-top:16px">
        <button class="btn" id="dpBack">← 返回</button>
        <button class="btn" id="dpClr">清空本科记录</button>
      </div>
      <div class="row" style="margin-top:8px">
        <button class="btn primary" id="dpGo">🎯 开始${ti?'「'+esc(ti.n)+'」':'练枪'}</button>
        ${wa.length?`<button class="btn primary" id="dpWeak">专攻薄弱${ti?'（专题内 '+wa.length+'）':'（'+wa.length+'）'}</button>`:''}
      </div>
    `);
    panel.querySelectorAll('[data-t]').forEach(b=>{
      b.onclick=()=>{tier=+b.dataset.t;state.drillTier[sid]=tier;save();render();};
    });
    panel.querySelectorAll('[data-p]').forEach(b=>{
      b.onclick=()=>{
        const id=b.dataset.p;
        tid=(tid===id&&id!=='all')?'all':id;
        state.drillTopic[sid]=tid;
        /* 这个专题在当前档没题 → 自动切到最接近的可用档，并说明一声 */
        if(tid!=='all'&&tier<4){
          const ts=topicTiers(tid);
          if(ts.indexOf(tier)<0){
            const old=tier;
            tier=topicFitTier(tid,tier);
            state.drillTier[sid]=tier;
            const nm=(topicInfo(tid)||{}).n||'';
            toast('「'+nm+'」'+TIER_NAME[old]+'档没有题，已切到'+TIER_NAME[tier]+'档');
          }
        }
        save();render();
      };
    });
    /* 点薄弱知识点 → 跳到它所属专题，接着就能专攻那一块 */
    panel.querySelectorAll('[data-w]').forEach(b=>{
      b.onclick=()=>{
        const x=wl[+b.dataset.w];
        const id=x?topicOfSid(sid,x.k):null;
        if(!id){toast('这个知识点还没归到专题里');return;}
        tid=id;state.drillTopic[sid]=id;
        const ts=topicTiers(id);
        if(ts.indexOf(tier)<0){tier=topicFitTier(id,tier);state.drillTier[sid]=tier;}
        save();render();toast('已定位到专题：'+((topicInfo(id)||{}).n||''));
      };
    });
    $('dpBack').onclick=showDrill;
    $('dpClr').onclick=()=>{
      if(!confirm('清空【'+s.name+'】的练枪记录？\n（只清统计，不动错题本与徽章）'))return;
      delete state.drill[sid];save();render();
    };
    $('dpGo').onclick=()=>{closePanel();drillSession(sid,{tier:tier,focus:false,tid:tid});};
    const dw=$('dpWeak');
    if(dw)dw.onclick=()=>{closePanel();drillSession(sid,{tier:tier,focus:true,tid:tid});};
  }
  render();
}

/* ---------- 练枪会话：无限题 ---------- */
function drillSession(sid,opt){
  opt=opt||{};
  const subj=DRILL_OF[sid]||DRILL_SUBJ[0];
  const tier=clamp(opt.tier||2,1,4);          /* 4 = 攻坚档 */
  const focus=!!opt.focus;
  const tid=opt.tid||'all';
  const topic=topicInfo(tid);
  /* ---------- 母题阶梯：照单发牌，不随机也不去重 ----------
     queue 里是同一个模型的三道题（母题 → 变式 → 出其不意）。
     面板、思路层、分层提示、错题本全部照旧复用，只把「抽题」
     换成「按顺序发」，最后一张打完自动收工。 */
  const queue=(opt.queue||[]).slice();
  const ladId=opt.lad||'';
  let qi=0;
  function drawOne(){
    if(queue.length){
      const qq=queue[qi];qi++;
      return {q:qq,rid:qq.rid||'func',hit:true,ladder:1};
    }
    return drillDraw(sid,tier,focus?weakSet:null,recent,tid);
  }
  state.drillTier[sid]=tier;
  /* 记住这次的专题，下次点进这一科就直接停在原地 */
  if(!state.drillTopic)state.drillTopic={};
  state.drillTopic[sid]=tid;
  save();
  /* 这一档真没这个专题的题（比如手改过存档）：进场就修正，别刷出一堆别的 */
  if(topic&&tier<4&&topicTiers(tid).indexOf(tier)<0){
    const fit=topicFitTier(tid,tier);
    toast('「'+topic.n+'」'+TIER_NAME[tier]+'档没有题，已切到'+TIER_NAME[fit]);
    return drillSession(sid,{tier:fit,focus:focus,tid:tid});
  }
  /* 专攻薄弱：进场时先把这一科命中率最低的知识点抄成集合，抽题时优先命中。
     先取练过 ≥2 题的（样本够，判断更准）；不够 3 个再拿只练过 1 题的补齐，
     免得样本太少时集合被"做过一次就错"的偶然项占满、反而稀释了重点 */
  /* 选了专题就只在该专题里挑薄弱点 —— 否则"专攻薄弱"会跳到别的专题去 */
  let weakSrc=drillWeak(sid,2,8);
  if(tid&&tid!=='all')weakSrc=weakSrc.filter(x=>topicOfSid(sid,x.k)===tid);
  const weakSet=new Set(weakSrc.map(x=>x.k));
  if(weakSet.size<3){
    let more=drillWeak(sid,1,8);
    if(tid&&tid!=='all')more=more.filter(x=>topicOfSid(sid,x.k)===tid);
    more.forEach(x=>{if(weakSet.size<8)weakSet.add(x.k);});
  }
  if(focus&&!weakSet.size)toast('这块还没有薄弱数据，先按随机顺序练');
  /* 避重窗口从 12 提到 20：练枪场一坐就是几十题，
     窗口太小的话"刚做过的题"很快滚出去，隔几题又撞回来。 */
  const recent=new Set(),recentArr=[],RECENT_WIN=20;
  function remember(t){
    if(!t)return;
    /* 同一题干重复进队会白占窗口：先清掉旧的再压入新的 */
    const k=recentArr.indexOf(t);
    if(k>=0)recentArr.splice(k,1);
    recentArr.push(t);recent.add(t);
    while(recentArr.length>RECENT_WIN)recent.delete(recentArr.shift());
  }
  let n=0,right=0,wrong=0,newWrong=0,backWrong=0,streak=0,best=0,apR=0,apN=0;
  /* 这一轮答错的题，原样存一份 —— 结算页那颗「马上重做」直接用它。
     刚错完的这会儿记忆最热，这时候再练一遍最值钱；
     没有它的话玩家得自己：错题本 → 全部错题 → 按最新排 → 一道道挑出来。 */
  const missed=[];
  let cur=drawOne();
  let q=cur.q,curRid=cur.rid,opts=q.opts.slice();
  /* 连续几次都没抽到该专题的题（题池太小或最近去重卡住），提醒一句别干等 */
  let missN=0,missWarned=false;
  remember(q.text);
  let ap=q.appr?{opts:q.appr.opts.slice(),r:q.appr.r,why:q.appr.why,
                 picked:null,ok:false,done:false}:null;
  let hintChain=[],hintLv=0;

  function headHtml(){
    const L=ladId?LADDERS[ladId]:null;
    const LVN=['① 母题','② 变式','③ 出其不意'];
    const prog=L?`<div class="sub" style="color:#9fe4ff">🧗 ${esc(L.n)} · <b>${LVN[q.lv||0]}</b>
      · 核心方法：${esc(L.model)}</div>`:'';
    return `<h2>🎯 练枪 · ${subj.emoji}${subj.name}${L?' · 母题阶梯':''}</h2>
      <div class="sub">${queue.length?('第 '+Math.min(qi,queue.length)+' / '+queue.length+' 题'):('第 '+(n+1)+' 题（无限）')} · 已答 ${n} · 命中 ${n?Math.round(right/n*100):0}%
        · 连对 ${streak}${focus?' · 🎯 专攻薄弱':''}</div>
      ${prog}
      <div style="text-align:center"><span class="qtag">${esc(q.topic||subj.name)} · ${tier>=4?'🔥 攻坚档':TIER_NAME[tier]+'档'}${topic?' · '+esc(topic.n):''}</span>${srcBadge(q.src,q.qt)}</div>
      <div class="qtext">${esc(q.text)}</div>${qFigHtml(q)}`;
  }
  function apprRecapHtml(){
    if(!ap||!ap.done)return '';
    if(ap.picked==null)return `<div class="appr-recap skip">🧭 跳过了思路环节</div>`;
    return `<div class="appr-recap ${ap.ok?'ok':'no'}">🧭 ${ap.ok?'切入点正确':'切入点偏了'} · ${esc(ap.picked)}
      ${ap.ok?'':`<div class="rk">更好的入手：${esc(ap.r)}</div>`}</div>`;
  }

  /* ---------- 第一步：选思路 ---------- */
  function renderApproach(){
    openPanel(`${headHtml()}
      ${tier>=4?'<div class="qmeta" style="color:#ffb99a">🔥 攻坚大题 · 长题干多条件，卡住就点「💡 第 1 步」拿台阶，别硬算</div>':''}
      <div class="qmeta">🧭 第一步 · 先想清楚从哪儿入手（不计对错，选偏了也没关系）</div>
      <div class="opts">${ap.opts.map((o,k)=>`<div class="opt appr" data-i="${k}">${esc(o)}</div>`).join('')}</div>
      <div id="feedback"></div>
      <div class="row">
        <button class="btn" id="skipBtn">跳过</button>
        <button class="btn" id="finBtn">🏁 收工</button>
        <button class="btn primary" id="nextBtn" style="display:none">看选项 →</button>
      </div>`);
    panel.querySelectorAll('.opt').forEach(el=>{
      el.addEventListener('click',()=>pickApproach(+el.dataset.i));
    });
    $('skipBtn').onclick=()=>{ap.picked=null;ap.ok=false;ap.done=true;renderAnswer();};
    $('nextBtn').onclick=renderAnswer;
    $('finBtn').onclick=finish;
  }
  function pickApproach(idx){
    if(ap.done)return;
    ap.done=true;ap.picked=ap.opts[idx];ap.ok=ap.opts[idx]===ap.r;
    recordApproach(q.topic,ap.ok);
    panel.querySelectorAll('.opt').forEach(el=>{
      const k=+el.dataset.i;
      el.classList.add('locked');
      if(ap.opts[k]===ap.r)el.classList.add('right');
      else if(k===idx)el.classList.add('wrong');
      else el.classList.add('dim');
    });
    const fb=$('feedback');
    /* 思路详解：正确入手 + 为什么这么想 + 第一步落点（hints[0]，没有就退到 steps[0]）。
       只给到「怎么下手」为止，具体计算仍留给答题环节 —— 练枪卖的就是这段详解。 */
    const why=ap.why||'';
    const first=(q.hints&&q.hints[0])||(q.steps&&q.steps[0])||'';
    const detail=(why||first)
      ? `<div class="exp" style="color:#9fe4ff"><b>🧭 思路详解</b>`
        +(why?'<br>为什么这么想：'+esc(why):'')
        +(first?'<br>第一步落点：'+esc(first):'')+`</div>`
      : '';
    fb.className=ap.ok?'ok':'no';
    setH(fb, ap.ok
      ? `✅ 对路 · ${esc(ap.picked)}${detail}`
      : `💡 更好的入手：<b>${esc(ap.r)}</b>${detail}
         <div class="exp">思路选偏不算错 —— 练枪场里没有任何惩罚。</div>`);
    $('skipBtn').style.display='none';
    $('nextBtn').style.display='block';
    save();
  }

  /* ---------- 第二步：选答案 ---------- */
  function renderAnswer(){
    if(ap&&!ap.done){ap.done=true;ap.picked=null;ap.ok=false;}
    hintChain=buildHintChain(q,ap);hintLv=0;
    openPanel(`${headHtml()}
      ${apprRecapHtml()}
      ${lingStrip(q)}
      <div class="qmeta">第二步 · 选出正确答案（提示免费，答错不扣任何东西）</div>
      <div class="opts">${opts.map((o,k)=>`<div class="opt" data-i="${k}">${esc(o)}</div>`).join('')}</div>
      <div id="hintBox"></div>
      <div id="feedback"></div>
      <div class="row">
        <button class="btn" id="hintBtn">💡 第 1 步（免费）</button>
        <button class="btn" id="finBtn">🏁 收工</button>
        <button class="btn primary" id="nextBtn" style="display:none">下一题 →</button>
      </div>`);
    panel.querySelectorAll('.opt').forEach(el=>{
      el.addEventListener('click',()=>answer(+el.dataset.i));
    });
    $('hintBtn').onclick=()=>{
      if(hintLv>=hintChain.length){toast('思路已经给到底了');return;}
      hintLv++;
      const box=$('hintBox');
      if(box)setH(box, hintBoxHtml(hintChain,hintLv));
      $('hintBtn').textContent=hintLv>=hintChain.length?'💡 思路已给完':'💡 第 '+(hintLv+1)+' 步（免费）';
      SFX.open();
      panel.scrollTop=panel.scrollHeight;
    };
    $('finBtn').onclick=finish;
    $('nextBtn').onclick=nextQ;
  }
  function answer(idx){
    const correct=opts[idx]===q.ansText;
    panel.querySelectorAll('.opt').forEach(el=>{
      const k=+el.dataset.i;
      el.classList.add('locked');
      if(opts[k]===q.ansText)el.classList.add('right');
      else if(k===idx)el.classList.add('wrong');
      else el.classList.add('dim');
    });
    n++;
    const didAp=!!(ap&&ap.done&&ap.picked!=null);
    if(didAp){apN++;if(ap.ok)apR++;}
    /* 既记进总诊断（学习报告看得到），也记进练枪流水账（练枪面板看得到）。
       不去碰 state.streak —— 那是推图的连对升档计数，练枪不该影响它。 */
    recordAnswer(curRid,q.topic,correct);
    drillRec(sid,q.topic,correct,didAp?ap.ok:null);
    /* 母题阶梯：答对才把这一级记成"过了"，答错的级不前进 */
    if(ladId){
      const st=ladStat(ladId);
      st.n++;if(correct)st.r++;
      if(correct&&q.lv!=null)st.lv=Math.max(st.lv,q.lv);
    }
    const fb=$('feedback');
    if(correct){
      right++;streak++;best=Math.max(best,streak);state.totalRight++;
      SFX.right();
      fb.className='ok';
      setH(fb, `✅ 答对！${(ap&&ap.ok)?'思路也对路 👍':''}`+fbExpHtml(q));
      if(streak>0&&streak%5===0)toast('🔥 连对 '+streak+' 题，手感正好');
    }else{
      wrong++;streak=0;state.totalWrong++;
      SFX.wrong();
      /* 存进错题本的那份快照：字段名按错题本的写法（ans 不是 ansText），
         这样"马上重做"能原样喂给 sessionFixed，不用再转一道手。
         攻坚题记 hardIdx、带图的记 fig —— 重做时才画得出那张图。 */
      const wf=(function(){
        const i=(typeof HARD!=='undefined')?HARD.indexOf(q):-1;
        if(i>=0)return {hardIdx:i};
        const fg=figStr(q.fig);
        return fg?{fig:fg}:{};
      })();
      const item=Object.assign({text:q.text,ans:q.ansText,exp:q.exp,topic:q.topic,
        opts:q.opts.slice(),rid:curRid,subject:sid,src2:'练枪',
        steps:q.steps||null,hints:q.hints||null,appr:q.appr||null},wf);
      /* wbMiss 而不是 wbAdd：题已经在本子里时也要把"又错一次"记下来
         （打回第一天），不然练枪场犯的错在错题分析里一次都不算数 */
      const kind=wbMiss(item);
      if(kind==='new')newWrong++;else if(kind==='back')backWrong++;
      missed.push(item);
      state.wrongBook=state.wrongBook.slice(0,WRONG_CAP);
      fb.className='no';
      /* 顺序有讲究：正确答案 → 这题进错题本怎么处理 → 才轮到完整解析。
         解析一摊开就是十几行，把"这题已收进本子"塞在它后面等于没写。 */
      setH(fb, `❌ 正确答案：<b>${esc(q.ansText)}</b>`
        +`<div class="exp">练枪零损失：不扣结晶、不降档、不算失败 —— 📕 ${wbMissWord(kind)}</div>`
        +fbExpHtml(q,true));
    }
    /* 思路灵：练枪场提示免费，但点开过就不算独立解出 */
    try{lingJudge(q,correct,hintLv>0);}catch(e){}
    save();updateHUD();
    $('nextBtn').style.display='block';
  }
  function nextQ(){
    /* 阶梯发完最后一张就收工 —— 不像无限模式那样循环，免得学生
       以为"还有"，一直点下去 */
    if(queue.length&&qi>=queue.length){finish();return;}
    cur=drawOne();
    q=cur.q;curRid=cur.rid;opts=q.opts.slice();
    if(cur.hit===false){
      missN++;
      if(missN>=3&&!missWarned){missWarned=true;
        toast(tier>=4?'这个专题的攻坚题刷完了，已自动换成本科其他攻坚题'
                     :('这个专题在'+TIER_NAME[tier]+'档题不多，换个档试试'));}
    }else missN=0;
    remember(q.text);
    ap=q.appr?{opts:q.appr.opts.slice(),r:q.appr.r,why:q.appr.why,
               picked:null,ok:false,done:false}:null;
    render();
  }
  function render(){if(ap)renderApproach();else renderAnswer();}

  /* ---------- 收工：本轮小结 + 薄弱点 ---------- */
  function finish(){
    const wl=drillWeak(sid,2,3);
    const apRate=apN?Math.round(apR/apN*100):0;
    const rate=n?Math.round(right/n*100):0;
    const L=ladId?LADDERS[ladId]:null;
    openPanel(`
      <h2>${L?'🧗 这一梯走完':'🏁 收工'}</h2>
      <div class="sub">${L?(esc(L.n)+' · 母题 → 变式 → 出其不意')
        :(subj.emoji+' '+subj.name+' · '+TIER_NAME[tier]+'档'+(topic?' · '+esc(topic.n):'')+(focus?' · 专攻薄弱':''))}</div>
      <div class="center" style="font-size:44px;margin:8px 0">
        ${!n?'🎯':(rate>=80?'🏆':(rate>=50?'💪':'📗'))}</div>
      <div class="center" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
        border-radius:14px;padding:12px;line-height:var(--lh-loose)">
        本轮 <b>${n}</b> 题 · 答对 ${right} · 命中率 <b style="color:#ffd76a">${rate}%</b><br>
        最长连对 ${best} · 新收错题 ${newWrong} 题${backWrong?` · 又错回来 ${backWrong} 题`:''}<br>
        ${apN?`🧭 思路命中 <b style="color:#9fe4ff">${apRate}%</b>（${apN} 次选择）<br>`:''}
        错题本 ${state.wrongBook.length} / ${WRONG_CAP} 题 · 今日待复习 ${wbDueList().length} 题
      </div>
      ${missed.length?`<div class="row">
        <button class="btn primary" id="dfRe" style="width:100%">🔁 趁热重做刚错的 ${missed.length} 题</button>
      </div>`:''}
      ${wl.length?`<div class="center" style="text-align:left;margin-top:12px;line-height:var(--lh-loose)">
        <b style="color:#ff8a8a">🎯 这一科最该补的知识点</b><br>
        ${wl.map(x=>`· ${esc(x.k)}：${x.n} 题 · <b style="color:${levelOf(x.p).c}">${pctOf(x.p)}</b>
          <span style="color:#8fb4d6;font-size:var(--fs-xs)">（错 ${x.w} 次）</span>`).join('<br>')}
      </div>`:''}
      <div class="row">
        <button class="btn" id="dfAgain">再来一轮</button>
        ${drillWeak(sid,1,1).length?`<button class="btn" id="dfWeak">专攻薄弱</button>`:''}
        <button class="btn" id="dfWb">📕 错题本</button>
      </div>
      <div class="row">
        <button class="btn" id="dfRp">📊 学习报告</button>
        <button class="btn" id="dfTp">🎯 换个专题</button>
        <button class="btn primary" id="dfOk">收工</button>
      </div>
    `);
    const dre=$('dfRe');
    /* 趁热重做：只发"这一轮错的这几道"，不搅动错题本里别的题 ——
       练枪场是自由练习，不该把「今日复习」那套队列也带进来。
       重做走的还是错题重练那套面板（sessionFixed），
       所以答对同样升熟炼度、答错同样打回第一天，跟正式复习一个待遇。 */
    if(dre)dre.onclick=()=>{
      sessionFixed(missed.slice(),'🔁 重做刚错的题',(r,t)=>{
        save();updateHUD();
        openPanel(`
          <h2>🔁 重做完成</h2>
          <div class="sub">答对 ${r} / ${t}${t&&r===t?' · 全中 🏆':''}</div>
          <div class="center" style="font-size:44px;margin:8px 0">${t&&r===t?'🏆':(r*2>=t?'💪':'📗')}</div>
          <div class="center" style="color:#9cc0e0;font-size:var(--fs-sm);line-height:var(--lh-loose)">
            熟炼度已按刚才的表现更新<br>
            错题本 ${state.wrongBook.length} / ${WRONG_CAP} 题 · 今日待复习 ${wbDueList().length} 题
          </div>
          <div class="row"><button class="btn" id="mwWb">📕 错题本</button>
            <button class="btn primary" id="ok">好</button></div>`);
        $('ok').onclick=closePanel;
        $('mwWb').onclick=()=>showWrongBook(sid);
      });
    };
    $('dfAgain').onclick=()=>{closePanel();
      if(ladId)ladderSession(ladId);
      else drillSession(sid,{tier:tier,focus:false,tid:tid});};
    const dw=$('dfWeak');
    if(dw)dw.onclick=()=>{closePanel();drillSession(sid,{tier:tier,focus:true,tid:tid});};
    $('dfWb').onclick=()=>showWrongBook(sid);
    const dt=$('dfTp');
    if(dt)dt.onclick=()=>drillPick(sid,tid);
    $('dfRp').onclick=showReport;
    $('dfOk').onclick=()=>{closePanel();toast('🎯 练枪结束 · 数据已记入诊断');};
  }
  render();
}

/* ---------- 传送阵 ----------
   同一个国度里，各域之间隔着长桥，来回一趟几百步。已开通的域可以直接跳过去，
   落点取域内一处可走的位置（findSpawn 只会落在第一域，所以另写一个）。 */
function findSpawnIn(reg){
  if(!reg)return null;
  const [x,y,w,h]=reg.rect;
  for(let dy=50;dy<h-50;dy+=30)
    for(let dx=50;dx<w-50;dx+=30)
      if(walkable(x+dx,y+dy))return {x:x+dx,y:y+dy};
  return {x:x+w/2,y:y+h/2};
}
/* ---------------- 商行 ---------------- */
function showShop(){
  function render(){
    openPanel(`
      <h2>🏪 结晶商行</h2>
      <div class="sub">你有 <b style="color:#ffd76a">${state.crystals}</b> 🪙</div>
      <div class="item"><div class="ic">💡</div>
        <div><div class="nm">启示灯 ×1</div><div class="ds">卡住时给一层思路，可连点三层</div></div>
        <button class="buy" id="b1" ${state.crystals<15?'disabled':''}>15 🪙</button></div>
      <div class="item"><div class="ic">📜</div>
        <div><div class="nm">错题重练 ×3</div><div class="ds">从错题本抽 3 题重做，答对奖励结晶</div></div>
        <button class="buy" id="b2" ${(state.crystals<12||state.wrongBook.length<3)?'disabled':''}>12 🪙</button></div>
      <div class="item"><div class="ic">📗</div>
        <div><div class="nm">专项训练 ×3</div><div class="ds">在当前域随机刷 3 道题，纯练手</div></div>
        <button class="buy" id="b3" ${state.crystals<10?'disabled':''}>10 🪙</button></div>
      <div class="center" id="shopMsg" style="min-height:22px;color:#ffd76a;font-weight:700"></div>
      <div class="row"><button class="btn primary" id="ok">关闭</button></div>
    `);
    $('ok').onclick=closePanel;
    $('b1').onclick=()=>{if(state.crystals<15)return;state.crystals-=15;state.hint++;save();updateHUD();$('shopMsg').textContent='买到一盏启示灯 💡';setTimeout(render,500);};
    $('b2').onclick=()=>{
      if(state.crystals<12||state.wrongBook.length<3)return;
      state.crystals-=12;save();updateHUD();closePanel();
      const list=shuffle(state.wrongBook).slice(0,3);
      sessionFixed(list,'📜 错题重练',(r,t)=>{
        openPanel(`<h2>复习完成</h2><div class="sub">答对 ${r} / ${t}</div>
          <div class="center" style="font-size:44px;margin:8px 0">📜</div>
          <div class="center">手感热起来了，继续上路吧！</div>
          <div class="row"><button class="btn primary" id="ok">好</button></div>`);
        $('ok').onclick=closePanel;
      });
    };
    $('b3').onclick=()=>{
      if(state.crystals<10)return;state.crystals-=10;save();updateHUD();closePanel();
      session({rid:state.region,tier:state.tier[state.region]||1,count:3,title:'📗 专项训练',gain:2,canHint:true,
        onFinish:(r,t)=>{
          openPanel(`<h2>训练完成</h2><div class="sub">答对 ${r} / ${t}</div>
            <div class="center" style="font-size:44px;margin:8px 0">📗</div>
            <div class="row"><button class="btn primary" id="ok">继续</button></div>`);
          $('ok').onclick=closePanel;
        }});
    };
  }
  render();
}
/* 🏪 / ⏳ 这一个顶栏按钮按世界分派：
   闯关模式是结晶商行，史诗模式是时空交易所（花时间星尘）。
   烽火模式下按钮是隐藏的，那边走「🏪 战备采购」。 */
$('btnShop').onclick=()=>{
  audioKick();
  if(CUR===EPIC)showAidShop();
  else if(CUR===BLAZE)showBlazeLobby();
  else showShop();
};

$('btnSound').onclick=()=>{state.sound=!state.sound;try{EPIC_STATE.sound=ADV_STATE.sound=state.sound;}catch(e){}$('btnSound').textContent=state.sound?'🔊':'🔇';save();if(state.sound){audioKick();SFX.toggle(true);}};
/* 🎯 目标：手动召回任务条。任务条平时是闪现的（显示几秒后淡出），
   需要看目标时点这里，或答完题、换域时它也会自动闪一下。 */
$('btnGoal').onclick=()=>{audioKick();flashQuest(true);};

/* ---------------- ☰ 菜单（窄屏的功能入口） ----------------
   顶栏在 360px 宽的屏幕上最多放得下三四个按钮，挤满七个会换行成三层，
   把整个地图顶掉。窄屏下把次要功能收进这里，顶栏恒定一行。 */

$('btnMenu').onclick=()=>{audioKick();showMenu();};
/* 练枪 / 错题本在 ☰ 里也有，这里提一项到顶栏：宽屏下少点两层 */
$('btnDrill').onclick=()=>{audioKick();showDrill();};
$('btnWb').onclick=()=>{audioKick();showWrongBook();};

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
      '数境 · 四国远征 —— 存档码\n（把下面这整段粘回游戏的「导入存档码」即可）\n\n'+code);
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
$('btnMode').onclick=()=>{audioKick();switchMode();};

