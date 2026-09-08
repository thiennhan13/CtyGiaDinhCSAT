-- Student review tags, private drafts and explicit publishing.
-- Apply after 20260906_03_parent_phone_lookup.sql. Additive; legacy reviews stay published.
BEGIN;
ALTER TABLE public.student_reviews
  ADD COLUMN IF NOT EXISTS review_context TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS review_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'published';
-- Backfill only when adding the column, preserving chronology and subsequent edits on reruns.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='student_reviews' AND column_name='updated_at') THEN
    ALTER TABLE public.student_reviews ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
    UPDATE public.student_reviews SET updated_at=COALESCE(created_at,updated_at);
  END IF;
END $$;

-- The immutable, versioned catalog is embedded to validate direct writes as well as API writes.
CREATE OR REPLACE FUNCTION public.valid_student_review_tags(p_tags JSONB,p_status TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  catalog CONSTANT JSONB := $catalog${"k-io":{"label":"Nhập–xuất dữ liệu","group":"knowledge"},"k-types":{"label":"Biến, kiểu dữ liệu & phép tính","group":"knowledge"},"k-conditions":{"label":"Điều kiện & chia trường hợp","group":"knowledge"},"k-loops":{"label":"Vòng lặp & mô phỏng","group":"knowledge"},"k-arrays":{"label":"Mảng & bài toán dãy","group":"knowledge"},"k-frequency":{"label":"Đánh dấu & đếm tần suất","group":"knowledge"},"k-sorting":{"label":"Sắp xếp dữ liệu","group":"knowledge"},"k-functions":{"label":"Hàm & tổ chức chương trình","group":"knowledge"},"k-divisors":{"label":"Chia hết, ước & số chính phương","group":"knowledge"},"k-primes":{"label":"Số nguyên tố & sàng","group":"knowledge"},"k-gcd":{"label":"ƯCLN, BCNN & Euclid","group":"knowledge"},"k-factors":{"label":"Thừa số nguyên tố & bài áp dụng","group":"knowledge"},"k-modulo":{"label":"Modulo & lũy thừa nhanh","group":"knowledge"},"k-strings":{"label":"Xâu ký tự & xử lý xâu","group":"knowledge"},"k-matrix":{"label":"Ma trận & mảng hai chiều","group":"knowledge"},"k-prefix":{"label":"Mảng cộng dồn & tổng đoạn","group":"knowledge"},"k-difference":{"label":"Mảng hiệu & cập nhật đoạn","group":"knowledge"},"k-vector":{"label":"Vector, pair & dữ liệu có thuộc tính","group":"knowledge"},"k-stack":{"label":"Stack — ngăn xếp","group":"knowledge"},"k-queue":{"label":"Queue & Deque — hàng đợi","group":"knowledge"},"k-set":{"label":"Set & Multiset","group":"knowledge"},"k-map":{"label":"Map — ánh xạ khóa–giá trị","group":"knowledge"},"k-greedy":{"label":"Thuật toán tham lam","group":"knowledge"},"k-two-pointers":{"label":"Hai con trỏ & cửa sổ trượt","group":"knowledge"},"k-binary":{"label":"Tìm kiếm nhị phân","group":"knowledge"},"k-hashing":{"label":"Hashing — băm xâu nhập môn","group":"knowledge"},"k-dp-state":{"label":"Quy hoạch động — trạng thái & chuyển","group":"knowledge"},"k-dp-grid":{"label":"Quy hoạch động trên lưới","group":"knowledge"},"k-knapsack":{"label":"Cái túi 0/1 & chọn tập con","group":"knowledge"},"k-lis":{"label":"LIS — dãy con tăng dài nhất","group":"knowledge"},"k-brute":{"label":"Vét cạn & kiểm chứng lời giải","group":"knowledge"},"k-recursion":{"label":"Đệ quy & quay lui cơ bản","group":"knowledge"},"s-reading":{"label":"Đọc đề & xác định ràng buộc","group":"skill"},"s-model":{"label":"Mô hình hóa bài toán","group":"skill"},"s-select":{"label":"Lựa chọn thuật toán","group":"skill"},"s-correctness":{"label":"Lập luận tính đúng","group":"skill"},"s-complexity":{"label":"Phân tích độ phức tạp","group":"skill"},"s-code":{"label":"Chuyển ý tưởng thành chương trình","group":"skill"},"s-index":{"label":"Kiểm soát chỉ số & điều kiện biên","group":"skill"},"s-types":{"label":"Chọn kiểu dữ liệu & kiểm soát tràn số","group":"skill"},"s-test":{"label":"Tự tạo dữ liệu kiểm thử","group":"skill"},"s-debug":{"label":"Tìm nguyên nhân & sửa lỗi","group":"skill"},"s-trace":{"label":"Theo dõi trạng thái & truy vết","group":"skill"},"s-explain":{"label":"Trình bày & giải thích lời giải","group":"skill"},"p-pattern":{"label":"Nhận ra quy luật của bài toán","group":"strength"},"p-logic":{"label":"Lập luận mạch lạc, có căn cứ","group":"strength"},"p-alternative":{"label":"Đề xuất được cách giải khác","group":"strength"},"p-counterexample":{"label":"Tự tìm được phản ví dụ","group":"strength"},"p-careful":{"label":"Kiểm chứng lời giải cẩn thận","group":"strength"},"p-clear":{"label":"Giải thích rõ ràng, dễ theo dõi","group":"strength"},"p-connect":{"label":"Kết nối được kiến thức đã học","group":"strength"},"p-organized":{"label":"Tổ chức chương trình rõ ràng","group":"strength"},"r-independent":{"label":"Tự giải với ít gợi ý hơn","group":"progress"},"r-index":{"label":"Kiểm soát chỉ số tốt hơn","group":"progress"},"r-types":{"label":"Chọn kiểu dữ liệu phù hợp hơn","group":"progress"},"r-explain":{"label":"Trình bày lời giải rõ hơn","group":"progress"},"r-efficiency":{"label":"Biết so sánh hiệu quả cách giải","group":"progress"},"r-transfer":{"label":"Vận dụng tốt hơn ở bài biến thể","group":"progress"},"h-ask":{"label":"Chủ động hỏi khi chưa rõ","group":"habit"},"h-practice":{"label":"Hoàn thành phần luyện tập đã thống nhất","group":"habit"},"h-revise":{"label":"Giải lại bài sau khi được góp ý","group":"habit"},"h-persist":{"label":"Kiên trì thử và kiểm tra cách làm","group":"habit"},"h-prepare":{"label":"Chuẩn bị câu hỏi trước buổi học","group":"habit"},"h-reference":{"label":"Tự giải thích phần đã tham khảo","group":"habit"}}$catalog$::jsonb;
  item JSONB; definition JSONB; item_id TEXT; field TEXT; seen TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF p_tags IS NULL OR jsonb_typeof(p_tags) <> 'array' OR p_status NOT IN ('draft','published') OR p_status IS NULL THEN RETURN false; END IF;
  IF jsonb_array_length(p_tags)>64 THEN RETURN false; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_tags) LOOP
    IF jsonb_typeof(item)<>'object' THEN RETURN false; END IF;
    IF item - ARRAY['tag_id','level','evidence','comparison','next_step','propose_focus','label','group','catalog_version'] <> '{}'::jsonb THEN RETURN false; END IF;
    FOREACH field IN ARRAY ARRAY['tag_id','level','evidence','comparison','next_step','label','group'] LOOP
      IF jsonb_typeof(item->field) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
    END LOOP;
    IF jsonb_typeof(item->'propose_focus') IS DISTINCT FROM 'boolean'
       OR item->'catalog_version' IS DISTINCT FROM '1'::jsonb THEN RETURN false; END IF;
    item_id := item->>'tag_id'; definition := catalog->item_id;
    IF definition IS NULL OR item_id=ANY(seen) THEN RETURN false; END IF;
    seen := array_append(seen,item_id);
    IF item->>'label' IS DISTINCT FROM definition->>'label' OR item->>'group' IS DISTINCT FROM definition->>'group' THEN RETURN false; END IF;
    IF item->>'level' NOT IN ('','consolidate','guided','independent','transfer') THEN RETURN false; END IF;
    IF length(item->>'evidence')>700 OR length(item->>'comparison')>400 OR length(item->>'next_step')>300 THEN RETURN false; END IF;
    IF definition->>'group' NOT IN ('knowledge','skill') AND ((item->>'level')<>'' OR (item->>'propose_focus')::boolean) THEN RETURN false; END IF;
    IF definition->>'group'<>'progress' AND (item->>'comparison')<>'' THEN RETURN false; END IF;
    IF p_status='published' THEN
      IF NOT ((item->>'evidence') ~ '[^[:space:]]') THEN RETURN false; END IF;
      IF definition->>'group' IN ('knowledge','skill') AND item->>'level'='' THEN RETURN false; END IF;
      IF definition->>'group'='progress' AND NOT ((item->>'comparison') ~ '[^[:space:]]') THEN RETURN false; END IF;
      IF (item->>'propose_focus')::boolean AND NOT ((item->>'next_step') ~ '[^[:space:]]') THEN RETURN false; END IF;
    END IF;
  END LOOP;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.valid_student_review_tags(JSONB,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.valid_student_review_tags(JSONB,TEXT) TO authenticated,service_role;

ALTER TABLE public.student_reviews DROP CONSTRAINT IF EXISTS student_review_tags_valid;
ALTER TABLE public.student_reviews ADD CONSTRAINT student_review_tags_valid
  CHECK (public.valid_student_review_tags(review_tags,review_status));
ALTER TABLE public.student_reviews DROP CONSTRAINT IF EXISTS student_review_context_valid;
ALTER TABLE public.student_reviews ADD CONSTRAINT student_review_context_valid
  CHECK (length(review_context)<=120 AND (review_status='draft' OR jsonb_array_length(review_tags)=0 OR review_context ~ '[^[:space:]]'));
CREATE INDEX IF NOT EXISTS idx_student_reviews_tutor_context
  ON public.student_reviews(tutor_id,class_id,student_id,updated_at DESC);

CREATE OR REPLACE FUNCTION public.guard_student_review_write()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP='UPDATE' AND public.is_admin() IS NOT TRUE AND current_user NOT IN ('postgres','service_role') THEN
    IF OLD.review_status='published' OR NEW.review_id IS DISTINCT FROM OLD.review_id
      OR NEW.tutor_id IS DISTINCT FROM OLD.tutor_id OR NEW.class_id IS DISTINCT FROM OLD.class_id
      OR NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Cannot change ownership or a published review.' USING ERRCODE='42501';
    END IF;
  END IF;
  NEW.updated_at := clock_timestamp();
  IF TG_OP='INSERT' THEN NEW.created_at := NEW.updated_at; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_student_review_write ON public.student_reviews;
CREATE TRIGGER guard_student_review_write BEFORE INSERT OR UPDATE ON public.student_reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_review_write();
REVOKE ALL ON FUNCTION public.guard_student_review_write() FROM PUBLIC,anon;

DROP POLICY IF EXISTS "Tutor_Write_Assigned_Reviews" ON public.student_reviews;
DROP POLICY IF EXISTS "Tutor_Insert_Assigned_Reviews" ON public.student_reviews;
DROP POLICY IF EXISTS "Tutor_Update_Draft_Reviews" ON public.student_reviews;
DROP POLICY IF EXISTS "Tutor_Delete_Draft_Reviews" ON public.student_reviews;
CREATE POLICY "Tutor_Insert_Assigned_Reviews" ON public.student_reviews FOR INSERT TO authenticated
WITH CHECK (tutor_id=public.current_tutor_id() AND EXISTS (
  SELECT 1 FROM public.classes c JOIN public.class_students cs ON cs.class_id=c.class_id
  JOIN public.students s ON s.student_id=cs.student_id
  WHERE c.class_id=student_reviews.class_id AND cs.student_id=student_reviews.student_id
    AND c.tutor_id=public.current_tutor_id() AND cs.status='active' AND s.is_deleted IS NOT TRUE
));
CREATE POLICY "Tutor_Update_Draft_Reviews" ON public.student_reviews FOR UPDATE TO authenticated
USING (review_status='draft' AND tutor_id=public.current_tutor_id() AND EXISTS (
  SELECT 1 FROM public.classes c JOIN public.class_students cs ON cs.class_id=c.class_id
  JOIN public.students s ON s.student_id=cs.student_id
  WHERE c.class_id=student_reviews.class_id AND cs.student_id=student_reviews.student_id
    AND c.tutor_id=public.current_tutor_id() AND cs.status='active' AND s.is_deleted IS NOT TRUE
)) WITH CHECK (tutor_id=public.current_tutor_id() AND EXISTS (
  SELECT 1 FROM public.classes c JOIN public.class_students cs ON cs.class_id=c.class_id
  JOIN public.students s ON s.student_id=cs.student_id
  WHERE c.class_id=student_reviews.class_id AND cs.student_id=student_reviews.student_id
    AND c.tutor_id=public.current_tutor_id() AND cs.status='active' AND s.is_deleted IS NOT TRUE
));
CREATE POLICY "Tutor_Delete_Draft_Reviews" ON public.student_reviews FOR DELETE TO authenticated
USING (review_status='draft' AND tutor_id=public.current_tutor_id() AND EXISTS (
  SELECT 1 FROM public.classes c WHERE c.class_id=student_reviews.class_id AND c.tutor_id=public.current_tutor_id()
));

CREATE OR REPLACE FUNCTION public.save_student_review(
  p_review_id UUID,p_student_id UUID,p_class_id UUID,p_expected_updated_at TIMESTAMPTZ,
  p_month_year TEXT,p_context TEXT,p_general TEXT,p_attitude TEXT,p_logical TEXT,p_status TEXT,p_tags JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  actor UUID := public.current_tutor_id();
  existing public.student_reviews%ROWTYPE;
  saved public.student_reviews%ROWTYPE;
BEGIN
  IF actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.classes c JOIN public.class_students cs ON cs.class_id=c.class_id
    JOIN public.students s ON s.student_id=cs.student_id
    WHERE c.class_id=p_class_id AND c.tutor_id=actor AND cs.student_id=p_student_id
      AND cs.status='active' AND s.is_deleted IS NOT TRUE
  ) THEN RAISE EXCEPTION 'Review access denied.' USING ERRCODE='42501'; END IF;
  IF p_review_id IS NULL OR p_month_year IS NULL OR p_month_year !~ '^(19|20|21)[0-9]{2}-(0[1-9]|1[0-2])$'
    OR p_context IS NULL OR p_general IS NULL OR p_attitude IS NULL OR p_logical IS NULL
    OR length(p_context)>120 OR length(p_general)>3000 OR length(p_attitude)>3000 OR length(p_logical)>3000
    OR public.valid_student_review_tags(p_tags,p_status) IS NOT TRUE THEN
    RAISE EXCEPTION 'Invalid review.' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(p_tags)=0 AND NOT ((p_general||p_attitude||p_logical) ~ '[^[:space:]]') THEN
    RAISE EXCEPTION 'A review needs content.' USING ERRCODE='22023';
  END IF;
  IF p_status='published' AND jsonb_array_length(p_tags)>0 AND NOT (p_context ~ '[^[:space:]]') THEN
    RAISE EXCEPTION 'A review needs context.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO existing FROM public.student_reviews WHERE review_id=p_review_id AND tutor_id=actor
    AND class_id=p_class_id AND student_id=p_student_id;
  IF FOUND THEN
    IF existing.review_status=p_status AND existing.month_year=p_month_year
      AND existing.review_context=p_context AND existing.review_tags=p_tags
      AND COALESCE(existing.general_assessment,'')=p_general AND COALESCE(existing.learning_attitude,'')=p_attitude
      AND COALESCE(existing.logical_thinking,'')=p_logical THEN RETURN to_jsonb(existing); END IF;
    IF existing.review_status='published' THEN RAISE EXCEPTION 'Review already published.' USING ERRCODE='23505'; END IF;
    IF existing.updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'Review changed in another session.' USING ERRCODE='40001';
    END IF;
    UPDATE public.student_reviews SET month_year=p_month_year,review_context=p_context,review_tags=p_tags,
      general_assessment=p_general,learning_attitude=p_attitude,logical_thinking=p_logical,review_status=p_status
    WHERE review_id=p_review_id AND updated_at=p_expected_updated_at RETURNING * INTO saved;
    IF NOT FOUND THEN RAISE EXCEPTION 'Review changed in another session.' USING ERRCODE='40001'; END IF;
  ELSE
    IF p_expected_updated_at IS NOT NULL THEN RAISE EXCEPTION 'Draft is unavailable.' USING ERRCODE='40001'; END IF;
    INSERT INTO public.student_reviews(review_id,student_id,tutor_id,class_id,month_year,review_context,
      general_assessment,learning_attitude,logical_thinking,review_status,review_tags)
    VALUES(p_review_id,p_student_id,actor,p_class_id,p_month_year,p_context,p_general,p_attitude,p_logical,p_status,p_tags)
    ON CONFLICT(review_id) DO NOTHING RETURNING * INTO saved;
    IF NOT FOUND THEN
      -- A concurrent retry may have inserted the same request. Never overwrite a different record.
      SELECT * INTO existing FROM public.student_reviews WHERE review_id=p_review_id AND tutor_id=actor
        AND class_id=p_class_id AND student_id=p_student_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Review access denied.' USING ERRCODE='42501'; END IF;
      IF existing.review_status=p_status AND existing.month_year=p_month_year
        AND existing.review_context=p_context AND existing.review_tags=p_tags
        AND COALESCE(existing.general_assessment,'')=p_general AND COALESCE(existing.learning_attitude,'')=p_attitude
        AND COALESCE(existing.logical_thinking,'')=p_logical THEN RETURN to_jsonb(existing); END IF;
      RAISE EXCEPTION 'Review changed in another session.' USING ERRCODE='40001';
    END IF;
  END IF;
  RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION public.save_student_review(UUID,UUID,UUID,TIMESTAMPTZ,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_student_review(UUID,UUID,UUID,TIMESTAMPTZ,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_parent_lookup(p_token_hash TEXT,p_student_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_parent public.parent_accounts%ROWTYPE;
  v_student_id UUID;
  v_children JSONB;
  v_student JSONB;
  v_reviews JSONB;
  v_classes JSONB;
  v_attendance BIGINT;
BEGIN
  SELECT p.* INTO v_parent FROM public.parent_accounts p
  JOIN public.parent_lookup_sessions s ON s.parent_id=p.parent_id
  WHERE s.token_hash=p_token_hash AND s.expires_at>CURRENT_TIMESTAMP AND p.active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tài khoản phụ huynh chưa được cấp quyền hoặc đã bị khóa.' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', s.student_id, 'name', s.name)
    ORDER BY s.name, s.student_id), '[]'::JSONB) INTO v_children
  FROM public.parent_student_links l JOIN public.students s ON s.student_id = l.student_id
  WHERE l.parent_id = v_parent.parent_id AND s.is_deleted IS NOT TRUE;
  IF p_student_id IS NULL THEN
    v_student_id := (v_children -> 0 ->> 'student_id')::UUID;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.parent_student_links l JOIN public.students s ON s.student_id = l.student_id
      WHERE l.parent_id = v_parent.parent_id AND l.student_id = p_student_id AND s.is_deleted IS NOT TRUE) THEN
      RAISE EXCEPTION 'Học sinh không thuộc quyền truy cập của tài khoản.' USING ERRCODE = '42501';
    END IF;
    v_student_id := p_student_id;
  END IF;
  IF v_student_id IS NOT NULL THEN
    SELECT jsonb_build_object('student_id', s.student_id, 'name', s.name, 'date_of_birth', s.date_of_birth,
      'province', s.province, 'status', s.status, 'parent_name', v_parent.display_name, 'parent_number', v_parent.phone)
    INTO v_student FROM public.students s WHERE s.student_id = v_student_id;
    SELECT COALESCE(jsonb_agg(r.payload ORDER BY r.updated_at DESC, r.review_id), '[]'::JSONB) INTO v_reviews FROM (
      SELECT sr.created_at, sr.updated_at, sr.review_id, jsonb_build_object('review_id', sr.review_id, 'month_year', sr.month_year,
        'general_assessment', sr.general_assessment, 'learning_attitude', sr.learning_attitude,
        'logical_thinking', sr.logical_thinking, 'created_at', sr.created_at,
        'review_context', sr.review_context, 'review_tags', sr.review_tags, 'updated_at', sr.updated_at,
        'tutors', jsonb_build_object('tutor_id', t.tutor_id, 'name', t.name),
        'classes', jsonb_build_object('class_id', c.class_id, 'name', c.name)) AS payload
      FROM public.student_reviews sr LEFT JOIN public.tutors t ON t.tutor_id = sr.tutor_id
      LEFT JOIN public.classes c ON c.class_id = sr.class_id
      WHERE sr.student_id = v_student_id AND sr.review_status='published' ORDER BY sr.updated_at DESC, sr.review_id LIMIT 10
    ) r;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('class_id', c.class_id, 'classes',
      jsonb_build_object('name', c.name, 'class_type', c.class_type, 'status', c.status,
        'tutors', jsonb_build_object('name', t.name))) ORDER BY c.name, c.class_id), '[]'::JSONB) INTO v_classes
    FROM public.class_students cs JOIN public.classes c ON c.class_id = cs.class_id
    LEFT JOIN public.tutors t ON t.tutor_id = c.tutor_id
    WHERE cs.student_id = v_student_id AND cs.status = 'active';
    SELECT count(*) INTO v_attendance FROM public.session_attendance
    WHERE student_id = v_student_id AND status = 'attended';
  END IF;
  RETURN jsonb_build_object('parent', jsonb_build_object('name', v_parent.display_name, 'phone', v_parent.phone),
    'students', v_children, 'student', v_student, 'reviews', COALESCE(v_reviews, '[]'::JSONB),
    'enrolledClasses', COALESCE(v_classes, '[]'::JSONB), 'attendanceCount', COALESCE(v_attendance, 0));
END;
$$;
REVOKE ALL ON FUNCTION public.get_parent_lookup(TEXT,UUID) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_parent_lookup(TEXT,UUID) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
