(()=>{
'use strict';
const PROJECT='3beb7e43-ba37-4fb0-859e-12d874f7e705';
const base='https://swabdflpuvhsrqktvbaa.supabase.co/functions/v1/tc-playground-signing';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const token=()=>localStorage.getItem('tc_access_token')||'';
const req=async(body)=>{const r=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'Signing service error');return data};
const active=()=>window.tcPlaygroundMode===true&&typeof currentProject==='function'&&currentProject()?.id===PROJECT;
let latest=null,poll=null;
function render(){
 const host=document.getElementById('payapps');if(!host)return;
 let box=document.getElementById('tcSignatureTrial');if(!active()){box?.remove();if(poll)clearInterval(poll);return}
 if(!box){box=document.createElement('section');box.id='tcSignatureTrial';box.className='card section';host.prepend(box)}
 box.innerHTML='<h3>Playground — QR Signing Acceptance Test</h3><p><strong>TEST ONLY — $0.00</strong> · No payment or legal effect.</p><p>This exercises server-generated QR requests, document integrity, expiration and the audit trail. <strong>Identity is not biometrically verified; do not use for live pay applications.</strong></p><div class="actions"><button class="btn bronze" id="tcStartSignatureTrial">Generate Test QR</button><button class="btn" id="tcResetSignatureTrial">Reset View</button></div><div id="tcSigDetails" role="status"></div>';
 box.querySelector('#tcStartSignatureTrial').onclick=async()=>{
  const detail=box.querySelector('#tcSigDetails');
  const name=prompt('Test recipient name (must type this exact name on phone):','Executive Test Recipient');if(!name)return;
  detail.textContent='Creating five-minute signing request…';
  try{
   latest=await req({action:'create',project_id:PROJECT,method:'qr',recipient_name:name,recipient_phone:'+1 (512) 736-1394'});
   const url=new URL('/sign-test.html',location.origin);url.searchParams.set('token',latest.token);
   const qr='https://api.qrserver.com/v1/create-qr-code/?size=240x240&data='+encodeURIComponent(url.toString());
   detail.innerHTML='<p><strong>Scan with your phone</strong> — expires '+esc(new Date(latest.expires_at).toLocaleTimeString())+'</p><img alt="Five-minute test signing QR" width="240" height="240" referrerpolicy="no-referrer" src="'+esc(qr)+'"><p><a href="'+esc(url.toString())+'" target="_blank" rel="noopener noreferrer">Open test signing page</a></p><p id="tcSigStatus">Awaiting explicit signature on phone…</p><button class="btn" id="tcRevokeSig">Revoke request</button>';
   detail.querySelector('#tcRevokeSig').onclick=async()=>{try{await req({action:'revoke',id:latest.id});detail.querySelector('#tcSigStatus').textContent='Revoked';clearInterval(poll)}catch(e){detail.querySelector('#tcSigStatus').textContent=e.message}};
   if(poll)clearInterval(poll);
   poll=setInterval(async()=>{try{const d=await req({action:'status',id:latest.id});const el=document.getElementById('tcSigStatus');if(el)el.textContent=d.status==='signed'?'TEST SIGNED — server audit recorded':d.status==='pending'?'Awaiting explicit signature on phone…':d.status;if(d.status!=='pending'){clearInterval(poll);poll=null}}catch(e){const el=document.getElementById('tcSigStatus');if(el)el.textContent='Status check: '+e.message}},3000);
  }catch(e){detail.textContent='Could not create test QR: '+e.message}
 };
 box.querySelector('#tcResetSignatureTrial').onclick=()=>{if(poll)clearInterval(poll);poll=null;latest=null;render()};
}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="payapps"],[data-jump="payapps"]'))setTimeout(render,250)},true);
document.addEventListener('change',e=>{if(['projectSelect','tcViewAsSelect'].includes(e.target.id))setTimeout(render,200)});
addEventListener('tc:r1-ready',()=>setTimeout(render,200));setTimeout(render,1500);
window.tcRenderSignatureTrial=render;
})();