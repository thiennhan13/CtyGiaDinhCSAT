-- After migration03: every row must return passed=true. Read-only.
WITH funcs AS (
  SELECT p.oid,p.proname,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('start_parent_lookup','get_parent_lookup','end_parent_lookup')
), parent_tables AS (
  SELECT c.oid,c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('parent_accounts','parent_student_links','parent_lookup_sessions','parent_lookup_limits')
)
SELECT '01_parent_id_detached_from_auth' AS check_name,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='parent_accounts' AND column_name='parent_id')
  AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attname='parent_id'
    WHERE c.conrelid='public.parent_accounts'::regclass AND c.contype='f' AND c.confrelid='auth.users'::regclass AND a.attnum=ANY(c.conkey)) AS passed
UNION ALL SELECT '02_legacy_rpc_removed',to_regprocedure('public.get_parent_portal(uuid)') IS NULL AND to_regprocedure('public.admin_save_parent_account(uuid,text,text,uuid[],boolean)') IS NULL
UNION ALL SELECT '03_all_parent_tables_rls',(SELECT count(*)=4 AND bool_and(relrowsecurity) FROM parent_tables)
UNION ALL SELECT '04_anon_cannot_access_raw_tables',NOT EXISTS(SELECT 1 FROM parent_tables WHERE has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'))
UNION ALL SELECT '05_sessions_limits_server_only',NOT EXISTS(SELECT 1 FROM parent_tables WHERE relname IN ('parent_lookup_sessions','parent_lookup_limits') AND has_table_privilege('authenticated',oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'))
UNION ALL SELECT '06_lookup_rpc_server_only',(SELECT count(*)=3 AND bool_and(NOT has_function_privilege('anon',oid,'EXECUTE') AND NOT has_function_privilege('authenticated',oid,'EXECUTE') AND has_function_privilege('service_role',oid,'EXECUTE')) FROM funcs)
UNION ALL SELECT '07_rpc_fixed_search_path',(SELECT count(*)=3 AND bool_and(prosecdef AND proconfig @> ARRAY['search_path=""']) FROM funcs)
UNION ALL SELECT '08_only_admin_parent_policies',(SELECT count(*)=2 AND bool_and((tablename,policyname) IN (('parent_accounts','Admin_Manage_Parent_Accounts'),('parent_student_links','Admin_Manage_Parent_Links'))) FROM pg_policies WHERE schemaname='public' AND tablename IN ('parent_accounts','parent_student_links','parent_lookup_sessions','parent_lookup_limits'))
UNION ALL SELECT '09_links_are_valid',NOT EXISTS(SELECT 1 FROM public.parent_student_links l LEFT JOIN public.parent_accounts p ON p.parent_id=l.parent_id LEFT JOIN public.students s ON s.student_id=l.student_id WHERE p.parent_id IS NULL OR s.student_id IS NULL)
UNION ALL SELECT '10_legacy_ids_preserved',NOT EXISTS(SELECT 1 FROM public.parent_accounts WHERE legacy_auth_uid IS NOT NULL AND parent_id<>legacy_auth_uid)
UNION ALL SELECT '11_canonical_unique_phones',NOT EXISTS(SELECT 1 FROM public.parent_accounts WHERE phone !~ '^\+84[35789][0-9]{8}$') AND NOT EXISTS(SELECT phone FROM public.parent_accounts GROUP BY phone HAVING count(*)>1)
UNION ALL SELECT '12_admin_contact_rpc_guarded',COALESCE(has_function_privilege('authenticated',to_regprocedure('public.admin_save_parent_contact(uuid,text,text,uuid[],boolean)'),'EXECUTE') AND NOT has_function_privilege('anon',to_regprocedure('public.admin_save_parent_contact(uuid,text,text,uuid[],boolean)'),'EXECUTE') AND position('is_admin() IS NOT TRUE' in pg_get_functiondef(to_regprocedure('public.admin_save_parent_contact(uuid,text,text,uuid[],boolean)')))>0,false)
ORDER BY check_name;
