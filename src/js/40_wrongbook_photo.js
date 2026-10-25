/* =========================================================
   错题配图：本机存图 / 压缩 / 放大查看
   ---------------------------------------------------------
   图片不进 localStorage（那份要存进度，塞几张图就爆了），
   单独放 IndexedDB；题目里只存一个图片 id。
   IndexedDB 打不开时（无痕模式）退回内存 —— 图能用，刷新就没了，会提示。
   （拍照识别/AI 解析那一套已经下线，这里只剩"看图"这一件事：
     老存档里带图错题的缩略图、点开放大，以及删题时顺手清图。）
   ========================================================= */
const SHOT_DB='genji_shots_v1', SHOT_TAB='shots';
const shotMem={};                    /* 内存缓存 + IndexedDB 不可用时的兜底 */
let shotDBP=null,shotNoDB=false;
function shotDB(){
  if(shotDBP)return shotDBP;
  shotDBP=new Promise(res=>{
    let req;
    try{req=indexedDB.open(SHOT_DB,1);}catch(e){shotNoDB=true;return res(null);}
    req.onupgradeneeded=()=>{
      try{const db=req.result;
        if(db.objectStoreNames&&!db.objectStoreNames.contains(SHOT_TAB))db.createObjectStore(SHOT_TAB);
        else if(!db.objectStoreNames)db.createObjectStore(SHOT_TAB);
      }catch(e){}
    };
    req.onsuccess=()=>res(req.result);
    req.onerror=()=>{shotNoDB=true;res(null);};
    req.onblocked=()=>{shotNoDB=true;res(null);};
  });
  return shotDBP;
}
function shotGet(id){
  if(shotMem[id])return Promise.resolve(shotMem[id]);
  return shotDB().then(db=>{
    if(!db)return null;
    return new Promise(res=>{
      let tx,rq;
      try{tx=db.transaction(SHOT_TAB,'readonly');rq=tx.objectStore(SHOT_TAB).get(id);}
      catch(e){return res(null);}
      rq.onsuccess=()=>{const v=rq.result||null;if(v)shotMem[id]=v;res(v);};
      rq.onerror=()=>res(null);
    });
  }).catch(()=>null);
}
/* 清空错题本时把照片一起清干净：孤儿图（题答对划掉了、图还在）
   光遍历 wrongBook 删不干净，直接把存图库扫一遍 */
function shotClearAll(){
  Object.keys(shotMem).forEach(k=>{delete shotMem[k];});
  return shotDB().then(db=>{
    if(!db)return true;
    return new Promise(res=>{
      let tx,req;
      try{tx=db.transaction(SHOT_TAB,'readwrite');req=tx.objectStore(SHOT_TAB).openCursor();}
      catch(e){return res(true);}
      req.onsuccess=()=>{
        const c=req.result;
        if(!c)return res(true);
        try{c.delete();c.continue();}catch(e){res(true);}
      };
      req.onerror=()=>res(true);
      tx.oncomplete=()=>res(true);
    });
  }).catch(()=>true);
}
function shotDel(id){
  delete shotMem[id];
  return shotDB().then(db=>{
    if(!db)return true;
    return new Promise(res=>{
      let tx;
      try{tx=db.transaction(SHOT_TAB,'readwrite');tx.objectStore(SHOT_TAB).delete(id);}
      catch(e){return res(true);}
      tx.oncomplete=()=>res(true);tx.onerror=()=>res(true);tx.onabort=()=>res(true);
    });
  }).catch(()=>true);
}

/* ---------- 看图：点小图放大 ---------- */
let imgViewEl=null;
function viewImage(src){
  if(!src)return;
  if(!imgViewEl){
    imgViewEl=document.createElement('div');
    imgViewEl.id='imgView';
    setH(imgViewEl, '<div class="bar"><button class="btn" id="ivClose">✕ 关闭</button></div><img class="qimg-s" alt="">');
    (document.body||document.documentElement).appendChild(imgViewEl);
    imgViewEl.addEventListener('click',e=>{if(e.target&&e.target.id!=='ivClose')viewImageClose();});
  }
  const im=imgViewEl.querySelector('img');
  if(im)im.src=src;
  imgViewEl.classList.add('show');
  const b=imgViewEl.querySelector('#ivClose');
  if(b)b.onclick=e=>{e.stopPropagation();viewImageClose();};
}
function viewImageClose(){if(imgViewEl)imgViewEl.classList.remove('show');}
/* 把 <img data-img="id"> 的 src 补上（图在 IndexedDB 里，得异步取） */
function fillImgs(root){
  const box=root||panel;
  if(!box||!box.querySelectorAll)return;
  box.querySelectorAll('img[data-img]').forEach(el=>{
    const id=el.getAttribute('data-img');
    if(!id)return;
    if(shotMem[id]){el.src=shotMem[id];el.onclick=()=>viewImage(shotMem[id]);return;}
    shotGet(id).then(u=>{
      if(u){el.src=u;el.onclick=()=>viewImage(u);}
      else{el.style.display='none';}
    });
  });
}
function imgTag(id,cls){
  if(!id)return '';
  return `<img class="${cls}" data-img="${esc(id)}" src="${esc(shotMem[id]||'')}" alt="">`;
}

