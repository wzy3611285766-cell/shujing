# -*- coding: utf-8 -*-
import json,subprocess,time,base64,sys,os,urllib.request
import websocket
CHROME=r"C:/Program Files/Google/Chrome/Application/chrome.exe"
if not os.path.exists(CHROME): CHROME=r"C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"
PORT=9921
OUT=os.path.dirname(os.path.abspath(__file__))
URL="file:///C:/Users/Lenovo/WorkBuddy/2026-10-08-22-42-20/汇报/数境169_横屏试玩报告_2026-10-12.html"
prof=os.path.join(os.environ.get("TEMP","/tmp"),"cdpprof_rep2")
subprocess.Popen([CHROME,"--headless=new","--disable-gpu","--no-first-run","--remote-allow-origins=*",
  "--remote-debugging-port=%d"%PORT,"--user-data-dir="+prof,"--window-size=1100,1400","--hide-scrollbars","about:blank"])
for _ in range(70):
    try: urllib.request.urlopen("http://127.0.0.1:%d/json/version"%PORT,timeout=1);break
    except Exception: time.sleep(0.4)
lst=json.loads(urllib.request.urlopen("http://127.0.0.1:%d/json"%PORT,timeout=3).read().decode())
tgt=[t for t in lst if t.get("type")=="page"][-1]
ws=websocket.create_connection(tgt["webSocketDebuggerUrl"],timeout=60)
mid=[0]
def cmd(m,p=None):
    mid[0]+=1;k=mid[0]
    ws.send(json.dumps({"id":k,"method":m,"params":p or {}}))
    while True:
        r=json.loads(ws.recv())
        if r.get("id")==k:return r.get("result",r)
cmd("Page.enable");cmd("Runtime.enable")
cmd("Emulation.setDeviceMetricsOverride",{"width":1100,"height":1400,"deviceScaleFactor":1,"mobile":False})
cmd("Page.navigate",{"url":URL});time.sleep(4.0)
r=cmd("Runtime.evaluate",{"expression":"JSON.stringify({h:document.body.scrollHeight,imgs:document.images.length,broken:[...document.images].filter(i=>!i.naturalWidth).length,figs:document.querySelectorAll('figure').length})","returnByValue":True})
print("CHECK",r["result"]["value"])
h=int(json.loads(r["result"]["value"])["h"])
y=0;i=0
while y<h:
    cmd("Runtime.evaluate",{"expression":f"window.scrollTo(0,{y})"});time.sleep(0.5)
    sc=cmd("Page.captureScreenshot",{"format":"jpeg","quality":72})
    p=os.path.join(OUT,f"_chk_land_{i:02d}.jpg")
    open(p,"wb").write(base64.b64decode(sc["data"]))
    i+=1;y+=1300
print("SHOTS",i)
ws.close()
