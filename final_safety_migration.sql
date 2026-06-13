-- =====================================================================
-- MIGRATION: Final Safety Migration (Race Conditions, Atomicity, Indexes)
-- Chạy toàn bộ script này trong Supabase SQL Editor
-- =====================================================================

-- ============================================================
-- BƯỚC 1: Ngăn chặn Duplicate Billing (Race Condition)
-- Thêm Unique Constraint để 1 học sinh chỉ có 1 hóa đơn cho 1 lớp trong 1 kỳ
-- LƯU Ý: Nếu có dữ liệu trùng lặp cũ, lệnh này có thể lỗi. Bạn cần xóa hóa đơn trùng trước.
-- ============================================================
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS unique_payment_per_period;

ALTER TABLE public.payments
ADD CONSTRAINT unique_payment_per_period UNIQUE (class_id, student_id, billing_period);

-- ============================================================
-- BƯỚC 2: Thêm Index quan trọng bị thiếu (Chống Full Table Scan)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_session_attendance_session_id 
ON public.session_attendance(session_id);

-- ============================================================
-- BƯỚC 3: RPC Điểm Danh An Toàn (Atomic Transaction)
-- Đảm bảo việc lưu điểm danh và đổi trạng thái session thành 'completed'
-- luôn thành công hoặc thất bại cùng nhau.
-- ============================================================
CREATE OR REPLACE FUNCTION take_attendance_safe(
    p_session_id UUID,
    p_attendance_data JSONB -- Mảng các object: {student_id, status, tuition_fee_snapshot, notes}
) RETURNS JSONB AS $$
DECLARE
    v_record JSONB;
BEGIN
    -- Kiểm tra session có tồn tại không
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Buổi học không tồn tại';
    END IF;

    -- 1. Lưu điểm danh (Upsert)
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_attendance_data) LOOP
        INSERT INTO session_attendance (
            session_id, 
            student_id, 
            status, 
            tuition_fee_snapshot, 
            notes
        )
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
            tuition_fee_snapshot = EXCLUDED.tuition_fee_snapshot,
            notes = EXCLUDED.notes;
    END LOOP;

    -- 2. Đổi trạng thái buổi học (Update)
    UPDATE sessions 
    SET status = 'completed'
    WHERE session_id = p_session_id;

    RETURN jsonb_build_object(
        'message', 'Điểm danh thành công',
        'records_processed', jsonb_array_length(p_attendance_data)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cấp quyền thực thi
GRANT EXECUTE ON FUNCTION take_attendance_safe(UUID, JSONB) TO authenticated, service_role;
