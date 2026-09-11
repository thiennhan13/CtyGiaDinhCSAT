-- Read-only verification after 20260911_16. Every row should report passed=true.
SELECT 'migration_16' AS check_name, EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260911_16') AS passed
UNION ALL SELECT 'all_parent_accounts_domestic',NOT EXISTS(SELECT 1 FROM public.parent_accounts WHERE phone !~ '^0[35789][0-9]{8}$')
UNION ALL SELECT 'unique_parent_phones',NOT EXISTS(SELECT phone FROM public.parent_accounts GROUP BY phone HAVING count(*)>1)
UNION ALL SELECT 'valid_student_phones_domestic',NOT EXISTS(SELECT 1 FROM public.students WHERE csat_internal.parent_phone_domestic(parent_number) IS NOT NULL AND parent_number IS DISTINCT FROM csat_internal.parent_phone_domestic(parent_number))
UNION ALL SELECT 'lookup_service_only',has_function_privilege('service_role','public.start_parent_lookup(text,text,text)','EXECUTE') AND NOT has_function_privilege('anon','public.start_parent_lookup(text,text,text)','EXECUTE') AND NOT has_function_privilege('authenticated','public.start_parent_lookup(text,text,text)','EXECUTE')
UNION ALL SELECT 'parent_rls_retained',(SELECT relrowsecurity FROM pg_class WHERE oid='public.parent_accounts'::regclass);
