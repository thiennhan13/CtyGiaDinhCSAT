BEGIN TRANSACTION READ ONLY;
SELECT version,applied_at FROM csat_internal.schema_migrations WHERE version='20260913_18';
SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN ('consultation_requests','consultation_email_outbox');
SELECT tablename,policyname,roles,cmd FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('consultation_requests','consultation_email_outbox');
SELECT has_function_privilege('anon','public.submit_consultation(uuid,jsonb,text,jsonb)','EXECUTE') AS anon_submit_should_be_false,
 has_function_privilege('authenticated','public.claim_consultation_email(uuid,text)','EXECUTE') AS auth_claim_should_be_false,
 has_function_privilege('service_role','public.submit_consultation(uuid,jsonb,text,jsonb)','EXECUTE') AS service_submit_should_be_true;
SELECT count(*) AS missing_mail_rows FROM public.consultation_requests r LEFT JOIN public.consultation_email_outbox o USING(request_id) WHERE o.request_id IS NULL;
SELECT status,count(*) FROM public.consultation_email_outbox GROUP BY status;
ROLLBACK;
