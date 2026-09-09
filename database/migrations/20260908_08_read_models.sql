BEGIN;
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
COMMIT;
