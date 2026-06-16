-- =====================================================================
-- MIGRATION: Sửa Lỗi Logic Nghiệp Vụ
-- 1. Sửa RPC take_attendance_safe: Bảo vệ tuition_fee_snapshot cũ (Lỗi 2)
-- 2. Tạo RPC rollback_billing_partial: Hủy hóa đơn một phần (Lỗi 3)
-- Chạy toàn bộ script này trong Supabase SQL Editor
-- =====================================================================

-- ============================================================
-- BƯỚC 1: Sửa RPC take_attendance_safe
-- VẤN ĐỀ: UPSERT đang ghi đè tuition_fee_snapshot bằng học phí hiện tại
-- khi admin sửa điểm danh cũ → làm sai lịch sử kế toán.
-- GIẢI PHÁP: Dùng COALESCE để ưu tiên giữ giá trị cũ nếu đã tồn tại.
-- ============================================================
CREATE OR REPLACE FUNCTION take_attendance_safe(
    p_session_id UUID,
    p_attendance_data JSONB -- Mảng: {student_id, status, tuition_fee_snapshot, notes}
) RETURNS JSONB AS $$
DECLARE
    v_record JSONB;
BEGIN
    -- Kiểm tra session có tồn tại không
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Buổi học không tồn tại';
    END IF;

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
            -- LỖI 2 FIX: Chỉ giữ snapshot cũ nếu đã có (COALESCE).
            -- Nếu chưa có record (INSERT lần đầu), dùng giá trị mới.
            -- Nếu UPDATE lại record đã có, giữ nguyên snapshot cũ — không để
            -- mức học phí hiện tại đè lên lịch sử kế toán.
            tuition_fee_snapshot = COALESCE(
                session_attendance.tuition_fee_snapshot,
                EXCLUDED.tuition_fee_snapshot
            ),
            notes = EXCLUDED.notes;
    END LOOP;

    -- Đổi trạng thái buổi học thành completed
    UPDATE sessions
    SET status = 'completed'
    WHERE session_id = p_session_id;

    RETURN jsonb_build_object(
        'message', 'Điểm danh thành công',
        'records_processed', jsonb_array_length(p_attendance_data)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BƯỚC 2: Tạo RPC rollback_billing_partial (Lỗi 3)
-- VẤN ĐỀ: Nếu có DÙ CHỈ 1 hóa đơn 'paid', hệ thống khóa cứng Rollback.
-- GIẢI PHÁP: Rollback một phần — chỉ xóa các hóa đơn 'unpaid', giữ nguyên
-- hóa đơn 'paid'. Sessions chỉ được gỡ billing_period nếu KHÔNG CÓ
-- hóa đơn paid nào cho student-class đó trong kỳ này.
-- ============================================================
CREATE OR REPLACE FUNCTION rollback_billing_partial(
    p_billing_period TEXT
) RETURNS JSONB AS $$
DECLARE
    v_unpaid_count  INTEGER := 0;
    v_paid_count    INTEGER := 0;
    -- Dùng để lưu (student_id, class_id) của các hóa đơn chưa thu cần xóa
    v_target        RECORD;
BEGIN
    -- Đếm số hóa đơn đã thu để trả về thông tin
    SELECT COUNT(*) INTO v_paid_count
    FROM payments
    WHERE billing_period = p_billing_period AND status = 'paid';

    -- Đếm số hóa đơn chưa thu
    SELECT COUNT(*) INTO v_unpaid_count
    FROM payments
    WHERE billing_period = p_billing_period AND status = 'unpaid';

    -- Nếu không có hóa đơn chưa thu nào → không cần làm gì
    IF v_unpaid_count = 0 THEN
        RAISE EXCEPTION 'Không có hóa đơn chưa thu nào trong kỳ "%" để hủy. (% hóa đơn đã thu được giữ nguyên)',
            p_billing_period, v_paid_count;
    END IF;

    -- Lặp qua từng hóa đơn UNPAID, gỡ khóa sessions tương ứng
    -- Chỉ gỡ session nếu KHÔNG CÓ HỌC SINH NÀO trong session đó có hóa đơn PAID kỳ này.
    -- Lý do: Một session có thể có nhiều học sinh. Nếu có học sinh A đã paid
    -- và học sinh B chưa paid trong cùng session → không được gỡ billing_period,
    -- vì nếu gỡ, khi chốt sổ lại session sẽ bị lấy vào và tạo hóa đơn trùng cho A.
    FOR v_target IN
        SELECT DISTINCT p.student_id, p.class_id
        FROM payments p
        WHERE p.billing_period = p_billing_period
          AND p.status = 'unpaid'
    LOOP
        UPDATE sessions s
        SET billing_period = NULL
        WHERE s.billing_period = p_billing_period
          AND s.class_id = v_target.class_id
          -- Session này có attendance của học sinh chưa thu
          AND EXISTS (
              SELECT 1 FROM session_attendance sa
              WHERE sa.session_id = s.session_id
                AND sa.student_id = v_target.student_id
          )
          -- Quan trọng: Không có học sinh nào trong session này đã paid trong kỳ này
          -- (dùng class_id để giới hạn scope tìm kiếm)
          AND NOT EXISTS (
              SELECT 1
              FROM session_attendance sa2
              JOIN payments p2 ON p2.student_id = sa2.student_id
                               AND p2.class_id = s.class_id
                               AND p2.billing_period = p_billing_period
                               AND p2.status = 'paid'
              WHERE sa2.session_id = s.session_id
          );
    END LOOP;

    -- Xóa tất cả hóa đơn UNPAID của kỳ này
    DELETE FROM payments
    WHERE billing_period = p_billing_period
      AND status = 'unpaid';

    -- Kiểm tra: Nếu sau khi xóa hóa đơn unpaid, kỳ này không còn hóa đơn nào
    -- thì gỡ nốt billing_period của các sessions còn sót (nếu có)
    IF v_paid_count = 0 THEN
        UPDATE sessions
        SET billing_period = NULL
        WHERE billing_period = p_billing_period;
    END IF;

    RETURN jsonb_build_object(
        'message', format(
            'Đã hủy %s hóa đơn chưa thu. %s hóa đơn đã thu được giữ nguyên.',
            v_unpaid_count, v_paid_count
        ),
        'unpaid_deleted', v_unpaid_count,
        'paid_kept', v_paid_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BƯỚC 3: Cấp quyền thực thi
-- ============================================================
GRANT EXECUTE ON FUNCTION take_attendance_safe(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION rollback_billing_partial(TEXT) TO authenticated, service_role;

-- ============================================================
-- BƯỚC 4: Tạo RPC get_unique_billing_periods (Fix L8)
-- ============================================================
CREATE OR REPLACE FUNCTION get_unique_billing_periods()
RETURNS TABLE(billing_period TEXT) AS $$
  SELECT DISTINCT billing_period FROM public.payments ORDER BY billing_period DESC;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_unique_billing_periods() TO authenticated, service_role;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
