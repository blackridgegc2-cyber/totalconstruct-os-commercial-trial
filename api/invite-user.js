module.exports = async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
 const raw=(process.env.NEXT_PUBLIC_SUPABASE_URL||'');
 const root=String(raw).replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,'');
 const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
 const auth=req.headers.authorization||'';
 if(!root||!anon) return res.status(503).json({error:'Supabase is not configured.'});
 if(!auth.startsWith('Bearer ')) return res.status(401).json({error:'Authentication required'});
 try{
  const {email,name,role,project_id,subcontractor_id}=req.body||{};
  if(!email) return res.status(400).json({error:'Email is required'});
  const isSub=!!subcontractor_id;
  const roleMap={'Project Manager':'pm','APM / Project Engineer':'apm','Superintendent':'superintendent','Accounting / Controller':'accounting','Estimator / Preconstruction':'employee','Safety':'safety','Field Employee':'employee','Executive / Operations':'executive','Read Only / Auditor':'employee','Admin':'admin','Executive':'executive','PM':'pm','APM':'apm','Employee':'employee'};
  const normalized=isSub?'subcontractor':(roleMap[role]||String(role||'employee').toLowerCase().replace(/[^a-z_]/g,'_'));
  if(isSub&&!project_id)return res.status(400).json({error:'Project is required for a subcontractor portal invitation.'});
  const r=await fetch(root+'/functions/v1/invite-employee',{method:'POST',headers:{apikey:anon,authorization:auth,'content-type':'application/json'},body:JSON.stringify({email,full_name:name||'',role:normalized,project_id:project_id||null,subcontractor_id:subcontractor_id||null})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) return res.status(r.status).json({error:data.error||data.message||'Invite failed'});
  return res.status(200).json(data);
 }catch(e){return res.status(500).json({error:e.message})}
};
