# -*- coding: utf-8 -*-
import re, os
p = r"C:/Users/Lenovo/WorkBuddy/2026-10-08-22-42-20/汇报/数境169_横屏试玩报告_2026-10-12.html"
s = open(p, encoding="utf-8").read()
vals = []
for m in re.finditer(r'<img\b[^>]*>', s, re.I):
    for a in re.finditer(r'\b(src|srcset)\s*=\s*["\']([^"\']*)["\']', m.group(0), re.I):
        vals.append(a.group(2))
bad = [v for v in vals if re.match(r'^(https?:)?//', v.strip(), re.I)
       and 'workbuddy' not in v and 'codebuddy' not in v]
print("img 标签数:", len(re.findall(r'<img\b', s, re.I)))
print("src/srcset 总数:", len(vals))
nondata = [v[:50] for v in vals if not v.startswith('data:')]
print("非 data 的取值:", nondata if nondata else "无")
print("第三方 http 图片链接:", bad if bad else "无 ✅")
links = set(re.findall(r'https?://[^\s"\'<>)]+', s))
ext = [l for l in links if 'workbuddy' not in l and 'codebuddy' not in l]
print("全文外链:", ext if ext else "无 ✅")
print("base64 内联图片:", len(re.findall(r'data:image/[a-z0-9.+-]+;base64', s, re.I)))
print("文件大小:", os.path.getsize(p) // 1024, "KB")
