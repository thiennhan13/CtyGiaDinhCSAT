BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260913_18') THEN RAISE EXCEPTION 'Apply migration 18 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261012_24') THEN RAISE EXCEPTION 'Migration 24 already applied'; END IF;
END $$;

CREATE TABLE public.consultation_status_history (
 event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES public.consultation_requests(request_id),
 old_status text NOT NULL, new_status text NOT NULL, revision integer NOT NULL, actor_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(request_id,revision)
);
ALTER TABLE public.consultation_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consultation_status_history FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.consultation_status_history TO authenticated;
CREATE POLICY consultation_history_admin ON public.consultation_status_history FOR SELECT TO authenticated USING(auth.jwt()->'app_metadata'->>'role'='admin');

CREATE FUNCTION public.submit_registration(p_id uuid,p_data jsonb,p_source_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE existing jsonb;
BEGIN
 IF p_id IS NULL OR p_source_hash IS NULL OR p_source_hash !~ '^[a-f0-9]{64}$'
 OR p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR octet_length(p_data::text)>12000
 OR NOT p_data ?& ARRAY['schema_version','role','name','phone','email','level','course','goal','background','school_year','message','source_path','consent']
 OR p_data-ARRAY['schema_version','role','name','phone','email','level','course','goal','background','school_year','message','source_path','consent']<>'{}'::jsonb
 OR p_data->'schema_version' IS DISTINCT FROM '2'::jsonb OR p_data->'consent' IS DISTINCT FROM 'true'::jsonb
 OR EXISTS(SELECT 1 FROM jsonb_each(p_data) WHERE key NOT IN ('schema_version','consent') AND jsonb_typeof(value)<>'string')
 OR p_data->>'role' NOT IN ('parent','student') OR length(btrim(p_data->>'name')) NOT BETWEEN 2 AND 100
 OR p_data->>'phone' !~ '^0[35789][0-9]{8}$' OR length(p_data->>'email')>254
 OR (p_data->>'email'<>'' AND p_data->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
 OR p_data->>'level' NOT IN ('primary','thcs','thpt') OR p_data->>'course' NOT IN ('undecided','A','B','C','E','K')
 OR p_data->>'goal' NOT IN ('undecided','beginner','thcs','specialist','province')
 OR p_data->>'background' NOT IN ('undecided','none','syntax','independent')
 OR length(p_data->>'school_year')>50 OR length(p_data->>'message')>2000
 OR p_data->>'source_path' !~ '^/(dang-ky-hoc|lo-trinh(/[abcek])?)?$'
 THEN RAISE EXCEPTION 'Invalid registration' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('consultation-id:'||p_id::text,0));
 SELECT data INTO existing FROM public.consultation_requests WHERE request_id=p_id;
 IF FOUND THEN
  IF existing IS DISTINCT FROM p_data THEN RAISE EXCEPTION 'Request key reused' USING ERRCODE='23505'; END IF;
  RETURN p_id;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('consultation-source:'||p_source_hash,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('consultation-phone:'||(p_data->>'phone'),0));
 IF (SELECT count(*) FROM public.consultation_requests WHERE source_hash=p_source_hash AND created_at>now()-interval '15 minutes')>=5
 OR (SELECT count(*) FROM public.consultation_requests WHERE data->>'phone'=p_data->>'phone' AND created_at>now()-interval '1 hour')>=3
 THEN RAISE EXCEPTION 'Too many requests' USING ERRCODE='P0429'; END IF;
 INSERT INTO public.consultation_requests(request_id,data,source_hash) VALUES(p_id,p_data,p_source_hash);
 -- Registration acceptance is independent of email. No outbox is created.
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_registration(uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_registration(uuid,jsonb,text) TO service_role;

CREATE OR REPLACE FUNCTION public.update_consultation_status(p_id uuid,p_status text,p_revision integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.consultation_requests;
BEGIN
 PERFORM csat_internal.require_admin();
 IF p_status IS NULL OR p_status NOT IN ('new','contacted','completed') THEN RAISE EXCEPTION 'Invalid status' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM public.consultation_requests WHERE request_id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đơn.' USING ERRCODE='P0002'; END IF;
 IF r.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Dữ liệu đã thay đổi. Tải lại đơn.' USING ERRCODE='40001'; END IF;
 IF r.status=p_status THEN RETURN r.revision; END IF;
 UPDATE public.consultation_requests SET status=p_status,revision=revision+1,updated_at=now(),updated_by=auth.uid() WHERE request_id=p_id;
 INSERT INTO public.consultation_status_history(request_id,old_status,new_status,revision,actor_id) VALUES(p_id,r.status,p_status,r.revision+1,auth.uid());
 RETURN r.revision+1;
END $$;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261012_24');
NOTIFY pgrst,'reload schema';
COMMIT;
