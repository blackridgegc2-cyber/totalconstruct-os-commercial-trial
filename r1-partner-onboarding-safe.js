/* Shared partner directory: refuse local-only vendor/subcontractor creation. */
(()=>{'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validate(d){
 if(!['vendor','subcontractor'].includes(d.type))throw Error('Invalid partner type');
 if(!UUID.test(String(d.companyId||'')))throw Error('Persistent company ID required');
 const name=String(d.name||'').trim();
 if(name.length<2||name.length>180)throw Error('Company name required (2–180 characters)');
 const email=String(d.email||'').trim();
 if(email&&(!email.includes('@')||email.length>254))throw Error('Invalid email');
 return {...d,name,email};
}
async function create(d){
 const input=validate(d),api=window.tcCloud;
 if(!api?.createPartner||!api?.getPartner)throw Error('Authenticated partner database is unavailable');
 const saved=await api.createPartner(input);
 if(!saved||!UUID.test(String(saved.id||'')))throw Error('Partner was not saved');
 const verified=await api.getPartner(saved.id);
 if(!verified||verified.id!==saved.id||verified.name!==input.name)throw Error('Partner read-after-write verification failed');
 return verified;
}
window.tcPartnerOnboarding={validate,create};
})();