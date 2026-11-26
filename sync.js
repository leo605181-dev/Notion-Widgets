/* Notion-Widgets cloud sync: mirrors selected localStorage keys to a Google Apps Script web app. */
(function(){
  var URL=window.SYNC_URL; if(!URL) return;
  var LS=window.localStorage, set0=Storage.prototype.setItem, TSK="sync:ts";
  var PRE=["td:items","td:archive","xp:awards","dq3:texts","dq3:done:"];
  function synced(k){ for(var i=0;i<PRE.length;i++) if(k.indexOf(PRE[i])===0) return true; return false; }
  var ts={}; try{ ts=JSON.parse(LS.getItem(TSK)||"{}")||{}; }catch(e){}
  function saveTs(){ try{ set0.call(LS,TSK,JSON.stringify(ts)); }catch(e){} }
  var ready=false, timer=null, busy=false, again=false;
  try{ for(var i=0;i<LS.length;i++){ var k=LS.key(i); if(synced(k)&&ts[k]==null) ts[k]=Date.now(); } saveTs(); }catch(e){}
  Storage.prototype.setItem=function(k,v){
    if(this===LS&&synced(k)){
      var old=LS.getItem(k); set0.call(this,k,v);
      if(old!==String(v)){ ts[k]=ready?Date.now():0; saveTs(); if(ready) later(); else pendingPush=true; }
      return;
    }
    return set0.call(this,k,v);
  };
  var pendingPush=false;
  function later(){ clearTimeout(timer); timer=setTimeout(sync,1500); }
  function editing(){ var a=document.activeElement; return a&&(a.isContentEditable||/INPUT|TEXTAREA/.test(a.tagName)); }
  function sync(){
    if(busy){ again=true; return; } busy=true;
    fetch(URL,{method:"GET",redirect:"follow"}).then(function(r){ return r.json(); }).then(function(remote){
      var changed=false, up={};
      Object.keys(remote).forEach(function(k){
        if(!synced(k)) return;
        var rt=remote[k].ts||0;
        if(ts[k]==null||rt>ts[k]){ set0.call(LS,k,remote[k].v); ts[k]=rt; changed=true; }
      });
      var has=false;
      for(var i=0;i<LS.length;i++){ var k=LS.key(i); if(!synced(k)) continue;
        var l=ts[k]||0; if(!remote[k]||l>(remote[k].ts||0)){ up[k]={v:LS.getItem(k),ts:l}; has=true; } }
      saveTs();
      var p=has?fetch(URL,{method:"POST",redirect:"follow",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(up)}).then(function(r){return r.text();}):Promise.resolve();
      return p.then(function(){ ready=true; if(changed){ if(editing()) setTimeout(function(){ if(!editing()) location.reload(); },4000); else location.reload(); } });
    }).catch(function(){ ready=true; }).then(function(){ busy=false; if(again){ again=false; later(); } });
  }
  sync(); setInterval(function(){ if(!document.hidden) sync(); },20000);
  document.addEventListener("visibilitychange",function(){ if(!document.hidden) sync(); });
})();
