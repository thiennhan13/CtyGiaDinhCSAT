-- =====================================================================
-- CSAT TUTOR MANAGER — MASTER DATABASE SCHEMA
-- Phiên bản: Tổng hợp đầy đủ (Schema + Migrations + Bug Fixes)
-- Bao gồm: CSATschema.sql + migration_bug_fixes.sql
--           + final_safety_migration.sql + fix_attendance_snapshot_and_partial_rollback.sql
--
-- HƯỚNG DẪN: Chỉ chạy file này MỘT LẦN duy nhất trên một database TRỐNG.
-- Đối với database ĐÃ CÓ DỮ LIỆU, chạy từng BƯỚC được đánh dấu [MIGRATION ONLY].
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
  age INTEGER,
  province VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_link VARCHAR(255),
  status VARCHAR(255) DEFAULT 'Đang học',
  is_deleted BOOLEAN DEFAULT false,
  notes TEXT,
  default_tuition_fee DECIMAL(10,2) NOT NULL DEFAULT 100000.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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


-- ============================================================
-- PHẦN 5: ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_change_log ENABLE ROW LEVEL SECURITY;

-- Xóa tất cả policies cũ để tránh xung đột khi chạy lại
DO $$
DECLARE
  tbl VARCHAR;
  pol VARCHAR;
BEGIN
  FOR tbl, pol IN
    SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, tbl);
  END LOOP;
END $$;

-- Helper: Kiểm tra Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email VARCHAR;
BEGIN
  user_email := auth.jwt() ->> 'email';
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR user_email = 'csattutor@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies: Admin — toàn quyền
CREATE POLICY "Admin_Full_Students"       ON students       FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Tutors"         ON tutors         FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Classes"        ON classes        FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Class_Students" ON class_students FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Sessions"       ON sessions       FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Attendance"     ON session_attendance FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Payments"       ON payments       FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Announcements"  ON announcements  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Student_Reviews" ON student_reviews FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_ClassChangeLog" ON class_change_log FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Policies: Tutor — chỉ đọc/sửa lớp được gán
CREATE POLICY "Tutor_View_Self"             ON tutors FOR SELECT TO authenticated USING (auth_uid = auth.uid());
CREATE POLICY "Public_View_Announcements"   ON announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tutor_View_Assigned_Students" ON students FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN classes c ON cs.class_id = c.class_id
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE cs.student_id = students.student_id AND t.auth_uid = auth.uid()
  )
);

CREATE POLICY "Tutor_View_Assigned_Classes" ON classes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tutors t WHERE t.tutor_id = classes.tutor_id AND t.auth_uid = auth.uid())
);

CREATE POLICY "Tutor_View_Class_Students" ON class_students FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM classes c JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE c.class_id = class_students.class_id AND t.auth_uid = auth.uid()
  )
);

CREATE POLICY "Tutor_View_Assigned_Sessions" ON sessions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM classes c JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE c.class_id = sessions.class_id AND t.auth_uid = auth.uid()
  )
);

CREATE POLICY "Tutor_Manage_Assigned_Sessions" ON sessions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM classes c JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE c.class_id = sessions.class_id AND t.auth_uid = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes c JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE c.class_id = sessions.class_id AND t.auth_uid = auth.uid()
  )
);

CREATE POLICY "Tutor_Manage_Attendance" ON session_attendance FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM sessions s JOIN classes c ON s.class_id = c.class_id
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE s.session_id = session_attendance.session_id AND t.auth_uid = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions s JOIN classes c ON s.class_id = c.class_id
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE s.session_id = session_attendance.session_id AND t.auth_uid = auth.uid()
  )
);

CREATE POLICY "Tutor_Manage_Own_Reviews" ON student_reviews FOR ALL TO authenticated USING (
  tutor_id = (SELECT tutor_id FROM tutors WHERE auth_uid = auth.uid())
) WITH CHECK (
  tutor_id = (SELECT tutor_id FROM tutors WHERE auth_uid = auth.uid())
);


-- ============================================================
-- PHẦN 6: GRANTS (QUYỀN TRUY CẬP)
-- ============================================================

GRANT USAGE ON SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role, authenticated, anon;


-- ============================================================
-- PHẦN 7: RPC FUNCTIONS
-- ============================================================

-- 7.1: create_class_full — Tạo lớp học (atomic: tạo lớp + học sinh + lịch cùng lúc)
-- Phiên bản mới nhất: Lưu tutor_id_snapshot khi tạo buổi học
CREATE OR REPLACE FUNCTION create_class_full(
    p_name VARCHAR, p_class_type VARCHAR, p_tutor_id UUID, p_csat_fee DECIMAL,
    p_start_date DATE, p_end_date DATE, p_students JSONB, p_sessions JSONB
) RETURNS UUID AS $$
DECLARE
    v_class_id UUID; v_student JSONB; v_session JSONB;
BEGIN
    INSERT INTO classes (name, class_type, tutor_id, csat_fee_per_session, start_date, end_date)
    VALUES (p_name, p_class_type, p_tutor_id, p_csat_fee, p_start_date, p_end_date)
    RETURNING class_id INTO v_class_id;

    IF p_students IS NOT NULL AND jsonb_array_length(p_students) > 0 THEN
        FOR v_student IN SELECT * FROM jsonb_array_elements(p_students) LOOP
            INSERT INTO class_students (class_id, student_id, tuition_fee_per_session)
            VALUES (v_class_id, (v_student->>'student_id')::UUID, (v_student->>'tuition_fee_per_session')::DECIMAL);
        END LOOP;
    END IF;

    IF p_sessions IS NOT NULL AND jsonb_array_length(p_sessions) > 0 THEN
        FOR v_session IN SELECT * FROM jsonb_array_elements(p_sessions) LOOP
            INSERT INTO sessions (class_id, date, start_time, end_time, csat_fee_snapshot, tutor_id_snapshot, status)
            VALUES (v_class_id, (v_session->>'date')::DATE, (v_session->>'start_time')::TIME,
                    (v_session->>'end_time')::TIME, p_csat_fee, p_tutor_id, 'scheduled');
        END LOOP;
    END IF;

    RETURN v_class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2: change_tutor_safe — Đổi gia sư (atomic: log + update class + update sessions)
CREATE OR REPLACE FUNCTION change_tutor_safe(
    p_class_id UUID, p_new_tutor_id UUID, p_effective_date DATE, p_changed_by TEXT, p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_old_tutor_id UUID; v_old_tutor_name TEXT; v_new_tutor_name TEXT; v_updated_count INTEGER;
BEGIN
    SELECT t.tutor_id, t.name INTO v_old_tutor_id, v_old_tutor_name
    FROM classes c LEFT JOIN tutors t ON t.tutor_id = c.tutor_id WHERE c.class_id = p_class_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy lớp học.'; END IF;
    IF v_old_tutor_id = p_new_tutor_id THEN RAISE EXCEPTION 'Gia sư mới trùng với gia sư hiện tại.'; END IF;

    SELECT name INTO v_new_tutor_name FROM tutors WHERE tutor_id = p_new_tutor_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy gia sư mới.'; END IF;

    UPDATE sessions SET tutor_id_snapshot = p_new_tutor_id
    WHERE class_id = p_class_id AND status = 'scheduled' AND date >= p_effective_date;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    UPDATE classes SET tutor_id = p_new_tutor_id WHERE class_id = p_class_id;

    INSERT INTO class_change_log(class_id, change_type, old_value, new_value, old_label, new_label, effective_date, changed_by, notes)
    VALUES (p_class_id, 'tutor_change', v_old_tutor_id::TEXT, p_new_tutor_id::TEXT,
            v_old_tutor_name, v_new_tutor_name, p_effective_date, p_changed_by, p_notes);

    RETURN jsonb_build_object('message',
        format('Đã đổi gia sư từ "%s" sang "%s". Cập nhật %s buổi học chưa dạy.',
               v_old_tutor_name, v_new_tutor_name, v_updated_count),
        'updated_sessions', v_updated_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.3: update_csat_fee_safe — Đổi phí CSAT (atomic: fill null + update scheduled + update class + log)
CREATE OR REPLACE FUNCTION update_csat_fee_safe(
    p_class_id UUID, p_new_fee DECIMAL, p_effective_date DATE, p_changed_by TEXT, p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_old_fee DECIMAL; v_updated_count INTEGER; v_null_filled INTEGER;
BEGIN
    SELECT csat_fee_per_session INTO v_old_fee FROM classes WHERE class_id = p_class_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy lớp học.'; END IF;

    UPDATE sessions SET csat_fee_snapshot = v_old_fee
    WHERE class_id = p_class_id AND csat_fee_snapshot IS NULL;
    GET DIAGNOSTICS v_null_filled = ROW_COUNT;

    UPDATE sessions SET csat_fee_snapshot = p_new_fee
    WHERE class_id = p_class_id AND status = 'scheduled' AND date >= p_effective_date;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    UPDATE classes SET csat_fee_per_session = p_new_fee WHERE class_id = p_class_id;

    INSERT INTO class_change_log(class_id, change_type, old_value, new_value, old_label, new_label, effective_date, changed_by, notes)
    VALUES (p_class_id, 'csat_fee_change', v_old_fee::TEXT, p_new_fee::TEXT,
            to_char(v_old_fee, 'FM999,999,999') || ' ₫', to_char(p_new_fee, 'FM999,999,999') || ' ₫',
            p_effective_date, p_changed_by, p_notes);

    RETURN jsonb_build_object('message',
        format('Đã cập nhật phí CSAT thành công. Áp dụng cho %s buổi học chưa dạy từ %s.',
               v_updated_count, p_effective_date),
        'updated_sessions', v_updated_count, 'null_snapshots_fixed', v_null_filled);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.4: take_attendance_safe — Lưu điểm danh (atomic: upsert attendance + mark session completed)
-- Phiên bản mới nhất: COALESCE bảo vệ tuition_fee_snapshot cũ khi sửa điểm danh (Fix Lỗi 2)
CREATE OR REPLACE FUNCTION take_attendance_safe(
    p_session_id UUID,
    p_attendance_data JSONB
) RETURNS JSONB AS $$
DECLARE
    v_record JSONB;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Buổi học không tồn tại';
    END IF;

    FOR v_record IN SELECT * FROM jsonb_array_elements(p_attendance_data) LOOP
        INSERT INTO session_attendance (session_id, student_id, status, tuition_fee_snapshot, notes)
        VALUES (
            p_session_id,
            (v_record->>'student_id')::UUID,
            (v_record->>'status')::attendance_status,
            (v_record->>'tuition_fee_snapshot')::DECIMAL,
            v_record->>'notes'
        )
        ON CONFLICT (session_id, student_id)
        DO UPDATE SET
            status = EXCLUDED.status,
            -- Giữ snapshot cũ nếu đã có, tránh ghi đè lịch sử học phí khi admin sửa điểm danh
            tuition_fee_snapshot = COALESCE(session_attendance.tuition_fee_snapshot, EXCLUDED.tuition_fee_snapshot),
            notes = EXCLUDED.notes;
    END LOOP;

    UPDATE sessions SET status = 'completed' WHERE session_id = p_session_id;

    RETURN jsonb_build_object('message', 'Điểm danh thành công',
                              'records_processed', jsonb_array_length(p_attendance_data));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.5: rollback_billing_partial — Hủy chốt sổ một phần (giữ hóa đơn đã thu, xóa chưa thu)
-- Fix Lỗi 3: Không khóa cứng nếu có 1 hóa đơn đã paid
CREATE OR REPLACE FUNCTION rollback_billing_partial(
    p_billing_period TEXT
) RETURNS JSONB AS $$
DECLARE
    v_unpaid_count INTEGER := 0;
    v_paid_count   INTEGER := 0;
    v_target       RECORD;
BEGIN
    SELECT COUNT(*) INTO v_paid_count   FROM payments WHERE billing_period = p_billing_period AND status = 'paid';
    SELECT COUNT(*) INTO v_unpaid_count FROM payments WHERE billing_period = p_billing_period AND status = 'unpaid';

    IF v_unpaid_count = 0 THEN
        RAISE EXCEPTION 'Không có hóa đơn chưa thu nào trong kỳ "%" để hủy. (% hóa đơn đã thu được giữ nguyên)',
            p_billing_period, v_paid_count;
    END IF;

    -- Gỡ billing_period của sessions — chỉ khi session đó không có học sinh nào đã paid trong kỳ
    FOR v_target IN
        SELECT DISTINCT p.student_id, p.class_id FROM payments p
        WHERE p.billing_period = p_billing_period AND p.status = 'unpaid'
    LOOP
        UPDATE sessions s
        SET billing_period = NULL
        WHERE s.billing_period = p_billing_period
          AND s.class_id = v_target.class_id
          AND EXISTS (
              SELECT 1 FROM session_attendance sa
              WHERE sa.session_id = s.session_id AND sa.student_id = v_target.student_id
          )
          -- Không gỡ nếu có học sinh khác trong session đã paid (tránh tạo HĐ trùng khi chốt lại)
          AND NOT EXISTS (
              SELECT 1 FROM session_attendance sa2
              JOIN payments p2 ON p2.student_id = sa2.student_id
                               AND p2.class_id = s.class_id
                               AND p2.billing_period = p_billing_period
                               AND p2.status = 'paid'
              WHERE sa2.session_id = s.session_id
          );
    END LOOP;

    DELETE FROM payments WHERE billing_period = p_billing_period AND status = 'unpaid';

    -- Nếu không còn hóa đơn nào (kể cả paid), gỡ nốt billing_period sessions còn sót
    IF v_paid_count = 0 THEN
        UPDATE sessions SET billing_period = NULL WHERE billing_period = p_billing_period;
    END IF;

    RETURN jsonb_build_object(
        'message', format('Đã hủy %s hóa đơn chưa thu. %s hóa đơn đã thu được giữ nguyên.',
                          v_unpaid_count, v_paid_count),
        'unpaid_deleted', v_unpaid_count,
        'paid_kept', v_paid_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- RPC: get_unique_billing_periods — Lấy các kỳ chốt sổ duy nhất (Fix L8)
-- ============================================================
CREATE OR REPLACE FUNCTION get_unique_billing_periods()
RETURNS TABLE(billing_period TEXT) AS $$
  SELECT DISTINCT billing_period FROM public.payments ORDER BY billing_period DESC;
$$ LANGUAGE sql SECURITY DEFINER;



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
-- PHẦN 9: GRANTS THỰC THI RPC
-- ============================================================

GRANT EXECUTE ON FUNCTION create_class_full(VARCHAR, VARCHAR, UUID, DECIMAL, DATE, DATE, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION change_tutor_safe(UUID, UUID, DATE, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_csat_fee_safe(UUID, DECIMAL, DATE, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION take_attendance_safe(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION rollback_billing_partial(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_unique_billing_periods() TO authenticated, service_role;


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
