-- Compatibility: replaces student_reviews.Admin_Full_Access_Reviews if present.
-- CSAT: apply to an existing database in Supabase SQL Editor as postgres.
-- No business rows are updated or deleted. Read database/UPDATE_PERMISSIONS_20260905.md first.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Fail before changing permissions if production differs from the supported schema.
DO $$
DECLARE v_signature TEXT; v_unknown TEXT; v_column RECORD;
BEGIN
  FOR v_column IN SELECT * FROM (VALUES
    ('students','student_id'), ('tutors','tutor_id'), ('tutors','auth_uid'), ('tutors','status'), ('tutors','is_deleted'),
    ('classes','class_id'), ('classes','tutor_id'), ('classes','csat_fee_per_session'),
    ('class_students','class_id'), ('class_students','student_id'), ('class_students','tuition_fee_per_session'),
    ('sessions','session_id'), ('sessions','class_id'), ('sessions','status'), ('sessions','billing_period'),
    ('sessions','tutor_id_snapshot'), ('sessions','csat_fee_snapshot'), ('sessions','created_at'),
    ('session_attendance','session_id'), ('session_attendance','student_id'), ('session_attendance','tuition_fee_snapshot'),
    ('payments','payment_id'), ('payments','billing_period'), ('announcements','announcement_id'),
    ('student_reviews','tutor_id'), ('student_reviews','class_id'), ('student_reviews','student_id'), ('class_change_log','log_id')
  ) AS required(table_name, column_name) LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public'
                   AND c.table_name = v_column.table_name AND c.column_name = v_column.column_name) THEN
      RAISE EXCEPTION 'CSAT preflight: missing public.%.%. Stop and compare the production schema.', v_column.table_name, v_column.column_name;
    END IF;
  END LOOP;
  FOREACH v_signature IN ARRAY ARRAY[
    'public.is_admin()',
    'public.create_class_full(character varying,character varying,uuid,numeric,date,date,jsonb,jsonb)',
    'public.change_tutor_safe(uuid,uuid,date,text,text)', 'public.update_csat_fee_safe(uuid,numeric,date,text,text)',
    'public.take_attendance_safe(uuid,jsonb)', 'public.rollback_billing_partial(text)', 'public.get_unique_billing_periods()'
  ] LOOP
    IF to_regprocedure(v_signature) IS NULL THEN
      RAISE EXCEPTION 'CSAT preflight: missing function %. Stop and compare the production schema.', v_signature;
    END IF;
  END LOOP;
  SELECT string_agg(p.oid::regprocedure::TEXT, ', ') INTO v_unknown
  FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('is_admin','current_tutor_id','guard_tutor_session_write',
    'create_class_full','change_tutor_safe','update_csat_fee_safe','take_attendance_safe','rollback_billing_partial','get_unique_billing_periods')
    AND p.oid NOT IN (
      SELECT to_regprocedure(s) FROM unnest(ARRAY[
        'public.is_admin()', 'public.current_tutor_id()', 'public.guard_tutor_session_write()',
        'public.create_class_full(character varying,character varying,uuid,numeric,date,date,jsonb,jsonb)',
        'public.change_tutor_safe(uuid,uuid,date,text,text)', 'public.update_csat_fee_safe(uuid,numeric,date,text,text)',
        'public.take_attendance_safe(uuid,jsonb)', 'public.rollback_billing_partial(text)', 'public.get_unique_billing_periods()'
      ]) s WHERE to_regprocedure(s) IS NOT NULL
    );
  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'CSAT preflight: unexpected RPC overloads: %. Review before migration.', v_unknown;
  END IF;
  SELECT string_agg(tablename || '.' || policyname, ', ') INTO v_unknown FROM pg_catalog.pg_policies
  WHERE schemaname = 'public' AND tablename IN ('students','tutors','classes','class_students','sessions',
    'session_attendance','payments','announcements','student_reviews','class_change_log')
    AND policyname NOT IN ('Admin_Full_Students','Admin_Full_Tutors','Admin_Full_Classes','Admin_Full_Class_Students',
      'Admin_Full_Sessions','Admin_Full_Attendance','Admin_Full_Payments','Admin_Full_Announcements','Admin_Full_Student_Reviews',
      'Admin_Full_ClassChangeLog','Tutor_View_Self','Public_View_Announcements','Tutor_View_Assigned_Students',
      'Tutor_View_Assigned_Classes','Tutor_View_Class_Students','Tutor_View_Assigned_Sessions','Tutor_Manage_Assigned_Sessions',
      'Tutor_Manage_Attendance','Tutor_Manage_Own_Reviews','Tutor_Insert_Assigned_Sessions','Tutor_Update_Assigned_Sessions',
      'Tutor_Delete_Assigned_Sessions','Tutor_View_Attendance','Tutor_View_Own_Reviews','Tutor_Write_Assigned_Reviews')
    -- Legacy policy name reported by the production operator. Its old predicate
    -- is not trusted or preserved: the policy replacement below removes it.
    AND NOT (tablename = 'student_reviews' AND policyname = 'Admin_Full_Access_Reviews');
  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'CSAT preflight: unexpected policies: %. Review before migration.', v_unknown;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE raw_app_meta_data ->> 'role' = 'admin') THEN
    RAISE EXCEPTION 'CSAT preflight: no account has app_metadata.role=admin. Confirm and assign a real admin before migration; do not use user_metadata or email fallback.';
  END IF;
END;
$$;

-- BEGIN CSAT PERMISSIONS 20260905
-- Only server-managed app_metadata grants admin access. Missing claims always deny.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT COALESCE(auth.jwt() ->> 'role' = 'service_role', false)
    OR (auth.uid() IS NOT NULL
        AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false));
$$;

-- A disabled tutor cannot continue using an unexpired JWT against RLS or RPCs.
CREATE OR REPLACE FUNCTION public.current_tutor_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT t.tutor_id FROM public.tutors t
  WHERE t.auth_uid = auth.uid() AND t.status = 'active' AND t.is_deleted IS NOT TRUE;
$$;

-- Keep the existing direct add/cancel/delete-scheduled UI, but never trust
-- tutor-supplied ownership, fees or billing metadata.
CREATE OR REPLACE FUNCTION public.guard_tutor_session_write()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_class public.classes%ROWTYPE;
BEGIN
  -- SQL maintenance and the validated SECURITY DEFINER RPC run as postgres.
  IF current_user IN ('postgres', 'service_role') OR public.is_admin() IS TRUE THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF public.current_tutor_id() IS NULL THEN
    RAISE EXCEPTION 'Tài khoản gia sư không hợp lệ hoặc đã bị vô hiệu hóa.' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_class FROM public.classes
    WHERE class_id = NEW.class_id AND tutor_id = public.current_tutor_id();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lớp học không thuộc quyền quản lý của bạn.' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM 'scheduled'::public.session_status OR NEW.billing_period IS NOT NULL THEN
      RAISE EXCEPTION 'Gia sư chỉ được tạo buổi học chưa điểm danh, chưa chốt kỳ.' USING ERRCODE = '42501';
    END IF;
    NEW.tutor_id_snapshot := v_class.tutor_id;
    NEW.csat_fee_snapshot := v_class.csat_fee_per_session;
    NEW.created_at := CURRENT_TIMESTAMP;
    RETURN NEW;
  END IF;

  IF OLD.billing_period IS NOT NULL THEN
    RAISE EXCEPTION 'Buổi học đã chốt kỳ. Cần admin mở lại trước khi thay đổi.' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
      RAISE EXCEPTION 'Gia sư không được thay đổi định danh, lịch, đơn giá hoặc kỳ của buổi đã tạo.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM 'scheduled'::public.session_status OR EXISTS (
    SELECT 1 FROM public.session_attendance a WHERE a.session_id = OLD.session_id
  ) THEN
    RAISE EXCEPTION 'Không được xóa buổi đã có điểm danh. Liên hệ admin để điều chỉnh.' USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS guard_tutor_session_write ON public.sessions;
CREATE TRIGGER guard_tutor_session_write
BEFORE INSERT OR UPDATE OR DELETE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.guard_tutor_session_write();

-- 7.1: create_class_full — Tạo lớp học (atomic: tạo lớp + học sinh + lịch cùng lúc)
-- Phiên bản bảo mật: Kiểm tra quyền Admin + Lưu tutor_id_snapshot
CREATE OR REPLACE FUNCTION public.create_class_full(
    p_name VARCHAR, p_class_type VARCHAR, p_tutor_id UUID, p_csat_fee DECIMAL,
    p_start_date DATE, p_end_date DATE, p_students JSONB, p_sessions JSONB
) RETURNS UUID AS $$
DECLARE
    v_class_id UUID; v_student JSONB; v_session JSONB;
BEGIN
    -- CHỐNG LEO THANG ĐẶC QUYỀN: Chỉ Admin mới được tạo lớp
    IF public.is_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'Quyền truy cập bị từ chối: Thao tác này yêu cầu quyền Quản trị viên (Admin).';
    END IF;

    INSERT INTO public.classes (name, class_type, tutor_id, csat_fee_per_session, start_date, end_date)
    VALUES (p_name, p_class_type, p_tutor_id, p_csat_fee, p_start_date, p_end_date)
    RETURNING class_id INTO v_class_id;

    IF p_students IS NOT NULL AND jsonb_array_length(p_students) > 0 THEN
        FOR v_student IN SELECT * FROM jsonb_array_elements(p_students) LOOP
            INSERT INTO public.class_students (class_id, student_id, tuition_fee_per_session)
            VALUES (v_class_id, (v_student->>'student_id')::UUID, (v_student->>'tuition_fee_per_session')::DECIMAL);
        END LOOP;
    END IF;

    IF p_sessions IS NOT NULL AND jsonb_array_length(p_sessions) > 0 THEN
        FOR v_session IN SELECT * FROM jsonb_array_elements(p_sessions) LOOP
            INSERT INTO public.sessions (class_id, date, start_time, end_time, csat_fee_snapshot, tutor_id_snapshot, status)
            VALUES (v_class_id, (v_session->>'date')::DATE, (v_session->>'start_time')::TIME,
                    (v_session->>'end_time')::TIME, p_csat_fee, p_tutor_id, 'scheduled');
        END LOOP;
    END IF;

    RETURN v_class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 7.2: change_tutor_safe — Đổi gia sư (atomic: log + update class + update sessions)
CREATE OR REPLACE FUNCTION public.change_tutor_safe(
    p_class_id UUID, p_new_tutor_id UUID, p_effective_date DATE, p_changed_by TEXT, p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_old_tutor_id UUID; v_old_tutor_name TEXT; v_new_tutor_name TEXT; v_updated_count INTEGER;
BEGIN
    -- CHỐNG LEO THANG ĐẶC QUYỀN: Chỉ Admin mới được đổi gia sư
    IF public.is_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'Quyền truy cập bị từ chối: Thao tác này yêu cầu quyền Quản trị viên (Admin).';
    END IF;

    SELECT t.tutor_id, t.name INTO v_old_tutor_id, v_old_tutor_name
    FROM public.classes c LEFT JOIN public.tutors t ON t.tutor_id = c.tutor_id WHERE c.class_id = p_class_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy lớp học.'; END IF;
    IF v_old_tutor_id = p_new_tutor_id THEN RAISE EXCEPTION 'Gia sư mới trùng với gia sư hiện tại.'; END IF;

    SELECT name INTO v_new_tutor_name FROM public.tutors WHERE tutor_id = p_new_tutor_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy gia sư mới.'; END IF;

    UPDATE public.sessions SET tutor_id_snapshot = p_new_tutor_id
    WHERE class_id = p_class_id AND status = 'scheduled' AND date >= p_effective_date;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    UPDATE public.classes SET tutor_id = p_new_tutor_id WHERE class_id = p_class_id;

    INSERT INTO public.class_change_log(class_id, change_type, old_value, new_value, old_label, new_label, effective_date, changed_by, notes)
    VALUES (p_class_id, 'tutor_change', v_old_tutor_id::TEXT, p_new_tutor_id::TEXT,
            v_old_tutor_name, v_new_tutor_name, p_effective_date, p_changed_by, p_notes);

    RETURN jsonb_build_object('message',
        format('Đã đổi gia sư từ "%s" sang "%s". Cập nhật %s buổi học chưa dạy.',
               v_old_tutor_name, v_new_tutor_name, v_updated_count),
        'updated_sessions', v_updated_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 7.3: update_csat_fee_safe — Đổi phí CSAT (atomic: fill null + update scheduled + update class + log)
CREATE OR REPLACE FUNCTION public.update_csat_fee_safe(
    p_class_id UUID, p_new_fee DECIMAL, p_effective_date DATE, p_changed_by TEXT, p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_old_fee DECIMAL; v_updated_count INTEGER; v_null_filled INTEGER;
BEGIN
    -- CHỐNG LEO THANG ĐẶC QUYỀN: Chỉ Admin mới được đổi phí CSAT
    IF public.is_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'Quyền truy cập bị từ chối: Thao tác này yêu cầu quyền Quản trị viên (Admin).';
    END IF;

    SELECT csat_fee_per_session INTO v_old_fee FROM public.classes WHERE class_id = p_class_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy lớp học.'; END IF;

    UPDATE public.sessions SET csat_fee_snapshot = v_old_fee
    WHERE class_id = p_class_id AND csat_fee_snapshot IS NULL;
    GET DIAGNOSTICS v_null_filled = ROW_COUNT;

    UPDATE public.sessions SET csat_fee_snapshot = p_new_fee
    WHERE class_id = p_class_id AND status = 'scheduled' AND date >= p_effective_date;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    UPDATE public.classes SET csat_fee_per_session = p_new_fee WHERE class_id = p_class_id;

    INSERT INTO public.class_change_log(class_id, change_type, old_value, new_value, old_label, new_label, effective_date, changed_by, notes)
    VALUES (p_class_id, 'csat_fee_change', v_old_fee::TEXT, p_new_fee::TEXT,
            to_char(v_old_fee, 'FM999,999,999') || ' ₫', to_char(p_new_fee, 'FM999,999,999') || ' ₫',
            p_effective_date, p_changed_by, p_notes);

    RETURN jsonb_build_object('message',
        format('Đã cập nhật phí CSAT thành công. Áp dụng cho %s buổi học chưa dạy từ %s.',
               v_updated_count, p_effective_date),
        'updated_sessions', v_updated_count, 'null_snapshots_fixed', v_null_filled);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 7.5: rollback_billing_partial — Hủy chốt sổ một phần (giữ hóa đơn đã thu, xóa chưa thu)
-- Phiên bản bảo mật: Kiểm tra quyền Admin (Chống leo thang đặc quyền)
CREATE OR REPLACE FUNCTION public.rollback_billing_partial(
    p_billing_period TEXT
) RETURNS JSONB AS $$
DECLARE
    v_unpaid_count INTEGER := 0;
    v_paid_count   INTEGER := 0;
    v_target       RECORD;
BEGIN
    -- CHỐNG LEO THANG ĐẶC QUYỀN: Chỉ Admin mới được hủy chốt sổ
    IF public.is_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'Quyền truy cập bị từ chối: Thao tác này yêu cầu quyền Quản trị viên (Admin).';
    END IF;

    SELECT COUNT(*) INTO v_paid_count   FROM public.payments WHERE billing_period = p_billing_period AND status = 'paid';
    SELECT COUNT(*) INTO v_unpaid_count FROM public.payments WHERE billing_period = p_billing_period AND status = 'unpaid';

    IF v_unpaid_count = 0 THEN
        RAISE EXCEPTION 'Không có hóa đơn chưa thu nào trong kỳ "%" để hủy. (% hóa đơn đã thu được giữ nguyên)',
            p_billing_period, v_paid_count;
    END IF;

    -- Gỡ billing_period của sessions — chỉ khi session đó không có học sinh nào đã paid trong kỳ
    FOR v_target IN
        SELECT DISTINCT p.student_id, p.class_id FROM public.payments p
        WHERE p.billing_period = p_billing_period AND p.status = 'unpaid'
    LOOP
        UPDATE public.sessions s
        SET billing_period = NULL
        WHERE s.billing_period = p_billing_period
          AND s.class_id = v_target.class_id
          AND EXISTS (
              SELECT 1 FROM public.session_attendance sa
              WHERE sa.session_id = s.session_id AND sa.student_id = v_target.student_id
          )
          -- Không gỡ nếu có học sinh khác trong session đã paid (tránh tạo HĐ trùng khi chốt lại)
          AND NOT EXISTS (
              SELECT 1 FROM public.session_attendance sa2
              JOIN public.payments p2 ON p2.student_id = sa2.student_id
                               AND p2.class_id = s.class_id
                               AND p2.billing_period = p_billing_period
                               AND p2.status = 'paid'
              WHERE sa2.session_id = s.session_id
          );
    END LOOP;

    DELETE FROM public.payments WHERE billing_period = p_billing_period AND status = 'unpaid';

    -- Nếu không còn hóa đơn nào (kể cả paid), gỡ nốt billing_period sessions còn sót
    IF v_paid_count = 0 THEN
        UPDATE public.sessions SET billing_period = NULL WHERE billing_period = p_billing_period;
    END IF;

    RETURN jsonb_build_object(
        'message', format('Đã hủy %s hóa đơn chưa thu. %s hóa đơn đã thu được giữ nguyên.',
                          v_unpaid_count, v_paid_count),
        'unpaid_deleted', v_unpaid_count,
        'paid_kept', v_paid_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';



-- Same RPC signature for compatibility with deployed clients. Fees in JSON are ignored.
CREATE OR REPLACE FUNCTION public.take_attendance_safe(p_session_id UUID, p_attendance_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_record JSONB;
  v_session public.sessions%ROWTYPE;
  v_student_id UUID;
  v_fee NUMERIC;
  v_is_admin BOOLEAN := public.is_admin();
  v_tutor_id UUID := public.current_tutor_id();
BEGIN
  IF v_is_admin IS NOT TRUE AND v_tutor_id IS NULL THEN
    RAISE EXCEPTION 'Quyền truy cập bị từ chối.' USING ERRCODE = '42501';
  END IF;
  -- Serializes attendance submissions and conflicts with updates to this session.
  SELECT * INTO v_session FROM public.sessions WHERE session_id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buổi học không tồn tại' USING ERRCODE = 'P0002';
  END IF;
  IF v_is_admin IS NOT TRUE AND NOT EXISTS (
    SELECT 1 FROM public.classes c WHERE c.class_id = v_session.class_id
      AND (c.tutor_id = v_tutor_id OR v_session.tutor_id_snapshot = v_tutor_id)
  ) THEN
    RAISE EXCEPTION 'Bạn không phải gia sư phụ trách buổi học này.' USING ERRCODE = '42501';
  END IF;
  IF v_is_admin IS NOT TRUE AND v_session.billing_period IS NOT NULL THEN
    RAISE EXCEPTION 'Buổi học đã chốt kỳ. Cần admin mở lại trước khi điểm danh.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_attendance_data) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Dữ liệu điểm danh phải là danh sách.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_attendance_data) = 0 THEN
    RAISE EXCEPTION 'Không có dữ liệu điểm danh.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_attendance_data) r
    GROUP BY (r ->> 'student_id')::UUID HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Danh sách điểm danh có học sinh bị lặp.' USING ERRCODE = '22023';
  END IF;

  FOR v_record IN SELECT * FROM jsonb_array_elements(p_attendance_data) LOOP
    IF jsonb_typeof(v_record) IS DISTINCT FROM 'object'
      OR (v_record ->> 'status' IN ('attended', 'absent')) IS NOT TRUE
      OR v_record ->> 'student_id' IS NULL THEN
      RAISE EXCEPTION 'Dữ liệu điểm danh không hợp lệ.' USING ERRCODE = '22023';
    END IF;
    v_student_id := (v_record ->> 'student_id')::UUID;
    -- Existing attendance is retained even if enrollment was subsequently removed.
    -- A new student must belong to this class, including a dropped enrollment.
    IF NOT EXISTS (SELECT 1 FROM public.class_students cs
                   WHERE cs.class_id = v_session.class_id AND cs.student_id = v_student_id)
      AND NOT EXISTS (SELECT 1 FROM public.session_attendance a
                      WHERE a.session_id = p_session_id AND a.student_id = v_student_id) THEN
      RAISE EXCEPTION 'Học sinh không thuộc lớp của buổi học.' USING ERRCODE = '42501';
    END IF;
    SELECT COALESCE(
      (SELECT a.tuition_fee_snapshot FROM public.session_attendance a
       WHERE a.session_id = p_session_id AND a.student_id = v_student_id),
      (SELECT cs.tuition_fee_per_session FROM public.class_students cs
       WHERE cs.class_id = v_session.class_id AND cs.student_id = v_student_id)
    ) INTO v_fee;
    IF v_fee IS NULL THEN
      RAISE EXCEPTION 'Thiếu đơn giá của học sinh. Cần admin xác minh trước khi lưu.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.session_attendance (session_id, student_id, status, tuition_fee_snapshot, notes)
    VALUES (p_session_id, v_student_id, (v_record ->> 'status')::public.attendance_status,
            v_fee, v_record ->> 'notes')
    ON CONFLICT (session_id, student_id) DO UPDATE SET
      status = EXCLUDED.status,
      tuition_fee_snapshot = COALESCE(session_attendance.tuition_fee_snapshot, EXCLUDED.tuition_fee_snapshot),
      notes = EXCLUDED.notes;
  END LOOP;
  UPDATE public.sessions SET status = 'completed' WHERE session_id = p_session_id;
  RETURN jsonb_build_object('message', 'Điểm danh thành công', 'records_processed', jsonb_array_length(p_attendance_data));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unique_billing_periods()
RETURNS TABLE(billing_period TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Thao tác này yêu cầu quyền Admin.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT DISTINCT p.billing_period::TEXT FROM public.payments p ORDER BY p.billing_period::TEXT DESC;
END;
$$;

-- Scope policy changes to the ten CSAT tables; leave other public tables alone.
DO $$
DECLARE v_table TEXT; v_policy TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['students','tutors','classes','class_students','sessions',
    'session_attendance','payments','announcements','student_reviews','class_change_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    FOR v_policy IN SELECT policyname FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename = v_table LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', v_policy, v_table);
    END LOOP;
  END LOOP;
END;
$$;

CREATE POLICY "Admin_Full_Students" ON public.students FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin_Full_Tutors" ON public.tutors FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin_Full_Classes" ON public.classes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin_Full_Class_Students" ON public.class_students FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin_Full_Sessions" ON public.sessions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin_Full_Attendance" ON public.session_attendance FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin_Full_Payments" ON public.payments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin_Full_Announcements" ON public.announcements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin_Full_Student_Reviews" ON public.student_reviews FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin_Full_ClassChangeLog" ON public.class_change_log FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Tutor_View_Self" ON public.tutors FOR SELECT TO authenticated
USING (auth_uid = auth.uid() AND status = 'active' AND is_deleted IS NOT TRUE);
CREATE POLICY "Public_View_Announcements" ON public.announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tutor_View_Assigned_Classes" ON public.classes FOR SELECT TO authenticated
USING (tutor_id = public.current_tutor_id());
CREATE POLICY "Tutor_View_Class_Students" ON public.class_students FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c
              WHERE c.class_id = class_students.class_id AND c.tutor_id = public.current_tutor_id()));
CREATE POLICY "Tutor_View_Assigned_Students" ON public.students FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.class_students cs JOIN public.classes c ON c.class_id = cs.class_id
              WHERE cs.student_id = students.student_id AND c.tutor_id = public.current_tutor_id()));

CREATE POLICY "Tutor_View_Assigned_Sessions" ON public.sessions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.class_id = sessions.class_id AND c.tutor_id = public.current_tutor_id()));
CREATE POLICY "Tutor_Insert_Assigned_Sessions" ON public.sessions FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.class_id = sessions.class_id AND c.tutor_id = public.current_tutor_id()));
CREATE POLICY "Tutor_Update_Assigned_Sessions" ON public.sessions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.class_id = sessions.class_id AND c.tutor_id = public.current_tutor_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.class_id = sessions.class_id AND c.tutor_id = public.current_tutor_id()));
CREATE POLICY "Tutor_Delete_Assigned_Sessions" ON public.sessions FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.class_id = sessions.class_id AND c.tutor_id = public.current_tutor_id()));

-- Tutor writes go through take_attendance_safe. Admins retain the existing RLS path.
CREATE POLICY "Tutor_View_Attendance" ON public.session_attendance FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sessions s JOIN public.classes c ON c.class_id = s.class_id
              WHERE s.session_id = session_attendance.session_id AND c.tutor_id = public.current_tutor_id()));

-- Retain visibility of a tutor's own reviews; new edits require current class membership.
CREATE POLICY "Tutor_View_Own_Reviews" ON public.student_reviews FOR SELECT TO authenticated
USING (tutor_id = public.current_tutor_id());
CREATE POLICY "Tutor_Write_Assigned_Reviews" ON public.student_reviews FOR ALL TO authenticated
USING (tutor_id = public.current_tutor_id() AND EXISTS (
  SELECT 1 FROM public.classes c JOIN public.class_students cs ON cs.class_id = c.class_id
  WHERE c.class_id = student_reviews.class_id AND cs.student_id = student_reviews.student_id
    AND c.tutor_id = public.current_tutor_id()
))
WITH CHECK (tutor_id = public.current_tutor_id() AND EXISTS (
  SELECT 1 FROM public.classes c JOIN public.class_students cs ON cs.class_id = c.class_id
  WHERE c.class_id = student_reviews.class_id AND cs.student_id = student_reviews.student_id
    AND c.tutor_id = public.current_tutor_id()
));

-- RLS does not protect TRUNCATE. Only grant browser roles the DML covered by RLS.
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
DO $$
DECLARE v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['students','tutors','classes','class_students','sessions',
    'session_attendance','payments','announcements','student_reviews','class_change_log'] LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', v_table);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', v_table);
  END LOOP;
END;
$$;

-- Affect defaults for the role executing this migration (normally postgres).
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
-- PostgreSQL's global PUBLIC function default must be revoked globally, not per-schema.
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

DO $$
DECLARE v_signature TEXT;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.is_admin()', 'public.current_tutor_id()',
    'public.create_class_full(character varying,character varying,uuid,numeric,date,date,jsonb,jsonb)',
    'public.change_tutor_safe(uuid,uuid,date,text,text)',
    'public.update_csat_fee_safe(uuid,numeric,date,text,text)',
    'public.take_attendance_safe(uuid,jsonb)',
    'public.rollback_billing_partial(text)', 'public.get_unique_billing_periods()'
  ] LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', v_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', v_signature);
  END LOOP;
END;
$$;
REVOKE ALL PRIVILEGES ON FUNCTION public.guard_tutor_session_write() FROM PUBLIC, anon, authenticated, service_role;

-- END CSAT PERMISSIONS 20260905

NOTIFY pgrst, 'reload schema';
COMMIT;
