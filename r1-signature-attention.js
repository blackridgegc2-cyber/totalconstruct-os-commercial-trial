(()=>{
'use strict';
const TEST_PROJECT='3beb7e43-ba37-4fb0-859e-12d874f7e705';
const TEST_DOC='847e3f81-a2aa-41a3-a48b-d0d43d304ab6';
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function root(){return String(window.__TC_SUPABASE__?.url||'').replace(/\\/+$/,'').replace(/\\/(rest\\/v1|auth\\/v1)$/i,'')}
function token(){return localStorage.getItem('tc_access_token')||''}
function notice(){let el=document.getElementById('tcSignatureAttention');if(el)return el;el=document.createElement('aside');el.id='tcSignatureAttention';el.setAttribute('role','status');el.style.cssText='position:fixed;bottom:20px;right:20px;z-index:9990;background:#fff;color:#182c39;border:2px solid #b9792f;border-radius:12px;box-shadow:0 14px 35px #0003;padding:16px;width:min(390px,calc(100vw - 24px));font:14px/1.5 Arial,sans-serif';document.body.appendChild(el);return el}
async function show(){const el=document.getElementById('tcSignatureAttention');if(!token()||!root()){el?.remove();return}try{
 const u=root();const headers={apikey:window.__TC_SUPABASE__?.key||'',Authorization:'Bearer '+token()};
 const r=await fetch(u+'/rest/v1/documents?id=eq.'+TEST_DOC+'&project_id=eq.'+TEST_PROJECT+'&select=id,title,status,metadata&limit=1',{headers});if(!r.ok){el?.remove();return}
 const docs=await r.json();const d=docs?.[0];if(!d||d.metadata?.test_only!==true||d.metadata?.signing_status!=='NOT_CONFIGURED'){el?.remove();return}
 const box=notice();box.innerHTML='<strong style="font-size:16px">Document requires signature — test</strong><div style="margin:7px 0">'+escapeHtml(d.title)+'</div><div style="font-size:12px;color:#9a6812;margin-bottom:10px">Signature verification is not yet enabled. This is a test document only.</div><button type="button" id="tcReviewSignatureTest" style="background:#172b39;color:white;border:0;border-radius:7px;padding:10px 13px;cursor:pointer">Review document</button> <button type="button" id="tcDismissSignatureTest" style="background:transparent;border:1px solid #ccc;border-radius:7px;padding:9px;cursor:pointer">Dismiss</button>';
 box.querySelector('#tcReviewSignatureTest').onclick=()=>{box.innerHTML='<strong>Signature test document</strong><p>'+escapeHtml(d.title)+'</p><p>Project: TotalConstruct Training / Sample Project (TRN-001)</p><p>Amount: $0.00 — no legal or payment effect.</p><p><strong>Signing unavailable:</strong> Phone OTP and device passkey verification must be installed before signing is enabled.</p><button type="button" id="tcCloseSignatureTest">Close</button>';box.querySelector('#tcCloseSignatureTest').onclick=()=>box.remove()};
 box.querySelector('#tcDismissSignatureTest').onclick=()=>box.remove();
 }catch(e){el?.remove();console.warn('Signature test notice unavailable',e)}}
window.tcRefreshSignatureAttention=show;
addEventListener('DOMContentLoaded',()=>{setTimeout(show,2500);setInterval(show,60000)});
})();
