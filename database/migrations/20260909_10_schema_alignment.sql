BEGIN;
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
