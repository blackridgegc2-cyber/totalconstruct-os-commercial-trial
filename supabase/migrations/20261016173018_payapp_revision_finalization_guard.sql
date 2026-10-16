-- Serialize finalization across all revisions of one monthly application.
create or replace function public.tc_payapp_workflow_apply(p_actor uuid,p_workflow uuid,p_expected integer,p_request uuid,p_action text,p_name text default '',p_consent boolean default false,p_source_hash text default '',p_result_hash text default '',p_result_path text default '',p_reason text default '') returns public.tc_payapp_workflows language plpgsql security definer set search_path=pg_catalog,public as $$
declare w public.tc_payapp_workflows;ev public.tc_payapp_workflow_events;next_ text;actor_ uuid;role_ text;amount_ numeric;envelope_ uuid;begin
 select * into w from public.tc_payapp_workflows where id=p_workflow;
 if not found then raise exception 'Workflow not found';end if;
 perform 1 from public.tc_owner_payapp_records where id=w.payapp_id for update;
 perform pg_advisory_xact_lock(hashtextextended(w.project_id::text||':'||(select application_number::text from public.tc_owner_payapp_records where id=w.payapp_id),0));
 select * into w from public.tc_payapp_workflows where id=p_workflow for update;
 if not found then raise exception 'Workflow not found';end if;
 role_:=tc_payapp_private.role_for(w.project_id,p_actor);
 select * into ev from public.tc_payapp_workflow_events where request_id=p_request;
 if found then if ev.workflow_id<>w.id or ev.actor_id<>p_actor or ev.action<>p_action then raise exception 'Request identifier reused';end if;return w;end if;
 if p_action<>'return' and exists(select 1 from public.tc_owner_payapp_records current_ join public.tc_owner_payapp_records newer on newer.project_id=current_.project_id and newer.application_number=current_.application_number and newer.revision>current_.revision where current_.id=w.payapp_id) then raise exception 'A newer billing revision exists; reopen the latest application';end if;
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
 if exists(select 1 from public.tc_payapp_approved_invoices i join public.tc_owner_payapp_records prior_ on prior_.id=i.payapp_id join public.tc_owner_payapp_records current_ on current_.project_id=prior_.project_id and current_.application_number=prior_.application_number where current_.id=w.payapp_id and i.status<>'void') then raise exception 'This application already has an approved invoice';end if;
 select id into envelope_ from public.tc_native_signature_envelopes where payapp_id=w.payapp_id and document_id=w.document_id;
 insert into public.tc_payapp_approved_invoices(project_id,payapp_id,envelope_id,invoice_number,amount,approved_at,metadata) values(w.project_id,w.payapp_id,envelope_,'TC-PA-'||w.payapp_id::text,amount_,now(),jsonb_build_object('workflowId',w.id,'documentSha256',w.current_sha256));
 update public.tc_owner_payapp_records set status='lender_approved' where id=w.payapp_id;
 end if;
 if next_ in ('owner_signature','lender_approval','approved','returned') then
 insert into public.notifications(project_id,user_id,notification_type,subject,module,record_type,record_id,action_required,email_required) values(w.project_id,case when next_='owner_signature' then w.owner_id when next_='lender_approval' then w.lender_id else w.contractor_id end,'payapp_workflow',case when next_='approved' then 'Pay application approved — invoice created' when next_='returned' then 'Pay application returned for correction' else 'Pay application requires your review' end,'payapps','payapp',w.payapp_id,next_ in ('owner_signature','lender_approval','returned'),false);
 end if;
 return w;
end$$;
revoke all on function public.tc_payapp_workflow_apply(uuid,uuid,integer,uuid,text,text,boolean,text,text,text,text) from public,anon,authenticated;
grant execute on function public.tc_payapp_workflow_apply(uuid,uuid,integer,uuid,text,text,boolean,text,text,text,text) to service_role;
create or replace function public.tc_payapp_billing_hold(p_actor uuid,p_project uuid,p_payapp uuid,p_line text,p_reason text,p_hold uuid default null,p_clear boolean default false) returns public.tc_payapp_billing_holds language plpgsql security definer set search_path=pg_catalog,public as $$declare h public.tc_payapp_billing_holds;begin
 if tc_payapp_private.role_for(p_project,p_actor)<>'contractor' then raise exception 'PM or company management access required' using errcode='42501';end if;
 -- Serialize hold creation/clearance against all finalization actions.
 perform 1 from public.tc_owner_payapp_records where id=p_payapp and project_id=p_project for update;if not found then raise exception 'Application not found';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_project::text||':'||(select application_number::text from public.tc_owner_payapp_records where id=p_payapp),0));
 if exists(select 1 from public.tc_payapp_approved_invoices i join public.tc_owner_payapp_records prior_ on prior_.id=i.payapp_id join public.tc_owner_payapp_records target on target.project_id=prior_.project_id and target.application_number=prior_.application_number where target.id=p_payapp and i.status<>'void') then raise exception 'Approved invoice cannot be changed by a billing hold';end if;
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
revoke all on function public.tc_payapp_billing_hold(uuid,uuid,uuid,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.tc_payapp_billing_hold(uuid,uuid,uuid,text,text,uuid,boolean) to service_role;
