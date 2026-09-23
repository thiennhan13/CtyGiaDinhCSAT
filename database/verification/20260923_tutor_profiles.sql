-- Read-only verification after migration 22.
BEGIN READ ONLY;
SELECT version FROM csat_internal.schema_migrations WHERE version='20260923_22';
SELECT count(*) AS profiles, count(*) FILTER(WHERE avatar_path IS NOT NULL) AS with_avatar FROM public.tutor_public_profiles;
SELECT state,count(*) FROM public.tutor_avatar_assets GROUP BY state;
SELECT count(*) AS invalid_avatar_links FROM public.tutor_public_profiles p LEFT JOIN public.tutor_avatar_assets a ON a.path=p.avatar_path
 WHERE p.avatar_path IS NOT NULL AND (a.path IS NULL OR a.tutor_id<>p.tutor_id OR a.state<>'attached');
SELECT has_function_privilege('anon','public.save_tutor_profile(uuid,integer,jsonb)','execute') AS anon_may_write,
 has_function_privilege('authenticated','public.claim_tutor_avatar_cleanup(text)','execute') AS authenticated_may_cleanup;
COMMIT;
