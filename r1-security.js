(()=>{
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const sensitive={
  controllercpa:['all','accounting'],capitalplanning:['all'],workspace:['all'],storagevault:['all'],legalreview:['all'],access:['all'],audit:['all'],employees:['all','employees_cost'],accountinghub:['all','accounting']
 };
 function perms(){return currentUser?.permissions||[]}
 function hasAny(list){const p=perms();return p.includes('all')||list.some(x=>p.includes(x))}
 function guard(){
  for(const [id,need] of Object.entries(sensitive)){
   const page=$('#'+id);if(!page)continue;
   const ok=hasAny(need);
   const nav=$$(`.nav[data-page="${id}"], [data-jump="${id}"]`);
   nav.forEach(n=>{n.style.display=ok?'':'none';n.setAttribute('aria-hidden',ok?'false':'true')});
   if(!ok&&page.classList.contains('active')){
    page.innerHTML='<div class="head"><div><h1>Restricted</h1><div class="sub">Your role does not have access to this company-level function.</div></div></div><div class="card">Contact a company Administrator if this access is required.</div>';
   }
  }
  $$('[data-sensitive-action]').forEach(b=>{const need=(b.dataset.sensitiveAction||'all').split(',');const ok=hasAny(need);b.disabled=!ok;b.title=ok?'':'Insufficient permission';});
 }
 new MutationObserver(()=>{try{guard()}catch(e){console.warn('R1 security guard',e)}}).observe(document.documentElement,{subtree:true,childList:true});
 addEventListener('DOMContentLoaded',()=>setTimeout(guard,600));setInterval(guard,4000);
})();