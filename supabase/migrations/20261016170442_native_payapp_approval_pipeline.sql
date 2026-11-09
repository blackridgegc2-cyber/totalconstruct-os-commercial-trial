-- Service-only transactional gateway. No browser can write workflow/evidence tables.
create schema if not exists tc_payapp_private;
revoke all on schema tc_payapp_private from public,anon,authenticated;
create table public.tc_payapp_workflows (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),
 payapp_id uuid not null unique references public.tc_owner_payapp_records(id),document_id uuid not null references public.tc_payapp_documents(id),
 contractor_id uuid not null references public.profiles(id),owner_id uuid not null references public.profiles(id),lender_id uuid not null references public.profiles(id),
 stage text not null default 'contractor_signature' check(stage in ('contractor_signature','contractor_route','owner_signature','owner_route','lender_approval','approved','returned')),
 version integer not null default 1,source_sha256 text not null check(source_sha256 ~ '^[0-9a-f]{64}$'),
 current_sha256 text not null check(current_sha256 ~ '^[0-9a-f]{64}$'),current_path text not null,
 billing_snapshot jsonb not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(contractor_id<>owner_id and owner_id<>lender_id and contractor_id<>lender_id)
);
create table public.tc_payapp_workflow_events (
 id uuid primary key default gen_random_uuid(),workflow_id uuid not null references public.tc_payapp_workflows(id),
 request_id uuid not null unique,actor_id uuid not null references public.profiles(id),action text not null,
 from_stage text not null,to_stage text not null,version integer not null,details jsonb not null,
 created_at timestamptz not null default now(),unique(workflow_id,version)
);
create table public.tc_payapp_billing_holds (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),
 payapp_id uuid not null references public.tc_owner_payapp_records(id),sov_line text not null,
 reason text not null check(length(trim(reason)) between 3 and 4000),
 status text not null check(status in ('Billing Hold','PM Confirmation Required','Cleared for Billing')),
 opened_by uuid not null references public.profiles(id),cleared_by uuid references public.profiles(id),
 decision text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(status<>'Cleared for Billing' or (cleared_by is not null and length(trim(decision))>=3))
);
create table public.tc_payapp_hold_events (
 id uuid primary key default gen_random_uuid(),hold_id uuid not null references public.tc_payapp_billing_holds(id),
 actor_id uuid not null references public.profiles(id),status text not null,reason text not null,created_at timestamptz not null default now()
);
create index tc_payapp_hold_open on public.tc_payapp_billing_holds(project_id,payapp_id,status);
do $$declare t text;begin foreach t in array array['tc_payapp_workflows','tc_payapp_workflow_events','tc_payapp_billing_holds','tc_payapp_hold_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;end$$;
create function tc_payapp_private.role_for(pid uuid,actor uuid) returns text language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare r text;begin
 if actor is null or not tc_access_private.has_permission(pid,'payapps',actor) then raise exception 'Project pay-app access denied' using errcode='42501';end if;
 select pr.role::text into r from public.company_users cu join public.profiles pr on pr.id=cu.user_id join public.projects p on p.company_id=cu.company_id where p.id=pid and cu.user_id=actor and cu.active and pr.active and pr.role::text in ('admin','executive');
 if r is not null then return 'contractor';end if;
 select m.role::text into r from public.project_members m join public.profiles pr on pr.id=m.user_id where m.project_id=pid and m.user_id=actor and m.active and pr.active;
 return case when r in ('pm','accounting') then 'contractor' when r in ('owner','lender') then r else 'reader' end;
end$$;
create function tc_payapp_private.assert_clear(pid uuid,pa uuid) returns void language plpgsql stable set search_path=pg_catalog,public as $$begin
 if exists(select 1 from public.tc_payapp_billing_holds h join public.tc_owner_payapp_records source on source.id=h.payapp_id join public.tc_owner_payapp_records target on target.project_id=source.project_id and target.application_number=source.application_number where target.id=pa and h.project_id=pid and h.status<>'Cleared for Billing') then raise exception 'PM billing clearance required' using errcode='23514';end if;
end$$;
-- Validate client financial inputs independently at the finalization boundary.
create function tc_payapp_private.validate_bill(b jsonb) returns numeric language plpgsql immutable set search_path=pg_catalog as $$
declare key_ text;r jsonb;scheduled numeric:=0;original numeric:=0;changes numeric:=0;gross numeric:=0;ret numeric:=0;prior_work numeric:=0;work_ numeric:=0;stored_ numeric:=0;s numeric;o numeric;c numeric;p numeric;w numeric;m numeric;t numeric;rr numeric;basis numeric;due numeric;
begin
 foreach key_ in array array['originalContract','approvedChanges','grossCompleted','currentRetainage','earnedLessRetainage','currentPaymentDue','contractValue','priorCompleted','currentWork','stored'] loop
 if b->>key_ is null or b->>key_ !~ '^[-+]?[0-9]+([.][0-9]+)?$' then raise exception 'Missing or non-finite billing value: %',key_;end if;end loop;
 if jsonb_typeof(b->'rows') is distinct from 'array' or jsonb_array_length(b->'rows')=0 then raise exception 'Detailed SOV required';end if;
 foreach r in array array[b] loop
 if not (r ?& array['originalContract','approvedChanges','grossCompleted','currentRetainage','earnedLessRetainage','currentPaymentDue','contractValue','priorCompleted','currentWork','stored']) or not (r ? 'priorPayments' or r ? 'previousOwnerFundedPayments') then raise exception 'Billing inputs incomplete';end if;end loop;
 for r in select value from jsonb_array_elements(b->'rows') loop
 s:=round(coalesce(r->>'scheduledValue',r->>'scheduled_value')::numeric,2);c:=round(coalesce(r->>'changes',r->>'approvedChanges','0')::numeric,2);o:=round(coalesce((r->>'originalValue')::numeric,s-c),2);
 p:=round(coalesce(r->>'previous',r->>'priorCompleted','0')::numeric,2);w:=round(coalesce(r->>'thisPeriod',r->>'currentWork','0')::numeric,2);m:=round(coalesce(r->>'stored','0')::numeric,2);rr:=round(coalesce(r->>'retainage','0')::numeric,2);t:=p+w+m;
 if s is null or s::text in ('NaN','Infinity','-Infinity') or c::text in ('NaN','Infinity','-Infinity') or o::text in ('NaN','Infinity','-Infinity') or p::text in ('NaN','Infinity','-Infinity') or w::text in ('NaN','Infinity','-Infinity') or m::text in ('NaN','Infinity','-Infinity') or rr::text in ('NaN','Infinity','-Infinity') or least(s,o,p,w,m,rr)<0 or t>s or rr>t or o+c<>s or nullif(trim(coalesce(r->>'description',r->>'name')),'') is null then raise exception 'SOV line does not reconcile';end if;
 scheduled:=scheduled+s;original:=original+o;changes:=changes+c;gross:=gross+t;ret:=ret+rr;prior_work:=prior_work+p;work_:=work_+w;stored_:=stored_+m;
 end loop;
 basis:=round((b->>'originalContract')::numeric+coalesce((b->>'separatelyAuthorizedPrecon')::numeric,0)+(b->>'approvedChanges')::numeric,2);
 due:=gross-ret-round(coalesce(b->>'priorPayments',b->>'previousOwnerFundedPayments')::numeric,2);
 if due is null or due::text in ('NaN','Infinity','-Infinity') or basis::text in ('NaN','Infinity','-Infinity') or due<=0 or (b->>'originalContract')::numeric<0 or coalesce((b->>'separatelyAuthorizedPrecon')::numeric,0)<0 or coalesce(b->>'priorPayments',b->>'previousOwnerFundedPayments')::numeric<0 or scheduled<>basis or original<>round((b->>'originalContract')::numeric+coalesce((b->>'separatelyAuthorizedPrecon')::numeric,0),2) or changes<>round((b->>'approvedChanges')::numeric,2) or coalesce((b->>'unbilled')::numeric,0)<>0 then raise exception 'Billing basis does not reconcile';end if;
 if round((b->>'grossCompleted')::numeric,2)<>gross or round((b->>'currentRetainage')::numeric,2)<>ret or round((b->>'earnedLessRetainage')::numeric,2)<>gross-ret or round((b->>'currentPaymentDue')::numeric,2)<>due or round((b->>'priorCompleted')::numeric,2)<>prior_work or round((b->>'currentWork')::numeric,2)<>work_ or round((b->>'stored')::numeric,2)<>stored_ or round((b->>'contractValue')::numeric,2)<>basis-coalesce((b->>'separatelyAuthorizedPrecon')::numeric,0) then raise exception 'Summary differs from detailed SOV';end if;
 return due;
end$$;
create function public.tc_payapp_workflow_list(p_actor uuid,p_project uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare role_ text;begin role_:=tc_payapp_private.role_for(p_project,p_actor);
 return jsonb_build_object('role',role_,'workflows',coalesce((select jsonb_agg(to_jsonb(w)||jsonb_build_object('events',(select coalesce(jsonb_agg(e order by e.version),'[]'::jsonb) from public.tc_payapp_workflow_events e where e.workflow_id=w.id),'invoice',(select to_jsonb(i) from public.tc_payapp_approved_invoices i where i.payapp_id=w.payapp_id))) from public.tc_payapp_workflows w where w.project_id=p_project and (role_='contractor' or (w.owner_id=p_actor and w.stage in ('owner_signature','owner_route','lender_approval','approved','returned')) or (w.lender_id=p_actor and w.stage in ('lender_approval','approved')))),'[]'::jsonb),'holds',coalesce((select jsonb_agg(h) from public.tc_payapp_billing_holds h where h.project_id=p_project),'[]'::jsonb),'recipients',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'role',m.role,'name',pr.display_name,'email',pr.email)) from public.project_members m join public.profiles pr on pr.id=m.user_id where m.project_id=p_project and m.active and pr.active and m.role::text in ('owner','lender') and tc_access_private.has_permission(p_project,'payapps',m.user_id)),'[]'::jsonb));
end$$;
create function public.tc_payapp_workflow_prepare(p_actor uuid,p_project uuid,p_payapp uuid,p_document uuid,p_owner uuid,p_lender uuid,p_hash text) returns public.tc_payapp_workflows language plpgsql security definer set search_path=pg_catalog,public as $$
declare pa public.tc_owner_payapp_records;d public.tc_payapp_documents;w public.tc_payapp_workflows;begin
 if tc_payapp_private.role_for(p_project,p_actor)<>'contractor' then raise exception 'Contractor access required' using errcode='42501';end if;
 select * into pa from public.tc_owner_payapp_records where id=p_payapp and project_id=p_project for update;
 if not found then raise exception 'Application not found';end if;
 select * into w from public.tc_payapp_workflows where payapp_id=p_payapp;
 if found then return w;end if;
 if exists(select 1 from public.tc_payapp_approved_invoices i join public.tc_owner_payapp_records old on old.id=i.payapp_id where old.project_id=p_project and old.application_number=pa.application_number and i.status<>'void') then raise exception 'This application number already has an approved invoice';end if;
 if pa.status<>'draft' then raise exception 'Editable draft required';end if;
 if tc_payapp_private.role_for(p_project,p_owner)<>'owner' or tc_payapp_private.role_for(p_project,p_lender)<>'lender' then raise exception 'Active project owner and lender required';end if;
 perform tc_payapp_private.validate_bill(pa.payload);perform tc_payapp_private.assert_clear(p_project,p_payapp);
 select * into d from public.tc_payapp_documents where id=p_document and project_id=p_project and payapp_id=p_payapp and kind='signature_pdf' and mime_type='application/pdf';
 if not found then raise exception 'Final PDF not found';end if;
 insert into public.tc_payapp_workflows(project_id,payapp_id,document_id,contractor_id,owner_id,lender_id,source_sha256,current_sha256,current_path,billing_snapshot) values(p_project,p_payapp,p_document,p_actor,p_owner,p_lender,p_hash,p_hash,d.storage_path,pa.payload) returning * into w;
 -- Use the same envelope id for legacy invoice relationships, preserving legacy pending envelopes.
 insert into public.tc_native_signature_envelopes(id,project_id,payapp_id,document_id,source_sha256,created_by,owner_email,lender_email) values(w.id,p_project,p_payapp,p_document,p_hash,p_actor,(select email from public.profiles where id=p_owner),(select email from public.profiles where id=p_lender)) on conflict(payapp_id,document_id) do nothing;
 update public.tc_owner_payapp_records set status='submitted',locked_at=now(),locked_by=p_actor where id=p_payapp;
 return w;
end$$;
create function public.tc_payapp_workflow_apply(p_actor uuid,p_workflow uuid,p_expected integer,p_request uuid,p_action text,p_name text default '',p_consent boolean default false,p_source_hash text default '',p_result_hash text default '',p_result_path text default '',p_reason text default '') returns public.tc_payapp_workflows language plpgsql security definer set search_path=pg_catalog,public as $$
declare w public.tc_payapp_workflows;ev public.tc_payapp_workflow_events;next_ text;actor_ uuid;role_ text;amount_ numeric;envelope_ uuid;begin
 select * into w from public.tc_payapp_workflows where id=p_workflow;
 if not found then raise exception 'Workflow not found';end if;
 perform 1 from public.tc_owner_payapp_records where id=w.payapp_id for update;
 select * into w from public.tc_payapp_workflows where id=p_workflow for update;
 if not found then raise exception 'Workflow not found';end if;
 role_:=tc_payapp_private.role_for(w.project_id,p_actor);
 select * into ev from public.tc_payapp_workflow_events where request_id=p_request;
 if found then if ev.workflow_id<>w.id or ev.actor_id<>p_actor or ev.action<>p_action then raise exception 'Request identifier reused';end if;return w;end if;
 if w.version<>p_expected then raise exception 'Application changed; refresh before continuing' using errcode='40001';end if;
 actor_:=case when w.stage in ('contractor_signature','contractor_route') then w.contractor_id when w.stage in ('owner_signature','owner_route') then w.owner_id when w.stage='lender_approval' then w.lender_id end;
 if p_actor is distinct from actor_ then raise exception 'This action belongs to another signer' using errcode='42501';end if;
 if role_<>(case when w.stage like 'contractor_%' then 'contractor' when w.stage like 'owner_%' then 'owner' else 'lender' end) then raise exception 'Signer role no longer authorized' using errcode='42501';end if;
 if p_action='return' then
 if w.stage not in ('owner_signature','lender_approval') or length(trim(p_reason))<3 then raise exception 'Review stage and correction reason required';end if;next_:='returned';
 else
 perform tc_payapp_private.assert_clear(w.project_id,w.payapp_id);amount_:=tc_payapp_private.validate_bill(w.billing_snapshot);
 next_:=case when w.stage='contractor_signature' and p_action='sign' then 'contractor_route' when w.stage='contractor_route' and p_action='send_owner' then 'owner_signature' when w.stage='owner_signature' and p_action='sign' then 'owner_route' when w.stage='owner_route' and p_action='send_lender' then 'lender_approval' when w.stage='lender_approval' and p_action='approve' then 'approved' end;
 if next_ is null then raise exception 'Invalid workflow action';end if;
 if p_action in ('sign','approve') then
 if not p_consent or length(trim(p_name)) not between 3 and 120 or p_source_hash<>w.current_sha256 or p_result_hash !~ '^[0-9a-f]{64}$' or p_result_hash=w.current_sha256 or p_result_path not like w.project_id::text||'/'||w.payapp_id::text||'/native/%' then raise exception 'Verified signed PDF and explicit consent required';end if;
 if not exists(select 1 from storage.objects where bucket_id='tc-payapp-private' and name=p_result_path) then raise exception 'Signed artifact not stored';end if;
 end if;end if;
 insert into public.tc_payapp_workflow_events(workflow_id,request_id,actor_id,action,from_stage,to_stage,version,details) values(w.id,p_request,p_actor,p_action,w.stage,next_,w.version+1,jsonb_build_object('signerName',p_name,'consent',p_consent,'method','authenticated_session_explicit_consent','sourceSha256',w.current_sha256,'resultSha256',p_result_hash,'resultPath',p_result_path,'reason',p_reason));
 update public.tc_payapp_workflows set stage=next_,version=version+1,current_sha256=case when p_action in ('sign','approve') then p_result_hash else current_sha256 end,current_path=case when p_action in ('sign','approve') then p_result_path else current_path end,updated_at=now() where id=w.id returning * into w;
 update public.tc_native_signature_envelopes set stage=case when w.stage like 'contractor_%' then 'contractor' when w.stage like 'owner_%' then 'owner' else 'lender' end,status=case when w.stage='approved' then 'completed' when w.stage='returned' then 'returned' else 'in_progress' end,signed_document_path=w.current_path,signed_sha256=w.current_sha256,completed_at=case when w.stage='approved' then now() else null end,updated_at=now() where payapp_id=w.payapp_id and document_id=w.document_id;
 if next_='owner_route' then update public.tc_owner_payapp_records set status='owner_approved' where id=w.payapp_id;end if;
 if next_='returned' then update public.tc_owner_payapp_records set status='revision_required' where id=w.payapp_id;end if;
 if next_='approved' then
 select id into envelope_ from public.tc_native_signature_envelopes where payapp_id=w.payapp_id and document_id=w.document_id;
 insert into public.tc_payapp_approved_invoices(project_id,payapp_id,envelope_id,invoice_number,amount,approved_at,metadata) values(w.project_id,w.payapp_id,envelope_,'TC-PA-'||w.payapp_id::text,amount_,now(),jsonb_build_object('workflowId',w.id,'documentSha256',w.current_sha256));
 update public.tc_owner_payapp_records set status='lender_approved' where id=w.payapp_id;
 end if;
 if next_ in ('owner_signature','lender_approval','approved','returned') then
 insert into public.notifications(project_id,user_id,notification_type,subject,module,record_type,record_id,action_required,email_required) values(w.project_id,case when next_='owner_signature' then w.owner_id when next_='lender_approval' then w.lender_id else w.contractor_id end,'payapp_workflow',case when next_='approved' then 'Pay application approved — invoice created' when next_='returned' then 'Pay application returned for correction' else 'Pay application requires your review' end,'payapps','payapp',w.payapp_id,next_ in ('owner_signature','lender_approval','returned'),false);
 end if;
 return w;
end$$;
-- Submitted billing remains immutable; only evidence-backed status progression is allowed.
create or replace function public.tc_payapp_guard() returns trigger language plpgsql set search_path=pg_catalog,public as $$begin
 if tg_op='DELETE' then raise exception 'Pay application deletion is prohibited; use revisions';end if;
 if old.status<>'draft' or old.locked_at is not null then
 if (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') or not exists(select 1 from public.tc_payapp_workflows w where w.payapp_id=old.id and ((new.status='owner_approved' and old.status='submitted' and w.stage='owner_route') or (new.status='lender_approved' and old.status='owner_approved' and w.stage='approved') or (new.status='revision_required' and old.status in ('submitted','owner_approved') and w.stage='returned'))) then raise exception 'Submitted pay application is immutable; use controlled approval or revision';end if;
 else if new.status not in ('draft','submitted') then raise exception 'Controlled approval required';end if;if new.status='submitted' then new.locked_at=now();end if;end if;
 new.updated_at=now();return new;end$$;
create function public.tc_payapp_billing_hold(p_actor uuid,p_project uuid,p_payapp uuid,p_line text,p_reason text,p_hold uuid default null,p_clear boolean default false) returns public.tc_payapp_billing_holds language plpgsql security definer set search_path=pg_catalog,public as $$declare h public.tc_payapp_billing_holds;begin
 if tc_payapp_private.role_for(p_project,p_actor)<>'contractor' then raise exception 'PM or company management access required' using errcode='42501';end if;
 -- Serialize hold creation/clearance against all finalization actions.
 perform 1 from public.tc_owner_payapp_records where id=p_payapp and project_id=p_project for update;if not found then raise exception 'Application not found';end if;
 if exists(select 1 from public.tc_payapp_workflows where payapp_id=p_payapp and stage='approved') then raise exception 'Approved invoice cannot be changed by a billing hold';end if;
 if p_clear then
 if not exists(select 1 from public.project_members where project_id=p_project and user_id=p_actor and active and role::text='pm') and not exists(select 1 from public.company_users cu join public.profiles pr on pr.id=cu.user_id join public.projects p on p.company_id=cu.company_id where p.id=p_project and cu.user_id=p_actor and cu.active and pr.active and pr.role::text in ('admin','executive')) then raise exception 'PM confirmation required' using errcode='42501';end if;
 if length(trim(p_reason))<3 then raise exception 'PM decision required';end if;
 update public.tc_payapp_billing_holds set status='Cleared for Billing',cleared_by=p_actor,decision=p_reason,updated_at=now() where id=p_hold and payapp_id=p_payapp and project_id=p_project returning * into h;
 if not found then raise exception 'Billing hold not found';end if;
 else
 if p_line is null or not exists(select 1 from public.tc_owner_payapp_records pa,jsonb_array_elements(pa.payload->'rows') with ordinality r(v,n) where pa.id=p_payapp and coalesce(r.v->>'item',r.v->>'itemNo',r.v->>'line_no',r.n::text)=p_line) then raise exception 'Valid affected SOV line required';end if;
 insert into public.tc_payapp_billing_holds(project_id,payapp_id,sov_line,reason,status,opened_by) values(p_project,p_payapp,p_line,p_reason,'PM Confirmation Required',p_actor) returning * into h;
 end if;
 insert into public.tc_payapp_hold_events(hold_id,actor_id,status,reason) values(h.id,p_actor,h.status,p_reason);return h;
end$$;
revoke all on all functions in schema tc_payapp_private from public,anon,authenticated;
revoke all on function public.tc_payapp_workflow_list(uuid,uuid),public.tc_payapp_workflow_prepare(uuid,uuid,uuid,uuid,uuid,uuid,text),public.tc_payapp_workflow_apply(uuid,uuid,integer,uuid,text,text,boolean,text,text,text,text),public.tc_payapp_billing_hold(uuid,uuid,uuid,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.tc_payapp_workflow_list(uuid,uuid),public.tc_payapp_workflow_prepare(uuid,uuid,uuid,uuid,uuid,uuid,text),public.tc_payapp_workflow_apply(uuid,uuid,integer,uuid,text,text,boolean,text,text,text,text),public.tc_payapp_billing_hold(uuid,uuid,uuid,text,text,uuid,boolean) to service_role;
create function public.tc_payapp_session_active(p_user uuid,p_session uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$select exists(select 1 from auth.sessions where id=p_session and user_id=p_user)$$;
revoke all on function public.tc_payapp_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.tc_payapp_session_active(uuid,uuid) to service_role;
