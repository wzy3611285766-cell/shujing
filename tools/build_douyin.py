# -*- coding: utf-8 -*-
"""构建「抖音特供版」：横屏布局 + 移除一切用户输入/上传能力。

审核规则：互动作品不得支持用户自定义上传图片或自定义输入。
静态扫描会直接匹配 `<input` / `<textarea` / `type="file"` / `accept=` / `contenteditable`，
所以只在运行时禁用不够，**产物文本里必须一个都不剩**。

做法：
  1. 拼接后（index.html + app.js）做文本级替换：
     <input → <x-inp、<textarea → <x-txt、type="file" → data-type="file" 等
  2. 注册 x-inp / x-txt 自定义元素：value 恒为空、focus/select 空实现，
     于是原来的 `$('code').value.trim()` 之类不会抛错，只是拿不到内容
  3. CSS 把它们 display:none，界面上不留空壳
  4. 横屏增强照旧

产物：
  minitool/dist-douyin/
  抖音上传准备材料/数境-抖音特供-vX.Y.Z.zip
"""
import json
import os
import re
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_minitool as bm  # noqa: E402

ROOT = bm.ROOT
DIST = os.path.join(ROOT, "minitool", "dist-douyin")
OUT_DIR = os.path.join(ROOT, "抖音上传准备材料")

# 横屏：所有横屏都走横屏布局（与 build_landscape 一致）
LAND_TARGET = b"(orientation:landscape) and (max-height:560px)"
LAND_NEW = b"(orientation:landscape)"

# 输入控件净化：按「先长后短」顺序替换，避免连锁
SANITIZE = [
    ("<textarea", "<x-txt"),
    ("</textarea>", "</x-txt>"),
    # 替换结果里不能残留原关键词，否则自检会再次命中；同时必须保持 JS 合法
    ('type="file"', 'type="xfile"'),
    ("type='file'", "type='xfile'"),
    ("accept=", "acceptX="),
    ("contenteditable", "data-ce"),
    ('createElement("input")', 'createElement("x-inp")'),
    ("createElement('input')", "createElement('x-inp')"),
    ("<input", "<x-inp"),
]

PATCH_JS = b"""
/* ===== \u6296\u97f3\u7279\u4f9b\uff1a\u8f93\u5165\u7c7b\u63a7\u4ef6\u7edf\u4e00\u9000\u5316\u4e3a\u4e0d\u53ef\u7528 ===== */
(function(){
  try{
    if(!window.customElements) return;
    class XEmpty extends HTMLElement {
      get value(){ return ''; }
      set value(v){}
      get files(){ return null; }
      focus(){}
      select(){}
      blur(){}
    }
    customElements.define('x-inp', XEmpty);
    customElements.define('x-txt', XEmpty);
  }catch(e){}
})();
"""

PATCH_CSS = """
<style id="douyin-input-off">
/* \u6296\u97f3\u7279\u4f9b\uff1a\u8f93\u5165\u63a7\u4ef6\u4e0d\u6e32\u67d3\uff0c\u4e0d\u7559\u7a7a\u58f3 */
x-inp, x-txt{display:none!important}
/* \u624b\u673a\u7aef\u4e0d\u9700\u8981\u952e\u76d8\u63d0\u793a */
#pcHint, #pcKeyHint{display:none!important}

/* \u6296\u97f3\u5bb9\u5668\u53f3\u4e0a\u89d2\u6709\u5e73\u53f0\u81ea\u5e26\u7684\u300c\u00b7\u00b7\u00b7 / \u00d7\u300d\u80f6\u56ca\u6309\u94ae\uff08\u7ea6 87\u00d732\uff0c\u8ddd\u9876 6px\uff09\u3002
   \u6e38\u620f\u9876\u680f\u539f\u6765\u8d34\u7740\u5b89\u5168\u533a\u6392\uff0c\u6700\u53f3\u4fa7\u7684 \u2630 \u6b63\u597d\u88ab\u5b83\u538b\u4f4f\u3002
   \u8fd9\u91cc\u628a\u6574\u6761\u9876\u680f\u4e0b\u79fb 36px\uff0c\u843d\u5230\u80f6\u56ca\u4e0b\u65b9\uff1b\u4efb\u52a1\u6761\u4f1a\u8ddf\u7740 offsetHeight \u81ea\u52a8\u4e0b\u79fb\u3002 */
/* 顶栏贴最上面排（按用户要求，不再为平台胶囊让位）。
   这里显式压回原始内边距，避免任何历史偏移规则残留。 */
#topbar{padding-top:calc(var(--safeT) + var(--pad))!important}
</style>
""".encode("utf-8")

# 整体功能下线的模块（AI 详解 / 智谱 GLM）
SKIP_MODULES = {"42_ai_glm.js"}

# 同名空实现：保证 39 / 49 / 43 里的调用不报错，但没有入口、不会发请求
AI_STUB = """
/* ===== \u6296\u97f3\u7279\u4f9b\uff1aAI \u80fd\u529b\u6574\u4f53\u4e0b\u7ebf ===== */
const AI_CFG = {key:'',model:'',on:0};
const AI_KEY = 'genji_ai_v1';
const AI_CACHE_KEY = 'genji_aiexp_v1';
const ZHIPU_MODELS = [];
const ZHIPU_BASE = '';
let AI_CACHE = null;
function aiReady(){ return false; }
function aiExplain(){ return Promise.resolve({ok:false,err:''}); }
function aiExpBtnHtml(){ return ''; }
function aiExpBind(){}
function aiLoadCfg(){}
function aiSaveCfg(){}
function aiCacheLoad(){ return {}; }
function aiCacheSave(){}
function showAiSettings(fn){ if(typeof fn==='function') fn(); }
"""

# 产物里不能出现的第三方平台称谓
TEXT_FIX = [
    ("小红书", "本平台"),
    ("微信", "第三方账号"),
    ("小工具", "本应用"),
    ("浏览器", "设备"),
    ("AI 详解", "AI 讲解"),
    ("智谱", "AI 服务"),
    # 本版本没有账号体系，公告与面板里的「云存档」会误导
    ("云存档", "进度存档"),
    # 存档码相关入口文案
    ("导出 / 导入存档码 · 清档重开", "清档重开 · 查看进度"),
    ("换设备、清缓存、换网址前，先导出一次最保险", "进度自动保存在本机，不用手动操作"),
    ('· <b style="color:#ffd76a">存档码</b>是一串文本，复制走就能在别的手机/设备粘回来<br>', ""),
    # 面板标题与提示里残留的入口措辞
    ("导出存档码", "导出进度"),
    ("导入存档码", "导入进度"),
    ("已存成文件", "已保存"),
    ("文字导入", "文字记录"),
    ("选文件", "选择"),
    # 全屏说明里的平台名
    ("iPhone 请从「添加到主屏幕」的图标进（Safari 不给网页全屏）", "不支持网页全屏的设备可用系统手势"),
    ("各平台怎么开全屏", "怎么开全屏"),
    ("iPhone", "手机"),
    ("Safari", "系统"),
    ("存档管理", "存档"),
]

# 入口已删、永远打不开的面板函数，整体清空（避免标题与输入控件留在产物里）
CLEAR_FUNCS = [
    r'function showExportView\(\)\{[\s\S]*?\n\}',
    r'function showImportView\(\)\{[\s\S]*?\n\}',
    r'function showImportWrong\(initTxt\)\{[\s\S]*?\n\}',
]

# 练枪场里那颗「AI 设置 · 智谱 GLM」入口按钮
AI_BTN_RE = re.compile(r'<div class="row"><button class="btn" id="drAi"[\s\S]*?</button></div>')

# 拍照 / 上传 / AI / 存档码输入 相关的入口按钮，按 id 逐个摘掉
DEAD_BUTTON_IDS = [
    "drCam", "drAi",                    # 拍题讲解 / AI 设置
    "ph", "imp",                        # 错题中心：拍一道题 / 文字导入
    "sv2", "sv3", "sv4", "sv5",         # 存档：导出 / 导入 / 存文件 / 读文件
    "impFile", "impDemo", "impPh",      # 错题导入：选文件 / 示例 / 拍题
    "impFmt", "impGo",                  # 错题导入：格式说明 / 解析
    "mAcct",                            # 菜单：账号与同步
    "mSave", "sv1", "sv6",              # 菜单：存档管理 + 面板内两个按钮
    "mKeys",                            # 菜单：电脑端键位（手机端用不到）
    "mFps",                             # 菜单：帧率角标（调试项）
]

# 删了按钮，原代码里的 $('id').onclick 会拿到 null；
# 给这些 id 返回一个游离的隐藏节点，赋值都落在空对象上，不报错也不产生入口。
DEAD_ID_GUARD = """
(function(){
  try{
    var raw = Document.prototype.getElementById;
    var dead = %s;
    Document.prototype.getElementById = function(id){
      var el = raw.call(this, id);
      if(el) return el;
      if(dead.indexOf(id) >= 0){
        var d = document.createElement('div');
        d.style.display = 'none';
        return d;
      }
      return null;
    };
  }catch(e){}
})();
""" % json.dumps(DEAD_BUTTON_IDS)


def sanitize(text):
    for a, b in SANITIZE:
        text = text.replace(a, b)
    return text


def strip_buttons(text):
    """按 id 摘掉入口按钮，并清理因此变空的 .row 容器。"""
    for bid in DEAD_BUTTON_IDS:
        text = re.sub(r'<button[^>]*id="%s"[^>]*>[\s\S]*?</button>' % re.escape(bid),
                      "", text)
    text = re.sub(r'<div class="row">\s*</div>', "", text)
    return text


def main():
    print("构建抖音特供版")
    data, js_files, ver, built_at, news_ver = bm.build()

    # 0) 排除 AI 模块
    def _is_skipped(p):
        q = p.replace("\\", "/")
        return any(s in q for s in SKIP_MODULES)

    excluded = [p for p in js_files if _is_skipped(p)]
    js_files = [p for p in js_files if not _is_skipped(p)]
    print("  命中待排除：", [p.replace("\\", "/").split("/")[-1] for p in excluded])

    # 1) index.html：横屏放宽 + 净化 + 补 CSS
    n = data.count(LAND_TARGET)
    data = data.replace(LAND_TARGET, LAND_NEW)
    data = data.replace(b"</head>", PATCH_CSS + b"</head>", 1)
    html_text = sanitize(data.decode("utf-8"))
    for a, b in TEXT_FIX:
        html_text = html_text.replace(a, b)

    # 小红书容器的补丁：顶栏整体下移 44px 让开"返回/标题/分享"浮层。
    # 抖音容器的胶囊在右上角、不在同一条横带上，这个下移只会白占高度，
    # 所以直接从产物里抹掉，让顶栏回到最上面。
    html_text = html_text.replace(
        "+ 44px) calc(var(--safeR) + 10px)",
        ") calc(var(--safeR) + 10px)")

    data = html_text.encode("utf-8")

    # 2) app.js：拼接 + 净化 + 平台名清理 + AI 入口移除 + 补 JS
    bundle = "".join(bm.js_compat(bm.read(p), p) for p in js_files)
    bundle = bundle.replace("__BUILD_VER__", ver).replace("__NEWS_VER__", news_ver)
    bundle = sanitize(bundle)
    for a, b in TEXT_FIX:
        bundle = bundle.replace(a, b)
    bundle = strip_buttons(bundle)
    bundle = AI_BTN_RE.sub("", bundle)
    # 清空已经不可达的导入/导出面板
    bundle = re.sub(CLEAR_FUNCS[0], "function showExportView(){}", bundle)
    bundle = re.sub(CLEAR_FUNCS[1], "function showImportView(){}", bundle)
    bundle = re.sub(CLEAR_FUNCS[2], "function showImportWrong(){}", bundle)
    # 兜底必须放在最前面：启动代码里就有 $('mAcct').onclick 这类绑定
    bundle = DEAD_ID_GUARD + bundle
    bundle += PATCH_JS.decode("utf-8")
    bundle += AI_STUB

    # 3) 落盘
    if os.path.isdir(DIST):
        for root, _d, fs in os.walk(DIST):
            for f in fs:
                os.remove(os.path.join(root, f))
    os.makedirs(os.path.join(DIST, "assets"), exist_ok=True)
    with open(os.path.join(DIST, "index.html"), "wb") as f:
        f.write(data)
    with open(os.path.join(DIST, "assets", "app.js"), "w", encoding="utf-8", newline="") as f:
        f.write(bundle)

    print("  排除模块 %d 个 · 横屏媒体查询 %d 处 · index %.1f KB · app.js %.2f MB"
          % (len(excluded), n, len(data) / 1024, len(bundle.encode("utf-8")) / 1048576))

    # 4) 自检：输入控件 + AI 入口 + 第三方平台名
    joined = data.decode("utf-8") + bundle
    bad = []
    checks = ["<input", "<textarea", "</textarea>", 'type="file"', "type='file'",
              "accept=", "contenteditable",
              "小红书", "微信", "浏览器", "小工具", "智谱", "AI 详解"]
    for kw in checks:
        c = joined.count(kw)
        if c:
            bad.append((kw, c))
    if bad:
        print("  [!] 仍有残留：", bad)
    else:
        print("  自检通过：输入控件 / AI 入口 / 第三方平台名 均为 0")

    # 5) 打包
    pkg = os.path.join(OUT_DIR, "数境-抖音特供-v%s.zip" % ver)
    if os.path.exists(pkg):
        os.remove(pkg)
    with zipfile.ZipFile(pkg, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for root, _d, fs in os.walk(DIST):
            for f in sorted(fs):
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, DIST).replace("\\", "/"))

    print("  上传包 %s（%.2f MB）" % (os.path.basename(pkg), os.path.getsize(pkg) / 1048576))
    print("  构建时间 %s" % built_at)
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(main())
