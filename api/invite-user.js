module.exports = async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
 const root=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/+$/,'');
 const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
 const auth=req.headers.authorization||'';
 if(!root||!anon||!service) return res.status(503).json({error:'Invite service is not configured yet. SUPABASE_SERVICE_ROLE_KEY is required.'});
 if(!auth.startsWith('Bearer ')) return res.status(401).json({error:'Authentication required'});
 try{
  const userResp=await fetch(root+'/auth/v1/user',{headers:{apikey:anon,authorization:auth}});
  if(!userResp.ok) return res.status(401).json({error:'Invalid session'});
  const user=await userResp.json();
  const profileResp=await fetch(root+`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,display_name`,{headers:{apikey:anon,authorization:auth}});
  const profiles=await profileResp.json();
  const role=String(profiles?.[0]?.role||'').toLowerCase();
  if(!['admin','executive'].includes(role)) return res.status(403).json({error:'Administrator or Executive access required'});
  const {email,name,role:inviteRole}=req.body||{};
  if(!email) return res.status(400).json({error:'Email is required'});
  const r=await fetch(root+'/auth/v1/invite',{method:'POST',headers:{apikey:service,authorization:'Bearer '+service,'content-type':'application/json'},body:JSON.stringify({email,data:{display_name:name||'',requested_role:inviteRole||'employee'}})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) return res.status(r.status).json({error:data.msg||data.message||data.error_description||'Invite failed'});
  return res.status(200).json({ok:true,user_id:data.id||data.user?.id||null,email});
 }catch(e){return res.status(500).json({error:e.message})}
}