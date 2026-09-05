-- Read-only verification after 20260905_01_harden_permissions.sql.
-- Run as postgres in Supabase SQL Editor. Every row must have passed = true.
WITH expected_functions(signature) AS (VALUES
  ('public.is_admin()'), ('public.current_tutor_id()'),
  ('public.create_class_full(character varying,character varying,uuid,numeric,date,date,jsonb,jsonb)'),
  ('public.change_tutor_safe(uuid,uuid,date,text,text)'),
  ('public.update_csat_fee_safe(uuid,numeric,date,text,text)'),
  ('public.take_attendance_safe(uuid,jsonb)'),
  ('public.rollback_billing_partial(text)'), ('public.get_unique_billing_periods()')
), functions AS (
  SELECT e.signature, p.oid, p.proconfig FROM expected_functions e
  LEFT JOIN pg_catalog.pg_proc p ON p.oid = to_regprocedure(e.signature)
), expected_tables(name) AS (VALUES
  ('students'),('tutors'),('classes'),('class_students'),('sessions'),
  ('session_attendance'),('payments'),('announcements'),('student_reviews'),('class_change_log')
), tables AS (
  SELECT e.name, c.oid, c.relrowsecurity FROM expected_tables e
  LEFT JOIN pg_catalog.pg_class c ON c.oid = to_regclass('public.' || e.name)
)
SELECT 'RPCs exist and have fixed search_path' AS check_name,
  bool_and(oid IS NOT NULL AND COALESCE('search_path=""' = ANY(proconfig), false)) AS passed FROM functions
UNION ALL
SELECT 'Anonymous cannot execute CSAT RPCs',
  bool_and(oid IS NOT NULL AND NOT COALESCE(has_function_privilege('anon', oid, 'EXECUTE'), true)) FROM functions
UNION ALL
SELECT 'Authenticated and service roles retain explicit RPC access',
  bool_and(oid IS NOT NULL AND COALESCE(has_function_privilege('authenticated', oid, 'EXECUTE'), false)
    AND COALESCE(has_function_privilege('service_role', oid, 'EXECUTE'), false)) FROM functions
UNION ALL
SELECT 'All ten CSAT tables have RLS enabled', bool_and(oid IS NOT NULL AND COALESCE(relrowsecurity, false)) FROM tables
UNION ALL
SELECT 'Anonymous has no DML or TRUNCATE on CSAT tables',
  bool_and(oid IS NOT NULL AND NOT COALESCE(has_table_privilege('anon', oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'), true)) FROM tables
UNION ALL
SELECT 'Authenticated role has no TRUNCATE on CSAT tables',
  bool_and(oid IS NOT NULL AND NOT COALESCE(has_table_privilege('authenticated', oid, 'TRUNCATE'), true)) FROM tables
UNION ALL
SELECT 'Tutor attendance policy permits SELECT only',
  EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='session_attendance'
    AND policyname='Tutor_View_Attendance' AND cmd='SELECT')
  AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='session_attendance'
    AND policyname <> 'Admin_Full_Attendance' AND cmd <> 'SELECT')
UNION ALL
SELECT 'Session write trigger is enabled', EXISTS (
  SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.sessions'::regclass
    AND tgname='guard_tutor_session_write' AND tgenabled='O' AND NOT tgisinternal
)
UNION ALL
SELECT 'At least one server-managed admin account exists',
  EXISTS (SELECT 1 FROM auth.users WHERE raw_app_meta_data ->> 'role' = 'admin');
