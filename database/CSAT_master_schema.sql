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

-- BEGIN CSAT PHONE LOOKUP 20260906
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
-- END CSAT PHONE LOOKUP 20260906
COMMIT;


-- Integrated migration: 20260907_04_student_review_tags
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


-- BEGIN 20260908_05_preserve_history.sql
-- Existing deployments: apply after 20260907_04. No business rows are rewritten.
BEGIN;
CREATE SCHEMA IF NOT EXISTS csat_internal;
REVOKE ALL ON SCHEMA csat_internal FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS csat_internal.schema_migrations (
  version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS csat_internal.legacy_payments (
  payment_id uuid PRIMARY KEY, original_row jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO csat_internal.legacy_payments(payment_id,original_row)
SELECT payment_id,to_jsonb(p) FROM public.payments p
WHERE NOT EXISTS (SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260908_05')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.business_audit_events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_table text NOT NULL, entity_id text NOT NULL, operation text NOT NULL,
  actor_id uuid, actor_role text, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  before_data jsonb, after_data jsonb
);
ALTER TABLE public.business_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_audit_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.business_audit_events TO authenticated;
CREATE POLICY business_audit_admin_read ON public.business_audit_events FOR SELECT TO authenticated USING(public.is_admin());
CREATE INDEX business_audit_entity_idx ON public.business_audit_events(entity_table,entity_id,event_id DESC);

CREATE OR REPLACE FUNCTION csat_internal.audit_business_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_data jsonb; new_data jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_data:=to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_data:=to_jsonb(NEW); END IF;
  IF old_data IS NOT DISTINCT FROM new_data THEN RETURN NULL; END IF;
  INSERT INTO public.business_audit_events(entity_table,entity_id,operation,actor_id,actor_role,before_data,after_data)
  VALUES(TG_TABLE_NAME,coalesce(new_data,old_data)->>TG_ARGV[0],TG_OP,auth.uid(),auth.jwt()->>'role',old_data,new_data);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION csat_internal.protect_financial_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid; period_label text;
BEGIN
  IF TG_TABLE_NAME='sessions' THEN
    IF TG_OP <> 'INSERT' AND OLD.billing_period IS NOT NULL THEN
      IF TG_OP='DELETE' OR to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
        RAISE EXCEPTION 'Buổi học đã chốt sổ; dữ liệu gốc được giữ nguyên.' USING ERRCODE='23514';
      END IF;
    END IF;
    IF TG_OP='DELETE' AND (OLD.status <> 'scheduled' OR EXISTS(
      SELECT 1 FROM public.session_attendance a WHERE a.session_id=OLD.session_id)) THEN
      RAISE EXCEPTION 'Không xóa buổi học đã có lịch sử.' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='session_attendance' THEN
    IF TG_OP='UPDATE' AND (NEW.session_id,NEW.student_id) IS DISTINCT FROM (OLD.session_id,OLD.student_id) THEN
      RAISE EXCEPTION 'Không chuyển dòng điểm danh sang buổi hoặc học sinh khác.' USING ERRCODE='23514';
    END IF;
    IF TG_OP='DELETE' THEN sid:=OLD.session_id; ELSE sid:=NEW.session_id; END IF;
    SELECT billing_period INTO period_label FROM public.sessions WHERE session_id=sid FOR UPDATE;
    IF period_label IS NOT NULL THEN
      RAISE EXCEPTION 'Điểm danh đã chốt sổ; hãy lập khoản điều chỉnh.' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='payments' THEN
    IF TG_OP='DELETE' THEN
      RAISE EXCEPTION 'Không xóa chứng từ học phí; hãy giữ lịch sử và lập điều chỉnh.' USING ERRCODE='23514';
    END IF;
    IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['status','paid_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','paid_at']) THEN
      RAISE EXCEPTION 'Không sửa chứng từ học phí gốc.' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DO $$ DECLARE t text; k text; fk record; BEGIN
  FOREACH t IN ARRAY ARRAY['sessions','session_attendance','payments'] LOOP
    EXECUTE format('CREATE TRIGGER protect_financial_history BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION csat_internal.protect_financial_history()',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['sessions','session_attendance','payments','classes','class_students'] LOOP
    k:=CASE t WHEN 'sessions' THEN 'session_id' WHEN 'session_attendance' THEN 'attendance_id' WHEN 'payments' THEN 'payment_id' ELSE 'class_id' END;
    EXECUTE format('CREATE TRIGGER audit_business_write AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write(%L)',t,k);
  END LOOP;
  -- Preserve even unpaid/draft historical relationships. Existing NULL references remain NULL.
  FOR fk IN SELECT c.conname,c.conrelid::regclass AS relation,pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
    WHERE c.contype='f' AND c.confdeltype IN ('c','n') AND n.nspname='public'
      AND r.relname IN ('classes','class_students','sessions','session_attendance','payments','student_reviews','class_change_log')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I, ADD CONSTRAINT %I %s',fk.relation,fk.conname,fk.conname,
      regexp_replace(fk.definition,'ON DELETE (CASCADE|SET NULL)','ON DELETE RESTRICT'));
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.rollback_billing_partial(p_billing_period text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Quyền truy cập bị từ chối.' USING ERRCODE='42501'; END IF;
  RAISE EXCEPTION 'Kỳ đã chốt được giữ nguyên. Không còn hỗ trợ xóa hóa đơn để chốt lại.' USING ERRCODE='23514';
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA csat_internal FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260908_05');
NOTIFY pgrst,'reload schema';
COMMIT;

-- END 20260908_05_preserve_history.sql

-- BEGIN 20260908_06_atomic_billing.sql
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260908_05') THEN
    RAISE EXCEPTION 'Apply 20260908_05 first';
  END IF;
END $$;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.payments ALTER COLUMN amount TYPE numeric(14,2);
CREATE TABLE public.billing_periods (
  period_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text NOT NULL UNIQUE,
  start_date date, end_date date, source text NOT NULL CHECK(source IN ('legacy','ledger')),
  closed_at timestamptz, closed_by uuid,
  CHECK(source='legacy' OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date>=start_date AND closed_at IS NOT NULL AND closed_by IS NOT NULL))
);
INSERT INTO public.billing_periods(label,source)
SELECT billing_period,'legacy' FROM public.payments
UNION SELECT billing_period,'legacy' FROM public.sessions WHERE billing_period IS NOT NULL;
CREATE TABLE public.billing_sessions (
  session_id uuid PRIMARY KEY REFERENCES public.sessions ON DELETE RESTRICT,
  period_id uuid NOT NULL REFERENCES public.billing_periods ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.classes ON DELETE RESTRICT,
  tutor_id uuid NOT NULL REFERENCES public.tutors ON DELETE RESTRICT,
  class_name text NOT NULL, tutor_name text NOT NULL,
  date date NOT NULL, start_time time NOT NULL, end_time time NOT NULL,
  tuition numeric(14,2) NOT NULL CHECK(tuition>=0),
  csat_rate numeric(14,2) NOT NULL CHECK(csat_rate>=0),
  csat numeric(14,2) NOT NULL CHECK(csat>=0), net numeric(14,2) NOT NULL,
  CHECK(net=tuition-csat), CHECK(end_time>start_time)
);
CREATE INDEX billing_sessions_period_tutor_idx ON public.billing_sessions(period_id,tutor_id);
CREATE TABLE public.billing_items (
  item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid NOT NULL UNIQUE REFERENCES public.session_attendance ON DELETE RESTRICT,
  session_id uuid NOT NULL REFERENCES public.billing_sessions ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students ON DELETE RESTRICT,
  payment_id uuid REFERENCES public.payments ON DELETE RESTRICT,
  student_name text NOT NULL, status public.attendance_status NOT NULL,
  fee numeric(14,2) NOT NULL CHECK(fee>=0), amount numeric(14,2) NOT NULL CHECK(amount>=0),
  zero_fee_confirmed boolean NOT NULL DEFAULT false,
  CHECK(amount=CASE WHEN status='attended' THEN fee ELSE 0 END)
);
CREATE INDEX billing_items_session_idx ON public.billing_items(session_id);
CREATE INDEX billing_items_payment_idx ON public.billing_items(payment_id);
CREATE TABLE public.billing_adjustments (
  adjustment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.billing_items ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES public.payments ON DELETE RESTRICT,
  corrected_status public.attendance_status NOT NULL,
  corrected_fee numeric(14,2) NOT NULL CHECK(corrected_fee>=0),
  tuition_delta numeric(14,2) NOT NULL, csat_delta numeric(14,2) NOT NULL, net_delta numeric(14,2) NOT NULL,
  reason text NOT NULL CHECK(length(trim(reason))>0),
  actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reversal_of uuid UNIQUE REFERENCES public.billing_adjustments ON DELETE RESTRICT,
  CHECK(net_delta=tuition_delta-csat_delta)
);
CREATE INDEX billing_adjustments_item_idx ON public.billing_adjustments(item_id,created_at DESC,adjustment_id);
CREATE INDEX billing_adjustments_payment_idx ON public.billing_adjustments(payment_id);
CREATE TABLE public.payment_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments ON DELETE RESTRICT,
  kind text NOT NULL CHECK(kind IN ('receipt','refund','reversal')),
  amount numeric(14,2) NOT NULL CHECK(amount<>0), reason text NOT NULL,
  actor_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reversal_of uuid UNIQUE REFERENCES public.payment_events ON DELETE RESTRICT,
  CHECK((kind='receipt' AND amount>0) OR (kind='refund' AND amount<0) OR (kind='reversal' AND reversal_of IS NOT NULL))
);
CREATE INDEX payment_events_payment_idx ON public.payment_events(payment_id,occurred_at);
CREATE TABLE csat_internal.operation_results (
  actor_id uuid NOT NULL, request_id uuid NOT NULL, operation text NOT NULL,
  payload jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(actor_id,request_id)
);
CREATE FUNCTION csat_internal.require_admin() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
  IF auth.uid() IS NULL OR public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Thao tác yêu cầu tài khoản quản trị viên đã đăng nhập.' USING ERRCODE='42501';
  END IF;
END $$;
CREATE FUNCTION csat_internal.start_operation(op text, rid uuid, payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior csat_internal.operation_results%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR rid IS NULL THEN RAISE EXCEPTION 'Thiếu mã yêu cầu hoặc phiên đăng nhập.' USING ERRCODE='22023'; END IF;
  -- One business lock: deliberately serializes writes at the centre's current scale.
  PERFORM pg_advisory_xact_lock(20260908,1);
  SELECT * INTO prior FROM csat_internal.operation_results WHERE actor_id=auth.uid() AND request_id=rid;
  IF FOUND THEN
    IF prior.operation<>op OR prior.payload IS DISTINCT FROM payload THEN
      RAISE EXCEPTION 'Mã yêu cầu đã được sử dụng với nội dung khác.' USING ERRCODE='23505';
    END IF;
    RETURN prior.result;
  END IF;
  RETURN NULL;
END $$;
CREATE FUNCTION csat_internal.finish_operation(op text,rid uuid,payload jsonb,result jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
  INSERT INTO csat_internal.operation_results(actor_id,request_id,operation,payload,result) VALUES(auth.uid(),rid,op,payload,result);
  RETURN result;
END $$;
CREATE FUNCTION csat_internal.immutable_record() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
  RAISE EXCEPTION 'Bản ghi lịch sử chỉ được bổ sung, không sửa hoặc xóa.' USING ERRCODE='23514';
END $$;

CREATE FUNCTION csat_internal.payment_balance(pid uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p.amount + coalesce((SELECT sum(a.tuition_delta) FROM public.billing_adjustments a WHERE a.payment_id=pid),0)
    - coalesce((SELECT CASE WHEN l.original_row->>'status'='paid' THEN (l.original_row->>'amount')::numeric ELSE 0 END
      FROM csat_internal.legacy_payments l WHERE l.payment_id=pid),0)
    - coalesce((SELECT sum(e.amount) FROM public.payment_events e WHERE e.payment_id=pid),0)
  FROM public.payments p WHERE p.payment_id=pid;
$$;

-- Single source for preview and close. It never fills a missing historical price.
CREATE FUNCTION csat_internal.billing_snapshot(d1 date,d2 date,period_label text DEFAULT NULL,only_tutor uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
WITH selected AS (
  SELECT s.*,c.name AS class_name,t.name AS tutor_name,b.period_id AS ledger_period_id,
    b.class_name AS saved_class_name,b.tutor_name AS saved_tutor_name,b.csat_rate AS saved_csat_rate
  FROM public.sessions s LEFT JOIN public.classes c ON c.class_id=s.class_id
  LEFT JOIN public.tutors t ON t.tutor_id=s.tutor_id_snapshot
  LEFT JOIN public.billing_sessions b ON b.session_id=s.session_id
  WHERE s.status='completed' AND ((period_label IS NULL AND s.billing_period IS NULL AND s.date BETWEEN d1 AND d2)
    OR (period_label IS NOT NULL AND s.billing_period=period_label))
    AND (only_tutor IS NULL OR s.tutor_id_snapshot=only_tutor)
), items AS (
  SELECT s.session_id,coalesce(jsonb_agg(jsonb_build_object(
    'attendance_id',a.attendance_id,'item_id',bi.item_id,'student_id',a.student_id,
    'student_name',coalesce(bi.student_name,st.name,a.student_id::text),
    'status',coalesce(adj.corrected_status,bi.status,a.status),
    'fee',coalesce(adj.corrected_fee,bi.fee,a.tuition_fee_snapshot),
    'amount',CASE WHEN coalesce(adj.corrected_status,bi.status,a.status)='attended'
      THEN coalesce(adj.corrected_fee,bi.fee,a.tuition_fee_snapshot) ELSE 0 END,
    'original_amount',coalesce(bi.amount,CASE WHEN a.status='attended' THEN a.tuition_fee_snapshot ELSE 0 END)
  ) ORDER BY a.attendance_id) FILTER(WHERE a.attendance_id IS NOT NULL),'[]'::jsonb) AS attendance,
  coalesce(sum(CASE WHEN coalesce(adj.corrected_status,bi.status,a.status)='attended'
    THEN coalesce(adj.corrected_fee,bi.fee,a.tuition_fee_snapshot) ELSE 0 END),0) AS tuition
  FROM selected s LEFT JOIN public.session_attendance a ON a.session_id=s.session_id
  LEFT JOIN public.students st ON st.student_id=a.student_id
  LEFT JOIN public.billing_items bi ON bi.attendance_id=a.attendance_id
  LEFT JOIN LATERAL (SELECT ba.corrected_status,ba.corrected_fee FROM public.billing_adjustments ba
    WHERE ba.item_id=bi.item_id ORDER BY ba.created_at DESC,ba.adjustment_id DESC LIMIT 1) adj ON true
  GROUP BY s.session_id
), rows AS (
  SELECT s.*,i.attendance,i.tuition,
    CASE WHEN i.tuition>0 THEN coalesce(s.saved_csat_rate,s.csat_fee_snapshot) ELSE 0 END AS csat
  FROM selected s JOIN items i USING(session_id)
), payload AS (
 SELECT coalesce(jsonb_agg(jsonb_build_object('session_id',session_id,'class_id',class_id,
  'class_name',coalesce(saved_class_name,class_name,'Không còn liên kết lớp'),
  'tutor_id',tutor_id_snapshot,'tutor_name',coalesce(saved_tutor_name,tutor_name,'Không còn liên kết gia sư'),
  'date',date,'start_time',start_time,'end_time',end_time,'csat_rate',coalesce(saved_csat_rate,csat_fee_snapshot),
  'tuition',tuition,'csat',csat,'net',tuition-csat,'attendance',attendance) ORDER BY date,start_time,session_id),'[]'::jsonb) AS sessions
 FROM rows
)
SELECT jsonb_build_object('sessions',sessions,'previewToken',md5(sessions::text),'totalStudentTuition',coalesce((SELECT sum(tuition) FROM rows),0),
 'totalCsatRevenue',coalesce((SELECT sum(csat) FROM rows),0),'totalTutorSalary',coalesce((SELECT sum(tuition-csat) FROM rows),0),
 'missing_prices',EXISTS(SELECT 1 FROM rows WHERE csat_fee_snapshot IS NULL OR EXISTS(SELECT 1 FROM jsonb_array_elements(attendance) a WHERE a->>'fee' IS NULL))) INTO result FROM payload;
IF (result->>'missing_prices')::boolean THEN RAISE EXCEPTION 'Báo cáo còn buổi thiếu đơn giá lưu tại thời điểm học; cần đối soát trước khi tính tiền.' USING ERRCODE='22023'; END IF;
RETURN result-'missing_prices';
END $$;

CREATE FUNCTION public.billing_report(p_start_date date DEFAULT NULL,p_end_date date DEFAULT NULL,p_period text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; payments_data jsonb; period_data jsonb;
BEGIN
  PERFORM csat_internal.require_admin();
  IF p_period IS NULL AND (p_start_date IS NULL OR p_end_date IS NULL OR p_end_date<p_start_date) THEN
    RAISE EXCEPTION 'Khoảng ngày không hợp lệ.' USING ERRCODE='22023';
  END IF;
  result:=csat_internal.billing_snapshot(p_start_date,p_end_date,p_period);
  SELECT to_jsonb(b) INTO period_data FROM public.billing_periods b WHERE label=p_period;
  SELECT coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('students',jsonb_build_object('name',s.name),
    'classes',jsonb_build_object('name',c.name),'balance',csat_internal.payment_balance(p.payment_id),
    'events',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.occurred_at DESC) FROM public.payment_events e WHERE e.payment_id=p.payment_id),'[]'::jsonb),
    'adjustment_amount',coalesce((SELECT sum(a.tuition_delta) FROM public.billing_adjustments a WHERE a.payment_id=p.payment_id),0))
    ORDER BY p.payment_id),'[]'::jsonb) INTO payments_data FROM public.payments p
    LEFT JOIN public.students s USING(student_id) LEFT JOIN public.classes c USING(class_id) WHERE p.billing_period=p_period;
  RETURN result||jsonb_build_object('period',period_data,'payments',payments_data,
    'adjustments',coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC,a.adjustment_id DESC) FROM public.billing_adjustments a JOIN public.billing_items i USING(item_id) JOIN public.billing_sessions bs ON bs.session_id=i.session_id JOIN public.billing_periods bp USING(period_id) WHERE bp.label=p_period),'[]'::jsonb),
    'originalInvoiceTotal',coalesce((SELECT sum(amount) FROM public.payments WHERE billing_period=p_period),0));
END $$;

CREATE FUNCTION public.close_billing_period(p_start_date date,p_end_date date,p_label text,p_preview_token text,
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

CREATE FUNCTION public.record_payment_event(p_payment_id uuid,p_request_id uuid,p_expected_balance numeric,p_reason text DEFAULT 'Ghi nhận thanh toán',p_reverse_event_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb; prior jsonb; balance numeric; event_amount numeric; eid uuid; original public.payment_events%ROWTYPE;
BEGIN
  PERFORM csat_internal.require_admin();
  payload:=jsonb_build_object('payment',p_payment_id,'balance',p_expected_balance,'reason',p_reason,'reverse',p_reverse_event_id);
  prior:=csat_internal.start_operation('payment_event',p_request_id,payload); IF prior IS NOT NULL THEN RETURN prior; END IF;
  PERFORM 1 FROM public.payments WHERE payment_id=p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy chứng từ.' USING ERRCODE='P0002'; END IF;
  balance:=csat_internal.payment_balance(p_payment_id);
  IF balance IS DISTINCT FROM p_expected_balance THEN RAISE EXCEPTION 'Công nợ đã thay đổi. Hãy tải lại dữ liệu.' USING ERRCODE='40001'; END IF;
  IF length(trim(coalesce(p_reason,'')))=0 THEN RAISE EXCEPTION 'Cần ghi lý do.' USING ERRCODE='22023'; END IF;
  IF p_reverse_event_id IS NOT NULL THEN
    SELECT * INTO original FROM public.payment_events WHERE event_id=p_reverse_event_id AND payment_id=p_payment_id;
    IF NOT FOUND OR original.kind='reversal' THEN RAISE EXCEPTION 'Không tìm thấy lần thu/hoàn gốc phù hợp.' USING ERRCODE='22023'; END IF;
    event_amount:=-original.amount;
  ELSE
    event_amount:=balance;
    IF balance=0 THEN RETURN csat_internal.finish_operation('payment_event',p_request_id,payload,jsonb_build_object('message','Không còn công nợ.','balance',0)); END IF;
  END IF;
  INSERT INTO public.payment_events(payment_id,kind,amount,reason,actor_id,reversal_of)
  VALUES(p_payment_id,CASE WHEN p_reverse_event_id IS NOT NULL THEN 'reversal' WHEN event_amount>0 THEN 'receipt' ELSE 'refund' END,event_amount,p_reason,auth.uid(),p_reverse_event_id)
    RETURNING event_id INTO eid;
  balance:=csat_internal.payment_balance(p_payment_id);
  -- Legacy paid timestamps remain unknown. The new ledger is authoritative for net balance.
  UPDATE public.payments SET status=CASE WHEN balance<=0 THEN 'paid'::public.payment_status ELSE 'unpaid'::public.payment_status END,
    paid_at=CASE WHEN balance<=0 THEN coalesce(paid_at,CASE WHEN EXISTS(SELECT 1 FROM csat_internal.legacy_payments l
      WHERE l.payment_id=p_payment_id AND l.original_row->>'status'='paid') THEN NULL ELSE clock_timestamp() END) ELSE paid_at END
    WHERE payment_id=p_payment_id;
  RETURN csat_internal.finish_operation('payment_event',p_request_id,payload,jsonb_build_object('message','Đã ghi nhận giao dịch.','event_id',eid,'balance',balance));
END $$;

CREATE FUNCTION public.preview_billing_adjustment(p_item_id uuid,p_status public.attendance_status,p_fee numeric,p_reverse_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.billing_items%ROWTYPE; bs public.billing_sessions%ROWTYPE; last_adj public.billing_adjustments%ROWTYPE;
  original public.billing_adjustments%ROWTYPE; current_fee numeric; current_status public.attendance_status;
  tuition_before numeric; tuition_after numeric; delta numeric; csat_delta numeric;
BEGIN
  PERFORM csat_internal.require_admin();
  SELECT * INTO item FROM public.billing_items WHERE item_id=p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kỳ cũ hoặc chi tiết không tồn tại; cần đối soát riêng.' USING ERRCODE='22023'; END IF;
  SELECT * INTO bs FROM public.billing_sessions WHERE session_id=item.session_id;
  SELECT * INTO last_adj FROM public.billing_adjustments WHERE item_id=p_item_id ORDER BY created_at DESC,adjustment_id DESC LIMIT 1;
  current_fee:=coalesce(last_adj.corrected_fee,item.fee); current_status:=coalesce(last_adj.corrected_status,item.status);
  IF p_reverse_id IS NOT NULL THEN
    SELECT * INTO original FROM public.billing_adjustments WHERE adjustment_id=p_reverse_id AND item_id=p_item_id;
    IF NOT FOUND OR original.reversal_of IS NOT NULL OR last_adj.adjustment_id IS DISTINCT FROM p_reverse_id THEN
      RAISE EXCEPTION 'Chỉ đảo khoản điều chỉnh mới nhất của dòng này; các trường hợp khác cần lập đính chính mới.' USING ERRCODE='22023';
    END IF;
    SELECT coalesce(a.corrected_fee,item.fee),coalesce(a.corrected_status,item.status) INTO p_fee,p_status
      FROM (SELECT 1) seed LEFT JOIN LATERAL(SELECT * FROM public.billing_adjustments WHERE item_id=p_item_id AND adjustment_id<>p_reverse_id
        ORDER BY created_at DESC,adjustment_id DESC LIMIT 1) a ON true;
  END IF;
  IF p_status IS NULL OR p_fee IS NULL OR p_fee<0 OR p_fee<>round(p_fee,2) THEN RAISE EXCEPTION 'Điểm danh hoặc đơn giá điều chỉnh không hợp lệ.' USING ERRCODE='22023'; END IF;
  IF p_status=current_status AND p_fee=current_fee THEN RAISE EXCEPTION 'Nội dung điều chỉnh không thay đổi.' USING ERRCODE='22023'; END IF;
  tuition_before:=bs.tuition+coalesce((SELECT sum(a.tuition_delta) FROM public.billing_adjustments a JOIN public.billing_items i USING(item_id) WHERE i.session_id=bs.session_id),0);
  delta:=(CASE WHEN p_status='attended' THEN p_fee ELSE 0 END)-(CASE WHEN current_status='attended' THEN current_fee ELSE 0 END);
  tuition_after:=tuition_before+delta;
  csat_delta:=(CASE WHEN tuition_after>0 THEN bs.csat_rate ELSE 0 END)-(CASE WHEN tuition_before>0 THEN bs.csat_rate ELSE 0 END);
  RETURN jsonb_build_object('item_id',p_item_id,'session_id',bs.session_id,'status',p_status,'fee',p_fee,
    'tuition_delta',delta,'csat_delta',csat_delta,'net_delta',delta-csat_delta,'tuition_before',tuition_before,'tuition_after',tuition_after,
    'previewToken',md5(jsonb_build_array(p_item_id,current_status,current_fee,last_adj.adjustment_id,tuition_before,p_status,p_fee,p_reverse_id)::text));
END $$;

CREATE FUNCTION public.apply_billing_adjustment(p_item_id uuid,p_status public.attendance_status,p_fee numeric,p_reason text,
  p_preview_token text,p_request_id uuid,p_reverse_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb; prior jsonb; preview jsonb; item public.billing_items%ROWTYPE; bs public.billing_sessions%ROWTYPE;
  pid uuid; label_text text; aid uuid;
BEGIN
  PERFORM csat_internal.require_admin();
  payload:=jsonb_build_object('item',p_item_id,'status',p_status,'fee',p_fee,'reason',p_reason,'preview',p_preview_token,'reverse',p_reverse_id);
  prior:=csat_internal.start_operation('adjustment',p_request_id,payload); IF prior IS NOT NULL THEN RETURN prior; END IF;
  preview:=public.preview_billing_adjustment(p_item_id,p_status,p_fee,p_reverse_id);
  IF preview->>'previewToken' IS DISTINCT FROM p_preview_token THEN RAISE EXCEPTION 'Dữ liệu đã thay đổi. Hãy xem trước lại.' USING ERRCODE='40001'; END IF;
  IF length(trim(coalesce(p_reason,'')))=0 THEN RAISE EXCEPTION 'Cần ghi rõ lý do điều chỉnh.' USING ERRCODE='22023'; END IF;
  SELECT * INTO item FROM public.billing_items WHERE item_id=p_item_id;
  SELECT * INTO bs FROM public.billing_sessions WHERE session_id=item.session_id;
  SELECT label INTO label_text FROM public.billing_periods WHERE period_id=bs.period_id;
  SELECT payment_id INTO pid FROM public.payments WHERE class_id=bs.class_id AND student_id=item.student_id AND billing_period=label_text;
  IF pid IS NULL THEN
    -- A previously absent/free student may first acquire a debt through an adjustment.
    INSERT INTO public.payments(student_id,class_id,billing_period,amount,status) VALUES(item.student_id,bs.class_id,label_text,0,'unpaid') RETURNING payment_id INTO pid;
  END IF;
  INSERT INTO public.billing_adjustments(item_id,payment_id,corrected_status,corrected_fee,tuition_delta,csat_delta,net_delta,reason,actor_id,reversal_of)
  VALUES(p_item_id,pid,(preview->>'status')::public.attendance_status,(preview->>'fee')::numeric,
    (preview->>'tuition_delta')::numeric,(preview->>'csat_delta')::numeric,(preview->>'net_delta')::numeric,p_reason,auth.uid(),p_reverse_id)
    RETURNING adjustment_id INTO aid;
  UPDATE public.payments SET status=CASE WHEN csat_internal.payment_balance(pid)<=0 THEN 'paid'::public.payment_status ELSE 'unpaid'::public.payment_status END WHERE payment_id=pid;
  RETURN csat_internal.finish_operation('adjustment',p_request_id,payload,preview||jsonb_build_object('message','Đã ghi nhận khoản điều chỉnh.','adjustment_id',aid,'payment_id',pid,'balance',csat_internal.payment_balance(pid)));
END $$;

CREATE FUNCTION public.tutor_billing_history(p_period text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE tid uuid; periods jsonb;
BEGIN
  tid:=public.current_tutor_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'Tài khoản gia sư không hợp lệ.' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(label ORDER BY label DESC),'[]'::jsonb) INTO periods FROM (
    SELECT DISTINCT billing_period AS label FROM public.sessions WHERE tutor_id_snapshot=tid AND status='completed' AND billing_period IS NOT NULL
  ) q;
  IF p_period IS NULL THEN RETURN jsonb_build_object('periods',periods); END IF;
  RETURN csat_internal.billing_snapshot(NULL,NULL,p_period,tid)||jsonb_build_object('periods',periods);
END $$;
CREATE OR REPLACE FUNCTION public.get_unique_billing_periods() RETURNS TABLE(billing_period text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
  PERFORM csat_internal.require_admin();
  RETURN QUERY SELECT label FROM public.billing_periods ORDER BY coalesce(closed_at,'-infinity'::timestamptz) DESC,label DESC;
END $$;

DO $$ DECLARE t text; f record; BEGIN
  FOREACH t IN ARRAY ARRAY['billing_periods','billing_sessions','billing_items','billing_adjustments','payment_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
    EXECUTE format('CREATE POLICY admin_read ON public.%I FOR SELECT TO authenticated USING(public.is_admin())',t);
    EXECUTE format('CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION csat_internal.immutable_record()',t);
  END LOOP;
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN('billing_report','close_billing_period','record_payment_event',
      'preview_billing_adjustment','apply_billing_adjustment','tutor_billing_history','get_unique_billing_periods') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
  END LOOP;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA csat_internal FROM PUBLIC,anon,authenticated,service_role;
REVOKE INSERT,UPDATE,DELETE ON public.payments FROM authenticated,service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260908_06');
NOTIFY pgrst,'reload schema';
COMMIT;

-- END 20260908_06_atomic_billing.sql

-- BEGIN 20260908_07_class_workflows.sql
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

-- END 20260908_07_class_workflows.sql

-- BEGIN 20260908_08_read_models.sql
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

-- END 20260908_08_read_models.sql

-- BEGIN 20260908_09_reporting.sql
BEGIN;
CREATE FUNCTION public.admin_finance_summary() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM csat_internal.require_admin();
 RETURN jsonb_build_object('recorded_net_receipts',coalesce((SELECT sum(amount) FROM public.payment_events
   WHERE occurred_at>=date_trunc('month',now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'),0),
   'unpaid_count',(SELECT count(*) FROM public.payments p WHERE csat_internal.payment_balance(p.payment_id)>0),
   'refund_due',coalesce((SELECT -sum(csat_internal.payment_balance(p.payment_id)) FROM public.payments p WHERE csat_internal.payment_balance(p.payment_id)<0),0));
END $$;
CREATE FUNCTION public.admin_tutor_salary_history(p_tutor_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE label_text text; report jsonb; result jsonb:='[]';
BEGIN
 PERFORM csat_internal.require_admin();
 FOR label_text IN SELECT DISTINCT billing_period FROM public.sessions WHERE tutor_id_snapshot=p_tutor_id AND status='completed'
   AND billing_period IS NOT NULL ORDER BY billing_period DESC LOOP
   report:=csat_internal.billing_snapshot(NULL,NULL,label_text,p_tutor_id);
   result:=result||jsonb_build_array(jsonb_build_object('period',label_text,'sessions',jsonb_array_length(report->'sessions'),
     'tuition',report->'totalStudentTuition','csat',report->'totalCsatRevenue','net',report->'totalTutorSalary'));
 END LOOP;
 RETURN result;
END $$;
CREATE FUNCTION public.tutor_month_summary(p_start_date date,p_end_date date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; tid uuid:=public.current_tutor_id();
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Tài khoản gia sư không hợp lệ.' USING ERRCODE='42501';END IF;
 IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date<p_start_date THEN RAISE EXCEPTION 'Khoảng ngày không hợp lệ.' USING ERRCODE='22023';END IF;
 IF EXISTS(SELECT 1 FROM public.sessions s WHERE s.tutor_id_snapshot=tid AND s.status='completed' AND s.date BETWEEN p_start_date AND p_end_date
   AND (s.csat_fee_snapshot IS NULL OR EXISTS(SELECT 1 FROM public.session_attendance a WHERE a.session_id=s.session_id AND a.tuition_fee_snapshot IS NULL))) THEN
   RAISE EXCEPTION 'Báo cáo còn buổi thiếu đơn giá lưu tại thời điểm học; cần đối soát trước khi tính tiền.' USING ERRCODE='22023'; END IF;
 WITH rows AS(
 SELECT s.session_id,coalesce(b.csat_rate,s.csat_fee_snapshot) AS rate,
  CASE WHEN b.session_id IS NOT NULL THEN b.tuition+coalesce((SELECT sum(a.tuition_delta) FROM public.billing_adjustments a JOIN public.billing_items i USING(item_id) WHERE i.session_id=s.session_id),0)
   ELSE coalesce((SELECT sum(tuition_fee_snapshot) FROM public.session_attendance WHERE session_id=s.session_id AND status='attended'),0) END AS tuition
 FROM public.sessions s LEFT JOIN public.billing_sessions b USING(session_id)
 WHERE s.tutor_id_snapshot=tid AND s.status='completed' AND s.date BETWEEN p_start_date AND p_end_date)
 SELECT jsonb_build_object('sessions',count(*),'tuition',coalesce(sum(tuition),0),
  'csat',coalesce(sum(CASE WHEN tuition>0 THEN rate ELSE 0 END),0),
  'net',coalesce(sum(tuition-CASE WHEN tuition>0 THEN rate ELSE 0 END),0)) INTO result FROM rows;
 RETURN result;
END $$;
-- Handle either whitespace style used by the existing review migration.
DO $$ DECLARE f record; definition text; BEGIN
 FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='save_student_review' LOOP
  definition:=pg_get_functiondef(f.oid);
  definition:=regexp_replace(definition,'c\.tutor_id\s*=\s*actor','public.is_current_class_tutor(c.class_id)','g');
  EXECUTE definition;
 END LOOP;
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN('admin_finance_summary','admin_tutor_salary_history','tutor_month_summary') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
 END LOOP;
END $$;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260908_09');
NOTIFY pgrst,'reload schema';
COMMIT;

-- END 20260908_09_reporting.sql

-- BEGIN 20260909_10_schema_alignment.sql
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260908_09') THEN
  RAISE EXCEPTION 'Apply 20260908_09 first';
 END IF;
 IF EXISTS(SELECT 1 FROM public.student_reviews WHERE student_id IS NULL OR tutor_id IS NULL OR class_id IS NULL OR month_year IS NULL)
   OR EXISTS(SELECT 1 FROM public.student_reviews GROUP BY student_id,month_year,class_id HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Nhận xét thiếu liên kết hoặc trùng tháng/lớp/học sinh; cần đối soát riêng, không tự gộp hoặc xóa.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.classes WHERE class_type IS NULL) THEN
  RAISE EXCEPTION 'Cần xác minh loại lớp còn thiếu; không tự phân loại.';
 END IF;
END $$;
ALTER TABLE public.classes ALTER COLUMN class_type SET NOT NULL;
ALTER TABLE public.student_reviews ALTER COLUMN student_id SET NOT NULL, ALTER COLUMN tutor_id SET NOT NULL,
 ALTER COLUMN class_id SET NOT NULL, ALTER COLUMN month_year SET NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.student_reviews'::regclass AND contype='u'
  AND pg_get_constraintdef(oid)='UNIQUE (student_id, month_year, class_id)') THEN
  ALTER TABLE public.student_reviews ADD CONSTRAINT student_reviews_student_month_class_key UNIQUE(student_id,month_year,class_id);
 END IF;
END $$;
REVOKE TRUNCATE ON public.classes,public.class_students,public.sessions,public.session_attendance,public.payments,
 public.students,public.tutors,public.student_reviews,public.class_change_log FROM authenticated,service_role;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON public.business_audit_events FOR EACH ROW EXECUTE FUNCTION csat_internal.immutable_record();
-- Enrollment auditing is defined once in migration 07, keyed by enrollment_id.

-- Read old change logs and new effective-date history together without duplicating stored events.
CREATE FUNCTION public.admin_class_history(p_class_id uuid DEFAULT NULL,p_tutor_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM csat_internal.require_admin();
 WITH th AS (
  SELECT h.*,lag(tutor_id) OVER(PARTITION BY class_id ORDER BY effective_from,history_id) AS previous FROM public.class_tutor_history h
 ), fh AS (
  SELECT h.*,lag(fee) OVER(PARTITION BY class_id ORDER BY effective_from,history_id) AS previous FROM public.class_fee_history h
 ), sh AS (
  SELECT h.*,lag(fee) OVER(PARTITION BY class_id,student_id ORDER BY effective_from,history_id) AS previous FROM public.student_fee_history h
 ), events AS (
  SELECT to_jsonb(l) AS payload FROM public.class_change_log l
  UNION ALL
  SELECT jsonb_build_object('log_id','tutor:'||h.history_id,'class_id',h.class_id,'change_type','tutor_change',
   'old_value',h.previous,'new_value',h.tutor_id,'old_label',ot.name,'new_label',nt.name,'effective_date',h.effective_from,
   'changed_by',h.actor_id,'notes',h.reason,'created_at',h.recorded_at)
  FROM th h LEFT JOIN public.tutors ot ON ot.tutor_id=h.previous LEFT JOIN public.tutors nt ON nt.tutor_id=h.tutor_id WHERE h.source='change'
  UNION ALL
  SELECT jsonb_build_object('log_id','csat:'||h.history_id,'class_id',h.class_id,'change_type','csat_fee_update',
   'old_value',h.previous,'new_value',h.fee,'old_label',h.previous::text,'new_label',h.fee::text,'effective_date',h.effective_from,
   'changed_by',h.actor_id,'notes',h.reason,'created_at',h.recorded_at) FROM fh h WHERE h.source='change'
  UNION ALL
  SELECT jsonb_build_object('log_id','student_fee:'||h.history_id,'class_id',h.class_id,'change_type','student_fee_update',
   'old_value',h.previous,'new_value',h.fee,'old_label',st.name||': '||h.previous::text,'new_label',st.name||': '||h.fee::text,
   'effective_date',h.effective_from,'changed_by',h.actor_id,'notes',h.reason,'created_at',h.recorded_at)
  FROM sh h JOIN public.students st USING(student_id) WHERE h.source='change'
  UNION ALL
  SELECT jsonb_build_object('log_id','rename:'||a.event_id,'class_id',a.entity_id,'change_type','rename_class',
   'old_label',a.before_data->>'name','new_label',a.after_data->>'name',
   'effective_date',(a.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'changed_by',a.actor_id,'created_at',a.occurred_at)
  FROM public.business_audit_events a WHERE a.entity_table='classes' AND a.operation='UPDATE'
   AND a.before_data->>'name' IS DISTINCT FROM a.after_data->>'name'
  UNION ALL
  SELECT jsonb_build_object('log_id','membership:'||a.event_id,'class_id',a.after_data->>'class_id','change_type','drop_student',
   'old_label',st.name||': đang học','new_label',st.name||': đã nghỉ',
   'effective_date',(a.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'changed_by',a.actor_id,'created_at',a.occurred_at)
  FROM public.business_audit_events a JOIN public.students st ON st.student_id=(a.after_data->>'student_id')::uuid
  WHERE a.entity_table='class_students' AND a.operation='UPDATE'
   AND a.before_data->>'status'='active' AND a.after_data->>'status'='dropped'
 )
 SELECT coalesce(jsonb_agg(e.payload||jsonb_build_object('classes',jsonb_build_object('name',c.name))
  ORDER BY (e.payload->>'created_at')::timestamptz DESC,e.payload->>'log_id'),'[]') INTO result
 FROM events e LEFT JOIN public.classes c ON c.class_id=(e.payload->>'class_id')::uuid
 WHERE (p_class_id IS NULL OR c.class_id=p_class_id) AND (p_tutor_id IS NULL OR (
  e.payload->>'change_type'='tutor_change' AND p_tutor_id::text IN(e.payload->>'old_value',e.payload->>'new_value')));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_class_history(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_class_history(uuid,uuid) TO authenticated;

INSERT INTO csat_internal.schema_migrations(version) VALUES('20260909_10');
NOTIFY pgrst,'reload schema';
COMMIT;

-- END 20260909_10_schema_alignment.sql
