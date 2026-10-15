/* Pure scope matching. Ambiguous descriptions never select a code automatically. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.tcCostMatcher=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 const stop=new Set(['and','or','the','of','for','to','a','an','with','work','scope','install','installation','provide']);
 const aliases={drywall:['gypsum','board'],hvac:['heating','ventilating','air','conditioning'],demo:['demolition'],rebar:['reinforcing','steel'],ac:['air','conditioning']};
 function match(codes,query,limit=30){
  const q=normalize(query);if(!q)return {matches:[],auto:null,total:0};
  const exactCode=codes.filter(r=>normalize(r.code)===q);if(exactCode.length===1)return {matches:exactCode,total:1,auto:exactCode[0]};
  const exact=codes.filter(r=>normalize(r.description)===q||normalize(r.code)===q);
  const words=q.split(' ').filter(w=>!stop.has(w)),expanded=[...new Set(words.flatMap(w=>aliases[w]||[w]))];
  const ranked=codes.map(r=>{const d=normalize(r.description),tokens=d.split(' ');let score=0;if(exact.includes(r))score=10000;else if(d.includes(q))score=200+q.length;else{const hits=expanded.filter(w=>tokens.some(t=>t===w||t.startsWith(w)&&w.length>=4));if(hits.length)score=hits.length/Math.max(1,expanded.length)*100+hits.length;}return{...r,score};}).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.code.localeCompare(b.code));
  return {matches:ranked.slice(0,limit),total:ranked.length,auto:exact.length===1&&ranked.length===1?exact[0]:null};
 }
 function suggestType(scope,row){const text=normalize(scope);if(/\b(labor|labour|crew|manhours)\b/.test(text))return 'LAB';if(/\b(material|materials|supply only)\b/.test(text))return 'MAT';if(/\b(equipment rental|crane rental|equipment hire)\b/.test(text))return 'EQUIP';return row.default_type;}
 return {normalize,match,suggestType};
});
