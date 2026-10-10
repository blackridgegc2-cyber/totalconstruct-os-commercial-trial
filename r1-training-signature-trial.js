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
 const recipients=[{name:'Executive Test Recipient',role:'Executive / Administrator',phone:'+1 (512) 736-1394',email:''}];
 const role=()=>window.tcRoleTest?.isActive?.()?document.getElementById('tcViewAsSelect')?.value||'Actual Login':'Actual Login';
 function render(){
  const host=document.getElementById('payapps');if(!host)return;
  let box=document.getElementById('tcSignatureTrial');
  if(!active()){box?.remove();return}
  if(!box){box=document.createElement('section');box.id='tcSignatureTrial';box.className='card section';host.prepend(box)}
  const d=read(),r=role();
  box.innerHTML='<h3>Signature Acceptance Test — Playground Only</h3><p><strong>'+title+'</strong></p><p>$0.00 · No legal or payment effect · Training only</p><p>Current test role: <strong>'+esc(r)+'</strong></p><p>Test status: <strong>'+esc(d.status||'Not started')+'</strong></p><div class="actions"><button class="btn bronze" id="tcStartSignatureTrial">Request Test Signature</button><button class="btn" id="tcSignSignatureTrial">Try Device Authentication</button><button class="btn" id="tcResetSignatureTrial">Reset Test</button></div><p id="tcSignatureTrialMessage" role="status"></p><small>This is a browser/device capability test only. It does not send an SMS, create a server-verified signature, approve a pay application, or certify a legally binding document.</small>';
  box.querySelector('#tcStartSignatureTrial').onclick=()=>{
   const prior=document.getElementById('tcSignatureRecipientPanel');if(prior){prior.remove();return}
   const panel=document.createElement('div');panel.id='tcSignatureRecipientPanel';panel.className='card section';
   panel.innerHTML='<h4>Send Pay Application for Signature — Recipient</h4><p>Choose a project recipient or enter a test destination. QR + phone passkey is the preferred method. Secure QR issuance and verification are not enabled yet.</p><label>Recipient <select id="tcSigRecipient"><option value="executive">Executive Test Recipient — +1 (512) 736-1394</option><option value="owner">Owner (enter contact details)</option><option value="lender">Lender (enter contact details)</option><option value="architect">Architect (enter contact details)</option><option value="other">Other authorized recipient</option></select></label><label>Recipient name <input id="tcSigName" value="Executive Test Recipient"></label><label>Mobile number <input id="tcSigPhone" type="tel" value="+1 (512) 736-1394"></label><label>Email address <input id="tcSigEmail" type="email" placeholder="Optional email destination"></label><label>Delivery method <select id="tcSigMethod"><option value="qr">QR code + phone passkey (preferred)</option><option value="email">Email signing link (backup)</option><option value="sms">SMS signing link (backup)</option></select></label><div class="actions"><button class="btn bronze" id="tcSigQueue">Save Signing Method (Not Sent)</button><button class="btn" id="tcSigCancel">Cancel</button></div><p id="tcSigRecipientStatus" role="status"></p>';
   box.querySelector('.actions').after(panel);
   panel.querySelector('#tcSigRecipient').onchange=e=>{
    const v=e.target.value,p=recipients[0];
    panel.querySelector('#tcSigName').value=v==='executive'?p.name:'';
    panel.querySelector('#tcSigPhone').value=v==='executive'?p.phone:'';
   };
   panel.querySelector('#tcSigCancel').onclick=()=>panel.remove();
   panel.querySelector('#tcSigQueue').onclick=()=>{
    const name=panel.querySelector('#tcSigName').value.trim(),phone=panel.querySelector('#tcSigPhone').value.trim(),email=panel.querySelector('#tcSigEmail').value.trim(),method=panel.querySelector('#tcSigMethod').value;
    if(!name||(method==='sms'&&!/^\\+?[0-9() .-]{7,22}$/.test(phone))||(method==='email'&&!email.includes('@'))){panel.querySelector('#tcSigRecipientStatus').textContent='Enter recipient name and a valid '+(method==='sms'?'mobile number':'email address')+'.';return}
    save({status:method==='qr'?'QR signing selected — secure signing service pending':'Recipient selected — NOT SENT',recipient:{name,phone,email,method,role:panel.querySelector('#tcSigRecipient').value},requestedAt:new Date().toISOString()});render();
   };
  };
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