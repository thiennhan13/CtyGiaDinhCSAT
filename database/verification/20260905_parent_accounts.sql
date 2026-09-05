-- Read-only, run as postgres after migration 20260905_02. Every passed must be true.
WITH funcs AS (
  SELECT p.* FROM (VALUES ('public.admin_save_parent_account(uuid,text,text,uuid[],boolean)'),
    ('public.get_parent_portal(uuid)')) e(signature)
  LEFT JOIN pg_catalog.pg_proc p ON p.oid = to_regprocedure(e.signature)
), tables AS (
  SELECT c.* FROM (VALUES ('public.parent_accounts'), ('public.parent_student_links')) e(name)
  LEFT JOIN pg_catalog.pg_class c ON c.oid = to_regclass(e.name)
)
SELECT 'Both parent tables exist with RLS' AS check_name,
  bool_and(oid IS NOT NULL AND relrowsecurity) AS passed FROM tables
UNION ALL
SELECT 'Parent RPCs exist, use definer and fixed search_path',
  bool_and(oid IS NOT NULL AND prosecdef AND COALESCE('search_path=""' = ANY(proconfig), false)) FROM funcs
UNION ALL
SELECT 'Anonymous cannot execute parent RPCs',
  bool_and(oid IS NOT NULL AND NOT COALESCE(has_function_privilege('anon',oid,'EXECUTE'), true)) FROM funcs
UNION ALL
SELECT 'Authenticated can execute guarded parent RPCs',
  bool_and(oid IS NOT NULL AND COALESCE(has_function_privilege('authenticated',oid,'EXECUTE'), false)) FROM funcs
UNION ALL
SELECT 'Anonymous has no access to parent tables',
  bool_and(oid IS NOT NULL AND NOT COALESCE(has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'), true)) FROM tables
UNION ALL
SELECT 'Authenticated has no truncate on parent tables',
  bool_and(oid IS NOT NULL AND NOT COALESCE(has_table_privilege('authenticated',oid,'TRUNCATE'), true)) FROM tables
UNION ALL
SELECT 'Parent policies match the installed set',
  (SELECT count(*) = 3 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename IN ('parent_accounts','parent_student_links'))
  AND EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='parent_accounts'
    AND policyname='Admin_Manage_Parent_Accounts' AND cmd='ALL' AND roles=ARRAY['authenticated']::name[] AND qual='is_admin()' AND with_check='is_admin()')
  AND EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='parent_accounts'
    AND policyname='Parent_View_Self' AND cmd='SELECT' AND roles=ARRAY['authenticated']::name[] AND qual LIKE '%auth_uid = auth.uid()%' AND qual LIKE '%app_metadata%parent%')
  AND EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='parent_student_links'
    AND policyname='Admin_Manage_Parent_Links' AND cmd='ALL' AND roles=ARRAY['authenticated']::name[] AND qual='is_admin()' AND with_check='is_admin()')
UNION ALL
SELECT 'Parent accounts match Auth role and canonical phone', NOT EXISTS (
  SELECT 1 FROM public.parent_accounts p LEFT JOIN auth.users u ON u.id=p.auth_uid
  WHERE u.id IS NULL OR (u.raw_app_meta_data->>'role' = 'parent') IS NOT TRUE
    OR (ltrim(u.phone,'+') = ltrim(p.phone,'+')) IS NOT TRUE)
UNION ALL
SELECT 'Student links have valid accounts and students', NOT EXISTS (
  SELECT 1 FROM public.parent_student_links l LEFT JOIN public.parent_accounts p ON p.auth_uid=l.parent_auth_uid
  LEFT JOIN public.students s ON s.student_id=l.student_id WHERE p.auth_uid IS NULL OR s.student_id IS NULL)
UNION ALL
SELECT 'Legacy attendance RPC still denies anonymous execution',
  NOT has_function_privilege('anon','public.take_attendance_safe(uuid,jsonb)','EXECUTE');
