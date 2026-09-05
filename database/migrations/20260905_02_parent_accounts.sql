-- Requires 20260905_01_harden_permissions.sql. Apply manually in Supabase SQL Editor.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $$ DECLARE v_unexpected TEXT; BEGIN
  SELECT string_agg(tablename || '.' || policyname, ', ' ORDER BY tablename, policyname)
  INTO v_unexpected FROM pg_catalog.pg_policies
  WHERE schemaname = 'public' AND tablename IN ('parent_accounts', 'parent_student_links')
    AND (tablename, policyname) NOT IN (
      ('parent_accounts', 'Admin_Manage_Parent_Accounts'), ('parent_accounts', 'Parent_View_Self'),
      ('parent_student_links', 'Admin_Manage_Parent_Links'));
  IF v_unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'CSAT preflight: unexpected parent policies: %. Review before migration.', v_unexpected;
  END IF;
  IF to_regprocedure('public.current_tutor_id()') IS NULL
    OR has_function_privilege('anon', 'public.take_attendance_safe(uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'CSAT preflight: apply permission migration 20260905_01 first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.parent_accounts (
  auth_uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 150),
  phone TEXT NOT NULL UNIQUE CHECK (phone ~ '^\+84[35789][0-9]{8}$'),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  parent_auth_uid UUID NOT NULL REFERENCES public.parent_accounts(auth_uid) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (parent_auth_uid, student_id)
);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student ON public.parent_student_links(student_id);
ALTER TABLE public.parent_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.parent_accounts, public.parent_student_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.parent_accounts, public.parent_student_links TO authenticated;
GRANT ALL ON TABLE public.parent_accounts, public.parent_student_links TO service_role;

DROP POLICY IF EXISTS "Admin_Manage_Parent_Accounts" ON public.parent_accounts;
CREATE POLICY "Admin_Manage_Parent_Accounts" ON public.parent_accounts FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Parent_View_Self" ON public.parent_accounts;
CREATE POLICY "Parent_View_Self" ON public.parent_accounts FOR SELECT TO authenticated
USING (auth_uid = auth.uid() AND auth.jwt() -> 'app_metadata' ->> 'role' = 'parent');
DROP POLICY IF EXISTS "Admin_Manage_Parent_Links" ON public.parent_student_links;
CREATE POLICY "Admin_Manage_Parent_Links" ON public.parent_student_links FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Auth user creation is handled by the server Auth Admin API. Profile and child
-- assignments are validated and saved together; no matching by phone suffix.
CREATE OR REPLACE FUNCTION public.admin_save_parent_account(
  p_auth_uid UUID, p_display_name TEXT, p_phone TEXT, p_student_ids UUID[], p_active BOOLEAN
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Thao tác này yêu cầu quyền Admin.' USING ERRCODE = '42501';
  END IF;
  IF p_active IS NULL OR p_student_ids IS NULL OR cardinality(p_student_ids) > 50
    OR EXISTS (SELECT 1 FROM unnest(p_student_ids) s WHERE s IS NULL)
    OR cardinality(p_student_ids) <> (SELECT count(DISTINCT s) FROM unnest(p_student_ids) s) THEN
    RAISE EXCEPTION 'Danh sách học sinh không hợp lệ.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_auth_uid
    AND u.raw_app_meta_data ->> 'role' = 'parent'
    AND ltrim(u.phone, '+') = ltrim(p_phone, '+')) THEN
    RAISE EXCEPTION 'Tài khoản Auth không khớp phụ huynh cần liên kết.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_student_ids) s WHERE NOT EXISTS (
    SELECT 1 FROM public.students st WHERE st.student_id = s AND (NOT p_active OR st.is_deleted IS NOT TRUE)
  )) THEN
    RAISE EXCEPTION 'Có học sinh không tồn tại hoặc đã bị xóa.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.parent_accounts(auth_uid, display_name, phone, active, updated_by)
  VALUES (p_auth_uid, trim(p_display_name), p_phone, p_active, auth.uid())
  ON CONFLICT (auth_uid) DO UPDATE SET display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone, active = EXCLUDED.active, updated_at = CURRENT_TIMESTAMP, updated_by = auth.uid();
  -- The upsert locks the account row so simultaneous edits cannot interleave link sets.
  DELETE FROM public.parent_student_links
  WHERE parent_auth_uid = p_auth_uid AND NOT (student_id = ANY(p_student_ids));
  INSERT INTO public.parent_student_links(parent_auth_uid, student_id, created_by)
  SELECT p_auth_uid, s, auth.uid() FROM unnest(p_student_ids) s
  ON CONFLICT (parent_auth_uid, student_id) DO NOTHING;
END;
$$;

-- Project only parent-facing fields. Parents get no new SELECT policy on raw
-- students/tutors/payments tables, which also contain internal admin fields.
CREATE OR REPLACE FUNCTION public.get_parent_portal(p_student_id UUID DEFAULT NULL)
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
  IF auth.uid() IS NULL OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'parent') IS NOT TRUE THEN
    RAISE EXCEPTION 'Quyền truy cập bị từ chối.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_parent FROM public.parent_accounts WHERE auth_uid = auth.uid() AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tài khoản phụ huynh chưa được cấp quyền hoặc đã bị khóa.' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', s.student_id, 'name', s.name)
    ORDER BY s.name, s.student_id), '[]'::JSONB) INTO v_children
  FROM public.parent_student_links l JOIN public.students s ON s.student_id = l.student_id
  WHERE l.parent_auth_uid = auth.uid() AND s.is_deleted IS NOT TRUE;
  IF p_student_id IS NULL THEN
    v_student_id := (v_children -> 0 ->> 'student_id')::UUID;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.parent_student_links l JOIN public.students s ON s.student_id = l.student_id
      WHERE l.parent_auth_uid = auth.uid() AND l.student_id = p_student_id AND s.is_deleted IS NOT TRUE) THEN
      RAISE EXCEPTION 'Học sinh không thuộc quyền truy cập của tài khoản.' USING ERRCODE = '42501';
    END IF;
    v_student_id := p_student_id;
  END IF;
  IF v_student_id IS NOT NULL THEN
    SELECT jsonb_build_object('student_id', s.student_id, 'name', s.name, 'date_of_birth', s.date_of_birth,
      'province', s.province, 'status', s.status, 'parent_name', v_parent.display_name, 'parent_number', v_parent.phone)
    INTO v_student FROM public.students s WHERE s.student_id = v_student_id;
    SELECT COALESCE(jsonb_agg(r.payload ORDER BY r.created_at DESC, r.review_id), '[]'::JSONB) INTO v_reviews FROM (
      SELECT sr.created_at, sr.review_id, jsonb_build_object('review_id', sr.review_id, 'month_year', sr.month_year,
        'general_assessment', sr.general_assessment, 'learning_attitude', sr.learning_attitude,
        'logical_thinking', sr.logical_thinking, 'created_at', sr.created_at,
        'tutors', jsonb_build_object('tutor_id', t.tutor_id, 'name', t.name),
        'classes', jsonb_build_object('class_id', c.class_id, 'name', c.name)) AS payload
      FROM public.student_reviews sr LEFT JOIN public.tutors t ON t.tutor_id = sr.tutor_id
      LEFT JOIN public.classes c ON c.class_id = sr.class_id
      WHERE sr.student_id = v_student_id ORDER BY sr.created_at DESC, sr.review_id LIMIT 10
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
REVOKE ALL ON FUNCTION public.admin_save_parent_account(UUID,TEXT,TEXT,UUID[],BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_parent_account(UUID,TEXT,TEXT,UUID[],BOOLEAN) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_parent_portal(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_parent_portal(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
