create or replace function tc_cost_private.validate_coding() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare default_ text;description_ text;
begin
 if new.csi_code is not null then
  select default_type,description into default_,description_ from public.tc_csi_reference_codes where code=new.csi_code;
  if not found then select default_type,description into default_,description_ from public.tc_company_cost_codes where company_id=new.company_id and code=new.csi_code;end if;
  if default_ is null then raise exception 'Unknown CSI cost code. Add a company cost code before using it.' using errcode='23514';end if;
  new.cost_type:=coalesce(nullif(new.cost_type,''),default_);new.scope_name:=coalesce(nullif(btrim(new.scope_name),''),description_);
 end if;
 if new.cost_type is not null and new.cost_type not in ('SUB','LAB','MAT','EQUIP','GR','OHP','OTHER') then raise exception 'Invalid cost type' using errcode='23514';end if;
 return new;
end $$;
do $$declare d text;begin
 d:=pg_get_functiondef('public.tc_prepare_charge_journal(uuid,text,text)'::regprocedure);
 if position('for a in select project_id,csi_code,amount from' in d)=0 then raise exception 'Charge preparation changed; review patch';end if;
 d:=replace(d,'for a in select project_id,csi_code,amount from','for a in select project_id,csi_code,amount,cost_type,scope_name from');
 d:=replace(d,'csi_code,debit,credit,description) values(v_batch,c.company_id,p_expense_account,a.project_id','csi_code,debit,credit,description,cost_type,scope_name) values(v_batch,c.company_id,p_expense_account,a.project_id');
 d:=replace(d,$patch$'Allocated charge expense');$patch$,$patch$'Allocated charge expense',a.cost_type,a.scope_name);$patch$);execute d;
end $$;
