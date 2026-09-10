-- Apply after 20260909_10. Additive: no historical accounting writes.
BEGIN;
CREATE TABLE public.learning_templates (
 template_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 program text NOT NULL CHECK(program IN ('basic','advanced','voi')),
 version integer NOT NULL CHECK(version>0), title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
 source text NOT NULL, stages jsonb NOT NULL CHECK(jsonb_typeof(stages)='array' AND jsonb_array_length(stages)>0),
 created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
 UNIQUE(program,version)
);
CREATE TABLE public.learning_defaults (
 program text PRIMARY KEY CHECK(program IN ('basic','advanced','voi')),
 template_id uuid NOT NULL REFERENCES public.learning_templates ON DELETE RESTRICT
);
CREATE TABLE public.learning_records (
 record_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 class_id uuid NOT NULL REFERENCES public.classes ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN ('class','student','session')),
 student_id uuid REFERENCES public.students ON DELETE RESTRICT,
 session_id uuid REFERENCES public.sessions ON DELETE RESTRICT,
 draft jsonb NOT NULL CHECK(jsonb_typeof(draft)='object'),
 published jsonb CHECK(jsonb_typeof(published)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
 CHECK((kind='student')=(student_id IS NOT NULL) AND (kind='session')=(session_id IS NOT NULL)),
 UNIQUE NULLS NOT DISTINCT(class_id,kind,student_id,session_id)
);
CREATE TABLE public.learning_history (
 history_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 record_id uuid NOT NULL REFERENCES public.learning_records ON DELETE RESTRICT,
 revision integer NOT NULL, body jsonb NOT NULL, was_published boolean NOT NULL,
 actor_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(record_id,revision)
);
CREATE TABLE public.parent_portal_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 contact_label text NOT NULL DEFAULT '', contact_url text NOT NULL DEFAULT '',
 admin_emails text[] NOT NULL DEFAULT '{}', email_enabled boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1
);
INSERT INTO public.parent_portal_settings(singleton) VALUES(true);
CREATE TABLE public.tutor_public_profiles (
 tutor_id uuid PRIMARY KEY REFERENCES public.tutors ON DELETE RESTRICT,
 introduction text NOT NULL CHECK(length(introduction)<=2000), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.learning_month_queue(p_month text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE d date; result jsonb;
BEGIN
 IF auth.uid() IS NULL AND current_setting('request.jwt.claims',true)::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Chưa đăng nhập.' USING ERRCODE='42501'; END IF;
 IF p_month IS NULL OR p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Tháng không hợp lệ.' USING ERRCODE='22023'; END IF;
 d:=(p_month||'-01')::date;
 WITH candidates AS (
  SELECT DISTINCT s.class_id,r.student_id FROM public.sessions s
  CROSS JOIN LATERAL csat_internal.session_roster(s.session_id) r
  WHERE s.date>=d AND s.date<(d+interval '1 month')::date
   AND s.date<=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND s.status<>'cancelled'
 ), rows AS (
  SELECT c.class_id,c.name AS class_name,t.tutor_id,t.name AS tutor_name,st.student_id,st.name AS student_name,
   sr.review_id,coalesce(sr.review_status,'missing') AS status,
   coalesce(cs.status='active',false) AND c.status='active' AND t.status='active' AND t.is_deleted IS NOT TRUE AND (sr.review_status IS DISTINCT FROM 'draft' OR sr.tutor_id=t.tutor_id) AS actionable
  FROM candidates x JOIN public.classes c USING(class_id) JOIN public.students st USING(student_id)
  LEFT JOIN public.tutors t ON t.tutor_id=csat_internal.tutor_on(c.class_id,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
  LEFT JOIN public.class_students cs ON cs.class_id=c.class_id AND cs.student_id=st.student_id
  LEFT JOIN public.student_reviews sr ON sr.class_id=c.class_id AND sr.student_id=st.student_id AND sr.month_year=p_month
  WHERE st.is_deleted IS NOT TRUE AND (public.is_admin() OR public.is_current_class_tutor(c.class_id)
    OR current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role')
 ) SELECT coalesce(jsonb_agg(to_jsonb(rows) ORDER BY tutor_name,class_name,student_name,student_id),'[]') INTO result FROM rows;
 RETURN result;
END $$;

CREATE FUNCTION public.learning_workspace(p_class_id uuid,p_month text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR (public.is_admin() IS NOT TRUE AND NOT public.is_current_class_tutor(p_class_id)) THEN
  RAISE EXCEPTION 'Không có quyền đọc lớp.' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object(
 'class',(SELECT jsonb_build_object('class_id',class_id,'name',name,'class_type',class_type) FROM public.classes WHERE class_id=p_class_id),
 'templates',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY program,version DESC),'[]') FROM public.learning_templates t),
 'defaults',(SELECT coalesce(jsonb_agg(to_jsonb(d)),'[]') FROM public.learning_defaults d),
 'records',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') FROM public.learning_records r WHERE class_id=p_class_id),
 'students',(SELECT coalesce(jsonb_agg(jsonb_build_object('student_id',s.student_id,'name',s.name) ORDER BY s.name),'[]') FROM public.students s JOIN public.class_students cs USING(student_id) WHERE cs.class_id=p_class_id AND cs.status='active' AND s.is_deleted IS NOT TRUE),
 'sessions',(SELECT coalesce(jsonb_agg(jsonb_build_object('session_id',session_id,'date',date,'status',status) ORDER BY date,session_id),'[]') FROM public.sessions WHERE class_id=p_class_id),
 'queue',(SELECT coalesce(jsonb_agg(x),'[]') FROM jsonb_array_elements(public.learning_month_queue(p_month)) x WHERE x->>'class_id'=p_class_id::text));
END $$;



CREATE FUNCTION csat_internal.valid_learning_body(b jsonb,k text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE field text; x jsonb;
BEGIN
 IF b IS NULL OR jsonb_typeof(b)<>'object' OR NOT b ?& ARRAY['goal','focus_tags','next_step','stage_index','title','content','continuation','program','format','template_id']
  OR b-ARRAY['goal','focus_tags','next_step','stage_index','title','content','continuation','program','format','template_id']<>'{}'::jsonb THEN RETURN false; END IF;
 FOREACH field IN ARRAY ARRAY['goal','next_step','title','content','continuation'] LOOP
  IF jsonb_typeof(b->field) IS DISTINCT FROM 'string' OR length(b->>field)>(CASE WHEN field='content' THEN 5000 WHEN field='title' THEN 200 ELSE 2000 END) THEN RETURN false; END IF;
 END LOOP;
 IF jsonb_typeof(b->'focus_tags') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(b->'focus_tags')>16 OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(b->'focus_tags'))<>jsonb_array_length(b->'focus_tags') THEN RETURN false; END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(b->'focus_tags') LOOP
  IF jsonb_typeof(x)<>'string' OR (x#>>'{}') NOT IN ('k-io','k-types','k-conditions','k-loops','k-arrays','k-frequency','k-sorting','k-functions','k-divisors','k-primes','k-gcd','k-factors','k-modulo','k-strings','k-matrix','k-prefix','k-difference','k-vector','k-stack','k-queue','k-set','k-map','k-greedy','k-two-pointers','k-binary','k-hashing','k-dp-state','k-dp-grid','k-knapsack','k-lis','k-brute','k-recursion','s-reading','s-model','s-select','s-correctness','s-complexity','s-code','s-index','s-types','s-test','s-debug','s-trace','s-explain') THEN RETURN false; END IF;
 END LOOP;
 IF b->>'program' IS NOT NULL AND (jsonb_typeof(b->'program')<>'string' OR b->>'program' NOT IN ('basic','advanced','voi')) THEN RETURN false; END IF;
 IF b->>'format' IS NOT NULL AND (jsonb_typeof(b->'format')<>'string' OR b->>'format' NOT IN ('group','individual')) THEN RETURN false; END IF;
 IF b->>'template_id' IS NOT NULL AND (jsonb_typeof(b->'template_id')<>'string' OR b->>'template_id' !~ '^[a-fA-F0-9-]{36}$') THEN RETURN false; END IF;
 IF b->>'stage_index' IS NOT NULL AND (jsonb_typeof(b->'stage_index')<>'number' OR b->>'stage_index' !~ '^[0-9]+$' OR (b->>'stage_index')::integer>29) THEN RETURN false; END IF;
 IF k<>'class' AND (b->>'program' IS NOT NULL OR b->>'format' IS NOT NULL OR b->>'template_id' IS NOT NULL OR b->>'stage_index' IS NOT NULL) THEN RETURN false; END IF;
 IF k='session' AND (b->>'goal'<>'' OR b->>'next_step'<>'' OR jsonb_array_length(b->'focus_tags')<>0) THEN RETURN false; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION csat_internal.valid_learning_body(jsonb,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.save_learning_record(p_class_id uuid,p_kind text,p_student_id uuid,p_session_id uuid,p_expected_revision integer,p_body jsonb,p_publish boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.learning_records%ROWTYPE; tid uuid; template public.learning_templates%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR (public.is_admin() IS NOT TRUE AND NOT public.is_current_class_tutor(p_class_id)) THEN
  RAISE EXCEPTION 'Không có quyền sửa lớp.' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.classes WHERE class_id=p_class_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy lớp.' USING ERRCODE='P0002'; END IF;
 IF p_kind NOT IN ('class','student','session') OR p_kind IS NULL OR p_publish IS NULL OR p_expected_revision IS NULL
  OR ((p_kind='student')<>(p_student_id IS NOT NULL)) OR ((p_kind='session')<>(p_session_id IS NOT NULL)) THEN
  RAISE EXCEPTION 'Phạm vi không hợp lệ.' USING ERRCODE='22023'; END IF;
 IF p_kind='student' AND NOT EXISTS(SELECT 1 FROM public.class_students WHERE class_id=p_class_id AND student_id=p_student_id AND status='active') THEN
  RAISE EXCEPTION 'Học sinh không đang học trong lớp.' USING ERRCODE='42501'; END IF;
 IF p_kind='session' AND NOT EXISTS(SELECT 1 FROM public.sessions WHERE class_id=p_class_id AND session_id=p_session_id) THEN
  RAISE EXCEPTION 'Buổi không thuộc lớp.' USING ERRCODE='42501'; END IF;
 IF NOT csat_internal.valid_learning_body(p_body,p_kind) OR octet_length(p_body::text)>40000
  OR jsonb_typeof(p_body->'focus_tags') IS DISTINCT FROM 'array' OR jsonb_array_length(p_body->'focus_tags')>16 THEN
  RAISE EXCEPTION 'Nội dung không hợp lệ.' USING ERRCODE='22023'; END IF;
 IF p_kind='class' THEN
  IF p_body->>'program' IS NOT NULL AND p_body->>'program' NOT IN ('basic','advanced','voi') THEN RAISE EXCEPTION 'Chương trình không hợp lệ.' USING ERRCODE='22023'; END IF;
  IF p_publish AND (p_body->>'program' IS NULL OR coalesce(p_body->>'format','') NOT IN ('group','individual')) THEN RAISE EXCEPTION 'Chọn chương trình và hình thức học.' USING ERRCODE='22023'; END IF;
  tid:=(p_body->>'template_id')::uuid;
  IF tid IS NOT NULL THEN
   SELECT * INTO template FROM public.learning_templates WHERE template_id=tid AND program=p_body->>'program';
   IF NOT FOUND THEN RAISE EXCEPTION 'Template không khớp chương trình.' USING ERRCODE='22023'; END IF;
   IF p_body->>'stage_index' IS NOT NULL AND ((p_body->>'stage_index')::integer<0 OR (p_body->>'stage_index')::integer>=jsonb_array_length(template.stages)) THEN RAISE EXCEPTION 'Chặng học không hợp lệ.' USING ERRCODE='22023'; END IF;
  ELSIF p_publish AND p_body->>'program'<>'voi' THEN RAISE EXCEPTION 'Chọn phiên bản giáo án trước khi công bố.' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_kind='session' AND p_publish AND coalesce(trim(p_body->>'title'),'')='' THEN RAISE EXCEPTION 'Cần tên nội dung buổi.' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM public.learning_records WHERE class_id=p_class_id AND kind=p_kind AND student_id IS NOT DISTINCT FROM p_student_id AND session_id IS NOT DISTINCT FROM p_session_id FOR UPDATE;
 IF coalesce(r.revision,0)<>p_expected_revision THEN RAISE EXCEPTION 'Nội dung đã thay đổi ở phiên khác. Tải lại trước khi lưu.' USING ERRCODE='40001'; END IF;
 IF r.record_id IS NULL THEN
  INSERT INTO public.learning_records(class_id,kind,student_id,session_id,draft,published,published_at)
  VALUES(p_class_id,p_kind,p_student_id,p_session_id,p_body,CASE WHEN p_publish THEN p_body END,CASE WHEN p_publish THEN now() END) RETURNING * INTO r;
 ELSE
  UPDATE public.learning_records SET draft=p_body,revision=revision+1,updated_at=clock_timestamp(),
   published=CASE WHEN p_publish THEN p_body ELSE published END,published_at=CASE WHEN p_publish THEN now() ELSE published_at END
  WHERE record_id=r.record_id RETURNING * INTO r;
 END IF;
 INSERT INTO public.learning_history(record_id,revision,body,was_published,actor_id) VALUES(r.record_id,r.revision,p_body,p_publish,auth.uid());
 RETURN to_jsonb(r);
END $$;

CREATE FUNCTION public.admin_create_learning_template(p_program text,p_title text,p_source text,p_stages jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.learning_templates%ROWTYPE;
BEGIN
 PERFORM csat_internal.require_admin();
 PERFORM pg_advisory_xact_lock(hashtextextended('learning-template',0));
 INSERT INTO public.learning_templates(program,version,title,source,stages,created_by)
 SELECT p_program,coalesce(max(version),0)+1,p_title,p_source,p_stages,auth.uid() FROM public.learning_templates WHERE program=p_program RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;
CREATE FUNCTION public.admin_learning_settings(p_action text,p_data jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.learning_templates%ROWTYPE;
BEGIN
 PERFORM csat_internal.require_admin();
 IF p_action='default' THEN
  SELECT * INTO STRICT t FROM public.learning_templates WHERE template_id=(p_data->>'template_id')::uuid;
  INSERT INTO public.learning_defaults(program,template_id) VALUES(t.program,t.template_id) ON CONFLICT(program) DO UPDATE SET template_id=excluded.template_id;
 ELSIF p_action='profile' THEN
  IF length(p_data->>'introduction')>2000 THEN RAISE EXCEPTION 'Giới thiệu quá dài.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.tutor_public_profiles(tutor_id,introduction) VALUES((p_data->>'tutor_id')::uuid,p_data->>'introduction')
   ON CONFLICT(tutor_id) DO UPDATE SET introduction=excluded.introduction,updated_at=now();
 ELSIF p_action='settings' THEN
  IF (p_data->>'contact_url')<>'' AND p_data->>'contact_url' !~ '^https://' THEN RAISE EXCEPTION 'Kênh liên hệ cần HTTPS.' USING ERRCODE='22023'; END IF;
  UPDATE public.parent_portal_settings SET contact_label=p_data->>'contact_label',contact_url=p_data->>'contact_url',
   admin_emails=ARRAY(SELECT jsonb_array_elements_text(p_data->'admin_emails')),email_enabled=(p_data->>'email_enabled')::boolean,revision=revision+1
  WHERE singleton AND revision=(p_data->>'revision')::integer;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cấu hình đã thay đổi. Tải lại.' USING ERRCODE='40001'; END IF;
 ELSE RAISE EXCEPTION 'Thao tác không hợp lệ.' USING ERRCODE='22023'; END IF;
END $$;

-- Parent projection uses the existing opaque session, never client-supplied phone/student alone.
CREATE FUNCTION public.parent_learning_portal(p_token_hash text,p_student_id uuid DEFAULT NULL,p_month text DEFAULT NULL,p_review_page integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE base jsonb; sid uuid; d date; result jsonb;
BEGIN
 base:=public.get_parent_lookup(p_token_hash,p_student_id);
 sid:=(base->'student'->>'student_id')::uuid;
 IF sid IS NULL THEN RETURN base; END IF;
 IF p_review_page<0 OR p_review_page>10000 OR p_review_page IS NULL THEN RAISE EXCEPTION 'Trang không hợp lệ.' USING ERRCODE='22023'; END IF;
 IF p_month IS NULL THEN p_month:=to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM'); END IF;
 IF p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Tháng không hợp lệ.' USING ERRCODE='22023'; END IF;
 d:=(p_month||'-01')::date;
 SELECT jsonb_build_object(
 'month',p_month,
 'plans',coalesce((SELECT jsonb_agg(jsonb_build_object('class_id',r.class_id,'class_name',c.name,'kind',r.kind,'body',r.published,'published_at',r.published_at,
  'template',(SELECT jsonb_build_object('template_id',t.template_id,'version',t.version,'title',t.title,'program',t.program,'source',t.source,'stages',t.stages) FROM public.learning_templates t WHERE t.template_id=(r.published->>'template_id')::uuid)))
  FROM public.learning_records r JOIN public.classes c USING(class_id) WHERE r.published IS NOT NULL AND (r.kind='student' AND r.student_id=sid OR r.kind='class' AND EXISTS(SELECT 1 FROM public.class_students cs WHERE cs.class_id=r.class_id AND cs.student_id=sid AND cs.status='active'))),'[]'::jsonb),
 'attendance',coalesce((SELECT jsonb_agg(jsonb_build_object('session_id',s.session_id,'class_name',c.name,'date',s.date,'start_time',s.start_time,'end_time',s.end_time,'session_status',s.status,'status',a.status,
   'lesson',lr.published) ORDER BY s.date DESC,s.start_time DESC,s.session_id)
  FROM public.sessions s JOIN public.classes c USING(class_id)
  LEFT JOIN csat_internal.effective_attendance a ON a.session_id=s.session_id AND a.student_id=sid
  LEFT JOIN public.learning_records lr ON lr.session_id=s.session_id AND lr.kind='session'
  WHERE s.date>=d AND s.date<(d+interval '1 month')::date AND EXISTS(SELECT 1 FROM csat_internal.session_roster(s.session_id) r WHERE r.student_id=sid)),'[]'::jsonb),
 'invoices',coalesce((SELECT jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'class_name',c.name,'period',p.billing_period,
   'amount',p.amount+coalesce((SELECT sum(a.tuition_delta) FROM public.billing_adjustments a WHERE a.payment_id=p.payment_id),0),
   'balance',csat_internal.payment_balance(p.payment_id)) ORDER BY p.created_at DESC,p.payment_id)
  FROM public.payments p LEFT JOIN public.classes c USING(class_id) WHERE p.student_id=sid),'[]'::jsonb),
 'provisional',coalesce((SELECT jsonb_agg(jsonb_build_object('class_name',x.class_name,'month',x.month,'amount',x.amount,'unknown',x.unknown) ORDER BY x.month DESC,x.class_name) FROM (
  SELECT c.name AS class_name,to_char(s.date,'YYYY-MM') AS month,
   sum(CASE WHEN a.status='attended' THEN a.tuition_fee_snapshot WHEN a.status='absent' THEN 0 END) AS amount,
   count(*) FILTER(WHERE a.status IS NULL OR a.status='attended' AND a.tuition_fee_snapshot IS NULL) AS unknown
  FROM public.sessions s JOIN public.classes c USING(class_id)
  LEFT JOIN csat_internal.effective_attendance a ON a.session_id=s.session_id AND a.student_id=sid
  WHERE s.billing_period IS NULL AND s.status<>'cancelled' AND (s.date+s.end_time) <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')
   AND EXISTS(SELECT 1 FROM csat_internal.session_roster(s.session_id) r WHERE r.student_id=sid)
  GROUP BY c.class_id,c.name,to_char(s.date,'YYYY-MM')) x),'[]'::jsonb),
 'tutors',coalesce((SELECT jsonb_agg(jsonb_build_object('class_name',c.name,'name',t.name,'introduction',p.introduction))
  FROM public.class_students cs JOIN public.classes c USING(class_id)
  LEFT JOIN public.tutors t ON t.tutor_id=csat_internal.tutor_on(c.class_id,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
  LEFT JOIN public.tutor_public_profiles p ON p.tutor_id=t.tutor_id WHERE cs.student_id=sid AND cs.status='active'),'[]'::jsonb),
 'contact',(SELECT jsonb_build_object('label',contact_label,'url',contact_url) FROM public.parent_portal_settings WHERE singleton),
 'reviewPage',p_review_page,
 'reviewCount',(SELECT count(*) FROM public.student_reviews WHERE student_id=sid AND review_status='published'),
 'reviews',coalesce((SELECT jsonb_agg(x.doc ORDER BY x.month_year DESC,x.review_id) FROM (
  SELECT r.month_year,r.review_id,jsonb_build_object('review_id',r.review_id,'month_year',r.month_year,'review_context',r.review_context,
   'general_assessment',r.general_assessment,'learning_attitude',r.learning_attitude,'logical_thinking',r.logical_thinking,'review_tags',r.review_tags,
   'classes',jsonb_build_object('name',c.name),'tutors',jsonb_build_object('name',t.name)) AS doc
  FROM public.student_reviews r LEFT JOIN public.classes c USING(class_id) LEFT JOIN public.tutors t ON t.tutor_id=r.tutor_id
  WHERE r.student_id=sid AND r.review_status='published' ORDER BY r.month_year DESC,r.review_id LIMIT 12 OFFSET p_review_page*12) x),'[]'::jsonb)
 ) INTO result;
 RETURN base||result;
END $$;

DO $$ DECLARE t text; f record; BEGIN
 FOREACH t IN ARRAY ARRAY['learning_templates','learning_defaults','learning_records','learning_history','parent_portal_settings','tutor_public_profiles'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('CREATE POLICY admin_read ON public.%I FOR SELECT TO authenticated USING(public.is_admin())',t);
 END LOOP;
 FOR f IN SELECT oid::regprocedure AS sig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('learning_month_queue','learning_workspace','save_learning_record','admin_create_learning_template','admin_learning_settings','parent_learning_portal') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.sig);
  IF f.sig::text NOT LIKE '%parent_learning_portal%' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.sig); END IF;
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.parent_learning_portal(text,uuid,text,integer),public.learning_month_queue(text) TO service_role;
CREATE TRIGGER immutable_template BEFORE UPDATE OR DELETE ON public.learning_templates FOR EACH ROW EXECUTE FUNCTION csat_internal.immutable_record();
CREATE TRIGGER immutable_learning_history BEFORE UPDATE OR DELETE ON public.learning_history FOR EACH ROW EXECUTE FUNCTION csat_internal.immutable_record();
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260910_11');
NOTIFY pgrst,'reload schema';
COMMIT;
