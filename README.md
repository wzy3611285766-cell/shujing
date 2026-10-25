# 数境 · 四国远征

单文件 H5 学习游戏：在四张探索地图上走动、答题、收集，内置错题本与间隔重复复习。
面向中小学数理化生，一个 HTML 文件就是完整应用，离线双击可用。

**在线玩**：<https://shujing.app.workbuddy.host>

## 四个世界

- ⚔️ **闯关** — 数理群岛 / 力理亚 / 嬗变利亚 / 生衍利亚 四国地图，石碑 / 精灵 / 守护者，三档难度升降
- 📜 **史诗** — 科学编年史：从伊尚戈骨到双螺旋，27 篇卷宗 + 时空考题
- 🔥 **烽火** — 搜打撤节奏的答题战场：物资箱 / 保险箱 / 撤离点
- 🎯 **练枪** — 四科无限题 + 思路详解 + 母题阶梯，答错零损失

四个模式进度各自独立，错题本全局共享（艾宾浩斯式复习日程），支持账号云同步与存档码跨设备迁移。

## 构建与工具链

```powershell
python tools/build.py                    # 按 manifest 顺序把 src/ 拼成单文件 index.html
python tools/check.py                    # 回归：构建 + 静态分析 + 基线比对 + 无头浏览器冒烟
python tools/release.py patch --note "…'  # 升版本 + 归档 + 自动追加 CHANGELOG
python tools/deadcode.py                 # 静态体检：同名覆盖 / 未引用函数 / 孤儿 CSS
```

- 源码在 `src/`（72 个 JS 模块 + 5 个 CSS），拼接顺序由 `tools/manifest.py` 决定；
  所有模块 CRLF 结尾（`.gitattributes * -text` 关闭换行转换，拼回必须逐字节一致）
- 发布产物 `shujing-app/index.html` + `version.json`；版本归档在 `releases/`
- 兼容基线 ES2017 / Chrome 61；真机级校验靠 `tools/smoke.py` 的无头浏览器冒烟（42 项）

## 目录

```
src/            源码模块（构建输入）
tools/          构建脚本 / 回归检查 / 发版 / 静态分析
shujing-app/    发布产物（上线就传 index.html + version.json 两个文件）
releases/       历史版本归档
宣传物料/       平台上传材料与说明
```

## 许可

未附开源许可证，默认保留所有权利。
