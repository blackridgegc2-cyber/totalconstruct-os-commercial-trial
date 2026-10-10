(()=>{
 'use strict';
 const TEST_ID='3beb7e43-ba37-4fb0-859e-12d874f7e705';
 const title='TEST ONLY — G702 Pay Application Digital Signature Trial';
 const key='tc:training-signature-trial:v1';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
 const project=()=>typeof currentProject==='function'?currentProject():null;
 const active=()=>window.tcPlaygroundMode===true&&project()?.id===TEST_ID;
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}};
 const save=d=>localStorage.setItem(key,JSON.stringify(d));
 const role=()=>window.tcRoleTest?.isActive?.()?document.getElementById('tcViewAsSelect')?.value||'Actual Login':'Actual Login';
 function render(){
  const host=document.getElementById('payapps');if(!host)return;
  let box=document.getElementById('tcSignatureTrial');
  if(!active()){box?.remove();return}
  if(!box){box=document.createElement('section');box.id='tcSignatureTrial';box.className='card section';host.prepend(box)}
  const d=read(),r=role();
  box.innerHTML='<h3>Signature Acceptance Test — Playground Only</h3><p><strong>'+title+'</strong></p><p>$0.00 · No legal or payment effect · Training only</p><p>Current test role: <strong>'+esc(r)+'</strong></p><p>Test status: <strong>'+esc(d.status||'Not started')+'</strong></p><div class="actions"><button class="btn bronze" id="tcStartSignatureTrial">Request Test Signature</button><button class="btn" id="tcSignSignatureTrial">Try Device Authentication</button><button class="btn" id="tcResetSignatureTrial">Reset Test</button></div><p id="tcSignatureTrialMessage" role="status"></p><small>This is a browser/device capability test only. It does not send an SMS, create a server-verified signature, approve a pay application, or certify a legally binding document.</small>';
  box.querySelector('#tcStartSignatureTrial').onclick=()=>{save({status:'Awaiting device-authentication test',requestedAt:new Date().toISOString()});render()};
  box.querySelector('#tcResetSignatureTrial').onclick=()=>{localStorage.removeItem(key);render()};
  box.querySelector('#tcSignSignatureTrial').onclick=async()=>{
    const msg=document.getElementById('tcSignatureTrialMessage');
    if(!window.PublicKeyCredential||!navigator.credentials){msg.textContent='WebAuthn is unavailable in this browser or context.';return}
    if(!window.isSecureContext){msg.textContent='Secure HTTPS is required.';return}
    try{
      const available=await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if(!available){msg.textContent='No platform authenticator detected. Configure Windows Hello or a phone passkey to continue.';return}
      msg.textContent='Device authentication is available. A server-issued challenge and registered credential are required before an actual signing prompt can be completed.';
      save({...read(),status:'Device authenticator available; server signing not configured',checkedAt:new Date().toISOString()});
    }catch(e){msg.textContent='Device capability check failed: '+e.message}
  };
 }
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="payapps"],[data-jump="payapps"]'))setTimeout(render,180)},true);
 document.addEventListener('change',e=>{if(e.target.id==='tcViewAsSelect'||e.target.id==='projectSelect')setTimeout(render,150)});
 addEventListener('tc:r1-ready',()=>setTimeout(render,180));setTimeout(render,1200);
 window.tcRenderSignatureTrial=render;
})();