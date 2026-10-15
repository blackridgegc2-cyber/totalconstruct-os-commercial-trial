-- Keep privileged implementations outside the exposed Data API schema.
alter function public.tc_save_project_import(uuid,text,uuid,integer,text,text,jsonb) set schema tc_import_private;
alter function public.tc_apply_project_import(uuid,integer,jsonb) set schema tc_import_private;
alter function public.tc_update_import_forecast(uuid,integer,integer,numeric) set schema tc_import_private;
create function public.tc_save_project_import(p_project_id uuid,p_kind text,p_import_id uuid,p_expected_revision integer,p_file_name text,p_source_path text,p_payload jsonb)
returns jsonb language sql security invoker set search_path=pg_catalog,public as $$
 select tc_import_private.tc_save_project_import(p_project_id,p_kind,p_import_id,p_expected_revision,p_file_name,p_source_path,p_payload);
$$;
create function public.tc_apply_project_import(p_import_id uuid,p_expected_revision integer,p_values jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path=pg_catalog,public as $$
 select tc_import_private.tc_apply_project_import(p_import_id,p_expected_revision,p_values);
$$;
create function public.tc_update_import_forecast(p_import_id uuid,p_expected_revision integer,p_line_index integer,p_forecast numeric)
returns jsonb language sql security invoker set search_path=pg_catalog,public as $$
 select tc_import_private.tc_update_import_forecast(p_import_id,p_expected_revision,p_line_index,p_forecast);
$$;
revoke all on function public.tc_save_project_import(uuid,text,uuid,integer,text,text,jsonb),public.tc_apply_project_import(uuid,integer,jsonb),public.tc_update_import_forecast(uuid,integer,integer,numeric) from public,anon;
grant execute on function public.tc_save_project_import(uuid,text,uuid,integer,text,text,jsonb),public.tc_apply_project_import(uuid,integer,jsonb),public.tc_update_import_forecast(uuid,integer,integer,numeric) to authenticated;
