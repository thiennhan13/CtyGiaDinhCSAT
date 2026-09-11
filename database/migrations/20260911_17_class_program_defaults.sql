-- Class taxonomy and approved default curricula. Apply once after migration 16.
-- No historical class, attendance, review or financial records are rewritten.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260911_16') THEN
  RAISE EXCEPTION 'Apply migration 16 first.';
 END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260911_17') THEN
  RAISE EXCEPTION 'Class program migration 17 already applied.';
 END IF;
END $$;
LOCK TABLE public.classes,public.learning_records,public.learning_defaults IN SHARE ROW EXCLUSIVE MODE;

-- Retain the existing voi key so historical HSGQG/VOI data keeps its identity.
CREATE FUNCTION csat_internal.class_program(p_class_type text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE regexp_replace(lower(btrim(p_class_type)), '[[:space:]]+', ' ', 'g')
  WHEN 'lớp cơ bản' THEN 'basic' WHEN 'cơ bản' THEN 'basic'
  WHEN 'lop co ban' THEN 'basic' WHEN 'co ban' THEN 'basic'
  WHEN 'lớp nâng cao' THEN 'advanced' WHEN 'nâng cao' THEN 'advanced'
  WHEN 'lop nang cao' THEN 'advanced' WHEN 'nang cao' THEN 'advanced'
  WHEN 'lớp hsgqg' THEN 'voi' WHEN 'hsgqg' THEN 'voi' WHEN 'lop hsgqg' THEN 'voi'
  WHEN 'ôn thi voi' THEN 'voi' WHEN 'on thi voi' THEN 'voi'
  WHEN 'lớp luyện thi' THEN 'custom' WHEN 'luyện thi' THEN 'custom'
  WHEN 'lop luyen thi' THEN 'custom' WHEN 'luyen thi' THEN 'custom'
 END;
$$;
REVOKE ALL ON FUNCTION csat_internal.class_program(text) FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE public.learning_templates DROP CONSTRAINT learning_templates_program_check;
ALTER TABLE public.learning_templates ADD CONSTRAINT learning_templates_program_check CHECK(program IN ('basic','advanced','voi','custom'));
ALTER TABLE public.learning_defaults DROP CONSTRAINT learning_defaults_program_check;
ALTER TABLE public.learning_defaults ADD CONSTRAINT learning_defaults_program_check CHECK(program IN ('basic','advanced','voi','custom'));

CREATE OR REPLACE FUNCTION csat_internal.valid_learning_body(b jsonb, k text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
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
 IF b->>'program' IS NOT NULL AND (jsonb_typeof(b->'program')<>'string' OR b->>'program' NOT IN ('basic','advanced','voi','custom')) THEN RETURN false; END IF;
 IF b->>'format' IS NOT NULL AND (jsonb_typeof(b->'format')<>'string' OR b->>'format' NOT IN ('group','individual')) THEN RETURN false; END IF;
 IF b->>'template_id' IS NOT NULL AND (jsonb_typeof(b->'template_id')<>'string' OR b->>'template_id' !~ '^[a-fA-F0-9-]{36}$') THEN RETURN false; END IF;
 IF b->>'stage_index' IS NOT NULL AND (jsonb_typeof(b->'stage_index')<>'number' OR b->>'stage_index' !~ '^[0-9]+$' OR (b->>'stage_index')::integer>29) THEN RETURN false; END IF;
 IF k<>'class' AND (b->>'program' IS NOT NULL OR b->>'format' IS NOT NULL OR b->>'template_id' IS NOT NULL OR b->>'stage_index' IS NOT NULL) THEN RETURN false; END IF;
 IF k='session' AND (b->>'goal'<>'' OR b->>'next_step'<>'' OR jsonb_array_length(b->'focus_tags')<>0) THEN RETURN false; END IF;
 RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.save_learning_record(p_class_id uuid, p_kind text, p_student_id uuid, p_session_id uuid, p_expected_revision integer, p_body jsonb, p_publish boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  IF p_body->>'program' IS NOT NULL AND p_body->>'program' NOT IN ('basic','advanced','voi','custom') THEN RAISE EXCEPTION 'Chương trình không hợp lệ.' USING ERRCODE='22023'; END IF;
  IF p_publish AND (p_body->>'program' IS NULL OR coalesce(p_body->>'format','') NOT IN ('group','individual')) THEN RAISE EXCEPTION 'Chọn chương trình và hình thức học.' USING ERRCODE='22023'; END IF;
  tid:=(p_body->>'template_id')::uuid;
  IF tid IS NOT NULL THEN
   SELECT * INTO template FROM public.learning_templates WHERE template_id=tid AND program=p_body->>'program';
   IF NOT FOUND THEN RAISE EXCEPTION 'Template không khớp chương trình.' USING ERRCODE='22023'; END IF;
   IF p_body->>'stage_index' IS NOT NULL AND ((p_body->>'stage_index')::integer<0 OR (p_body->>'stage_index')::integer>=jsonb_array_length(template.stages)) THEN RAISE EXCEPTION 'Chặng học không hợp lệ.' USING ERRCODE='22023'; END IF;
  ELSIF p_publish AND p_body->>'program' NOT IN ('voi','custom') THEN RAISE EXCEPTION 'Chọn phiên bản giáo án trước khi công bố.' USING ERRCODE='22023'; END IF;
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
END $function$;

CREATE OR REPLACE FUNCTION public.create_class_with_learning(p_data jsonb,p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; cid uuid; prog text; tid uuid; b jsonb;
BEGIN
 PERFORM csat_internal.require_admin();
 result:=public.manage_class('create',NULL,p_data,p_request_id);cid:=(result->>'class_id')::uuid;
 -- Retry never changes an existing roadmap or republishes tutor drafts.
 IF NOT EXISTS(SELECT 1 FROM public.learning_records WHERE class_id=cid AND kind='class') THEN
  SELECT csat_internal.class_program(class_type) INTO prog FROM public.classes WHERE class_id=cid;
  IF prog IS NULL THEN RAISE EXCEPTION 'Chọn loại lớp Cơ bản, Nâng cao, HSGQG hoặc Luyện thi.' USING ERRCODE='22023'; END IF;
  IF p_data->>'program' IS NOT NULL AND p_data->>'program'<>prog THEN
   RAISE EXCEPTION 'Chương trình không khớp loại lớp.' USING ERRCODE='22023';
  END IF;
  SELECT d.template_id INTO tid FROM public.learning_defaults d JOIN public.learning_templates t ON t.template_id=d.template_id AND t.program=d.program WHERE d.program=prog;
  IF prog IN ('basic','advanced') AND tid IS NULL THEN
   RAISE EXCEPTION 'Chưa có giáo án mặc định hợp lệ cho loại lớp.' USING ERRCODE='22023';
  END IF;
  b:=jsonb_build_object('goal','','focus_tags','[]'::jsonb,'next_step','','stage_index',NULL,'title','','content','','continuation','','program',prog,
    'format',coalesce(p_data->>'teaching_format','group'),'template_id',tid);
  PERFORM public.save_learning_record(cid,'class',NULL,NULL,0,b,prog IN ('basic','advanced'));
 END IF;
 RETURN result;
END $$;

-- User approved publishing the common curriculum for all existing basic/advanced classes.
-- A reference framework does not assert teaching format, current stage or mastery.
-- Existing drafts/published plans are never overwritten or silently published.
DO $$
DECLARE c record; tid uuid; b jsonb; rid uuid;
BEGIN
 IF (SELECT count(*) FROM public.learning_defaults d JOIN public.learning_templates t ON t.template_id=d.template_id AND t.program=d.program WHERE d.program IN ('basic','advanced'))<>2 THEN
  RAISE EXCEPTION 'Both approved default curricula must exist.';
 END IF;
 FOR c IN SELECT class_id,csat_internal.class_program(class_type) AS program FROM public.classes
   WHERE csat_internal.class_program(class_type) IN ('basic','advanced')
   AND NOT EXISTS(SELECT 1 FROM public.learning_records r WHERE r.class_id=classes.class_id AND r.kind='class')
   ORDER BY class_id
 LOOP
  SELECT template_id INTO STRICT tid FROM public.learning_defaults WHERE program=c.program;
  b:=jsonb_build_object('goal','','focus_tags','[]'::jsonb,'next_step','','stage_index',NULL,'title','','content','','continuation','','program',c.program,'format',NULL,'template_id',tid);
  INSERT INTO public.learning_records(class_id,kind,draft,published,published_at)
   VALUES(c.class_id,'class',b,b,now()) RETURNING record_id INTO rid;
  -- Direct owner migration; actor_id remains NULL instead of impersonating an admin.
  INSERT INTO public.learning_history(record_id,revision,body,was_published,actor_id) VALUES(rid,1,b,true,NULL);
 END LOOP;
END $$;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260911_17');
NOTIFY pgrst,'reload schema';
COMMIT;
