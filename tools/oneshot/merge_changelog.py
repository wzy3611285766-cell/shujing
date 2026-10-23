# -*- coding: utf-8 -*-
"""一次性：拼出 CHANGELOG.md = 说明头 + 本次条目 + 从 index.html 头部搬来的历史。

用法：python tools/oneshot/merge_changelog.py   （跑完可删 CHANGELOG.md.history.part）
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PART = os.path.join(ROOT, "CHANGELOG.md.history.part")
OUT = os.path.join(ROOT, "CHANGELOG.md")

HEAD = """# 更新日志 · 数境 · 四国远征

单文件网页应用（`shujing-app/index.html`）。源码拆在 `src/` 下，构建时拼回一个文件。

## 发版三步

```powershell
python tools/release.py minor      # 或 patch / major：升版本号 + 构建 + 冒烟 + 归档 + 写日志
python tools/check.py              # 改动后的回归：构建 → 与基线比对 → 无头浏览器冒烟
python tools/build.py              # 只重新构建（改了 src/ 之后）
```

- 产物：`shujing-app/index.html` + `shujing-app/version.json`（上线时两个一起传）
- 归档：`releases/数境169_v<版本>_<日期>.html`，出问题直接拿旧文件覆盖回去
- 公告：内容有更新时，记得把 `src/js/55_boot_news.js` 里的 `NEWS_VER` 改成新值，
  否则新公告弹不出来（这条坑历史上踩过一次）

## 4.0.0 · 2026-10-13 · 工程化改造

- ① 🧩 单文件 1.84MB / 27254 行 → 拆成 73 个模块（`src/`），构建仍产出**一个** HTML。
  拆分逐字节无损：拼回来的产物与改造前的文件 sha256 完全一致。
- ② ✅ 一条命令回归：`python tools/check.py` = 构建 + 与基线骨架比对 + 无头 Chrome 冒烟
  （冒烟会真跑一遍：572 个题目生成器、题库自检、存档往返、四个世界互切、控制台报错）。
- ③ 📜 头部 262 行版本注释搬到本文件，产物头部只留一句指针 + 构建戳。
- ④ 🔄 更新推送：产物带版本号，发布目录附 `version.json`；玩家网页版启动后自动对一次版本，
  发现自己是旧版就提示刷新（本地打开 / 离线 / 没放 version.json 时静默跳过）。

"""


def main():
    hist = open(PART, encoding="utf-8").read().split("\n")
    fixed = []
    for ln in hist:
        if re.match(r"^[②-⑳]", ln):          # ② ③ ④ … 统一成列表项，与 ① 对齐
            ln = "- " + ln
        fixed.append(ln)
    body = "\n".join(fixed).rstrip() + "\n"
    open(OUT, "w", encoding="utf-8", newline="\n").write(HEAD + "## 历史版本（v1.5.14 – v3.3.0，原样搬自 index.html 头部注释）\n\n" + body)
    os.remove(PART)
    print("已写出 CHANGELOG.md（%d 行）" % len((HEAD + body).split("\n")))


if __name__ == "__main__":
    main()
