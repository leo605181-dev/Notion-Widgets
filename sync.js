/* Notion-Widgets cloud sync: mirrors selected localStorage keys to a Google Apps Script web app. */
(function(){
  var URL=window.SYNC_URL; if(!URL) return;
  var LS=window.localStorage, set0=Storage.prototype.setItem, TSK="sync:ts";
  var PRE=["td:items","td:archive","xp:awards","dq3:texts","dq3:done:"];
  function synced(k){ for(var i=0;i<PRE.length;i++) if(k.indexOf(PRE[i])===0) return true; return false; }
  var ts={};
  function loadTs(){ var o={}; try{ o=JSON.parse(LS.getItem(TSK)||"{}")||{}; }catch(e){} Object.keys(o).forEach(function(k){ if(ts[k]==null||o[k]>ts[k]) ts[k]=o[k]; }); }
  function saveTs(){ loadTs(); try{ set0.call(LS,TSK,JSON.stringify(ts)); }catch(e){} }
  function canon(s){ try{ return JSON.stringify(sort(JSON.parse(s))); }catch(e){ return s; } }
  function sort(o){ if(Array.isArray(o)) return o.map(sort); if(o&&typeof o==="object"){ var r={}; Object.keys(o).sort().forEach(function(k){ r[k]=sort(o[k]); }); return r; } return o; }
  loadTs();
  var rl=false, ready=false, timer=null, busy=false, again=false;
  try{ for(var i=0;i<LS.length;i++){ var k=LS.key(i); if(synced(k)&&ts[k]==null) ts[k]=Date.now(); } saveTs(); }catch(e){}
  Storage.prototype.setItem=function(k,v){
    if(this===LS&&synced(k)){
      var old=LS.getItem(k); set0.call(this,k,v);
      if(old===null||canon(old)!==canon(String(v))){ ts[k]=ready?Date.now():0; saveTs(); if(ready) later(); else pendingPush=true; }
      return;
    }
    return set0.call(this,k,v);
  };
  var pendingPush=false;
  function later(){ clearTimeout(timer); timer=setTimeout(sync,1500); }
  function editing(){ var a=document.activeElement; return a&&(a.isContentEditable||/INPUT|TEXTAREA/.test(a.tagName)); }
  function waitMs(){
    try{ var t=+sessionStorage.getItem("sync:rl")||0, d=60000-(Date.now()-t); return d>0?d:0; }catch(e){ return 0; }
  }
  function doReload(){
    if(editing()){ setTimeout(doReload,4000); return; }
    try{ sessionStorage.setItem("sync:rl",Date.now()); }catch(e){}
    location.reload();
  }
  function sync(){
    if(busy){ again=true; return; } busy=true;
    loadTs();
    fetch(URL,{method:"GET",redirect:"follow"}).then(function(r){ return r.json(); }).then(function(remote){
      var changed=false, up={};
      Object.keys(remote).forEach(function(k){
        if(!synced(k)) return;
        var rt=remote[k].ts||0;
        if(ts[k]==null||rt>ts[k]){
          var cur=LS.getItem(k);
          if(cur===null||canon(cur)!==canon(remote[k].v)){ set0.call(LS,k,remote[k].v); changed=true; }
          ts[k]=rt;
        }
      });
      var has=false;
      for(var i=0;i<LS.length;i++){ var k=LS.key(i); if(!synced(k)) continue;
        var l=ts[k]||0; if(!remote[k]||l>(remote[k].ts||0)){ up[k]={v:LS.getItem(k),ts:l}; has=true; } }
      saveTs();
      var p=has?fetch(URL,{method:"POST",redirect:"follow",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(up)}).then(function(r){return r.text();}):Promise.resolve();
      return p.then(function(){ ready=true; if(changed&&!rl){ rl=true; setTimeout(doReload,waitMs()); } });
    }).catch(function(){ ready=true; }).then(function(){ busy=false; if(again){ again=false; later(); } });
  }
  sync(); setInterval(function(){ if(!document.hidden) sync(); },20000);
  document.addEventListener("visibilitychange",function(){ if(!document.hidden) sync(); });
})();
