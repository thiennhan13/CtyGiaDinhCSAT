BEGIN;
-- Additive migration. Existing payloads and accepted mail remain unchanged.
ALTER TABLE public.review_email_runs ADD COLUMN reply_to text NOT NULL DEFAULT 'csattutor@gmail.com',
 ADD COLUMN created_by uuid REFERENCES auth.users(id), ADD COLUMN request_id uuid UNIQUE;
ALTER TABLE public.review_email_outbox ADD COLUMN targets jsonb;
CREATE TABLE public.email_reconciliations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 review_outbox_id uuid REFERENCES public.review_email_outbox(outbox_id) ON DELETE RESTRICT,
 consultation_id uuid REFERENCES public.consultation_email_outbox(request_id) ON DELETE RESTRICT,
 outcome text NOT NULL CHECK(outcome IN ('checked','handled_elsewhere','provider_confirmed')),
 note text NOT NULL CHECK(length(trim(note)) BETWEEN 3 AND 1000),
 actor_id uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(review_outbox_id,consultation_id)=1)
);
ALTER TABLE public.email_reconciliations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_reconciliations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.email_reconciliations TO authenticated;
CREATE POLICY admin_read ON public.email_reconciliations FOR SELECT TO authenticated USING(public.is_admin());

CREATE OR REPLACE FUNCTION public.review_email_work(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE local_now timestamp:=now() AT TIME ZONE 'Asia/Ho_Chi_Minh'; m text; q jsonb; tutor_record record; r public.review_email_runs%ROWTYPE;
 settings public.parent_portal_settings%ROWTYPE; o public.review_email_outbox%ROWTYPE; content text; addr text; allowed boolean;
BEGIN
 IF p_action IN ('preview','prepare_manual') THEN PERFORM csat_internal.require_admin();
 ELSIF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Chỉ máy chủ gửi email.' USING ERRCODE='42501'; END IF;
 SELECT * INTO settings FROM public.parent_portal_settings WHERE singleton;
 IF p_action IN ('preview','prepare_manual') THEN
  m:=p_data->>'month';
  IF m IS NULL OR m !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Tháng không hợp lệ.' USING ERRCODE='22023'; END IF;
  allowed:=(m=to_char(local_now,'YYYY-MM') AND extract(day FROM local_now)>=28 AND (extract(day FROM local_now)>28 OR local_now::time>='08:00'))
   OR (m=to_char(local_now-interval '1 month','YYYY-MM') AND extract(day FROM local_now)<=7);
  q:=public.learning_month_queue(m);
  IF p_action='preview' THEN RETURN jsonb_build_object('month',m,'queue',q,'token',md5(m||q::text),'allowed',allowed,
   'disabled',NOT settings.email_enabled,'existing',EXISTS(SELECT 1 FROM public.review_email_runs WHERE month=m),'previewed_at',now()); END IF;
  IF NOT allowed THEN RAISE EXCEPTION 'Ngoài thời gian phục hồi đợt nhắc.' USING ERRCODE='22023'; END IF;
  IF nullif(p_data->>'request_id','') IS NULL THEN RAISE EXCEPTION 'Thiếu mã thao tác.' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.review_email_runs WHERE request_id=(p_data->>'request_id')::uuid AND month<>m) THEN RAISE EXCEPTION 'Mã thao tác đã được dùng.' USING ERRCODE='23505'; END IF;
 END IF;
 IF NOT settings.email_enabled AND p_action<>'finish' THEN RETURN jsonb_build_object('disabled',true); END IF;
 IF p_action='status' THEN RETURN jsonb_build_object('disabled',false); END IF;
 IF p_action IN ('prepare','prepare_manual') THEN
  IF p_action='prepare' THEN
   IF extract(day FROM local_now)<>28 OR local_now::time<'08:00' THEN RETURN jsonb_build_object('outside_schedule',true); END IF;
   m:=to_char(local_now,'YYYY-MM');
  END IF;
  IF coalesce(p_data->>'origin','') !~ '^https://[^/]+$' OR coalesce(p_data->>'sender','')='' OR p_data->>'sender' ~ E'[\r\n]'
   OR coalesce(p_data->>'reply_to','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Thiếu cấu hình email.' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('review-email-'||m,0));
  IF EXISTS(SELECT 1 FROM public.review_email_runs WHERE month=m) THEN RETURN jsonb_build_object('existing',true); END IF;
  q:=public.learning_month_queue(m);
  IF p_action='prepare_manual' AND (p_data->>'token') IS DISTINCT FROM md5(m||q::text) THEN RAISE EXCEPTION 'Danh sách đã thay đổi. Hãy xem trước lại.' USING ERRCODE='40001'; END IF;
  INSERT INTO public.review_email_runs(month,snapshot,sender,origin,admin_emails,reply_to,created_by,request_id)
  VALUES(m,q,p_data->>'sender',p_data->>'origin',ARRAY(SELECT DISTINCT lower(trim(a)) FROM unnest(settings.admin_emails) a WHERE trim(a)<>''),p_data->>'reply_to',
   CASE WHEN p_action='prepare_manual' THEN auth.uid() END,CASE WHEN p_action='prepare_manual' THEN (p_data->>'request_id')::uuid END) RETURNING * INTO r;
  FOR tutor_record IN SELECT tu.tutor_id,tu.name,tu.email,jsonb_agg(x) AS students
   FROM jsonb_array_elements(q) x JOIN public.tutors tu ON tu.tutor_id=(x->>'tutor_id')::uuid
   WHERE x->>'status'<>'published' AND coalesce((x->>'actionable')::boolean,false) GROUP BY tu.tutor_id,tu.name,tu.email LOOP
   content:='Chào '||tutor_record.name||E',\n\nVui lòng hoàn thiện nhận xét tháng '||m||E' cho các học sinh sau:\n'||
    (SELECT string_agg('- '||(x->>'student_name')||' · '||(x->>'class_name')||' · '||CASE WHEN x->>'status'='draft' THEN 'Bản nháp' ELSE 'Chưa viết' END||E'\n'||
      r.origin||'/tutor/classes/'||(x->>'class_id')||'/students/'||(x->>'student_id')||'/review?month='||m,E'\n\n' ORDER BY x->>'class_name',x->>'student_name') FROM jsonb_array_elements(tutor_record.students) x)||
    E'\n\nVới tag sử dụng, hãy chọn dựa trên nội dung đã học và ghi biểu hiện hoặc bài làm cụ thể. Mỗi học sinh có một nhận xét theo từng lớp trong tháng; không cần nhập lại cho mỗi buổi học.'||
    E'\nĐăng nhập tài khoản gia sư để mở biểu mẫu. Lưu nháp khi đang soạn; kiểm tra nội dung trước khi chọn “Gửi nhận xét”. Thao tác gửi công bố nhận xét cho phụ huynh. Admin thực hiện chốt sổ học phí riêng.'||
    E'\n\nDanh sách lập lúc '||to_char(r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh','DD/MM/YYYY HH24:MI')||' (Việt Nam). Nếu đã hoàn tất sau thời điểm tổng hợp, bạn không cần nhập lại.';
   addr:=lower(trim(coalesce(tutor_record.email,'')));
   INSERT INTO public.review_email_outbox(month,kind,recipient_key,recipient,payload,status,error_code,targets)
   VALUES(m,'tutor',tutor_record.tutor_id::text,addr,jsonb_build_object('from',r.sender,'reply_to',r.reply_to,'to',jsonb_build_array(addr),'subject','CSAT · Nhắc nhận xét tháng '||m,'text',content),
    CASE WHEN addr ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN 'queued' ELSE 'skipped' END,
    CASE WHEN addr !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN 'missing_email' END,tutor_record.students);
  END LOOP;
  RETURN jsonb_build_object('prepared',true,'month',m);
 ELSIF p_action='admin' THEN
  FOR r IN SELECT run_row.* FROM public.review_email_runs run_row WHERE EXISTS(SELECT 1 FROM unnest(run_row.admin_emails) a WHERE NOT EXISTS(SELECT 1 FROM public.review_email_outbox d WHERE d.month=run_row.month AND d.kind='admin' AND d.recipient_key=lower(trim(a)))) ORDER BY month LOOP
   IF EXISTS(SELECT 1 FROM public.review_email_outbox WHERE month=r.month AND kind='tutor' AND attempts=0 AND status IN ('queued','sending','failed')
    AND NOT EXISTS(SELECT 1 FROM public.email_reconciliations n WHERE n.review_outbox_id=review_email_outbox.outbox_id AND n.outcome<>'checked')) THEN CONTINUE; END IF;
   content:='Tổng hợp nhận xét tháng '||r.month||' · danh sách lập lúc '||to_char(r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh','DD/MM/YYYY HH24:MI')||E' (Việt Nam).\n\n'||
    coalesce((SELECT string_agg(y.line,E'\n') FROM (
     SELECT coalesce(x->>'tutor_name','Chưa phân gia sư')||' · '||(x->>'class_name')||': đã công bố '||count(*) FILTER(WHERE x->>'status'='published')||
      ', nháp '||count(*) FILTER(WHERE x->>'status'='draft')||', chưa viết '||count(*) FILTER(WHERE x->>'status'='missing')||
      ', cần kiểm tra phân công '||count(*) FILTER(WHERE NOT coalesce((x->>'actionable')::boolean,false)) AS line
     FROM jsonb_array_elements(r.snapshot) x GROUP BY x->>'tutor_name',x->>'class_name' ORDER BY x->>'tutor_name',x->>'class_name') y),'Chưa có học sinh cần tổng hợp.')||
    E'\n\nLượt gửi nhắc gia sư tính đến '||to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh','DD/MM/YYYY HH24:MI')||E' (Việt Nam):\n'||
    coalesce((SELECT string_agg(coalesce(t.name,email_row.recipient_key)||': '||CASE email_row.status WHEN 'accepted' THEN 'Nhà cung cấp đã tiếp nhận' WHEN 'failed' THEN 'Gửi lỗi' WHEN 'manual_review' THEN 'Cần kiểm tra' WHEN 'skipped' THEN 'Bỏ qua' WHEN 'sending' THEN 'Đang gửi' ELSE 'Chờ gửi' END||coalesce(' · '||email_row.error_code,''),E'\n' ORDER BY t.name)
      FROM public.review_email_outbox email_row LEFT JOIN public.tutors t ON t.tutor_id::text=email_row.recipient_key WHERE email_row.month=r.month AND email_row.kind='tutor'),'Không có gia sư cần nhắc.')||
    E'\n\nXem tiến độ hiện tại và nhật ký: '||r.origin||E'/admin/learning\nAdmin đối chiếu và chốt sổ thủ công. Nhận xét còn thiếu không tự chặn chốt sổ học phí.';
   FOREACH addr IN ARRAY r.admin_emails LOOP
    INSERT INTO public.review_email_outbox(month,kind,recipient_key,recipient,payload)
    VALUES(r.month,'admin',lower(trim(addr)),lower(trim(addr)),jsonb_build_object('from',r.sender,'reply_to',r.reply_to,'to',jsonb_build_array(lower(trim(addr))),'subject','CSAT · Tổng hợp nhận xét tháng '||r.month,'text',content))
    ON CONFLICT(month,kind,recipient_key) DO NOTHING;
   END LOOP;
  END LOOP;
  RETURN jsonb_build_object('ok',true);
 ELSIF p_action='claim' THEN
  UPDATE public.review_email_outbox email_row SET status='manual_review',error_code='stale_unattempted'
   FROM public.review_email_runs run_row WHERE run_row.month=email_row.month AND email_row.status='queued' AND email_row.first_attempt_at IS NULL AND run_row.created_at<now()-interval '7 days';
  UPDATE public.review_email_outbox SET status='manual_review',error_code='idempotency_window_expired' WHERE status IN ('failed','sending') AND first_attempt_at<now()-interval '23 hours';
  UPDATE public.review_email_outbox SET status='manual_review',error_code='attempts_exhausted' WHERE attempts>=3 AND (status='failed' OR (status='sending' AND lease_until<now()));
  LOOP
   SELECT * INTO o FROM public.review_email_outbox
   WHERE ((status IN ('queued','failed') AND next_attempt_at<=now() AND attempts<3) OR (status='sending' AND lease_until<now() AND attempts<3))
    AND (first_attempt_at IS NULL OR first_attempt_at>=now()-interval '23 hours')
    AND NOT EXISTS(SELECT 1 FROM public.email_reconciliations n WHERE n.review_outbox_id=review_email_outbox.outbox_id AND n.outcome<>'checked')
   ORDER BY CASE WHEN kind='tutor' THEN 0 ELSE 1 END,created_at,outbox_id FOR UPDATE SKIP LOCKED LIMIT 1;
   IF o.outbox_id IS NULL THEN RETURN NULL; END IF;
   IF o.kind='tutor' THEN
    q:=public.learning_month_queue(o.month);
    IF o.targets IS NULL OR EXISTS(SELECT 1 FROM jsonb_array_elements(o.targets) x WHERE NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(q) y WHERE y->>'class_id'=x->>'class_id' AND y->>'student_id'=x->>'student_id'
       AND y->>'tutor_id'=o.recipient_key AND coalesce((y->>'actionable')::boolean,false)))
     OR NOT EXISTS(SELECT 1 FROM public.tutors WHERE tutor_id::text=o.recipient_key AND lower(trim(email))=o.recipient) THEN
     UPDATE public.review_email_outbox SET status='manual_review',error_code='assignment_changed' WHERE outbox_id=o.outbox_id; CONTINUE;
    END IF;
    IF o.first_attempt_at IS NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q) y JOIN jsonb_array_elements(o.targets) x
      ON y->>'class_id'=x->>'class_id' AND y->>'student_id'=x->>'student_id' WHERE y->>'status'<>'published') THEN
     UPDATE public.review_email_outbox SET status='skipped',error_code='already_completed' WHERE outbox_id=o.outbox_id; CONTINUE;
    END IF;
   END IF;
   UPDATE public.review_email_outbox SET status='sending',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),lease_id=gen_random_uuid(),lease_until=now()+interval '3 minutes'
    WHERE outbox_id=o.outbox_id RETURNING * INTO o;
   RETURN to_jsonb(o);
  END LOOP;
 ELSIF p_action='finish' THEN
  IF p_data->>'status' IS NULL OR p_data->>'status' NOT IN ('accepted','failed') THEN RAISE EXCEPTION 'Trạng thái không hợp lệ.' USING ERRCODE='22023'; END IF;
  UPDATE public.review_email_outbox SET status=CASE WHEN p_data->>'status'='failed' AND attempts>=3 THEN 'manual_review' ELSE p_data->>'status' END,
   provider_id=p_data->>'provider_id',error_code=left(p_data->>'error_code',100),accepted_at=CASE WHEN p_data->>'status'='accepted' THEN now() END,
   lease_until=NULL,next_attempt_at=now()+interval '5 minutes'
  WHERE outbox_id=(p_data->>'outbox_id')::uuid AND lease_id=(p_data->>'lease_id')::uuid AND status='sending';
  RETURN jsonb_build_object('updated',FOUND);
 ELSE RAISE EXCEPTION 'Thao tác không hợp lệ.' USING ERRCODE='22023'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.review_email_work(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.review_email_work(text,jsonb) TO service_role,authenticated;

CREATE FUNCTION public.reconcile_email(p_kind text,p_id uuid,p_outcome text,p_note text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE state text; result uuid;
BEGIN
 PERFORM csat_internal.require_admin();
 IF p_outcome IS NULL OR p_outcome NOT IN ('checked','handled_elsewhere','provider_confirmed') OR p_note IS NULL OR length(trim(p_note)) NOT BETWEEN 3 AND 1000 THEN
  RAISE EXCEPTION 'Nội dung đối chiếu không hợp lệ.' USING ERRCODE='22023'; END IF;
 IF p_kind='review' THEN SELECT status INTO state FROM public.review_email_outbox WHERE outbox_id=p_id FOR UPDATE;
 ELSIF p_kind='consultation' THEN SELECT status INTO state FROM public.consultation_email_outbox WHERE request_id=p_id FOR UPDATE;
 ELSE RAISE EXCEPTION 'Loại email không hợp lệ.' USING ERRCODE='22023'; END IF;
 IF state IS NULL THEN RAISE EXCEPTION 'Không tìm thấy email.' USING ERRCODE='P0002'; END IF;
 IF state NOT IN ('failed','manual_review','skipped') THEN RAISE EXCEPTION 'Chỉ đối chiếu thư lỗi hoặc cần kiểm tra.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.email_reconciliations(review_outbox_id,consultation_id,outcome,note,actor_id)
 VALUES(CASE WHEN p_kind='review' THEN p_id END,CASE WHEN p_kind='consultation' THEN p_id END,p_outcome,trim(p_note),auth.uid()) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_email(text,uuid,text,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_email(text,uuid,text,text) TO authenticated;

CREATE FUNCTION public.review_email_overview() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE local_now timestamp:=now() AT TIME ZONE 'Asia/Ho_Chi_Minh'; m text;
BEGIN
 PERFORM csat_internal.require_admin();
 m:=to_char(local_now,'YYYY-MM');
 RETURN jsonb_build_object('month',m,'server_time',now(),
 'recovery_month',CASE WHEN extract(day FROM local_now)<=7 THEN to_char(local_now-interval '1 month','YYYY-MM') ELSE m END,
 'missing_run',extract(day FROM local_now)>=28 AND (extract(day FROM local_now)>28 OR local_now::time>='09:00') AND NOT EXISTS(SELECT 1 FROM public.review_email_runs WHERE month=m),
 'runs',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY month DESC),'[]') FROM (
  SELECT r.month,r.created_at,r.created_by,count(o.outbox_id)::int total,
   count(o.outbox_id) FILTER(WHERE o.status='accepted')::int accepted,
   count(o.outbox_id) FILTER(WHERE o.status IN ('queued','sending','failed') AND NOT EXISTS(SELECT 1 FROM public.email_reconciliations n WHERE n.review_outbox_id=o.outbox_id AND n.outcome<>'checked'))::int pending,
   count(o.outbox_id) FILTER(WHERE o.status IN ('failed','manual_review','skipped') AND o.error_code IS DISTINCT FROM 'already_completed' AND NOT EXISTS(SELECT 1 FROM public.email_reconciliations n WHERE n.review_outbox_id=o.outbox_id AND n.outcome<>'checked'))::int needs_review,
   EXISTS(SELECT 1 FROM unnest(r.admin_emails) a WHERE NOT EXISTS(SELECT 1 FROM public.review_email_outbox d WHERE d.month=r.month AND d.kind='admin' AND d.recipient_key=lower(trim(a)))) digest_missing
  FROM public.review_email_runs r LEFT JOIN public.review_email_outbox o ON o.month=r.month GROUP BY r.month ORDER BY r.month DESC LIMIT 24
 ) x));
END $$;
REVOKE ALL ON FUNCTION public.review_email_overview() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.review_email_overview() TO authenticated;
CREATE OR REPLACE FUNCTION public.claim_consultation_email(p_id uuid,p_sender text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job consultation_email_outbox; token uuid;
BEGIN
 IF p_sender IS NULL OR length(p_sender) NOT BETWEEN 3 AND 254 OR p_sender ~ E'[\r\n]' THEN RAISE EXCEPTION 'Invalid sender'; END IF;
 SELECT * INTO job FROM consultation_email_outbox WHERE request_id=p_id FOR UPDATE;
 IF NOT FOUND OR job.status IN ('accepted','manual_review') OR EXISTS(SELECT 1 FROM public.email_reconciliations WHERE consultation_id=p_id AND outcome<>'checked') THEN RETURN NULL; END IF;
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

CREATE OR REPLACE FUNCTION public.finish_consultation_email(p_id uuid,p_lease uuid,p_provider text,p_error text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE consultation_email_outbox SET status=CASE WHEN p_provider IS NOT NULL THEN 'accepted' WHEN attempts>=3 THEN 'manual_review' ELSE 'failed' END,
 provider_id=p_provider,error_code=CASE WHEN p_provider IS NOT NULL THEN NULL ELSE left(p_error,100) END,
 accepted_at=CASE WHEN p_provider IS NOT NULL THEN now() ELSE NULL END,
 next_attempt_at=now()+interval '5 minutes',lease_id=NULL,lease_until=NULL
 WHERE request_id=p_id AND lease_id=p_lease AND status='sending';
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.finish_consultation_email(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_consultation_email(uuid,uuid,text,text) TO service_role;


INSERT INTO csat_internal.schema_migrations(version) VALUES('20260914_19');
NOTIFY pgrst,'reload schema';
COMMIT;
