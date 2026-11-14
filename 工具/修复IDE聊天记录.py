#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CodeBuddy CN 聊天记录修复：把「改名前工作区路径」的旧哈希桶合并进「改名后」的新桶。

背景
----
CodeBuddy CN(IDE) 的会话按 workspace 路径哈希分桶：
  %LOCALAPPDATA%\\CodeBuddyExtension\\Data\\<uid>\\CodeBuddyIDE\\<uid>\\history\\<hash>\\
      <convId>\\index.json
      <convId>\\messages\\*.json
工作区文件夹改名后哈希变了，App 去读新空桶 -> 历史“消失”。旧桶内容仍在。

本脚本把 OLD 桶里缺失的会话目录与索引条目补进 NEW 桶（幂等，可反复执行）。
IDE 运行时会把它内存里的索引写回，所以：先完全退出 IDE -> 跑脚本 -> 再打开 IDE。

用法
----
  python 修复IDE聊天记录.py            # 执行合并
  python 修复IDE聊天记录.py --dry-run  # 只看会补什么，不动文件
"""
import json
import os
import shutil
import subprocess
import sys

UID = "03abba18-88c6-4aef-9ffd-4f7f6f12b983"
ROOT = os.path.join(
    os.environ.get("LOCALAPPDATA", r"C:\Users\Lenovo\AppData\Local"),
    "CodeBuddyExtension", "Data", UID, "CodeBuddyIDE", UID, "history",
)

# 旧桶 -> 新桶（来自 IDE 日志 "History Base Path" + "Initializing with workspace"）
PAIRS = [
    # 2026-10-08-22-42-20  -> 数境
    ("b5ed0dea694f75c16ca97ba428c0ce95", "160f342755acc62653a3d516fae86cea", "数境"),
    # 2026-10-05-12-45-40  -> zaywang
    ("ca2ceac8362341a2b98a91183fb00c73", "6d186617dfda74f219731061739e6cbf", "zaywang"),
]

META_FILES = {"index.json", "current.json", "recent.json", ".index_bak.json"}


def copy_missing(src, dst):
    """复制缺失文件。

    坑：不要用 robocopy /XF index.json —— 它按文件名匹配**所有层级**，
    会把每个会话目录里的 index.json（消息清单，没有它点开会话就是空的）也排除掉。
    正确做法：逐个会话目录整目录复制，再单独处理桶根部的元数据文件。
    """
    ok = True
    for entry in os.listdir(src):
        s, d = os.path.join(src, entry), os.path.join(dst, entry)
        if os.path.isdir(s):
            cmd = ["robocopy", s, d, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/R:1", "/W:1"]
            r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            ok = ok and r.returncode < 8
    return ok


def merge_index(old_dir, new_dir):
    op, np = os.path.join(old_dir, "index.json"), os.path.join(new_dir, "index.json")
    if not os.path.exists(op):
        return 0, []
    old = json.load(open(op, encoding="utf-8"))
    new = json.load(open(np, encoding="utf-8")) if os.path.exists(np) else {"conversations": []}
    have = {c["id"] for c in new.get("conversations", [])}
    added = []
    for c in old.get("conversations", []):
        if c["id"] in have:
            continue
        if not os.path.isdir(os.path.join(new_dir, c["id"])):
            continue
        new["conversations"].append(c)
        added.append(c.get("name") or c["id"][:8])
    new["conversations"].sort(key=lambda c: c.get("createdAt", ""))
    if added:
        if os.path.exists(np):
            shutil.copy2(np, np + ".premerge.bak")
        json.dump(new, open(np, "w", encoding="utf-8"), ensure_ascii=False)
    return len(new["conversations"]), added


def merge_recent(old_dir, new_dir):
    op, np = os.path.join(old_dir, "recent.json"), os.path.join(new_dir, "recent.json")
    if not os.path.exists(op):
        return
    try:
        o = json.load(open(op, encoding="utf-8"))
        n = json.load(open(np, encoding="utf-8")) if os.path.exists(np) else {}
        if isinstance(o, dict) and isinstance(n, dict):
            if isinstance(o.get("conversations"), list):
                ids = {c["id"] for c in n.get("conversations", [])}
                n.setdefault("conversations", []).extend(
                    [c for c in o["conversations"] if c["id"] not in ids])
            for k, v in o.items():
                n.setdefault(k, v)
        else:
            n = o
        json.dump(n, open(np, "w", encoding="utf-8"), ensure_ascii=False)
    except Exception as e:  # noqa: BLE001
        print(f"  recent.json 跳过：{e}")


def sync_conv_index(old_dir, new_dir):
    """会话级 index.json（消息清单）：新桶里若被 IDE 写成空的，用旧桶的强制覆盖。"""
    fixed = 0
    for c in os.listdir(old_dir):
        si = os.path.join(old_dir, c, "index.json")
        di = os.path.join(new_dir, c, "index.json")
        if not os.path.isfile(si):
            continue
        try:
            so = len(json.load(open(si, encoding="utf-8")).get("messages", []))
            sn = -1
            if os.path.isfile(di):
                sn = len(json.load(open(di, encoding="utf-8")).get("messages", []))
            if sn != so:
                shutil.copy2(si, di)
                fixed += 1
        except Exception:  # noqa: BLE001
            shutil.copy2(si, di)
            fixed += 1
    return fixed


def main():
    dry = "--dry-run" in sys.argv
    if not os.path.isdir(ROOT):
        print(f"找不到历史目录：{ROOT}")
        return 1
    for old, new, name in PAIRS:
        od, nd = os.path.join(ROOT, old), os.path.join(ROOT, new)
        if not os.path.isdir(od):
            print(f"[跳过] {name}: 旧桶不存在 {old}")
            continue
        print(f"[处理] {name}: {old} -> {new}")
        if dry:
            oi = json.load(open(os.path.join(od, "index.json"), encoding="utf-8"))
            print("   旧桶会话：", [c.get("name") or c["id"][:8] for c in oi["conversations"]])
            continue
        copy_missing(od, nd)
        fixed = sync_conv_index(od, nd)
        total, added = merge_index(od, nd)
        merge_recent(od, nd)
        print(f"   补入 {len(added)} 条：{added}")
        print(f"   会话级索引修正 {fixed} 个（0=正常）")
        print(f"   现在索引共 {total} 条")
    print("\n完成。请重新打开 CodeBuddy CN 查看。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
