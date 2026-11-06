BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ DECLARE definition text; old_pattern text := '^/(dang-ky-hoc|lo-trinh(/[abcek])?)?$'; BEGIN
 IF NOT EXISTS(SELECT FROM csat_internal.schema_migrations WHERE version='20261012_24') THEN RAISE EXCEPTION 'Apply migration 24 first'; END IF;
 IF EXISTS(SELECT FROM csat_internal.schema_migrations WHERE version='20261105_34') THEN RAISE EXCEPTION 'Migration 34 already applied'; END IF;
 definition:=pg_get_functiondef('public.submit_registration(uuid,jsonb,text)'::regprocedure);
 IF strpos(definition,old_pattern)=0 THEN RAISE EXCEPTION 'Unexpected registration validation'; END IF;
 EXECUTE replace(definition,old_pattern,'^/(enroll|dang-ky-hoc|(roadmap|lo-trinh)(/[abcek])?)?$');
END $$;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261105_34');
NOTIFY pgrst,'reload schema';
COMMIT;
