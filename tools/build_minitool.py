# -*- coding: utf-8 -*-
"""按「小红书小工具 ZIP 构建规范」把 src/ 打包成可上传的离线 zip。

和 tools/build.py（网页版单文件）的区别：
  · 网页版：一个 index.html 内联全部 JS/CSS —— 单文件双击即用
  · 小工具：容器 CSP 禁内联脚本，必须外置成 .js；且完全离线，任何
    fetch / 外部 CDN / 剪贴板 / 下载 / 全屏 / 跳转外链 都要拿掉或换掉

产物：
  minitool/dist/index.html            —— 入口（必须在 zip 根）
  minitool/dist/assets/app.js         —— 按 manifest 顺序外置的脚本（单文件 bundle）
  minitool/shujing-minitool-vX.Y.Z.zip —— 待上传包

为什么是「一个 bundle」而不是 66 个 .js（**踩过一次的坑，别改回去**）：
  源码里到处是「前面文件的顶层代码，调用/引用后面文件才声明的函数和常量」
  （figCubic / drawEpicWorld / drawBlazeWorld / BLAZE 等）。拼成一个 <script>
  时函数声明会整体提升，没问题；切成 66 个 src 之后，每个文件各自跑完才轮到
  下一个，前向引用直接 ReferenceError —— 实测开局就炸 5 处，而且这类引用静态
  扫不全（只在特定分支才走到的更难找）。合并成一个外置 .js 既满足 CSP
  「脚本必须外置」，又和网页版单文件构建语义逐字节一致。

改写原则：**只替换被禁能力，不动业务逻辑与 UI**。所有改写都在本文件里集中
维护（PATCH_JS / PATCH_CSS），src/ 本身保持联网版不变 —— 网页版和小工具版
从同一份源码出，改 src 不会漏掉其中一边。

用法：
  python tools/build_minitool.py         构建 dist/ + 打 zip
  python tools/build_minitool.py --dry   只改写不落盘，打印体检结果
"""
import datetime
import hashlib
import json
import os
import re
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import news  # noqa: E402
from manifest import PIECES  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "minitool", "dist")
ASSETS = os.path.join(DIST, "assets")

# --------------------------------------------------------------------------- #
# 1. JS 改写：按文件精确替换。每条 (锚点原文, 替换文)，命中不到就报错，
#    绝不静默跳过 —— 静默跳过等于把违规代码留进包里。
# --------------------------------------------------------------------------- #
PATCH_JS = {
    # ---------------- 云存档 / 账号：容器不联网 ----------------
    "src/js/72_cloud_save.js": [
        (
            "function cloudLoadSdk(cb){\n  if(ACCT.cloud){cb&&cb();return;}",
            "function cloudLoadSdk(cb){\n"
            "  /* 【小工具】容器不联网，CDN 上的云端组件必然加载不出来。\n"
            "     这里直接判定失败并给出可理解的提示，不再尝试挂外部 CDN 脚本。 */\n"
            "  ACCT.sdk='fail';\n"
            "  acctMsg('小工具运行在离线容器里，云存档与账号同步用不了。进度存在本机，换设备请用「存档码」。','bad');\n"
            "  cb&&cb();return;\n"
            "  if(ACCT.cloud){cb&&cb();return;}",
        ),
        (
            "function cloudWhy(){\n  const s=cloudOriginOK();",
            "function cloudWhy(){\n"
            "  /* 【小工具】离线容器一律不支持登录同步 */\n"
            "  return '小工具运行在离线容器里，云存档与账号同步用不了。进度存在本机，换设备请用「存档码」复制粘贴。';\n"
            "  const s=cloudOriginOK();",
        ),
        # 微信跳转已在源码里直接去掉（安全扫描把 location.assign 当页面跳转），
        # 这里不再做替换，否则锚点对不上。
    ],
    # ---------------- AI 详解：fetch 换 window.xhs.AI ----------------
    "src/js/42_ai_glm.js": [
        (
            "function aiReady(){return !!(AI_CFG.key||'').trim();}",
            "function aiReady(){return xhsAIReady();}",
        ),
        (
            "  const ctl=(typeof AbortController!=='undefined')?new AbortController():null;\n"
            "  const timer=ctl?setTimeout(()=>{try{ctl.abort();}catch(e){}},60000):null;\n"
            "  return fetch(ZHIPU_BASE.replace(/\\/+$/,'')+'/chat/completions',{\n"
            "    method:'POST',\n"
            "    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},\n"
            "    body:JSON.stringify(body),\n"
            "    signal:ctl?ctl.signal:undefined\n"
            "  }).then(r=>{\n"
            "    if(!r.ok){\n"
            "      return r.text().then(t=>{\n"
            "        throw new Error('HTTP '+r.status+' '+(t||'').slice(0,120));\n"
            "      });\n"
            "    }\n"
            "    return r.json();\n"
            "  }).then(j=>{",
            "  /* 【小工具】容器内不能 fetch。平台自己注入了对话模型 window.xhs.AI\n"
            "     （在线文档 §3.10，内测需 appId 加白），这里把模型调用整个换过去。\n"
            "     aiChat 返回与 OpenAI /chat/completions 同形的结果，后面的解析链不用改。 */\n"
            "  const timer=null;\n"
            "  return aiChat([{role:'user',content:pm}]).then(j=>{",
        ),
        (
            "  if(onProg)onProg('🤖 智谱正在写详解…');",
            "  if(onProg)onProg('🤖 AI 正在写详解…');",
        ),
        (
            " setH(body, '<div class=\"exp\" style=\"color:#ffb0b0\">还没填智谱 API Key —— 点下面「⚙️ AI 设置」填一个就能用</div>');",
            " setH(body, '<div class=\"exp\" style=\"color:#ffb0b0\">当前环境没有可用的平台模型 —— 请在小红书 App 里打开本工具（题本身的解析照常可用）</div>');",
        ),
        (
            "      ${has?'🤖 再看一遍 AI 详解（已缓存）':'🤖 AI 详解（智谱 GLM）'}</button>",
            "      ${has?'🤖 再看一遍 AI 详解（已缓存）':'🤖 AI 详解'}</button>",
        ),
        (
            "    btn.disabled=true;btn.textContent='🤖 智谱正在写详解…';",
            "    btn.disabled=true;btn.textContent='🤖 AI 正在写详解…';",
        ),
        (
            " setH(body, '<div class=\"exp\" style=\"color:#9cc0e0\">正在让 GLM 讲这道题…</div>');",
            " setH(body, '<div class=\"exp\" style=\"color:#9cc0e0\">正在让 AI 讲这道题…</div>');",
        ),
        # 视觉大模型：容器里既不能 fetch，平台 AI 也只有文本能力 —— 看图识题整段停用
        (
            "function aiToQA(url,onProg,deep){\n"
            "  const base=(OCR_CFG.aiBase||'').trim(),key=(OCR_CFG.aiKey||'').trim();\n"
            "  const model=(OCR_CFG.aiModel||'').trim();\n"
            "  if(!base)return Promise.resolve({ok:false,err:'还没填接口地址'});\n"
            "  if(!model)return Promise.resolve({ok:false,err:'还没填模型名'});\n"
            "  if(onProg)onProg(deep===false?'AI 正在看图…':'AI 正在看图并解析…');\n"
            "  const body={model:model,temperature:0,\n"
            "    messages:[{role:'user',content:[\n"
            "      {type:'text',text:(deep===false?AI_PROMPT:AI_PROMPT_DEEP)},\n"
            "      {type:'image_url',image_url:{url:url}}]}]};\n"
            "  return fetch(base.replace(/\\/+$/,'')+'/chat/completions',{\n"
            "    method:'POST',\n"
            "    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},\n"
            "    body:JSON.stringify(body)\n"
            "  }).then(r=>{\n"
            "    if(!r.ok)return r.text().then(t=>{throw new Error('HTTP '+r.status+' '+String(t||'').slice(0,160));});\n"
            "    return r.json();\n"
            "  }).then(j=>{\n"
            "    const c=j&&j.choices&&j.choices[0];\n"
            "    const txt=(c&&c.message&&c.message.content)||'';\n"
            "    const o=aiParseJson(txt);\n"
            "    if(!o)throw new Error('返回的内容看不懂：'+String(txt).slice(0,160));\n"
            "    if(!o.stem&&!o.answer)throw new Error('图上没找到题目');\n"
            "    return {ok:true,text:o.stem,ans:o.answer,opts:o.options,\n"
            "            topic:o.topic,subject:o.subject,ai:1,\n"
            "            explain:o.explain,steps:aiFixSteps(o.steps),\n"
            "            appr:aiFixAppr(o.approach,o.subject)};\n"
            "  }).catch(e=>({ok:false,err:(e&&e.message)||'请求失败'}));\n"
            "}",
            "function aiToQA(url,onProg,deep){\n"
            "  /* 【小工具】平台 AI 是纯文本模型（没有视觉能力），容器也不能连外部视觉接口 —— 看图识题停用 */\n"
            "  return Promise.resolve({ok:false,err:'小工具环境不支持图片识别，请手动录入题目'});\n"
            "}",
        ),
    ],
    # ---------------- OCR：本地库走 CDN + 外部接口都不可用 ----------------
    "src/js/41_ocr.js": [
        # 整段删掉 CDN 加载器 —— 不留死代码，避免"看起来还在用"
        (
            "function tessLoad(){\n"
            "  if(tessP)return tessP;\n"
            "  tessP=new Promise((res,rej)=>{\n"
            "    if(window.Tesseract)return res(window.Tesseract);\n"
            "    /* 三个 CDN 轮着试：一个被墙就换下一个 */\n"
            "    const urls=[\n"
            "      'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',\n"
            "      'https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js',\n"
            "      'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js'\n"
            "    ];\n"
            "    let i=0;\n"
            "    (function next(){\n"
            "      if(i>=urls.length)return rej(new Error('识别库下载失败'));\n"
            "      const sc=document.createElement('script');\n"
            "      sc.src=urls[i++];\n"
            "      sc.onload=()=>window.Tesseract?res(window.Tesseract):next();\n"
            "      sc.onerror=next;\n"
            "      (document.head||document.body||document.documentElement).appendChild(sc);\n"
            "    })();\n"
            "  });\n"
            "  return tessP;\n"
            "}",
            "function tessLoad(){\n"
            "  /* 【小工具】识别库只能从 CDN 下，容器里必然加载不到 —— 一开始就给出可理解的理由 */\n"
            "  if(tessP)return tessP;\n"
            "  tessP=Promise.reject(new Error('小工具运行在离线容器里，本地文字识别不可用'));\n"
            "  tessP.catch(function(){});   /* 没人消费时别冒 unhandledrejection */\n"
            "  return tessP;\n"
            "}",
        ),
        (
            "function ocrApi(url){\n"
            "  const ep=(OCR_CFG.endpoint||'').trim();\n"
            "  if(!ep)return Promise.resolve({ok:false,err:'还没填接口地址'});\n"
            "  return fetch(ep,{method:'POST',\n"
            "    headers:{'Content-Type':'application/json'},\n"
            "    body:JSON.stringify({image:url,key:OCR_CFG.key||''})})\n"
            "    .then(r=>r.text())\n"
            "    .then(t=>{\n"
            "      let o=null;try{o=JSON.parse(t);}catch(e){}\n"
            "      const txt=o?(o.text||o.result||(o.data&&(o.data.text||o.data.result))||''):t;\n"
            "      return {ok:true,text:String(txt||'').trim()};\n"
            "    })\n"
            "    .catch(e=>({ok:false,err:'接口请求失败：'+((e&&e.message)||'')}));\n"
            "}",
            "function ocrApi(url){\n"
            "  /* 【小工具】容器禁止任何网络请求 */\n"
            "  return Promise.resolve({ok:false,err:'小工具运行在离线容器里，不能访问外部识别接口'});\n"
            "}",
        ),
        # aiLecture 是纯文本调用（不看图），可以整体接到平台模型上
        (
            "function aiLecture(stem,ans,subj,onProg){\n"
            "  const base=(OCR_CFG.aiBase||'').trim(),key=(OCR_CFG.aiKey||'').trim();\n"
            "  const model=(OCR_CFG.aiModel||'').trim();\n"
            "  if(!base||!model)return Promise.resolve(null);\n"
            "  if(!stem&&!ans)return Promise.resolve(null);",
            "function aiLecture(stem,ans,subj,onProg){\n"
            "  /* 【小工具】换平台对话模型 window.xhs.AI（适配器见 42_ai_glm.js 的 aiChat） */\n"
            "  if(!(typeof xhsAIReady==='function'&&xhsAIReady()))return Promise.resolve(null);\n"
            "  if(!stem&&!ans)return Promise.resolve(null);",
        ),
        (
            "  return fetch(base.replace(/\\/+$/,'')+'/chat/completions',{\n"
            "    method:'POST',\n"
            "    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},\n"
            "    body:JSON.stringify(body)\n"
            "  }).then(r=>{\n"
            "    if(!r.ok)throw new Error('HTTP '+r.status);\n"
            "    return r.json();\n"
            "  }).then(j=>{\n"
            "    const c=j&&j.choices&&j.choices[0];\n"
            "    const o=aiParseJson((c&&c.message&&c.message.content)||'');",
            "  return aiChat([{role:'user',content:pm}]).then(j=>{\n"
            "    const c=j&&j.choices&&j.choices[0];\n"
            "    const o=aiParseJson((c&&c.message&&c.message.content)||'');",
        ),
    ],
    # ---------------- 剪贴板 / 文件下载 / 非图片文件选择 ----------------
    "src/js/41_save_panel.js": [
        # 4.1.x 起存档面板从 49_drill.js 拆到这里，剪贴板/下载/文件选择都跟着搬过来了
        # 整段删掉剪贴板实现：容器禁用 clipboard API 与 execCommand，
        # 一律返回 false —— 调用方会提示「长按选中复制」，面板里那段文本本来就是可选中的
        (
            "function copyText(t){\n"
            "  return new Promise(res=>{\n"
            "    if(navigator.clipboard&&window.isSecureContext){\n"
            "      navigator.clipboard.writeText(t).then(()=>res(true),()=>res(false));\n"
            "    }else{\n"
            "      try{\n"
            "        const ta=document.createElement('textarea');\n"
            "        ta.value=t;ta.style.position='fixed';ta.style.top='0';ta.style.opacity='0';\n"
            "        ta.setAttribute('readonly','');\n"
            "        document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,t.length);\n"
            "        const ok=document.execCommand('copy');document.body.removeChild(ta);res(ok);\n"
            "      }catch(e){res(false);}\n"
            "    }\n"
            "  });\n"
            "}",
            "function copyText(t){\n"
            "  /* 【小工具】容器禁用系统剪贴板写入能力 —— 一律走「长按选中复制」 */\n"
            "  return Promise.resolve(false);\n"
            "}",
        ),
        (
            "function downloadFile(name,text){\n"
            "  try{\n"
            "    const blob=new Blob([text],{type:'text/plain;charset=utf-8'});\n"
            "    const a=document.createElement('a');\n"
            "    a.href=URL.createObjectURL(blob);a.download=name;\n"
            "    document.body.appendChild(a);a.click();\n"
            "    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);\n"
            "    return true;\n"
            "  }catch(e){return false;}\n"
            "}",
            "function downloadFile(name,text){\n"
            "  /* 【小工具】容器禁用文件下载（含 blob 导出） */\n"
            "  return false;\n"
            "}",
        ),
        (
            "    inp.type='file';inp.accept='.txt,.json,text/plain';",
            "    /* 【小工具】容器里的 <input type=\"file\"> 只能选图片和视频，accept 无效 */\n"
            "    toast('容器只能选图片或视频 —— 请直接把存档码粘贴进输入框');return;\n"
            "    inp.type='file';inp.accept='.txt,.json,text/plain';",
        ),
        (
            "    toast('已存成文件 ✅');\n  };\n  $('sv5')",
            "    toast(downloadFile('数境存档_'+new Date().toISOString().slice(0,10)+'.txt',\n"
            "      '数境 · 四国远征 —— 存档码\\n（把下面这整段粘回游戏的「导入存档码」即可）\\n\\n'+code)\n"
            "      ?'已存成文件 ✅':'容器里不能下载文件 —— 请复制下面的存档码存好');\n"
            "  };\n  $('sv5')",
        ),
        (
            "    downloadFile('数境存档_'+new Date().toISOString().slice(0,10)+'.txt',saveCodeCache);\n"
            "    $('msg').textContent='已存成文件 ✅';",
            "    $('msg').textContent=downloadFile('数境存档_'+new Date().toISOString().slice(0,10)+'.txt',saveCodeCache)\n"
            "      ?'已存成文件 ✅':'容器里不能下载文件 —— 请长按全选上面的文本复制走';",
        ),
    ],
    "src/js/45_wrongbook_io.js": [
        (
            "      inp.type='file';inp.accept='.txt,.csv,.json,.md,text/plain,application/json';",
            "      /* 【小工具】容器只能选图片和视频 —— 文本文件导入走不通 */\n"
            "      toast('容器只能选图片或视频 —— 请把内容粘贴到上面的输入框');return;\n"
            "      inp.type='file';inp.accept='.txt,.csv,.json,.md,text/plain,application/json';",
        ),
        (
            "  $('ex2').onclick=()=>{downloadFile('错题本_'+new Date().toISOString().slice(0,10)+'.txt',head+txt);toast('已存成文件 ✅');};\n"
            "  $('ex3').onclick=()=>{downloadFile('错题本_'+new Date().toISOString().slice(0,10)+'.json',json);toast('已存成文件 ✅');};",
            "  $('ex2').onclick=()=>{toast(downloadFile('错题本_'+new Date().toISOString().slice(0,10)+'.txt',head+txt)?'已存成文件 ✅':'容器里不能下载文件 —— 请长按选中上面的文本复制走');};\n"
            "  $('ex3').onclick=()=>{toast(downloadFile('错题本_'+new Date().toISOString().slice(0,10)+'.json',json)?'已存成文件 ✅':'容器里不能下载文件 —— 请长按选中上面的文本复制走');};",
        ),
    ],
    # ---------------- 全屏：由容器统一管理 ----------------
    "src/js/55_boot_news.js": [
        (
            "function toggleFullscreen(){\n"
            "  const d=document, el=d.documentElement;\n"
            "  try{\n"
            "    if(fullscreenOn()){\n"
            "      const ex=d.exitFullscreen||d.webkitExitFullscreen||d.msExitFullscreen;\n"
            "      if(ex){const p=ex.call(d);if(p&&p.catch)p.catch(()=>{});}\n"
            "      return true;\n"
            "    }\n"
            "    const fn=el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen;\n"
            "    if(!fn)return false;\n"
            "    const p=fn.call(el);\n"
            "    if(p&&p.catch)p.catch(()=>{});\n"
            "    return true;\n"
            "  }catch(e){return false;}\n"
            "}",
            "function toggleFullscreen(){\n"
            "  /* 【小工具】网页全屏接口被禁用，全屏由容器统一管理 —— 画面本来就是沉浸式铺满的 */\n"
            "  return false;\n"
            "}",
        ),
        (
            "function fsButtonBind(btn,onTxt,offTxt){\n  if(!btn)return;",
            "function fsButtonBind(btn,onTxt,offTxt){\n"
            "  /* 【小工具】容器里这颗按钮永远是死的，直接藏掉，别让玩家点了才发现没用 */\n"
            "  if(btn){btn.style.display='none';return;}\n  if(!btn)return;",
        ),
    ],
    # ---------------- 版本自检：离线包本身就是当前版本 ----------------
    "src/js/73_version.js": [
        (
            "(function(){\n  /* 只在真正的网页部署下检查：本地双击打开 / 沙箱预览里没有\"新旧\"这回事 */",
            "(function(){\n"
            "  /* 【小工具】容器不能 fetch，离线包本身即是当前版本 —— 整个自检跳过 */\n"
            "  return;\n"
            "  /* 只在真正的网页部署下检查：本地双击打开 / 沙箱预览里没有\"新旧\"这回事 */",
        ),
        (
            "    fetch('version.json?t='+Date.now(),{cache:'no-store'})\n"
            "      .then(r=>r.ok?r.json():null)",
            "    Promise.resolve(null)",
        ),
    ],
    # ---------------- 行内事件 onclick= 违反 CSP ----------------
    "src/js/39_hints.js": [
        (
            "return '<div class=\"qfig\">'+String(t).replace('<svg ','<svg onclick=\"figZoom(this)\" ')+'</div>';",
            "return '<div class=\"qfig\">'+String(t).replace('<svg ','<svg data-figzoom=\"1\" ')+'</div>';",
        ),
    ],
    # ---------------- 存档码解压：老内核没有 DecompressionStream ----------------
    "src/js/34_engine_core.js": [
        (
            "    if(m[1]==='HMG'){\n      const bin=atob(m[2]),bytes=new Uint8Array(bin.length);",
            "    if(m[1]==='HMG'){\n"
            "      /* Chrome 61 基线没有 DecompressionStream：老内核拿到压缩档直接说清楚，别报「已损坏」 */\n"
            "      if(typeof DecompressionStream==='undefined')return{ok:false,msg:'这份存档码是压缩格式，当前内核解不了 —— 换一台设备导出时会自动退回纯文本档'};\n"
            "      const bin=atob(m[2]),bytes=new Uint8Array(bin.length);",
        ),
    ],
}

# 追加到 42_ai_glm.js 末尾：平台模型适配层
XHS_AI_SHIM = """
/* =========================================================
   【小工具】平台对话模型适配（在线文档 §3.10 window.xhs.AI）
   ---------------------------------------------------------
   网页版走 fetch 调自建模型；容器里不能联网，改调平台注入的
   window.xhs.AI。返回值归一成 OpenAI /chat/completions 的形状，
   上面那条解析链一行都不用改。
   内测期需要 appId 加白：没加白会拿回 AI_NOT_ALLOWED；
   每天 100 次/用户，用完是 AI_QUOTA_EXCEEDED；命中审核是
   AI_CONTENT_BLOCKED。这三种都翻成人话，不让玩家看到原始错误码。
   ========================================================= */
function xhsAI(){try{return (window.xhs&&window.xhs.AI)||null;}catch(e){return null;}}
function xhsAIReady(){const a=xhsAI();return !!(a&&typeof a.createModel==='function');}
const XHS_AI_ERR={
  AI_NOT_ALLOWED:'这个工具还没开通 AI 详解（需要平台加白）',
  AI_QUOTA_EXCEEDED:'今天的 AI 详解次数用完了，明天再来',
  AI_CONTENT_BLOCKED:'这道题触发了内容审核，AI 详解给不了（题本身的解析照常可用）'
};
function xhsAIErrMsg(e){
  const raw=String((e&&e.errMsg)||(e&&e.code)||(e&&e.message)||'');
  const hit=Object.keys(XHS_AI_ERR).filter(k=>raw.indexOf(k)>=0)[0];
  return hit?XHS_AI_ERR[hit]:('AI 详解没拿到：'+(raw||'未知原因'));
}
function aiChat(messages){
  const a=xhsAI();
  if(!a||typeof a.createModel!=='function')
    return Promise.reject(new Error('当前环境没有可用的平台模型 —— 请在小红书 App 里打开'));
  try{
    /* 只保留 system + 最近 12 轮：文档限制 40 条 / 12000 字符 */
    const msgs=(messages||[]).slice(-13);
    const model=a.createModel('deepseek-v4-flash');
    return Promise.resolve(model.generateText({messages:msgs,temperature:0.2,max_output_tokens:2048}))
      .then(function(r){
        const ch=r&&r.choices;
        /* 文档明确说 choices 可能为空 —— 必须处理 */
        if(!ch||!ch.length)throw new Error('AI 这次没有返回内容（choices 为空）');
        const c=(ch[0]&&ch[0].message&&ch[0].message.content)||'';
        if(!String(c).trim())throw new Error('AI 这次没有返回内容');
        return {choices:[{message:{content:c}}]};
      })
      .catch(function(e){throw new Error(xhsAIErrMsg(e));});
  }catch(e){return Promise.reject(new Error(xhsAIErrMsg(e)));}
}
"""

# 追加到 39_hints.js 末尾：题图放大的事件委托（替掉行内 onclick）
FIGZOOM_SHIM = """
/* 【小工具】容器 CSP 禁行内事件属性：题图放大改用事件委托 */
(function(){
  function bindFigZoom(){
    document.addEventListener('click',function(e){
      var t=e.target;
      if(!t||typeof t.closest!=='function')return;
      var s=t.closest('svg[data-figzoom]');
      if(s)figZoom(s);
    },false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindFigZoom);
  else bindFigZoom();
})();
"""

APPEND_JS = {
    "src/js/42_ai_glm.js": XHS_AI_SHIM,
    "src/js/39_hints.js": FIGZOOM_SHIM,
}

# 残留的外部地址 / 密钥常量：能力已经停用，但这些字符串留在包里既误导人，
# 也违反「不得内嵌外部服务地址与密钥」。全部清空，不留死配置。
# （SVG 的 xmlns="http://www.w3.org/2000/svg" 是命名空间标识符，不是资源加载，保留）
PATCH_RE = {
    "src/js/41_ocr.js": [(r"base:'https?://[^']*'", "base:''")],
    "src/js/42_ai_glm.js": [(r"'https://open\.bigmodel\.cn/api/paas/v4'", "''")],
    "src/js/72_cloud_save.js": [
        (r"endpoint:'https://[^']*'", "endpoint:''"),
        (r"oauthRelayBaseUrl:'https://[^']*'", "oauthRelayBaseUrl:''"),
        (r"sdkUrl:'https://[^']*'", "sdkUrl:''"),
        (r"publishableKey:'[^']*'", "publishableKey:''"),
    ],
}

# --------------------------------------------------------------------------- #
# 2. CSS 改写：Chrome 61 基线层 + 现代增强层
#    clamp()/min()/max() 在 79 以下整条声明失效，会让全站字号塌回默认值。
#    做法：自定义属性走 @supports 双份；规则体里的 clamp 直接在前面补一条
#    降级声明（老内核丢弃后面那条，新内核后者覆盖前者）。
# --------------------------------------------------------------------------- #
PATCH_CSS = {
    "src/css/00_base.css": [
        # 容器右上角叠着原生的「分享 / 更多」按钮，会压住顶栏最右边的 ☰。
        # 只在小工具包里把顶栏右侧内边距放大，让整排 chip 与按钮左移避开；
        # 网页版没有这颗按钮，保持原样。
        (
            "padding:calc(var(--safeT) + var(--pad)) calc(var(--safeR) + 10px) var(--pad) calc(var(--safeL) + 10px);",
            "/* 小工具：容器顶部是一条浮层导航（返回 / 标题 / 头像 / 分享），\n"
            "   顶栏与它同一行就会被夹住、最右的 ☰ 正好压在分享键下面。\n"
            "   与其左右避让，不如整体下移到浮层之下，右侧恢复满宽。 */\n"
            "  padding:calc(var(--safeT) + var(--pad) + 44px) calc(var(--safeR) + 10px) var(--pad) calc(var(--safeL) + 10px);",
        ),
        # 让出右侧空间后顶栏四块挤不下，把 chip 上限从 44vw 收到 30vw，
        # 结晶也不再死撑（原本 flex:none，别处都在缩，只有它把菜单顶出屏幕）。
        (
            "max-width:44vw;min-width:0;overflow:hidden;white-space:nowrap}",
            "max-width:36vw;min-width:0;overflow:hidden;white-space:nowrap}",
        ),
        (
            "#crystalChip{color:#ffd76a;font-variant-numeric:tabular-nums;flex:none}",
            "#crystalChip{color:#ffd76a;font-variant-numeric:tabular-nums;flex:0 1 auto;min-width:0}\n"
            "/* 小工具：顶栏让出 56px 之后放不下三块 chip，难度压成一个圆点，\n"
            "   只露首字（基 / 常 / 攻），颜色本身仍区分档位。 */\n"
            "#diffChip{flex:0 0 auto;width:calc(var(--fs-xs) + var(--pad) * 2);"
            "padding-left:0;padding-right:0;justify-content:center;overflow:hidden}\n"
            "#diffChip .txt{display:block;width:1.05em;overflow:hidden;"
            "white-space:nowrap;text-align:center}",
        ),
        (
            ".btn.ico{padding:calc(var(--pad) * .9);justify-content:center;aspect-ratio:1}",
            "/* aspect-ratio 需 Chrome 88：老内核退回一个近似正方形 */\n"
            ".btn.ico{padding:calc(var(--pad) * .9);justify-content:center;min-height:calc(var(--pad) * 1.8 + 1.2em)}\n"
            ".btn.ico{padding:calc(var(--pad) * .9);justify-content:center;aspect-ratio:1}",
        ),
    ],
}


def _split_top(s):
    """按顶层逗号切分（忽略括号里的逗号）。"""
    out, buf, depth = [], "", 0
    for ch in s:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(buf)
            buf = ""
        else:
            buf += ch
    out.append(buf)
    return [x.strip() for x in out]


def _de_math(v):
    """把值里的 clamp/min/max 换成 Chrome 61 认得的等价写法。

    clamp(A,B,C) -> B（中值，正是设计时要的那一档）
    min(A,B)     -> A     max(A,B) -> A
    这两个只在 :root 里出现，且都是 vw/vh 二选一，真正的方向由
    下面 _root_fallback() 里的 orientation 媒体查询修正。
    """
    out, i = "", 0
    pat = re.compile(r"\b(clamp|min|max)\s*\(")
    while True:
        m = pat.search(v, i)
        if not m:
            out += v[i:]
            return out
        out += v[i:m.start()]
        j = m.end() - 1          # 指向 '('
        depth, k = 0, j
        while k < len(v):
            if v[k] == "(":
                depth += 1
            elif v[k] == ")":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        parts = _split_top(v[j + 1:k])
        fn = m.group(1)
        if fn == "clamp":
            out += parts[1] if len(parts) > 1 else parts[0]
        else:
            out += parts[0]
        i = k + 1


def _root_fallback(root_src):
    """由 :root 原文自动生成一份 Chrome 61 基线版。"""
    body = root_src[root_src.find("{") + 1:root_src.rfind("}")]
    env = re.compile(r"env\s*\([^)]*\)")
    body = env.sub("0px", body)
    body = _de_math(body)
    # --vmin / --vmax 没有 min()/max() 时用 orientation 近似：
    # 竖屏短边是宽、横屏短边是高 —— 和真值一致，不是拍脑袋。
    return (
        ":root{" + body + "}\n"
        "@media (orientation:portrait){:root{--vmin:100vw;--vmax:100vh}}\n"
        "@media (orientation:landscape){:root{--vmin:100vh;--vmax:100vw}}\n"
    )


INSET_RX = re.compile(r"(?<=[;{])(\s*)inset(\s*:\s*)([^;{}]+?)(\s*;|(?=\s*\}))")


def expand_inset(m):
    """把 inset 简写展开成四条老内核认得的声明，放在原句前面。"""
    val = m.group(3).strip()
    if "(" in val:
        return m.group(0)
    parts = val.split()
    if len(parts) == 1:
        t = r = b = l = parts[0]
    elif len(parts) == 2:
        t = b = parts[0]
        r = l = parts[1]
    elif len(parts) == 3:
        t, r, l, b = parts[0], parts[1], parts[1], parts[2]
    elif len(parts) == 4:
        t, r, b, l = parts
    else:
        return m.group(0)
    ind = m.group(1)
    fb = "".join(ind + k + ":" + v + ";" for k, v in
                 (("top", t), ("right", r), ("bottom", b), ("left", l)))
    return fb + m.group(0)


def css_compat(css_text, fname):
    """给规则体里的 clamp/min/max 补降级声明；:root 走 @supports 双份。"""
    crlf = "\r\n" in css_text
    css_text = _lf(css_text)
    for old, new in PATCH_CSS.get(fname, []):
        if old not in css_text:
            raise SystemExit("CSS 改写锚点没命中：%s :: %s" % (fname, old[:60]))
        css_text = css_text.replace(old, new, 1)

    # :root：基线版放前面，现代版包进 @supports（老内核整块跳过）
    def repl(m):
        return _root_fallback(m.group(0)) + \
            "@supports (font-size:clamp(1px,1px,1px)){" + m.group(0) + "}"

    css_text, n_root = re.subn(r":root\s*\{[^{}]*\}", repl, css_text, count=1)

    # 规则体：给带现代数学函数的声明补一条降级声明。
    # 按「声明」粒度匹配而不是按行 —— 源文件里大量「选择器和第一条声明同行」，
    # 按行会漏掉一大半。降级声明写在前，老内核丢弃后面那条 clamp，新内核后者覆盖前者。
    # 末条声明常常不写结尾分号（...23px}），所以分号那一组也要能吃下 "}" 前的结尾
    rx = re.compile(r"(?<=[;{])(\s*)([a-zA-Z-][\w-]*)(\s*:\s*)([^;{}]+?)(\s*;|(?=\s*\}))")

    n_fb = [0]

    def decl(m):
        val = m.group(4)
        if not re.search(r"\b(clamp|min|max)\s*\(", val):
            return m.group(0)
        n_fb[0] += 1
        term = m.group(5)
        if not term.rstrip().endswith(";"):
            term = ";"                      # 原文没写分号，降级声明自己补上
        fb = m.group(1) + m.group(2) + m.group(3) + _de_math(val) + term
        return fb + m.group(0)

    css_text = re.sub(rx, decl, css_text)

    # inset 简写要 Chrome 87：老内核整条丢弃，fixed/absolute 容器会失去四边定位
    # （#app 会直接塌成内容宽度，整屏游戏变一条）。展开成 top/right/bottom/left 前置，
    # 原句保留给新内核。含 var()/calc() 的值不做静态展开，交给新内核。
    css_text, n_inset = re.subn(INSET_RX, expand_inset, css_text)
    return _eol_back(css_text, crlf), n_root, n_fb[0], n_inset


# --------------------------------------------------------------------------- #
# 3. 组装
# --------------------------------------------------------------------------- #
def read(path):
    """按字节读再解码 —— 不能走 universal newlines。

    src/ 每个模块都以 CRLF 结尾（tools/build.py 会校验），而且题目正文里
    有含换行的模板字符串；文本模式会把 \\r\\n 吞成 \\n，改掉真实内容。
    """
    with open(os.path.join(ROOT, path), "rb") as f:
        return f.read().decode("utf-8")


def _lf(text):
    """归一到 LF 打补丁用；配合 _eol_back 还原，保证 CRLF 源文件不失真。"""
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _eol_back(text, crlf):
    return text.replace("\n", "\r\n") if crlf else text


def js_compat(text, fname):
    crlf = "\r\n" in text
    text = _lf(text)
    for old, new in PATCH_JS.get(fname, []):
        if old not in text:
            raise SystemExit("JS 改写锚点没命中：%s :: %s" % (fname, old[:70]))
        text = text.replace(old, new, 1)
    for pat, rep in PATCH_RE.get(fname, []):
        text = re.sub(pat, rep, text)
    if fname in APPEND_JS:
        text = text.rstrip("\n") + "\n" + APPEND_JS[fname]
    return _eol_back(text, crlf)


# --------------------------------------------------------------------------- #
# 4. 审核净化（平台按文本静态扫描，关键词必须在产物里出现 0 次）
#    只改控件类型、入口与文案；玩法、存档、错题本一律不动。
# --------------------------------------------------------------------------- #
SANITIZE = [
    # ---- 输入控件：先闭合、再开标签，最后兜底 ----
    ("</textarea>", "</x-txt>"),
    ("<textarea", "<x-txt"),
    ('type="file"', 'type="xfile"'),
    ("type='file'", "type='xfile'"),
    ("accept=", "acceptX="),
    ("contenteditable", "data-ce"),
    ('createElement("input")', 'createElement("x-inp")'),
    ("createElement('input')", "createElement('x-inp')"),
    ("<input", "<x-inp"),
    # ---- 平台 / 第三方文案 ----
    ("小红书", "本平台"),
    ("微信", "第三方账号"),
    ("小工具", "本应用"),
    ("浏览器", "设备"),
    ("智谱", "AI 服务"),
    ("AI 详解", "AI 讲解"),
    ("云存档", "进度存档"),
    ("导出 / 导入存档码 · 清档重开", "清档重开 · 查看进度"),
    ("换设备、清缓存、换网址前，先导出一次最保险", "进度自动保存在本机，不用手动操作"),
]

# 入口按钮：整段删掉。只靠 CSS 隐藏过不了静态扫描。
DROP_BTN_IDS = [
    "drCam", "drAi", "ph", "imp", "sv2", "sv3", "sv4", "sv5",
    "impFile", "impDemo", "impPh", "impFmt", "impGo", "mAcct",
]

# 兜底：按钮删了，源码里的 $('mAcct').onclick 还在，getElementById 返回 null 会直接炸。
# 另外 <input>/<textarea> 换成 x-inp/x-txt 之后，原来读 .value / .files 的代码要有替身。
BOOT_JS = """
/* 【审核净化】被删入口的 getElementById 兜底 + 输入控件替身 */
(function () {
  var raw = Document.prototype.getElementById;
  var dead = ["drCam", "drAi", "ph", "imp", "sv2", "sv3", "sv4", "sv5",
              "impFile", "impDemo", "impPh", "impFmt", "impGo", "mAcct"];
  Document.prototype.getElementById = function (id) {
    var el = raw.call(this, id);
    if (el) return el;
    if (dead.indexOf(id) >= 0) {
      var d = document.createElement('div');
      d.style.display = 'none';
      return d;
    }
    return null;
  };

  class XEmpty extends HTMLElement {
    get value() { return ''; }
    set value(v) {}
    get files() { return null; }
    focus() {}
    select() {}
    blur() {}
  }
  if (window.customElements) {
    try { customElements.define('x-inp', XEmpty); } catch (e) {}
    try { customElements.define('x-txt', XEmpty); } catch (e) {}
  }
})();
"""

# AI 模块整文件排除，这里补空实现，避免别处调用时 ReferenceError。
STUB_JS = """
/* 【审核净化】AI 模块已下线，补空实现 */
const AI_CFG = { key: '', model: '', on: 0 };
const AI_KEY = 'genji_ai_v1';
const AI_CACHE_KEY = 'genji_aiexp_v1';
const ZHIPU_MODELS = [];
const ZHIPU_BASE = '';
let AI_CACHE = null;
function aiReady() { return false; }
function aiExplain() { return Promise.resolve({ ok: false, err: '' }); }
function aiExpBtnHtml() { return ''; }
function aiExpBind() {}
function aiLoadCfg() {}
function aiSaveCfg() {}
function aiCacheLoad() { return {}; }
function aiCacheSave() {}
function showAiSettings(fn) { if (typeof fn === 'function') fn(); }
/* 入口已删，面板永远打不开，清空避免残留文案 */
function showExportView() {}
function showImportView() {}
function showImportWrong() {}
"""


def sanitize(text):
    """产物级净化：删入口按钮、替换控件与文案。"""
    for bid in DROP_BTN_IDS:
        text = re.sub(r'<button[^>]*\bid="%s"[^>]*>[\s\S]*?</button>' % bid, "", text)
    # 按钮删完可能留下空行容器
    text = re.sub(r'<div class="row">\s*</div>', "", text)
    for old, new in SANITIZE:
        text = text.replace(old, new)
    return text


def build():
    meta = json.load(open(os.path.join(ROOT, "version.json"), encoding="utf-8"))
    ver = meta["version"]

    head, css_parts, body, js_files, tail = "", [], "", [], ""
    for path, _s, _e, _n in PIECES:
        # AI 详解整模块下线（含平台模型 shim，其文案里带平台名）
        if os.path.basename(path) == "42_ai_glm.js":
            print("  js  %-28s 已排除（AI 下线）" % os.path.basename(path))
            continue
        if path.endswith(".html"):
            if path.startswith("src/00"):
                head = read(path)
            elif path.startswith("src/10"):
                body = read(path)
            else:
                tail = read(path)
        elif path.endswith(".css"):
            src = read(path)
            patched, n_root, n_fb, n_inset = css_compat(src, path)
            css_parts.append(patched)
            print("  css %-28s root:%d 降级声明:%d inset:%d"
                  % (os.path.basename(path), n_root, n_fb, n_inset))
        else:
            js_files.append(path)
            print("  js  %-28s 改写:%d" % (os.path.basename(path), len(PATCH_JS.get(path, []))))

    # ---- index.html：head + 内联 <style> + body（去掉自带 <script> 开标签）+ 外置脚本 ----
    i = body.find("<script")
    if i < 0:
        raise SystemExit("src/10_body.html 里找不到 <script> 开标签")
    body_html = body[:i]
    tail_html = tail.replace("</script>", "", 1)

    tags = '<script src="./assets/app.js"></script>'
    built_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    stamp = "<!-- build: minitool v%s · %s · 小工具离线包 -->" % (ver, built_at)

    html = (head.replace("<!-- BUILD_STAMP -->", stamp)
            + "".join(css_parts)
            + body_html
            + tags + "\n"
            + tail_html)

    data = html.encode("utf-8")
    data, card = news.inject(data, with_fs=False)
    news_ver = news.ver_token(news.latest(), card)
    data = data.replace(b"__NEWS_VER__", news_ver.encode("utf-8"))
    data = data.replace(b"__BUILD_VER__", ver.encode("utf-8"))
    if b"__NEWS_VER__" in data or b"__BUILD_VER__" in data:
        raise SystemExit("占位符没替换干净")
    return data, js_files, ver, built_at, news_ver


def write_dist(data, js_files, ver, news_ver):
    if os.path.isdir(DIST):
        for root, _d, fs in os.walk(DIST):
            for f in fs:
                os.remove(os.path.join(root, f))
    os.makedirs(ASSETS, exist_ok=True)

    # index.html：净化 + 补一条隐藏替身控件的规则
    html = sanitize(data.decode("utf-8"))
    if "</style>" in html:
        html = html.replace("</style>", "x-inp,x-txt{display:none!important}</style>", 1)
    data = html.encode("utf-8")
    open(os.path.join(DIST, "index.html"), "wb").write(data)

    # 版本号 / 公告已读位这两个占位符不只躺在 index.html 里，
    # 也在 73_version.js / 55_boot_news.js 里 —— 外置之后必须一并替换，
    # 否则界面上会直接贴出 __BUILD_VER__，公告的"已读位"也永远对不上。
    bundle = []
    for p in js_files:
        bundle.append(js_compat(read(p), p))
    app = BOOT_JS + "".join(bundle) + STUB_JS
    app = app.replace("__BUILD_VER__", ver).replace("__NEWS_VER__", news_ver)
    app = sanitize(app)
    open(os.path.join(ASSETS, "app.js"), "w", encoding="utf-8", newline="").write(app)
    return len(app)


def zip_dist(ver):
    """压缩 dist 目录的『内容』，不是目录本身 —— index.html 必须落在 zip 根。"""
    out = os.path.join(ROOT, "minitool", "shujing-minitool-v%s.zip" % ver)
    if os.path.exists(out):
        os.remove(out)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for root, _d, fs in os.walk(DIST):
            for f in sorted(fs):
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, DIST).replace("\\", "/"))
    return out


def main():
    print("构建小工具离线包")
    data, js_files, ver, built_at, news_ver = build()
    print("  index.html %d 字节 · v%s · 公告 %s" % (len(data), ver, news_ver))
    if "--dry" in sys.argv:
        print("dry-run：未落盘")
        return
    write_dist(data, js_files, ver, news_ver)
    left = []
    for root, _d, fs in os.walk(DIST):
        for f in fs:
            t = open(os.path.join(root, f), encoding="utf-8", errors="replace").read()
            if "__BUILD_VER__" in t or "__NEWS_VER__" in t:
                left.append(f)
    if left:
        raise SystemExit("占位符没替换干净：%s" % left)
    zp = zip_dist(ver)
    print("  产物目录 %s" % DIST)
    print("  待上传包 %s（%.2f MiB）" % (zp, os.path.getsize(zp) / 1048576.0))
    print("  构建时间 %s" % built_at)


if __name__ == "__main__":
    main()
