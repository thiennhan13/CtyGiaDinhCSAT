BEGIN;
CREATE POLICY tutor_read_class_reviews ON public.student_reviews FOR SELECT TO authenticated
 USING(public.is_current_class_tutor(class_id));
CREATE TABLE public.review_email_runs (
 month text PRIMARY KEY CHECK(month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
 snapshot jsonb NOT NULL, sender text NOT NULL, origin text NOT NULL, admin_emails text[] NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.review_email_outbox (
 outbox_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), month text NOT NULL REFERENCES public.review_email_runs ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN ('tutor','admin')), recipient_key text NOT NULL, recipient text NOT NULL,
 payload jsonb NOT NULL, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','accepted','failed','manual_review','skipped')),
 attempts integer NOT NULL DEFAULT 0, first_attempt_at timestamptz, lease_until timestamptz, lease_id uuid,
 next_attempt_at timestamptz NOT NULL DEFAULT now(), accepted_at timestamptz, provider_id text, error_code text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(month,kind,recipient_key)
);
CREATE INDEX review_email_pending_idx ON public.review_email_outbox(next_attempt_at) WHERE status IN ('queued','failed','sending');
ALTER TABLE public.review_email_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_email_runs,public.review_email_outbox FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.review_email_runs,public.review_email_outbox TO authenticated;
CREATE POLICY admin_read ON public.review_email_runs FOR SELECT TO authenticated USING(public.is_admin());
CREATE POLICY admin_read ON public.review_email_outbox FOR SELECT TO authenticated USING(public.is_admin());

CREATE FUNCTION public.review_email_work(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE local_now timestamp:=now() AT TIME ZONE 'Asia/Ho_Chi_Minh'; m text; q jsonb; tutor_record record; r public.review_email_runs%ROWTYPE;
 settings public.parent_portal_settings%ROWTYPE; o public.review_email_outbox%ROWTYPE; content text; addr text; result jsonb;
BEGIN
 IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Chỉ máy chủ gửi email.' USING ERRCODE='42501'; END IF;
 SELECT * INTO settings FROM public.parent_portal_settings WHERE singleton;
 IF NOT settings.email_enabled THEN RETURN jsonb_build_object('disabled',true); END IF;
 IF p_action='status' THEN RETURN jsonb_build_object('disabled',false); END IF;
 IF p_action='prepare' THEN
  IF extract(day FROM local_now)<>28 OR local_now::time<'08:00'::time THEN RETURN jsonb_build_object('outside_schedule',true); END IF;
  IF coalesce(p_data->>'origin','') !~ '^https://[^/]+$' OR coalesce(p_data->>'sender','')='' THEN RAISE EXCEPTION 'Thiếu cấu hình email.' USING ERRCODE='22023'; END IF;
  m:=to_char(local_now,'YYYY-MM');
  PERFORM pg_advisory_xact_lock(hashtextextended('review-email-'||m,0));
  IF EXISTS(SELECT 1 FROM public.review_email_runs WHERE month=m) THEN RETURN jsonb_build_object('existing',true); END IF;
  q:=public.learning_month_queue(m);
  INSERT INTO public.review_email_runs(month,snapshot,sender,origin,admin_emails)
   VALUES(m,q,p_data->>'sender',p_data->>'origin',settings.admin_emails) RETURNING * INTO r;
  FOR tutor_record IN SELECT tu.tutor_id,tu.name,tu.email,jsonb_agg(x) AS students
   FROM jsonb_array_elements(q) x JOIN public.tutors tu ON tu.tutor_id=(x->>'tutor_id')::uuid
   WHERE x->>'status'<>'published' AND (x->>'actionable')::boolean
   GROUP BY tu.tutor_id,tu.name,tu.email LOOP
   content:='Chào '||tutor_record.name||E',\n\nVui lòng hoàn thiện nhận xét tháng '||m||E' cho các học sinh sau:\n'||
    (SELECT string_agg('- '||(x->>'student_name')||' · '||(x->>'class_name')||' · '||
     CASE WHEN x->>'status'='draft' THEN 'Bản nháp' ELSE 'Chưa viết' END||E'\n'||
     r.origin||'/tutor/classes/'||(x->>'class_id')||'/students/'||(x->>'student_id')||'/review?month='||m,E'\n\n' ORDER BY x->>'class_name',x->>'student_name')
     FROM jsonb_array_elements(tutor_record.students) x)||
    E'\n\nĐăng nhập tài khoản gia sư để mở biểu mẫu. Nhận xét chỉ xuất hiện với phụ huynh sau khi bạn chọn Gửi nhận xétutor_record. Chốt sổ do admin thực hiện riêng.';
   addr:=lower(trim(coalesce(tutor_record.email,'')));
   INSERT INTO public.review_email_outbox(month,kind,recipient_key,recipient,payload,status,error_code)
    VALUES(m,'tutor',tutor_record.tutor_id::text,addr,
     jsonb_build_object('from',r.sender,'to',jsonb_build_array(addr),'subject','CSAT · Nhắc nhận xét tháng '||m,'text',content),
     CASE WHEN addr ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN 'queued' ELSE 'skipped' END,
     CASE WHEN addr !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN 'missing_email' END);
  END LOOP;
  RETURN jsonb_build_object('prepared',true,'month',m);
 ELSIF p_action='admin' THEN
  FOR r IN SELECT * FROM public.review_email_runs WHERE month=to_char(local_now,'YYYY-MM') LOOP
   -- Wait until every tutor has at least been attempted; include known failures in the one admin digest.
   IF EXISTS(SELECT 1 FROM public.review_email_outbox WHERE month=r.month AND kind='tutor' AND status IN ('queued','sending')) THEN CONTINUE; END IF;
   content:='Tổng hợp nhận xét tháng '||r.month||E' tại thời điểm nhắc ngày 28.\n\n'||
    coalesce((SELECT string_agg(y.line,E'\n') FROM (
     SELECT coalesce(x->>'tutor_name','Chưa phân gia sư')||' · '||(x->>'class_name')||
      ': đã gửi '||count(*) FILTER(WHERE x->>'status'='published')||', nháp '||count(*) FILTER(WHERE x->>'status'='draft')||
      ', chưa viết '||count(*) FILTER(WHERE x->>'status'='missing')||
      ', cần kiểm tra phân công '||count(*) FILTER(WHERE NOT (x->>'actionable')::boolean) AS line
     FROM jsonb_array_elements(r.snapshot) x GROUP BY x->>'tutor_name',x->>'class_name' ORDER BY x->>'tutor_name',x->>'class_name') y),'Chưa có học sinh cần tổng hợp.')||
    E'\n\nLượt gửi nhắc gia sư:\n'||coalesce((SELECT string_agg(coalesce(tutor_row.name,email_row.recipient_key)||': '||email_row.status||coalesce(' · '||email_row.error_code,''),E'\n' ORDER BY tutor_row.name)
      FROM public.review_email_outbox email_row LEFT JOIN public.tutors tutor_row ON tutor_row.tutor_id::text=email_row.recipient_key WHERE email_row.month=r.month AND email_row.kind='tutor'),'Không có gia sư cần nhắc.')||
    E'\n\nXem tình hình hiện tại và nhật ký gửi: '||r.origin||E'/admin/learning\n\nAdmin đối chiếu và chốt sổ thủ công. Nhận xét còn thiếu không tự chặn chốt sổ học phí.';
   FOREACH addr IN ARRAY r.admin_emails LOOP
    INSERT INTO public.review_email_outbox(month,kind,recipient_key,recipient,payload)
     VALUES(r.month,'admin',lower(addr),lower(addr),jsonb_build_object('from',r.sender,'to',jsonb_build_array(lower(addr)),'subject','CSAT · Tổng hợp nhận xét tháng '||r.month,'text',content))
     ON CONFLICT(month,kind,recipient_key) DO NOTHING;
   END LOOP;
  END LOOP;
  RETURN jsonb_build_object('ok',true);
 ELSIF p_action='claim' THEN
  -- Provider idempotency expires at 24h. Never blindly retry an uncertain attempt beyond 23h.
  UPDATE public.review_email_outbox SET status='manual_review',error_code='idempotency_window_expired'
   WHERE status IN ('failed','sending') AND first_attempt_at<now()-interval '23 hours';
  UPDATE public.review_email_outbox SET status='manual_review',error_code='attempts_exhausted'
   WHERE status='sending' AND attempts>=3 AND lease_until<now();
  SELECT * INTO o FROM public.review_email_outbox
   WHERE ((status IN ('queued','failed') AND next_attempt_at<=now() AND attempts<3)
      OR (status='sending' AND lease_until<now() AND attempts<3))
    AND (first_attempt_at IS NULL OR first_attempt_at>=now()-interval '23 hours')
   ORDER BY CASE WHEN kind='tutor' THEN 0 ELSE 1 END,created_at,outbox_id FOR UPDATE SKIP LOCKED LIMIT 1;
  IF o.outbox_id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.review_email_outbox SET status='sending',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),lease_id=gen_random_uuid(),lease_until=now()+interval '3 minutes'
   WHERE outbox_id=o.outbox_id RETURNING * INTO o;
  RETURN to_jsonb(o);
 ELSIF p_action='finish' THEN
  IF p_data->>'status' NOT IN ('accepted','failed') THEN RAISE EXCEPTION 'Trạng thái không hợp lệ.' USING ERRCODE='22023'; END IF;
  UPDATE public.review_email_outbox SET status=p_data->>'status',provider_id=p_data->>'provider_id',
   error_code=left(p_data->>'error_code',100),accepted_at=CASE WHEN p_data->>'status'='accepted' THEN now() END,
   lease_until=NULL,next_attempt_at=now()+interval '5 minutes'
   WHERE outbox_id=(p_data->>'outbox_id')::uuid AND lease_id=(p_data->>'lease_id')::uuid AND status='sending';
  RETURN jsonb_build_object('updated',FOUND);
 ELSE RAISE EXCEPTION 'Thao tác không hợp lệ.' USING ERRCODE='22023'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.review_email_work(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.review_email_work(text,jsonb) TO service_role;

CREATE FUNCTION public.create_class_with_learning(p_data jsonb,p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; cid uuid; prog text; tid uuid; b jsonb;
BEGIN
 PERFORM csat_internal.require_admin();
 result:=public.manage_class('create',NULL,p_data,p_request_id);cid:=(result->>'class_id')::uuid;
 -- Same request retry returns the original class and never rewrites its roadmap.
 IF NOT EXISTS(SELECT 1 FROM public.learning_records WHERE class_id=cid AND kind='class') THEN
  prog:=coalesce(p_data->>'program',CASE WHEN p_data->>'class_type' IN ('Lớp Cơ bản','Cơ bản') THEN 'basic' WHEN p_data->>'class_type' IN ('Lớp Nâng cao','Nâng cao') THEN 'advanced' END);
  SELECT template_id INTO tid FROM public.learning_defaults WHERE program=prog;
  b:=jsonb_build_object('goal','','focus_tags','[]'::jsonb,'next_step','','stage_index',NULL,'title','','content','','continuation','','program',prog,
    'format',coalesce(p_data->>'teaching_format','group'),'template_id',tid);
  PERFORM public.save_learning_record(cid,'class',NULL,NULL,0,b,false);
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_class_with_learning(jsonb,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.create_class_with_learning(jsonb,uuid) TO authenticated;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260910_13');
NOTIFY pgrst,'reload schema';
COMMIT;
