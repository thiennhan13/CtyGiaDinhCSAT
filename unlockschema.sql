-- unlockschema.sql
-- Mở khóa toàn bộ RLS (Row Level Security) theo yêu cầu bảo mật nội bộ
-- Admin và Tutor (authenticated) có quyền thao tác dữ liệu, UI sẽ đảm nhận việc lọc dữ liệu và hiển thị phạm vi liên quan.

-- 1. Xóa tất cả policies cũ trên các bảng để tránh xung đột
DO $$ 
DECLARE 
    tbl VARCHAR; 
    pol VARCHAR; 
BEGIN 
    FOR tbl, pol IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, tbl); 
    END LOOP; 
END $$;

-- 2. Đảm bảo RLS vẫn được bật nhưng Policy sẽ mở khóa cho authenticated
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 3. Cấp quyền ALL cho role 'authenticated' trên toàn bộ các bảng 
-- Do hệ thống nội bộ, giao diện UI đã xử lý phân quyền hiển thị từng người nên ta giảm tải rào cản ở DB
CREATE POLICY "Allow All for Authenticated" ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All for Authenticated" ON tutors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All for Authenticated" ON classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All for Authenticated" ON class_students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All for Authenticated" ON sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All for Authenticated" ON session_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All for Authenticated" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All for Authenticated" ON announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);
