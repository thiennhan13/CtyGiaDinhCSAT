-- Decision: parent access by registered phone only; no proof of phone ownership.
-- Requires application cutover. Preserve Auth users, contacts and all learning/fee history.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261012_26') THEN RAISE EXCEPTION 'Apply migration 26 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261014_27') THEN RAISE EXCEPTION 'Migration 27 already applied'; END IF;
END $$;

-- Invalidate all old lookup cookies. Retained Auth users cannot open new parent sessions.
DELETE FROM public.parent_lookup_sessions;
REVOKE ALL ON FUNCTION public.start_parent_lookup(text,text,text),
 public.start_parent_password_session(uuid,uuid,text),
 public.parent_password_session_valid(text,uuid,uuid),
 public.link_parent_auth(uuid,uuid,text),public.parent_auth_candidates(),
 public.revoke_parent_password_sessions(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.parent_phone_session_valid(p_token_hash text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.parent_lookup_sessions s JOIN public.parent_accounts p USING(parent_id)
  WHERE s.token_hash=p_token_hash AND s.expires_at>now() AND p.active
   AND s.auth_uid IS NULL AND s.auth_session_id IS NULL
   AND EXISTS(SELECT 1 FROM public.parent_student_links l JOIN public.students st USING(student_id)
    WHERE l.parent_id=p.parent_id AND st.is_deleted IS NOT TRUE)
 )
$$;

CREATE FUNCTION public.start_parent_phone_session(p_phone text,p_token_hash text,p_source text,p_identity text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid;
BEGIN
 p_phone:=csat_internal.parent_phone_domestic(p_phone);
 IF p_phone IS NULL OR p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'Invalid lookup request' USING ERRCODE='22023';
 END IF;
 -- Same durable budget as staff login: 10/identity and 50/source per 15 minutes.
 -- Return, do not raise, so unsuccessful attempts still commit their counters.
 IF NOT public.consume_auth_attempt(p_source,p_identity) THEN RETURN 'rate_limited'; END IF;
 SELECT p.parent_id INTO pid FROM public.parent_accounts p WHERE p.phone=p_phone AND p.active
  AND EXISTS(SELECT 1 FROM public.parent_student_links l JOIN public.students st USING(student_id)
   WHERE l.parent_id=p.parent_id AND st.is_deleted IS NOT TRUE)
  FOR SHARE OF p;
 IF pid IS NULL THEN RETURN 'not_found'; END IF;
 DELETE FROM public.parent_lookup_sessions WHERE expires_at<=now();
 INSERT INTO public.parent_lookup_sessions(token_hash,parent_id,expires_at)
 VALUES(p_token_hash,pid,now()+interval '12 hours');
 RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.parent_phone_session_valid(text),public.start_parent_phone_session(text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.parent_phone_session_valid(text),public.start_parent_phone_session(text,text,text,text) TO service_role;

-- Preserve published projections and optional migrations; replace only the session gate.
DO $$ DECLARE definition text; anchor text:='public.parent_password_session_valid(s.token_hash,s.auth_uid,s.auth_session_id)'; BEGIN
 definition:=pg_get_functiondef('public.get_parent_lookup(text,uuid)'::regprocedure);
 IF (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 THEN
  RAISE EXCEPTION 'Unexpected parent lookup definition; inspect before migration';
 END IF;
 EXECUTE replace(definition,anchor,'public.parent_phone_session_valid(s.token_hash)');
END $$;

-- Admin reconciliation is about contact/link validity, no longer Auth provisioning.
CREATE FUNCTION public.parent_contact_candidates() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN PERFORM csat_internal.require_admin(); END IF;
 WITH eligible AS (
  SELECT DISTINCT s.student_id,s.name,s.parent_name,s.parent_number,csat_internal.parent_phone_domestic(s.parent_number) phone
  FROM public.students s JOIN public.class_students cs USING(student_id) JOIN public.classes c USING(class_id)
  WHERE s.is_deleted IS NOT TRUE AND s.status='Đang học' AND cs.status='active' AND c.status='active'
 ), rows AS (
  SELECT e.*,p.parent_id,p.active,
  CASE WHEN e.phone IS NULL OR length(btrim(coalesce(e.parent_name,'')))=0 THEN 'missing_contact'
   WHEN EXISTS(SELECT 1 FROM eligible x WHERE x.phone=e.phone AND btrim(x.parent_name) IS DISTINCT FROM btrim(e.parent_name)) THEN 'conflicting_names'
   WHEN p.parent_id IS NULL THEN 'missing_parent'
   WHEN NOT p.active THEN 'inactive_parent'
   WHEN btrim(p.display_name) IS DISTINCT FROM btrim(e.parent_name) THEN 'conflicting_names'
   WHEN EXISTS(SELECT 1 FROM public.parent_student_links l JOIN public.students linked USING(student_id)
    WHERE l.parent_id=p.parent_id AND csat_internal.parent_phone_domestic(linked.parent_number) IS DISTINCT FROM e.phone) THEN 'conflicting_links'
   WHEN NOT EXISTS(SELECT 1 FROM public.parent_student_links l WHERE l.parent_id=p.parent_id AND l.student_id=e.student_id) THEN 'missing_link'
   ELSE NULL END issue
  FROM eligible e LEFT JOIN public.parent_accounts p ON p.phone=e.phone
 ) SELECT coalesce(jsonb_agg(to_jsonb(rows) ORDER BY student_id),'[]'::jsonb) INTO result FROM rows;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.parent_contact_candidates() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.parent_contact_candidates() TO authenticated,service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261014_27');
NOTIFY pgrst,'reload schema';
COMMIT;
