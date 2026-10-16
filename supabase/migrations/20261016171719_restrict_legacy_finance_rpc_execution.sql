-- These are signed-in finance/membership APIs, never anonymous APIs.
revoke execute on function public.tc_create_charge_account(uuid,text,text,text,text),public.tc_is_company_account_member(uuid),public.tc_is_project_member(uuid),public.tc_propose_charge_classification(uuid,uuid,text,text) from public,anon;
grant execute on function public.tc_create_charge_account(uuid,text,text,text,text),public.tc_is_company_account_member(uuid),public.tc_is_project_member(uuid),public.tc_propose_charge_classification(uuid,uuid,text,text) to authenticated,service_role;
