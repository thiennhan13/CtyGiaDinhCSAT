BEGIN;
CREATE TABLE public.review_corrections (
 correction_id uuid PRIMARY KEY, review_id uuid NOT NULL REFERENCES public.student_reviews ON DELETE RESTRICT,
 message text NOT NULL CHECK(length(trim(message)) BETWEEN 1 AND 3000),
 created_at timestamptz NOT NULL DEFAULT now(), actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT
);
ALTER TABLE public.review_corrections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_corrections FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.review_corrections TO authenticated;
CREATE POLICY admin_read ON public.review_corrections FOR SELECT TO authenticated USING(public.is_admin());
CREATE TRIGGER immutable_correction BEFORE UPDATE OR DELETE ON public.review_corrections FOR EACH ROW EXECUTE FUNCTION csat_internal.immutable_record();
CREATE FUNCTION public.admin_review_followup(p_action text,p_review_id uuid,p_request_id uuid,p_message text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.student_reviews%ROWTYPE; c public.review_corrections%ROWTYPE; tid uuid;
BEGIN
 PERFORM csat_internal.require_admin();
 SELECT * INTO r FROM public.student_reviews WHERE review_id=p_review_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không có nhận xét.' USING ERRCODE='P0002'; END IF;
 IF p_action='correction' THEN
  IF r.review_status<>'published' THEN RAISE EXCEPTION 'Chỉ đính chính nhận xét đã gửi.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.review_corrections(correction_id,review_id,message,actor_id) VALUES(p_request_id,p_review_id,trim(p_message),auth.uid())
   ON CONFLICT(correction_id) DO NOTHING;
  SELECT * INTO c FROM public.review_corrections WHERE correction_id=p_request_id;
  IF c.review_id<>p_review_id OR c.message<>trim(p_message) THEN RAISE EXCEPTION 'Mã yêu cầu đã dùng cho nội dung khác.' USING ERRCODE='23505'; END IF;
  RETURN to_jsonb(c);
 ELSIF p_action='reassign_draft' THEN
  IF r.review_status<>'draft' THEN RAISE EXCEPTION 'Nhận xét đã gửi được giữ nguyên.' USING ERRCODE='23514'; END IF;
  tid:=csat_internal.tutor_on(r.class_id,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
  IF NOT EXISTS(SELECT 1 FROM public.tutors WHERE tutor_id=tid AND status='active' AND is_deleted IS NOT TRUE) THEN RAISE EXCEPTION 'Chưa có gia sư đang hoạt động.' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.class_students WHERE class_id=r.class_id AND student_id=r.student_id AND status='active') THEN RAISE EXCEPTION 'Học sinh không còn đang theo học; cần kiểm tra trước.' USING ERRCODE='22023'; END IF;
  IF tid IS DISTINCT FROM r.tutor_id THEN UPDATE public.student_reviews SET tutor_id=tid WHERE review_id=p_review_id RETURNING * INTO r; END IF;
  RETURN to_jsonb(r);
 ELSE RAISE EXCEPTION 'Thao tác không hợp lệ.' USING ERRCODE='22023'; END IF;
END $$;
CREATE FUNCTION public.admin_class_reviews(p_class_id uuid,p_month text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM csat_internal.require_admin();
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('student_name',s.name,'tutor_name',t.name,
  'corrections',coalesce((SELECT jsonb_agg(jsonb_build_object('correction_id',c.correction_id,'message',c.message,'created_at',c.created_at) ORDER BY c.created_at,c.correction_id) FROM public.review_corrections c WHERE c.review_id=r.review_id),'[]'::jsonb)) ORDER BY s.name,r.review_id),'[]'::jsonb)
  FROM public.student_reviews r JOIN public.students s ON s.student_id=r.student_id LEFT JOIN public.tutors t ON t.tutor_id=r.tutor_id
  WHERE r.class_id=p_class_id AND r.month_year=p_month);
END $$;
REVOKE ALL ON FUNCTION public.admin_review_followup(text,uuid,uuid,text),public.admin_class_reviews(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_review_followup(text,uuid,uuid,text),public.admin_class_reviews(uuid,text) TO authenticated;
-- Add public correction text to the existing allowlisted projection. No actor IDs or drafts.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.parent_learning_portal(text,uuid,text,integer)'::regprocedure);
 definition:=replace(definition,'''review_context'',r.review_context,',
  '''review_context'',r.review_context,''corrections'',coalesce((SELECT jsonb_agg(jsonb_build_object(''correction_id'',cc.correction_id,''message'',cc.message,''created_at'',cc.created_at) ORDER BY cc.created_at,cc.correction_id) FROM public.review_corrections cc WHERE cc.review_id=r.review_id),''[]''::jsonb),');
 EXECUTE definition;
END $$;
CREATE TRIGGER audit_learning_default AFTER INSERT OR UPDATE ON public.learning_defaults FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write('program');
CREATE TRIGGER audit_portal_settings AFTER UPDATE ON public.parent_portal_settings FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write('singleton');
CREATE TRIGGER audit_tutor_profile AFTER INSERT OR UPDATE ON public.tutor_public_profiles FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write('tutor_id');
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260910_15');
NOTIFY pgrst,'reload schema';
COMMIT;
