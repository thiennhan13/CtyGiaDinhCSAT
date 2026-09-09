BEGIN;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260908_05') THEN
    RAISE EXCEPTION 'Apply 20260908_05 first';
  END IF;
END $$;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.payments ALTER COLUMN amount TYPE numeric(14,2);
CREATE TABLE public.billing_periods (
  period_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text NOT NULL UNIQUE,
  start_date date, end_date date, source text NOT NULL CHECK(source IN ('legacy','ledger')),
  closed_at timestamptz, closed_by uuid,
  CHECK(source='legacy' OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date>=start_date AND closed_at IS NOT NULL AND closed_by IS NOT NULL))
);
INSERT INTO public.billing_periods(label,source)
SELECT billing_period,'legacy' FROM public.payments
UNION SELECT billing_period,'legacy' FROM public.sessions WHERE billing_period IS NOT NULL;
CREATE TABLE public.billing_sessions (
  session_id uuid PRIMARY KEY REFERENCES public.sessions ON DELETE RESTRICT,
  period_id uuid NOT NULL REFERENCES public.billing_periods ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.classes ON DELETE RESTRICT,
  tutor_id uuid NOT NULL REFERENCES public.tutors ON DELETE RESTRICT,
  class_name text NOT NULL, tutor_name text NOT NULL,
  date date NOT NULL, start_time time NOT NULL, end_time time NOT NULL,
  tuition numeric(14,2) NOT NULL CHECK(tuition>=0),
  csat_rate numeric(14,2) NOT NULL CHECK(csat_rate>=0),
  csat numeric(14,2) NOT NULL CHECK(csat>=0), net numeric(14,2) NOT NULL,
  CHECK(net=tuition-csat), CHECK(end_time>start_time)
);
CREATE INDEX billing_sessions_period_tutor_idx ON public.billing_sessions(period_id,tutor_id);
CREATE TABLE public.billing_items (
  item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid NOT NULL UNIQUE REFERENCES public.session_attendance ON DELETE RESTRICT,
  session_id uuid NOT NULL REFERENCES public.billing_sessions ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students ON DELETE RESTRICT,
  payment_id uuid REFERENCES public.payments ON DELETE RESTRICT,
  student_name text NOT NULL, status public.attendance_status NOT NULL,
  fee numeric(14,2) NOT NULL CHECK(fee>=0), amount numeric(14,2) NOT NULL CHECK(amount>=0),
  zero_fee_confirmed boolean NOT NULL DEFAULT false,
  CHECK(amount=CASE WHEN status='attended' THEN fee ELSE 0 END)
);
CREATE INDEX billing_items_session_idx ON public.billing_items(session_id);
CREATE INDEX billing_items_payment_idx ON public.billing_items(payment_id);
CREATE TABLE public.billing_adjustments (
  adjustment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.billing_items ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES public.payments ON DELETE RESTRICT,
  corrected_status public.attendance_status NOT NULL,
  corrected_fee numeric(14,2) NOT NULL CHECK(corrected_fee>=0),
  tuition_delta numeric(14,2) NOT NULL, csat_delta numeric(14,2) NOT NULL, net_delta numeric(14,2) NOT NULL,
  reason text NOT NULL CHECK(length(trim(reason))>0),
  actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reversal_of uuid UNIQUE REFERENCES public.billing_adjustments ON DELETE RESTRICT,
  CHECK(net_delta=tuition_delta-csat_delta)
);
CREATE INDEX billing_adjustments_item_idx ON public.billing_adjustments(item_id,created_at DESC,adjustment_id);
CREATE INDEX billing_adjustments_payment_idx ON public.billing_adjustments(payment_id);
CREATE TABLE public.payment_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments ON DELETE RESTRICT,
  kind text NOT NULL CHECK(kind IN ('receipt','refund','reversal')),
  amount numeric(14,2) NOT NULL CHECK(amount<>0), reason text NOT NULL,
  actor_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reversal_of uuid UNIQUE REFERENCES public.payment_events ON DELETE RESTRICT,
  CHECK((kind='receipt' AND amount>0) OR (kind='refund' AND amount<0) OR (kind='reversal' AND reversal_of IS NOT NULL))
);
CREATE INDEX payment_events_payment_idx ON public.payment_events(payment_id,occurred_at);
CREATE TABLE csat_internal.operation_results (
  actor_id uuid NOT NULL, request_id uuid NOT NULL, operation text NOT NULL,
  payload jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(actor_id,request_id)
);
CREATE FUNCTION csat_internal.require_admin() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
  IF auth.uid() IS NULL OR public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Thao tác yêu cầu tài khoản quản trị viên đã đăng nhập.' USING ERRCODE='42501';
  END IF;
END $$;
CREATE FUNCTION csat_internal.start_operation(op text, rid uuid, payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior csat_internal.operation_results%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR rid IS NULL THEN RAISE EXCEPTION 'Thiếu mã yêu cầu hoặc phiên đăng nhập.' USING ERRCODE='22023'; END IF;
  -- One business lock: deliberately serializes writes at the centre's current scale.
  PERFORM pg_advisory_xact_lock(20260908,1);
  SELECT * INTO prior FROM csat_internal.operation_results WHERE actor_id=auth.uid() AND request_id=rid;
  IF FOUND THEN
    IF prior.operation<>op OR prior.payload IS DISTINCT FROM payload THEN
      RAISE EXCEPTION 'Mã yêu cầu đã được sử dụng với nội dung khác.' USING ERRCODE='23505';
    END IF;
    RETURN prior.result;
  END IF;
  RETURN NULL;
END $$;
CREATE FUNCTION csat_internal.finish_operation(op text,rid uuid,payload jsonb,result jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
  INSERT INTO csat_internal.operation_results(actor_id,request_id,operation,payload,result) VALUES(auth.uid(),rid,op,payload,result);
  RETURN result;
END $$;
CREATE FUNCTION csat_internal.immutable_record() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
  RAISE EXCEPTION 'Bản ghi lịch sử chỉ được bổ sung, không sửa hoặc xóa.' USING ERRCODE='23514';
END $$;

CREATE FUNCTION csat_internal.payment_balance(pid uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p.amount + coalesce((SELECT sum(a.tuition_delta) FROM public.billing_adjustments a WHERE a.payment_id=pid),0)
    - coalesce((SELECT CASE WHEN l.original_row->>'status'='paid' THEN (l.original_row->>'amount')::numeric ELSE 0 END
      FROM csat_internal.legacy_payments l WHERE l.payment_id=pid),0)
    - coalesce((SELECT sum(e.amount) FROM public.payment_events e WHERE e.payment_id=pid),0)
  FROM public.payments p WHERE p.payment_id=pid;
$$;

-- Single source for preview and close. It never fills a missing historical price.
CREATE FUNCTION csat_internal.billing_snapshot(d1 date,d2 date,period_label text DEFAULT NULL,only_tutor uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
WITH selected AS (
  SELECT s.*,c.name AS class_name,t.name AS tutor_name,b.period_id AS ledger_period_id,
    b.class_name AS saved_class_name,b.tutor_name AS saved_tutor_name,b.csat_rate AS saved_csat_rate
  FROM public.sessions s LEFT JOIN public.classes c ON c.class_id=s.class_id
  LEFT JOIN public.tutors t ON t.tutor_id=s.tutor_id_snapshot
  LEFT JOIN public.billing_sessions b ON b.session_id=s.session_id
  WHERE s.status='completed' AND ((period_label IS NULL AND s.billing_period IS NULL AND s.date BETWEEN d1 AND d2)
    OR (period_label IS NOT NULL AND s.billing_period=period_label))
    AND (only_tutor IS NULL OR s.tutor_id_snapshot=only_tutor)
), items AS (
  SELECT s.session_id,coalesce(jsonb_agg(jsonb_build_object(
    'attendance_id',a.attendance_id,'item_id',bi.item_id,'student_id',a.student_id,
    'student_name',coalesce(bi.student_name,st.name,a.student_id::text),
    'status',coalesce(adj.corrected_status,bi.status,a.status),
    'fee',coalesce(adj.corrected_fee,bi.fee,a.tuition_fee_snapshot),
    'amount',CASE WHEN coalesce(adj.corrected_status,bi.status,a.status)='attended'
      THEN coalesce(adj.corrected_fee,bi.fee,a.tuition_fee_snapshot) ELSE 0 END,
    'original_amount',coalesce(bi.amount,CASE WHEN a.status='attended' THEN a.tuition_fee_snapshot ELSE 0 END)
  ) ORDER BY a.attendance_id) FILTER(WHERE a.attendance_id IS NOT NULL),'[]'::jsonb) AS attendance,
  coalesce(sum(CASE WHEN coalesce(adj.corrected_status,bi.status,a.status)='attended'
    THEN coalesce(adj.corrected_fee,bi.fee,a.tuition_fee_snapshot) ELSE 0 END),0) AS tuition
  FROM selected s LEFT JOIN public.session_attendance a ON a.session_id=s.session_id
  LEFT JOIN public.students st ON st.student_id=a.student_id
  LEFT JOIN public.billing_items bi ON bi.attendance_id=a.attendance_id
  LEFT JOIN LATERAL (SELECT ba.corrected_status,ba.corrected_fee FROM public.billing_adjustments ba
    WHERE ba.item_id=bi.item_id ORDER BY ba.created_at DESC,ba.adjustment_id DESC LIMIT 1) adj ON true
  GROUP BY s.session_id
), rows AS (
  SELECT s.*,i.attendance,i.tuition,
    CASE WHEN i.tuition>0 THEN coalesce(s.saved_csat_rate,s.csat_fee_snapshot) ELSE 0 END AS csat
  FROM selected s JOIN items i USING(session_id)
), payload AS (
 SELECT coalesce(jsonb_agg(jsonb_build_object('session_id',session_id,'class_id',class_id,
  'class_name',coalesce(saved_class_name,class_name,'Không còn liên kết lớp'),
  'tutor_id',tutor_id_snapshot,'tutor_name',coalesce(saved_tutor_name,tutor_name,'Không còn liên kết gia sư'),
  'date',date,'start_time',start_time,'end_time',end_time,'csat_rate',coalesce(saved_csat_rate,csat_fee_snapshot),
  'tuition',tuition,'csat',csat,'net',tuition-csat,'attendance',attendance) ORDER BY date,start_time,session_id),'[]'::jsonb) AS sessions
 FROM rows
)
SELECT jsonb_build_object('sessions',sessions,'previewToken',md5(sessions::text),'totalStudentTuition',coalesce((SELECT sum(tuition) FROM rows),0),
 'totalCsatRevenue',coalesce((SELECT sum(csat) FROM rows),0),'totalTutorSalary',coalesce((SELECT sum(tuition-csat) FROM rows),0),
 'missing_prices',EXISTS(SELECT 1 FROM rows WHERE csat_fee_snapshot IS NULL OR EXISTS(SELECT 1 FROM jsonb_array_elements(attendance) a WHERE a->>'fee' IS NULL))) INTO result FROM payload;
IF (result->>'missing_prices')::boolean THEN RAISE EXCEPTION 'Báo cáo còn buổi thiếu đơn giá lưu tại thời điểm học; cần đối soát trước khi tính tiền.' USING ERRCODE='22023'; END IF;
RETURN result-'missing_prices';
END $$;

CREATE FUNCTION public.billing_report(p_start_date date DEFAULT NULL,p_end_date date DEFAULT NULL,p_period text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; payments_data jsonb; period_data jsonb;
BEGIN
  PERFORM csat_internal.require_admin();
  IF p_period IS NULL AND (p_start_date IS NULL OR p_end_date IS NULL OR p_end_date<p_start_date) THEN
    RAISE EXCEPTION 'Khoảng ngày không hợp lệ.' USING ERRCODE='22023';
  END IF;
  result:=csat_internal.billing_snapshot(p_start_date,p_end_date,p_period);
  SELECT to_jsonb(b) INTO period_data FROM public.billing_periods b WHERE label=p_period;
  SELECT coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('students',jsonb_build_object('name',s.name),
    'classes',jsonb_build_object('name',c.name),'balance',csat_internal.payment_balance(p.payment_id),
    'events',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.occurred_at DESC) FROM public.payment_events e WHERE e.payment_id=p.payment_id),'[]'::jsonb),
    'adjustment_amount',coalesce((SELECT sum(a.tuition_delta) FROM public.billing_adjustments a WHERE a.payment_id=p.payment_id),0))
    ORDER BY p.payment_id),'[]'::jsonb) INTO payments_data FROM public.payments p
    LEFT JOIN public.students s USING(student_id) LEFT JOIN public.classes c USING(class_id) WHERE p.billing_period=p_period;
  RETURN result||jsonb_build_object('period',period_data,'payments',payments_data,
    'adjustments',coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC,a.adjustment_id DESC) FROM public.billing_adjustments a JOIN public.billing_items i USING(item_id) JOIN public.billing_sessions bs ON bs.session_id=i.session_id JOIN public.billing_periods bp USING(period_id) WHERE bp.label=p_period),'[]'::jsonb),
    'originalInvoiceTotal',coalesce((SELECT sum(amount) FROM public.payments WHERE billing_period=p_period),0));
END $$;

CREATE FUNCTION public.close_billing_period(p_start_date date,p_end_date date,p_label text,p_preview_token text,
  p_request_id uuid,p_zero_fee_attendance_ids uuid[] DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb; prior jsonb; snap jsonb; sid uuid; period_id_new uuid; invoice_count integer; r record;
BEGIN
  PERFORM csat_internal.require_admin();
  payload:=jsonb_build_object('start',p_start_date,'end',p_end_date,'label',p_label,'token',p_preview_token,'zero',p_zero_fee_attendance_ids);
  prior:=csat_internal.start_operation('close_billing',p_request_id,payload); IF prior IS NOT NULL THEN RETURN prior; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date<p_start_date OR length(trim(coalesce(p_label,'')))=0 OR length(p_label)>255 THEN
    RAISE EXCEPTION 'Khoảng ngày hoặc tên kỳ không hợp lệ.' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM public.billing_periods WHERE label=p_label) THEN RAISE EXCEPTION 'Tên kỳ đã tồn tại; kỳ đã đóng không nhận thêm buổi.' USING ERRCODE='23505'; END IF;
  PERFORM 1 FROM public.sessions WHERE status='completed' AND billing_period IS NULL AND date BETWEEN p_start_date AND p_end_date ORDER BY session_id FOR UPDATE;
  snap:=csat_internal.billing_snapshot(p_start_date,p_end_date);
  IF p_preview_token IS DISTINCT FROM snap->>'previewToken' THEN RAISE EXCEPTION 'Dữ liệu đã thay đổi. Hãy xem trước lại trước khi chốt.' USING ERRCODE='40001'; END IF;
  IF jsonb_array_length(snap->'sessions')=0 THEN
    RETURN csat_internal.finish_operation('close_billing',p_request_id,payload,jsonb_build_object('message','Không có buổi học chưa chốt.','invoice_count',0));
  END IF;
  FOR r IN SELECT * FROM public.sessions WHERE status='completed' AND billing_period IS NULL AND date BETWEEN p_start_date AND p_end_date LOOP
    IF r.class_id IS NULL OR r.tutor_id_snapshot IS NULL OR r.csat_fee_snapshot IS NULL OR r.csat_fee_snapshot<0
      OR r.date IS NULL OR r.start_time IS NULL OR r.end_time IS NULL OR r.end_time<=r.start_time OR (r.date+r.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'>clock_timestamp()
      OR NOT EXISTS(SELECT 1 FROM public.session_attendance WHERE session_id=r.session_id)
      OR EXISTS(SELECT 1 FROM public.sessions x WHERE x.session_id<>r.session_id AND (x.class_id=r.class_id OR x.tutor_id_snapshot=r.tutor_id_snapshot) AND x.date=r.date
        AND x.status<>'cancelled' AND x.start_time<r.end_time AND x.end_time>r.start_time) THEN
      RAISE EXCEPTION 'Buổi % cần đối soát lịch hoặc dữ liệu trước khi chốt.',r.session_id USING ERRCODE='22023';
    END IF;
    IF EXISTS(SELECT 1 FROM public.session_attendance a WHERE a.session_id=r.session_id AND
      (a.tuition_fee_snapshot IS NULL OR a.tuition_fee_snapshot<0 OR
        (a.status='attended' AND a.tuition_fee_snapshot=0 AND NOT(a.attendance_id=ANY(coalesce(p_zero_fee_attendance_ids,'{}')))))) THEN
      RAISE EXCEPTION 'Buổi % thiếu đơn giá hoặc chưa xác nhận học phí miễn giảm 0 đồng.',r.session_id USING ERRCODE='22023';
    END IF;
  END LOOP;
  INSERT INTO public.billing_periods(label,start_date,end_date,source,closed_at,closed_by)
    VALUES(p_label,p_start_date,p_end_date,'ledger',clock_timestamp(),auth.uid()) RETURNING period_id INTO period_id_new;
  INSERT INTO public.billing_sessions(session_id,period_id,class_id,tutor_id,class_name,tutor_name,date,start_time,end_time,tuition,csat_rate,csat,net)
  SELECT (x->>'session_id')::uuid,period_id_new,(x->>'class_id')::uuid,(x->>'tutor_id')::uuid,x->>'class_name',x->>'tutor_name',
    (x->>'date')::date,(x->>'start_time')::time,(x->>'end_time')::time,(x->>'tuition')::numeric,(x->>'csat_rate')::numeric,(x->>'csat')::numeric,(x->>'net')::numeric
  FROM jsonb_array_elements(snap->'sessions') x;
  INSERT INTO public.payments(student_id,class_id,billing_period,amount,status)
  SELECT a.student_id,s.class_id,p_label,sum(a.tuition_fee_snapshot),'unpaid' FROM public.billing_sessions s
    JOIN public.session_attendance a USING(session_id) WHERE s.period_id=period_id_new AND a.status='attended'
    GROUP BY a.student_id,s.class_id HAVING sum(a.tuition_fee_snapshot)>0;
  GET DIAGNOSTICS invoice_count=ROW_COUNT;
  INSERT INTO public.billing_items(attendance_id,session_id,student_id,payment_id,student_name,status,fee,amount,zero_fee_confirmed)
  SELECT a.attendance_id,a.session_id,a.student_id,p.payment_id,st.name,a.status,a.tuition_fee_snapshot,
    CASE WHEN a.status='attended' THEN a.tuition_fee_snapshot ELSE 0 END,a.attendance_id=ANY(coalesce(p_zero_fee_attendance_ids,'{}'))
  FROM public.billing_sessions b JOIN public.session_attendance a USING(session_id) JOIN public.students st USING(student_id)
    LEFT JOIN public.payments p ON p.student_id=a.student_id AND p.class_id=b.class_id AND p.billing_period=p_label
  WHERE b.period_id=period_id_new;
  UPDATE public.sessions SET billing_period=p_label WHERE session_id IN(SELECT session_id FROM public.billing_sessions WHERE period_id=period_id_new);
  RETURN csat_internal.finish_operation('close_billing',p_request_id,payload,jsonb_build_object('message','Đã chốt sổ thành công.',
    'period_id',period_id_new,'billingPeriod',p_label,'invoice_count',invoice_count,'session_count',jsonb_array_length(snap->'sessions')));
END $$;

CREATE FUNCTION public.record_payment_event(p_payment_id uuid,p_request_id uuid,p_expected_balance numeric,p_reason text DEFAULT 'Ghi nhận thanh toán',p_reverse_event_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb; prior jsonb; balance numeric; event_amount numeric; eid uuid; original public.payment_events%ROWTYPE;
BEGIN
  PERFORM csat_internal.require_admin();
  payload:=jsonb_build_object('payment',p_payment_id,'balance',p_expected_balance,'reason',p_reason,'reverse',p_reverse_event_id);
  prior:=csat_internal.start_operation('payment_event',p_request_id,payload); IF prior IS NOT NULL THEN RETURN prior; END IF;
  PERFORM 1 FROM public.payments WHERE payment_id=p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy chứng từ.' USING ERRCODE='P0002'; END IF;
  balance:=csat_internal.payment_balance(p_payment_id);
  IF balance IS DISTINCT FROM p_expected_balance THEN RAISE EXCEPTION 'Công nợ đã thay đổi. Hãy tải lại dữ liệu.' USING ERRCODE='40001'; END IF;
  IF length(trim(coalesce(p_reason,'')))=0 THEN RAISE EXCEPTION 'Cần ghi lý do.' USING ERRCODE='22023'; END IF;
  IF p_reverse_event_id IS NOT NULL THEN
    SELECT * INTO original FROM public.payment_events WHERE event_id=p_reverse_event_id AND payment_id=p_payment_id;
    IF NOT FOUND OR original.kind='reversal' THEN RAISE EXCEPTION 'Không tìm thấy lần thu/hoàn gốc phù hợp.' USING ERRCODE='22023'; END IF;
    event_amount:=-original.amount;
  ELSE
    event_amount:=balance;
    IF balance=0 THEN RETURN csat_internal.finish_operation('payment_event',p_request_id,payload,jsonb_build_object('message','Không còn công nợ.','balance',0)); END IF;
  END IF;
  INSERT INTO public.payment_events(payment_id,kind,amount,reason,actor_id,reversal_of)
  VALUES(p_payment_id,CASE WHEN p_reverse_event_id IS NOT NULL THEN 'reversal' WHEN event_amount>0 THEN 'receipt' ELSE 'refund' END,event_amount,p_reason,auth.uid(),p_reverse_event_id)
    RETURNING event_id INTO eid;
  balance:=csat_internal.payment_balance(p_payment_id);
  -- Legacy paid timestamps remain unknown. The new ledger is authoritative for net balance.
  UPDATE public.payments SET status=CASE WHEN balance<=0 THEN 'paid'::public.payment_status ELSE 'unpaid'::public.payment_status END,
    paid_at=CASE WHEN balance<=0 THEN coalesce(paid_at,CASE WHEN EXISTS(SELECT 1 FROM csat_internal.legacy_payments l
      WHERE l.payment_id=p_payment_id AND l.original_row->>'status'='paid') THEN NULL ELSE clock_timestamp() END) ELSE paid_at END
    WHERE payment_id=p_payment_id;
  RETURN csat_internal.finish_operation('payment_event',p_request_id,payload,jsonb_build_object('message','Đã ghi nhận giao dịch.','event_id',eid,'balance',balance));
END $$;

CREATE FUNCTION public.preview_billing_adjustment(p_item_id uuid,p_status public.attendance_status,p_fee numeric,p_reverse_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.billing_items%ROWTYPE; bs public.billing_sessions%ROWTYPE; last_adj public.billing_adjustments%ROWTYPE;
  original public.billing_adjustments%ROWTYPE; current_fee numeric; current_status public.attendance_status;
  tuition_before numeric; tuition_after numeric; delta numeric; csat_delta numeric;
BEGIN
  PERFORM csat_internal.require_admin();
  SELECT * INTO item FROM public.billing_items WHERE item_id=p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kỳ cũ hoặc chi tiết không tồn tại; cần đối soát riêng.' USING ERRCODE='22023'; END IF;
  SELECT * INTO bs FROM public.billing_sessions WHERE session_id=item.session_id;
  SELECT * INTO last_adj FROM public.billing_adjustments WHERE item_id=p_item_id ORDER BY created_at DESC,adjustment_id DESC LIMIT 1;
  current_fee:=coalesce(last_adj.corrected_fee,item.fee); current_status:=coalesce(last_adj.corrected_status,item.status);
  IF p_reverse_id IS NOT NULL THEN
    SELECT * INTO original FROM public.billing_adjustments WHERE adjustment_id=p_reverse_id AND item_id=p_item_id;
    IF NOT FOUND OR original.reversal_of IS NOT NULL OR last_adj.adjustment_id IS DISTINCT FROM p_reverse_id THEN
      RAISE EXCEPTION 'Chỉ đảo khoản điều chỉnh mới nhất của dòng này; các trường hợp khác cần lập đính chính mới.' USING ERRCODE='22023';
    END IF;
    SELECT coalesce(a.corrected_fee,item.fee),coalesce(a.corrected_status,item.status) INTO p_fee,p_status
      FROM (SELECT 1) seed LEFT JOIN LATERAL(SELECT * FROM public.billing_adjustments WHERE item_id=p_item_id AND adjustment_id<>p_reverse_id
        ORDER BY created_at DESC,adjustment_id DESC LIMIT 1) a ON true;
  END IF;
  IF p_status IS NULL OR p_fee IS NULL OR p_fee<0 OR p_fee<>round(p_fee,2) THEN RAISE EXCEPTION 'Điểm danh hoặc đơn giá điều chỉnh không hợp lệ.' USING ERRCODE='22023'; END IF;
  IF p_status=current_status AND p_fee=current_fee THEN RAISE EXCEPTION 'Nội dung điều chỉnh không thay đổi.' USING ERRCODE='22023'; END IF;
  tuition_before:=bs.tuition+coalesce((SELECT sum(a.tuition_delta) FROM public.billing_adjustments a JOIN public.billing_items i USING(item_id) WHERE i.session_id=bs.session_id),0);
  delta:=(CASE WHEN p_status='attended' THEN p_fee ELSE 0 END)-(CASE WHEN current_status='attended' THEN current_fee ELSE 0 END);
  tuition_after:=tuition_before+delta;
  csat_delta:=(CASE WHEN tuition_after>0 THEN bs.csat_rate ELSE 0 END)-(CASE WHEN tuition_before>0 THEN bs.csat_rate ELSE 0 END);
  RETURN jsonb_build_object('item_id',p_item_id,'session_id',bs.session_id,'status',p_status,'fee',p_fee,
    'tuition_delta',delta,'csat_delta',csat_delta,'net_delta',delta-csat_delta,'tuition_before',tuition_before,'tuition_after',tuition_after,
    'previewToken',md5(jsonb_build_array(p_item_id,current_status,current_fee,last_adj.adjustment_id,tuition_before,p_status,p_fee,p_reverse_id)::text));
END $$;

CREATE FUNCTION public.apply_billing_adjustment(p_item_id uuid,p_status public.attendance_status,p_fee numeric,p_reason text,
  p_preview_token text,p_request_id uuid,p_reverse_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb; prior jsonb; preview jsonb; item public.billing_items%ROWTYPE; bs public.billing_sessions%ROWTYPE;
  pid uuid; label_text text; aid uuid;
BEGIN
  PERFORM csat_internal.require_admin();
  payload:=jsonb_build_object('item',p_item_id,'status',p_status,'fee',p_fee,'reason',p_reason,'preview',p_preview_token,'reverse',p_reverse_id);
  prior:=csat_internal.start_operation('adjustment',p_request_id,payload); IF prior IS NOT NULL THEN RETURN prior; END IF;
  preview:=public.preview_billing_adjustment(p_item_id,p_status,p_fee,p_reverse_id);
  IF preview->>'previewToken' IS DISTINCT FROM p_preview_token THEN RAISE EXCEPTION 'Dữ liệu đã thay đổi. Hãy xem trước lại.' USING ERRCODE='40001'; END IF;
  IF length(trim(coalesce(p_reason,'')))=0 THEN RAISE EXCEPTION 'Cần ghi rõ lý do điều chỉnh.' USING ERRCODE='22023'; END IF;
  SELECT * INTO item FROM public.billing_items WHERE item_id=p_item_id;
  SELECT * INTO bs FROM public.billing_sessions WHERE session_id=item.session_id;
  SELECT label INTO label_text FROM public.billing_periods WHERE period_id=bs.period_id;
  SELECT payment_id INTO pid FROM public.payments WHERE class_id=bs.class_id AND student_id=item.student_id AND billing_period=label_text;
  IF pid IS NULL THEN
    -- A previously absent/free student may first acquire a debt through an adjustment.
    INSERT INTO public.payments(student_id,class_id,billing_period,amount,status) VALUES(item.student_id,bs.class_id,label_text,0,'unpaid') RETURNING payment_id INTO pid;
  END IF;
  INSERT INTO public.billing_adjustments(item_id,payment_id,corrected_status,corrected_fee,tuition_delta,csat_delta,net_delta,reason,actor_id,reversal_of)
  VALUES(p_item_id,pid,(preview->>'status')::public.attendance_status,(preview->>'fee')::numeric,
    (preview->>'tuition_delta')::numeric,(preview->>'csat_delta')::numeric,(preview->>'net_delta')::numeric,p_reason,auth.uid(),p_reverse_id)
    RETURNING adjustment_id INTO aid;
  UPDATE public.payments SET status=CASE WHEN csat_internal.payment_balance(pid)<=0 THEN 'paid'::public.payment_status ELSE 'unpaid'::public.payment_status END WHERE payment_id=pid;
  RETURN csat_internal.finish_operation('adjustment',p_request_id,payload,preview||jsonb_build_object('message','Đã ghi nhận khoản điều chỉnh.','adjustment_id',aid,'payment_id',pid,'balance',csat_internal.payment_balance(pid)));
END $$;

CREATE FUNCTION public.tutor_billing_history(p_period text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE tid uuid; periods jsonb;
BEGIN
  tid:=public.current_tutor_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'Tài khoản gia sư không hợp lệ.' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(label ORDER BY label DESC),'[]'::jsonb) INTO periods FROM (
    SELECT DISTINCT billing_period AS label FROM public.sessions WHERE tutor_id_snapshot=tid AND status='completed' AND billing_period IS NOT NULL
  ) q;
  IF p_period IS NULL THEN RETURN jsonb_build_object('periods',periods); END IF;
  RETURN csat_internal.billing_snapshot(NULL,NULL,p_period,tid)||jsonb_build_object('periods',periods);
END $$;
CREATE OR REPLACE FUNCTION public.get_unique_billing_periods() RETURNS TABLE(billing_period text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
  PERFORM csat_internal.require_admin();
  RETURN QUERY SELECT label FROM public.billing_periods ORDER BY coalesce(closed_at,'-infinity'::timestamptz) DESC,label DESC;
END $$;

DO $$ DECLARE t text; f record; BEGIN
  FOREACH t IN ARRAY ARRAY['billing_periods','billing_sessions','billing_items','billing_adjustments','payment_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
    EXECUTE format('CREATE POLICY admin_read ON public.%I FOR SELECT TO authenticated USING(public.is_admin())',t);
    EXECUTE format('CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION csat_internal.immutable_record()',t);
  END LOOP;
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN('billing_report','close_billing_period','record_payment_event',
      'preview_billing_adjustment','apply_billing_adjustment','tutor_billing_history','get_unique_billing_periods') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
  END LOOP;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA csat_internal FROM PUBLIC,anon,authenticated,service_role;
REVOKE INSERT,UPDATE,DELETE ON public.payments FROM authenticated,service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260908_06');
NOTIFY pgrst,'reload schema';
COMMIT;
