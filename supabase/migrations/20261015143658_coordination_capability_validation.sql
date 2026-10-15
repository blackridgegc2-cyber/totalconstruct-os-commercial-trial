create or replace function tc_coord_private.detail(p_kind text,p_id uuid)
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
 'manage',manage_,'comment',status_<>'closed','respond',p_kind='rfi' and assignee=auth.uid() and status_<>'closed',
 'review',p_kind='submittal' and assignee=auth.uid() and role_ in ('manager','pm','apm','architect','engineer') and status_ in ('pending','open','resubmitted'),
 'resubmit',p_kind='submittal' and status_ in ('revise_resubmit','rejected') and (creator=auth.uid() or manage_),
 'close',manage_ and status_ in ('answered','reviewed'),'reopen',manage_ and status_='closed'));
end $$;
create or replace function tc_coord_private.act(p_kind text,p_id uuid,p_expected integer,p_action text,p_request uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r jsonb;before_ jsonb;pid uuid;creator uuid;target uuid;role_ text;status_ text;manage_ boolean;note_ text;disposition_ text;prior jsonb;new_rev integer;due_ timestamptz;
begin
 r:=tc_coord_private.detail(p_kind,p_id)->'record';pid:=(r->>'project_id')::uuid;
 perform 1 from public.projects where id=pid for update;
 if p_kind='rfi' then select to_jsonb(x) into r from public.rfis x where id=p_id for update;
 else select to_jsonb(x) into r from public.submittals x where id=p_id for update;end if;
 if p_request is null or jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>30000 or p_action is null or p_action not in ('assign','respond','review','resubmit','comment','close','reopen') then raise exception 'Invalid workflow action' using errcode='22023';end if;
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

