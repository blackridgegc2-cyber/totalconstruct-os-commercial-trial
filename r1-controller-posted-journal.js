(()=>{
'use strict';
const el=()=>document.getElementById('tcControllerPostedJournal');
const cfg=()=>window.__TC_SUPABASE__||{};
const root=()=>String(cfg().url||'').replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,'');
const token=()=>localStorage.getItem('tc_access_token')||'';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const usd=n=>Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD'});
let seq=0;
function activeCompany(){
 const project=typeof currentProject==='function'?currentProject():null;
 if(!project||window.tcIsTrainingProject?.(project))return null;
 return project.company_id||project.companyId||null;
}
async function load(){
 const host=el();if(!host)return;
 const company=activeCompany();
 if(!company){host.innerHTML='<div class="callout">Select a production project with an assigned company to view posted accounting journals.</div>';return;}
 const access=token();
 if(!access){host.innerHTML='<div class="callout">Sign in to view authorized company accounting records.</div>';return;}
 const start=document.getElementById('tcJournalFrom')?.value||null;
 const end=document.getElementById('tcJournalTo')?.value||null;
 if(start&&end&&start>end){host.innerHTML='<div class="callout">The start date must be on or before the end date.</div>';return;}
 const n=++seq;host.textContent='Loading posted journal balances…';
 try{
  const response=await fetch(root()+'/rest/v1/rpc/tc_controller_journal_summary',{method:'POST',headers:{apikey:cfg().key||'',Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({p_company_id:company,p_from:start,p_to:end}),cache:'no-store'});
  if(!response.ok){if(response.status===401||response.status===403)throw new Error('Access denied. Confirm your Controller or Accounting company role.');throw new Error('Posted journal summary unavailable (HTTP '+response.status+').');}
  const data=await response.json();if(n!==seq||company!==activeCompany())return;
  const rows=Array.isArray(data.account_balances)?data.account_balances:[];
  host.innerHTML='<div class="grid">'+
   '<div class="card"><strong>Posted batches</strong><div class="value">'+esc(data.posted_batch_count)+'</div></div>'+
   '<div class="card"><strong>Total debits</strong><div class="value">'+usd(data.total_debits)+'</div></div>'+
   '<div class="card"><strong>Total credits</strong><div class="value">'+usd(data.total_credits)+'</div></div></div>'+
   (rows.length?'<div class="table-wrap"><table><thead><tr><th>GL account</th><th>Debits</th><th>Credits</th><th>Net debit</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.account_code)+'</td><td>'+usd(r.debits)+'</td><td>'+usd(r.credits)+'</td><td>'+usd(r.net_debit)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="callout">No posted journals for this company and period. No balances have been inferred or estimated.</div>');
 }catch(e){if(n!==seq)return;host.innerHTML='<div class="callout">'+esc(e.message||'Unable to retrieve accounting data')+'</div>';}
}
function mount(){
 const page=document.getElementById('accountinghub');if(!page||page.dataset.tcJournalMounted)return;
 page.dataset.tcJournalMounted='1';
 const section=document.createElement('div');section.className='card section';section.innerHTML='<h3>Controller · Posted General Ledger</h3><div class="sub">Verified posted journal entries only. Forecasts and unposted charges are excluded.</div><div class="actions section"><label>From <input type="date" id="tcJournalFrom"></label><label>Through <input type="date" id="tcJournalTo"></label><button class="btn" id="tcJournalRefresh">Refresh posted journals</button></div><div id="tcControllerPostedJournal"></div>';
 page.appendChild(section);
 section.querySelector('#tcJournalRefresh').addEventListener('click',load);
 load();
}
let pending=false;
function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;mount()},250)}
document.addEventListener('DOMContentLoaded',schedule);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="accountinghub"]'))setTimeout(()=>{mount();load()},200)});
window.addEventListener('tc:r1-ready',schedule);
schedule();
window.tcPostedJournal={refresh:load};
})();