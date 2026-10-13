/* =========================================================
   照片错题：本机存图 / 压缩 / 自动识别 / 批量导入
   ---------------------------------------------------------
   图片不进 localStorage（那份要存进度，塞几张图就爆了），
   单独放 IndexedDB；题目里只存一个图片 id。
   IndexedDB 打不开时（无痕模式）退回内存 —— 图能用，刷新就没了，会提示。
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
function shotPut(id,v){
  shotMem[id]=v;
  return shotDB().then(db=>{
    if(!db)return true;                       /* 已在内存里，够本次会话用 */
    return new Promise(res=>{
      let tx;
      try{tx=db.transaction(SHOT_TAB,'readwrite');}catch(e){return res(true);}
      tx.objectStore(SHOT_TAB).put(v,id);
      tx.oncomplete=()=>res(true);
      tx.onerror=()=>res(true);
      tx.onabort=()=>res(true);
    });
  }).catch(()=>true);
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
/* 照片一律压一道再存：相册里一张原图好几 MB，两百题存下来能把手机撑爆。
   长边收到 1100px、压成 jpeg —— 手机屏幕上看足够清楚，体积能掉到十分之一。 */
function shrinkImage(file,maxSide,quality){
  return new Promise(res=>{
    if(!file||!window.FileReader)return res(null);
    const fr=new FileReader();
    fr.onload=()=>{
      const im=new Image();
      im.onload=()=>{
        try{
          let w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
          if(!w||!h)return res(fr.result);
          const m=Math.max(w,h);
          if(m>(maxSide||1100)){const k=(maxSide||1100)/m;w=Math.max(1,Math.round(w*k));h=Math.max(1,Math.round(h*k));}
          const cv=document.createElement('canvas');cv.width=w;cv.height=h;
          const c=cv.getContext('2d');
          c.fillStyle='#ffffff';c.fillRect(0,0,w,h);
          c.drawImage(im,0,0,w,h);
          let out=null;
          try{out=cv.toDataURL('image/jpeg',quality||0.72);}catch(e){}
          res(out||fr.result);
        }catch(e){res(fr.result);}
      };
      im.onerror=()=>res(null);
      im.src=fr.result;
    };
    fr.onerror=()=>res(null);
    fr.readAsDataURL(file);
  });
}
/* ---------- 看图：点小图放大 ---------- */
let imgViewEl=null;
function viewImage(src){
  if(!src)return;
  if(!imgViewEl){
    imgViewEl=document.createElement('div');
    imgViewEl.id='imgView';
    imgViewEl.innerHTML='<div class="bar"><button class="btn" id="ivClose">✕ 关闭</button></div><img class="qimg-s" alt="">';
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
  box.querySelectorAll('img[data-zoom]').forEach(el=>{
    const k=el.getAttribute('data-zoom');
    el.onclick=()=>{const sh=PHOTO_SHOTS[+k];if(sh)viewImage(sh.url);};
  });
}
function imgTag(id,cls){
  if(!id)return '';
  return `<img class="${cls}" data-img="${esc(id)}" src="${esc(shotMem[id]||'')}" alt="">`;
}

