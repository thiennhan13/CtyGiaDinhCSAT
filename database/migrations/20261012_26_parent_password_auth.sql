BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261008_23') THEN RAISE EXCEPTION 'Apply migration 23 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261012_26') THEN RAISE EXCEPTION 'Migration 26 already applied'; END IF;
END $$;
ALTER TABLE public.parent_accounts ADD COLUMN auth_uid uuid UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public.parent_lookup_sessions ADD COLUMN auth_uid uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.parent_lookup_sessions ADD COLUMN auth_session_id uuid;
-- Old phone-only cookies cannot read after this migration. Password accounts must
-- be provisioned before the application cutover; no passwords are stored here.
DELETE FROM public.parent_lookup_sessions;
CREATE TABLE csat_internal.auth_attempts (
 key_hash text PRIMARY KEY CHECK(key_hash ~ '^[a-f0-9]{64}$'), count integer NOT NULL, reset_at timestamptz NOT NULL
);
-- Defense in depth: no client policies. Owner-run RPCs remain the only entry point.
ALTER TABLE csat_internal.auth_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON csat_internal.auth_attempts FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.consume_auth_attempt(p_source text,p_identity text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer; k text; allowed boolean:=true;
BEGIN
 IF p_source IS NULL OR p_identity IS NULL OR p_source !~ '^[a-f0-9]{64}$' OR p_identity !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid key' USING ERRCODE='22023'; END IF;
 DELETE FROM csat_internal.auth_attempts WHERE reset_at<now();
 FOR k IN SELECT DISTINCT x FROM unnest(ARRAY[p_source,p_identity]) x ORDER BY x LOOP
  INSERT INTO csat_internal.auth_attempts(key_hash,count,reset_at) VALUES(k,1,now()+interval '15 minutes')
  ON CONFLICT(key_hash) DO UPDATE SET count=least(csat_internal.auth_attempts.count+1,101) RETURNING count INTO n;
  IF n>(CASE WHEN k=p_identity THEN 10 ELSE 50 END) THEN allowed:=false; END IF;
 END LOOP;
 RETURN allowed;
END $$;
REVOKE ALL ON FUNCTION public.consume_auth_attempt(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_auth_attempt(text,text) TO service_role;

CREATE FUNCTION public.start_parent_password_session(p_auth_uid uuid,p_session_id uuid,p_token_hash text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid;
BEGIN
 IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid session' USING ERRCODE='22023'; END IF;
 SELECT p.parent_id INTO pid FROM public.parent_accounts p JOIN auth.users u ON u.id=p.auth_uid
 JOIN auth.sessions s ON s.user_id=u.id AND s.id=p_session_id
 WHERE p.auth_uid=p_auth_uid AND p.active AND u.raw_app_meta_data->>'role'='parent'
 AND u.raw_app_meta_data->>'csat_parent_id'=p.parent_id::text
 AND regexp_replace(coalesce(u.phone,''),'^\+','')='84'||substr(p.phone,2)
 AND (u.banned_until IS NULL OR u.banned_until<now());
 IF pid IS NULL THEN RETURN false; END IF;
 DELETE FROM public.parent_lookup_sessions WHERE expires_at<=now();
 INSERT INTO public.parent_lookup_sessions(token_hash,parent_id,expires_at,auth_uid,auth_session_id)
 VALUES(p_token_hash,pid,now()+interval '12 hours',p_auth_uid,p_session_id);
 RETURN true;
END $$;
CREATE FUNCTION public.parent_password_session_valid(p_token_hash text,p_auth_uid uuid,p_session_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.parent_lookup_sessions s JOIN public.parent_accounts p USING(parent_id)
 JOIN auth.sessions a ON a.id=s.auth_session_id AND a.user_id=s.auth_uid
 JOIN auth.users u ON u.id=s.auth_uid
 WHERE s.token_hash=p_token_hash AND s.auth_uid=p_auth_uid AND s.auth_session_id=p_session_id
 AND p.auth_uid=s.auth_uid AND s.expires_at>now() AND p.active AND u.raw_app_meta_data->>'role'='parent'
 AND u.raw_app_meta_data->>'csat_parent_id'=p.parent_id::text
 AND regexp_replace(coalesce(u.phone,''),'^\+','')='84'||substr(p.phone,2)
 AND (u.banned_until IS NULL OR u.banned_until<now()))
$$;
REVOKE ALL ON FUNCTION public.start_parent_password_session(uuid,uuid,text),public.parent_password_session_valid(text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.start_parent_password_session(uuid,uuid,text),public.parent_password_session_valid(text,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.start_parent_lookup(p_phone text,p_token_hash text,p_client_key text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'Password login required' USING ERRCODE='42501'; END $$;
REVOKE ALL ON FUNCTION public.start_parent_lookup(text,text,text) FROM PUBLIC,anon,authenticated,service_role;
-- Preserve the current portal projection and all optional 21/22/23 fields.
DO $$ DECLARE definition text; anchor text:='s.token_hash=p_token_hash AND s.expires_at>CURRENT_TIMESTAMP AND p.active'; BEGIN
 SELECT pg_get_functiondef('public.get_parent_lookup(text,uuid)'::regprocedure) INTO definition;
 IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected parent lookup definition; inspect before upgrade'; END IF;
 definition:=replace(definition,anchor,anchor||' AND public.parent_password_session_valid(s.token_hash,s.auth_uid,s.auth_session_id)');
 EXECUTE definition;
END $$;

CREATE TABLE csat_internal.parent_auth_provisioning (
 parent_id uuid PRIMARY KEY REFERENCES public.parent_accounts(parent_id), auth_uid uuid UNIQUE,
 state text NOT NULL CHECK(state IN ('pending','linked','review')), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE csat_internal.parent_auth_provisioning ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON csat_internal.parent_auth_provisioning FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.link_parent_auth(p_parent_id uuid,p_auth_uid uuid,p_phone text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.parent_accounts; u auth.users; candidates jsonb;
BEGIN
 -- Serialize the final eligibility check with roster/contact edits. No lock is
 -- held during the external Auth call; an ineligible orphan remains recoverable.
 LOCK TABLE public.classes,public.class_students,public.students,public.parent_student_links IN SHARE MODE;
 SELECT * INTO p FROM public.parent_accounts WHERE parent_id=p_parent_id FOR UPDATE;
 SELECT * INTO u FROM auth.users WHERE id=p_auth_uid FOR SHARE;
 IF p.parent_id IS NULL OR NOT p.active OR p.phone IS DISTINCT FROM p_phone OR u.id IS NULL
 OR u.raw_app_meta_data->>'role' IS DISTINCT FROM 'parent'
 OR u.raw_app_meta_data->>'csat_parent_id' IS DISTINCT FROM p_parent_id::text
 OR regexp_replace(coalesce(u.phone,''),'^\+','') IS DISTINCT FROM '84'||substr(p_phone,2)
 OR (u.banned_until IS NOT NULL AND u.banned_until>=now())
 OR (p.auth_uid IS NOT NULL AND p.auth_uid<>p_auth_uid)
 THEN RAISE EXCEPTION 'Parent identity requires review' USING ERRCODE='22023'; END IF;
 -- Recheck the candidate after the Auth API call; roster/contact data may have changed.
 candidates:=public.parent_auth_candidates();
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(candidates) x
   WHERE x->>'parent_id'=p_parent_id::text AND x->>'issue' IS NULL)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(candidates) x
   WHERE x->>'parent_id'=p_parent_id::text AND x->>'issue' IS NOT NULL)
 THEN RAISE EXCEPTION 'Parent eligibility changed; review required' USING ERRCODE='22023'; END IF;
 UPDATE public.parent_accounts SET auth_uid=p_auth_uid WHERE parent_id=p_parent_id;
 INSERT INTO csat_internal.parent_auth_provisioning(parent_id,auth_uid,state) VALUES(p_parent_id,p_auth_uid,'linked')
 ON CONFLICT(parent_id) DO UPDATE SET auth_uid=excluded.auth_uid,state='linked',updated_at=now();
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.link_parent_auth(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.link_parent_auth(uuid,uuid,text) TO service_role;
CREATE FUNCTION public.revoke_parent_password_sessions(p_auth_uid uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 DELETE FROM public.parent_lookup_sessions WHERE auth_uid=p_auth_uid;
$$;
REVOKE ALL ON FUNCTION public.revoke_parent_password_sessions(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_parent_password_sessions(uuid) TO service_role;
CREATE FUNCTION public.parent_auth_candidates() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN PERFORM csat_internal.require_admin(); END IF;
 WITH eligible AS (
  SELECT DISTINCT s.student_id,s.name,s.parent_name,s.parent_number,csat_internal.parent_phone_domestic(s.parent_number) phone
  FROM public.students s JOIN public.class_students cs USING(student_id) JOIN public.classes c USING(class_id)
  WHERE s.is_deleted IS NOT TRUE AND s.status='Đang học' AND cs.status='active' AND c.status='active'
 ), rows AS (
  SELECT e.*,p.parent_id,p.auth_uid,p.active,
  CASE WHEN e.phone IS NULL OR length(btrim(coalesce(e.parent_name,'')))=0 THEN 'missing_contact'
   WHEN EXISTS(SELECT 1 FROM eligible x WHERE x.phone=e.phone AND btrim(x.parent_name) IS DISTINCT FROM btrim(e.parent_name)) THEN 'conflicting_names'
   WHEN p.parent_id IS NULL THEN 'missing_parent'
   WHEN NOT p.active THEN 'inactive_parent'
   WHEN btrim(p.display_name) IS DISTINCT FROM btrim(e.parent_name) THEN 'conflicting_names'
   WHEN EXISTS(SELECT 1 FROM public.parent_student_links l JOIN public.students linked USING(student_id)
    WHERE l.parent_id=p.parent_id AND csat_internal.parent_phone_domestic(linked.parent_number) IS DISTINCT FROM e.phone) THEN 'conflicting_links'
   WHEN p.auth_uid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p.auth_uid
    AND u.raw_app_meta_data->>'role'='parent' AND u.raw_app_meta_data->>'csat_parent_id'=p.parent_id::text
    AND regexp_replace(coalesce(u.phone,''),'^\+','')='84'||substr(p.phone,2)
    AND (u.banned_until IS NULL OR u.banned_until<now())) THEN 'invalid_auth_identity'
   WHEN NOT EXISTS(SELECT 1 FROM public.parent_student_links l WHERE l.parent_id=p.parent_id AND l.student_id=e.student_id) THEN 'missing_link'
   ELSE NULL END issue
  FROM eligible e LEFT JOIN public.parent_accounts p ON p.phone=e.phone
 ) SELECT coalesce(jsonb_agg(to_jsonb(rows) ORDER BY student_id),'[]') INTO result FROM rows;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.parent_auth_candidates() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.parent_auth_candidates() TO authenticated,service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261012_26');
NOTIFY pgrst,'reload schema';
COMMIT;
