# -*- coding: utf-8 -*-
"""用 CDP 让页面真实运行若干秒后截图（无头模式下的 virtual-time 会冻结时间，不能用）。

用法：
  python tools/cdp_shot.py 3 8 18
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

import websocket

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = "file:///c:/Users/Lenovo/WorkBuddy/2026-10-08-22-42-20/数境-宣传片.html"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9333
PROFILE = os.path.join(BASE, "_edge_cdp")
OUT_DIR = os.path.join(BASE, "_shots")


def main():
    waits = [float(x) for x in sys.argv[1:]] or [3.0]
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(PROFILE, exist_ok=True)

    proc = subprocess.Popen([
        EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--no-first-run", "--disable-extensions",
        "--remote-debugging-port=%d" % PORT,
        "--remote-allow-origins=*",
        "--user-data-dir=" + PROFILE,
        "--window-size=1080,1920",
        "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    ws = None
    try:
        # 等调试端口就绪
        target = None
        for _ in range(40):
            time.sleep(0.25)
            try:
                raw = urllib.request.urlopen("http://127.0.0.1:%d/json" % PORT, timeout=1).read()
                targets = json.loads(raw)
                pages = [t for t in targets if t.get("type") == "page"]
                if pages:
                    target = pages[0]
                    break
            except Exception:
                pass
        if not target:
            print("连不上调试端口")
            return 1

        ws = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=20)
        msg_id = [0]

        def send(method, params=None):
            msg_id[0] += 1
            ws.send(json.dumps({"id": msg_id[0], "method": method, "params": params or {}}))
            while True:
                m = json.loads(ws.recv())
                if m.get("id") == msg_id[0]:
                    return m

        send("Page.enable")
        send("Emulation.setDeviceMetricsOverride",
             {"width": 1080, "height": 1920, "deviceScaleFactor": 1, "mobile": False})

        for w in waits:
            send("Page.navigate", {"url": PAGE})
            time.sleep(w)
            res = send("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
            data = res.get("result", {}).get("data")
            if not data:
                print("截图失败", w, res.get("error"))
                continue
            out = os.path.join(OUT_DIR, "cdp_%04.1fs.png" % w)
            with open(out, "wb") as f:
                f.write(base64.b64decode(data))
            print("OK", out, os.path.getsize(out) // 1024, "KB")

    finally:
        try:
            if ws:
                ws.close()
        except Exception:
            pass
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
    return 0


if __name__ == "__main__":
    sys.exit(main())
