BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260922_21') THEN RAISE EXCEPTION 'Migration 21 already applied'; END IF;
 IF (SELECT count(*) FROM csat_internal.schema_migrations WHERE version IN ('20260914_19','20260922_20'))<>2 THEN RAISE EXCEPTION 'Requires migrations 19 and 20'; END IF;
END $$;
-- No historical rows are rewritten; only a first claim refreshes an unsent reminder.
CREATE OR REPLACE FUNCTION public.review_email_work(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE local_now timestamp:=now() AT TIME ZONE 'Asia/Ho_Chi_Minh'; m text; q jsonb; tutor_record record; r public.review_email_runs%ROWTYPE;
 settings public.parent_portal_settings%ROWTYPE; o public.review_email_outbox%ROWTYPE; content text; addr text; allowed boolean; remaining jsonb; recipient_name text;
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
    IF o.first_attempt_at IS NULL THEN
     SELECT coalesce(jsonb_agg(y ORDER BY y->>'class_name',y->>'student_name',y->>'student_id'),'[]'::jsonb) INTO remaining
     FROM jsonb_array_elements(q) y JOIN jsonb_array_elements(o.targets) x
      ON y->>'class_id'=x->>'class_id' AND y->>'student_id'=x->>'student_id'
     WHERE y->>'status' IN ('missing','draft') AND coalesce((y->>'actionable')::boolean,false) AND y->>'tutor_id'=o.recipient_key;
     IF jsonb_array_length(remaining)=0 THEN
      UPDATE public.review_email_outbox SET status='skipped',error_code='already_completed' WHERE outbox_id=o.outbox_id; CONTINUE;
     END IF;
     SELECT * INTO STRICT r FROM public.review_email_runs WHERE month=o.month;
     SELECT name INTO recipient_name FROM public.tutors WHERE tutor_id::text=o.recipient_key;
     m:=o.month;
   content:='Chào '||recipient_name||E',\n\nVui lòng hoàn thiện nhận xét tháng '||m||E' cho các học sinh sau:\n'||
    (SELECT string_agg('- '||(x->>'student_name')||' · '||(x->>'class_name')||' · '||CASE WHEN x->>'status'='draft' THEN 'Bản nháp' ELSE 'Chưa viết' END||E'\n'||
      r.origin||'/tutor/classes/'||(x->>'class_id')||'/students/'||(x->>'student_id')||'/review?month='||m,E'\n\n' ORDER BY x->>'class_name',x->>'student_name') FROM jsonb_array_elements(remaining) x)||
    E'\n\nVới tag sử dụng, hãy chọn dựa trên nội dung đã học và ghi biểu hiện hoặc bài làm cụ thể. Mỗi học sinh có một nhận xét theo từng lớp trong tháng; không cần nhập lại cho mỗi buổi học.'||
    E'\nĐăng nhập tài khoản gia sư để mở biểu mẫu. Lưu nháp khi đang soạn; kiểm tra nội dung trước khi chọn “Gửi nhận xét”. Thao tác gửi công bố nhận xét cho phụ huynh. Admin thực hiện chốt sổ học phí riêng.'||
    E'\n\nDanh sách lập lúc '||to_char(r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh','DD/MM/YYYY HH24:MI')||' (Việt Nam). Nếu đã hoàn tất sau thời điểm tổng hợp, bạn không cần nhập lại.';
     -- Freeze the refreshed target list and text atomically with the first lease.
     -- Retry keeps exactly the same payload and provider idempotency key.
     UPDATE public.review_email_outbox SET targets=remaining,payload=jsonb_set(payload,'{text}',to_jsonb(content))
     WHERE outbox_id=o.outbox_id;
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

-- Extend the allowlisted parent projection, preserving review corrections from migration 15.
DO $$ DECLARE definition text; anchor text:=$anchor$'lesson',lr.published) ORDER BY$anchor$; replacement text:=$replacement$'lesson',lr.published,
   'tuition_amount',CASE WHEN s.status='cancelled' THEN NULL WHEN a.status='absent' THEN 0 WHEN a.status='attended' THEN a.tuition_fee_snapshot ELSE NULL END,
   'billing_period',s.billing_period,
   'fee_adjusted',a.adjustment_id IS NOT NULL) ORDER BY$replacement$;
BEGIN
 definition:=pg_get_functiondef('public.parent_learning_portal(text,uuid,text,integer)'::regprocedure);
 IF position(anchor IN definition)=0 THEN RAISE EXCEPTION 'Unexpected parent projection; review before migrating'; END IF;
 EXECUTE replace(definition,anchor,replacement);
END $$;
REVOKE ALL ON FUNCTION public.review_email_work(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.review_email_work(text,jsonb) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.parent_learning_portal(text,uuid,text,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.parent_learning_portal(text,uuid,text,integer) TO service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260922_21');
NOTIFY pgrst,'reload schema';
COMMIT;
