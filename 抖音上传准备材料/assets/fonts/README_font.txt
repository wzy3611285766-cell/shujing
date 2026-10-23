本游戏为纯 HTML 单页应用，界面文字直接使用运行环境的系统字体
（font-family 依次回退到 -apple-system / PingFang SC / Microsoft YaHei / sans-serif），
因此不需要随包分发字体文件，也不会产生字体版权与体积问题。

如果后续要做品牌字体（例如标题换成特定字形），请务必使用可商用授权字体：
  · 思源黑体 Source Han Sans（SIL Open Font License 1.1）
  · 阿里巴巴普惠体（免费商用）
  · HarmonyOS Sans（免费商用）

接入方式建议：
  1. 将字体放到 assets/fonts/ 下，单个文件不超过 5MB；
  2. 中文字体请先做字形子集化，只保留实际用到的字，否则体积容易超限；
  3. 在 CSS 中用 @font-face 引入，并保留系统字体作为回退。
  4. 同步更新 config/game_config.json 中的 resources.font 字段。

注意：Windows 自带字体（微软雅黑、黑体等）不可随应用分发。
