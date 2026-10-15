-- Database-only acceptance fixture. The inner exception rolls back all users,
-- companies, accounts and journals. No invitations or communications are sent.
create temporary table tc_release_qa_results_20261015(result jsonb);
do $$
declare
 company uuid:=gen_random_uuid(); creator uuid:=gen_random_uuid(); approver uuid:=gen_random_uuid(); poster uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();
 batch uuid; caught boolean; checks integer:=0;
begin
 begin
  insert into auth.users(id,email) values (creator,creator::text||'@qa.invalid'),(approver,approver::text||'@qa.invalid'),(poster,poster::text||'@qa.invalid'),(outsider,outsider::text||'@qa.invalid');
  insert into public.companies(id,name) values(company,'TotalConnect transient release QA');
  insert into public.company_members(company_id,user_id,role) values(company,creator,'admin'),(company,approver,'admin'),(company,poster,'admin');
  insert into public.tc_chart_of_accounts(company_id,account_code,account_name,account_type) values(company,'QA-CASH','QA Cash','asset'),(company,'QA-EXP','QA Expense','expense');
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  caught:=false;
  begin perform public.tc_create_journal_draft(company,'qa',null,current_date,'Unauthorized test','[{"gl_account":"QA-EXP","debit":0.29},{"gl_account":"QA-CASH","credit":0.29}]'::jsonb);exception when insufficient_privilege then caught:=true;end;
  if not caught then raise exception 'FAIL unauthorized journal creation';end if;checks:=checks+1;
  perform set_config('request.jwt.claim.sub',creator::text,true);
  caught:=false;
  begin perform public.tc_create_journal_draft(company,'qa',null,current_date,'Unbalanced test','[{"gl_account":"QA-EXP","debit":0.29},{"gl_account":"QA-CASH","credit":0.28}]'::jsonb);exception when check_violation then caught:=true;end;
  if not caught then raise exception 'FAIL unbalanced journal accepted';end if;checks:=checks+1;
  batch:=public.tc_create_journal_draft(company,'qa',null,current_date,'Balanced cents test','[{"gl_account":"QA-EXP","debit":0.29},{"gl_account":"QA-CASH","credit":0.29}]'::jsonb);checks:=checks+1;
  caught:=false;
  begin perform public.tc_process_journal_batch(batch,'approve');exception when insufficient_privilege then caught:=true;end;
  if not caught then raise exception 'FAIL self approval accepted';end if;checks:=checks+1;
  caught:=false;
  begin perform public.tc_process_journal_batch(batch,'post');exception when check_violation then caught:=true;end;
  if not caught then raise exception 'FAIL posting unapproved journal accepted';end if;checks:=checks+1;
  perform set_config('request.jwt.claim.sub',approver::text,true);
  perform public.tc_process_journal_batch(batch,'approve');checks:=checks+1;
  caught:=false;
  begin perform public.tc_process_journal_batch(batch,'post');exception when insufficient_privilege then caught:=true;end;
  if not caught then raise exception 'FAIL approver posting own approval accepted';end if;checks:=checks+1;
  perform set_config('request.jwt.claim.sub',poster::text,true);
  perform public.tc_process_journal_batch(batch,'post');checks:=checks+1;
  if not exists(select 1 from public.tc_accounting_journal_batches where id=batch and status='posted') then raise exception 'FAIL journal not posted';end if;
  caught:=false;
  begin update public.tc_accounting_journal_batches set description='Changed after posting' where id=batch;exception when check_violation then caught:=true;end;
  if not caught then raise exception 'FAIL posted journal editable';end if;checks:=checks+1;
  caught:=false;
  begin update public.tc_accounting_journal_lines set debit=1 where batch_id=batch and debit>0;exception when check_violation then caught:=true;end;
  if not caught then raise exception 'FAIL posted journal lines editable';end if;checks:=checks+1;
  raise exception using errcode='ZQ001',message='Rollback successful QA fixture';
 exception when sqlstate 'ZQ001' then null;
 end;
 if exists(select 1 from public.companies where id=company) or exists(select 1 from auth.users where id=creator) then raise exception 'FAIL QA fixture not rolled back';end if;
 insert into tc_release_qa_results_20261015 values(jsonb_build_object('status','PASS','checks',checks,'fixture_rolled_back',true,'scope','database role simulation, not browser login acceptance'));
end $$;
select result from tc_release_qa_results_20261015;
