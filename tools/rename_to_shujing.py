# -*- coding: utf-8 -*-
"""把游戏名「格物纪元」统一改为「数境」。

范围：当前活跃的源码、构建脚本、上传素材与文档。
不动历史归档：releases/、backup/、汇报/、CHANGELOG.md（它们记录的是当时的版本）。

用法：
  python tools/rename_to_shujing.py           预览
  python tools/rename_to_shujing.py --apply   执行
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = "格物纪元"
NEW = "数境"
OLD_B = OLD.encode("utf-8")
NEW_B = NEW.encode("utf-8")

SKIP_DIRS = {"releases", "backup", "汇报", ".git", "node_modules",
             "__pycache__", "_edge_profile"}
SKIP_FILES = {"CHANGELOG.md"}

# 需要处理的目标目录（相对项目根）
TARGET_DIRS = ["src", "tools", "抖音上传准备材料", "小红书上传准备材料", "minitool"]
TARGET_FILES = ["version.json", "douyin-upload-preparation-checklist.md",
                "小红书游戏上传指南.html", "minitool/校验摘要.md"]


SELF = os.path.abspath(__file__)


def iter_targets():
    seen = set()

    def keep(p):
        if os.path.abspath(p) == SELF:
            return False
        if "minitool" in p.split(os.sep) and "dist" in p.split(os.sep):
            return False  # 构建产物，重新构建时会覆盖
        return True

    for rel in TARGET_FILES:
        p = os.path.join(ROOT, rel)
        if os.path.exists(p) and keep(p):
            seen.add(os.path.abspath(p))
            yield p
    for d in TARGET_DIRS:
        base = os.path.join(ROOT, d)
        if not os.path.isdir(base):
            continue
        for root, dirs, files in os.walk(base):
            dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
            for fn in files:
                if fn in SKIP_FILES:
                    continue
                if fn.lower().endswith((".png", ".jpg", ".jpeg", ".wav", ".mp3",
                                        ".zip", ".ttf", ".otf", ".ico", ".pyc")):
                    continue
                p = os.path.join(root, fn)
                if not keep(p):
                    continue
                key = os.path.abspath(p)
                if key in seen:
                    continue
                seen.add(key)
                yield p


def fix_title(data):
    """首页 <title> 只留主名，不挂副标题。"""
    return re.sub(rb"<title>[^<]*</title>", b"<title>" + NEW_B + b"</title>", data)


def fix_version_name(data):
    """version.json 的 name 字段只留主名。"""
    try:
        j = json.loads(data.decode("utf-8"))
    except Exception:
        return data
    if "name" in j:
        j["name"] = NEW
        return (json.dumps(j, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    return data


def main():
    apply = "--apply" in sys.argv
    hits = []

    for p in iter_targets():
        try:
            data = open(p, "rb").read()
        except OSError:
            continue
        n = data.count(OLD_B)
        if not n:
            continue
        rel = os.path.relpath(p, ROOT)
        hits.append((rel, n))

        if not apply:
            continue

        new = data.replace(OLD_B, NEW_B)
        base = os.path.basename(p)
        if base == "00_head.html":
            new = fix_title(new)
        if base == "version.json":
            new = fix_version_name(new)
        with open(p, "wb") as f:
            f.write(new)

    print("%s：%d 个文件，%d 处" % ("已改" if apply else "待改",
                                    len(hits), sum(h[1] for h in hits)))
    for rel, n in sorted(hits):
        print("  %-58s %d" % (rel, n))

    if apply:
        print("\n提示：还需重新构建、重新截图、重新生成素材、重新打包。")


if __name__ == "__main__":
    main()
