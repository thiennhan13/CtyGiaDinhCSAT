-- Independent of OJ migration 28. Preserve all existing counters and sessions.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261014_27') THEN
  RAISE EXCEPTION 'Apply migration 27 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261024_29') THEN
  RAISE EXCEPTION 'Migration 29 already applied'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.consume_auth_attempt(p_source text,p_identity text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer; k text; allowed boolean:=true;
BEGIN
 IF p_source IS NULL OR p_identity IS NULL OR p_source !~ '^[a-f0-9]{64}$' OR p_identity !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid key' USING ERRCODE='22023'; END IF;
 DELETE FROM csat_internal.auth_attempts WHERE reset_at<now();
 FOR k IN SELECT DISTINCT x FROM unnest(ARRAY[p_source,p_identity]) x ORDER BY x LOOP
  INSERT INTO csat_internal.auth_attempts(key_hash,count,reset_at) VALUES(k,1,now()+interval '15 minutes')
  ON CONFLICT(key_hash) DO UPDATE SET count=least(csat_internal.auth_attempts.count+1,101) RETURNING count INTO n;
  IF n>(CASE WHEN k=p_identity THEN 20 ELSE 50 END) THEN allowed:=false; END IF;
 END LOOP;
 RETURN allowed;
END $$;
REVOKE ALL ON FUNCTION public.consume_auth_attempt(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_auth_attempt(text,text) TO service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261024_29');
NOTIFY pgrst,'reload schema';
COMMIT;
