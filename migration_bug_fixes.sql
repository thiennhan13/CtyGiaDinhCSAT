-- =====================================================================
-- MIGRATION: Fix Bug #1, #2, #3 + Tạo bảng class_change_log
-- Chạy toàn bộ script này trong Supabase SQL Editor
-- =====================================================================

-- ============================================================
-- BƯỚC 1: Tạo bảng class_change_log (nếu chưa có)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_change_log (
  log_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id       UUID REFERENCES classes(class_id) ON DELETE CASCADE,
  change_type    VARCHAR(50) NOT NULL, -- 'tutor_change' | 'csat_fee_change'
  old_value      TEXT,
  new_value      TEXT,
  old_label      TEXT,
  new_label      TEXT,
  effective_date DATE NOT NULL,
  changed_by     TEXT,
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.class_change_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin_Full_ClassChangeLog" ON public.class_change_log;
CREATE POLICY "Admin_Full_ClassChangeLog" ON public.class_change_log
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX IF NOT EXISTS idx_class_change_log_class_id ON public.class_change_log(class_id);
-- B7: Composite index cho query filter theo class_id + change_type cùng lúc
CREATE INDEX IF NOT EXISTS idx_class_change_log_class_type ON public.class_change_log(class_id, change_type);

-- ============================================================
-- BƯỚC 2: Thêm cột tutor_id_snapshot vào bảng sessions (Fix Bug #1)
-- Chốt cứng gia sư tại thời điểm tạo buổi học, giống csat_fee_snapshot
-- ============================================================
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS tutor_id_snapshot UUID REFERENCES tutors(tutor_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id_snapshot ON public.sessions(tutor_id_snapshot);

-- ============================================================
-- BƯỚC 3: Backfill tutor_id_snapshot cho các buổi hiện có
-- LƯU Ý: Backfill dùng gia sư HIỆN TẠI của lớp (không thể biết gia sư gốc nếu đã thay đổi rồi)
-- Các buổi tạo mới từ đây sẽ luôn có tutor_id_snapshot chính xác
-- ============================================================
UPDATE public.sessions s
SET tutor_id_snapshot = c.tutor_id
FROM public.classes c
WHERE s.class_id = c.class_id
  AND s.tutor_id_snapshot IS NULL
  AND c.tutor_id IS NOT NULL;

-- ============================================================
-- BƯỚC 4: Fill csat_fee_snapshot = null bằng giá hiện tại của lớp (Fix Bug #2)
-- Đảm bảo tất cả buổi cũ có csat_fee_snapshot, tránh fallback sai sau khi đổi phí
-- ============================================================
UPDATE public.sessions s
SET csat_fee_snapshot = c.csat_fee_per_session
FROM public.classes c
WHERE s.class_id = c.class_id
  AND s.csat_fee_snapshot IS NULL
  AND c.csat_fee_per_session IS NOT NULL;

-- ============================================================
-- BƯỚC 5: Cập nhật create_class_full để lưu tutor_id_snapshot khi tạo buổi
-- ============================================================
CREATE OR REPLACE FUNCTION create_class_full(
    p_name VARCHAR,
    p_class_type VARCHAR,
    p_tutor_id UUID,
    p_csat_fee DECIMAL,
    p_start_date DATE,
    p_end_date DATE,
    p_students JSONB,
    p_sessions JSONB
) RETURNS UUID AS $$
DECLARE
    v_class_id UUID;
    v_student JSONB;
    v_session JSONB;
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
            -- Lưu cả tutor_id_snapshot để bảo vệ lịch sử lương
            INSERT INTO sessions (class_id, date, start_time, end_time, csat_fee_snapshot, tutor_id_snapshot, status)
            VALUES (
                v_class_id,
                (v_session->>'date')::DATE,
                (v_session->>'start_time')::TIME,
                (v_session->>'end_time')::TIME,
                p_csat_fee,
                p_tutor_id,
                'scheduled'
            );
        END LOOP;
    END IF;

    RETURN v_class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BƯỚC 6: RPC change_tutor_safe — Đổi gia sư ATOMIC (Fix Bug #3)
-- Toàn bộ logic trong 1 transaction: log + update class + update sessions
-- ============================================================
CREATE OR REPLACE FUNCTION change_tutor_safe(
    p_class_id     UUID,
    p_new_tutor_id UUID,
    p_effective_date DATE,
    p_changed_by   TEXT,
    p_notes        TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_old_tutor_id   UUID;
    v_old_tutor_name TEXT;
    v_new_tutor_name TEXT;
    v_updated_count  INTEGER;
BEGIN
    -- Lấy gia sư hiện tại
    SELECT t.tutor_id, t.name
    INTO v_old_tutor_id, v_old_tutor_name
    FROM classes c
    LEFT JOIN tutors t ON t.tutor_id = c.tutor_id
    WHERE c.class_id = p_class_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy lớp học.';
    END IF;

    IF v_old_tutor_id = p_new_tutor_id THEN
        RAISE EXCEPTION 'Gia sư mới trùng với gia sư hiện tại.';
    END IF;

    -- Lấy tên gia sư mới
    SELECT name INTO v_new_tutor_name FROM tutors WHERE tutor_id = p_new_tutor_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy gia sư mới.';
    END IF;

    -- Cập nhật tutor_id_snapshot cho các buổi SCHEDULED từ ngày hiệu lực
    UPDATE sessions
    SET tutor_id_snapshot = p_new_tutor_id
    WHERE class_id = p_class_id
      AND status = 'scheduled'
      AND date >= p_effective_date;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- Cập nhật lớp (atomic cùng các bước trên)
    UPDATE classes SET tutor_id = p_new_tutor_id WHERE class_id = p_class_id;

    -- Ghi audit log
    INSERT INTO class_change_log(class_id, change_type, old_value, new_value, old_label, new_label, effective_date, changed_by, notes)
    VALUES (p_class_id, 'tutor_change', v_old_tutor_id::TEXT, p_new_tutor_id::TEXT,
            v_old_tutor_name, v_new_tutor_name, p_effective_date, p_changed_by, p_notes);

    RETURN jsonb_build_object(
        'message', format('Đã đổi gia sư từ "%s" sang "%s". Cập nhật %s buổi học chưa dạy.',
                          v_old_tutor_name, v_new_tutor_name, v_updated_count),
        'updated_sessions', v_updated_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BƯỚC 7: RPC update_csat_fee_safe — Đổi phí CSAT ATOMIC (Fix Bug #2 + #3)
-- 1. Fill null snapshots với phí cũ (bảo toàn lịch sử)
-- 2. Update scheduled sessions từ effective_date với phí mới
-- 3. Update lớp
-- 4. Ghi log
-- Tất cả trong 1 transaction
-- ============================================================
CREATE OR REPLACE FUNCTION update_csat_fee_safe(
    p_class_id       UUID,
    p_new_fee        DECIMAL,
    p_effective_date DATE,
    p_changed_by     TEXT,
    p_notes          TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_old_fee       DECIMAL;
    v_updated_count INTEGER;
    v_null_filled   INTEGER;
BEGIN
    -- Lấy phí CSAT hiện tại
    SELECT csat_fee_per_session INTO v_old_fee FROM classes WHERE class_id = p_class_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy lớp học.';
    END IF;

    -- FIX BUG #2: Fill null csat_fee_snapshot bằng phí CŨ để bảo toàn lịch sử
    -- Sau bước này, KHÔNG CÒN session nào của lớp có snapshot = null
    UPDATE sessions
    SET csat_fee_snapshot = v_old_fee
    WHERE class_id = p_class_id
      AND csat_fee_snapshot IS NULL;

    GET DIAGNOSTICS v_null_filled = ROW_COUNT;

    -- Cập nhật snapshot cho các buổi SCHEDULED từ ngày hiệu lực với phí MỚI
    UPDATE sessions
    SET csat_fee_snapshot = p_new_fee
    WHERE class_id = p_class_id
      AND status = 'scheduled'
      AND date >= p_effective_date;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- Cập nhật lớp (atomic)
    UPDATE classes SET csat_fee_per_session = p_new_fee WHERE class_id = p_class_id;

    -- Ghi audit log
    INSERT INTO class_change_log(class_id, change_type, old_value, new_value, old_label, new_label, effective_date, changed_by, notes)
    VALUES (
        p_class_id,
        'csat_fee_change',
        v_old_fee::TEXT,
        p_new_fee::TEXT,
        to_char(v_old_fee, 'FM999,999,999') || ' ₫',
        to_char(p_new_fee, 'FM999,999,999') || ' ₫',
        p_effective_date,
        p_changed_by,
        p_notes
    );

    RETURN jsonb_build_object(
        'message', format('Đã cập nhật phí CSAT thành công. Áp dụng cho %s buổi học chưa dạy từ %s.',
                          v_updated_count, p_effective_date),
        'updated_sessions', v_updated_count,
        'null_snapshots_fixed', v_null_filled
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BƯỚC 8: Cấp quyền thực thi cho các RPC mới
-- ============================================================
GRANT EXECUTE ON FUNCTION change_tutor_safe(UUID, UUID, DATE, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_csat_fee_safe(UUID, DECIMAL, DATE, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_class_full(VARCHAR, VARCHAR, UUID, DECIMAL, DATE, DATE, JSONB, JSONB) TO authenticated, service_role;

-- Reload schema cache để Supabase nhận diện các function mới
NOTIFY pgrst, 'reload schema';
