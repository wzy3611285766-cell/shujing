# -*- coding: utf-8 -*-
"""一次性抽取：把单文件 index.html 按 manifest 切成 src/ 下的模块。

特性：
  · 逐字节无损 —— 按 \r\n 切行，拼回来必须与原文 sha256 完全一致，否则报错退出。
  · 幂等可重跑 —— 直接覆盖 src/ 下的同名文件。
  · 首次运行会把当前发布文件原样备份到 BASELINE。

用法：python tools/extract.py
"""
import hashlib
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from manifest import BASELINE, PIECES, PUBLISH, TOTAL_LINES  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EOL = b"\r\n"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    src_path = os.path.join(ROOT, PUBLISH)
    raw = open(src_path, "rb").read()

    # 1. 备份基线（只在不存在时创建，避免覆盖真正的原始基线）
    base_path = os.path.join(ROOT, BASELINE)
    if not os.path.exists(base_path):
        os.makedirs(os.path.dirname(base_path), exist_ok=True)
        shutil.copy2(src_path, base_path)
        print("已备份基线 -> %s  (%d 字节)" % (BASELINE, os.path.getsize(base_path)))
    else:
        print("基线已存在，跳过备份: %s" % BASELINE)

    # 2. 切行（只按 \r\n，避免 str.splitlines 把 0x85/2028 之类的字符误当换行）
    rows = raw.split(EOL)
    if rows[-1] != b"":
        raise SystemExit("文件不是以 CRLF 结尾，需人工确认换行规则")
    rows = rows[:-1]
    if len(rows) != TOTAL_LINES:
        raise SystemExit("行数不符：实际 %d，清单声明 %d" % (len(rows), TOTAL_LINES))

    # 3. 校验区间连续无缺口（新增模块行号留空，不参与覆盖校验）
    expect = 1
    for path, start, end, _note in PIECES:
        if start is None:
            continue
        if start != expect:
            raise SystemExit("区间不连续：%s 起始 %d，期望 %d" % (path, start, expect))
        if end < start:
            raise SystemExit("区间非法：%s" % path)
        expect = end + 1
    if expect != TOTAL_LINES + 1:
        raise SystemExit("区间未覆盖到文件末尾：收尾于 %d" % (expect - 1))

    # 4. 写出各片段（二进制，保留 CRLF）
    rebuilt = bytearray()
    for path, start, end, note in PIECES:
        if start is None:
            print("  %-38s %s  %s（新增模块，跳过）" % (path, " " * 16, note))
            continue
        chunk = EOL.join(rows[start - 1:end]) + EOL
        out = os.path.join(ROOT, path)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, "wb").write(chunk)
        rebuilt += chunk
        print("  %-38s %6d–%-6d %8d B  %s" % (path, start, end, len(chunk), note))

    # 5. 无损校验
    if bytes(rebuilt) != raw:
        raise SystemExit("拼回结果与原文不一致，拆分失败")
    print("\n无损校验通过：%d 个片段，拼回 %d 字节，sha256 %s" % (len(PIECES), len(raw), sha(raw)[:16]))


if __name__ == "__main__":
    main()
