(() => {
  const cfg=window.__TC_SUPABASE__||{};
  const ROOT=String(cfg.url||'').trim().replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,'');
  const API=ROOT?ROOT+'/rest/v1':'';
  const token=()=>localStorage.getItem('tc_access_token')||'';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const today=()=>new Date().toISOString().slice(0,10);
  async function api(path,opts={}){
    if(!API) throw new Error('Cloud connection is unavailable.');
    const r=await fetch(API+'/'+path,{...opts,headers:{apikey:cfg.key,Authorization:'Bearer '+token(),'Content-Type':'application/json',Prefer:'return=representation',...(opts.headers||{})}});
    if(!r.ok) throw new Error((await r.text())||('Request failed '+r.status));
    return r.json();
  }
  async function insert(table,body){return api(table,{method:'POST',body:JSON.stringify(body)})}
  async function select(table,q=''){return api(table+q)}

  const style=document.createElement('style');
  style.textContent=`
  .tc-form-mask{position:fixed;inset:0;background:rgba(8,16,23,.62);z-index:1000;display:flex;justify-content:flex-end}
  .tc-form-panel{width:min(860px,96vw);height:100%;background:#f6f7f8;box-shadow:-24px 0 70px #0006;display:flex;flex-direction:column}
  .tc-form-head{background:#13202a;color:#fff;padding:18px 22px;display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
  .tc-form-title{font-size:20px;font-weight:850}.tc-form-meta{font-size:12px;color:#b8c4cc;margin-top:4px}.tc-form-close{border:0;background:transparent;color:#fff;font-size:28px;cursor:pointer}
  .tc-form-body{padding:18px 22px;overflow:auto;flex:1}.tc-form-section{background:#fff;border:1px solid #dde3e7;border-radius:12px;padding:15px;margin-bottom:13px}
  .tc-form-section h3{margin:0 0 12px;font-size:14px}.tc-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 14px}
  .tc-form-field{display:grid;gap:5px}.tc-form-field.full{grid-column:1/-1}.tc-form-field label{font-size:11px;font-weight:800;color:#55616b}.tc-req{color:#b9382e}
  .tc-form-field input,.tc-form-field select,.tc-form-field textarea{width:100%;border:1px solid #c9d2d9;border-radius:8px;background:#fff;padding:10px 11px;font-size:13px}.tc-form-field textarea{min-height:100px;resize:vertical}
  .tc-form-field input:focus,.tc-form-field select:focus,.tc-form-field textarea:focus{outline:2px solid #236a9533;border-color:#236a95}.tc-invalid{border-color:#b9382e!important;background:#fff7f6!important}
  .tc-form-foot{border-top:1px solid #dfe4e8;background:#fff;padding:13px 22px;display:flex;justify-content:space-between;align-items:center;gap:10px}.tc-form-actions{display:flex;gap:8px;flex-wrap:wrap}.tc-form-msg{font-size:12px;color:#6f7884}.tc-form-msg.err{color:#b9382e}.tc-form-msg.ok{color:#237a49}
  @media(max-width:700px){.tc-form-panel{width:100vw}.tc-form-grid{grid-template-columns:1fr}.tc-form-field.full{grid-column:auto}.tc-form-head,.tc-form-body,.tc-form-foot{padding-left:14px;padding-right:14px}}
  `;
  document.head.appendChild(style);

  const input=(f)=>{
    const cls='tc-form-field'+(f.full?' full':'');
    const req=f.required?'<span class="tc-req"> *</span>':'';
    let ctl='';
    if(f.type==='textarea') ctl=`<textarea name="${esc(f.name)}" ${f.required?'required':''} placeholder="${esc(f.placeholder||'')}">${esc(f.value||'')}</textarea>`;
    else if(f.type==='select') ctl=`<select name="${esc(f.name)}" ${f.required?'required':''}>${(f.options||[]).map(o=>{const v=typeof o==='string'?o:o.value,l=typeof o==='string'?o:o.label;return `<option value="${esc(v)}" ${String(v)===String(f.value??'')?'selected':''}>${esc(l)}</option>`}).join('')}</select>`;
    else ctl=`<input name="${esc(f.name)}" type="${esc(f.type||'text')}" value="${esc(f.value||'')}" ${f.required?'required':''} ${f.readonly?'readonly':''} placeholder="${esc(f.placeholder||'')}">`;
    return `<div class="${cls}"><label>${esc(f.label)}${req}</label>${ctl}</div>`;
  };
  function openForm({title,subtitle,sections,submitLabel='Save',draftLabel,onSubmit,onDraft}){
    document.querySelector('.tc-form-mask')?.remove();
    const mask=document.createElement('div');mask.className='tc-form-mask';
    mask.innerHTML=`<div class="tc-form-panel" role="dialog" aria-modal="true"><div class="tc-form-head"><div><div class="tc-form-title">${esc(title)}</div><div class="tc-form-meta">${esc(subtitle||'')}</div></div><button class="tc-form-close" aria-label="Close">×</button></div><form class="tc-enterprise-form"><div class="tc-form-body">${sections.map(s=>`<section class="tc-form-section"><h3>${esc(s.title)}</h3><div class="tc-form-grid">${s.fields.map(input).join('')}</div></section>`).join('')}</div><div class="tc-form-foot"><div class="tc-form-msg">Required fields are marked *</div><div class="tc-form-actions"><button type="button" class="btn tc-cancel">Cancel</button>${draftLabel?`<button type="button" class="btn tc-draft">${esc(draftLabel)}</button>`:''}<button type="submit" class="btn primary">${esc(submitLabel)}</button></div></div></form></div>`;
    document.body.appendChild(mask);
    const form=mask.querySelector('form'),msg=mask.querySelector('.tc-form-msg');
    const close=()=>mask.remove();
    mask.querySelector('.tc-form-close').onclick=close;mask.querySelector('.tc-cancel').onclick=close;
    mask.addEventListener('click',e=>{if(e.target===mask)close()});
    const values=()=>Object.fromEntries(new FormData(form).entries());
    const validate=()=>{let ok=true;form.querySelectorAll('[required]').forEach(el=>{el.classList.toggle('tc-invalid',!el.value.trim());if(!el.value.trim())ok=false});if(!ok){msg.textContent='Complete all required fields before continuing.';msg.className='tc-form-msg err'}return ok};
    if(draftLabel) mask.querySelector('.tc-draft').onclick=async()=>{if(!validate())return;try{msg.textContent='Saving draft…';await onDraft?.(values());msg.textContent='Draft saved.';msg.className='tc-form-msg ok';setTimeout(close,350)}catch(e){msg.textContent=e.message;msg.className='tc-form-msg err'}};
    form.onsubmit=async e=>{e.preventDefault();if(!validate())return;try{msg.textContent='Saving…';msg.className='tc-form-msg';await onSubmit(values());msg.textContent='Saved successfully.';msg.className='tc-form-msg ok';setTimeout(close,350)}catch(err){msg.textContent=err.message;msg.className='tc-form-msg err'}};
    form.querySelector('input,select,textarea')?.focus();
  }
  const projMeta=()=>{const p=currentProject();return p?`${p.name} · ${p.job||''}`:'Company record'};
  const scheduleOptions=()=>['','Not Linked',...(state.schedule?.activities||[]).filter(a=>a.project===currentProject()?.name).map(a=>a.id+' — '+a.activity)];
  const userOptions=()=>['',...(state.users||[]).map(u=>u.name)];

  window.addProject=function(){
    openForm({title:'Create Project / Opportunity',subtitle:'Enterprise project setup · company-controlled record',submitLabel:'Create Project',sections:[
      {title:'Project Identity',fields:[{name:'name',label:'Project Name',required:true},{name:'job_number',label:'Project Number',required:true},{name:'client_name',label:'Owner / Client',required:true},{name:'status',label:'Status',type:'select',options:['preconstruction','bidding','awarded','active','on_hold','complete'],value:'preconstruction'}]},
      {title:'Commercial Information',fields:[{name:'contract_method',label:'Delivery / Contract Method',type:'select',options:['Lump Sum GC','CM / GMP','CM at Risk','Design-Build','Negotiated','Cost Plus','Preconstruction Only']},{name:'contract_value',label:'Contract / Estimated Value',type:'number',required:true},{name:'city',label:'City'},{name:'state',label:'State',value:'TX'}]},
      {title:'Schedule & Leadership',fields:[{name:'start_date',label:'Start Date',type:'date'},{name:'substantial_completion_date',label:'Substantial Completion',type:'date'},{name:'project_manager',label:'Project Manager',type:'select',options:userOptions()},{name:'superintendent',label:'Superintendent',type:'select',options:userOptions()}]}
    ],onSubmit:async v=>{const cu=await select('company_users',`?user_id=eq.${authUser?.id||''}&active=eq.true&select=company_id&limit=1`).catch(()=>[]);const uid=authUser?.id||JSON.parse(atob((token().split('.')[1]||'e30=').replace(/-/g,'+').replace(/_/g,'/'))).sub;if(!cu[0]){const r=await select('company_users',`?user_id=eq.${uid}&active=eq.true&select=company_id&limit=1`);cu.push(...r)}if(!cu[0])throw new Error('No active company assignment found.');await insert('projects',{company_id:cu[0].company_id,name:v.name,job_number:v.job_number,client_name:v.client_name,status:v.status,contract_method:v.contract_method,contract_value:+v.contract_value||0,original_contract_value:+v.contract_value||0,city:v.city,state:v.state,start_date:v.start_date||null,substantial_completion_date:v.substantial_completion_date||null,forecast_cost:0,cost_to_date:0,billings_to_date:0,collections_to_date:0});location.reload()}})
  };

  window.addRfi=function(){const p=currentProject();openForm({title:'Create RFI',subtitle:projMeta(),submitLabel:'Create & Distribute',draftLabel:'Save Draft',sections:[
    {title:'RFI Identification',fields:[{name:'subject',label:'Subject',required:true,full:true},{name:'to',label:'Responsible Party / To',required:true},{name:'from',label:'From',value:currentUser?.name||'',readonly:true},{name:'created',label:'Date Created',type:'date',value:today(),required:true},{name:'due',label:'Response Due Date',type:'date',required:true}]},
    {title:'Question & References',fields:[{name:'question',label:'Question / Clarification Requested',type:'textarea',required:true,full:true},{name:'drawing_ref',label:'Drawing Reference'},{name:'spec_ref',label:'Specification / CSI Reference'},{name:'schedule',label:'Schedule Activity',type:'select',options:scheduleOptions()},{name:'priority',label:'Priority',type:'select',options:['Normal','High','Critical'],value:'Normal'}]},
    {title:'Impact & Distribution',fields:[{name:'cost_impact',label:'Cost Impact',type:'select',options:['Unknown','None','Potential','Confirmed']},{name:'schedule_impact',label:'Schedule Impact',type:'select',options:['Unknown','None','Potential','Confirmed']},{name:'distribution',label:'Distribution',placeholder:'Owner, Architect, PM, Superintendent',full:true},{name:'notes',label:'Internal Notes',type:'textarea',full:true}]}
  ],onDraft:v=>saveRfi(v,'draft'),onSubmit:v=>saveRfi(v,'open')});async function saveRfi(v,status){const rows=await select('rfis',`?project_id=eq.${p.id}&select=id`);const no='RFI-'+String(rows.length+1).padStart(3,'0');const uid=JSON.parse(atob((token().split('.')[1]||'e30=').replace(/-/g,'+').replace(/_/g,'/'))).sub;await insert('rfis',{project_id:p.id,rfi_no:no,subject:v.subject,question:v.question,initiated_by_type:'GC',initiated_by_user_id:uid,current_ball_in_court:v.to||'GC',status,due_at:v.due?new Date(v.due+'T17:00:00').toISOString():null,created_by:uid});state.rfis.push({project:p.name,id:no,subject:v.subject,bic:v.to,due:v.due,activity:v.schedule||'',float:0,delay:0,tie:v.schedule?'Linked':'Pending',status});renderPage('rfis');renderNav()}}
  };

  window.addSub=function(){const p=currentProject();openForm({title:'Create Submittal',subtitle:projMeta(),submitLabel:'Create & Route',draftLabel:'Save Draft',sections:[
    {title:'Submittal Identification',fields:[{name:'description',label:'Title / Description',required:true,full:true},{name:'spec',label:'Specification Section / CSI',required:true},{name:'type',label:'Submittal Type',type:'select',options:['Shop Drawings','Product Data','Samples','Mockup','Closeout','Delegated Design','Other']},{name:'subcontractor',label:'Subcontractor / Vendor',required:true},{name:'reviewer',label:'Reviewer / Ball in Court',required:true}]},
    {title:'Required Dates',fields:[{name:'required_on_site',label:'Required on Site',type:'date',required:true},{name:'submit_by',label:'Submit By',type:'date'},{name:'review_due',label:'Review Due',type:'date'},{name:'schedule',label:'Schedule Activity',type:'select',options:scheduleOptions()}]},
    {title:'Routing & Documentation',fields:[{name:'distribution',label:'Distribution',full:true},{name:'notes',label:'Scope / Review Notes',type:'textarea',full:true}]}
  ],onDraft:v=>saveSubmittal(v,'draft'),onSubmit:v=>saveSubmittal(v,'pending')});async function saveSubmittal(v,status){const rows=await select('submittals',`?project_id=eq.${p.id}&select=id`);const no='SUB-'+String(rows.length+1).padStart(3,'0');const uid=JSON.parse(atob((token().split('.')[1]||'e30=').replace(/-/g,'+').replace(/_/g,'/'))).sub;await insert('submittals',{project_id:p.id,submittal_no:no,revision_no:0,description:v.description,submitted_by_user_id:uid,current_ball_in_court:v.reviewer,status,required_on_site:v.required_on_site||null});state.submittals.push({project:p.name,id:no,spec:v.spec,desc:v.description,sub:v.subcontractor,bic:v.reviewer,ros:v.required_on_site,lead:'',activity:v.schedule||'',exposure:0,tie:v.schedule?'Linked':'Pending',status});renderPage('submittals');renderNav()}}
  };

  function addSubcontractorForm(){const p=currentProject();openForm({title:'Add Project Subcontractor',subtitle:projMeta(),submitLabel:'Add Subcontractor',sections:[
    {title:'Company & Trade',fields:[{name:'company',label:'Company',required:true},{name:'trade',label:'CSI / Trade',required:true},{name:'contact',label:'Primary Contact',required:true},{name:'email',label:'Email',type:'email'},{name:'phone',label:'Phone'},{name:'status',label:'Portal Status',type:'select',options:['Invite Pending','Invite Accepted','Active','Inactive'],value:'Invite Pending'}]},
    {title:'Contract & Scope',fields:[{name:'contract',label:'Original Contract Amount',type:'number'},{name:'proposal',label:'Proposal / Bid Reference'},{name:'scope',label:'Contract Scope',type:'textarea',required:true,full:true}]},
    {title:'Compliance',fields:[{name:'insurance',label:'Insurance Status',type:'select',options:['Needs Review','Current','Expiring Soon','Expired'],value:'Needs Review'},{name:'w9',label:'W-9 Status',type:'select',options:['Missing','On File']},{name:'executed',label:'Executed Contract',type:'select',options:['No','Yes']},{name:'waiver',label:'Current Lien Waiver',type:'select',options:['No','Yes']}]}
  ],onSubmit:v=>{state.subcontractorProfiles=state.subcontractorProfiles||[];state.subcontractorProfiles.push({project:p.name,company:v.company,trade:v.trade,contact:v.contact,phone:v.phone,email:v.email,portalStatus:v.status,contract:+v.contract||0,approvedCO:0,paid:0,retainage:0,proposal:v.proposal,scope:v.scope,insurance:v.insurance,w9:v.w9==='On File',lienWaiver:v.waiver==='Yes',executed:v.executed==='Yes',submittalsOpen:0,rfisOpen:0,punchOpen:0,closeout:0});save('Added subcontractor profile',v.company);renderPage('subcontractors')}})}

  function addComplianceForm(){const p=currentProject();openForm({title:'Add Compliance Requirement',subtitle:projMeta(),submitLabel:'Save Requirement',sections:[
    {title:'Requirement',fields:[{name:'authority',label:'Authority / Agency',required:true},{name:'requirement',label:'Requirement / Inspection / Test',required:true},{name:'type',label:'Type',type:'select',options:['Permit','Inspection','Testing','Certificate','License','Environmental','Utility','Other']},{name:'trade',label:'Trade / Discipline'}]},
    {title:'Responsibility & Schedule',fields:[{name:'responsible',label:'Responsible Party',type:'select',options:userOptions(),required:true},{name:'required',label:'Required Date',type:'date',required:true},{name:'activity',label:'Schedule Activity',type:'select',options:scheduleOptions()},{name:'status',label:'Status',type:'select',options:['Not Started','In Review','Scheduled','Passed / Complete','Failed / Rework','On Hold'],value:'Not Started'}]},
    {title:'Documentation',fields:[{name:'docs',label:'Required / Related Documents',full:true},{name:'notes',label:'Notes / Conditions',type:'textarea',full:true}]}
  ],onSubmit:v=>{state.compliance=state.compliance||[];state.compliance.push({project:p.name,authority:v.authority,requirement:v.requirement,type:v.type,trade:v.trade,responsible:v.responsible,required:v.required,activity:v.activity,status:v.status,result:'',rescheduled:'',docs:v.docs});save('Added compliance requirement',v.requirement);renderPage('compliance')}})}

  function addWarrantyForm(){const p=currentProject();openForm({title:'Add Warranty / Asset',subtitle:projMeta(),submitLabel:'Save Asset',sections:[
    {title:'Asset Identification',fields:[{name:'trade',label:'Trade / System',required:true},{name:'asset',label:'Asset / Equipment',required:true},{name:'location',label:'Project Location',required:true},{name:'manufacturer',label:'Manufacturer'},{name:'model',label:'Model'},{name:'serial',label:'Serial Number'}]},
    {title:'Provider & Coverage',fields:[{name:'provider',label:'Installer / Provider',required:true},{name:'contact',label:'Warranty Contact'},{name:'phone',label:'Phone'},{name:'email',label:'Email',type:'email'},{name:'coverage',label:'Coverage / Warranty Type',required:true,full:true}]},
    {title:'Warranty Period & Closeout',fields:[{name:'start',label:'Coverage Start',type:'date',required:true},{name:'expires',label:'Expiration',type:'date',required:true},{name:'term',label:'Term'},{name:'docs',label:'Warranty / O&M Documents',placeholder:'Manufacturer Warranty, Sub Warranty, O&M, Startup Report',full:true},{name:'maintenance',label:'Required Maintenance / Conditions',type:'textarea',full:true}]}
  ],onSubmit:v=>{state.warranties=state.warranties||[];state.warranties.push({project:p.name,trade:v.trade,asset:v.asset,provider:v.provider,contact:v.contact,phone:v.phone,email:v.email,manufacturer:v.manufacturer,model:v.model,serial:v.serial,coverage:v.coverage,start:v.start,expires:v.expires,term:v.term,docs:v.docs?v.docs.split(',').map(x=>x.trim()).filter(Boolean):[],location:v.location,maintenance:v.maintenance});save('Added warranty asset',v.asset);renderPage('warranty')}})}

  function addPreconForm(kind){const p=currentProject();const labels={design:'Design Issue',ve:'Value Engineering Item',decision:'Owner Decision'};openForm({title:'Add '+labels[kind],subtitle:projMeta(),submitLabel:'Create '+labels[kind],sections:[
    {title:'Identification',fields:[{name:'title',label:'Title / Subject',required:true,full:true},{name:'discipline',label:'Discipline / CSI'},{name:'responsible',label:'Responsible Party',type:'select',options:userOptions()},{name:'status',label:'Status',type:'select',options:['Open','In Review','Pending Owner','Approved','Rejected','Closed'],value:'Open'}]},
    {title:'Impact & Due Dates',fields:[{name:'due',label:'Due Date',type:'date',required:true},{name:'budget',label:'Budget Impact',type:'number'},{name:'schedule_days',label:'Schedule Impact (Days)',type:'number'},{name:'activity',label:'Schedule Activity',type:'select',options:scheduleOptions()}]},
    {title:'Description / Decision Basis',fields:[{name:'description',label:'Description, Recommendation, or Decision Required',type:'textarea',required:true,full:true},{name:'attachments',label:'Drawing / Spec / Estimate References',full:true}]}
  ],onSubmit:v=>{state.preconRecords=state.preconRecords||[];state.preconRecords.push({project:p.name,kind,...v,created:today(),createdBy:currentUser?.name||''});save('Added preconstruction '+labels[kind],v.title);renderPage('preconstruction')}})}

  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;const text=b.textContent.trim();
    if(b.id==='addSubcontractor'){e.preventDefault();e.stopImmediatePropagation();addSubcontractorForm();return}
    if(b.id==='addCompliance'){e.preventDefault();e.stopImmediatePropagation();addComplianceForm();return}
    if(b.closest('#warranty')&&/Warranty\s*\/\s*Asset/i.test(text)){e.preventDefault();e.stopImmediatePropagation();addWarrantyForm();return}
    if(b.closest('#preconstruction')&&/Design Issue/i.test(text)){e.preventDefault();e.stopImmediatePropagation();addPreconForm('design');return}
    if(b.closest('#preconstruction')&&/VE Item/i.test(text)){e.preventDefault();e.stopImmediatePropagation();addPreconForm('ve');return}
    if(b.closest('#preconstruction')&&/Owner Decision/i.test(text)){e.preventDefault();e.stopImmediatePropagation();addPreconForm('decision');return}
  },true);
})();