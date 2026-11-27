/* Notion-Widgets cloud sync: mirrors selected localStorage keys to a Google Apps Script web app. */
(function(){
  var URL=window.SYNC_URL; if(!URL) return;
  var LS=window.localStorage, set0=Storage.prototype.setItem, TSK="sync:ts";
  var PRE=["td:items","td:archive","xp:awards","dq3:texts","dq3:done:"];
  function synced(k){ for(var i=0;i<PRE.length;i++) if(k.indexOf(PRE[i])===0) return true; return false; }
  var ts={};
  function loadTs(){ var o={}; try{ o=JSON.parse(LS.getItem(TSK)||"{}")||{}; }catch(e){} Object.keys(o).forEach(function(k){ if(ts[k]==null||o[k]>ts[k]) ts[k]=o[k]; }); }
  function saveTs(){ loadTs(); try{ set0.call(LS,TSK,JSON.stringify(ts)); }catch(e){} }
  function sort(o){ if(Array.isArray(o)) return o.map(sort); if(o&&typeof o==="object"){ var r={}; Object.keys(o).sort().forEach(function(k){ r[k]=sort(o[k]); }); return r; } return o; }
  function canon(s){ try{ return JSON.stringify(sort(JSON.parse(s))); }catch(e){ return s; } }
  loadTs();
  var first=true, rl=false, ready=false, timer=null, busy=false, again=false;
  var fresh=true; try{ for(var j=0;j<LS.length;j++) if(synced(LS.key(j))){ fresh=false; break; } }catch(e){}
  var de=document.documentElement;
  function reveal(){ de.style.visibility=""; }
  de.style.visibility="hidden"; setTimeout(reveal,3000);
  try{ for(var i=0;i<LS.length;i++){ var k=LS.key(i); if(synced(k)&&ts[k]==null) ts[k]=Date.now(); } saveTs(); }catch(e){}
  Storage.prototype.setItem=function(k,v){
    if(this===LS&&synced(k)){
      var old=LS.getItem(k); set0.call(this,k,v);
      if(old===null||canon(old)!==canon(String(v))){ ts[k]=ready?Date.now():0; saveTs(); if(ready) later(); }
      return;
    }
    return set0.call(this,k,v);
  };
  function later(){ clearTimeout(timer); timer=setTimeout(sync,1500); }
  function editing(){ var a=document.activeElement; return a&&(a.isContentEditable||/INPUT|TEXTAREA/.test(a.tagName)); }
  function recent(){ try{ return JSON.parse(sessionStorage.getItem("sync:rls")||"[]").filter(function(t){ return Date.now()-t<60000; }); }catch(e){ return []; } }
  function waitMs(){ var a=recent(); return a.length?Math.max(0,60000-(Date.now()-a[a.length-1])):0; }
  function doReload(now){
    if(!now&&editing()){ setTimeout(doReload,4000); return; }
    try{ var a=recent(); a.push(Date.now()); sessionStorage.setItem("sync:rls",JSON.stringify(a)); }catch(e){}
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
      return p.then(function(){
        ready=true; var f=first; first=false;
        if(changed&&window.SYNC_NO_RELOAD&&!f){ try{ window.dispatchEvent(new Event("sync-applied")); }catch(e){} }
        if(changed&&!window.SYNC_NO_RELOAD&&!rl){ rl=true;
          if(f&&recent().length<3) doReload(true); else setTimeout(doReload,waitMs());
        } else if(f){
          if(changed){ try{ window.dispatchEvent(new Event("sync-applied")); }catch(e){} }
          requestAnimationFrame(reveal);
        }
      });
    }).catch(function(){ ready=true; if(first){ first=false; reveal(); } }).then(function(){ busy=false; if(again){ again=false; later(); } });
  }
  sync(); setInterval(function(){ if(!document.hidden) sync(); },20000);
  document.addEventListener("visibilitychange",function(){ if(!document.hidden) sync(); });
})();
