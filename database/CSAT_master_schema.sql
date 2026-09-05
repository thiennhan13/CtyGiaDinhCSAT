-- Fresh database only. Existing deployments: database/migrations/20260905_01_harden_permissions.sql
BEGIN;
-- =====================================================================
-- CSAT TUTOR MANAGER — MASTER DATABASE SCHEMA
-- Phiên bản: Tổng hợp đầy đủ (Schema + Migrations + Bug Fixes)
-- Bao gồm: CSATschema.sql + migration_bug_fixes.sql
--           + final_safety_migration.sql + fix_attendance_snapshot_and_partial_rollback.sql
--
-- HƯỚNG DẪN: Chỉ chạy file này MỘT LẦN duy nhất trên một database TRỐNG.
-- Database ĐÃ CÓ DỮ LIỆU: dùng migration riêng, không chạy lại master schema.
-- =====================================================================


-- ============================================================
-- PHẦN 1: EXTENSIONS & ENUM TYPES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN CREATE TYPE attendance_status AS ENUM ('attended', 'absent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('unpaid', 'paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE class_student_status AS ENUM ('active', 'dropped');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ============================================================
-- PHẦN 2: BẢNG DỮ LIỆU (TABLES)
-- [MIGRATION ONLY]: Các lệnh ALTER TABLE bên dưới an toàn để chạy trên DB có sẵn
-- ============================================================

-- Bảng: students
CREATE TABLE IF NOT EXISTS students (
  student_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  old_age INTEGER,
  province VARCHAR(100),
  student_contact VARCHAR(255),
  parent_number VARCHAR(50),
  parent_link VARCHAR(500),
  parent_name VARCHAR(255),
  status VARCHAR(255) DEFAULT 'Đang học',
  is_deleted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- [MIGRATION ONLY]
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS old_age INTEGER;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_contact VARCHAR(255);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_number VARCHAR(50);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_link VARCHAR(500);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255);
-- Đã xóa: zalo_class_name (DROP COLUMN IF EXISTS zalo_class_name)
-- Đã rename: parent_contact → parent_number (RENAME COLUMN parent_contact TO parent_number)

-- Bảng: tutors
CREATE TABLE IF NOT EXISTS tutors (
  tutor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_uid UUID NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(255) DEFAULT 'active',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- [MIGRATION ONLY] Thêm cột email nếu chưa có
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Bảng: classes
CREATE TABLE IF NOT EXISTS classes (
  class_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID REFERENCES tutors(tutor_id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date DATE,
  status VARCHAR(255) DEFAULT 'active',
  class_type VARCHAR(255) NOT NULL DEFAULT 'Lớp Cơ bản',
  csat_fee_per_session DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- [MIGRATION ONLY]
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS class_type VARCHAR(255) NOT NULL DEFAULT 'Lớp Cơ bản';

-- Bảng: class_students
CREATE TABLE IF NOT EXISTS class_students (
  class_id UUID REFERENCES classes(class_id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  tuition_fee_per_session DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status class_student_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id, student_id)
);

-- Bảng: student_reviews
CREATE TABLE IF NOT EXISTS student_reviews (
  review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  tutor_id UUID REFERENCES tutors(tutor_id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(class_id) ON DELETE SET NULL,
  month_year VARCHAR(7),
  general_assessment TEXT,
  learning_attitude TEXT,
  logical_thinking TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng: sessions
-- Ghi chú: tutor_id_snapshot & csat_fee_snapshot & billing_period là các cột đã thêm qua migration
CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(class_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status session_status DEFAULT 'scheduled',
  csat_fee_snapshot DECIMAL(10,2),
  billing_period VARCHAR(255),
  tutor_id_snapshot UUID REFERENCES tutors(tutor_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- [MIGRATION ONLY]
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS billing_period VARCHAR(255);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS csat_fee_snapshot DECIMAL(10,2);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS tutor_id_snapshot UUID REFERENCES tutors(tutor_id) ON DELETE SET NULL;

-- Bảng: session_attendance
CREATE TABLE IF NOT EXISTS session_attendance (
  attendance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  status attendance_status NOT NULL,
  tuition_fee_snapshot DECIMAL(10,2),
  notes TEXT,
  UNIQUE(session_id, student_id)
);
-- [MIGRATION ONLY]
ALTER TABLE public.session_attendance ADD COLUMN IF NOT EXISTS tuition_fee_snapshot DECIMAL(10,2);

-- Bảng: payments
CREATE TABLE IF NOT EXISTS payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(class_id) ON DELETE SET NULL,
  billing_period VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status payment_status DEFAULT 'unpaid',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- [MIGRATION ONLY]
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Bảng: announcements
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  link VARCHAR(255),
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng: class_change_log (Audit log đổi gia sư / đổi phí CSAT)
CREATE TABLE IF NOT EXISTS public.class_change_log (
  log_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id       UUID REFERENCES classes(class_id) ON DELETE CASCADE,
  change_type    VARCHAR(50) NOT NULL,
  old_value      TEXT,
  new_value      TEXT,
  old_label      TEXT,
  new_label      TEXT,
  effective_date DATE NOT NULL,
  changed_by     TEXT,
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- PHẦN 3: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_classes_tutor_id ON public.classes(tutor_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class_id ON public.sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions(date);
CREATE INDEX IF NOT EXISTS idx_session_attendance_student_id ON public.session_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_session_id ON public.session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_billing_period ON public.payments(billing_period);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id_snapshot ON public.sessions(tutor_id_snapshot);
CREATE INDEX IF NOT EXISTS idx_class_change_log_class_id ON public.class_change_log(class_id);
CREATE INDEX IF NOT EXISTS idx_class_change_log_class_type ON public.class_change_log(class_id, change_type);


-- ============================================================
-- PHẦN 4: UNIQUE CONSTRAINTS
-- ============================================================

-- Ngăn tạo trùng hóa đơn cho cùng học sinh + lớp + kỳ (chống race condition chốt sổ)
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS unique_payment_per_period;
ALTER TABLE public.payments
  ADD CONSTRAINT unique_payment_per_period UNIQUE (class_id, student_id, billing_period);


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

-- ============================================================
-- PHẦN 8: BACKFILL DỮ LIỆU CŨ
-- [MIGRATION ONLY]: Chỉ cần thiết nếu đã có dữ liệu trước khi thêm các cột snapshot
-- ============================================================

-- Backfill tutor_id_snapshot từ gia sư hiện tại của lớp (chỉ cho sessions chưa có)
UPDATE public.sessions s
SET tutor_id_snapshot = c.tutor_id
FROM public.classes c
WHERE s.class_id = c.class_id
  AND s.tutor_id_snapshot IS NULL
  AND c.tutor_id IS NOT NULL;

-- Backfill csat_fee_snapshot từ phí hiện tại của lớp (chỉ cho sessions chưa có)
UPDATE public.sessions s
SET csat_fee_snapshot = c.csat_fee_per_session
FROM public.classes c
WHERE s.class_id = c.class_id
  AND s.csat_fee_snapshot IS NULL
  AND c.csat_fee_per_session IS NOT NULL;


-- ============================================================
-- PHẦN 10: KHỞI TẠO TÀI KHOẢN ADMIN
-- [MIGRATION ONLY]: Cập nhật tài khoản admin csattutor@gmail.com
-- ============================================================

DO $$
DECLARE v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'csattutor@gmail.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"admin"}',
        raw_user_meta_data = '{"name":"Admin CSAT","role":"admin"}'
    WHERE id = v_user_id;

    IF NOT EXISTS (SELECT 1 FROM public.tutors WHERE auth_uid = v_user_id) THEN
      INSERT INTO public.tutors (auth_uid, name, email, status)
      VALUES (v_user_id, 'Admin CSAT', 'csattutor@gmail.com', 'active');
    END IF;
  END IF;
END $$;


-- ============================================================
-- RELOAD SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- BEGIN CSAT PARENT ACCOUNTS 20260905
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
-- END CSAT PARENT ACCOUNTS 20260905

COMMIT;
