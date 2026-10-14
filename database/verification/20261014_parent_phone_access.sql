-- Read-only. Run before and after 27; existing parent/Auth counts must be preserved.
BEGIN READ ONLY;
SELECT version FROM csat_internal.schema_migrations ORDER BY version;
SELECT count(*) AS contacts,count(*) FILTER(WHERE active) AS active_contacts,
 count(*) FILTER(WHERE auth_uid IS NOT NULL) AS retained_auth_links FROM public.parent_accounts;
SELECT count(*) AS student_links FROM public.parent_student_links;
SELECT count(*) AS retained_parent_auth FROM auth.users WHERE raw_app_meta_data->>'role'='parent';
SELECT count(*) AS lookup_sessions,count(*) FILTER(WHERE auth_uid IS NOT NULL OR auth_session_id IS NOT NULL) AS legacy_sessions
 FROM public.parent_lookup_sessions;
WITH expected(signature,client_allowed,service_allowed) AS (VALUES
 ('public.start_parent_phone_session(text,text,text,text)',false,true),
 ('public.parent_phone_session_valid(text)',false,true),
 ('public.parent_contact_candidates()',true,true),
 ('public.consume_auth_attempt(text,text)',false,true),
 ('public.get_parent_lookup(text,uuid)',false,true),
 ('public.start_parent_lookup(text,text,text)',false,false),
 ('public.start_parent_password_session(uuid,uuid,text)',false,false),
 ('public.link_parent_auth(uuid,uuid,text)',false,false),
 ('public.parent_auth_candidates()',false,false)
)
SELECT signature,to_regprocedure(signature) IS NOT NULL AS present,
 NOT has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') AS anon_grant_ok,
 has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE')=client_allowed AS authenticated_grant_ok,
 has_function_privilege('service_role',to_regprocedure(signature),'EXECUTE')=service_allowed AS service_grant_ok
FROM expected;
SELECT relname,relrowsecurity AS rls_enabled FROM pg_class WHERE oid IN
 ('csat_internal.auth_attempts'::regclass,'public.parent_lookup_sessions'::regclass,'public.parent_accounts'::regclass);
ROLLBACK;
