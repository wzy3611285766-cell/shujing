# -*- coding: utf-8 -*-
"""汇报页自查：所有 <img> 必须内联成 data:（单文件、离线可看、不外链第三方图床）。

以前写死了「横屏试玩报告」那一个路径，看新报告还得手改 —— 现在默认检查
本目录下所有 数境169_*.html，也可以指定文件：

    python 汇报/_imgcheck.py
    python 汇报/_imgcheck.py 汇报/数境169_平板帧率修复_2026-10-14.html
"""
import re, os, sys, glob

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

BASE = os.path.dirname(os.path.abspath(__file__))
files = [a for a in sys.argv[1:] if not a.startswith("-")]
if not files:
    files = sorted(glob.glob(os.path.join(BASE, "数境169_*.html")))
if not files:
    print("没有找到汇报页（数境169_*.html）")
    sys.exit(0)

fail = 0
for p in files:
    s = open(p, encoding="utf-8").read()
    vals = []
    for m in re.finditer(r'<img\b[^>]*>', s, re.I):
        for a in re.finditer(r'\b(src|srcset)\s*=\s*["\']([^"\']*)["\']', m.group(0), re.I):
            vals.append(a.group(2))
    bad = [v for v in vals if re.match(r'^(https?:)?//', v.strip(), re.I)
           and 'workbuddy' not in v and 'codebuddy' not in v]
    nondata = [v[:50] for v in vals if not v.startswith('data:')]
    links = set(re.findall(r'https?://[^\s"\'<>)]+', s))
    ext = [l for l in links if 'workbuddy' not in l and 'codebuddy' not in l]
    n_img = len(re.findall(r'<img\b', s, re.I))
    n_b64 = len(re.findall(r'data:image/[a-z0-9.+-]+;base64', s, re.I))
    ok = not bad and not nondata and not ext and n_img == n_b64
    fail += 0 if ok else 1
    print("%s %s" % ("OK " if ok else "!! ", os.path.basename(p)))
    print("   img 标签 %d · base64 内联 %d · 非 data 取值 %s · 第三方图片 %s · 全文外链 %s · %d KB"
          % (n_img, n_b64, nondata or "无", bad or "无", ext or "无", os.path.getsize(p) // 1024))
print("汇报页自查：%s" % ("全部通过 ✅" if not fail else "%d 个文件有问题 ❌" % fail))
sys.exit(1 if fail else 0)
