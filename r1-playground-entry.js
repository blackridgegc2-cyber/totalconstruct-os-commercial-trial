(()=>{
  if(window.tcPlaygroundControlsInstalled)return;
  window.tcPlaygroundControlsInstalled=true;
  window.tcPlaygroundMode=false;
  function update(){
    const select=document.getElementById('projectSelect');
    if(!select||!window.currentUser||!Array.isArray(window.currentUser.permissions)||!window.currentUser.permissions.includes('all'))return;
    if(document.getElementById('tcPlaygroundToggle'))return;
    const btn=document.createElement('button');
    btn.id='tcPlaygroundToggle';btn.type='button';
    btn.style.cssText='margin-left:8px;padding:9px 12px;border:1px solid #dba552;border-radius:6px;background:#f3ba58;color:#17222b;font-weight:700;cursor:pointer';
    btn.onclick=()=>{
      window.tcPlaygroundMode=!window.tcPlaygroundMode;
      btn.textContent=window.tcPlaygroundMode?'Exit Playground':'Enter Playground';
      btn.setAttribute('aria-pressed',String(window.tcPlaygroundMode));
      if(typeof syncProjectSelect==='function')syncProjectSelect();
      if(typeof renderNav==='function')renderNav();
      if(typeof renderAll==='function')renderAll();
      if(typeof refreshBanner==='function')refreshBanner();
    };
    btn.textContent='Enter Playground';btn.setAttribute('aria-pressed','false');
    select.insertAdjacentElement('afterend',btn);
  }
  document.addEventListener('DOMContentLoaded',update);
  setTimeout(update,1000);
  new MutationObserver(update).observe(document.documentElement,{childList:true,subtree:true});
})();