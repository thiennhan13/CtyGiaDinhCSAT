-- Read-only readiness check. No Auth users, contact details or profile text are returned.
-- Run against the intended project; this does not authorize migrations or a reset.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '10s';

SELECT version FROM csat_internal.schema_migrations ORDER BY version;

WITH required(version, purpose) AS (VALUES
 ('20260914_19', 'dependency for profile chain'),
 ('20260922_21', 'dependency for profiles'),
 ('20260923_22', 'tutor profiles and avatar registry'),
 ('20261024_29', 'login budget'),
 ('20261031_30', 'Google and one-to-one parent identity'),
 ('20261031_31', 'certificates and tutor receipts'),
 ('20261031_32', 'CSATOJ accounts and grants')
)
SELECT r.version, r.purpose, m.version IS NOT NULL AS applied
FROM required r LEFT JOIN csat_internal.schema_migrations m USING (version)
ORDER BY r.version;

SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
 AND table_name IN ('tutor_public_profiles', 'tutor_avatar_assets',
                    'parent_identity_links', 'student_oj_accounts')
ORDER BY table_name, ordinal_position;

SELECT count(*) AS tutors FROM public.tutors;
-- to_jsonb permits checking old profiles before migration22/31 adds these columns.
SELECT count(*) AS profiles,
 count(*) FILTER (WHERE nullif(trim(to_jsonb(p)->>'university'), '') IS NOT NULL) AS with_university,
 count(*) FILTER (WHERE nullif(trim(to_jsonb(p)->>'achievements'), '') IS NOT NULL) AS with_achievements,
 count(*) FILTER (WHERE nullif(trim(to_jsonb(p)->>'certificates'), '') IS NOT NULL) AS with_certificates,
 count(*) FILTER (WHERE nullif(trim(to_jsonb(p)->>'introduction'), '') IS NOT NULL) AS with_introduction
FROM public.tutor_public_profiles p;

SELECT
 (SELECT count(*) FROM (SELECT parent_id FROM public.parent_student_links
  GROUP BY parent_id HAVING count(*) > 1) x) AS parents_with_multiple_links,
 (SELECT count(*) FROM (SELECT student_id FROM public.parent_student_links
  GROUP BY student_id HAVING count(*) > 1) x) AS students_with_multiple_links;

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN (
 'save_tutor_profile', 'claim_parent_phone', 'parent_access', 'parent_portal',
 'tutor_payment_accounts', 'tutor_record_receipt', 'oj_account_context')
ORDER BY p.proname;

-- Bucket metadata only; no object paths or uploaded files.
SELECT public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'tutor-avatars';
ROLLBACK;
