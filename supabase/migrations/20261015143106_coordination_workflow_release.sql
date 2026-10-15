create schema if not exists tc_coord_private;
revoke all on schema tc_coord_private from public,anon;
grant usage on schema tc_coord_private to authenticated;

alter table public.rfis add column record_version integer not null default 1 check(record_version>0),add column assigned_to uuid references public.profiles(id),add column drawing_reference text,add column specification_reference text,add column client_request_id uuid unique,add column creation_payload jsonb;
alter table public.submittals add column record_version integer not null default 1 check(record_version>0),add column assigned_to uuid references public.profiles(id),add column drawing_reference text,add column specification_reference text,add column submission_text text,add column review_disposition text,add column client_request_id uuid unique,add column creation_payload jsonb;
alter table public.rfi_events add column client_request_id uuid unique,add column event_data jsonb not null default '{}';
alter table public.submittal_events add column client_request_id uuid unique,add column event_data jsonb not null default '{}';
create index rfis_project_due on public.rfis(project_id,due_at) where closed_at is null;
create index submittals_project_due on public.submittals(project_id,due_at) where status<>'closed';
create table public.tc_coord_notifications(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),kind text not null check(kind in ('rfi','submittal')),record_id uuid not null,
 recipient_id uuid not null references public.profiles(id),actor_id uuid not null references public.profiles(id),event_type text not null,subject text not null,
 created_at timestamptz not null default now(),read_at timestamptz
);
create index tc_coord_notifications_recipient on public.tc_coord_notifications(recipient_id,project_id,created_at desc);
alter table public.tc_coord_notifications enable row level security;

create function tc_coord_private.role_for(p_project uuid,p_user uuid)
returns text language sql stable security definer set search_path=pg_catalog,public as $$
 select case when exists(select 1 from public.projects p join public.company_users cu on cu.company_id=p.company_id join public.profiles pr on pr.id=cu.user_id where p.id=p_project and cu.user_id=p_user and cu.active and pr.active and pr.role::text in ('admin','executive')) then 'manager'
 else (select m.role::text from public.project_members m join public.profiles pr on pr.id=m.user_id where m.project_id=p_project and m.user_id=p_user and m.active and pr.active limit 1) end;
$$;
create function tc_coord_private.granted(p_project uuid,p_user uuid,p_kind text)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.project_members m join public.profiles pr on pr.id=m.user_id where m.project_id=p_project and m.user_id=p_user and m.active and pr.active and (
 m.permissions ? (case p_kind when 'rfi' then 'rfi' else 'submittal' end)
 or exists(select 1 from public.tc_project_permission_overrides o where o.project_id=p_project and o.user_id=p_user and o.enabled and o.permission=(case p_kind when 'rfi' then 'rfi' else 'submittal' end))));
$$;
create function tc_coord_private.can_read(p_project uuid,p_kind text,p_id uuid,p_creator uuid,p_assignee uuid,p_sub uuid)
returns boolean language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare role_ text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and active) then return false;end if;
 role_:=tc_coord_private.role_for(p_project,auth.uid());
 if role_ in ('manager','pm','apm','superintendent','architect','engineer','owner') then return true;end if;
 if role_='subcontractor' and (p_creator=auth.uid() or p_assignee=auth.uid()) then return true;end if;
 if tc_coord_private.granted(p_project,auth.uid(),p_kind) then return true;end if;
 if p_sub is not null and public.subcontractor_on_project(p_project,p_sub) then return true;end if;
 if p_kind='rfi' then return exists(select 1 from public.rfi_distribution d where d.rfi_id=p_id and ((role_ is not null and d.user_id=auth.uid()) or (d.subcontractor_id is not null and public.subcontractor_on_project(p_project,d.subcontractor_id))));end if;
 return exists(select 1 from public.submittal_distribution d where d.submittal_id=p_id and ((role_ is not null and d.user_id=auth.uid()) or (d.subcontractor_id is not null and public.subcontractor_on_project(p_project,d.subcontractor_id))));
end $$;
create function tc_coord_private.can_create(p_project uuid,p_kind text)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select p_kind in ('rfi','submittal') and (tc_coord_private.role_for(p_project,auth.uid()) in ('manager','pm','apm','superintendent','architect','engineer','subcontractor') or tc_coord_private.granted(p_project,auth.uid(),p_kind));
$$;
create function tc_coord_private.can_manage(p_project uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(tc_coord_private.role_for(p_project,auth.uid()) in ('manager','pm','apm','superintendent'),false);
$$;
revoke all on all functions in schema tc_coord_private from public,anon,authenticated;
grant execute on function tc_coord_private.can_read(uuid,text,uuid,uuid,uuid,uuid) to authenticated;

-- Replace broad role predicates with active, company/project-scoped reads.
do $$declare r record;begin
 for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('rfis','rfi_events','rfi_distribution','submittals','submittal_events','submittal_distribution') loop execute format('drop policy %I on %I.%I',r.policyname,r.schemaname,r.tablename);end loop;
end $$;
create policy coord_rfi_read on public.rfis for select to authenticated using(tc_coord_private.can_read(project_id,'rfi',id,created_by,assigned_to,initiated_by_subcontractor_id));
create policy coord_sub_read on public.submittals for select to authenticated using(tc_coord_private.can_read(project_id,'submittal',id,submitted_by_user_id,assigned_to,subcontractor_id));
create policy coord_rfi_event_read on public.rfi_events for select to authenticated using(exists(select 1 from public.rfis r where r.id=rfi_id));
create policy coord_sub_event_read on public.submittal_events for select to authenticated using(exists(select 1 from public.submittals s where s.id=submittal_id));
create policy coord_rfi_distribution_read on public.rfi_distribution for select to authenticated using(exists(select 1 from public.rfis r where r.id=rfi_id));
create policy coord_sub_distribution_read on public.submittal_distribution for select to authenticated using(exists(select 1 from public.submittals s where s.id=submittal_id));
create policy coord_notification_read on public.tc_coord_notifications for select to authenticated using(recipient_id=auth.uid() and ((kind='rfi' and exists(select 1 from public.rfis where id=record_id)) or (kind='submittal' and exists(select 1 from public.submittals where id=record_id))));
revoke all on public.rfis,public.rfi_events,public.rfi_distribution,public.submittals,public.submittal_events,public.submittal_distribution,public.tc_coord_notifications from public,anon,authenticated;
grant select on public.rfis,public.rfi_events,public.rfi_distribution,public.submittals,public.submittal_events,public.submittal_distribution,public.tc_coord_notifications to authenticated;

create function tc_coord_private.members(p_project uuid,p_kind text)
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',coalesce(nullif(display_name,''),nullif(concat_ws(' ',first_name,last_name),''),'Project member'),'role',role_) order by display_name),'[]') from (
 select distinct pr.id,pr.display_name,pr.first_name,pr.last_name,tc_coord_private.role_for(p_project,pr.id) as role_ from public.profiles pr
 where pr.active and tc_coord_private.role_for(p_project,pr.id) is not null
 and (tc_coord_private.role_for(p_project,pr.id) in ('manager','pm','apm','superintendent','architect','engineer','owner','subcontractor') or tc_coord_private.granted(p_project,pr.id,p_kind))
 ) x;
$$;
create function tc_coord_private.detail(p_kind text,p_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare r jsonb;events_ jsonb;creator uuid;assignee uuid;pid uuid;sub_ uuid;role_ text;status_ text;manage_ boolean;
begin
 if p_kind='rfi' then select to_jsonb(x),x.project_id,x.created_by,x.assigned_to,x.initiated_by_subcontractor_id into r,pid,creator,assignee,sub_ from public.rfis x where id=p_id;
 elsif p_kind='submittal' then select to_jsonb(x),x.project_id,x.submitted_by_user_id,x.assigned_to,x.subcontractor_id into r,pid,creator,assignee,sub_ from public.submittals x where id=p_id;
 else raise exception 'Invalid coordination kind' using errcode='22023';end if;
 if r is null or not tc_coord_private.can_read(pid,p_kind,p_id,creator,assignee,sub_) then raise exception 'Record unavailable or access denied' using errcode='42501';end if;
 if p_kind='rfi' then select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') into events_ from public.rfi_events e where rfi_id=p_id;
 else select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') into events_ from public.submittal_events e where submittal_id=p_id;end if;
 role_:=tc_coord_private.role_for(pid,auth.uid());manage_:=tc_coord_private.can_manage(pid);status_:=lower(r->>'status');
 return jsonb_build_object('record',r,'events',events_,'members',tc_coord_private.members(pid,p_kind),'capabilities',jsonb_build_object(
 'manage',manage_,'comment',true,'respond',p_kind='rfi' and assignee=auth.uid() and status_<>'closed',
 'review',p_kind='submittal' and assignee=auth.uid() and role_ in ('manager','pm','apm','architect','engineer') and status_ in ('pending','open','resubmitted'),
 'resubmit',p_kind='submittal' and status_ in ('revise_resubmit','rejected') and (creator=auth.uid() or manage_),
 'close',manage_ and status_ in ('answered','reviewed'),'reopen',manage_ and status_='closed'));
end $$;
create function tc_coord_private.list_records(p_project uuid,p_kind text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare rows_ jsonb;
begin
 if p_kind is null or p_kind not in ('rfi','submittal') or auth.uid() is null or tc_coord_private.role_for(p_project,auth.uid()) is null then raise exception 'Project coordination access required' using errcode='42501';end if;
 if p_kind='rfi' then select coalesce(jsonb_agg(r order by r->>'created_at' desc),'[]') into rows_ from (select to_jsonb(x) as r from public.rfis x where project_id=p_project and tc_coord_private.can_read(project_id,p_kind,id,created_by,assigned_to,initiated_by_subcontractor_id) order by created_at desc limit 500) q;
 else select coalesce(jsonb_agg(r order by r->>'created_at' desc),'[]') into rows_ from (select to_jsonb(x) as r from public.submittals x where project_id=p_project and tc_coord_private.can_read(project_id,p_kind,id,submitted_by_user_id,assigned_to,subcontractor_id) order by created_at desc limit 500) q;end if;
 if tc_coord_private.role_for(p_project,auth.uid()) not in ('manager','pm','apm','superintendent','architect','engineer','owner','subcontractor') and not tc_coord_private.granted(p_project,auth.uid(),p_kind) then raise exception 'Coordination permission required' using errcode='42501';end if;
 return jsonb_build_object('records',rows_,'members',tc_coord_private.members(p_project,p_kind),'canCreate',coalesce(tc_coord_private.can_create(p_project,p_kind),false),'canManage',tc_coord_private.can_manage(p_project));
end $$;

create function tc_coord_private.notify(p_project uuid,p_kind text,p_record uuid,p_actor uuid,p_event text,p_subject text,p_recipients uuid[])
returns void language sql security definer set search_path=pg_catalog,public as $$
 insert into public.tc_coord_notifications(project_id,kind,record_id,recipient_id,actor_id,event_type,subject)
 select p_project,p_kind,p_record,uid,p_actor,p_event,left(p_subject,500) from (select distinct unnest(p_recipients) as uid) x where uid is not null and uid<>p_actor;
$$;
create function tc_coord_private.validate_assignee(p_project uuid,p_kind text,p_user uuid)
returns void language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if p_user is not null and not exists(select 1 from jsonb_array_elements(tc_coord_private.members(p_project,p_kind)) x where (x->>'id')::uuid=p_user) then raise exception 'Assignee must be an active, authorized project member' using errcode='42501';end if;
end $$;

create function tc_coord_private.create_record(p_project uuid,p_kind text,p_request uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare id_ uuid;existing jsonb;n numeric;number_ text;target uuid;activity uuid;due_ timestamptz;subject_ text;r jsonb;
begin
 if not coalesce(tc_coord_private.can_create(p_project,p_kind),false) then raise exception 'Coordination create permission required' using errcode='42501';end if;
 if p_request is null or jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>50000 then raise exception 'Invalid create request' using errcode='22023';end if;
 perform 1 from public.projects where id=p_project for update;
 if p_kind='rfi' then select to_jsonb(x) into existing from public.rfis x where client_request_id=p_request;
 else select to_jsonb(x) into existing from public.submittals x where client_request_id=p_request;end if;
 if existing is not null then
  if (existing->>'project_id')::uuid<>p_project or existing->'creation_payload'<>p_data or coalesce(existing->>'created_by',existing->>'submitted_by_user_id')<>auth.uid()::text then raise exception 'Create request already used' using errcode='40001';end if;
  return tc_coord_private.detail(p_kind,(existing->>'id')::uuid);
 end if;
 subject_:=btrim(p_data->>'title');if nullif(subject_,'') is null or length(subject_)>250 or nullif(btrim(p_data->>'text'),'') is null or length(p_data->>'text')>20000 then raise exception 'Title and detailed question/submission are required' using errcode='22023';end if;
 target:=nullif(p_data->>'assignee','')::uuid;activity:=nullif(p_data->>'activity','')::uuid;due_:=nullif(p_data->>'dueAt','')::timestamptz;
 perform tc_coord_private.validate_assignee(p_project,p_kind,target);
 if activity is not null and not exists(select 1 from public.schedule_activities where id=activity and project_id=p_project) then raise exception 'Schedule activity belongs to another project' using errcode='42501';end if;
 if p_kind='rfi' then
  select coalesce(max(((regexp_match(rfi_no,'([0-9]+)$'))[1])::numeric),0)+1 into n from public.rfis where project_id=p_project;
  number_:='RFI-'||lpad(n::text,greatest(3,length(n::text)),'0');
  insert into public.rfis(project_id,rfi_no,subject,question,initiated_by_type,initiated_by_user_id,created_by,assigned_to,current_ball_in_court,due_at,schedule_activity_id,drawing_reference,specification_reference,client_request_id,creation_payload)
  values(p_project,number_,subject_,p_data->>'text',tc_coord_private.role_for(p_project,auth.uid()),auth.uid(),auth.uid(),target,case when target is null then 'GC / Unassigned' else 'Assigned reviewer' end,due_,activity,p_data->>'drawingRef',p_data->>'specRef',p_request,p_data) returning id into id_;
  insert into public.rfi_events(rfi_id,event_type,created_by,response_text,client_request_id,event_data) values(id_,'create',auth.uid(),p_data->>'text',p_request,jsonb_build_object('request',p_data,'recordVersion',1));
 else
  select coalesce(max(((regexp_match(submittal_no,'([0-9]+)$'))[1])::numeric),0)+1 into n from public.submittals where project_id=p_project;
  number_:='SUB-'||lpad(n::text,greatest(3,length(n::text)),'0');
  insert into public.submittals(project_id,submittal_no,description,submission_text,submitted_by_user_id,submitted_at,assigned_to,current_ball_in_court,due_at,required_on_site,schedule_activity_id,drawing_reference,specification_reference,client_request_id,creation_payload)
  values(p_project,number_,subject_,p_data->>'text',auth.uid(),now(),target,case when target is null then 'GC / Unassigned' else 'Assigned reviewer' end,due_,nullif(p_data->>'requiredOnSite','')::date,activity,p_data->>'drawingRef',p_data->>'specRef',p_request,p_data) returning id into id_;
  insert into public.submittal_events(submittal_id,event_type,created_by,comments,client_request_id,event_data) values(id_,'create',auth.uid(),p_data->>'text',p_request,jsonb_build_object('request',p_data,'recordVersion',1));
 end if;
 perform tc_coord_private.notify(p_project,p_kind,id_,auth.uid(),'assigned',number_||' · '||subject_,array[target]);
 return tc_coord_private.detail(p_kind,id_);
end $$;

create function tc_coord_private.act(p_kind text,p_id uuid,p_expected integer,p_action text,p_request uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r jsonb;before_ jsonb;pid uuid;creator uuid;target uuid;role_ text;status_ text;manage_ boolean;note_ text;disposition_ text;prior jsonb;new_rev integer;due_ timestamptz;
begin
 r:=tc_coord_private.detail(p_kind,p_id)->'record';pid:=(r->>'project_id')::uuid;
 perform 1 from public.projects where id=pid for update;
 if p_kind='rfi' then select to_jsonb(x) into r from public.rfis x where id=p_id for update;
 else select to_jsonb(x) into r from public.submittals x where id=p_id for update;end if;
 if p_request is null or jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>30000 or p_action not in ('assign','respond','review','resubmit','comment','close','reopen') then raise exception 'Invalid workflow action' using errcode='22023';end if;
 if p_kind='rfi' then select to_jsonb(e) into prior from public.rfi_events e where client_request_id=p_request;
 else select to_jsonb(e) into prior from public.submittal_events e where client_request_id=p_request;end if;
 if prior is not null then
  if coalesce(prior->>'rfi_id',prior->>'submittal_id')<>p_id::text or prior->>'created_by'<>auth.uid()::text or prior->>'event_type'<>p_action or prior->'event_data'->'request'<>p_data then raise exception 'Action request already used' using errcode='40001';end if;
  return tc_coord_private.detail(p_kind,p_id);
 end if;
 if (r->>'record_version')::integer is distinct from p_expected then raise exception 'Record changed. Reload before submitting this action.' using errcode='40001';end if;
 role_:=tc_coord_private.role_for(pid,auth.uid());manage_:=tc_coord_private.can_manage(pid);status_:=lower(r->>'status');creator:=coalesce(r->>'created_by',r->>'submitted_by_user_id')::uuid;target:=nullif(r->>'assigned_to','')::uuid;before_:=r;
 note_:=btrim(p_data->>'text');if nullif(note_,'') is null or length(note_)>20000 then raise exception 'A response or action note is required' using errcode='22023';end if;
 if p_action='assign' then
  if not manage_ or status_='closed' then raise exception 'Active-record assignment requires project management permission' using errcode='42501';end if;
  target:=nullif(p_data->>'assignee','')::uuid;perform tc_coord_private.validate_assignee(pid,p_kind,target);
  due_:=nullif(p_data->>'dueAt','')::timestamptz;
  r:=r||jsonb_build_object('assigned_to',target,'current_ball_in_court',case when target is null then 'GC / Unassigned' else 'Assigned reviewer' end,'due_at',due_);
 elsif p_action='respond' then
  if p_kind<>'rfi' or target is distinct from auth.uid() or status_='closed' then raise exception 'Only the assigned RFI recipient may answer an open RFI' using errcode='42501';end if;
  r:=r||jsonb_build_object('status','answered','answered_at',now(),'assigned_to',null,'current_ball_in_court','GC Review');
 elsif p_action='review' then
  if p_kind<>'submittal' or target is distinct from auth.uid() or coalesce(role_,'') not in ('manager','pm','apm','architect','engineer') or status_ not in ('pending','open','resubmitted') then raise exception 'Only the assigned authorized reviewer may review this submittal' using errcode='42501';end if;
  disposition_:=p_data->>'disposition';if disposition_ not in ('approved','approved_as_noted','revise_resubmit','rejected') or disposition_ is null then raise exception 'Select a review disposition' using errcode='22023';end if;
  r:=r||jsonb_build_object('status',case when disposition_ in ('approved','approved_as_noted') then 'reviewed' else disposition_ end,'review_disposition',disposition_,'returned_at',now(),'assigned_to',creator,'current_ball_in_court',case when disposition_ in ('approved','approved_as_noted') then 'GC Review' else 'Submitter' end);
 elsif p_action='resubmit' then
  if p_kind<>'submittal' or status_ not in ('revise_resubmit','rejected') or (creator is distinct from auth.uid() and not manage_) or not coalesce(tc_coord_private.can_create(pid,p_kind),false) then raise exception 'Only the submitter or project management may resubmit a returned submittal' using errcode='42501';end if;
  target:=nullif(p_data->>'assignee','')::uuid;perform tc_coord_private.validate_assignee(pid,p_kind,target);
  select coalesce(max(revision_no),0)+1 into new_rev from public.submittals where project_id=pid and submittal_no=r->>'submittal_no';
  r:=r||jsonb_build_object('revision_no',new_rev,'status','resubmitted','review_disposition',null,'assigned_to',target,'current_ball_in_court',case when target is null then 'GC / Unassigned' else 'Assigned reviewer' end);
 elsif p_action='close' then
  if not manage_ or status_ not in ('answered','reviewed') then raise exception 'Project management may close only answered RFIs or reviewed submittals' using errcode='42501';end if;
  r:=r||jsonb_build_object('status','closed','assigned_to',null,'current_ball_in_court','Closed');
  if p_kind='rfi' then r:=r||jsonb_build_object('closed_at',now());end if;
 elsif p_action='reopen' then
  if not manage_ or status_<>'closed' then raise exception 'Only project management may reopen a closed record' using errcode='42501';end if;
  r:=r||jsonb_build_object('status',case p_kind when 'rfi' then 'open' else 'pending' end,'assigned_to',null,'current_ball_in_court','GC / Unassigned');
  if p_kind='rfi' then r:=r||jsonb_build_object('closed_at',null);end if;
 elsif status_='closed' then raise exception 'Reopen the record before adding a comment' using errcode='23514';
 end if;
 if p_kind='rfi' then
  update public.rfis set status=r->>'status',assigned_to=(r->>'assigned_to')::uuid,current_ball_in_court=r->>'current_ball_in_court',due_at=(r->>'due_at')::timestamptz,answered_at=(r->>'answered_at')::timestamptz,closed_at=(r->>'closed_at')::timestamptz,record_version=record_version+1,updated_at=now() where id=p_id returning to_jsonb(rfis.*) into r;
  insert into public.rfi_events(rfi_id,event_type,created_by,response_text,client_request_id,event_data) values(p_id,p_action,auth.uid(),note_,p_request,jsonb_build_object('request',p_data,'before',before_,'after',r));
 else
  update public.submittals set status=r->>'status',assigned_to=(r->>'assigned_to')::uuid,current_ball_in_court=r->>'current_ball_in_court',due_at=(r->>'due_at')::timestamptz,returned_at=(r->>'returned_at')::timestamptz,review_disposition=r->>'review_disposition',revision_no=(r->>'revision_no')::integer,record_version=record_version+1,updated_at=now() where id=p_id returning to_jsonb(submittals.*) into r;
  insert into public.submittal_events(submittal_id,event_type,created_by,comments,disposition,client_request_id,event_data) values(p_id,p_action,auth.uid(),note_,disposition_,p_request,jsonb_build_object('request',p_data,'before',before_,'after',r));
 end if;
 perform tc_coord_private.notify(pid,p_kind,p_id,auth.uid(),p_action,coalesce(r->>'rfi_no',r->>'submittal_no')||' · '||coalesce(r->>'subject',r->>'description'),array[creator,(r->>'assigned_to')::uuid]);
 return tc_coord_private.detail(p_kind,p_id);
end $$;

create function tc_coord_private.read_notification(p_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare n public.tc_coord_notifications;
begin
 select * into n from public.tc_coord_notifications where id=p_id and recipient_id=auth.uid();
 if not found then raise exception 'Notification unavailable' using errcode='42501';end if;
 perform tc_coord_private.detail(n.kind,n.record_id);
 update public.tc_coord_notifications set read_at=coalesce(read_at,now()) where id=p_id;
end $$;
revoke all on all functions in schema tc_coord_private from public,anon,authenticated;
grant execute on function tc_coord_private.can_read(uuid,text,uuid,uuid,uuid,uuid),tc_coord_private.list_records(uuid,text),tc_coord_private.detail(text,uuid),tc_coord_private.create_record(uuid,text,uuid,jsonb),tc_coord_private.act(text,uuid,integer,text,uuid,jsonb),tc_coord_private.read_notification(uuid) to authenticated;
create function public.tc_coord_list(p_project uuid,p_kind text) returns jsonb language sql security invoker set search_path=pg_catalog,public as $$select tc_coord_private.list_records(p_project,p_kind)$$;
create function public.tc_coord_detail(p_kind text,p_id uuid) returns jsonb language sql security invoker set search_path=pg_catalog,public as $$select tc_coord_private.detail(p_kind,p_id)$$;
create function public.tc_coord_create(p_project uuid,p_kind text,p_request uuid,p_data jsonb) returns jsonb language sql security invoker set search_path=pg_catalog,public as $$select tc_coord_private.create_record(p_project,p_kind,p_request,p_data)$$;
create function public.tc_coord_action(p_kind text,p_id uuid,p_expected integer,p_action text,p_request uuid,p_data jsonb) returns jsonb language sql security invoker set search_path=pg_catalog,public as $$select tc_coord_private.act(p_kind,p_id,p_expected,p_action,p_request,p_data)$$;
create function public.tc_coord_read_notification(p_id uuid) returns void language sql security invoker set search_path=pg_catalog,public as $$select tc_coord_private.read_notification(p_id)$$;
revoke all on function public.tc_coord_list(uuid,text),public.tc_coord_detail(text,uuid),public.tc_coord_create(uuid,text,uuid,jsonb),public.tc_coord_action(text,uuid,integer,text,uuid,jsonb),public.tc_coord_read_notification(uuid) from public,anon;
grant execute on function public.tc_coord_list(uuid,text),public.tc_coord_detail(text,uuid),public.tc_coord_create(uuid,text,uuid,jsonb),public.tc_coord_action(text,uuid,integer,text,uuid,jsonb),public.tc_coord_read_notification(uuid) to authenticated;
