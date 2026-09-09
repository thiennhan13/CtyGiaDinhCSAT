-- Existing database upgrade 05–10. Review preflight and backup before execution.
BEGIN;
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='5min';

-- 20260908_05_preserve_history.sql
-- Existing deployments: apply after 20260907_04. No business rows are rewritten.
CREATE SCHEMA IF NOT EXISTS csat_internal;
REVOKE ALL ON SCHEMA csat_internal FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS csat_internal.schema_migrations (
  version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS csat_internal.legacy_payments (
  payment_id uuid PRIMARY KEY, original_row jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO csat_internal.legacy_payments(payment_id,original_row)
SELECT payment_id,to_jsonb(p) FROM public.payments p
WHERE NOT EXISTS (SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260908_05')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.business_audit_events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_table text NOT NULL, entity_id text NOT NULL, operation text NOT NULL,
  actor_id uuid, actor_role text, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  before_data jsonb, after_data jsonb
);
ALTER TABLE public.business_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_audit_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.business_audit_events TO authenticated;
CREATE POLICY business_audit_admin_read ON public.business_audit_events FOR SELECT TO authenticated USING(public.is_admin());
CREATE INDEX business_audit_entity_idx ON public.business_audit_events(entity_table,entity_id,event_id DESC);

CREATE OR REPLACE FUNCTION csat_internal.audit_business_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_data jsonb; new_data jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_data:=to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_data:=to_jsonb(NEW); END IF;
  IF old_data IS NOT DISTINCT FROM new_data THEN RETURN NULL; END IF;
  INSERT INTO public.business_audit_events(entity_table,entity_id,operation,actor_id,actor_role,before_data,after_data)
  VALUES(TG_TABLE_NAME,coalesce(new_data,old_data)->>TG_ARGV[0],TG_OP,auth.uid(),auth.jwt()->>'role',old_data,new_data);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION csat_internal.protect_financial_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid; period_label text;
BEGIN
  IF TG_TABLE_NAME='sessions' THEN
    IF TG_OP <> 'INSERT' AND OLD.billing_period IS NOT NULL THEN
      IF TG_OP='DELETE' OR to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
        RAISE EXCEPTION 'Buổi học đã chốt sổ; dữ liệu gốc được giữ nguyên.' USING ERRCODE='23514';
      END IF;
    END IF;
    IF TG_OP='DELETE' AND (OLD.status <> 'scheduled' OR EXISTS(
      SELECT 1 FROM public.session_attendance a WHERE a.session_id=OLD.session_id)) THEN
      RAISE EXCEPTION 'Không xóa buổi học đã có lịch sử.' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='session_attendance' THEN
    IF TG_OP='UPDATE' AND (NEW.session_id,NEW.student_id) IS DISTINCT FROM (OLD.session_id,OLD.student_id) THEN
      RAISE EXCEPTION 'Không chuyển dòng điểm danh sang buổi hoặc học sinh khác.' USING ERRCODE='23514';
    END IF;
    IF TG_OP='DELETE' THEN sid:=OLD.session_id; ELSE sid:=NEW.session_id; END IF;
    SELECT billing_period INTO period_label FROM public.sessions WHERE session_id=sid FOR UPDATE;
    IF period_label IS NOT NULL THEN
      RAISE EXCEPTION 'Điểm danh đã chốt sổ; hãy lập khoản điều chỉnh.' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='payments' THEN
    IF TG_OP='DELETE' THEN
      RAISE EXCEPTION 'Không xóa chứng từ học phí; hãy giữ lịch sử và lập điều chỉnh.' USING ERRCODE='23514';
    END IF;
    IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['status','paid_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','paid_at']) THEN
      RAISE EXCEPTION 'Không sửa chứng từ học phí gốc.' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DO $$ DECLARE t text; k text; fk record; BEGIN
  FOREACH t IN ARRAY ARRAY['sessions','session_attendance','payments'] LOOP
    EXECUTE format('CREATE TRIGGER protect_financial_history BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION csat_internal.protect_financial_history()',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['sessions','session_attendance','payments','classes','class_students'] LOOP
    k:=CASE t WHEN 'sessions' THEN 'session_id' WHEN 'session_attendance' THEN 'attendance_id' WHEN 'payments' THEN 'payment_id' ELSE 'class_id' END;
    EXECUTE format('CREATE TRIGGER audit_business_write AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write(%L)',t,k);
  END LOOP;
  -- Preserve even unpaid/draft historical relationships. Existing NULL references remain NULL.
  FOR fk IN SELECT c.conname,c.conrelid::regclass AS relation,pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
    WHERE c.contype='f' AND c.confdeltype IN ('c','n') AND n.nspname='public'
      AND r.relname IN ('classes','class_students','sessions','session_attendance','payments','student_reviews','class_change_log')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I, ADD CONSTRAINT %I %s',fk.relation,fk.conname,fk.conname,
      regexp_replace(fk.definition,'ON DELETE (CASCADE|SET NULL)','ON DELETE RESTRICT'));
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.rollback_billing_partial(p_billing_period text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Quyền truy cập bị từ chối.' USING ERRCODE='42501'; END IF;
  RAISE EXCEPTION 'Kỳ đã chốt được giữ nguyên. Không còn hỗ trợ xóa hóa đơn để chốt lại.' USING ERRCODE='23514';
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA csat_internal FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260908_05');
NOTIFY pgrst,'reload schema';

-- 20260908_06_atomic_billing.sql

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

-- 20260908_07_class_workflows.sql

CREATE TABLE public.class_tutor_history (
  history_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes ON DELETE RESTRICT,
  effective_from date NOT NULL, tutor_id uuid NOT NULL REFERENCES public.tutors ON DELETE RESTRICT,
  source text NOT NULL CHECK(source IN ('baseline','change')), reason text NOT NULL,
  actor_id uuid, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.class_fee_history (
  history_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes ON DELETE RESTRICT,
  effective_from date NOT NULL, fee numeric(14,2) NOT NULL CHECK(fee>=0),
  source text NOT NULL CHECK(source IN ('baseline','change')), reason text NOT NULL,
  actor_id uuid, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.student_fee_history (
  history_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students ON DELETE RESTRICT,
  effective_from date NOT NULL, fee numeric(14,2) NOT NULL CHECK(fee>=0),
  source text NOT NULL CHECK(source IN ('baseline','change')), reason text NOT NULL,
  actor_id uuid, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.class_enrollments (
  enrollment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students ON DELETE RESTRICT,
  joined_on date, left_on date, source text NOT NULL CHECK(source IN ('baseline','enrollment')),
  observed_at timestamptz NOT NULL DEFAULT clock_timestamp(), actor_id uuid,
  CHECK(left_on IS NULL OR joined_on IS NULL OR left_on>=joined_on)
);
CREATE INDEX class_tutor_history_date_idx ON public.class_tutor_history(class_id,effective_from DESC,history_id DESC);
CREATE INDEX class_fee_history_date_idx ON public.class_fee_history(class_id,effective_from DESC,history_id DESC);
CREATE INDEX student_fee_history_date_idx ON public.student_fee_history(class_id,student_id,effective_from DESC,history_id DESC);
CREATE UNIQUE INDEX class_enrollments_open_idx ON public.class_enrollments(class_id,student_id) WHERE left_on IS NULL;
INSERT INTO public.class_tutor_history(class_id,effective_from,tutor_id,source,reason)
SELECT class_id,(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,tutor_id,'baseline','Giá trị quan sát tại mốc nâng cấp; không suy diễn lịch sử.'
FROM public.classes WHERE tutor_id IS NOT NULL;
INSERT INTO public.class_fee_history(class_id,effective_from,fee,source,reason)
SELECT class_id,(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,csat_fee_per_session,'baseline','Giá trị quan sát tại mốc nâng cấp; không suy diễn lịch sử.' FROM public.classes;
INSERT INTO public.student_fee_history(class_id,student_id,effective_from,fee,source,reason)
SELECT class_id,student_id,(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,tuition_fee_per_session,'baseline','Giá trị quan sát tại mốc nâng cấp; không suy diễn lịch sử.' FROM public.class_students;
INSERT INTO public.class_enrollments(class_id,student_id,source)
SELECT class_id,student_id,'baseline' FROM public.class_students WHERE status='active';


-- Explicit evidence for old sessions; these records never invent attendance or rewrite closed periods.
CREATE TABLE public.session_roster_verifications (
 verification_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id uuid NOT NULL REFERENCES public.sessions ON DELETE RESTRICT,
 student_ids uuid[] NOT NULL CHECK(cardinality(student_ids)>0),
 reason text NOT NULL CHECK(length(trim(reason))>0), actor_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.attendance_fee_verifications (
 verification_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id uuid NOT NULL REFERENCES public.sessions ON DELETE RESTRICT,
 student_id uuid NOT NULL REFERENCES public.students ON DELETE RESTRICT,
 fee numeric(14,2) NOT NULL CHECK(fee>=0), reason text NOT NULL CHECK(length(trim(reason))>0),
 actor_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX session_roster_verification_idx ON public.session_roster_verifications(session_id,verification_id DESC);
CREATE INDEX attendance_fee_verification_idx ON public.attendance_fee_verifications(session_id,student_id,verification_id DESC);
CREATE FUNCTION csat_internal.session_roster(sid uuid) RETURNS TABLE(student_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH verified AS (SELECT student_ids FROM public.session_roster_verifications WHERE session_id=sid ORDER BY verification_id DESC LIMIT 1)
 SELECT unnest(student_ids) FROM verified
 UNION
 SELECT e.student_id FROM public.sessions s JOIN public.class_enrollments e USING(class_id)
 WHERE s.session_id=sid AND s.billing_period IS NULL AND (NOT EXISTS(SELECT 1 FROM verified) OR e.joined_on IS NOT NULL OR s.date>=(e.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
 AND (e.joined_on IS NULL OR e.joined_on<=s.date) AND (e.left_on IS NULL OR s.date<=e.left_on)
 UNION SELECT a.student_id FROM public.session_attendance a WHERE a.session_id=sid;
$$;
CREATE FUNCTION csat_internal.assert_attendance_complete(sid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.sessions%ROWTYPE;
BEGIN
 SELECT * INTO s FROM public.sessions WHERE session_id=sid;
 IF EXISTS(SELECT 1 FROM public.class_fee_history h WHERE h.class_id=s.class_id AND h.source='baseline' AND s.date<h.effective_from)
 AND NOT EXISTS(SELECT 1 FROM public.session_roster_verifications v WHERE v.session_id=sid) THEN
  RAISE EXCEPTION 'Buổi % cần admin xác minh đầy đủ danh sách học sinh tại ngày học trước khi chốt.',sid USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.session_roster(sid) r WHERE NOT EXISTS(
  SELECT 1 FROM public.session_attendance a WHERE a.session_id=sid AND a.student_id=r.student_id AND a.status IN ('attended','absent'))) THEN
  RAISE EXCEPTION 'Buổi % còn học sinh chưa được điểm danh; không được chốt sổ.',sid USING ERRCODE='22023';
 END IF;
END $$;

CREATE FUNCTION csat_internal.tutor_on(cid uuid,on_date date) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT tutor_id FROM public.class_tutor_history WHERE class_id=cid AND effective_from<=on_date ORDER BY effective_from DESC,history_id DESC LIMIT 1;
$$;
CREATE FUNCTION csat_internal.csat_on(cid uuid,on_date date) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT fee FROM public.class_fee_history WHERE class_id=cid AND effective_from<=on_date ORDER BY effective_from DESC,history_id DESC LIMIT 1;
$$;
CREATE FUNCTION csat_internal.tuition_on(cid uuid,sid uuid,on_date date) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT fee FROM public.student_fee_history WHERE class_id=cid AND student_id=sid AND effective_from<=on_date ORDER BY effective_from DESC,history_id DESC LIMIT 1;
$$;
CREATE FUNCTION public.is_current_class_tutor(p_class_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(public.current_tutor_id()=csat_internal.tutor_on(p_class_id,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),false);
$$;
CREATE FUNCTION public.current_class_terms(p_class_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF public.is_admin() IS NOT TRUE AND NOT public.is_current_class_tutor(p_class_id) THEN RAISE EXCEPTION 'Không có quyền truy cập lớp.' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('tutor_id',csat_internal.tutor_on(p_class_id,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
   'csat_fee_per_session',csat_internal.csat_on(p_class_id,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date));
END $$;

CREATE FUNCTION csat_internal.check_session_slot(cid uuid,tid uuid,d date,st time,et time,exclude_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.classes%ROWTYPE;
BEGIN
 SELECT * INTO c FROM public.classes WHERE class_id=cid;
 IF NOT FOUND OR c.status<>'active' THEN RAISE EXCEPTION 'Lớp không hoạt động; cần admin mở lại trước khi xếp lịch.' USING ERRCODE='22023'; END IF;
 IF d IS NULL OR st IS NULL OR et IS NULL OR et<=st THEN RAISE EXCEPTION 'Buổi học phải bắt đầu và kết thúc trong cùng ngày, giờ kết thúc lớn hơn giờ bắt đầu.' USING ERRCODE='22023'; END IF;
 IF c.start_date IS NULL OR c.end_date IS NULL OR d<c.start_date OR d>c.end_date THEN RAISE EXCEPTION 'Ngày học ngoài thời hạn lớp. Admin cần cập nhật thời hạn.' USING ERRCODE='22023'; END IF;
 IF tid IS NULL OR NOT EXISTS(SELECT 1 FROM public.tutors WHERE tutor_id=tid AND status='active' AND is_deleted IS NOT TRUE) THEN
   RAISE EXCEPTION 'Chưa có phân công gia sư hợp lệ tại ngày học.' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.sessions s WHERE s.session_id IS DISTINCT FROM exclude_id AND s.status<>'cancelled'
   AND s.date=d AND (s.class_id=cid OR s.tutor_id_snapshot=tid) AND s.start_time<et AND s.end_time>st) THEN
   RAISE EXCEPTION 'Lịch trùng hoặc giao nhau với lịch của lớp/gia sư vào % (% - %).',d,st,et USING ERRCODE='23505';
 END IF;
END $$;
CREATE FUNCTION csat_internal.add_sessions(cid uuid,spec jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE x jsonb; tid uuid; fee numeric; n integer:=0; d date; st time; et time;
BEGIN
 IF jsonb_typeof(spec) IS DISTINCT FROM 'array' OR jsonb_array_length(spec)=0 THEN RAISE EXCEPTION 'Cần ít nhất một buổi học.' USING ERRCODE='22023'; END IF;
 FOR x IN SELECT * FROM jsonb_array_elements(spec) LOOP
   d:=(x->>'date')::date;st:=(x->>'start_time')::time;et:=(x->>'end_time')::time;
   tid:=csat_internal.tutor_on(cid,d);fee:=csat_internal.csat_on(cid,d);
   IF fee IS NULL THEN RAISE EXCEPTION 'Chưa xác minh phí CSAT tại ngày học.' USING ERRCODE='22023'; END IF;
   PERFORM csat_internal.check_session_slot(cid,tid,d,st,et);
   INSERT INTO public.sessions(class_id,date,start_time,end_time,status,tutor_id_snapshot,csat_fee_snapshot)
   VALUES(cid,d,st,et,'scheduled',tid,fee);n:=n+1;
 END LOOP;
 RETURN n;
END $$;

CREATE FUNCTION public.manage_class(p_action text,p_class_id uuid,p_data jsonb,p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior jsonb; payload jsonb; c public.classes%ROWTYPE; s public.sessions%ROWTYPE;
  cid uuid:=p_class_id; tid uuid; student uuid; n integer:=0; x jsonb; specs jsonb;
  effective date; today date:=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  fee numeric; reason text; result jsonb; new_status text; sid uuid;
BEGIN
 IF auth.uid() IS NULL OR (public.is_admin() IS NOT TRUE AND public.current_tutor_id() IS NULL) THEN RAISE EXCEPTION 'Không có quyền thực hiện thao tác.' USING ERRCODE='42501'; END IF;
 payload:=jsonb_build_object('action',p_action,'class_id',cid,'data',p_data);
 prior:=csat_internal.start_operation('class_workflow',p_request_id,payload);IF prior IS NOT NULL THEN RETURN prior;END IF;
 IF p_action<>'create' THEN
   SELECT * INTO c FROM public.classes WHERE class_id=cid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy lớp.' USING ERRCODE='P0002'; END IF;
   IF public.is_admin() IS NOT TRUE AND (NOT public.is_current_class_tutor(cid) OR p_action NOT IN ('add_sessions','cancel_sessions')) THEN
     RAISE EXCEPTION 'Thao tác này cần admin hoặc gia sư phụ trách phù hợp.' USING ERRCODE='42501'; END IF;
 ELSE PERFORM csat_internal.require_admin(); END IF;
 reason:=coalesce(nullif(trim(p_data->>'reason'),''),nullif(trim(p_data->>'notes'),''),'Cập nhật nghiệp vụ');
 effective:=coalesce((p_data->>'effective_date')::date,today);
 IF p_action IN ('change_tutor','update_csat_fee','update_student_fee') AND effective<today THEN
   RAISE EXCEPTION 'Không áp giá/phân công mới ngược về quá khứ. Buổi cũ cần xác minh riêng.' USING ERRCODE='22023'; END IF;

 CASE p_action
 WHEN 'create' THEN
   tid:=(p_data->>'tutor_id')::uuid;fee:=(p_data->>'csat_fee_per_session')::numeric;
   IF length(trim(coalesce(p_data->>'name','')))<2 OR fee IS NULL OR fee<0 OR fee<>round(fee,2) OR
      p_data->>'start_date' IS NULL OR p_data->>'end_date' IS NULL OR (p_data->>'end_date')::date<(p_data->>'start_date')::date THEN
     RAISE EXCEPTION 'Thông tin lớp hoặc thời hạn không hợp lệ.' USING ERRCODE='22023'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.tutors WHERE tutor_id=tid AND status='active' AND is_deleted IS NOT TRUE) THEN RAISE EXCEPTION 'Gia sư không hoạt động.' USING ERRCODE='22023'; END IF;
   INSERT INTO public.classes(name,class_type,tutor_id,csat_fee_per_session,start_date,end_date)
   VALUES(p_data->>'name',p_data->>'class_type',tid,fee,(p_data->>'start_date')::date,(p_data->>'end_date')::date) RETURNING class_id INTO cid;
   INSERT INTO public.class_tutor_history(class_id,effective_from,tutor_id,source,reason,actor_id) VALUES(cid,least(today,(p_data->>'start_date')::date),tid,'change','Thiết lập lớp mới',auth.uid());
   INSERT INTO public.class_fee_history(class_id,effective_from,fee,source,reason,actor_id) VALUES(cid,least(today,(p_data->>'start_date')::date),fee,'change','Thiết lập lớp mới',auth.uid());
   FOR x IN SELECT * FROM jsonb_array_elements(coalesce(p_data->'students','[]')) LOOP
     student:=(x->>'student_id')::uuid;fee:=(x->>'tuition_fee_per_session')::numeric;
     IF fee IS NULL OR fee<0 OR fee<>round(fee,2) THEN RAISE EXCEPTION 'Đơn giá không hợp lệ.' USING ERRCODE='22023'; END IF;
     INSERT INTO public.class_students(class_id,student_id,tuition_fee_per_session) VALUES(cid,student,fee);
     INSERT INTO public.student_fee_history(class_id,student_id,effective_from,fee,source,reason,actor_id) VALUES(cid,student,least(today,(p_data->>'start_date')::date),fee,'change','Thiết lập lớp mới',auth.uid());
     INSERT INTO public.class_enrollments(class_id,student_id,joined_on,source,actor_id) VALUES(cid,student,least(today,(p_data->>'start_date')::date),'enrollment',auth.uid());
   END LOOP;
   IF jsonb_array_length(coalesce(p_data->'sessions','[]'))>0 THEN n:=csat_internal.add_sessions(cid,p_data->'sessions'); END IF;
 WHEN 'add_sessions' THEN
   n:=csat_internal.add_sessions(cid,p_data->'sessions');
 WHEN 'extend' THEN
   IF (p_data->>'start_date')::date IS NULL OR (p_data->>'end_date')::date IS NULL OR (p_data->>'end_date')::date<(p_data->>'start_date')::date THEN
     RAISE EXCEPTION 'Thời hạn gia hạn không hợp lệ.' USING ERRCODE='22023'; END IF;
   UPDATE public.classes SET start_date=least(start_date,(p_data->>'start_date')::date),end_date=greatest(end_date,(p_data->>'end_date')::date) WHERE class_id=cid;
   IF p_data ? 'sessions' THEN specs:=p_data->'sessions'; ELSE
     SELECT coalesce(jsonb_agg(jsonb_build_object('date',d::date,'start_time',cfg->>'start_time','end_time',cfg->>'end_time') ORDER BY d,cfg->>'start_time'),'[]') INTO specs
     FROM generate_series((p_data->>'start_date')::date,(p_data->>'end_date')::date,'1 day') d
     CROSS JOIN jsonb_array_elements(p_data->'schedule_configs') cfg WHERE extract(dow FROM d)::int=(cfg->>'dayOfWeek')::int;
   END IF;
   n:=csat_internal.add_sessions(cid,specs);
 WHEN 'edit_session' THEN
   SELECT * INTO s FROM public.sessions WHERE session_id=(p_data->>'session_id')::uuid AND class_id=cid FOR UPDATE;
   IF NOT FOUND OR s.billing_period IS NOT NULL OR s.status<>'scheduled' OR EXISTS(SELECT 1 FROM public.session_attendance WHERE session_id=s.session_id) THEN
     RAISE EXCEPTION 'Chỉ được dời lịch chưa học, chưa có điểm danh.' USING ERRCODE='23514'; END IF;
   tid:=csat_internal.tutor_on(cid,(p_data->>'date')::date);fee:=csat_internal.csat_on(cid,(p_data->>'date')::date);
   IF fee IS NULL THEN RAISE EXCEPTION 'Chưa xác minh phí CSAT tại ngày học.' USING ERRCODE='22023'; END IF;
   PERFORM csat_internal.check_session_slot(cid,tid,(p_data->>'date')::date,(p_data->>'start_time')::time,(p_data->>'end_time')::time,s.session_id);
   UPDATE public.sessions SET date=(p_data->>'date')::date,start_time=(p_data->>'start_time')::time,end_time=(p_data->>'end_time')::time,
     tutor_id_snapshot=tid,csat_fee_snapshot=fee WHERE session_id=s.session_id;n:=1;
 WHEN 'cancel_sessions' THEN
   IF jsonb_typeof(p_data->'session_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(p_data->'session_ids')=0 THEN RAISE EXCEPTION 'Cần chọn buổi học.' USING ERRCODE='22023'; END IF;
   FOR x IN SELECT * FROM jsonb_array_elements(p_data->'session_ids') LOOP
     sid:=(x#>>'{}')::uuid;
     SELECT * INTO s FROM public.sessions WHERE session_id=sid AND class_id=cid FOR UPDATE;
     IF NOT FOUND OR s.billing_period IS NOT NULL OR s.status='completed' OR EXISTS(SELECT 1 FROM public.session_attendance WHERE session_id=sid) THEN
       RAISE EXCEPTION 'Không thể hủy buổi đã học, đã chốt hoặc không thuộc lớp.' USING ERRCODE='23514'; END IF;
     UPDATE public.sessions SET status='cancelled' WHERE session_id=sid;n:=n+1;
   END LOOP;
 WHEN 'set_status' THEN
   new_status:=p_data->>'status';
   IF new_status IS NULL OR new_status NOT IN ('active','inactive','archived') THEN RAISE EXCEPTION 'Trạng thái lớp không hợp lệ.' USING ERRCODE='22023'; END IF;
   UPDATE public.classes SET status=new_status WHERE class_id=cid;
   IF new_status IN ('inactive','archived') THEN
     UPDATE public.sessions SET status='cancelled' WHERE class_id=cid AND status='scheduled' AND billing_period IS NULL
       AND (date+start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'>=clock_timestamp()
       AND NOT EXISTS(SELECT 1 FROM public.session_attendance a WHERE a.session_id=sessions.session_id);
     GET DIAGNOSTICS n=ROW_COUNT;
   END IF;
   IF new_status='archived' THEN
     UPDATE public.class_students SET status='dropped' WHERE class_id=cid AND status='active';
     UPDATE public.class_enrollments SET left_on=today WHERE class_id=cid AND left_on IS NULL;
   END IF;
 WHEN 'enroll' THEN
   student:=(p_data->>'student_id')::uuid;fee:=(p_data->>'tuition_fee_per_session')::numeric;
   IF c.status<>'active' OR fee IS NULL OR fee<0 OR fee<>round(fee,2) THEN RAISE EXCEPTION 'Lớp hoặc học phí không hợp lệ.' USING ERRCODE='22023'; END IF;
   IF EXISTS(SELECT 1 FROM public.class_students WHERE class_id=cid AND student_id=student AND status='active') THEN
     RAISE EXCEPTION 'Học sinh đã tham gia lớp; đổi học phí qua thao tác riêng.' USING ERRCODE='23505'; END IF;
   INSERT INTO public.class_students(class_id,student_id,tuition_fee_per_session,status) VALUES(cid,student,fee,'active')
     ON CONFLICT(class_id,student_id) DO UPDATE SET status='active',tuition_fee_per_session=EXCLUDED.tuition_fee_per_session;
   INSERT INTO public.class_enrollments(class_id,student_id,joined_on,source,actor_id) VALUES(cid,student,today,'enrollment',auth.uid());
   INSERT INTO public.student_fee_history(class_id,student_id,effective_from,fee,source,reason,actor_id) VALUES(cid,student,today,fee,'change',reason,auth.uid());
 WHEN 'drop_student' THEN
   student:=(p_data->>'student_id')::uuid;
   UPDATE public.class_students SET status='dropped' WHERE class_id=cid AND student_id=student;
   IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy học sinh trong lớp.' USING ERRCODE='P0002'; END IF;
   UPDATE public.class_enrollments SET left_on=today WHERE class_id=cid AND student_id=student AND left_on IS NULL;
 WHEN 'change_tutor' THEN
   tid:=(p_data->>'new_tutor_id')::uuid;
   IF NOT EXISTS(SELECT 1 FROM public.tutors WHERE tutor_id=tid AND status='active' AND is_deleted IS NOT TRUE) THEN RAISE EXCEPTION 'Gia sư không hoạt động.' USING ERRCODE='22023'; END IF;
   INSERT INTO public.class_tutor_history(class_id,effective_from,tutor_id,source,reason,actor_id) VALUES(cid,effective,tid,'change',reason,auth.uid());
   FOR s IN SELECT * FROM public.sessions WHERE class_id=cid AND status='scheduled' AND billing_period IS NULL AND date>=effective ORDER BY session_id LOOP
     tid:=csat_internal.tutor_on(cid,s.date);
     PERFORM csat_internal.check_session_slot(cid,tid,s.date,s.start_time,s.end_time,s.session_id);
     UPDATE public.sessions SET tutor_id_snapshot=tid WHERE session_id=s.session_id;n:=n+1;
   END LOOP;
   UPDATE public.classes SET tutor_id=csat_internal.tutor_on(cid,today) WHERE class_id=cid;
 WHEN 'update_csat_fee' THEN
   fee:=(p_data->>'new_csat_fee')::numeric;
   IF fee IS NULL OR fee<0 OR fee<>round(fee,2) THEN RAISE EXCEPTION 'Phí CSAT không hợp lệ.' USING ERRCODE='22023'; END IF;
   INSERT INTO public.class_fee_history(class_id,effective_from,fee,source,reason,actor_id) VALUES(cid,effective,fee,'change',reason,auth.uid());
   UPDATE public.sessions SET csat_fee_snapshot=csat_internal.csat_on(cid,date) WHERE class_id=cid AND status='scheduled' AND billing_period IS NULL AND date>=effective;
   GET DIAGNOSTICS n=ROW_COUNT;
   UPDATE public.classes SET csat_fee_per_session=csat_internal.csat_on(cid,today) WHERE class_id=cid;
 WHEN 'update_student_fee' THEN
   student:=(p_data->>'student_id')::uuid;fee:=(p_data->>'new_fee')::numeric;
   IF fee IS NULL OR fee<0 OR fee<>round(fee,2) OR NOT EXISTS(SELECT 1 FROM public.class_students WHERE class_id=cid AND student_id=student) THEN RAISE EXCEPTION 'Học sinh hoặc học phí không hợp lệ.' USING ERRCODE='22023'; END IF;
   INSERT INTO public.student_fee_history(class_id,student_id,effective_from,fee,source,reason,actor_id) VALUES(cid,student,effective,fee,'change',reason,auth.uid());
   UPDATE public.class_students SET tuition_fee_per_session=csat_internal.tuition_on(cid,student,today) WHERE class_id=cid AND student_id=student;
 WHEN 'verify_session_roster' THEN
   sid:=(p_data->>'session_id')::uuid;
   SELECT * INTO s FROM public.sessions WHERE session_id=sid AND class_id=cid FOR UPDATE;
   IF NOT FOUND OR s.billing_period IS NOT NULL OR s.status='cancelled'
    OR s.date IS NULL OR s.start_time IS NULL OR s.end_time IS NULL OR s.end_time<=s.start_time OR (s.date+s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'>clock_timestamp()
    OR length(trim(coalesce(p_data->>'reason','')))=0
    OR jsonb_typeof(p_data->'student_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(p_data->'student_ids')=0 THEN
    RAISE EXCEPTION 'Cần buổi đã kết thúc, chưa chốt, danh sách đầy đủ và căn cứ xác minh.' USING ERRCODE='22023';
   END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_data->'student_ids') v WHERE NOT EXISTS(
      SELECT 1 FROM public.class_students cs WHERE cs.class_id=cid AND cs.student_id=v::uuid))
    OR EXISTS(SELECT 1 FROM public.session_attendance a WHERE a.session_id=sid AND NOT (p_data->'student_ids' ? a.student_id::text))
    OR EXISTS(SELECT 1 FROM public.class_enrollments e WHERE e.class_id=cid AND e.joined_on IS NOT NULL AND e.joined_on<=s.date
      AND (e.left_on IS NULL OR s.date<=e.left_on) AND NOT(p_data->'student_ids' ? e.student_id::text))
    OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_data->'student_ids') v GROUP BY v HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Danh sách trùng, ngoài lớp hoặc bỏ sót học sinh đã có căn cứ tham gia.' USING ERRCODE='22023';
   END IF;
   INSERT INTO public.session_roster_verifications(session_id,student_ids,reason,actor_id)
   SELECT sid,array_agg(v::uuid ORDER BY v),p_data->>'reason',auth.uid() FROM jsonb_array_elements_text(p_data->'student_ids') v;
 WHEN 'verify_attendance_fee' THEN
   student:=(p_data->>'student_id')::uuid;fee:=(p_data->>'fee')::numeric;sid:=(p_data->>'session_id')::uuid;
   SELECT * INTO s FROM public.sessions WHERE session_id=sid AND class_id=cid FOR UPDATE;
   IF NOT FOUND OR s.billing_period IS NOT NULL OR s.status='cancelled' OR fee IS NULL OR fee<0 OR fee>=100000000 OR fee<>round(fee,2)
      OR s.end_time<=s.start_time OR (s.date+s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'>clock_timestamp()
      OR length(trim(coalesce(p_data->>'reason','')))=0 THEN
     RAISE EXCEPTION 'Cần buổi đã kết thúc, chưa chốt, đơn giá hợp lệ và lý do xác minh.' USING ERRCODE='22023'; END IF;
   IF NOT EXISTS(SELECT 1 FROM csat_internal.session_roster(sid) r WHERE r.student_id=student) THEN
    RAISE EXCEPTION 'Cần xác minh học sinh thuộc danh sách tại ngày học trước khi xác minh phí.' USING ERRCODE='22023';
   END IF;
   INSERT INTO public.attendance_fee_verifications(session_id,student_id,fee,reason,actor_id)
   VALUES(sid,student,fee,p_data->>'reason',auth.uid());
   UPDATE public.session_attendance SET tuition_fee_snapshot=fee,notes=coalesce(notes,'')||E'\nXác minh đơn giá: '||(p_data->>'reason')
     WHERE session_id=sid AND student_id=student;
   -- A missing attendance row remains missing until an explicit attendance submission.
 WHEN 'rename_class' THEN
   IF length(trim(coalesce(p_data->>'new_name','')))<2 THEN RAISE EXCEPTION 'Tên lớp không hợp lệ.' USING ERRCODE='22023'; END IF;
   UPDATE public.classes SET name=p_data->>'new_name' WHERE class_id=cid;
 WHEN 'delete_empty' THEN
   RAISE EXCEPTION 'Lớp học được giữ lịch sử. Hãy lưu trữ/kết thúc lớp thay vì xóa.' USING ERRCODE='23514';
 ELSE RAISE EXCEPTION 'Thao tác không được hỗ trợ.' USING ERRCODE='22023';
 END CASE;
 result:=jsonb_build_object('message','Đã cập nhật thành công.','class_id',cid,'affected_sessions',n);
 RETURN csat_internal.finish_operation('class_workflow',p_request_id,payload,result);
END $$;

-- Replace the old attendance function instead of trusting client-supplied prices or current fees.
CREATE OR REPLACE FUNCTION public.take_attendance_safe(p_session_id uuid,p_attendance_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.sessions%ROWTYPE; x jsonb; student uuid; fee numeric; tid uuid:=public.current_tutor_id();
BEGIN
 IF auth.uid() IS NULL OR (public.is_admin() IS NOT TRUE AND tid IS NULL) THEN RAISE EXCEPTION 'Không có quyền điểm danh.' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(20260908,1);
 SELECT * INTO s FROM public.sessions WHERE session_id=p_session_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy buổi học.' USING ERRCODE='P0002'; END IF;
 IF public.is_admin() IS NOT TRUE AND (NOT public.is_current_class_tutor(s.class_id) OR s.tutor_id_snapshot IS DISTINCT FROM tid) THEN
   RAISE EXCEPTION 'Bạn không phụ trách buổi học này.' USING ERRCODE='42501'; END IF;
 IF s.billing_period IS NOT NULL THEN RAISE EXCEPTION 'Buổi đã chốt sổ; hãy lập khoản điều chỉnh.' USING ERRCODE='23514'; END IF;
 IF s.status='cancelled' OR s.end_time<=s.start_time OR (s.date+s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'>clock_timestamp() THEN RAISE EXCEPTION 'Buổi đã hủy hoặc chưa kết thúc.' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_attendance_data) IS DISTINCT FROM 'array' OR jsonb_array_length(p_attendance_data)=0 THEN RAISE EXCEPTION 'Cần danh sách điểm danh.' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_attendance_data) AS entry(value) GROUP BY entry.value->>'student_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Học sinh bị lặp.' USING ERRCODE='22023'; END IF;
 FOR x IN SELECT * FROM jsonb_array_elements(p_attendance_data) LOOP
   student:=(x->>'student_id')::uuid;
   IF student IS NULL OR (x->>'status' IN ('attended','absent')) IS NOT TRUE THEN RAISE EXCEPTION 'Dữ liệu điểm danh không hợp lệ.' USING ERRCODE='22023'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.class_students WHERE class_id=s.class_id AND student_id=student) AND
     NOT EXISTS(SELECT 1 FROM public.session_attendance WHERE session_id=p_session_id AND student_id=student) THEN
     RAISE EXCEPTION 'Học sinh không thuộc lớp.' USING ERRCODE='42501'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.session_attendance WHERE session_id=p_session_id AND student_id=student)
     AND NOT EXISTS(SELECT 1 FROM csat_internal.session_roster(p_session_id) r WHERE r.student_id=student) THEN
     RAISE EXCEPTION 'Học sinh không tham gia lớp tại ngày học này; cần admin đối soát lịch sử.' USING ERRCODE='22023'; END IF;
   SELECT tuition_fee_snapshot INTO fee FROM public.session_attendance WHERE session_id=p_session_id AND student_id=student;
   fee:=coalesce(fee,(SELECT v.fee FROM public.attendance_fee_verifications v WHERE v.session_id=p_session_id AND v.student_id=student ORDER BY v.verification_id DESC LIMIT 1),csat_internal.tuition_on(s.class_id,student,s.date));
   IF fee IS NULL THEN RAISE EXCEPTION 'Chưa xác minh đơn giá tại ngày học. Admin cần xác minh riêng buổi cũ.' USING ERRCODE='22023'; END IF;
   INSERT INTO public.session_attendance(session_id,student_id,status,tuition_fee_snapshot,notes)
   VALUES(p_session_id,student,(x->>'status')::public.attendance_status,fee,x->>'notes')
   ON CONFLICT(session_id,student_id) DO UPDATE SET status=EXCLUDED.status,notes=EXCLUDED.notes;
 END LOOP;
 UPDATE public.sessions SET status='completed' WHERE session_id=p_session_id;
 RETURN jsonb_build_object('message','Điểm danh thành công.','records_processed',jsonb_array_length(p_attendance_data));
END $$;

CREATE OR REPLACE FUNCTION public.close_billing_period(p_start_date date,p_end_date date,p_label text,p_preview_token text,
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
    PERFORM csat_internal.assert_attendance_complete(r.session_id);
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

-- Ownership follows effective dates, without giving former tutors current editing rights.
DO $$ DECLARE pol record; expr text; chk text; BEGIN
 FOR pol IN SELECT * FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'Tutor_%' LOOP
   expr:=replace(pol.qual,'(c.tutor_id = current_tutor_id())','is_current_class_tutor(c.class_id)');
   chk:=replace(pol.with_check,'(c.tutor_id = current_tutor_id())','is_current_class_tutor(c.class_id)');
   IF pol.tablename='classes' AND pol.cmd='SELECT' THEN expr:='public.is_current_class_tutor(class_id)'; END IF;
   IF expr IS DISTINCT FROM pol.qual OR chk IS DISTINCT FROM pol.with_check THEN
     EXECUTE format('ALTER POLICY %I ON public.%I %s %s',pol.policyname,pol.tablename,
       CASE WHEN expr IS NULL THEN '' ELSE 'USING ('||expr||')' END,CASE WHEN chk IS NULL THEN '' ELSE 'WITH CHECK ('||chk||')' END);
   END IF;
 END LOOP;
END $$;

DO $$ DECLARE t text; f record; BEGIN
 FOREACH t IN ARRAY ARRAY['class_tutor_history','class_fee_history','student_fee_history','class_enrollments','session_roster_verifications','attendance_fee_verifications'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
   EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
   EXECUTE format('CREATE POLICY admin_read ON public.%I FOR SELECT TO authenticated USING(public.is_admin())',t);
   EXECUTE format('CREATE TRIGGER audit_business_write AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write(%L)',t,CASE WHEN t='class_enrollments' THEN 'enrollment_id' WHEN t IN ('session_roster_verifications','attendance_fee_verifications') THEN 'verification_id' ELSE 'class_id' END);
   IF t<>'class_enrollments' THEN
     EXECUTE format('CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION csat_internal.immutable_record()',t);
   END IF;
 END LOOP;
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN('manage_class','is_current_class_tutor','current_class_terms','take_attendance_safe') LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
 END LOOP;
 -- Retire the earlier RPCs that can overwrite current terms or historical snapshots.
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN('create_class_full','change_tutor_safe','update_csat_fee_safe') LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
 END LOOP;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA csat_internal FROM PUBLIC,anon,authenticated,service_role;
REVOKE INSERT,UPDATE,DELETE ON public.sessions,public.session_attendance,public.class_students,public.classes FROM authenticated,service_role;
ALTER TABLE public.classes ADD CONSTRAINT classes_fee_nonnegative CHECK(csat_fee_per_session>=0);
ALTER TABLE public.class_students ADD CONSTRAINT enrollment_fee_nonnegative CHECK(tuition_fee_per_session>=0);
ALTER TABLE public.payments ADD CONSTRAINT payment_amount_nonnegative CHECK(amount>=0);
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260908_07');
NOTIFY pgrst,'reload schema';

-- 20260908_08_read_models.sql

ALTER TABLE public.classes ALTER COLUMN class_type TYPE text;
CREATE FUNCTION public.payment_accounts(p_student_id uuid DEFAULT NULL,p_payment_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM csat_internal.require_admin();
 SELECT coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('classes',jsonb_build_object('name',c.name),
   'students',jsonb_build_object('name',s.name),'balance',csat_internal.payment_balance(p.payment_id),
   'adjustment_amount',coalesce((SELECT sum(a.tuition_delta) FROM public.billing_adjustments a WHERE a.payment_id=p.payment_id),0),
   'events',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.occurred_at DESC) FROM public.payment_events e WHERE e.payment_id=p.payment_id),'[]'::jsonb))
   ORDER BY p.created_at DESC,p.payment_id),'[]') INTO result
 FROM public.payments p LEFT JOIN public.classes c USING(class_id) LEFT JOIN public.students s USING(student_id)
 WHERE (p_student_id IS NULL OR p.student_id=p_student_id) AND (p_payment_id IS NULL OR p.payment_id=p_payment_id);
 RETURN result;
END $$;
CREATE FUNCTION public.current_student_fee(p_class_id uuid,p_student_id uuid) RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF public.is_admin() IS NOT TRUE AND NOT public.is_current_class_tutor(p_class_id) THEN RAISE EXCEPTION 'Không có quyền truy cập lớp.' USING ERRCODE='42501'; END IF;
 RETURN csat_internal.tuition_on(p_class_id,p_student_id,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
END $$;
CREATE VIEW public.class_current_state WITH(security_invoker=true,security_barrier=true) AS
 SELECT c.class_id,(public.current_class_terms(c.class_id)->>'tutor_id')::uuid AS tutor_id,c.name,c.start_date,c.end_date,c.status,c.class_type,
   (public.current_class_terms(c.class_id)->>'csat_fee_per_session')::numeric AS csat_fee_per_session,c.created_at FROM public.classes c;
CREATE VIEW public.class_students_current WITH(security_invoker=true,security_barrier=true) AS
 SELECT cs.class_id,cs.student_id,public.current_student_fee(cs.class_id,cs.student_id) AS tuition_fee_per_session,cs.status,cs.created_at
 FROM public.class_students cs;
-- Computed relationships preserve existing Supabase select('classes(...), tutors(...)') shapes.
CREATE FUNCTION public.tutors(public.class_current_state) RETURNS SETOF public.tutors
LANGUAGE sql STABLE SECURITY INVOKER ROWS 1 SET search_path='' AS $$ SELECT * FROM public.tutors WHERE tutor_id=$1.tutor_id $$;
CREATE FUNCTION public.classes(public.class_students_current) RETURNS SETOF public.class_current_state
LANGUAGE sql STABLE SECURITY INVOKER ROWS 1 SET search_path='' AS $$ SELECT * FROM public.class_current_state WHERE class_id=$1.class_id $$;
CREATE FUNCTION public.students(public.class_students_current) RETURNS SETOF public.students
LANGUAGE sql STABLE SECURITY INVOKER ROWS 1 SET search_path='' AS $$ SELECT * FROM public.students WHERE student_id=$1.student_id $$;


CREATE VIEW csat_internal.effective_attendance AS
 SELECT a.attendance_id,a.session_id,a.student_id,coalesce(x.corrected_status,a.status) AS status,
 coalesce(x.corrected_fee,a.tuition_fee_snapshot) AS tuition_fee_snapshot,a.notes,a.status AS original_status,x.adjustment_id
 FROM public.session_attendance a LEFT JOIN public.billing_items i USING(attendance_id)
 LEFT JOIN LATERAL(SELECT b.corrected_status,b.corrected_fee,b.adjustment_id FROM public.billing_adjustments b
 WHERE b.item_id=i.item_id ORDER BY b.created_at DESC,b.adjustment_id DESC LIMIT 1) x ON true;
CREATE FUNCTION public.attendance_effective_values(p_attendance_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE cid uuid;
BEGIN
 SELECT s.class_id INTO cid FROM public.session_attendance a JOIN public.sessions s USING(session_id) WHERE a.attendance_id=p_attendance_id;
 IF auth.uid() IS NULL OR (public.is_admin() IS NOT TRUE AND NOT public.is_current_class_tutor(cid)) THEN
  RAISE EXCEPTION 'Không có quyền đọc điểm danh.' USING ERRCODE='42501';
 END IF;
 RETURN (SELECT jsonb_build_object('status',a.status,'fee',a.tuition_fee_snapshot,'adjustment_id',a.adjustment_id)
 FROM csat_internal.effective_attendance a WHERE a.attendance_id=p_attendance_id);
END $$;
CREATE VIEW public.attendance_current WITH(security_invoker=true,security_barrier=true) AS
 SELECT a.attendance_id,a.session_id,a.student_id,(x.value->>'status')::public.attendance_status AS status,
 (x.value->>'fee')::numeric AS tuition_fee_snapshot,a.notes,a.status AS original_status,(x.value->>'adjustment_id')::uuid AS adjustment_id
 FROM public.session_attendance a CROSS JOIN LATERAL(SELECT public.attendance_effective_values(a.attendance_id) AS value) x;
CREATE FUNCTION public.sessions(public.attendance_current) RETURNS SETOF public.sessions
LANGUAGE sql STABLE SECURITY INVOKER ROWS 1 SET search_path='' AS $$ SELECT * FROM public.sessions WHERE session_id=$1.session_id $$;
CREATE FUNCTION public.students(public.attendance_current) RETURNS SETOF public.students
LANGUAGE sql STABLE SECURITY INVOKER ROWS 1 SET search_path='' AS $$ SELECT * FROM public.students WHERE student_id=$1.student_id $$;
CREATE FUNCTION public.session_attendance_roster(p_session_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.sessions%ROWTYPE; roster jsonb; attendance jsonb;
BEGIN
 SELECT * INTO s FROM public.sessions WHERE session_id=p_session_id;
 IF NOT FOUND OR auth.uid() IS NULL OR (public.is_admin() IS NOT TRUE AND NOT public.is_current_class_tutor(s.class_id)) THEN
  RAISE EXCEPTION 'Không có quyền đọc buổi học.' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('students',jsonb_build_object('student_id',st.student_id,'name',st.name)) ORDER BY st.name,st.student_id),'[]') INTO roster
 FROM csat_internal.session_roster(p_session_id) r JOIN public.students st USING(student_id);
 SELECT coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('students',jsonb_build_object('student_id',st.student_id,'name',st.name)) ORDER BY st.name,st.student_id),'[]') INTO attendance
 FROM csat_internal.effective_attendance a JOIN public.students st USING(student_id) WHERE a.session_id=p_session_id;
 RETURN jsonb_build_object('roster',roster,'attendance',attendance,'class_id',s.class_id);
END $$;
REVOKE ALL ON public.attendance_current FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.attendance_current TO authenticated;
REVOKE ALL ON FUNCTION public.attendance_effective_values(uuid),public.session_attendance_roster(uuid),public.sessions(public.attendance_current) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.attendance_effective_values(uuid),public.session_attendance_roster(uuid),public.sessions(public.attendance_current) TO authenticated;

DO $$ DECLARE f record; definition text; pol record; expr text; chk text; BEGIN
 -- Preserve existing functions, but make current ownership follow effective dates.
 FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('save_student_review','guard_student_review_write','get_parent_lookup') LOOP
   definition:=pg_get_functiondef(f.oid);
   definition:=replace(definition,'SELECT * INTO v_class FROM public.classes','SELECT * INTO v_class FROM public.class_current_state');
   definition:=replace(definition,'t.tutor_id = c.tutor_id','t.tutor_id = csat_internal.tutor_on(c.class_id,(now() AT TIME ZONE ''Asia/Ho_Chi_Minh'')::date)');
   definition:=replace(definition,'c.tutor_id = v_tutor_id','public.is_current_class_tutor(c.class_id)');
   IF f.oid::regproc::text LIKE '%get_parent_lookup%' THEN
     definition:=replace(definition,'public.session_attendance','csat_internal.effective_attendance');
   END IF;
   EXECUTE definition;
 END LOOP;
 FOR pol IN SELECT * FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'Tutor_%' LOOP
   expr:=regexp_replace(pol.qual,'c\.tutor_id = (public\.)?current_tutor_id\(\)','public.is_current_class_tutor(c.class_id)','g');
   chk:=regexp_replace(pol.with_check,'c\.tutor_id = (public\.)?current_tutor_id\(\)','public.is_current_class_tutor(c.class_id)','g');
   IF expr IS DISTINCT FROM pol.qual OR chk IS DISTINCT FROM pol.with_check THEN
     EXECUTE format('ALTER POLICY %I ON public.%I %s %s',pol.policyname,pol.tablename,
       CASE WHEN expr IS NULL THEN '' ELSE 'USING ('||expr||')' END,CASE WHEN chk IS NULL THEN '' ELSE 'WITH CHECK ('||chk||')' END);
   END IF;
 END LOOP;
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN('payment_accounts','current_student_fee','classes','tutors','students') LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated,service_role',f.signature);
 END LOOP;
END $$;
REVOKE ALL ON public.class_current_state,public.class_students_current FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.class_current_state,public.class_students_current TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.current_class_terms(uuid) TO service_role;
-- Financial and review references must survive deletion attempts through related account tables too.
DO $$ DECLARE fk record; BEGIN
 FOR fk IN SELECT c.conname,c.conrelid::regclass AS relation,pg_get_constraintdef(c.oid) AS definition
 FROM pg_constraint c WHERE c.contype='f' AND c.confrelid='public.students'::regclass AND c.confdeltype IN('c','n') LOOP
   EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I, ADD CONSTRAINT %I %s',fk.relation,fk.conname,fk.conname,
     regexp_replace(fk.definition,'ON DELETE (CASCADE|SET NULL)','ON DELETE RESTRICT'));
 END LOOP;
END $$;
ALTER TABLE public.tutors ADD CONSTRAINT tutors_auth_user_fk FOREIGN KEY(auth_uid) REFERENCES auth.users(id) ON DELETE RESTRICT;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260908_08');
NOTIFY pgrst,'reload schema';

-- 20260908_09_reporting.sql

CREATE FUNCTION public.admin_finance_summary() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM csat_internal.require_admin();
 RETURN jsonb_build_object('recorded_net_receipts',coalesce((SELECT sum(amount) FROM public.payment_events
   WHERE occurred_at>=date_trunc('month',now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'),0),
   'unpaid_count',(SELECT count(*) FROM public.payments p WHERE csat_internal.payment_balance(p.payment_id)>0),
   'refund_due',coalesce((SELECT -sum(csat_internal.payment_balance(p.payment_id)) FROM public.payments p WHERE csat_internal.payment_balance(p.payment_id)<0),0));
END $$;
CREATE FUNCTION public.admin_tutor_salary_history(p_tutor_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE label_text text; report jsonb; result jsonb:='[]';
BEGIN
 PERFORM csat_internal.require_admin();
 FOR label_text IN SELECT DISTINCT billing_period FROM public.sessions WHERE tutor_id_snapshot=p_tutor_id AND status='completed'
   AND billing_period IS NOT NULL ORDER BY billing_period DESC LOOP
   report:=csat_internal.billing_snapshot(NULL,NULL,label_text,p_tutor_id);
   result:=result||jsonb_build_array(jsonb_build_object('period',label_text,'sessions',jsonb_array_length(report->'sessions'),
     'tuition',report->'totalStudentTuition','csat',report->'totalCsatRevenue','net',report->'totalTutorSalary'));
 END LOOP;
 RETURN result;
END $$;
CREATE FUNCTION public.tutor_month_summary(p_start_date date,p_end_date date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; tid uuid:=public.current_tutor_id();
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Tài khoản gia sư không hợp lệ.' USING ERRCODE='42501';END IF;
 IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date<p_start_date THEN RAISE EXCEPTION 'Khoảng ngày không hợp lệ.' USING ERRCODE='22023';END IF;
 IF EXISTS(SELECT 1 FROM public.sessions s WHERE s.tutor_id_snapshot=tid AND s.status='completed' AND s.date BETWEEN p_start_date AND p_end_date
   AND (s.csat_fee_snapshot IS NULL OR EXISTS(SELECT 1 FROM public.session_attendance a WHERE a.session_id=s.session_id AND a.tuition_fee_snapshot IS NULL))) THEN
   RAISE EXCEPTION 'Báo cáo còn buổi thiếu đơn giá lưu tại thời điểm học; cần đối soát trước khi tính tiền.' USING ERRCODE='22023'; END IF;
 WITH rows AS(
 SELECT s.session_id,coalesce(b.csat_rate,s.csat_fee_snapshot) AS rate,
  CASE WHEN b.session_id IS NOT NULL THEN b.tuition+coalesce((SELECT sum(a.tuition_delta) FROM public.billing_adjustments a JOIN public.billing_items i USING(item_id) WHERE i.session_id=s.session_id),0)
   ELSE coalesce((SELECT sum(tuition_fee_snapshot) FROM public.session_attendance WHERE session_id=s.session_id AND status='attended'),0) END AS tuition
 FROM public.sessions s LEFT JOIN public.billing_sessions b USING(session_id)
 WHERE s.tutor_id_snapshot=tid AND s.status='completed' AND s.date BETWEEN p_start_date AND p_end_date)
 SELECT jsonb_build_object('sessions',count(*),'tuition',coalesce(sum(tuition),0),
  'csat',coalesce(sum(CASE WHEN tuition>0 THEN rate ELSE 0 END),0),
  'net',coalesce(sum(tuition-CASE WHEN tuition>0 THEN rate ELSE 0 END),0)) INTO result FROM rows;
 RETURN result;
END $$;
-- Handle either whitespace style used by the existing review migration.
DO $$ DECLARE f record; definition text; BEGIN
 FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='save_student_review' LOOP
  definition:=pg_get_functiondef(f.oid);
  definition:=regexp_replace(definition,'c\.tutor_id\s*=\s*actor','public.is_current_class_tutor(c.class_id)','g');
  EXECUTE definition;
 END LOOP;
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN('admin_finance_summary','admin_tutor_salary_history','tutor_month_summary') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
 END LOOP;
END $$;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260908_09');
NOTIFY pgrst,'reload schema';

-- 20260909_10_schema_alignment.sql

DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260908_09') THEN
  RAISE EXCEPTION 'Apply 20260908_09 first';
 END IF;
 IF EXISTS(SELECT 1 FROM public.student_reviews WHERE student_id IS NULL OR tutor_id IS NULL OR class_id IS NULL OR month_year IS NULL)
   OR EXISTS(SELECT 1 FROM public.student_reviews GROUP BY student_id,month_year,class_id HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Nhận xét thiếu liên kết hoặc trùng tháng/lớp/học sinh; cần đối soát riêng, không tự gộp hoặc xóa.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.classes WHERE class_type IS NULL) THEN
  RAISE EXCEPTION 'Cần xác minh loại lớp còn thiếu; không tự phân loại.';
 END IF;
END $$;
ALTER TABLE public.classes ALTER COLUMN class_type SET NOT NULL;
ALTER TABLE public.student_reviews ALTER COLUMN student_id SET NOT NULL, ALTER COLUMN tutor_id SET NOT NULL,
 ALTER COLUMN class_id SET NOT NULL, ALTER COLUMN month_year SET NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.student_reviews'::regclass AND contype='u'
  AND pg_get_constraintdef(oid)='UNIQUE (student_id, month_year, class_id)') THEN
  ALTER TABLE public.student_reviews ADD CONSTRAINT student_reviews_student_month_class_key UNIQUE(student_id,month_year,class_id);
 END IF;
END $$;
REVOKE TRUNCATE ON public.classes,public.class_students,public.sessions,public.session_attendance,public.payments,
 public.students,public.tutors,public.student_reviews,public.class_change_log FROM authenticated,service_role;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON public.business_audit_events FOR EACH ROW EXECUTE FUNCTION csat_internal.immutable_record();
-- Enrollment auditing is defined once in migration 07, keyed by enrollment_id.

-- Read old change logs and new effective-date history together without duplicating stored events.
CREATE FUNCTION public.admin_class_history(p_class_id uuid DEFAULT NULL,p_tutor_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM csat_internal.require_admin();
 WITH th AS (
  SELECT h.*,lag(tutor_id) OVER(PARTITION BY class_id ORDER BY effective_from,history_id) AS previous FROM public.class_tutor_history h
 ), fh AS (
  SELECT h.*,lag(fee) OVER(PARTITION BY class_id ORDER BY effective_from,history_id) AS previous FROM public.class_fee_history h
 ), sh AS (
  SELECT h.*,lag(fee) OVER(PARTITION BY class_id,student_id ORDER BY effective_from,history_id) AS previous FROM public.student_fee_history h
 ), events AS (
  SELECT to_jsonb(l) AS payload FROM public.class_change_log l
  UNION ALL
  SELECT jsonb_build_object('log_id','tutor:'||h.history_id,'class_id',h.class_id,'change_type','tutor_change',
   'old_value',h.previous,'new_value',h.tutor_id,'old_label',ot.name,'new_label',nt.name,'effective_date',h.effective_from,
   'changed_by',h.actor_id,'notes',h.reason,'created_at',h.recorded_at)
  FROM th h LEFT JOIN public.tutors ot ON ot.tutor_id=h.previous LEFT JOIN public.tutors nt ON nt.tutor_id=h.tutor_id WHERE h.source='change'
  UNION ALL
  SELECT jsonb_build_object('log_id','csat:'||h.history_id,'class_id',h.class_id,'change_type','csat_fee_update',
   'old_value',h.previous,'new_value',h.fee,'old_label',h.previous::text,'new_label',h.fee::text,'effective_date',h.effective_from,
   'changed_by',h.actor_id,'notes',h.reason,'created_at',h.recorded_at) FROM fh h WHERE h.source='change'
  UNION ALL
  SELECT jsonb_build_object('log_id','student_fee:'||h.history_id,'class_id',h.class_id,'change_type','student_fee_update',
   'old_value',h.previous,'new_value',h.fee,'old_label',st.name||': '||h.previous::text,'new_label',st.name||': '||h.fee::text,
   'effective_date',h.effective_from,'changed_by',h.actor_id,'notes',h.reason,'created_at',h.recorded_at)
  FROM sh h JOIN public.students st USING(student_id) WHERE h.source='change'
  UNION ALL
  SELECT jsonb_build_object('log_id','rename:'||a.event_id,'class_id',a.entity_id,'change_type','rename_class',
   'old_label',a.before_data->>'name','new_label',a.after_data->>'name',
   'effective_date',(a.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'changed_by',a.actor_id,'created_at',a.occurred_at)
  FROM public.business_audit_events a WHERE a.entity_table='classes' AND a.operation='UPDATE'
   AND a.before_data->>'name' IS DISTINCT FROM a.after_data->>'name'
  UNION ALL
  SELECT jsonb_build_object('log_id','membership:'||a.event_id,'class_id',a.after_data->>'class_id','change_type','drop_student',
   'old_label',st.name||': đang học','new_label',st.name||': đã nghỉ',
   'effective_date',(a.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'changed_by',a.actor_id,'created_at',a.occurred_at)
  FROM public.business_audit_events a JOIN public.students st ON st.student_id=(a.after_data->>'student_id')::uuid
  WHERE a.entity_table='class_students' AND a.operation='UPDATE'
   AND a.before_data->>'status'='active' AND a.after_data->>'status'='dropped'
 )
 SELECT coalesce(jsonb_agg(e.payload||jsonb_build_object('classes',jsonb_build_object('name',c.name))
  ORDER BY (e.payload->>'created_at')::timestamptz DESC,e.payload->>'log_id'),'[]') INTO result
 FROM events e LEFT JOIN public.classes c ON c.class_id=(e.payload->>'class_id')::uuid
 WHERE (p_class_id IS NULL OR c.class_id=p_class_id) AND (p_tutor_id IS NULL OR (
  e.payload->>'change_type'='tutor_change' AND p_tutor_id::text IN(e.payload->>'old_value',e.payload->>'new_value')));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_class_history(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_class_history(uuid,uuid) TO authenticated;

INSERT INTO csat_internal.schema_migrations(version) VALUES('20260909_10');
NOTIFY pgrst,'reload schema';

COMMIT;
