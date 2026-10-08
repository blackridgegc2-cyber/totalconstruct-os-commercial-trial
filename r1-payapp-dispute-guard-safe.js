/* Pay-app dispute flag integration for the existing trial screen.
   UI guard only: production must repeat validation in authenticated server transaction. */
(()=>{'use strict';
const STORE='tc_dispute_billing_flags_v1';
function read(){try{const x=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(x)?x:[]}catch{return []}}
function relevant(p){return read().filter(f=>f.projectId===p.id||f.projectId===p.name)}
function project(){try{return typeof currentProject==='function'?currentProject():null}catch{return null}}
function rows(p){try{return state?.payapps?.[p.name]?.rows||[]}catch{return []}}
function inspect(){const p=project();if(!p||!window.tcDisputeBilling)return {blocked:true,unresolved:[],error:'Billing guard unavailable'};const flags=relevant(p).map(f=>({...f,projectId:p.id}));return window.tcDisputeBilling.preflight({projectId:p.id,rows:rows(p),flags})}
function render(){const host=document.querySelector('#payapps'),button=document.querySelector('#finalPA');if(!host||!button)return;
 const result=inspect(),old=document.querySelector('#tc-dispute-billing-warning');if(old)old.remove();
 if(result?.error){button.disabled=true;const card=document.createElement('div');card.id='tc-dispute-billing-warning';card.className='card section';card.textContent='Pay Application finalization disabled: dispute validation unavailable.';host.insertBefore(card,host.firstChild);return}if(!result?.unresolved?.length){button.disabled=false;button.removeAttribute('aria-describedby');return}
 const card=document.createElement('div');card.id='tc-dispute-billing-warning';card.className='card section';card.setAttribute('role','alert');
 card.style.border='2px solid #ad7318';const heading=document.createElement('h3');heading.textContent='Billing review required — subcontract dispute';card.appendChild(heading);
 const explanation=document.createElement('p');explanation.textContent='Affected SOV entries require documented PM confirmation. A subcontract payment dispute is not automatically an Owner billing hold.';card.appendChild(explanation);
 for(const item of result.unresolved){const line=document.createElement('p');line.textContent='SOV '+item.sov+': '+item.status+' — case '+item.cases.join(', ');card.appendChild(line)}
 host.insertBefore(card,host.firstChild);button.disabled=true;button.setAttribute('aria-describedby',card.id);
}
function install(){if(window.__tcDisputeBillingScreenInstalled)return;window.__tcDisputeBillingScreenInstalled=true;
 document.addEventListener('click',e=>{const btn=e.target.closest?.('#finalPA');if(!btn)return;const r=inspect();if(!r||r.blocked){e.preventDefault();e.stopImmediatePropagation();alert('Pay app cannot be finalized until flagged SOV lines receive documented PM review.');render()}},true);
 const root=document.querySelector('#payapps');if(root){const observer=new MutationObserver(()=>{if(!document.querySelector('#tc-dispute-billing-warning'))render()});observer.observe(root,{childList:true});}
 document.addEventListener('tc:billing-flags-changed',render);render();
}
window.tcPayappDisputeGuard={read,inspect,render,install};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();