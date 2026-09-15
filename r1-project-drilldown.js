(()=>{
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  function visible(){try{return typeof visibleProjects==='function'?visibleProjects():((state&&state.projects)||[])}catch(e){return (state&&state.projects)||[]}}
  function findProjectFromElement(el){
    const direct=el?.dataset?.project||el?.closest?.('[data-project]')?.dataset?.project;
    if(direct){const p=(state.projects||[]).find(x=>String(x.id)===String(direct)||String(x.name)===String(direct));if(p)return p}
    const text=(el?.textContent||'').trim().toLowerCase();
    return visible().find(p=>text.includes(String(p.name||'').toLowerCase())||text.includes(String(p.job||'').toLowerCase()));
  }
  function openProject(p){
    if(!p)return false;
    const allowed=visible().some(x=>String(x.id)===String(p.id));if(!allowed)return false;
    const sel=$('#projectSelect');if(sel){sel.value=p.id;sel.dispatchEvent(new Event('change',{bubbles:true}))}
    if(typeof openPage==='function')openPage('home');
    try{window.tcCloud?.loadSnapshot?.(true)}catch(e){console.warn('Project drilldown cloud load failed',e)}
    return true;
  }
  function mark(el,p){if(!el||!p||el.dataset.tcProjectDrill==='1')return;el.dataset.tcProjectDrill='1';el.dataset.project=p.id;el.classList.add('clickable');el.setAttribute('role','button');el.setAttribute('tabindex','0');el.title=`Open ${p.name}`;const go=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();openProject(p)};el.addEventListener('click',go);el.addEventListener('keydown',go)}
  function wire(){
    $$('#home tr[data-project]').forEach(el=>{const p=findProjectFromElement(el);if(p)mark(el,p)});
    $$('#projectboard .project-card').forEach(el=>{const p=findProjectFromElement(el);if(p)mark(el,p)});
    $$('#projectboard table tbody tr').forEach(el=>{const p=findProjectFromElement(el);if(p)mark(el,p)});
    // Generic executive/company tables: only mark rows where a visible project name or job number is clearly present.
    ['#wip','#fees','#resources','#companyhealth','#controller','#capitalplan'].forEach(root=>{$$(`${root} tbody tr`).forEach(el=>{const p=findProjectFromElement(el);if(p)mark(el,p)})});
  }
  window.tcOpenProject=openProject;
  new MutationObserver(wire).observe(document.documentElement,{subtree:true,childList:true});
  addEventListener('DOMContentLoaded',wire);setTimeout(wire,400);setTimeout(wire,1200);
})();
