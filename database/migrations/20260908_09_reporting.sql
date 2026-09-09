BEGIN;
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
COMMIT;
