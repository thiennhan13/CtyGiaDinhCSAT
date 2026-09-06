-- Upgrade AFTER 20260905_02. Run manually; do not rerun migration 02 afterward.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $$ DECLARE v_unexpected TEXT; v_constraint TEXT; BEGIN
  IF to_regclass('public.parent_accounts') IS NULL OR to_regclass('public.parent_student_links') IS NULL THEN
    RAISE EXCEPTION 'CSAT preflight: apply parent migration 20260905_02 first.';
  END IF;
  SELECT string_agg(tablename || '.' || policyname, ', ') INTO v_unexpected
  FROM pg_catalog.pg_policies WHERE schemaname = 'public'
    AND tablename IN ('parent_accounts','parent_student_links','parent_lookup_sessions','parent_lookup_limits')
    AND (tablename,policyname) NOT IN (
      ('parent_accounts','Admin_Manage_Parent_Accounts'),('parent_accounts','Parent_View_Self'),
      ('parent_student_links','Admin_Manage_Parent_Links'));
  IF v_unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'CSAT preflight: unexpected policies: %. Review before migration.', v_unexpected;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='parent_accounts' AND column_name='auth_uid') THEN
    ALTER TABLE public.parent_accounts ADD COLUMN legacy_auth_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
    UPDATE public.parent_accounts SET legacy_auth_uid = auth_uid;
    -- Detach only the identity FK, preserving updated_by/created_by audit references.
    FOR v_constraint IN SELECT c.conname FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attname='auth_uid'
      WHERE c.conrelid='public.parent_accounts'::regclass AND c.contype='f'
        AND c.confrelid='auth.users'::regclass AND c.conkey=ARRAY[a.attnum]
    LOOP EXECUTE format('ALTER TABLE public.parent_accounts DROP CONSTRAINT %I',v_constraint); END LOOP;
    ALTER TABLE public.parent_accounts RENAME COLUMN auth_uid TO parent_id;
    ALTER TABLE public.parent_student_links RENAME COLUMN parent_auth_uid TO parent_id;
  END IF;
END $$;
ALTER TABLE public.parent_accounts ALTER COLUMN parent_id SET DEFAULT gen_random_uuid();
DROP POLICY IF EXISTS "Parent_View_Self" ON public.parent_accounts;
DROP FUNCTION IF EXISTS public.get_parent_portal(UUID);
DROP FUNCTION IF EXISTS public.admin_save_parent_account(UUID,TEXT,TEXT,UUID[],BOOLEAN);

CREATE TABLE IF NOT EXISTS public.parent_lookup_sessions (
  token_hash TEXT PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  parent_id UUID NOT NULL REFERENCES public.parent_accounts(parent_id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_parent_lookup_sessions_expiry ON public.parent_lookup_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_parent_lookup_sessions_parent ON public.parent_lookup_sessions(parent_id);
CREATE TABLE IF NOT EXISTS public.parent_lookup_limits (
  client_key TEXT PRIMARY KEY CHECK (client_key ~ '^[a-f0-9]{64}$'),
  request_count INTEGER NOT NULL CHECK (request_count BETWEEN 1 AND 11),
  reset_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_parent_lookup_limits_expiry ON public.parent_lookup_limits(reset_at);
ALTER TABLE public.parent_lookup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_lookup_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.parent_lookup_sessions,public.parent_lookup_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.parent_lookup_sessions,public.parent_lookup_limits TO service_role;

CREATE OR REPLACE FUNCTION public.admin_save_parent_contact(
  p_parent_id UUID,p_display_name TEXT,p_phone TEXT,p_student_ids UUID[],p_active BOOLEAN
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id UUID := p_parent_id;
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Thao tác này yêu cầu quyền Admin.' USING ERRCODE='42501';
  END IF;
  IF p_active IS NULL OR p_student_ids IS NULL OR cardinality(p_student_ids)>50
    OR (p_parent_id IS NULL AND cardinality(p_student_ids)=0)
    OR EXISTS (SELECT 1 FROM unnest(p_student_ids) s WHERE s IS NULL)
    OR cardinality(p_student_ids)<>(SELECT count(DISTINCT s) FROM unnest(p_student_ids) s) THEN
    RAISE EXCEPTION 'Danh sách học sinh không hợp lệ.' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_student_ids) s WHERE NOT EXISTS (
    SELECT 1 FROM public.students st WHERE st.student_id=s AND (NOT p_active OR st.is_deleted IS NOT TRUE)
  )) THEN
    RAISE EXCEPTION 'Có học sinh không tồn tại hoặc đã bị xóa.' USING ERRCODE='22023';
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO public.parent_accounts(display_name,phone,active,updated_by)
    VALUES(trim(p_display_name),p_phone,p_active,auth.uid()) RETURNING parent_id INTO v_id;
  ELSE
    PERFORM 1 FROM public.parent_accounts WHERE parent_id=v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy phụ huynh.' USING ERRCODE='P0002'; END IF;
    -- Closing or changing the lookup key permanently revokes outstanding sessions.
    DELETE FROM public.parent_lookup_sessions WHERE parent_id=v_id AND
      (NOT p_active OR EXISTS (SELECT 1 FROM public.parent_accounts WHERE parent_id=v_id AND phone<>p_phone));
    UPDATE public.parent_accounts SET display_name=trim(p_display_name),phone=p_phone,active=p_active,
      updated_at=CURRENT_TIMESTAMP,updated_by=auth.uid() WHERE parent_id=v_id;
  END IF;
  DELETE FROM public.parent_student_links WHERE parent_id=v_id AND NOT(student_id=ANY(p_student_ids));
  INSERT INTO public.parent_student_links(parent_id,student_id,created_by)
  SELECT v_id,s,auth.uid() FROM unnest(p_student_ids) s ON CONFLICT(parent_id,student_id) DO NOTHING;
  RETURN v_id;
END $$;

-- Service-only entry. A phone is a lookup key, NOT proof of identity.
-- Return failures instead of raising, so failed attempts still commit the shared limit.
CREATE OR REPLACE FUNCTION public.start_parent_lookup(p_phone TEXT,p_token_hash TEXT,p_client_key TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count INTEGER; v_parent_id UUID;
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^\+84[35789][0-9]{8}$'
    OR p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$'
    OR p_client_key IS NULL OR p_client_key !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid lookup request.' USING ERRCODE='22023';
  END IF;
  DELETE FROM public.parent_lookup_limits WHERE reset_at<=CURRENT_TIMESTAMP;
  DELETE FROM public.parent_lookup_sessions WHERE expires_at<=CURRENT_TIMESTAMP;
  INSERT INTO public.parent_lookup_limits(client_key,request_count,reset_at)
  VALUES(p_client_key,1,CURRENT_TIMESTAMP+INTERVAL '1 minute')
  ON CONFLICT(client_key) DO UPDATE SET request_count=LEAST(public.parent_lookup_limits.request_count+1,11)
  RETURNING request_count INTO v_count;
  IF v_count>10 THEN RETURN 'rate_limited'; END IF;
  SELECT parent_id INTO v_parent_id FROM public.parent_accounts WHERE phone=p_phone AND active FOR SHARE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  INSERT INTO public.parent_lookup_sessions(token_hash,parent_id,expires_at)
  VALUES(p_token_hash,v_parent_id,CURRENT_TIMESTAMP+INTERVAL '12 hours');
  RETURN 'ok';
END $$;

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

CREATE OR REPLACE FUNCTION public.end_parent_lookup(p_token_hash TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  DELETE FROM public.parent_lookup_sessions WHERE token_hash=p_token_hash;
$$;
REVOKE ALL ON FUNCTION public.admin_save_parent_contact(UUID,TEXT,TEXT,UUID[],BOOLEAN) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_parent_contact(UUID,TEXT,TEXT,UUID[],BOOLEAN) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.start_parent_lookup(TEXT,TEXT,TEXT),public.get_parent_lookup(TEXT,UUID),public.end_parent_lookup(TEXT) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.start_parent_lookup(TEXT,TEXT,TEXT),public.get_parent_lookup(TEXT,UUID),public.end_parent_lookup(TEXT) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
