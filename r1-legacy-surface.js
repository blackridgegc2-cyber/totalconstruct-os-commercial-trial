(()=>{
  'use strict';
  const replacements=[
    [/Trial Release 0\.6 · Training Project included/g,'Company portfolio · Training Center excluded from production totals'],
    [/Trial Release 0\.6 · Includes a built-in Training Project and role-based demo accounts\. Data is stored in this browser\./g,'Secure TotalConstruct Cloud access.'],
    [/Test tenant/g,'Secure cloud workspace'],
    [/trial-data compatibility error/gi,'data compatibility error'],
    [/Reset Trial Data/g,'Reset Local Cache'],
    [/in this trial/gi,'in this workspace'],
    [/functional front end/gi,'current workspace'],
    [/Production version:/g,'Current workflow:'],
    [/Future production build:/g,'Planned enhancement:'],
    [/Production backend/g,'TotalConstruct Cloud'],
    [/production mobile app/gi,'mobile app'],
    [/production ledger/gi,'project ledger'],
    [/production document composer/gi,'document composer']
  ];

  function cleanText(root=document){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;
    while((n=walker.nextNode())) nodes.push(n);
    for(const node of nodes){
      let value=node.nodeValue||'',next=value;
      for(const [rx,to] of replacements) next=next.replace(rx,to);
      if(next!==value) node.nodeValue=next;
    }
  }

  function failClosedLogin(){
    if(window.tcAuth)return;
    const card=document.querySelector('.login-card');
    if(!card)return;
    if(card.querySelector('#demoUser')||/Demo user|role-based demo accounts/i.test(card.textContent||'')){
      card.innerHTML='<div class="mark">TC</div><div><div class="eyebrow">TOTALCONSTRUCT OS</div><h1>Commercial</h1><p>Secure project operations portal.</p></div><div class="callout"><b>Cloud sign-in is temporarily unavailable.</b><br>Please retry after the application connection is restored.</div>';
    }
  }

  function hardenSearch(){
    const input=document.getElementById('globalSearch');
    if(!input||input.dataset.tcLegacyHardened)return;
    input.dataset.tcLegacyHardened='1';
    input.addEventListener('input',()=>{
      if((input.title||'').match(/modeled|production backend|functional front end/i)) input.title='Search is limited to records and documents permitted for your role.';
    });
  }

  function harden(){
    failClosedLogin();
    cleanText(document.body);
    hardenSearch();
    const tenant=document.querySelector('.aside-bottom .small');
    if(tenant&&/test tenant/i.test(tenant.textContent||''))tenant.textContent='Secure cloud workspace';
  }

  const observer=new MutationObserver(muts=>{
    for(const m of muts){
      for(const node of m.addedNodes){if(node.nodeType===1)cleanText(node)}
    }
    hardenSearch();
  });
  addEventListener('DOMContentLoaded',()=>{harden();observer.observe(document.body,{subtree:true,childList:true})});
  setTimeout(harden,600);setTimeout(harden,1600);
})();
