-- Read-only aggregate verification. Run on staging first, then the approved project.
-- Save every result/NOTICE privately and compare again during maintenance.
-- No contact fields, profile IDs, Auth tokens or row payloads are emitted.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '60s';
SELECT current_setting('transaction_read_only') AS read_only, now() AS checked_at;
SELECT version FROM csat_internal.schema_migrations ORDER BY version;

SELECT count(*) AS classes, count(*) FILTER (WHERE status='active') AS active_classes FROM public.classes;
SELECT count(*) AS learning_records, count(*) FILTER (WHERE published IS NOT NULL) AS published_records,
 count(*) FILTER (WHERE kind='class' AND published IS NOT NULL) AS published_class_plans,
 count(*) FILTER (WHERE published IS DISTINCT FROM draft) AS differing_draft_published
FROM public.learning_records;
SELECT count(*) AS parent_contacts, count(*) FILTER (WHERE active) AS active_parent_contacts FROM public.parent_accounts;
SELECT count(*) AS parent_auth_users FROM auth.users WHERE raw_app_meta_data->>'role'='parent';
SELECT count(*) AS lookup_sessions FROM public.parent_lookup_sessions;
SELECT coalesce(bool_or(email_enabled),false) AS monthly_email_enabled FROM public.parent_portal_settings;

WITH eligible AS (
 SELECT DISTINCT s.student_id,s.parent_name,csat_internal.parent_phone_domestic(s.parent_number) AS phone
 FROM public.students s JOIN public.class_students cs USING(student_id) JOIN public.classes c USING(class_id)
 WHERE s.is_deleted IS NOT TRUE AND s.status='Đang học' AND cs.status='active' AND c.status='active'
)
SELECT count(*) AS eligible_students,
 count(*) FILTER (WHERE phone IS NOT NULL AND length(btrim(coalesce(parent_name,'')))>0) AS with_valid_contact,
 count(*) FILTER (WHERE phone IS NULL OR length(btrim(coalesce(parent_name,'')))=0) AS missing_contact,
 count(DISTINCT phone) FILTER (WHERE phone IS NOT NULL AND length(btrim(coalesce(parent_name,'')))>0) AS contact_phone_groups
FROM eligible;

-- Aggregate digests cover complete rows, including draft/published and audit/history.
-- Exclude only migration-added fields, so rerunning after schema/provisioning is comparable.
-- Same counts are insufficient: compare digests too. An empty relation has a stable digest.
DO $$
DECLARE rel text; row_count bigint; digest text;
BEGIN
 FOREACH rel IN ARRAY ARRAY[
  'classes','class_students','class_enrollments','class_tutor_history','class_fee_history','student_fee_history',
  'students','tutors','sessions','session_attendance','session_roster_verifications','attendance_fee_verifications',
  'billing_periods','billing_sessions','billing_items','billing_adjustments','payments','payment_events',
  'learning_templates','learning_defaults','learning_records','learning_history','student_reviews',
  'parent_accounts','parent_student_links','business_audit_events','consultation_requests','consultation_email_outbox'
 ] LOOP
  IF to_regclass('public.'||rel) IS NULL THEN
   RAISE NOTICE 'preservation %: absent', rel;
  ELSE
   EXECUTE format(
    'SELECT count(*), md5(coalesce(string_agg(row_hash, '''' ORDER BY row_hash), '''')) FROM (SELECT md5((to_jsonb(t)-$1)::text) AS row_hash FROM public.%I t) q', rel)
    INTO row_count,digest
    USING CASE WHEN rel='classes' THEN ARRAY['program_code','program_revision']
               WHEN rel='parent_accounts' THEN ARRAY['auth_uid'] ELSE ARRAY[]::text[] END;
   RAISE NOTICE 'preservation %: rows=%, digest=%', rel,row_count,digest;
  END IF;
 END LOOP;
END $$;

SELECT c.relname AS relation, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname;

WITH functions(signature) AS (VALUES
 ('public.start_parent_lookup(text,text,text)'),('public.get_parent_lookup(text,uuid)'),
 ('public.parent_learning_portal(text,uuid,text,integer)'),('public.submit_registration(uuid,jsonb,text)'),
 ('public.admin_set_class_program(uuid,text,integer,text)'),('public.parent_auth_candidates()'))
SELECT signature,to_regprocedure(signature) IS NOT NULL AS present,
 CASE WHEN to_regprocedure(signature) IS NOT NULL THEN has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') END AS anon_execute,
 CASE WHEN to_regprocedure(signature) IS NOT NULL THEN has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE') END AS authenticated_execute,
 CASE WHEN to_regprocedure(signature) IS NOT NULL THEN has_function_privilege('service_role',to_regprocedure(signature),'EXECUTE') END AS service_execute
FROM functions;
ROLLBACK;
