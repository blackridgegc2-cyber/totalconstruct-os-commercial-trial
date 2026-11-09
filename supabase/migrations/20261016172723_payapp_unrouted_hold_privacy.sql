-- Billing dispute notes and recipient setup must not reveal an unrouted application.
create or replace function public.tc_payapp_workflow_list(p_actor uuid,p_project uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare role_ text;visible_ uuid[];
begin
 role_:=tc_payapp_private.role_for(p_project,p_actor);
 select coalesce(array_agg(w.payapp_id),'{}'::uuid[]) into visible_ from public.tc_payapp_workflows w where w.project_id=p_project and (
 role_='contractor' or (w.owner_id=p_actor and w.stage in ('owner_signature','owner_route','lender_approval','approved','returned')) or (w.lender_id=p_actor and w.stage in ('lender_approval','approved')));
 return jsonb_build_object(
 'role',role_,
 'workflows',coalesce((select jsonb_agg(to_jsonb(w)||jsonb_build_object('events',(select coalesce(jsonb_agg(e order by e.version),'[]'::jsonb) from public.tc_payapp_workflow_events e where e.workflow_id=w.id),'invoice',(select to_jsonb(i) from public.tc_payapp_approved_invoices i where i.payapp_id=w.payapp_id))) from public.tc_payapp_workflows w where w.project_id=p_project and w.payapp_id=any(visible_)),'[]'::jsonb),
 'holds',coalesce((select jsonb_agg(h) from public.tc_payapp_billing_holds h where h.project_id=p_project and (role_='contractor' or h.payapp_id=any(visible_))),'[]'::jsonb),
 'recipients',case when role_='contractor' then coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'role',m.role,'name',pr.display_name,'email',pr.email)) from public.project_members m join public.profiles pr on pr.id=m.user_id where m.project_id=p_project and m.active and pr.active and m.role::text in ('owner','lender') and tc_access_private.has_permission(p_project,'payapps',m.user_id)),'[]'::jsonb) else '[]'::jsonb end);
end$$;
revoke all on function public.tc_payapp_workflow_list(uuid,uuid) from public,anon,authenticated;
grant execute on function public.tc_payapp_workflow_list(uuid,uuid) to service_role;
