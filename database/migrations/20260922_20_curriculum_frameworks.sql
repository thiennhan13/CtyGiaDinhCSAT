-- Approved curriculum refresh. Independent of email migrations 18/19.
-- Apply only after backup/review; never run against production from the application.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260911_17') THEN RAISE EXCEPTION 'Apply migration 17 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260922_20') THEN RAISE EXCEPTION 'Curriculum migration already applied'; END IF;
END $$;
LOCK TABLE public.classes,public.learning_records,public.learning_defaults,public.learning_templates IN SHARE ROW EXCLUSIVE MODE;
CREATE OR REPLACE FUNCTION csat_internal.valid_learning_body_v1(b jsonb, k text)
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


CREATE OR REPLACE FUNCTION csat_internal.valid_learning_body(b jsonb,k text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE c jsonb; f text; x jsonb;
BEGIN
 IF csat_internal.valid_learning_body_v1(b-'curriculum',k) IS NOT TRUE THEN RETURN false; END IF;
 IF NOT b ? 'curriculum' THEN RETURN true; END IF;
 c:=b->'curriculum';
 IF k<>'class' OR jsonb_typeof(c) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF NOT c ?& ARRAY['parts','excluded_stage_ids','excluded_topic_codes','current_stage_id'] OR c-ARRAY['parts','excluded_stage_ids','excluded_topic_codes','current_stage_id']<>'{}'::jsonb THEN RETURN false; END IF;
 FOREACH f IN ARRAY ARRAY['parts','excluded_stage_ids','excluded_topic_codes'] LOOP
  IF jsonb_typeof(c->f) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(c->f)>(CASE f WHEN 'parts' THEN 2 WHEN 'excluded_stage_ids' THEN 30 ELSE 100 END) OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(c->f))<>jsonb_array_length(c->f) THEN RETURN false; END IF;
  FOR x IN SELECT value FROM jsonb_array_elements(c->f) LOOP
   IF jsonb_typeof(x)<>'string' OR length(x#>>'{}')>64 THEN RETURN false; END IF;
   IF f='parts' AND x#>>'{}' NOT IN ('A','B') THEN RETURN false; END IF;
   IF f='excluded_topic_codes' AND x#>>'{}' !~ '^[A-D][0-9]{2}$' THEN RETURN false; END IF;
  END LOOP;
 END LOOP;
 IF jsonb_array_length(c->'parts')=0 THEN RETURN false; END IF;
 IF c->>'current_stage_id' IS NOT NULL AND (jsonb_typeof(c->'current_stage_id')<>'string' OR length(c->>'current_stage_id')>64) THEN RETURN false; END IF;
 RETURN true;
END $$;

CREATE FUNCTION csat_internal.validate_curriculum(stages jsonb,b jsonb,publish boolean) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE c jsonb:=coalesce(b->'curriculum','{"parts":["A","B"],"excluded_stage_ids":[],"excluded_topic_codes":[],"current_stage_id":null}'::jsonb); s jsonb; l jsonb; n integer:=0; current_ok boolean:=false; code text;
BEGIN
 IF NOT (stages->0 ? 'id') THEN
  IF b ? 'curriculum' THEN RAISE EXCEPTION 'Phiên bản cũ không hỗ trợ cấu hình theo mã.' USING ERRCODE='22023'; END IF;
  RETURN;
 END IF;
 IF b->>'stage_index' IS NOT NULL THEN RAISE EXCEPTION 'Khung mới dùng mã chặng.' USING ERRCODE='22023'; END IF;
 IF b->>'program'='advanced' AND NOT (c->'parts' @> '["A","B"]'::jsonb) THEN RAISE EXCEPTION 'Nâng cao là một khung thống nhất.' USING ERRCODE='22023'; END IF;
 FOR code IN SELECT jsonb_array_elements_text(c->'excluded_stage_ids') LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(stages) st WHERE st->>'id'=code) THEN RAISE EXCEPTION 'Mã chặng không thuộc giáo án.' USING ERRCODE='22023'; END IF;
 END LOOP;
 FOR code IN SELECT jsonb_array_elements_text(c->'excluded_topic_codes') LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(stages) st CROSS JOIN LATERAL jsonb_array_elements(st->'lessons') lt WHERE lt->>'code'=code) THEN RAISE EXCEPTION 'Mã chủ đề không thuộc giáo án.' USING ERRCODE='22023'; END IF;
 END LOOP;
 FOR s IN SELECT value FROM jsonb_array_elements(stages) LOOP
  IF (s->>'part'='CD' OR c->'parts' ? (s->>'part')) AND NOT c->'excluded_stage_ids' ? (s->>'id') THEN
   FOR l IN SELECT value FROM jsonb_array_elements(s->'lessons') LOOP
    IF NOT c->'excluded_topic_codes' ? (l->>'code') THEN
     n:=n+1; IF s->>'id'=c->>'current_stage_id' THEN current_ok:=true; END IF;
    END IF;
   END LOOP;
  END IF;
 END LOOP;
 IF c->>'current_stage_id' IS NOT NULL AND NOT current_ok THEN RAISE EXCEPTION 'Chặng đang tập trung đã bị loại. Hãy xác nhận lại.' USING ERRCODE='22023'; END IF;
 IF publish AND n=0 THEN RAISE EXCEPTION 'Giữ lại ít nhất một chủ đề trước khi công bố.' USING ERRCODE='22023'; END IF;
END $$;
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
   PERFORM csat_internal.validate_curriculum(template.stages,p_body,p_publish);
   IF p_body->>'stage_index' IS NOT NULL AND ((p_body->>'stage_index')::integer<0 OR (p_body->>'stage_index')::integer>=jsonb_array_length(template.stages)) THEN RAISE EXCEPTION 'Chặng học không hợp lệ.' USING ERRCODE='22023'; END IF;
  ELSIF p_body ? 'curriculum' THEN RAISE EXCEPTION 'Chọn khung kiến thức mới trước khi cấu hình.' USING ERRCODE='22023';
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


-- Validate keyed catalogs even when the admin RPC is called directly.
CREATE FUNCTION csat_internal.check_curriculum_template() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE st jsonb; lt jsonb; ids text[]:='{}'; codes text[]:='{}';
BEGIN
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.stages) x WHERE x ? 'id' OR x ? 'part' OR EXISTS(SELECT 1 FROM jsonb_array_elements(x->'lessons') y WHERE y ? 'code')) THEN RETURN NEW; END IF;
 FOR st IN SELECT value FROM jsonb_array_elements(NEW.stages) LOOP
  IF jsonb_typeof(st->'id') IS DISTINCT FROM 'string' OR jsonb_typeof(st->'part') IS DISTINCT FROM 'string' OR coalesce(st->>'id','') !~ '^[a-z0-9-]{1,64}$' OR st->>'id'=ANY(ids) OR coalesce(st->>'part','') NOT IN ('A','B','CD') OR jsonb_typeof(st->'lessons') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Mã chặng không hợp lệ.' USING ERRCODE='22023'; END IF;
  IF jsonb_array_length(st->'lessons')=0 OR NEW.program NOT IN ('basic','advanced') OR (NEW.program='basic' AND st->>'part'='CD') OR (NEW.program='advanced' AND st->>'part'<>'CD') THEN RAISE EXCEPTION 'Tầng kiến thức không khớp chương trình.' USING ERRCODE='22023'; END IF;
  ids:=array_append(ids,st->>'id');
  FOR lt IN SELECT value FROM jsonb_array_elements(st->'lessons') LOOP
   IF jsonb_typeof(lt->'code') IS DISTINCT FROM 'string' OR coalesce(lt->>'code','') !~ '^[A-D][0-9]{2}$' OR lt->>'code'=ANY(codes) OR (st->>'part'='CD' AND left(lt->>'code',1) NOT IN ('C','D')) OR (st->>'part'<>'CD' AND left(lt->>'code',1)<>st->>'part') THEN RAISE EXCEPTION 'Mã chủ đề không hợp lệ.' USING ERRCODE='22023'; END IF;
   codes:=array_append(codes,lt->>'code');
  END LOOP;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION csat_internal.check_curriculum_template() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER validate_curriculum_template BEFORE INSERT ON public.learning_templates FOR EACH ROW EXECUTE FUNCTION csat_internal.check_curriculum_template();

-- Before/after snapshots include draft AND published data. Existing history stays immutable.
CREATE TABLE csat_internal.curriculum_migration_snapshots (
 record_id uuid PRIMARY KEY REFERENCES public.learning_records ON DELETE RESTRICT,
 before_record jsonb NOT NULL, after_record jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON csat_internal.curriculum_migration_snapshots FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER immutable_curriculum_snapshots BEFORE UPDATE OR DELETE ON csat_internal.curriculum_migration_snapshots FOR EACH ROW EXECUTE FUNCTION csat_internal.immutable_record();
INSERT INTO public.learning_templates(program,version,title,source,stages) SELECT 'basic',coalesce(max(version),0)+1,'CSAT · Cơ bản · A + B','Danh sách kiến thức (1).xlsx · bản tiếp nhận 22/09/2026. Tên chặng là cách tổ chức nội dung, không quy định số buổi.','[{"id": "basic-a-1", "part": "A", "title": "Diễn đạt bài toán bằng chương trình", "range": "", "description": "Làm quen với cách nhập, xử lý và xuất dữ liệu; diễn đạt các điều kiện và thao tác lặp bằng chương trình.", "outcomes": [], "lessons": [{"code": "A01", "range": "", "title": "Nhập môn: Môi trường và I/O", "description": "cin/cout, freopen", "source": "Danh sách kiến thức (1).xlsx · Phần A · A01"}, {"code": "A02", "range": "", "title": "Nhập môn: Kiểu dữ liệu, ép kiểu và toán tử", "description": "", "source": "Danh sách kiến thức (1).xlsx · Phần A · A02"}, {"code": "A03", "range": "", "title": "Nhập môn: Cấu trúc rẽ nhánh", "description": "if/else, switch", "source": "Danh sách kiến thức (1).xlsx · Phần A · A03"}, {"code": "A04", "range": "", "title": "Nhập môn: Cấu trúc lặp", "description": "for, while, lồng nhau", "source": "Danh sách kiến thức (1).xlsx · Phần A · A04"}]}, {"id": "basic-a-2", "part": "A", "title": "Biểu diễn và xử lý dữ liệu bằng mảng", "range": "", "description": "Tổ chức dữ liệu thành dãy và bảng; luyện duyệt, thống kê và biến đổi dữ liệu.", "outcomes": [], "lessons": [{"code": "A05", "range": "", "title": "Nhập môn: Mảng 1 chiều - Cơ bản", "description": "duyệt, max/min, đếm", "source": "Danh sách kiến thức (1).xlsx · Phần A · A05"}, {"code": "A06", "range": "", "title": "Nhập môn: Mảng 1 chiều - Thao tác", "description": "đảo, chèn, xoá", "source": "Danh sách kiến thức (1).xlsx · Phần A · A06"}, {"code": "A07", "range": "", "title": "Nhập môn: Mảng 2 chiều", "description": "ma trận, duyệt đường chéo, xoay", "source": "Danh sách kiến thức (1).xlsx · Phần A · A07"}]}, {"id": "basic-a-3", "part": "A", "title": "Tổ chức chương trình và xử lý văn bản", "range": "", "description": "Chia chương trình thành hàm và làm quen với biểu diễn, xử lý xâu ký tự.", "outcomes": [], "lessons": [{"code": "A08", "range": "", "title": "Nhập môn: Hàm", "description": "tham trị, tham chiếu, phạm vi biến", "source": "Danh sách kiến thức (1).xlsx · Phần A · A08"}, {"code": "A09", "range": "", "title": "Nhập môn: Xâu ký tự cơ bản", "description": "ASCII, getline, hàm thư viện string, xử lý xâu đơn giản", "source": "Danh sách kiến thức (1).xlsx · Phần A · A09"}]}, {"id": "basic-b-1", "part": "B", "title": "Duyệt phương án và thống kê", "range": "", "description": "Tìm lời giải bằng cách xét các phương án và tổ chức dữ liệu đếm.", "outcomes": [], "lessons": [{"code": "B01", "range": "", "title": "Cơ bản: Vét cạn", "description": "duyệt tổ hợp, đếm có điều kiện", "source": "Danh sách kiến thức (1).xlsx · Phần B · B01"}, {"code": "B02", "range": "", "title": "Mảng thống kê", "description": "", "source": "Danh sách kiến thức (1).xlsx · Phần B · B02"}]}, {"id": "basic-b-2", "part": "B", "title": "Khai thác tính chất số học", "range": "", "description": "Vận dụng tính chất của số, ước và số nguyên tố để xây dựng cách giải.", "outcomes": [], "lessons": [{"code": "B03", "range": "", "title": "Cơ bản: Số chính phương", "description": "", "source": "Danh sách kiến thức (1).xlsx · Phần B · B03"}, {"code": "B04", "range": "", "title": "Số học: Kiểm tra số nguyên tố và đếm ước", "description": "O(√n)", "source": "Danh sách kiến thức (1).xlsx · Phần B · B04"}, {"code": "B05", "range": "", "title": "Số học: Sàng nguyên tố Eratosthenes", "description": "", "source": "Danh sách kiến thức (1).xlsx · Phần B · B05"}, {"code": "B06", "range": "", "title": "Số học: Thuật toán Euclid", "description": "ƯCLN, BCNN", "source": "Danh sách kiến thức (1).xlsx · Phần B · B06"}, {"code": "B07", "range": "", "title": "Số học: Phân tích thừa số nguyên tố", "description": "", "source": "Danh sách kiến thức (1).xlsx · Phần B · B07"}, {"code": "B08", "range": "", "title": "Số học: Công thức Legendre", "description": "Bậc của số nguyên tố trong N!", "source": "Danh sách kiến thức (1).xlsx · Phần B · B08"}, {"code": "B09", "range": "", "title": "Số học: Modulo, luỹ thừa nhanh, đổi hệ cơ số, Nhân ấn độ", "description": "", "source": "Danh sách kiến thức (1).xlsx · Phần B · B09"}]}, {"id": "basic-b-3", "part": "B", "title": "Tổ chức dữ liệu và sắp xếp", "range": "", "description": "Lựa chọn cách lưu trữ và sắp xếp để thuận tiện truy cập, xử lý dữ liệu.", "outcomes": [], "lessons": [{"code": "B10", "range": "", "title": "CTDL: Vector cơ bản", "description": "", "source": "Danh sách kiến thức (1).xlsx · Phần B · B10"}, {"code": "B11", "range": "", "title": "CTDL: Pair, Struct cơ bản", "description": "", "source": "Danh sách kiến thức (1).xlsx · Phần B · B11"}, {"code": "B12", "range": "", "title": "CTDL: Map cơ bản", "description": "", "source": "Danh sách kiến thức (1).xlsx · Phần B · B12"}, {"code": "B13", "range": "", "title": "Sắp xếp: Thuật toán cơ bản & hàm sort()", "description": "+ comparator", "source": "Danh sách kiến thức (1).xlsx · Phần B · B13"}]}, {"id": "basic-b-4", "part": "B", "title": "Tìm kiếm và xử lý xâu", "range": "", "description": "Làm quen tìm kiếm trên dữ liệu đã sắp xếp và các bài toán xử lý xâu.", "outcomes": [], "lessons": [{"code": "B14", "range": "", "title": "Chặt nhị phân: Vòng 1", "description": "trên mảng đã sắp, lower/upper_bound", "source": "Danh sách kiến thức (1).xlsx · Phần B · B14"}, {"code": "B15", "range": "", "title": "Xử lý xâu : Nâng cao", "description": "tách từ và chuẩn hoá, Palindrome và đối xứng (kiểm tra, tìm, đếm)", "source": "Danh sách kiến thức (1).xlsx · Phần B · B15"}]}]'::jsonb FROM public.learning_templates WHERE program='basic';
INSERT INTO public.learning_defaults(program,template_id) SELECT program,template_id FROM public.learning_templates WHERE program='basic' ORDER BY version DESC LIMIT 1 ON CONFLICT(program) DO UPDATE SET template_id=excluded.template_id;
INSERT INTO public.learning_templates(program,version,title,source,stages) SELECT 'advanced',coalesce(max(version),0)+1,'CSAT · Nâng cao','Danh sách kiến thức (1).xlsx · bản tiếp nhận 22/09/2026. Tên chặng là cách tổ chức nội dung, không quy định số buổi.','[{"id": "advanced-1", "part": "CD", "title": "Tiền xử lý và kỹ thuật trên mảng", "range": "", "description": "Tổ chức phép tính trên dãy và bảng; khai thác quan hệ giữa các đoạn dữ liệu.", "outcomes": [], "lessons": [{"code": "C01", "range": "", "title": "Kỹ thuật mảng: Mảng cộng dồn", "description": "1D & 2D", "source": "Danh sách kiến thức (1).xlsx · Phần C · C01"}, {"code": "C02", "range": "", "title": "Kỹ thuật mảng: Mảng hiệu", "description": "Difference array", "source": "Danh sách kiến thức (1).xlsx · Phần C · C02"}, {"code": "C03", "range": "", "title": "Kỹ thuật mảng: Hai con trỏ, cửa sổ trượt", "description": "", "source": "Danh sách kiến thức (1).xlsx · Phần C · C03"}]}, {"id": "advanced-2", "part": "CD", "title": "Lựa chọn cấu trúc dữ liệu", "range": "", "description": "Tìm hiểu các cấu trúc dữ liệu phục vụ lưu trữ, truy cập và xử lý theo thứ tự phù hợp.", "outcomes": [], "lessons": [{"code": "C04", "range": "", "title": "Cấu trúc dữ liệu: Tuyến tính", "description": "vector, pair, unique", "source": "Danh sách kiến thức (1).xlsx · Phần C · C04"}, {"code": "C05", "range": "", "title": "Cấu trúc dữ liệu: Cây & Băm", "description": "set, map, mảng đếm", "source": "Danh sách kiến thức (1).xlsx · Phần C · C05"}, {"code": "C06", "range": "", "title": "Cấu trúc dữ liệu: Hàng đợi & Ngăn xếp", "description": "queue, deque, stack", "source": "Danh sách kiến thức (1).xlsx · Phần C · C06"}]}, {"id": "advanced-3", "part": "CD", "title": "Đệ quy, chia để trị và quay lui", "range": "", "description": "Phân rã bài toán, sinh phương án và kiểm soát không gian tìm kiếm.", "outcomes": [], "lessons": [{"code": "C07", "range": "", "title": "Đệ quy & Chia để trị", "description": "đệ quy có nhớ, merge sort", "source": "Danh sách kiến thức (1).xlsx · Phần C · C07"}, {"code": "C08", "range": "", "title": "Quay lui: Sinh tổ hợp", "description": "nhị phân, hoán vị, xâu", "source": "Danh sách kiến thức (1).xlsx · Phần C · C08"}, {"code": "C09", "range": "", "title": "Quay lui: Mô hình", "description": "N quân hậu, mã đi tuần, cắt nhánh", "source": "Danh sách kiến thức (1).xlsx · Phần C · C09"}]}, {"id": "advanced-4", "part": "CD", "title": "Tham lam, tìm kiếm trên đáp án và băm", "range": "", "description": "Tiếp cận bài toán bằng lựa chọn tham lam, kiểm tra đáp án và biểu diễn xâu bằng băm.", "outcomes": [], "lessons": [{"code": "C10", "range": "", "title": "Tham lam", "description": "chọn hoạt động, đổi tiền, xếp lịch", "source": "Danh sách kiến thức (1).xlsx · Phần C · C10"}, {"code": "C11", "range": "", "title": "Chặt nhị phân: Vòng 2", "description": "chặt trên đáp án, hàm check", "source": "Danh sách kiến thức (1).xlsx · Phần C · C11"}, {"code": "C12", "range": "", "title": "Xử lý xâu: Thuật toán Hashing", "description": "", "source": "Danh sách kiến thức (1).xlsx · Phần C · C12"}]}, {"id": "advanced-5", "part": "CD", "title": "Xây dựng trạng thái quy hoạch động", "range": "", "description": "Mô tả trạng thái và liên hệ giữa các bài toán con qua các mô hình quy hoạch động.", "outcomes": [], "lessons": [{"code": "D01", "range": "", "title": "QHĐ: Nhập môn", "description": "leo bậc thang, tam giác số, Kadane", "source": "Danh sách kiến thức (1).xlsx · Phần D · D01"}, {"code": "D02", "range": "", "title": "QHĐ: Trên lưới", "description": "đường đi lớn nhất, đếm cách đi", "source": "Danh sách kiến thức (1).xlsx · Phần D · D02"}, {"code": "D03", "range": "", "title": "QHĐ: Cái túi", "description": "Knapsack 0/1, không giới hạn số lượng", "source": "Danh sách kiến thức (1).xlsx · Phần D · D03"}, {"code": "D04", "range": "", "title": "QHĐ: Chia tập", "description": "đổi tiền, chia kẹo", "source": "Danh sách kiến thức (1).xlsx · Phần D · D04"}]}, {"id": "advanced-6", "part": "CD", "title": "Quy hoạch động trên dãy, xâu và mở rộng", "range": "", "description": "Tiếp tục vận dụng quy hoạch động trên dãy, xâu và các trạng thái mở rộng.", "outcomes": [], "lessons": [{"code": "D05", "range": "", "title": "QHĐ: LIS", "description": "dãy con tăng dài nhất, truy vết", "source": "Danh sách kiến thức (1).xlsx · Phần D · D05"}, {"code": "D06", "range": "", "title": "QHĐ: LCS & Xâu", "description": "xâu con chung dài nhất, Edit Distance", "source": "Danh sách kiến thức (1).xlsx · Phần D · D06"}, {"code": "D07", "range": "", "title": "QHĐ: Mở rộng", "description": "trạng thái 2 chiều, chia đoạn", "source": "Danh sách kiến thức (1).xlsx · Phần D · D07"}]}]'::jsonb FROM public.learning_templates WHERE program='advanced';
INSERT INTO public.learning_defaults(program,template_id) SELECT program,template_id FROM public.learning_templates WHERE program='advanced' ORDER BY version DESC LIMIT 1 ON CONFLICT(program) DO UPDATE SET template_id=excluded.template_id;

DO $$
DECLARE c record; r public.learning_records%ROWTYPE; before_row jsonb; tid uuid; patch jsonb; b jsonb;
BEGIN
 FOR c IN SELECT class_id,csat_internal.class_program(class_type) program FROM public.classes WHERE csat_internal.class_program(class_type) IN ('basic','advanced') ORDER BY class_id LOOP
  SELECT template_id INTO STRICT tid FROM public.learning_defaults WHERE program=c.program;
  patch:=jsonb_build_object('program',c.program,'template_id',tid,'stage_index',NULL,'curriculum','{"parts":["A","B"],"excluded_stage_ids":[],"excluded_topic_codes":[],"current_stage_id":null}'::jsonb);
  SELECT * INTO r FROM public.learning_records WHERE class_id=c.class_id AND kind='class' FOR UPDATE;
  IF FOUND THEN
   before_row:=to_jsonb(r);
   UPDATE public.learning_records SET draft=draft||patch,published=CASE WHEN published IS NULL THEN NULL ELSE published||patch END,revision=revision+1,updated_at=clock_timestamp() WHERE record_id=r.record_id RETURNING * INTO r;
   INSERT INTO csat_internal.curriculum_migration_snapshots(record_id,before_record,after_record) VALUES(r.record_id,before_row,to_jsonb(r));
   INSERT INTO public.learning_history(record_id,revision,body,was_published) VALUES(r.record_id,r.revision,r.draft,false);
  ELSE
   b:=jsonb_build_object('goal','','focus_tags','[]'::jsonb,'next_step','','title','','content','','continuation','','format',NULL)||patch;
   INSERT INTO public.learning_records(class_id,kind,draft,published,published_at) VALUES(c.class_id,'class',b,b,now()) RETURNING * INTO r;
   INSERT INTO csat_internal.curriculum_migration_snapshots(record_id,before_record,after_record) VALUES(r.record_id,'null'::jsonb,to_jsonb(r));
   INSERT INTO public.learning_history(record_id,revision,body,was_published) VALUES(r.record_id,r.revision,b,true);
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION csat_internal.valid_learning_body_v1(jsonb,text),csat_internal.validate_curriculum(jsonb,jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260922_20');
NOTIFY pgrst,'reload schema';
COMMIT;
