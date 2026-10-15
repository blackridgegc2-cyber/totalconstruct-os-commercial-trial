create policy tc_message_feature_gate on public.tc_project_messages as restrictive for all to authenticated using(tc_access_private.has_permission(project_id,'internal') or tc_access_private.has_permission(project_id,'external')) with check(tc_access_private.has_permission(project_id,'internal') or tc_access_private.has_permission(project_id,'external'));
create policy tc_event_feature_gate on public.tc_project_events as restrictive for all to authenticated using(tc_access_private.has_permission(project_id,'meetings')) with check(tc_access_private.has_permission(project_id,'meetings'));
-- These administration tables are accessed through validated RPCs/service provisioning only.
create policy tc_rpc_only on public.tc_user_access_versions for all to authenticated using(false) with check(false);
create policy tc_rpc_only on public.tc_project_access_rules for all to authenticated using(false) with check(false);
create policy tc_rpc_only on public.tc_user_access_events for all to authenticated using(false) with check(false);
create policy tc_rpc_only on public.tc_invite_access_plans for all to authenticated using(false) with check(false);
