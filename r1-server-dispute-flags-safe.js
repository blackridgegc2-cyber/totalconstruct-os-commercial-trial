/* Authenticated read-only bridge from Supabase project flags to trial pay-app guard.
   Never use local browser data as a production authority boundary. */
(()=>{'use strict';
async function refresh(projectId){
 if(!projectId||!/^[-0-9a-f]{36}$/i.test(projectId))throw Error('A persisted project UUID is required');
 const base=window.tcSupabase?.supabaseUrl||window.tcSupabaseUrl||'';
 const key=window.tcSupabase?.publishableKey||window.tcSupabasePublishableKey||'';
 const token=window.tcAuth?.accessToken||'';
 if(!base||!key||!token)throw Error('Authenticated Supabase project connection required');
 const url=base.replace(/\/$/,'')+'/rest/v1/billing_dispute_flags?select=id,project_id,sov_line_id,csi_code,case_reference,status,reason&project_id=eq.'+encodeURIComponent(projectId);
 const r=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+token},cache:'no-store'});
 if(!r.ok)throw Error('Cannot verify billing dispute flags ('+r.status+'); fail closed');
 const data=await r.json();if(!Array.isArray(data))throw Error('Unexpected dispute flag response');
 return data;
}
window.tcServerDisputeFlags={refresh};
})();