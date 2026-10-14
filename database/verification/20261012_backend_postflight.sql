-- Read-only. Requires migrations 18/23/24/25/26. Run immediately after schema,
-- again after provisioning, then rerun preflight to compare preservation digests.
-- Every result is aggregate/metadata only; never paste candidate RPC rows into logs.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '60s';
SELECT current_setting('transaction_read_only') AS read_only,now() AS checked_at;
WITH required(version) AS (VALUES ('20260913_18'),('20261008_23'),('20261012_24'),('20261012_25'),('20261012_26'))
SELECT r.version,m.version IS NOT NULL AS applied FROM required r LEFT JOIN csat_internal.schema_migrations m USING(version) ORDER BY r.version;

SELECT program_code,count(*) AS classes FROM public.classes GROUP BY program_code ORDER BY program_code NULLS LAST;
SELECT count(*) FILTER (WHERE program_code IS NULL) AS unclassified_classes,
 count(*) FILTER (WHERE program_revision<1) AS invalid_program_revisions,
 count(*) FILTER (WHERE program_code='E' AND csat_internal.class_program_code(class_type)='PREVOI') AS prevoi_labeled_e
FROM public.classes;
SELECT count(*) AS program_history_rows,
 count(*) FILTER (WHERE revision=1 AND actor_id IS NULL) AS initial_classification_rows FROM public.class_program_history;
SELECT count(*) AS missing_current_program_history FROM public.classes c WHERE NOT EXISTS (
 SELECT 1 FROM public.class_program_history h WHERE h.class_id=c.class_id AND h.revision=c.program_revision AND h.new_code IS NOT DISTINCT FROM c.program_code);
SELECT count(*) FILTER (WHERE published IS NOT NULL) AS published_records,
 count(*) FILTER (WHERE published IS DISTINCT FROM draft) AS differing_draft_published FROM public.learning_records;

SELECT count(*) AS registration_requests FROM public.consultation_requests WHERE data->>'schema_version'='2';
SELECT count(*) AS registration_outbox_rows FROM public.consultation_email_outbox o
JOIN public.consultation_requests r USING(request_id) WHERE r.data->>'schema_version'='2';
SELECT count(*) AS consultation_status_history_rows FROM public.consultation_status_history;
SELECT coalesce(bool_or(email_enabled),false) AS monthly_email_enabled FROM public.parent_portal_settings;

SELECT count(*) AS parent_contacts,count(*) FILTER (WHERE auth_uid IS NOT NULL) AS linked_parent_contacts FROM public.parent_accounts;
SELECT count(*) AS parent_auth_users FROM auth.users WHERE raw_app_meta_data->>'role'='parent';
SELECT state,count(*) AS provisioning_rows FROM csat_internal.parent_auth_provisioning GROUP BY state ORDER BY state;
SELECT count(*) AS invalid_parent_auth_links FROM public.parent_accounts p LEFT JOIN auth.users u ON u.id=p.auth_uid
WHERE p.auth_uid IS NOT NULL AND (u.id IS NULL OR u.raw_app_meta_data->>'role' IS DISTINCT FROM 'parent'
 OR u.raw_app_meta_data->>'csat_parent_id' IS DISTINCT FROM p.parent_id::text
 OR regexp_replace(coalesce(u.phone,''),'^\+','') IS DISTINCT FROM '84'||substr(p.phone,2));
SELECT count(*) AS lookup_sessions,
 count(*) FILTER (WHERE auth_uid IS NULL OR auth_session_id IS NULL) AS legacy_unbound_sessions
FROM public.parent_lookup_sessions;
SELECT count(*) AS invalid_live_lookup_sessions FROM public.parent_lookup_sessions s
WHERE s.expires_at>now() AND NOT public.parent_password_session_valid(s.token_hash,s.auth_uid,s.auth_session_id);

-- Do not call parent_auth_candidates here: that RPC exposes contact rows to its
-- authorized caller and requires JWT context. SQL verification emits counts only.
WITH eligible AS (
 SELECT DISTINCT s.student_id,s.parent_name,csat_internal.parent_phone_domestic(s.parent_number) phone
 FROM public.students s JOIN public.class_students cs USING(student_id) JOIN public.classes c USING(class_id)
 WHERE s.is_deleted IS NOT TRUE AND s.status='Đang học' AND cs.status='active' AND c.status='active'
)
SELECT count(*) AS eligible_students,
 count(*) FILTER (WHERE e.phone IS NULL OR length(btrim(coalesce(e.parent_name,'')))=0) AS missing_contact,
 count(*) FILTER (WHERE p.auth_uid IS NOT NULL) AS students_with_linked_parent,
 count(*) FILTER (WHERE p.parent_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.parent_student_links l WHERE l.student_id=e.student_id AND l.parent_id=p.parent_id)) AS missing_student_links
FROM eligible e LEFT JOIN public.parent_accounts p ON p.phone=e.phone;

WITH functions(signature,expect_anon,expect_authenticated,expect_service) AS (VALUES
 ('public.submit_registration(uuid,jsonb,text)',false,false,true),
 ('public.admin_set_class_program(uuid,text,integer,text)',false,true,false),
 ('public.start_parent_lookup(text,text,text)',false,false,false),
 ('public.consume_auth_attempt(text,text)',false,false,true),
 ('public.start_parent_password_session(uuid,uuid,text)',false,false,true),
 ('public.parent_password_session_valid(text,uuid,uuid)',false,false,true),
 ('public.link_parent_auth(uuid,uuid,text)',false,false,true),
 ('public.revoke_parent_password_sessions(uuid)',false,false,true),
 ('public.parent_auth_candidates()',false,true,true))
SELECT signature,to_regprocedure(signature) IS NOT NULL AS present,
 has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') IS NOT DISTINCT FROM expect_anon AS anon_grant_ok,
 has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE') IS NOT DISTINCT FROM expect_authenticated AS authenticated_grant_ok,
 has_function_privilege('service_role',to_regprocedure(signature),'EXECUTE') IS NOT DISTINCT FROM expect_service AS service_grant_ok
FROM functions;
SELECT c.relname,c.relrowsecurity AS rls_enabled,
 has_table_privilege('anon',c.oid,'INSERT,UPDATE,DELETE') AS anon_may_write,
 has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE') AS authenticated_may_write
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('consultation_requests','consultation_status_history','class_program_history');
-- Private Auth tables deny client access even if a table grant is added later.
SELECT c.relname,c.relrowsecurity AS rls_enabled,
 NOT EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid) AS no_client_policies,
 NOT has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_table_grant_ok,
 NOT has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS authenticated_table_grant_ok,
 NOT has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS service_table_grant_ok
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='csat_internal' AND c.relname IN ('auth_attempts','parent_auth_provisioning');
ROLLBACK;
