(()=>{
 'use strict';
 const config=()=>window.__TC_SUPABASE__||{};
 const root=()=>String(config().url||'').replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,'');
 const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
 const headers=()=>({apikey:config().key||'',Authorization:'Bearer '+(localStorage.getItem('tc_access_token')||''),'Content-Type':'application/json'});
 const notify=(message,type='error')=>window.tcNotify?.(message,{type,title:'User Profile'})||console.log(message);
 let records=[];
 async function request(path,opts={}){
  const response=await fetch(root()+'/rest/v1/'+path,{...opts,headers:{...headers(),...(opts.headers||{})}});
  if(!response.ok){const body=await response.text();throw Error('Profile service: '+response.status+' '+body.slice(0,240))}
  return response.status===204?[]:response.json();
 }
 function authenticated(){return typeof currentUser!=='undefined'&&currentUser&&currentUser.permissions?.includes('all')}
 function myId(){return typeof currentUser!=='undefined'?currentUser?.id:null}
 async function load(){
  if(!authenticated())return;
  records=await request('profiles?select=id,email,first_name,last_name,display_name,title,phone,role,active&order=display_name.asc');
  draw();
 }
 function draw(){
  const host=document.getElementById('access');if(!host||!authenticated())return;
  let panel=host.querySelector('#tcUserProfileEditor');
  if(!panel){panel=document.createElement('section');panel.id='tcUserProfileEditor';panel.className='card section';host.prepend(panel)}
  panel.innerHTML='<h3>Manage User Profiles</h3><p>Executive / Admin · Edit contact details and signing destination. Access changes remain subject to server authorization.</p><label for="tcProfilePick">Select user</label> <select id="tcProfilePick">'+records.map(p=>'<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.display_name||p.email||p.id)+'</option>').join('')+'</select> <button class="btn" id="tcProfileRefresh">Refresh</button><div id="tcProfileFields"></div>';
  panel.querySelector('#tcProfileRefresh').onclick=()=>load().catch(e=>notify(e.message));
  const picker=panel.querySelector('#tcProfilePick');
  picker.value=records.find(p=>p.id===myId())?.id||records[0]?.id||'';
  picker.onchange=fill;
  fill();
 }
 function fill(){
  const p=records.find(x=>x.id===document.getElementById('tcProfilePick')?.value);
  const host=document.getElementById('tcProfileFields');if(!host||!p)return;
  host.innerHTML='<form id="tcProfileForm"><div class="grid cols-3">'+
   [['first_name','First name'],['last_name','Last name'],['display_name','Display name'],['title','Job title'],['phone','Mobile / signature authentication number']].map(([key,label])=>'<label>'+label+'<input name="'+key+'" value="'+escapeHtml(p[key]||'')+'" style="width:100%;padding:9px;margin-top:5px" /></label>').join('')+
   '</div><p>Email: <strong>'+escapeHtml(p.email)+'</strong> · Role: <strong>'+escapeHtml(p.role)+'</strong></p><button type="submit" class="btn primary">Save Profile</button><p id="tcProfileSaveStatus" role="status"></p></form>';
  host.querySelector('form').onsubmit=async e=>{
   e.preventDefault();
   const status=host.querySelector('#tcProfileSaveStatus');
   const fields=Object.fromEntries(new FormData(e.target));
   const phone=String(fields.phone||'').trim();
   if(phone&&!/^\+?[0-9() .-]{7,22}$/.test(phone)){status.textContent='Enter a valid mobile number, including country code.';return}
   const payload={first_name:fields.first_name.trim(),last_name:fields.last_name.trim(),display_name:fields.display_name.trim(),title:fields.title.trim(),phone};
   status.textContent='Saving…';
   try{
    const updated=await request('profiles?id=eq.'+encodeURIComponent(p.id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
    if(!updated.length)throw Error('No profile was updated. Check administrator permissions.');
    Object.assign(p,updated[0]);
    status.textContent='Saved to user profile.';
    notify('User profile updated','success');
   }catch(err){status.textContent=err.message}
  };
 }
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="access"],[data-jump="access"]'))setTimeout(()=>load().catch(err=>notify(err.message)),200)},true);
 document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{if(document.getElementById('access')?.offsetParent)load().catch(err=>notify(err.message))},1000));
 window.tcUserProfiles={load};
})();