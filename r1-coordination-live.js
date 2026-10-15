/* Durable RFI/submittal coordination. The server determines all capabilities. */
(() => {
  'use strict';
  if (window.tcCoordination) return;
  const cfg=window.__TC_SUPABASE__||{};
  const root=String(cfg.url||'').replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,'')+'/rest/v1/';
  const scope=()=>({project:typeof currentProject==='function'?currentProject()?.id:null,user:window.tcAuth?.getUserId(),token:window.tcAuth?.getAccessToken()});
  const same=s=>{const now=scope();return !!s.project&&!!s.user&&!!s.token&&s.project===now.project&&s.user===now.user&&s.token===now.token};
  const assert=s=>{if(!same(s))throw Error('Project or session changed. Reopen this record before saving.');};
  async function request(path,body,s=scope()) {
    assert(s);
    const response=await fetch(root+path,{method:body===undefined?'GET':'POST',headers:{apikey:cfg.key,Authorization:'Bearer '+s.token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const data=await response.json().catch(()=>null);assert(s);
    if(!response.ok)throw Error(data?.message||'Cloud request failed. Please retry.');
    return data;
  }
  const rpc=(name,data,s)=>request('rpc/tc_coord_'+name,data,s);
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text??'');if(cls)n.className=cls;return n;};
  const button=(text,action)=>{const b=el('button',text,'btn');b.type='button';b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){showError(e);}finally{b.disabled=false;}};return b;};
  function showError(e){const node=document.getElementById('tcCoordStatus')||document.getElementById('tcCoordInboxStatus');if(node)node.textContent=e.message;else window.alert?.(e.message);}
  const label=kind=>kind==='rfi'?'RFI':'Submittal';
  const number=r=>r.rfi_no||r.submittal_no;
  const title=r=>r.subject||r.description;
  const date=v=>v?new Date(v).toLocaleString():'Not set';
  const iso=v=>v?new Date(v).toISOString():'';
  const local=v=>{if(!v)return '';const d=new Date(v);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  const options=members=>[{value:'',label:'Unassigned'},...members.map(m=>({value:m.id,label:m.name+' · '+m.role}))];
  let generation=0;
  async function render(kind){
    const s=scope(),host=document.getElementById(kind==='rfi'?'rfis':'submittals'),run=++generation;
    if(!host||!same(s))return;
    host.replaceChildren(el('h1',kind==='rfi'?'RFIs':'Submittals'),el('p','Loading saved project records…'));
    try{
      const data=await rpc('list',{p_project:s.project,p_kind:kind},s);
      if(run!==generation||!same(s))return;
      host.replaceChildren(el('h1',kind==='rfi'?'RFIs':'Submittals'),el('p','Saved assignments, responses, reviews, and audit history.'));
      const status=el('p','','muted');status.id='tcCoordStatus';status.setAttribute('role','status');host.append(status);
      if(data.canCreate)host.append(button('+ '+label(kind),()=>createForm(kind)));
      const table=el('table'),head=el('thead'),tr=el('tr');['Record','Subject','Status','Assigned to','Due','Revision','Action'].forEach(x=>tr.append(el('th',x)));head.append(tr);table.append(head);
      const body=el('tbody');
      for(const r of data.records){const row=el('tr');[number(r),title(r),r.status,data.members.find(m=>m.id===r.assigned_to)?.name||'Unassigned',date(r.due_at),r.revision_no??'—'].forEach(v=>row.append(el('td',v)));const cell=el('td');cell.append(button('Open',()=>open(kind,r.id)));row.append(cell);body.append(row);}
      table.append(body);const card=el('div',undefined,'card');card.style.overflowX='auto';card.append(table);host.append(card);
      if(!data.records.length)status.textContent='No accessible records for this project.';
      if(data.records.length===500)status.textContent='Showing the latest 500 accessible records.';
    }catch(e){if(same(s)&&run===generation)host.replaceChildren(el('h1',label(kind)+' records'),el('p',e.message),button('Retry',()=>render(kind)));}
  }
  async function open(kind,id){const s=scope();const data=await rpc('detail',{p_kind:kind,p_id:id},s);showDetail(kind,data,s);}
  function showDetail(kind,data,s){
    assert(s);document.getElementById('tcCoordDetail')?.remove();
    const overlay=el('div',undefined,'modal');overlay.id='tcCoordDetail';overlay.style.cssText='z-index:900;display:flex;align-items:center;justify-content:center;';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',label(kind)+' details');
    const box=el('div',undefined,'card');box.style.cssText='width:min(900px,94vw);max-height:90vh;overflow:auto;padding:24px;background:white;';
    overlay.append(box);box.append(button('Close details',()=>overlay.remove()));
    const r=data.record,c=data.capabilities,members=data.members;
    box.append(el('h2',number(r)+' · '+title(r)),el('p','Status: '+r.status+' · Revision: '+(r.revision_no??'—')+' · Record version: '+r.record_version));
    box.append(el('p','Assigned to: '+(members.find(m=>m.id===r.assigned_to)?.name||'Unassigned')+' · Due: '+date(r.due_at)));
    box.append(el('p','Drawing: '+(r.drawing_reference||'—')+' · Specification: '+(r.specification_reference||'—')));
    if(r.required_on_site)box.append(el('p','Required on site: '+r.required_on_site));
    const text=el('p',r.question||r.submission_text||'Legacy record: no detailed text saved.');text.style.whiteSpace='pre-wrap';box.append(text);
    const status=el('p');status.id='tcCoordStatus';status.setAttribute('role','status');box.append(status);
    const actions=el('div',undefined,'actions');
    for(const [action,name,enabled] of [['assign','Assign / change due date',c.manage&&r.status!=='closed'],['respond','Respond',c.respond],['review','Review',c.review],['resubmit','Resubmit revision',c.resubmit],['comment','Add comment',c.comment&&r.status!=='closed'],['close','Close record',c.close],['reopen','Reopen',c.reopen]]){
      if(enabled)actions.append(button(name,()=>actionForm(kind,data,action,s)));
    }
    box.append(actions,button('Reload latest record',()=>open(kind,r.id)),el('h3','Audit history'));
    for(const event of data.events){const item=el('div',undefined,'card');const actor=members.find(m=>m.id===event.created_by)?.name||event.created_by||'Legacy actor';item.append(el('b',event.event_type+' · '+actor+' · '+date(event.created_at)));const note=el('p',event.response_text||event.comments||'');note.style.whiteSpace='pre-wrap';item.append(note);if(event.disposition)item.append(el('p','Disposition: '+event.disposition));box.append(item);}
    document.body.append(overlay);
  }
  async function createForm(kind){
    const s=scope(),data=await rpc('list',{p_project:s.project,p_kind:kind},s);assert(s);
    if(!data.canCreate)throw Error('Your project role cannot create this record.');
    const requestId=crypto.randomUUID();
    const fields=[{name:'title',label:'Subject / description',required:true},{name:'text',label:kind==='rfi'?'Question / clarification requested':'Submission details',type:'textarea',required:true},{name:'assignee',label:'Assigned project member',type:'select',options:options(data.members)},{name:'dueAt',label:'Response / review due',type:'datetime-local'},{name:'drawingRef',label:'Drawing / detail reference'},{name:'specRef',label:'Specification reference'}];
    if(kind==='submittal')fields.push({name:'requiredOnSite',label:'Required on site',type:'date'});
    window.tcOpenRecordForm({title:'New '+label(kind),subtitle:'Saved to this project. Assignments notify the named member in the app.',fields,onSave:async values=>{assert(s);const detail=await rpc('create',{p_project:s.project,p_kind:kind,p_request:requestId,p_data:{...values,dueAt:iso(values.dueAt)}},s);await refresh(kind,s);showDetail(kind,detail,s);}});
  }
  function actionForm(kind,data,action,s){
    assert(s);const r=data.record,requestId=crypto.randomUUID();
    const fields=[{name:'text',label:action==='respond'?'Response':'Action note / revised submission details',type:'textarea',required:true}];
    if(action==='assign'||action==='resubmit')fields.push({name:'assignee',label:'Assigned project member',type:'select',options:options(data.members),value:r.assigned_to||''});
    if(action==='assign')fields.push({name:'dueAt',label:'Response / review due',type:'datetime-local',value:local(r.due_at)});
    if(action==='review')fields.push({name:'disposition',label:'Review outcome',type:'select',required:true,options:['approved','approved_as_noted','revise_resubmit','rejected'].map(value=>({value,label:value.replaceAll('_',' ')}))});
    window.tcOpenRecordForm({title:label(kind)+' · '+action,subtitle:number(r)+' · This action requires the current saved record version.',fields,onSave:async values=>{assert(s);const detail=await rpc('action',{p_kind:kind,p_id:r.id,p_expected:r.record_version,p_action:action,p_request:requestId,p_data:{...values,...('dueAt'in values?{dueAt:iso(values.dueAt)}:{})}},s);await refresh(kind,s);showDetail(kind,detail,s);}});
  }
  async function refresh(kind,s){if(!same(s))return;if(typeof currentPage!=='undefined'&&currentPage===(kind==='rfi'?'rfis':'submittals'))await render(kind);await inbox();}
  let inboxRun=0;
  async function inbox(){
    const s=scope(),host=document.getElementById('home'),run=++inboxRun;if(!host||!same(s))return;
    document.getElementById('tcCoordInbox')?.remove();const panel=el('section',undefined,'card');panel.id='tcCoordInbox';panel.append(el('h3','Coordination notifications'),button('Refresh notifications',()=>inbox()));const status=el('p','Loading…');status.id='tcCoordInboxStatus';panel.append(status);host.prepend(panel);
    try{const rows=await request('tc_coord_notifications?project_id=eq.'+encodeURIComponent(s.project)+'&select=id,kind,record_id,event_type,subject,created_at,read_at&order=created_at.desc&limit=50',undefined,s);if(run!==inboxRun||!same(s)||!panel.isConnected)return;status.textContent=rows.length?'Latest 50 notifications · In-app delivery':'No coordination notifications for this project.';for(const n of rows){const item=el('p');item.append(button((n.read_at?'':'Unread · ')+n.subject+' · '+n.event_type,async()=>{await open(n.kind,n.record_id);await rpc('read_notification',{p_id:n.id},s);await inbox();}));panel.append(item);}}
    catch(e){if(same(s)&&run===inboxRun)status.textContent=e.message;}
  }
  const previous=window.renderPage;
  if(typeof previous==='function')window.renderPage=function(page,...args){const result=previous.call(this,page,...args);if(page==='home')void inbox();return result;};
  let last=[scope().project,scope().user,scope().token].join('|');setInterval(()=>{const s=scope(),key=[s.project,s.user,s.token].join('|');if(key===last)return;last=key;generation++;inboxRun++;document.getElementById('tcCoordDetail')?.remove();document.getElementById('tcCoordInbox')?.remove();if(typeof currentPage!=='undefined'&&same(s)){if(currentPage==='rfis'||currentPage==='submittals')void render(currentPage==='rfis'?'rfi':'submittal');else if(currentPage==='home')void inbox();}},1500);
  window.tcCoordination={createForm,open,render,inbox};
  if(typeof currentPage!=='undefined'&&same(scope())){if(currentPage==='rfis'||currentPage==='submittals')void render(currentPage==='rfis'?'rfi':'submittal');else if(currentPage==='home')void inbox();}
})();
