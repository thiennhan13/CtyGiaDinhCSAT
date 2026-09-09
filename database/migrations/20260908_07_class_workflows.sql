BEGIN;
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
COMMIT;
