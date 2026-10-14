(()=>{
'use strict';
const cfg=()=>window.__TC_SUPABASE__||{};
const api=()=>String(cfg().url||'').replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,'')+'/rest/v1/rpc/';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const company=()=>{const p=typeof currentProject==='function'?currentProject():null;return p&&!window.tcIsTrainingProject?.(p)?p.company_id||p.companyId:null};
const money=v=>Number(v||0).toLocaleString('en-US',{style:'currency',currency:'USD'});
async function rpc(name,body){const token=localStorage.getItem('tc_access_token');if(!token)throw Error('Sign in required');const r=await fetch(api()+name,{method:'POST',headers:{apikey:cfg().key||'',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});if(!r.ok){let m='Request failed ('+r.status+')';try{const x=await r.json();m=x.message||m}catch{}throw Error(m)}return r.json()}
let sequence=0;
async function refresh(){
 const host=document.getElementById('tcJournalQueue');if(!host)return;
 const cid=company();if(!cid){host.textContent='Select a production project with a company to review journals.';return}
 const s=++sequence;host.textContent='Loading draft and approved journals…';
 try{const rows=await rpc('tc_list_journal_workqueue',{p_company_id:cid,p_limit:50});if(s!==sequence||company()!==cid)return;
 host.innerHTML=rows.length?'<div class="table-wrap"><table><thead><tr><th>Posting date</th><th>Source</th><th>Status</th><th>Debits</th><th>Credits</th><th>Actions</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.posting_date)+'</td><td>'+esc(x.source_type)+' · '+esc(x.description||'')+'</td><td>'+esc(x.status)+'</td><td>'+money(x.total_debits)+'</td><td>'+money(x.total_credits)+'</td><td><button class="btn" data-journal-detail="'+esc(x.id)+'">Review</button></td></tr>').join('')+'</tbody></table></div>':'<div class="callout">No journals awaiting approval or posting.</div>';
 }catch(e){if(s===sequence)host.textContent=e.message}
}
async function detail(id){
 const host=document.getElementById('tcJournalDetail');if(!host)return;host.textContent='Loading journal detail…';
 try{const d=await rpc('tc_get_journal_detail',{p_batch_id:id});const b=d.batch;
 host.innerHTML='<h4>Journal '+esc(b.id)+'</h4><p>'+esc(b.description||'')+' · '+esc(b.status)+'</p><div class="table-wrap"><table><thead><tr><th>GL account</th><th>Project</th><th>CSI</th><th>Debit</th><th>Credit</th></tr></thead><tbody>'+d.lines.map(x=>'<tr><td>'+esc(x.gl_account)+'</td><td>'+esc(x.project_id||'—')+'</td><td>'+esc(x.csi_code||'—')+'</td><td>'+money(x.debit)+'</td><td>'+money(x.credit)+'</td></tr>').join('')+'</tbody></table></div><div class="actions">'+(b.status==='draft'?'<button class="btn primary" data-journal-action="approve" data-id="'+esc(b.id)+'">Approve</button>':'')+(b.status==='approved'?'<button class="btn primary" data-journal-action="post" data-id="'+esc(b.id)+'">Post</button>':'')+'</div><p class="sub">The creator cannot approve their own journal, and the approver cannot post it. Server-side permissions enforce these rules.</p>';
 }catch(e){host.textContent=e.message}
}
async function act(id,action,button){
 if(!window.confirm('Confirm '+action+' journal '+id+'? This action is audited and may be irreversible.'))return;
 button.disabled=true;
 try{await rpc('tc_process_journal_batch',{p_batch_id:id,p_action:action});await refresh();await detail(id);window.tcPostedJournal?.refresh?.()}catch(e){window.alert(e.message)}finally{button.disabled=false}
}
function mount(){
 const page=document.getElementById('accountinghub');if(!page)return;
 if(document.getElementById('tcJournalQueue'))return;
 const box=document.createElement('section');box.className='card section';box.innerHTML='<h3>Journal Approval & Posting</h3><div class="sub">Company-scoped financial workqueue. Review all lines before approval or posting.</div><div class="actions section"><button class="btn" id="tcQueueRefresh">Refresh workqueue</button></div><div id="tcJournalQueue"></div><div id="tcJournalDetail" class="section"></div>';
 page.appendChild(box);
 box.querySelector('#tcQueueRefresh').addEventListener('click',refresh);
 box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.journalDetail)detail(b.dataset.journalDetail);if(b.dataset.journalAction)act(b.dataset.id,b.dataset.journalAction,b)});
 refresh();
}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;mount()},300)}
document.addEventListener('DOMContentLoaded',schedule);window.addEventListener('tc:r1-ready',schedule);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="accountinghub"]'))setTimeout(()=>{mount();refresh()},250)});
schedule();window.tcJournalWorkqueue={refresh};
})();