BEGIN;
-- Additive release: no existing students, classes, reviews or accounting rows change.
CREATE TABLE public.consultation_requests (
 request_id uuid PRIMARY KEY,
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 source_hash text NOT NULL CHECK(source_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','completed')),
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX consultation_requests_created ON public.consultation_requests(created_at DESC);
CREATE INDEX consultation_requests_source ON public.consultation_requests(source_hash,created_at DESC);
CREATE INDEX consultation_requests_phone ON public.consultation_requests((data->>'phone'),created_at DESC);
CREATE TABLE public.consultation_email_outbox (
 request_id uuid PRIMARY KEY REFERENCES public.consultation_requests(request_id),
 payload jsonb NOT NULL, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','accepted','failed','manual_review')),
 attempts integer NOT NULL DEFAULT 0, first_attempt_at timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_id uuid, lease_until timestamptz, provider_id text, error_code text, accepted_at timestamptz
);
ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consultation_requests,public.consultation_email_outbox FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.consultation_requests,public.consultation_email_outbox TO authenticated;
CREATE POLICY consultation_admin_read ON public.consultation_requests FOR SELECT TO authenticated USING(auth.jwt()->'app_metadata'->>'role'='admin');
CREATE POLICY consultation_email_admin_read ON public.consultation_email_outbox FOR SELECT TO authenticated USING(auth.jwt()->'app_metadata'->>'role'='admin');

CREATE FUNCTION public.submit_consultation(p_id uuid,p_data jsonb,p_source_hash text,p_payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE existing jsonb;
BEGIN
 IF p_id IS NULL OR p_source_hash IS NULL OR p_source_hash !~ '^[a-f0-9]{64}$'
 OR p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR octet_length(p_data::text)>12000
 OR NOT p_data ?& ARRAY['role','name','phone','email','level','goal','program','school_year','message','consent']
 OR (p_data - ARRAY['role','name','phone','email','level','goal','program','school_year','message','consent'])<>'{}'::jsonb
 OR p_data->>'role' NOT IN ('parent','student','university')
 OR length(btrim(p_data->>'name')) NOT BETWEEN 2 AND 100
 OR p_data->>'phone' !~ '^0[35789][0-9]{8}$'
 OR p_data->>'level' NOT IN ('thcs','thpt','university','undecided')
 OR p_data->>'goal' NOT IN ('thcs','specialist','province','national','undecided')
 OR p_data->>'program' NOT IN ('co-ban','nang-cao','hsgqg','consultation')
 OR p_data->'consent'<>'true'::jsonb OR length(p_data->>'message')>2000 OR length(p_data->>'school_year')>50
 OR length(p_data->>'email')>254
 OR EXISTS(SELECT 1 FROM jsonb_each(p_data) WHERE key<>'consent' AND jsonb_typeof(value)<>'string') THEN
  RAISE EXCEPTION 'Invalid consultation' USING ERRCODE='22023';
 END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR p_payload->'to'<>'["csattutor@gmail.com"]'::jsonb
 OR NOT p_payload ?& ARRAY['to','subject','text'] OR length(p_payload->>'text')>16000
 OR (p_payload - ARRAY['to','subject','text','reply_to'])<>'{}'::jsonb THEN
  RAISE EXCEPTION 'Invalid email payload' USING ERRCODE='22023';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('consultation-id:'||p_id::text,0));
 SELECT data INTO existing FROM consultation_requests WHERE request_id=p_id;
 IF FOUND THEN
  IF existing<>p_data THEN RAISE EXCEPTION 'Request key reused' USING ERRCODE='23505'; END IF;
  RETURN p_id;
 END IF;
 -- Locks plus persisted counts enforce sliding limits across serverless instances.
 PERFORM pg_advisory_xact_lock(hashtextextended('consultation-source:'||p_source_hash,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('consultation-phone:'||(p_data->>'phone'),0));
 IF (SELECT count(*) FROM consultation_requests WHERE source_hash=p_source_hash AND created_at>now()-interval '15 minutes')>=5
 OR (SELECT count(*) FROM consultation_requests WHERE data->>'phone'=p_data->>'phone' AND created_at>now()-interval '1 hour')>=3 THEN
  RAISE EXCEPTION 'Too many requests' USING ERRCODE='P0429';
 END IF;
 INSERT INTO consultation_requests(request_id,data,source_hash) VALUES(p_id,p_data,p_source_hash);
 INSERT INTO consultation_email_outbox(request_id,payload) VALUES(p_id,p_payload);
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_consultation(uuid,jsonb,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_consultation(uuid,jsonb,text,jsonb) TO service_role;

CREATE FUNCTION public.claim_consultation_email(p_id uuid,p_sender text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job consultation_email_outbox; token uuid;
BEGIN
 IF p_sender IS NULL OR length(p_sender) NOT BETWEEN 3 AND 254 OR p_sender ~ E'[\r\n]' THEN RAISE EXCEPTION 'Invalid sender'; END IF;
 SELECT * INTO job FROM consultation_email_outbox WHERE request_id=p_id FOR UPDATE;
 IF NOT FOUND OR job.status IN ('accepted','manual_review') THEN RETURN NULL; END IF;
 IF job.status='sending' AND job.lease_until>now() THEN RETURN NULL; END IF;
 -- Do not replay a possibly accepted request beyond the provider's 24h key lifetime.
 IF job.first_attempt_at IS NOT NULL AND (job.first_attempt_at<now()-interval '23 hours' OR job.attempts>=3) THEN
  UPDATE consultation_email_outbox SET status='manual_review',error_code='retry_window_or_attempt_limit',lease_id=NULL,lease_until=NULL WHERE request_id=p_id;
  RETURN NULL;
 END IF;
 IF job.next_attempt_at>now() THEN RETURN NULL; END IF;
 token:=gen_random_uuid();
 UPDATE consultation_email_outbox SET status='sending',attempts=attempts+1,
  first_attempt_at=coalesce(first_attempt_at,now()),lease_id=token,lease_until=now()+interval '3 minutes',
  payload=CASE WHEN first_attempt_at IS NULL THEN payload||jsonb_build_object('from',p_sender) ELSE payload END
 WHERE request_id=p_id RETURNING * INTO job;
 RETURN jsonb_build_object('request_id',p_id,'lease_id',token,'payload',job.payload);
END $$;
REVOKE ALL ON FUNCTION public.claim_consultation_email(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_consultation_email(uuid,text) TO service_role;

CREATE FUNCTION public.finish_consultation_email(p_id uuid,p_lease uuid,p_provider text,p_error text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE consultation_email_outbox SET status=CASE WHEN p_provider IS NOT NULL THEN 'accepted' ELSE 'failed' END,
 provider_id=p_provider,error_code=CASE WHEN p_provider IS NOT NULL THEN NULL ELSE left(p_error,100) END,
 accepted_at=CASE WHEN p_provider IS NOT NULL THEN now() ELSE NULL END,
 next_attempt_at=now()+interval '5 minutes',lease_id=NULL,lease_until=NULL
 WHERE request_id=p_id AND lease_id=p_lease AND status='sending';
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.finish_consultation_email(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_consultation_email(uuid,uuid,text,text) TO service_role;

CREATE FUNCTION public.update_consultation_status(p_id uuid,p_status text,p_revision integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result integer;
BEGIN
 IF coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('new','contacted','completed') THEN RAISE EXCEPTION 'Invalid status' USING ERRCODE='22023'; END IF;
 UPDATE consultation_requests SET status=p_status,revision=revision+1,updated_at=now(),updated_by=auth.uid()
 WHERE request_id=p_id AND revision=p_revision RETURNING revision INTO result;
 IF NOT FOUND THEN RAISE EXCEPTION 'Dữ liệu đã thay đổi. Vui lòng tải lại.' USING ERRCODE='40001'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.update_consultation_status(uuid,text,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.update_consultation_status(uuid,text,integer) TO authenticated;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260913_18');
NOTIFY pgrst,'reload schema';
COMMIT;
